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
  const cloud = {
    getCurrentUser: async () => ({ id: 'cloud-user' }),
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
  return import(`../src/services/syncService.js?test=${++importSequence}`);
}

test('no active account cannot enqueue, process, merge, or write sync status', async (context) => {
  let cloudRequests = 0;
  const service = await loadSyncService(context, {
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
  const service = await loadSyncService(context);

  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-meal' });
  await service.processSyncQueue();
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
  assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha')), null);
  assert.equal(storage.getItem(LEGACY_QUEUE_KEY), legacyQueue);
  assert.equal(storage.getItem(LEGACY_STATUS_KEY), legacyStatus);
});

test('merge reads only the active account state key and leaves its queue local', async (context) => {
  const alphaKey = activate('alpha');
  activate('beta');
  auth.resumeLocalAccount('alpha');
  storage.setItem('calmal.v1', JSON.stringify({ meals: [{ id: 'legacy-meal', name: 'Legacy' }] }));
  storage.setItem(alphaKey, JSON.stringify({ meals: [{ id: 'alpha-meal', name: 'Active account' }] }));
  storage.setItem(auth.getAccountStorageKey('beta'), JSON.stringify({ meals: [{ id: 'beta-meal', name: 'Other account' }] }));
  const service = await loadSyncService(context);

  await service.mergeGuestDataToCloud();

  assert.deepEqual(readQueue('alpha').map((item) => item.payload.client_id), ['alpha-meal']);
  assert.equal(readQueue('beta').length, 0);
  assert.equal(storage.getItem('calmal.v1'), JSON.stringify({ meals: [{ id: 'legacy-meal', name: 'Legacy' }] }));
  assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha')), null);
});

test('configured Supabase and an active local account cannot trigger cloud access or queue processing', async (context) => {
  online = true;
  activate('alpha');
  let cloudRequests = 0;
  const service = await loadSyncService(context, {
    getCurrentUser: async () => { cloudRequests += 1; return { id: 'persisted-cloud-user' }; },
    supabase: {
      from() {
        cloudRequests += 1;
        throw new Error('Local account attempted a cloud request');
      },
    },
  });
  storage.setItem(auth.getAccountStorageKey('alpha'), JSON.stringify({ meals: [{ id: 'state-meal', name: 'Local only' }] }));

  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'queued-meal' });
  await service.processSyncQueue();
  await service.mergeGuestDataToCloud();

  assert.equal(cloudRequests, 0);
  assert.deepEqual(readQueue('alpha').map((item) => item.payload.client_id), ['queued-meal', 'state-meal']);
  assert.equal(service.getSyncStatus().status, 'saved_offline');
  assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha')), null);
});

test('queue processing preserves pending local mutations across account switches and sign out', async (context) => {
  online = true;
  activate('alpha');
  activate('beta');
  auth.resumeLocalAccount('alpha');
  const service = await loadSyncService(context);
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-before' });
  const originalAlphaQueue = storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'alpha'));

  auth.resumeLocalAccount('beta');
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'beta-meal' });
  const originalBetaQueue = storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'beta'));
  await service.processSyncQueue();
  auth.resumeLocalAccount('alpha');
  service.enqueueMutation('meal_logs', 'UPSERT', { client_id: 'alpha-during' });
  await service.processSyncQueue();
  await auth.signOut();
  await service.processSyncQueue();

  assert.equal(storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'beta')), originalBetaQueue);
  assert.deepEqual(readQueue('alpha').map((item) => item.payload.client_id), ['alpha-before', 'alpha-during']);
  assert.notEqual(storage.getItem(scopedKey(LEGACY_QUEUE_KEY, 'alpha')), originalAlphaQueue);
  assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'alpha')), null);
  assert.equal(storage.getItem(scopedKey(LEGACY_STATUS_KEY, 'beta')), null);
});

test('online and visibility callbacks are not registered for local account cloud sync', async (context) => {
  activate('alpha');
  const windowListeners = [];
  const documentListeners = [];
  globalThis.window = { addEventListener: (type, listener) => windowListeners.push({ type, listener }) };
  globalThis.document = {
    visibilityState: 'visible',
    addEventListener: (type, listener) => documentListeners.push({ type, listener }),
  };
  try {
    const service = await loadSyncService(context);
    assert.equal(windowListeners.filter(({ type }) => type === 'online').length, 0);
    assert.equal(documentListeners.filter(({ type }) => type === 'visibilitychange').length, 0);
    await service.processSyncQueue();
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});

async function loadCloudScheduler(context) {
  let authRequests = 0;
  const upserts = [];
  context.mock.module('@supabase/supabase-js', {
    namedExports: {
      createClient: () => ({
        auth: {
          async getSession() {
            authRequests += 1;
            return { data: { session: { user: { id: 'persisted-cloud-user' } } } };
          },
        },
        from(table) {
          return {
            async upsert(payload) {
              upserts.push({ table, payload });
              return { error: null };
            },
          };
        },
      }),
    },
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
  assert.equal(client.supabase, null);
  return {
    ...client,
    upserts,
    get authRequests() { return authRequests; },
  };
}

test('local-only mode does not construct Supabase even when configuration looks valid', async (context) => {
  let clientCreations = 0;
  context.mock.module('@supabase/supabase-js', {
    namedExports: {
      createClient: () => {
        clientCreations += 1;
        throw new Error('Local account flow initialized Supabase');
      },
    },
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
  assert.equal(client.supabase, null);
  assert.equal(clientCreations, 0);
});

test('scheduled sync and current-user lookup never use a configured client or persisted session', async (context) => {
  const client = await loadCloudScheduler(context);
  client.scheduleCloudSync({ profile: { name: 'Guest' } });
  activate('alpha');
  client.scheduleCloudSync({ profile: { username: 'alpha', name: 'Alpha' } });
  auth.resumeLocalAccount('alpha');
  assert.equal(await client.getCurrentUser(), null);
  await auth.signOut();
  await new Promise((resolve) => setTimeout(resolve, 2600));

  assert.equal(client.authRequests, 0);
  assert.deepEqual(client.upserts, []);
});

test('state sync maps step goal and activity type', async (context) => {
  activate('alpha');
  const service = await loadSyncService(context);
  service.enqueueStateSync({
    profile: { name: 'A', stepGoal: 9000 },
    meals: [],
    activities: [{ id: 'act-1', activityType: 'run', startedAt: '2026-10-29T01:00:00Z', endedAt: '2026-10-29T01:30:00Z', distanceKm: 5 }],
  });
  const queue = readQueue('alpha');
  assert.equal(queue.find((i) => i.table === 'profiles').payload.daily_step_goal, 9000);
  const act = queue.find((i) => i.table === 'activity_sessions').payload;
  assert.equal(act.activity_type, 'run');
  assert.equal(act.start_time, '2026-10-29T01:00:00Z');
  assert.equal(act.end_time, '2026-10-29T01:30:00Z');
});
