import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeStreak, isLateNight } from '../src/utils/streak.js';

// Consecutive local date keys ending at `end` (inclusive), oldest first.
function run(end, n) {
  const [y, m, d] = end.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const dt = new Date(y, m - 1, d - (n - 1 - i));
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  });
}

const TODAY = '2026-10-29';

test('no meals gives an empty streak', () => {
  assert.deepEqual(computeStreak([], TODAY), { streak: 0, shields: 0, shieldedDays: [] });
});

test('today not logged yet does not break the streak', () => {
  assert.equal(computeStreak(run('2026-10-28', 3), TODAY).streak, 3);
});

test('every 7 consecutive days earns one shield, capped at 2', () => {
  assert.equal(computeStreak(run(TODAY, 7), TODAY).shields, 1);
  assert.equal(computeStreak(run(TODAY, 14), TODAY).shields, 2);
  assert.equal(computeStreak(run(TODAY, 21), TODAY).shields, 2);
});

test('a missed day consumes a shield and keeps the streak', () => {
  const dates = [...run('2026-10-26', 7), ...run(TODAY, 2)];
  const r = computeStreak(dates, TODAY);
  assert.equal(r.streak, 9);
  assert.equal(r.shields, 0);
  assert.deepEqual(r.shieldedDays, ['2026-10-27']);
});

test('a gap without a shield resets the streak', () => {
  const dates = [...run('2026-10-26', 3), TODAY];
  assert.equal(computeStreak(dates, TODAY).streak, 1);
});

test('future dates and duplicates are ignored', () => {
  const dates = [...run(TODAY, 2), TODAY, '2026-11-05'];
  assert.equal(computeStreak(dates, TODAY).streak, 2);
});

test('isLateNight covers 22:30 to 03:59 and keys by the evening date', () => {
  assert.equal(isLateNight(new Date(2026, 9, 29, 22, 29)).late, false);
  assert.deepEqual(isLateNight(new Date(2026, 9, 29, 22, 30)), { late: true, nightKey: '2026-10-29' });
  assert.deepEqual(isLateNight(new Date(2026, 9, 30, 0, 30)), { late: true, nightKey: '2026-10-29' });
  assert.equal(isLateNight(new Date(2026, 9, 30, 4, 0)).late, false);
});
