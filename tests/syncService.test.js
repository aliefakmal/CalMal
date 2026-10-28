import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { installMockStorage } from './helpers/mockStorage.js';

const LEGACY_QUEUE_KEY = 'calmal_sync_queue';
const LEGACY_STATUS_KEY = 'calmal_sync_status';

let storage;
let auth;
let online;
let importSequence = 0;

beforeEach(async () => {
  storage = installMockStorage();
  online = false;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { get onLine() { return online; } },
  });
  auth = await import(`../src/services/authService.js?test=${++importSequence}`);
});

function activate(username) {
  auth.createLocalAccount(username, 'Password1');
  auth.resumeLocalAccount(username);
  return auth.getAccountStorageKey(username);
}

function scopedKey(base, username) {
  return `${base}.${encodeURIComponent(username)}`;
}

function readQueue(username) {
  return JSON.parse(storage.getItem(scopedKey(LEGACY_QUEUE_KEY, username)) || '[]');
}

async function loadSyncService(context, supabaseOverrides = {}) {
  let resolveUser;
  const userReady = new Promise((resolve) => { resolveUser = resolve; });
  const cloud = {
    getCurrentUser: () => userReady,
    supabase: {
      from() {
        throw new Error('Unexpected cloud request');
      },
    },
    ...supabaseOverrides,
  };
  context.mock.module(new URL('../src/services/supabaseClient.js', import.meta.url).href, {
    namedExports: cloud,
  });
  const service = await import(`../src/services/syncService.js?test=${++importSequence}`);
  return { service, releaseUser: (user = { id: 'cloud-user' }) => resolveUser(user) };
}

test('no active account cannot enqueue, process, merge, or write sync status', async (context) => {
  let cloudRequests = 0;
  const { service } = await loadSyncService(context, {
    getCurrentUser: async () => { cloudRequests += 1; return { id: 'cloud-user' }; },
    supabase: { from: () => { cloudRequests += 1; } },
  });

  assert.equal(service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'meal-1' }), undefined);
  service.enqueueStateSync({ profile: { name: 'Guest' }, meals: [{ id: 'meal-1' }] });
  await service.processSyncQueue();
  await service.mergeGuestDataToCloud();

  assert.equal(cloudRequests, 0);
  assert.deepEqual(service.getSyncStatus(), { status: 'saved_offline' });
  assert.deepEqual(storage.entries(), {});
});

test('queues and statuses are isolated by account and legacy unscoped values stay untouched', async (context) => {
  const legacyQueue = JSON.stringify([{ id: 'legacy', table: 'meal_logs', payload: { client_id: 'legacy-meal' } }]);
  const legacyStatus = JSON.stringify({ status: 'legacy', at: 'before-local-accounts' });
  storage.setItem(LEGACY_QUEUE_KEY, legacyQueue);
  storage.setItem(LEGACY_STATUS_KEY, legacyStatus);
  activate('alpha');
  activate('beta');
  auth.resumeLocalAccount('alpha');
  const { service, releaseUser } = await loadSyncService(context);
  releaseUser();

  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-meal' });
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await service.processSyncQueue();
  } finally {
    console.warn = originalWarn;
  }
  const alphaStatus = storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha'));
  assert.equal(readQueue('alpha').length, 1);
  assert.equal(readQueue('beta').length, 0);
  assert.equal(service.getSyncStatus().status, 'saved_offline');

  auth.resumeLocalAccount('beta');
  assert.deepEqual(service.getSyncStatus(), { status: 'saved_offline' });
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'beta-meal' });
  assert.deepEqual(readQueue('alpha').map((item) => item.payload.client_id), ['alpha-meal']);
  assert.deepEqual(readQueue('beta').map((item) => item.payload.client_id), ['beta-meal']);

  await auth.signOut();
  assert.equal(readQueue('alpha').length, 1);
  assert.equal(readQueue('beta').length, 1);
  assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha')), alphaStatus);
  assert.equal(storage.getItem(LEGACY_QUEUE_KEY), legacyQueue);
  assert.equal(storage.getItem(LEGACY_STATUS_KEY), legacyStatus);
});

