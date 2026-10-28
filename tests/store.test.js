import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { installMockStorage } from './helpers/mockStorage.js';

const ACTIVE_KEY = 'calmal_active_username_v1';
const LEGACY_STATE_KEY = 'calmal.v1';

let storage;
let auth;
let store;
let importSequence = 0;

async function loadStore() {
  const module = await import(`../src/services/store.js?test=${++importSequence}`);
  store = module.store;
  return module;
}

beforeEach(async () => {
  storage = installMockStorage();
  auth = await import(`../src/services/authService.js?test=${++importSequence}`);
  await loadStore();
});

function createAccount(username) {
  auth.createLocalAccount(username, 'Password1');
  return auth.getAccountStorageKey(username);
}

function assertDefaultState(state) {
  assert.equal(state.profile, null);
  for (const key of ['meals', 'activities', 'weights', 'recipes']) {
    assert.deepEqual(state[key], [], key);
  }
  assert.equal(state.mealPlan, null);
  assert.deepEqual(state.water, {});
  assert.deepEqual(state.badges, {});
  assert.deepEqual(state.flags, {});
  assert.deepEqual(state.companionLines, { deku: null, bakugou: null });
  assert.deepEqual(state.settings, {
    apiKey: '',
    notifications: false,
    companions: true,
    soundEnabled: true,
    cameraAlwaysOn: true,
    cameraFacing: 'environment',
  });
}

test('no active account exposes defaults and never reads or writes shared legacy state', async () => {
  storage.setItem(LEGACY_STATE_KEY, JSON.stringify({ profile: { name: 'Legacy' }, meals: [{ id: 'legacy-meal' }] }));
  await loadStore();

  assert.equal(store.getStorageKey(), null);
  assertDefaultState(store.state);

  let writes = 0;
  storage.setItem = () => { writes += 1; };
  store.saveSettings({ notifications: true });
  assert.equal(writes, 0);
  assert.equal(storage.getItem(LEGACY_STATE_KEY), JSON.stringify({ profile: { name: 'Legacy' }, meals: [{ id: 'legacy-meal' }] }));
});

test('account state is isolated and a new account starts with defaults', () => {
  const aKey = createAccount('alpha');
  const bKey = createAccount('beta');

  store.activateAccount('alpha');
  assert.equal(store.getStorageKey(), aKey);
  store.saveProfile({ name: 'Alpha', weight: 72, selectedCompanion: 'deku' });
  store.addMeal({ id: 'alpha-meal', name: 'Nasi lemak', kcal: 450 });
  store.addActivity({ id: 'alpha-activity', type: 'run', kcal: 220 });
  store.logWeight(71);
  store.saveRecipe({ id: 'alpha-recipe', name: 'Alpha recipe' });
  store.saveSettings({ notifications: true, cameraFacing: 'user' });

  const alphaState = JSON.parse(storage.getItem(aKey));
  assert.equal(alphaState.profile.name, 'Alpha');
  assert.equal(storage.getItem(bKey), null);
  assert.equal(storage.getItem(LEGACY_STATE_KEY), null);

  const betaState = store.activateAccount('beta');
  assert.strictEqual(betaState, store.state);
  assert.equal(store.getStorageKey(), bKey);
  assertDefaultState(betaState);
  assert.equal(storage.getItem(aKey), JSON.stringify(alphaState));
});

