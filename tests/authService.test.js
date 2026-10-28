import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { installMockStorage } from './helpers/mockStorage.js';

const ACCOUNTS_KEY = 'calmal_accounts_v1';
const ACTIVE_KEY = 'calmal_active_username_v1';
const LEGACY_VAULT_KEY = 'calmal_auth_vault';
const LEGACY_STATE_KEY = 'calmal.v1';
const BACKUP_KEY = 'calmal.v1.backup';

let storage;
let auth;
let importSequence = 0;

async function loadService() {
  return import(`../src/services/authService.js?test=${++importSequence}`);
}

beforeEach(async () => {
  storage = installMockStorage();
  auth = await loadService();
});

function validVault(username = 'Legacy_User') {
  return JSON.stringify({
    username,
    credentialId: 'legacy-credential',
    authKeyVerifier: 'legacy-verifier',
    iv: 'legacy-iv',
    encryptedBioSecret: 'legacy-secret',
  });
}

function assertNoPasswordText(password) {
  for (const [key, value] of Object.entries(storage.entries())) {
    assert.ok(!value.includes(password), `${key} contains password text`);
  }
}

test('username validation trims and normalizes input and enforces the existing format', () => {
  for (const username of ['abc', '  Mixed_Name9  ', 'a1_', 'a'.repeat(32), 123]) {
    assert.equal(auth.validateUsername(username), true, username);
  }
  for (const username of [null, undefined, '', 'ab', 'a-b', 'white space', 'üser', 'a'.repeat(33)]) {
    assert.equal(auth.validateUsername(username), false, String(username));
  }
});

test('password validation retains the current password rules', () => {
  assert.equal(auth.validatePassword('Password1'), true);
  for (const password of [null, undefined, 12345678, '', 'Passwo1', 'password1', 'PASSWORD1', 'Password']) {
    assert.equal(auth.validatePassword(password), false, String(password));
  }
});

test('account creation normalizes usernames, stores metadata, and does not activate the account', () => {
  assert.deepEqual(auth.createLocalAccount('  New_User  ', 'Password1'), { username: 'new_user' });
  assert.equal(auth.getActiveUsername(), null);
  assert.equal(storage.getItem(ACTIVE_KEY), null);
  const createdAt = JSON.parse(storage.getItem(ACCOUNTS_KEY))[0].createdAt;
  assert.deepEqual(auth.listLocalAccounts(), [{ username: 'new_user', createdAt }]);
  assert.equal(Number.isNaN(Date.parse(createdAt)), false);
  assert.equal(storage.getItem(auth.getAccountStorageKey('new_user')), null);
  assert.equal(auth.isCombinedAuthActive(), false);
  assert.equal(auth.hasCombinedAuthVault(), true);
});

test('account creation rejects invalid credentials and duplicate normalized usernames', () => {
  assert.throws(() => auth.createLocalAccount('ab', 'Password1'), /username/i);
  assert.throws(() => auth.createLocalAccount('valid_name', 'password1'), /password/i);
  assert.equal(storage.getItem(ACCOUNTS_KEY), null);

  auth.createLocalAccount('Existing_User', 'Password1');
  assert.throws(() => auth.createLocalAccount(' existing_user ', 'Password2'), /already exists/i);
  assert.equal(auth.listLocalAccounts().length, 1);
});

test('account listing is sorted and returns defensive copies', () => {
  auth.createLocalAccount('zulu', 'Password1');
  auth.createLocalAccount('Alpha', 'Password1');
  auth.createLocalAccount('mike', 'Password1');

  const accounts = auth.listLocalAccounts();
  assert.deepEqual(accounts.map(({ username }) => username), ['alpha', 'mike', 'zulu']);
  accounts[0].username = 'changed';
  accounts.push({ username: 'injected', createdAt: 'now' });
  assert.deepEqual(auth.listLocalAccounts().map(({ username }) => username), ['alpha', 'mike', 'zulu']);
});

test('passwordless resume persists the active account across a simulated reload', async () => {
  auth.createLocalAccount('Saved_User', 'Password1');
  assert.deepEqual(auth.resumeLocalAccount(' SAVED_USER '), { username: 'saved_user' });
  assert.equal(auth.getActiveUsername(), 'saved_user');
  assert.equal(auth.isCombinedAuthActive(), true);
  assert.equal(storage.getItem(ACTIVE_KEY), 'saved_user');

  auth = await loadService();
  assert.equal(auth.getActiveUsername(), 'saved_user');
  assert.equal(auth.isCombinedAuthActive(), true);
});

