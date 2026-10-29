import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { installMockStorage } from './helpers/mockStorage.js';

// Browser stubs must exist before the tracker module loads.
installMockStorage();
const docHandlers = {};
const winHandlers = {};
let geoCallback = null;
globalThis.document = {
  visibilityState: 'visible',
  documentElement: { style: { setProperty() {} } },
  addEventListener: (type, fn) => { docHandlers[type] = fn; },
};
globalThis.window = {
  addEventListener: (type, fn) => { winHandlers[type] = fn; },
  removeEventListener: (type) => { delete winHandlers[type]; },
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    geolocation: {
      watchPosition: (ok) => { geoCallback = ok; return 1; },
      clearWatch: () => { geoCallback = null; },
      getCurrentPosition: () => {},
    },
  },
});

const auth = await import('../src/services/authService.js');
auth.createLocalAccount('alpha', 'Password1');
auth.createLocalAccount('beta', 'Password1');
auth.resumeLocalAccount('alpha');
const { store } = await import('../src/services/store.js');
const tracker = await import('../src/services/gpsTracker.js');

const KM_LAT = 1 / 111.195; // degrees latitude per km
const feed = (lat, speed = null, lng = 101) => geoCallback?.({ coords: { latitude: lat, longitude: lng, altitude: null, accuracy: 5, speed }, timestamp: Date.now() });
const setVisibility = (v) => { document.visibilityState = v; docHandlers.visibilitychange(); };

beforeEach(() => {
  mock.timers.enable({ apis: ['setInterval', 'setTimeout', 'Date'], now: 1_000_000 });
  store.activateAccount('alpha');
  store.clearLiveSession();
  document.visibilityState = 'visible';
});

afterEach(() => {
  tracker.discard();
  mock.timers.reset();
});

test('restore brings session back paused', () => {
  store.saveLiveSession({ status: 'running', distanceKm: 1.5, elapsedSec: 600, segments: [[[3, 101, null, 1]]] });
  assert.equal(tracker.restoreLiveSession(), true);
  const s = tracker.getStats();
  assert.equal(s.status, 'paused');
  assert.equal(s.restored, true);
  assert.equal(s.distanceKm, 1.5);
  assert.equal(s.points.length, 1);
  tracker.resume();
  assert.equal(tracker.getStats().status, 'running');
  assert.equal(tracker.getStats().restored, false);
});

test('account switch freezes session under old account', () => {
  tracker.start();
  mock.timers.tick(2000);
  store.activateAccount('beta');
  assert.equal(tracker.getStats().status, 'idle');
  assert.equal(store.getLiveSession(), null);
  store.activateAccount('alpha');
  assert.equal(store.getLiveSession().status, 'paused');
  assert.equal(tracker.getStats().status, 'paused');
  assert.equal(tracker.getStats().restored, true);
});

test('sensor source once motion events arrive', () => {
  tracker.start({ motion: 'granted' });
  winHandlers.devicemotion({ accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 } });
  mock.timers.tick(1000);
  assert.equal(tracker.getStats().stepSource, 'sensor');
});

test('silent sensor falls back to gps', () => {
  tracker.start({ motion: 'granted' });
  mock.timers.tick(3000);
  assert.equal(tracker.getStats().stepSource, 'gps');
});

test('gap is not added twice', () => {
  tracker.start();
  feed(3);
  mock.timers.tick(1000);
  setVisibility('hidden');
  mock.timers.tick(600_000);
  feed(3 + KM_LAT);
  setVisibility('visible');
  mock.timers.tick(1000);
  const s = tracker.getStats();
  assert.ok(s.elapsedSec >= 600 && s.elapsedSec <= 605, `elapsed ${s.elapsedSec}`);
  assert.ok(s.kcal > 0);
  assert.ok(Math.abs(s.distanceKm - 1) < 0.01);
});

test('short hidden gap without movement adds no time', () => {
  tracker.start();
  feed(3);
  mock.timers.tick(1000);
  setVisibility('hidden');
  mock.timers.tick(120_000);
  setVisibility('visible');
  assert.ok(tracker.getStats().elapsedSec <= 2);
});

test('auto-pause stops the clock after 10 s still', () => {
  tracker.start();
  mock.timers.tick(15_000);
  const s = tracker.getStats();
  assert.equal(s.autoPaused, true);
  assert.ok(s.elapsedSec <= 11, `elapsed ${s.elapsedSec}`);
});