test('merge reads only the active account state key', async (context) => {
  const alphaKey = activate('alpha');
  activate('beta');
  auth.resumeLocalAccount('alpha');
  storage.setItem('calmal.v1', JSON.stringify({ meals: [{ id: 'legacy-meal', name: 'Legacy' }] }));
  storage.setItem(alphaKey, JSON.stringify({ meals: [{ id: 'alpha-meal', name: 'Active account' }] }));
  storage.setItem(auth.getAccountStorageKey('beta'), JSON.stringify({ meals: [{ id: 'beta-meal', name: 'Other account' }] }));
  const { service, releaseUser } = await loadSyncService(context);
  releaseUser(null);

  await service.mergeGuestDataToCloud();

  assert.deepEqual(readQueue('alpha').map((item) => item.payload.client_id), ['alpha-meal']);
  assert.equal(readQueue('beta').length, 0);
  assert.equal(storage.getItem('calmal.v1'), JSON.stringify({ meals: [{ id: 'legacy-meal', name: 'Legacy' }] }));
});

test('a delayed auth response cannot write a failed item into a different account queue', async (context) => {
  online = true;
  activate('alpha');
  activate('beta');
  auth.resumeLocalAccount('alpha');
  let releaseUser;
  const upserts = [];
  const { service } = await loadSyncService(context, {
    getCurrentUser: () => new Promise((resolve) => { releaseUser = resolve; }),
    supabase: {
      from(table) {
        return {
          upsert: async (payload) => {
            upserts.push({ table, payload });
            return { error: new Error('Cloud unavailable') };
          },
        };
      },
    },
  });
  online = false;
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-meal' });
  const originalAlphaQueue = storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'alpha'));
  online = true;
  const processing = service.processSyncQueue();
  await new Promise((resolve) => setImmediate(resolve));
  auth.resumeLocalAccount('beta');
  online = false;
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'beta-meal' });
  const originalBetaQueue = storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'beta'));
  releaseUser({ id: 'cloud-user' });
  await processing;

  assert.equal(upserts.length, 0);
  assert.equal(storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'alpha')), originalAlphaQueue);
  assert.equal(storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'beta')), originalBetaQueue);
  assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'beta')), null);
});

test('a delayed failed upsert cannot rewrite queues or status after sign out', async (context) => {
  online = true;
  activate('alpha');
  let releaseUpsert;
  const { service, releaseUser } = await loadSyncService(context, {
    supabase: {
      from() {
        return {
          upsert: () => new Promise((resolve) => {
            releaseUpsert = () => resolve({ error: new Error('Cloud unavailable') });
          }),
        };
      },
    },
  });
  releaseUser();
  online = false;
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-meal' });
  const originalQueue = storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'alpha'));
  online = true;
  const processing = service.processSyncQueue();
  await new Promise((resolve) => setImmediate(resolve));
  const syncingStatus = storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha'));
  assert.equal(JSON.parse(syncingStatus).status, 'syncing');
  await auth.signOut();
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    releaseUpsert();
    await processing;
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'alpha')), originalQueue);
  assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha')), syncingStatus);
});

for (const outcome of ['successful', 'failed']) {
  test(`a delayed ${outcome} upsert cannot overwrite either account queue or status after Alpha to Beta switch`, async (context) => {
    online = true;
    activate('alpha');
    activate('beta');
    auth.resumeLocalAccount('alpha');
    let releaseUpsert;
    const { service, releaseUser } = await loadSyncService(context, {
      supabase: {
        from() {
          return {
            upsert: () => new Promise((resolve) => {
              releaseUpsert = () => resolve({ error: outcome === 'failed' ? new Error('Cloud unavailable') : null });
            }),
          };
        },
      },
    });
    releaseUser();
    online = false;
    service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-meal' });
    online = true;
    const processing = service.processSyncQueue();
    await new Promise((resolve) => setImmediate(resolve));
    const alphaSyncingStatus = storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha'));
    assert.equal(JSON.parse(alphaSyncingStatus).status, 'syncing');

    auth.resumeLocalAccount('beta');
    online = false;
    service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'beta-meal' });
    const originalBetaQueue = storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'beta'));
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      releaseUpsert();
      await processing;
    } finally {
      console.warn = originalWarn;
    }

    assert.deepEqual(readQueue('alpha').map((item) => item.payload.client_id), ['alpha-meal']);
    assert.equal(storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'beta')), originalBetaQueue);
    assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha')), alphaSyncingStatus);
    assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'beta')), null);
  });
}

