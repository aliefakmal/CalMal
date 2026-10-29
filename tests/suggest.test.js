import assert from 'node:assert/strict';
import { test } from 'node:test';
import { suggestFoods } from '../src/utils/suggest.js';

const FOODS = [
  { name: 'A', kcal: 100, protein: 20 },
  { name: 'B', kcal: 200, protein: 30 },
  { name: 'C', kcal: 400, protein: 40 },
  { name: 'D', kcal: 500, protein: 10 },
  { name: 'E', kcal: 700, protein: 60 },
];

test('suggestions fit between 25% and 100% of remaining kcal', () => {
  const r = suggestFoods(600, FOODS, 10);
  assert.ok(r.length > 0);
  assert.ok(r.every((f) => f.kcal >= 150 && f.kcal <= 600));
});

test('suggestions rank by protein per kcal and respect n', () => {
  assert.deepEqual(suggestFoods(600, FOODS, 2).map((f) => f.name), ['B', 'C']);
});

test('near or over target returns no suggestions', () => {
  for (const rem of [79, 0, -200]) assert.deepEqual(suggestFoods(rem, FOODS), []);
});
