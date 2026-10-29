import assert from 'node:assert/strict';
import { test } from 'node:test';
import { metForSpeed, kcalBurned, fuseSteps, gapSteps, settleGap, autoPaused, cadenceSpeedKmh, strideMeters } from '../src/utils/calc.js';

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
