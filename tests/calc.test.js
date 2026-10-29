import assert from 'node:assert/strict';
import { test } from 'node:test';
import { metForSpeed, kcalBurned, fuseSteps, gapSteps, settleGap, autoPaused, cadenceSpeedKmh, strideMeters, calorieStatus, ringSegments, macroBreakdown, healthyWeightRange, bmiScalePosition, weightProgress } from '../src/utils/calc.js';

test('metForSpeed is 0 when stopped', () => { assert.equal(metForSpeed(0), 0); assert.equal(metForSpeed(0.9), 0); });
test('metForSpeed hits table points', () => { assert.equal(metForSpeed(4.8), 3.5); assert.equal(metForSpeed(8.0), 8.3); });
test('metForSpeed interpolates between points', () => { assert.ok(Math.abs(metForSpeed(7.2) - 6.65) < 0.01); });
test('metForSpeed caps above table', () => { assert.equal(metForSpeed(30), 14.5); });
test('kcalBurned known case', () => { assert.ok(Math.abs(kcalBurned(8, 70, 30) - 294) < 0.01); });
test('fuseSteps uses sensor when ok', () => assert.deepEqual(fuseSteps({ sensorOk: true, sensorSteps: 1200, distanceKm: 2, heightCm: 170 }), { steps: 1200, source: 'sensor' }));
test('fuseSteps uses stride when sensor not ok', () => assert.deepEqual(fuseSteps({ sensorOk: false, sensorSteps: 0, distanceKm: 1, heightCm: 170 }), { steps: Math.round(1000 / strideMeters(170)), source: 'gps' }));
test('gapSteps converts distance to steps', () => { assert.equal(gapSteps(0, 170), 0); assert.equal(gapSteps(1, 170), Math.round(1000 / strideMeters(170))); });
test('settleGap below 20 m is auto-paused', () => assert.deepEqual(settleGap({ gapSec: 600, gapKm: 0.019, weightKg: 70 }), { movingSec: 0, kcal: 0 }));
test('settleGap at 20 m+ counts whole gap at average speed MET', () => {
  const r = settleGap({ gapSec: 600, gapKm: 1, weightKg: 70 }); // 6 km/h
  assert.equal(r.movingSec, 600);
  assert.ok(Math.abs(r.kcal - kcalBurned(metForSpeed(6), 70, 10)) < 0.01);
});
test('autoPaused enters after 10 s still', () => {
  assert.equal(autoPaused(false, { speedKmh: 0.5, msSinceLastStep: 10000 }), true);
  assert.equal(autoPaused(false, { speedKmh: 0.5, msSinceLastStep: 9000 }), false);
  assert.equal(autoPaused(false, { speedKmh: 3, msSinceLastStep: 60000 }), false);
});
test('autoPaused leaves on step or speed > 1.5', () => {
  assert.equal(autoPaused(true, { speedKmh: 0, msSinceLastStep: 500 }), false);
  assert.equal(autoPaused(true, { speedKmh: 1.6, msSinceLastStep: 60000 }), false);
  assert.equal(autoPaused(true, { speedKmh: 1.2, msSinceLastStep: 60000 }), true);
});
test('cadenceSpeedKmh from last 10 s of steps', () => {
  const now = 100000;
  const times = Array.from({ length: 20 }, (_, i) => now - i * 500); // 120 spm
  assert.ok(Math.abs(cadenceSpeedKmh(times, now, 170) - 120 * strideMeters(170) * 60 / 1000) < 0.01);
  assert.equal(cadenceSpeedKmh([], now, 170), 0);
});

