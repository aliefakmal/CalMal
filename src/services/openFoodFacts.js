// Carian kod bar produk berbungkus — Open Food Facts (pelan §3.3)
import { normalizeBarcode } from '../utils/scanner.js';

const FIELDS = 'product_name,product_name_ms,product_name_en,brands,serving_size,serving_quantity,nutriments,image_front_small_url,quantity';

export async function lookupBarcode(code) {
  code = normalizeBarcode(code);
  if (!code || code.length < 8) throw new Error('Kod bar tidak sah.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Tiada sambungan internet untuk carian kod bar.');

  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`);
  if (!res.ok && res.status !== 404) throw new Error('Open Food Facts tidak dapat dihubungi.');
  const data = await res.json();
  if (data.status !== 1 || !data.product) {
    const err = new Error('Produk tiada dalam pangkalan data Open Food Facts. Cuba mod Label OCR.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const p = data.product;
  const n = p.nutriments || {};
  const kcal100 = n['energy-kcal_100g'] ?? (n.energy_100g != null ? Number(n.energy_100g) / 4.184 : NaN);
  const per100 = {
    kcal: Math.round(Number(kcal100)),
    protein: Number(n.proteins_100g),
    carbs: Number(n.carbohydrates_100g),
    fat: Number(n.fat_100g),
    sugar: Number(n.sugars_100g),
  };
  const servingSize = Number(p.serving_quantity) || 0;

  const record = {
    code,
    name: p.product_name_ms || p.product_name || p.product_name_en || 'Produk tanpa nama',
    brand: (p.brands || '').split(',')[0],
    image: p.image_front_small_url || '',
    servingLabel: p.serving_size || '',
    servingSize,
    quantity: p.quantity || '',
    per100,
  };
  if (!isCompleteNutrition(record)) {
    const err = new Error('Produk Open Food Facts tidak mempunyai nutrisi lengkap.');
    err.code = 'INCOMPLETE';
    throw err;
  }
  return record;
}

function finiteNonNegative(value) {
  return value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function isCompleteNutrition(record) {
  const basis = Number(record?.servingSize) > 0 || String(record?.servingLabel || '').trim().length > 0;
  const per100 = record?.per100;
  return Boolean(
    String(record?.name || '').trim()
    && basis
    && finiteNonNegative(per100?.kcal)
    && finiteNonNegative(per100?.protein)
    && finiteNonNegative(per100?.carbs)
    && finiteNonNegative(per100?.fat)
  );
}

export function scaleNutrients(per100, grams) {
  const f = grams / 100;
  return {
    kcal: Math.round(per100.kcal * f),
    protein: Math.round(per100.protein * f * 10) / 10,
    carbs: Math.round(per100.carbs * f * 10) / 10,
    fat: Math.round(per100.fat * f * 10) / 10,
  };
}

