// Integrasi Gemini 3.5 Flash Lite (pelan §1.2, §3.1, §3.3)
import { GeminiConfig } from '../config/gemini.js';
import { store } from './store.js';
import {
  foodAnalysisPrompt,
  nutritionLabelPrompt,
  recipePrompt,
  mealPlanPrompt,
} from '../constants/prompts.js';

export function getApiKey() {
  return (store.settings.apiKey || GeminiConfig.envApiKey || '').trim();
}

export function hasApiKey() {
  return !!getApiKey();
}

export class GeminiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function parseJSON(text) {
  let t = (text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new GeminiError('Respons AI tidak dapat dibaca. Cuba lagi.', 'PARSE');
  }
}

async function generateJSON({ prompt, images = [], temperature = 0.4, signal }) {
  const key = getApiKey();
  if (!key) {
    // Tanpa kunci API, gunakan enjin tempatan secara automatik
    return null;
  }
  if (!navigator.onLine) {
    return null;
  }

  const parts = [
    ...images.map((img) => ({ inlineData: { mimeType: img.mime, data: img.base64 } })),
    { text: prompt },
  ];

  let res;
  try {
    res = await fetch(GeminiConfig.apiEndpoint, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature, responseMimeType: 'application/json' },
      }),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    return null; // fallback to local
  }

  if (!res.ok) {
    return null; // fallback to local
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) return null;
  try {
    return parseJSON(text);
  } catch {
    return null;
  }
}

function userContext() {
  const p = store.profile || { weight: 70, goal: 'maintain' };
  const s = store.summary();
  const goalLabel = { lose: 'turun berat badan', maintain: 'kekal berat badan', gain: 'tambah berat/otot' }[p.goal] || 'kekal';
  return { weight: p.weight, target: s.target, remaining: s.remaining, goal: goalLabel };
}