const cs = (goal, net, target = 2000) => calorieStatus({ goal, target, kin: net, kout: 0 }).state;
test('calorieStatus lose', () => { assert.equal(cs('lose', 1500), 'deficit'); assert.equal(cs('lose', 1900), 'on_target'); assert.equal(cs('lose', 2101), 'surplus'); });
test('calorieStatus maintain', () => { assert.equal(cs('maintain', 1500), 'left'); assert.equal(cs('maintain', 2100), 'on_target'); assert.equal(cs('maintain', 2101), 'surplus'); });
test('calorieStatus gain', () => { assert.equal(cs('gain', 1500), 'eat_more'); assert.equal(cs('gain', 2180), 'on_target'); assert.equal(cs('gain', 2221), 'surplus'); });
test('calorieStatus missing goal', () => assert.equal(cs(undefined, 1500), 'left'));
test('calorieStatus net and diff use burned', () => {
  const r = calorieStatus({ goal: 'lose', target: 1850, kin: 1240, kout: 310 });
  assert.deepEqual([r.net, r.diff, r.label], [930, 920, 'cal_deficit']);
});

test('ringSegments mockup day', () => {
  const r = ringSegments({ target: 1850, kin: 1240, kout: 310 });
  assert.ok(Math.abs(r.eaten - 1240 / 2160) < 1e-9);
  assert.ok(Math.abs(r.left - 920 / 2160) < 1e-9);
  assert.ok(Math.abs(r.earnedFrom - 1850 / 2160) < 1e-9);
  assert.equal(r.earnedTo, 1);
  assert.equal(r.over, false);
  assert.ok(Math.abs(r.eaten + r.left - 1) < 1e-9);
});
test('ringSegments empty day', () => assert.deepEqual(ringSegments({ target: 2000, kin: 0, kout: 0 }), { eaten: 0, left: 1, earnedFrom: 1, earnedTo: 1, over: false }));
test('ringSegments over allowance', () => { const r = ringSegments({ target: 1800, kin: 2600, kout: 400 }); assert.equal(r.eaten, 1); assert.equal(r.left, 0); assert.equal(r.over, true); });
test('ringSegments zero target', () => assert.equal(ringSegments({ target: 0, kin: 0, kout: 0 }).left, 1));

test('macroBreakdown sorts and merges', () => {
  const meals = [{ name: 'A', protein: 5 }, { name: 'B', protein: 30 }, { name: 'C', protein: 0 }, { name: 'D', protein: 10 }, { name: 'E', protein: 15 }];
  const r = macroBreakdown(meals, 'protein');
  assert.deepEqual(r.map((x) => x.name), ['B', 'E', 'D', null]);
  assert.equal(r[3].others, 1);
  assert.equal(r[3].grams, 5);
  assert.ok(Math.abs(r[0].share - 0.5) < 1e-9);
});
test('macroBreakdown coerces and skips bad values', () => {
  const r = macroBreakdown([{ name: 'A', fat: '12' }, { name: 'B', fat: null }, { name: 'C', fat: 'x' }], 'fat');
  assert.deepEqual(r, [{ name: 'A', grams: 12, share: 1 }]);
});
test('macroBreakdown empty', () => assert.deepEqual(macroBreakdown([], 'carbs'), []));

test('healthyWeightRange', () => assert.deepEqual(healthyWeightRange(172), [54.7, 67.7]));
test('healthyWeightRange without height', () => { assert.equal(healthyWeightRange(0), null); assert.equal(healthyWeightRange(undefined), null); });
test('bmiScalePosition clamps', () => { assert.equal(bmiScalePosition(10), 0); assert.equal(bmiScalePosition(40), 1); assert.ok(Math.abs(bmiScalePosition(26.4) - 0.57) < 1e-9); });

test('weightProgress lose', () => assert.deepEqual(weightProgress({ start: 82, now: 78, target: 70 }), { pct: 1 / 3, deltaKg: -4, toGoKg: 8 }));
test('weightProgress gain', () => assert.deepEqual(weightProgress({ start: 60, now: 63, target: 66 }), { pct: 0.5, deltaKg: 3, toGoKg: 3 }));
test('weightProgress overshoot clamps', () => assert.equal(weightProgress({ start: 82, now: 68, target: 70 }).pct, 1));
test('weightProgress start equals target', () => assert.equal(weightProgress({ start: 70, now: 70, target: 70 }).pct, 1));
test('weightProgress without target', () => assert.deepEqual(weightProgress({ start: 70, now: 69, target: undefined }), { pct: 0, deltaKg: -1, toGoKg: null }));
