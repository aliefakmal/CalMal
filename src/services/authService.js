const ACCOUNTS_KEY = 'calmal_accounts_v1';
const ACTIVE_KEY = 'calmal_active_username_v1';
const LEGACY_VAULT_KEY = 'calmal_auth_vault';
const LEGACY_STATE_KEY = 'calmal.v1';
const LEGACY_BACKUP_KEY = 'calmal.v1.backup';

const normalizeUsername = (username) => String(username || '').trim().toLowerCase();

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseAccounts(raw, strict = false) {
  let records;
  try {
    records = JSON.parse(raw || '[]');
  } catch {
    if (strict) throw new Error('Local account storage is corrupted. No account changes were made.');
    return [];
  }
  if (!Array.isArray(records)) {
    if (strict) throw new Error('Local account storage is invalid. No account changes were made.');
    return [];
  }
  const seen = new Set();
  const accounts = records.filter((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
    if (typeof record.username !== 'string' || typeof record.createdAt !== 'string') return false;
    const username = normalizeUsername(record.username);
    if (record.username !== username || !validateUsername(username) || !Number.isFinite(Date.parse(record.createdAt))) return false;
    if (seen.has(username)) return false;
    seen.add(username);
    return true;
  }).map(({ username, createdAt }) => ({ username, createdAt }));
  if (strict && accounts.length !== records.length) {
    throw new Error('Local account storage contains invalid records. No account changes were made.');
  }
  return accounts;
}

function readAccounts() {
  return parseAccounts(readStorage(ACCOUNTS_KEY));
}

function readAccountsForWrite() {
  return parseAccounts(localStorage.getItem(ACCOUNTS_KEY), true);
}

function migrateLegacyAccount() {
  let rawVault;
  let rawState;
  try {
    rawVault = localStorage.getItem(LEGACY_VAULT_KEY);
    rawState = localStorage.getItem(LEGACY_STATE_KEY);
  } catch {
    return;
  }
  if (rawVault === null || rawState === null) return;

  try {
    const vault = JSON.parse(rawVault);
    const state = JSON.parse(rawState);
    const username = normalizeUsername(vault?.username);
    if (!validateUsername(username) || !state || typeof state !== 'object' || Array.isArray(state)) return;

    const userKey = getAccountStorageKey(username);
    const destination = localStorage.getItem(userKey);
    const backup = localStorage.getItem(LEGACY_BACKUP_KEY);
    const rawAccounts = localStorage.getItem(ACCOUNTS_KEY);
    const parsedAccounts = rawAccounts === null ? [] : JSON.parse(rawAccounts);
    if (!Array.isArray(parsedAccounts)) return;
    const accounts = readAccounts();
    const accountExists = accounts.some((account) => account.username === username);
    const createdAt = typeof vault.createdAt === 'string' && Number.isFinite(Date.parse(vault.createdAt))
      ? vault.createdAt
      : new Date().toISOString();
    const serializedAccounts = accountExists ? rawAccounts : JSON.stringify([...accounts, { username, createdAt }]);

    if (destination === null) localStorage.setItem(userKey, rawState);
    if (backup === null) localStorage.setItem(LEGACY_BACKUP_KEY, rawState);
    if (!accountExists) localStorage.setItem(ACCOUNTS_KEY, serializedAccounts);
    if (localStorage.getItem(userKey) === null || localStorage.getItem(LEGACY_BACKUP_KEY) === null) return;
    if (localStorage.getItem(ACCOUNTS_KEY) !== serializedAccounts) return;
    if (!readAccounts().some((account) => account.username === username)) return;

    localStorage.removeItem(LEGACY_VAULT_KEY);
    localStorage.removeItem(LEGACY_STATE_KEY);
  } catch {
    // Legacy values remain available for a later migration attempt.
  }
}

export function validateUsername(username) {
  return /^[a-z0-9_]{3,32}$/.test(String(username || '').trim().toLowerCase());
}

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}

export function getAccountStorageKey(username) {
  return `calmal.user.${encodeURIComponent(normalizeUsername(username))}`;
}

export function createLocalAccount(username, password) {
  const normalized = normalizeUsername(username);
  if (!validateUsername(normalized)) throw new Error('Username must be 3 to 32 lowercase letters, numbers, or underscores.');
  if (!validatePassword(password)) throw new Error('Password must be 8+ characters with uppercase, lowercase, and a number.');

  const accounts = readAccountsForWrite();
  if (accounts.some((account) => account.username === normalized)) throw new Error('This local account already exists.');
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([
    ...accounts,
    { username: normalized, createdAt: new Date().toISOString() },
  ]));
  if (accounts.length === 0) migrateLegacyStateToAccount(normalized);
  return { username: normalized };
}

export function migrateLegacyStateToAccount(username) {
  const normalized = normalizeUsername(username);
  if (!readAccountsForWrite().some((account) => account.username === normalized)) {
    throw new Error('Create the local account before migrating guest data.');
  }

  const rawState = localStorage.getItem(LEGACY_STATE_KEY);
  if (rawState === null) return false;
  const state = JSON.parse(rawState);
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('Guest data is invalid and was not migrated.');
  }

  const userKey = getAccountStorageKey(normalized);
  const destination = localStorage.getItem(userKey);
  const backup = localStorage.getItem(LEGACY_BACKUP_KEY);
  if (destination !== null && destination !== rawState) {
    throw new Error('This account already has data. Guest data was not migrated.');
  }

  if (destination === null) localStorage.setItem(userKey, rawState);
  if (backup === null) localStorage.setItem(LEGACY_BACKUP_KEY, rawState);
  if (localStorage.getItem(userKey) !== rawState || localStorage.getItem(LEGACY_BACKUP_KEY) !== rawState) {
    throw new Error('Guest data could not be verified. The original data was kept.');
  }

  localStorage.removeItem(LEGACY_STATE_KEY);
  if (localStorage.getItem(LEGACY_STATE_KEY) !== null) {
    throw new Error('Guest data was copied, but its original entry could not be removed.');
  }
  return true;
}

export function listLocalAccounts() {
  return readAccounts().sort((a, b) => a.username.localeCompare(b.username));
}

export function resumeLocalAccount(username) {
  const normalized = normalizeUsername(username);
  if (!validateUsername(normalized)) throw new Error('Enter a valid username.');
  if (!readAccounts().some((account) => account.username === normalized)) throw new Error('Local account not found.');
  localStorage.setItem(ACTIVE_KEY, normalized);
  return { username: normalized };
}

export function getActiveUsername() {
  const username = normalizeUsername(readStorage(ACTIVE_KEY));
  return readAccounts().some((account) => account.username === username) ? username : null;
}

export function isCombinedAuthActive() {
  return getActiveUsername() !== null;
}

export function hasCombinedAuthVault() {
  return readAccounts().length > 0;
}

export async function signOut() {
  localStorage.removeItem(ACTIVE_KEY);
}

migrateLegacyAccount();
