import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStepDetector } from '../src/services/pedometer.js';

const run = (fn, secs = 10, hz = 50) => {
  const d = createStepDetector();
  let n = 0;
  for (let i = 0; i < secs * hz; i++) {
    const t = (i * 1000) / hz;
    n += d.push(0, 0, fn(t / 1000, i), t);
  }
  return n;
};

test('2 Hz walking wave counts ~20 steps in 10 s', () => {
  const n = run((s) => 9.81 + 3 * Math.sin(2 * Math.PI * 2 * s));
  assert.ok(n >= 18 && n <= 22, `got ${n}`);
});
test('random noise counts 0', () => {
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  assert.equal(run(() => 9.81 + 0.6 * rnd()), 0);
});
test('single spike counts 0', () => assert.equal(run((s, i) => 9.81 + (i === 100 ? 8 : 0)), 0));
test('three steps then stop counts 0', () => assert.equal(run((s) => 9.81 + (s < 1.5 ? 3 * Math.sin(2 * Math.PI * 2 * s) : 0)), 0));

test('3 Hz running wave counts ~30 steps in 10 s', () => {
  const n = run((s) => 9.81 + 8 * Math.sin(2 * Math.PI * 3 * s));
  assert.ok(n >= 27 && n <= 33, `got ${n}`);
});
test('4 Hz hand shake counts 0', () => assert.equal(run((s) => 9.81 + 6 * Math.sin(2 * Math.PI * 4 * s)), 0));
test('rough road noise counts 0', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  assert.equal(run(() => 9.81 + 4 * rnd()), 0);
});