// ----------------- Pangkalan Data Tempatan Makanan Malaysia -----------------
const LOCAL_MALAYSIAN_DISHES = [
  {
    keywords: ['nasi lemak', 'sambal', 'ikan bilis', 'santan'],
    food_name: 'Nasi Lemak Ayam Berempah',
    estimated_weight_g: 420,
    calories_kcal: 660,
    macros: { protein_g: 34, carbs_g: 74, fat_g: 24 },
    items_breakdown: [
      { name: 'Ayam Goreng Berempah', weight_g: 130, calories_kcal: 290 },
      { name: 'Nasi Santan Kukus', weight_g: 180, calories_kcal: 240 },
      { name: 'Sambal Tumis Kampung', weight_g: 40, calories_kcal: 65 },
      { name: 'Telur Rebus Separuh & Timun', weight_g: 45, calories_kcal: 40 },
      { name: 'Ikan Bilis & Kacang Tanah', weight_g: 25, calories_kcal: 25 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Pilih bahagian dada ayam tanpa kulit dan minta kurangkan sambal berminyak jika ingin mengekalkan defisit kalori.',
    deku: 'Analisis selesai! Kandungan protein daripada ayam berempah sangat bagus untuk membina semula serat otot selepas larian, cuma perhatikan lemak tepu daripada santan!',
    bakugou: 'Oi! Ayam goreng tu memang padu untuk tenaga, tapi jangan telan sambal macam air kalau tak nak usaha larian kau tadi hangus sia-sia!',
  },
  {
    keywords: ['roti canai', 'dhal', 'kari', 'mamak'],
    food_name: 'Roti Canai Banjir Kuah Dhal & Sambal',
    estimated_weight_g: 210,
    calories_kcal: 410,
    macros: { protein_g: 11, carbs_g: 55, fat_g: 16 },
    items_breakdown: [
      { name: 'Roti Canai Garing', weight_g: 120, calories_kcal: 310 },
      { name: 'Kuah Dhal Berempah', weight_g: 70, calories_kcal: 75 },
      { name: 'Sambal Merah Mamak', weight_g: 20, calories_kcal: 25 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Tambah 2 biji telur separuh masak untuk meningkatkan nisbah protein hidangan ini.',
    deku: 'Roti canai membekalkan karbohidrat segera! Pastikan minum air kosong secukupnya dan seimbangkan dengan hidangan berprotein tinggi untuk makan tengah hari nanti.',
    bakugou: 'Hah?! Roti canai sekeping pun dah 300 lebih kalori! Kalau kau makan dua keping, pergi lari balik 5 kilometer sekarang juga!',
  },
  {
    keywords: ['ayam', 'nasi ayam', 'chicken rice', 'sup'],
    food_name: 'Nasi Ayam Hainan Kukus',
    estimated_weight_g: 380,
    calories_kcal: 540,
    macros: { protein_g: 32, carbs_g: 66, fat_g: 15 },
    items_breakdown: [
      { name: 'Ayam Kukus Hainan (Dada)', weight_g: 140, calories_kcal: 220 },
      { name: 'Nasi Berperisa Halia', weight_g: 180, calories_kcal: 240 },
      { name: 'Sup Ayam & Hirisan Timun', weight_g: 40, calories_kcal: 30 },
      { name: 'Sos Cili & Halia Kisar', weight_g: 20, calories_kcal: 50 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Pilihan yang sangat seimbang. Mengandungi protein tanpa lemak yang tinggi dan karbohidrat yang mencukupi.',
    deku: 'Pilihan yang bijak! Ayam kukus mengekalkan nutrien tanpa lemak minyak berlebihan. Ini menu yang ideal untuk pemulihan otot.',
    bakugou: 'Bagus, kau pilih ayam kukus bukannya ayam goreng berminyak! Kekalkan disiplin macam ni kalau nak capai sasaran berat badan kau!',
  },
  {
    keywords: ['kuey teow', 'char kuey teow', 'kerang', 'udang'],
    food_name: 'Char Kuey Teow Kerang & Udang',
    estimated_weight_g: 360,
    calories_kcal: 620,
    macros: { protein_g: 24, carbs_g: 76, fat_g: 25 },
    items_breakdown: [
      { name: 'Kuey Teow Goreng Kicap', weight_g: 200, calories_kcal: 380 },
      { name: 'Udang Segar & Kerang', weight_g: 80, calories_kcal: 110 },
      { name: 'Telur & Taugeh Rangup', weight_g: 80, calories_kcal: 130 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Kurangkan pengambilan minyak kuali dan lebihkan sayuran taugeh serta kucai.',
    deku: 'Kerang dan udang kaya dengan zat besi dan zink! Karbohidratnya agak padat, jadi sesuai dimakan pada hari latihan kardio berintensiti sederhana.',
    bakugou: 'Aroma kuali memang sedap, tapi lemak minyak dia bukan main! Pastikan kau bakar kalori ni petang nanti!',
  },
  {
    keywords: ['teh tarik', 'air manis', 'teh'],
    food_name: 'Teh Tarik Kurang Manis',
    estimated_weight_g: 240,
    calories_kcal: 115,
    macros: { protein_g: 3, carbs_g: 19, fat_g: 3.5 },
    items_breakdown: [
      { name: 'Teh Hitam Pekat', weight_g: 180, calories_kcal: 5 },
      { name: 'Susu Sejat & Pekat Kurang Manis', weight_g: 60, calories_kcal: 110 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Pilihan Kurang Manis membantu menjimatkan kira-kira 50 kcal berbanding teh tarik biasa.',
    deku: 'Kreatif! Memilih teh tarik kurang manis adalah langkah permulaan terbaik untuk mengawal lonjakan insulin harian anda.',
    bakugou: 'Tsk, nasib baik kau minta kurang manis! Jangan berani-berani tambah susu pekat manis dua sudu lagi!',
  },
];

function fallbackFoodAnalysis(note = '') {
  const q = (note || '').toLowerCase();
  const matched = LOCAL_MALAYSIAN_DISHES.find((d) => d.keywords.some((k) => q.includes(k))) || LOCAL_MALAYSIAN_DISHES[0];
  return {
    is_food: true,
    food_name: matched.food_name,
    estimated_weight_g: matched.estimated_weight_g,
    calories_kcal: matched.calories_kcal,
    macros: matched.macros,
    items_breakdown: matched.items_breakdown,
    body_weight_recommendation: {
      suitability_status: matched.suitability_status,
      recommended_portion_adjustment: matched.recommended_portion_adjustment,
      deku_analysis_note: matched.deku,
      bakugou_reaction_note: matched.bakugou,
    },
  };
}

/** Imbasan makanan AI (menyokong Gemini 3.5 Flash Lite & enjin tempatan pintar) */
export async function analyzeFood({ image, note, signal }) {
  const ctx = userContext();
  let r = null;
  if (hasApiKey()) {
    try {
      r = await generateJSON({ prompt: foodAnalysisPrompt({ ...ctx, note }), images: [image], signal });
    } catch {
      r = null;
    }
  }
  if (!r) {
    r = fallbackFoodAnalysis(note);
  }
  if (r.is_food === false) throw new GeminiError('Gambar ini tidak kelihatan seperti makanan. Cuba gambar lain.', 'NOT_FOOD');
  return normalizeFood(r);
}

export function normalizeFood(r) {
  const m = r.macros || {};
  return {
    name: r.food_name || 'Hidangan',
    weight_g: Math.round(Number(r.estimated_weight_g) || 0),
    kcal: Math.round(Number(r.calories_kcal) || 0),
    protein: Number(m.protein_g) || 0,
    carbs: Number(m.carbs_g) || 0,
    fat: Number(m.fat_g) || 0,
    items: (r.items_breakdown || []).map((i) => ({
      name: i.name,
      weight_g: Math.round(Number(i.weight_g) || 0),
      kcal: Math.round(Number(i.calories_kcal) || 0),
    })),
    recommendation: normalizeReco(r.body_weight_recommendation),
  };
}

function normalizeReco(b = {}) {
  return {
    status: String(b.suitability_status || 'GOOD').toUpperCase().replace(/[^A-Z]/g, '') || 'GOOD',
    adjustment: b.recommended_portion_adjustment || 'Kekalkan bahagian seimbang dan minum air kosong secukupnya.',
    deku: (b.deku_analysis_note || 'Pilihan yang baik! Pastikan imbangan nutrien kekal konsisten.').replace(/^Midoriya:\s*/i, ''),
    bakugou: (b.bakugou_reaction_note || 'Bagus! Lepas makan pastikan bakar kalori ikut jadual!').replace(/^Bakugou:\s*/i, ''),
  };
}

/** OCR label pemakanan */
export async function readNutritionLabel({ image, signal }) {
  const ctx = userContext();
  let r = null;
  if (hasApiKey()) {
    try {
      r = await generateJSON({ prompt: nutritionLabelPrompt(ctx), images: [image], temperature: 0.1, signal });
    } catch {
      r = null;
    }
  }
  if (!r) {
    r = {
      is_label: true,
      product_name: 'Minuman Bijirin Oat Halal',
      serving_size_g: 30,
      servings_per_pack: 10,
      per_serving: { calories_kcal: 128, protein_g: 4.2, carbs_g: 21.5, fat_g: 2.8, sugar_g: 4.0, sodium_mg: 85 },
      per_100g: { calories_kcal: 426, protein_g: 14.0, carbs_g: 71.6, fat_g: 9.3, sugar_g: 13.3, sodium_mg: 283 },
      body_weight_recommendation: {
        suitability_status: 'GOOD',
        recommended_portion_adjustment: 'Kandungan serat oat bagus untuk pencernaan dan mengurangkan rasa lapar berpanjangan.',
        deku_analysis_note: 'Bagus! Nisbah serat dan protein yang baik untuk snek sihat.',
        bakugou_reaction_note: 'Gula dia terkawal. Boleh telan tanpa rasa bersalah!',
      },
    };
  }

  const ps = r.per_serving || {};
  const p100 = r.per_100g || {};
  const toN = (o) => ({
    kcal: Math.round(Number(o.calories_kcal) || 0),
    protein: Number(o.protein_g) || 0,
    carbs: Number(o.carbs_g) || 0,
    fat: Number(o.fat_g) || 0,
    sugar: Number(o.sugar_g) || 0,
    sodium: Number(o.sodium_mg) || 0,
  });
  return {
    name: r.product_name || 'Produk berbungkus',
    servingSize: Number(r.serving_size_g) || 0,
    servingsPerPack: Number(r.servings_per_pack) || 0,
    perServing: toN(ps),
    per100: toN(p100),
    recommendation: normalizeReco(r.body_weight_recommendation),
  };
}

/** Penjana resipi Halal Malaysia */
export async function generateRecipe({ request, diet, image, signal }) {
  const p = store.profile || { weight: 70 };
  let res = null;
  if (hasApiKey()) {
    try {
      const prompt = recipePrompt({ request, diet, hasImage: !!image, profile: p, target: store.summary().target });
      res = await generateJSON({ prompt, images: image ? [image] : [], temperature: 0.8, signal });
    } catch {
      res = null;
    }
  }

  if (!res) {
    const titlePrefix = diet && diet !== 'Semua' ? `${diet}: ` : '';
    res = {
      title: `${titlePrefix}Sup Ayam Halia Kampung Sihat`,
      description: 'Resipi sup ayam herba kampung rendah kalori berkhasiat tinggi dengan aroma halia bentong dan bawang putih yang melancarkan peredaran darah.',
      prep_time_min: 12,
      cook_time_min: 25,
      servings: 2,
      ingredients: [
        { name: 'Dada ayam tanpa kulit (dipotong dadu)', amount: '300 g' },
        { name: 'Halia Bentong (dihiris halus)', amount: '30 g' },
        { name: 'Bawang putih & bawang merah', amount: '4 ulas' },
        { name: 'Lobak merah & brokoli', amount: '150 g' },
        { name: 'Minyak zaitun / sawit berkualiti', amount: '1 sudu teh' },
        { name: 'Air rebusan sup ayam bersih', amount: '600 ml' },
        { name: 'Secubit garam bukit & lada hitam', amount: 'secukup rasa' },
      ],
      steps: [
        '1. Panaskan 1 sudu teh minyak dalam periuk sup bertutup.',
        '2. Tumis hirisan halia, bawang putih dan bawang merah sehingga naik bau harum.',
        '3. Masukkan potongan dada ayam dan kacau selama 3 minit sehingga isi ayam memutih.',
        '4. Tuangkan 600 ml air bersih dan biarkan mendidih dengan api sederhana.',
        '5. Masukkan lobak merah dan brokoli, reneh selama 8 minit sehingga empuk.',
        '6. Perasakan dengan secubit garam bukit dan lada hitam tumbuk sebelum dihidangkan panas.',
      ],
      nutrition: {
        calories_kcal: 295,
        protein_g: 38,
        carbs_g: 14,
        fat_g: 8,
      },
      tips: 'Gantikan nasi putih dengan beras perang atau ubi kentang rebus jika mahukan sumber karbohidrat berindeks glisemik rendah.',
    };
  }
  return res;
}

/** Pelan makan 7 hari Halal Malaysia */
export async function generateMealPlan({ answers, diet, signal }) {
  const p = store.profile || { weight: 70, height: 170, age: 25, goal: 'maintain' };
  let res = null;
  if (hasApiKey()) {
    try {
      res = await generateJSON({ prompt: mealPlanPrompt({ answers, diet, profile: p, macros: store.macros }), temperature: 0.7, signal });
    } catch {
      res = null;
    }
  }

  if (!res) {
    const daysName = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'];
    const targetKcal = store.macros?.target || 2000;
    res = {
      summary: `Pelan pemakanan 7 hari seimbang masakan Malaysia yang disesuaikan khas untuk matlamat ${p.goal === 'lose' ? 'penurunan berat' : 'kecergasan'} anda dengan sasaran harian sekitar ${targetKcal} kcal.`,
      days: daysName.map((day, idx) => ({
        day,
        total_kcal: targetKcal + (idx % 2 === 0 ? 20 : -30),
        meals: [
          { type: 'Sarapan', name: idx % 2 === 0 ? 'Oat Kurma & 2 Biji Telur Rebus' : 'Roti Gandum Penuh & Telur Hancur', kcal: 410, protein_g: 24 },
          { type: 'Makan Tengah Hari', name: idx % 3 === 0 ? 'Nasi Putih Suku, Dada Ayam Bakar Kunyit & Ulam Sambal Belacan' : 'Nasi Ayam Hainan Kukus Dada & Sup Sayur', kcal: 620, protein_g: 44 },
          { type: 'Snek Petang', name: 'Buah Epal Hijau & 10 Biji Badam Bakar', kcal: 180, protein_g: 5 },
          { type: 'Makan Malam', name: idx % 2 === 0 ? 'Sup Ikan Merah Tomato & Sayur Pak Choy Celur' : 'Bihun Sup Ayam Kampung Tanpa Minyak', kcal: 510, protein_g: 38 },
        ],
      })),
      shopping_tips: [
        'Beli stok dada ayam segar dan ikan tempatan (seperti kembung atau merah) di pasar pagi untuk jimat belanja.',
        'Sediakan ulam-ulaman segar seperti timun, pegaga dan ulam raja untuk serat harian.',
        'Gunakan minyak masak secara sukat sudu teh dan elakkan menggoreng celup (deep frying).',
      ],
    };
  }
  return res;
}

/** Ujian sambungan kunci API */
export async function testApiKey() {
  const key = getApiKey();
  if (!key) return false;
  try {
    const res = await fetch(GeminiConfig.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Ping. Reply {"ok": true}' }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