test('resume rejects unknown and invalid usernames without changing the active account', () => {
  auth.createLocalAccount('known', 'Password1');
  auth.resumeLocalAccount('known');

  assert.throws(() => auth.resumeLocalAccount('unknown'), /not found|unknown/i);
  assert.throws(() => auth.resumeLocalAccount('../bad'), /username/i);
  assert.equal(auth.getActiveUsername(), 'known');
});

test('sign out clears only the active username and retains account metadata', async () => {
  auth.createLocalAccount('retained', 'Password1');
  auth.resumeLocalAccount('retained');

  await auth.signOut();

  assert.equal(auth.getActiveUsername(), null);
  assert.equal(auth.isCombinedAuthActive(), false);
  assert.equal(storage.getItem(ACTIVE_KEY), null);
  assert.deepEqual(auth.listLocalAccounts().map(({ username }) => username), ['retained']);
  assert.deepEqual(auth.resumeLocalAccount('retained'), { username: 'retained' });
});

test('account storage keys encode normalized usernames', () => {
  assert.equal(auth.getAccountStorageKey('  A_User%  '), 'calmal.user.a_user%25');
});

test('password text is absent from every value written by the account lifecycle', async () => {
  const password = 'Password1Secret';
  auth.createLocalAccount('private_user', password);
  auth.resumeLocalAccount('private_user');
  await auth.signOut();
  assertNoPasswordText(password);
});

test('malformed account and active storage fail closed without exposing invalid accounts', () => {
  storage.setItem(ACCOUNTS_KEY, '{not json');
  storage.setItem(ACTIVE_KEY, 'orphan');
  assert.deepEqual(auth.listLocalAccounts(), []);
  assert.equal(auth.getActiveUsername(), null);
  assert.throws(() => auth.resumeLocalAccount('orphan'), /not found|unknown/i);

  storage.setItem(ACCOUNTS_KEY, JSON.stringify([
    null,
    { username: 'valid', createdAt: '2026-07-30T00:00:00.000Z' },
    { username: '../bad', createdAt: '2026-07-30T00:00:00.000Z' },
    { username: 'missing-date' },
    { username: 'valid', createdAt: '2026-07-30T00:00:00.000Z' },
  ]));
  assert.deepEqual(auth.listLocalAccounts(), [{ username: 'valid', createdAt: '2026-07-30T00:00:00.000Z' }]);
});

test('legacy vault and state migrate once to account metadata and a user key without activation', async () => {
  const state = JSON.stringify({ profile: { username: 'legacy_user', name: 'Legacy' }, meals: [{ id: 'meal-1' }] });
  storage.setItem(LEGACY_VAULT_KEY, validVault());
  storage.setItem(LEGACY_STATE_KEY, state);

  auth = await loadService();
  const userKey = auth.getAccountStorageKey('legacy_user');
  const migratedAccount = auth.listLocalAccounts()[0];
  assert.deepEqual(migratedAccount, { username: 'legacy_user', createdAt: migratedAccount.createdAt });
  assert.equal(Number.isNaN(Date.parse(migratedAccount.createdAt)), false);
  assert.equal(storage.getItem(userKey), state);
  assert.equal(storage.getItem(BACKUP_KEY), state);
  assert.equal(storage.getItem(LEGACY_VAULT_KEY), null);
  assert.equal(storage.getItem(LEGACY_STATE_KEY), null);
  assert.equal(storage.getItem(ACTIVE_KEY), null);
  assert.equal(auth.getActiveUsername(), null);
  assert.equal(auth.hasCombinedAuthVault(), true);

  storage.setItem(userKey, JSON.stringify({ changed: true }));
  auth = await loadService();
  assert.equal(storage.getItem(userKey), JSON.stringify({ changed: true }));
  assert.equal(storage.getItem(BACKUP_KEY), state);
});

