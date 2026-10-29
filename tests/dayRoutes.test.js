import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayRoutes, lastNDays } from '../src/utils/dayRoutes.js';

const ACTS = [
  { date: '2026-10-29', distanceKm: 1.234, steps: 1500, kcal: 80, durationSec: 600, segments: [[[3.1, 101.1], [3.2, 101.2]]] },
  { date: '2026-10-29', distanceKm: 2.001, kcal: 120, durationSec: 900 },
  { date: '2026-10-28', distanceKm: 5, steps: 6000, kcal: 300, durationSec: 1800, segments: [[[1, 1], [2, 2]]] },
];

test('dayRoutes totals only the given day and tolerates missing fields', () => {
  const r = dayRoutes(ACTS, '2026-10-29');
  assert.equal(r.sessions.length, 2);
  assert.equal(r.km, 3.24);
  assert.equal(r.steps, 1500);
  assert.equal(r.kcal, 200);
  assert.equal(r.sec, 1500);
  assert.deepEqual(r.coords, [[3.1, 101.1], [3.2, 101.2]]);
});

test('dayRoutes on an empty day is all zero', () => {
  assert.deepEqual(dayRoutes(ACTS, '2026-10-01'), { sessions: [], km: 0, steps: 0, kcal: 0, sec: 0, coords: [] });
});

test('lastNDays lists newest first', () => {
  const d = lastNDays(7, new Date(2026, 9, 29));
  assert.equal(d.length, 7);
  assert.equal(d[0], '2026-10-29');
  assert.equal(d[6], '2026-10-23');
});