test('finish clears live session and sets activityType', () => {
  tracker.start();
  feed(3);
  mock.timers.tick(5000);
  assert.ok(store.getLiveSession());
  const r = tracker.finish();
  assert.equal(r.activityType, 'walk');
  assert.equal(r.stepSource, 'gps');
  assert.equal(r.movingSec, r.durationSec);
  assert.equal(store.getLiveSession(), null);
});

test('locked walk: first fix after unlock credits the gap', () => {
  tracker.start();
  feed(3);
  mock.timers.tick(1000);
  setVisibility('hidden');
  mock.timers.tick(600_000);
  setVisibility('visible');
  feed(3 + KM_LAT, 1.4); // device reports walking speed on arrival
  const s = tracker.getStats();
  assert.ok(Math.abs(s.distanceKm - 1) < 0.01, `dist ${s.distanceKm}`);
  assert.ok(s.elapsedSec >= 600 && s.elapsedSec <= 603, `elapsed ${s.elapsedSec}`);
  assert.ok(s.kcal > 20, `kcal ${s.kcal}`);
});

test('car hop after unlock is not counted', () => {
  tracker.start();
  feed(3);
  mock.timers.tick(1000);
  setVisibility('hidden');
  mock.timers.tick(120_000);
  setVisibility('visible');
  feed(3 + KM_LAT, 1.4); // 1 km in 2 min = 30 km/h
  const s = tracker.getStats();
  assert.ok(s.distanceKm < 0.01, `dist ${s.distanceKm}`);
  assert.ok(s.elapsedSec <= 2);
  feed(3 + KM_LAT + 0.01 * KM_LAT, 1.4);
  mock.timers.tick(1000);
  assert.ok(tracker.getStats().distanceKm < 0.02, 'later points measure from the new segment');
});

test('driving at 30 km/h adds no distance', () => {
  tracker.start();
  for (let i = 0; i <= 60; i++) {
    feed(3 + (i * 30) / 3600 * KM_LAT, 30 / 3.6);
    mock.timers.tick(1000);
  }
  assert.ok(tracker.getStats().distanceKm < 0.01);
});

test('sensor lost after resume keeps counting steps from distance', () => {
  tracker.start({ motion: 'granted' });
  winHandlers.devicemotion({ accelerationIncludingGravity: { x: 0, y: 0, z: 9.8 } });
  mock.timers.tick(1000);
  tracker.pause();
  tracker.resume({ motion: 'denied' });
  feed(3);
  mock.timers.tick(20_000); // 0.1 km in 20 s = 18 km/h, a run
  feed(3 + 0.1 * KM_LAT);
  const s = tracker.getStats();
  assert.equal(s.stepSource, 'sensor');
  assert.ok(s.steps >= 130 && s.steps <= 150, `steps ${s.steps}`);
});

test('GPS fix alone does not write a snapshot', () => {
  tracker.start();
  store.clearLiveSession();
  feed(3);
  assert.equal(store.getLiveSession(), null);
});

test('snapshot stores compact points and restores them', () => {
  tracker.start();
  feed(3);
  mock.timers.tick(5000);
  const raw = store.getLiveSession();
  assert.ok(Array.isArray(raw.segments[0][0]) && raw.segments[0][0].length === 4);
  tracker.freezeForAccountChange();
  assert.equal(tracker.restoreLiveSession(), true);
  const p = tracker.getStats().points[0];
  assert.equal(p.lat, 3);
  assert.equal(p.lng, 101);
});

for (const [name, bad] of [
  ['segments of numbers', { segments: [[1, 2]] }],
  ['string elapsedSec', { elapsedSec: '100' }],
  ['non-array stepTimes', { stepTimes: 5 }],
  ['NaN distance', { distanceKm: null }],
]) {
  test(`bad snapshot (${name}) is dropped`, () => {
    store.saveLiveSession({ status: 'running', distanceKm: 1, elapsedSec: 60, kcal: 5, segments: [[[3, 101, null, 1]]], stepTimes: [], ...bad });
    assert.equal(tracker.restoreLiveSession(), false);
    assert.equal(tracker.getStats().status, 'idle');
    assert.equal(store.getLiveSession(), null);
  });
}