test('returning to an account restores its complete state and a reload restores the active account', async () => {
  const aKey = createAccount('alpha');
  const bKey = createAccount('beta');
  store.activateAccount('alpha');
  store.saveProfile({ name: 'Alpha', weight: 72, selectedCompanion: 'bakugou' });
  store.addMeal({ id: 'alpha-meal', name: 'Nasi lemak', kcal: 450 });
  store.addActivity({ id: 'alpha-activity', type: 'run', kcal: 220 });
  store.logWeight(71);
  store.saveRecipe({ id: 'alpha-recipe', name: 'Alpha recipe' });
  store.saveSettings({ notifications: true, cameraFacing: 'user' });
  const expected = JSON.parse(storage.getItem(aKey));

  store.activateAccount('beta');
  store.saveProfile({ name: 'Beta', weight: 65 });
  store.addMeal({ id: 'beta-meal', name: 'Beta meal' });
  const betaStored = storage.getItem(bKey);

  store.activateAccount('alpha');
  assert.deepEqual(store.state, expected);
  assert.equal(store.profile.name, 'Alpha');
  assert.deepEqual(store.state.meals.map(({ id }) => id), ['alpha-meal']);
  assert.deepEqual(store.state.activities.map(({ id }) => id), ['alpha-activity']);
  assert.deepEqual(store.state.weights, expected.weights);
  assert.deepEqual(store.state.recipes.map(({ id }) => id), ['alpha-recipe']);
  assert.equal(store.settings.notifications, true);
  assert.equal(store.settings.cameraFacing, 'user');
  assert.equal(storage.getItem(bKey), betaStored);

  assert.equal(storage.getItem(aKey), JSON.stringify(expected));
  await loadStore();
  assert.equal(auth.getActiveUsername(), 'alpha');
  assert.equal(store.getStorageKey(), aKey);
  assert.deepEqual(store.state, expected);
});

test('clearing the active account preserves every user store and emits a routing notification', async () => {
  const aKey = createAccount('alpha');
  const bKey = createAccount('beta');
  store.activateAccount('alpha');
  storage.setItem(aKey, JSON.stringify({ profile: { name: 'Alpha' }, meals: [{ id: 'alpha-meal' }] }));
  storage.setItem(bKey, JSON.stringify({ profile: { name: 'Beta' }, recipes: [{ id: 'beta-recipe' }] }));
  await loadStore();
  const aStored = storage.getItem(aKey);
  const bStored = storage.getItem(bKey);
  const events = [];
  store.subscribe((type, state) => events.push({ type, state }));

  await store.clearActiveAccount();

  assert.equal(auth.getActiveUsername(), null);
  assert.equal(storage.getItem(ACTIVE_KEY), null);
  assert.equal(store.getStorageKey(), null);
  assertDefaultState(store.state);
  assert.deepEqual(JSON.parse(storage.getItem(aKey)).profile, JSON.parse(aStored).profile);
  assert.deepEqual(JSON.parse(storage.getItem(aKey)).meals, JSON.parse(aStored).meals);
  assert.equal(storage.getItem(bKey), bStored);
  assert.deepEqual(events, [{ type: 'reset', state: store.state }]);

  let writes = 0;
  storage.setItem = () => { writes += 1; };
  store.saveSettings({ notifications: true });
  assert.equal(writes, 0);
});

test('malformed account JSON and incorrectly typed fields load safe normalized defaults', async () => {
  const key = createAccount('alpha');
  auth.resumeLocalAccount('alpha');
  storage.setItem(key, '{not json');
  await loadStore();
  assertDefaultState(store.state);

  storage.setItem(key, JSON.stringify({
    profile: [],
    meals: {},
    activities: 'wrong',
    weights: null,
    recipes: 7,
    mealPlan: [],
    water: [],
    badges: 'wrong',
    flags: null,
    companionLines: [],
    settings: { notifications: true, cameraFacing: 'user' },
  }));
  await loadStore();
  assertDefaultState({ ...store.state, settings: { ...store.state.settings, notifications: false, cameraFacing: 'environment' } });
  assert.equal(store.settings.notifications, true);
  assert.equal(store.settings.cameraFacing, 'user');
});