test('a delayed upsert preserves Alpha mutations added during processing after switching to Beta', async (context) => {
  online = true;
  activate('alpha');
  activate('beta');
  auth.resumeLocalAccount('alpha');
  let releaseUpsert;
  const { service, releaseUser } = await loadSyncService(context, {
    supabase: {
      from() {
        return {
          upsert: () => new Promise((resolve) => {
            releaseUpsert = () => resolve({ error: null });
          }),
        };
      },
    },
  });
  releaseUser();
  online = false;
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-before' });
  online = true;
  const processing = service.processSyncQueue();
  await new Promise((resolve) => setImmediate(resolve));
  const alphaSyncingStatus = storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha'));

  auth.resumeLocalAccount('beta');
  online = false;
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'beta-meal' });
  auth.resumeLocalAccount('alpha');
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-during' });
  auth.resumeLocalAccount('beta');
  const originalBetaQueue = storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'beta'));
  releaseUpsert();
  await processing;

  assert.deepEqual(readQueue('alpha').map((item) => item.payload.client_id), ['alpha-before', 'alpha-during']);
  assert.equal(storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'beta')), originalBetaQueue);
  assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha')), alphaSyncingStatus);
  assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'beta')), null);
});

test('queue completion preserves mutations enqueued while the same account request is pending', async (context) => {
  online = true;
  activate('alpha');
  let releaseUpsert;
  const { service, releaseUser } = await loadSyncService(context, {
    supabase: {
      from() {
        return {
          upsert: () => new Promise((resolve) => {
            releaseUpsert = () => resolve({ error: null });
          }),
        };
      },
    },
  });
  releaseUser();
  online = false;
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-before' });
  online = true;
  const processing = service.processSyncQueue();
  await new Promise((resolve) => setImmediate(resolve));
  online = false;
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-during' });
  releaseUpsert();
  await processing;

  assert.deepEqual(readQueue('alpha').map((item) => item.payload.client_id), ['alpha-during']);
  assert.equal(JSON.parse(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha'))).status, 'saved_offline');
});

async function loadCloudScheduler(context) {
  let authRequests = 0;
  let releaseUser;
  const upserts = [];
  context.mock.module('@supabase/supabase-js', {
    namedExports: { createClient: () => ({ auth: {}, from() {} }) },
  });
  const previousUrl = process.env.VITE_SUPABASE_URL;
  const previousKey = process.env.VITE_SUPABASE_ANON_KEY;
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
  context.after(() => {
    if (previousUrl === undefined) delete process.env.VITE_SUPABASE_URL;
    else process.env.VITE_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.VITE_SUPABASE_ANON_KEY;
    else process.env.VITE_SUPABASE_ANON_KEY = previousKey;
  });
  const client = await import(`../src/services/supabaseClient.js?test=${++importSequence}`);
  assert.equal(client.isSupabaseConfigured, true);
  client.supabase.auth.getSession = async () => {
    authRequests += 1;
    const user = await new Promise((resolve) => { releaseUser = resolve; });
    return { data: { session: user ? { user } : null } };
  };
  client.supabase.from = (table) => ({
    upsert: async (payload) => {
      upserts.push({ table, payload, username: auth.getActiveUsername() });
      return { error: null };
    },
  });
  return {
    ...client,
    upserts,
    get authRequests() { return authRequests; },
    releaseUser(user = { id: 'cloud-user' }) { releaseUser(user); },
  };
}

test('scheduled cloud sync is a storage and cloud no-op without an active account', async (context) => {
  const client = await loadCloudScheduler(context);
  client.scheduleCloudSync({ profile: { name: 'Guest' } });
  await new Promise((resolve) => setTimeout(resolve, 2600));
  assert.equal(client.authRequests, 0);
  assert.deepEqual(client.upserts, []);
  assert.deepEqual(storage.entries(), {});
});

test('scheduled cloud sync cannot upsert stale state after account switch or sign out', async (context) => {
  activate('alpha');
  activate('beta');
  auth.resumeLocalAccount('alpha');
  const client = await loadCloudScheduler(context);
  const originalInfo = console.info;
  console.info = () => {};
  try {
    client.scheduleCloudSync({ profile: { username: 'alpha', name: 'Alpha' } });
    auth.resumeLocalAccount('beta');
    await new Promise((resolve) => setTimeout(resolve, 2600));
    assert.equal(client.authRequests, 0);

    auth.resumeLocalAccount('alpha');
    client.scheduleCloudSync({ profile: { username: 'alpha', name: 'Alpha' } });
    await new Promise((resolve) => setTimeout(resolve, 2600));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(client.authRequests, 1);
    await auth.signOut();
    client.releaseUser();
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    console.info = originalInfo;
  }

  assert.deepEqual(client.upserts, []);
});
