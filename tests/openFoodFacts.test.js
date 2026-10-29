import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isCompleteNutrition, lookupBarcode } from '../src/services/openFoodFacts.js';

const complete = (patch = {}) => ({
  name: 'Produk',
  servingSize: 30,
  servingLabel: '30 g',
  per100: { kcal: 100, protein: 5, carbs: 10, fat: 2 },
  ...patch,
});

test('isCompleteNutrition accepts finite zero-calorie records and numeric strings', () => {
  assert.equal(isCompleteNutrition(complete({ per100: { kcal: '0', protein: '0', carbs: '0', fat: '0' } })), true);
});

test('isCompleteNutrition rejects missing identity, serving basis, macros, and NaN', () => {
  assert.equal(isCompleteNutrition(complete({ name: '' })), false);
  assert.equal(isCompleteNutrition(complete({ servingSize: 0, servingLabel: '' })), false);
  assert.equal(isCompleteNutrition(complete({ per100: { kcal: 100, protein: 5, carbs: 10 } })), false);
  assert.equal(isCompleteNutrition(complete({ per100: { kcal: 'NaN', protein: 5, carbs: 10, fat: 2 } })), false);
});

test('lookupBarcode rejects incomplete Open Food Facts product', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({
    status: 1,
    product: {
      product_name: 'Bad product',
      serving_size: '30 g',
      serving_quantity: '30',
      nutriments: { 'energy-kcal_100g': 'NaN', proteins_100g: 2, carbohydrates_100g: 4 },
    },
  }) });
  await assert.rejects(() => lookupBarcode('955-123-456-789'), (error) => error.code === 'INCOMPLETE');
});

test('lookupBarcode rejects product with no name', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({
    status: 1,
    product: { serving_size: '30 g', serving_quantity: '30', nutriments: { 'energy-kcal_100g': 100, proteins_100g: 2, carbohydrates_100g: 4, fat_100g: 1 } },
  }) });
  await assert.rejects(() => lookupBarcode('955123456789'), (error) => error.code === 'INCOMPLETE');
});