test('account activation does not enqueue or schedule cloud synchronization', async (context) => {
  const aKey = createAccount('alpha');
  const bKey = createAccount('beta');
  store.activateAccount('alpha');
  store.saveProfile({ name: 'Alpha' });
  store.addMeal({ id: 'alpha-meal', name: 'Nasi lemak' });
  store.activateAccount('beta');
  store.addMeal({ id: 'beta-meal', name: 'Beta meal' });
  storage.setItem(bKey, JSON.stringify({
    profile: { name: 'Beta' },
    meals: [{ id: 'beta-meal', name: 'Beta meal', kcal: 200 }],
  }));
  storage.removeItem('calmal_sync_queue');
  storage.removeItem('calmal_sync_status');
  let enqueues = 0;
  let schedules = 0;
  context.mock.module(new URL('../src/services/supabaseClient.js', import.meta.url).href, {
    namedExports: { scheduleCloudSync: () => { schedules += 1; } },
  });
  context.mock.module(new URL('../src/services/syncService.js', import.meta.url).href, {
    namedExports: {
      enqueueMutation: () => {},
      enqueueStateSync: () => { enqueues += 1; },
    },
  });
  try {
    await loadStore();
    store.activateAccount('beta');
  } finally {
    context.mock.reset();
  }

  assert.equal(enqueues, 0);
  assert.equal(schedules, 0);
  assert.equal(storage.getItem('calmal_sync_queue'), null);
  assert.equal(storage.getItem('calmal_sync_status'), null);
  assert.equal(storage.getItem(aKey) !== null, true);
});

test('a failed current-account persist rejects switching without changing the active account or state', () => {
  const aKey = createAccount('alpha');
  const bKey = createAccount('beta');
  store.activateAccount('alpha');
  store.saveProfile({ name: 'Alpha' });
  const activeState = store.state;
  const originalSetItem = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    if (key === aKey) throw new Error('Storage unavailable');
    originalSetItem(key, value);
  };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.throws(() => store.activateAccount('beta'), /save current account/i);
  } finally {
    console.warn = originalWarn;
  }

  assert.strictEqual(store.state, activeState);
  assert.equal(store.profile.name, 'Alpha');
  assert.equal(store.getStorageKey(), aKey);
  assert.equal(auth.getActiveUsername(), 'alpha');
  assert.equal(storage.getItem(bKey), null);
});

test('a failed pruning retry preserves active state identity and thumbnail content', () => {
  const aKey = createAccount('alpha');
  const bKey = createAccount('beta');
  store.activateAccount('alpha');
  store.addMeal({ id: 'meal-1', name: 'First', thumb: 'first-image' });
  store.addMeal({ id: 'meal-2', name: 'Second', thumb: 'second-image' });
  const activeState = store.state;
  const meals = [...activeState.meals];
  const serialized = JSON.stringify(activeState);
  const originalSetItem = storage.setItem.bind(storage);
  let attempts = 0;
  storage.setItem = (key, value) => {
    if (key === aKey) {
      attempts += 1;
      throw new Error('Storage unavailable');
    }
    originalSetItem(key, value);
  };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.throws(() => store.activateAccount('beta'), /save current account/i);
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(attempts, 2);
  assert.strictEqual(store.state, activeState);
  assert.deepEqual(store.state.meals, meals);
  assert.equal(JSON.stringify(store.state), serialized);
  assert.equal(store.state.meals[1].thumb, 'first-image');
  assert.equal(store.state.meals[0].thumb, 'second-image');
  assert.equal(auth.getActiveUsername(), 'alpha');
});

test('a failed current-account persist rejects clearing the active account and emits nothing', async () => {
  const aKey = createAccount('alpha');
  store.activateAccount('alpha');
  store.saveProfile({ name: 'Alpha' });
  const activeState = store.state;
  let notifications = 0;
  store.subscribe(() => { notifications += 1; });
  storage.setItem = () => { throw new Error('Storage unavailable'); };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await assert.rejects(store.clearActiveAccount(), /save current account/i);
  } finally {
    console.warn = originalWarn;
  }

  assert.strictEqual(store.state, activeState);
  assert.equal(store.getStorageKey(), aKey);
  assert.equal(auth.getActiveUsername(), 'alpha');
  assert.equal(notifications, 0);
});
