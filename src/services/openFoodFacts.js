// Carian kod bar produk berbungkus — Open Food Facts (pelan §3.3)

const FIELDS = 'product_name,product_name_ms,product_name_en,brands,serving_size,serving_quantity,nutriments,image_front_small_url,quantity';

export async function lookupBarcode(code) {
  code = String(code).replace(/\D/g, '');
  if (code.length < 8) throw new Error('Kod bar tidak sah.');
  if (!navigator.onLine) throw new Error('Tiada sambungan internet untuk carian kod bar.');

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
  const kcal100 = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : 0);
  const per100 = {
    kcal: Math.round(Number(kcal100) || 0),
    protein: Number(n.proteins_100g) || 0,
    carbs: Number(n.carbohydrates_100g) || 0,
    fat: Number(n.fat_100g) || 0,
    sugar: Number(n.sugars_100g) || 0,
  };
  const servingSize = Number(p.serving_quantity) || 0;

  return {
    code,
    name: p.product_name_ms || p.product_name || p.product_name_en || 'Produk tanpa nama',
    brand: (p.brands || '').split(',')[0],
    image: p.image_front_small_url || '',
    servingLabel: p.serving_size || '',
    servingSize,
    quantity: p.quantity || '',
    per100,
  };
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

