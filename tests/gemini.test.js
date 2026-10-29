import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeFoodAnalysis } from '../src/services/gemini.js';

const valid = {
  food_name: 'Nasi lemak',
  estimated_weight_g: '420',
  calories_kcal: '680',
  macros: { protein_g: '22', carbs_g: 75, fat_g: 28 },
  items_breakdown: [
    { name: 'Rice', weight_g: '220', calories_kcal: '300', protein_g: '5', carbs_g: '65', fat_g: '2' },
    { name: 'rice', weight_g: 50, calories_kcal: 80, protein_g: 1, carbs_g: 18, fat_g: 0 },
    { name: 'Egg', weight_g: 55, calories_kcal: 90, protein_g: 7, carbs_g: 1, fat_g: 6 },
    { name: 'Invalid', weight_g: 0, calories_kcal: 100, protein_g: 1, carbs_g: 1, fat_g: 1 },
    { name: '', weight_g: 20, calories_kcal: 10, protein_g: 1, carbs_g: 1, fat_g: 1 },
  ],
  body_weight_recommendation: { suitability_status: 'good', recommended_portion_adjustment: 'Half rice' },
};

test('normalizeFoodAnalysis accepts finite numeric strings and deduplicates item names', () => {
  const result = normalizeFoodAnalysis(valid);
  assert.equal(result.name, 'Nasi lemak');
  assert.deepEqual([result.kcal, result.protein, result.carbs, result.fat, result.weight_g], [680, 22, 75, 28, 420]);
  assert.deepEqual(result.items.map((item) => item.name), ['Rice', 'Egg']);
  assert.equal(result.items[0].protein, 5);
  assert.equal(result.recommendation.status, 'GOOD');
});

test('normalizeFoodAnalysis rejects malformed meal values and empty valid item output', () => {
  assert.equal(normalizeFoodAnalysis({ ...valid, calories_kcal: 'NaN' }), null);
  assert.equal(normalizeFoodAnalysis({ ...valid, items_breakdown: [{ name: 'No weight', calories_kcal: 10 }] }), null);
});