test('migration preserves an existing account and never overwrites migrated state or backup', async () => {
  const existingState = JSON.stringify({ profile: { name: 'Current' } });
  const existingBackup = JSON.stringify({ profile: { name: 'Earlier backup' } });
  const existingAccount = [{ username: 'legacy_user', createdAt: '2026-07-30T00:00:00.000Z' }];
  storage.setItem(ACCOUNTS_KEY, JSON.stringify(existingAccount));
  storage.setItem(LEGACY_VAULT_KEY, validVault('legacy_user'));
  storage.setItem(LEGACY_STATE_KEY, JSON.stringify({ profile: { name: 'Old' } }));
  storage.setItem(auth.getAccountStorageKey('legacy_user'), existingState);
  storage.setItem(BACKUP_KEY, existingBackup);

  auth = await loadService();
  assert.equal(storage.getItem(ACCOUNTS_KEY), JSON.stringify(existingAccount));
  assert.equal(storage.getItem(auth.getAccountStorageKey('legacy_user')), existingState);
  assert.equal(storage.getItem(BACKUP_KEY), existingBackup);
  assert.equal(storage.getItem(LEGACY_VAULT_KEY), null);
  assert.equal(storage.getItem(LEGACY_STATE_KEY), null);
});

test('a failed migration write preserves both legacy keys', async () => {
  const state = JSON.stringify({ profile: { name: 'Legacy' } });
  storage.setItem(LEGACY_VAULT_KEY, validVault('legacy_user'));
  storage.setItem(LEGACY_STATE_KEY, state);
  const originalSetItem = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    if (key === BACKUP_KEY) throw new Error('Quota exceeded');
    originalSetItem(key, value);
  };

  auth = await loadService();
  assert.equal(storage.getItem(LEGACY_VAULT_KEY), validVault('legacy_user'));
  assert.equal(storage.getItem(LEGACY_STATE_KEY), state);
  assert.deepEqual(auth.listLocalAccounts(), []);
});

test('sign out rejects when the active username cannot be removed', async () => {
  auth.createLocalAccount('retained', 'Password1');
  auth.resumeLocalAccount('retained');
  storage.removeItem = () => {
    throw new Error('Storage unavailable');
  };

  await assert.rejects(auth.signOut(), /Storage unavailable/);
  assert.equal(storage.getItem(ACTIVE_KEY), 'retained');
  assert.equal(auth.getActiveUsername(), 'retained');
});

test('migration aborts when destination or backup reads fail', async () => {
  const userKey = auth.getAccountStorageKey('legacy_user');
  for (const blockedKey of [userKey, BACKUP_KEY, ACCOUNTS_KEY]) {
    storage = installMockStorage({
      [LEGACY_VAULT_KEY]: validVault('legacy_user'),
      [LEGACY_STATE_KEY]: JSON.stringify({ profile: { name: 'Legacy' } }),
    });
    const originalGetItem = storage.getItem.bind(storage);
    let writes = 0;
    storage.getItem = (key) => {
      if (key === blockedKey) throw new Error('Read unavailable');
      return originalGetItem(key);
    };
    storage.setItem = () => {
      writes += 1;
    };

    auth = await loadService();
    assert.equal(writes, 0, `migration wrote after ${blockedKey} read failure`);
    assert.equal(originalGetItem(LEGACY_VAULT_KEY), validVault('legacy_user'));
    assert.equal(originalGetItem(LEGACY_STATE_KEY), JSON.stringify({ profile: { name: 'Legacy' } }));
  }
});

test('migration retains legacy keys when destination, backup, or metadata writes fail', async () => {
  const userKey = auth.getAccountStorageKey('legacy_user');
  for (const blockedKey of [userKey, BACKUP_KEY, ACCOUNTS_KEY]) {
    const legacyState = JSON.stringify({ profile: { name: 'Legacy' } });
    storage = installMockStorage({
      [LEGACY_VAULT_KEY]: validVault('legacy_user'),
      [LEGACY_STATE_KEY]: legacyState,
    });
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
      if (key === blockedKey) throw new Error('Write unavailable');
      originalSetItem(key, value);
    };

    auth = await loadService();
    assert.equal(storage.getItem(LEGACY_VAULT_KEY), validVault('legacy_user'), blockedKey);
    assert.equal(storage.getItem(LEGACY_STATE_KEY), legacyState, blockedKey);
  }
});

test('malformed legacy JSON is ignored without deleting legacy data', async () => {
  storage.setItem(LEGACY_VAULT_KEY, '{bad json');
  storage.setItem(LEGACY_STATE_KEY, '{bad json');

  auth = await loadService();
  assert.deepEqual(auth.listLocalAccounts(), []);
  assert.equal(storage.getItem(LEGACY_VAULT_KEY), '{bad json');
  assert.equal(storage.getItem(LEGACY_STATE_KEY), '{bad json');
  assert.equal(storage.getItem(BACKUP_KEY), null);
});
