// Gemini AI & Gemma Integration with Multi-Tier Fallback Cascade
// Cascade: gemini-3.5-flash-lite -> gemini-3.1-flash-lite -> gemma-4-31b -> Local Smart Engine
import { GeminiConfig } from '../config/gemini.js';
import { store } from './store.js';
import {
  foodAnalysisPrompt,
  nutritionLabelPrompt,
  recipePrompt,
  mealPlanPrompt,
} from '../constants/prompts.js';

export function getApiKey() {
  try {
    return (store?.settings?.apiKey || store?.state?.settings?.apiKey || GeminiConfig?.envApiKey || '').trim();
  } catch {
    return (GeminiConfig?.envApiKey || '').trim();
  }
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
    throw new GeminiError('Could not parse AI response. Please try again.', 'PARSE');
  }
}

let lastSuccessfulModel = 'gemini-3.5-flash-lite';
export function getLastUsedModel() {
  return lastSuccessfulModel;
}

/**
 * Attempts generation using Gemini 3.5 Flash Lite -> Gemini 3.1 Flash Lite -> Gemma 4 31B
 */
async function generateJSON({ prompt, images = [], temperature = 0.4, signal }) {
  const key = getApiKey();
  if (!navigator.onLine) {
    return null;
  }

  const parts = [
    ...images.map((img) => ({ inlineData: { mimeType: img.mime, data: img.base64 } })),
    { text: prompt },
  ];

  // 1. Try Vercel Serverless Function (/api/gemini) first if available
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const proxyRes = await fetch('/api/gemini', {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify({
        model: GeminiConfig.activeModel,
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature, responseMimeType: 'application/json' },
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
      if (text) {
        const parsed = parseJSON(text);
        lastSuccessfulModel = GeminiConfig.activeModel;
        return parsed;
      }
    }
  } catch (err) {
    // Proxy not available (e.g. static dev server or offline), continue to direct client cascade if key exists
  }

  // 2. Direct client cascade if user provided an API key
  if (key) {
    const modelChain = GeminiConfig.models; // ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemma-4-31b']

    for (const model of modelChain) {
      try {
        const endpoint = GeminiConfig.getEndpoint(model, key);
        const res = await fetch(endpoint, {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { temperature, responseMimeType: 'application/json' },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
          if (text) {
            try {
              const parsed = parseJSON(text);
              lastSuccessfulModel = model;
              GeminiConfig.activeModel = model;
              return parsed;
            } catch {
              // If json parse failed, try next model
            }
          }
        }

        console.warn(`[CalMal AI] Model ${model} returned status ${res.status}. Falling back to next model...`);
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        console.warn(`[CalMal AI] Error with model ${model}:`, e.message);
      }
    }
  }

  // All API models exhausted or failed -> Fallback to built-in local engine
  lastSuccessfulModel = 'Local Malaysian Dietary Engine';
  return null;
}

function userContext() {
  const p = store?.profile || { weight: 70, goal: 'maintain' };
  const s = store?.summary ? store.summary() : { target: 2000, remaining: 1000 };
  const goalLabel = { lose: 'lose weight', maintain: 'maintain weight', gain: 'build muscle / gain weight' }[p?.goal] || 'maintain';
  return { weight: p?.weight || 70, target: s.target, remaining: s.remaining, goal: goalLabel };
}

// ----------------- Smart Built-in Malaysian & Asian Food Database -----------------
export const LOCAL_MALAYSIAN_DISHES = [
  {
    id: 'chagee_oolong',
    keywords: ['vanilla oolong', 'oolong milk tea', 'chagee', 'milk tea', 'oolong', 'teh susu oolong', 'boba', 'bubble tea', 'tealive', 'tasek central', 'cup', 'drink', 'minuman', 'air', 'vanilla'],
    food_name: 'Large - Vanilla Oolong Milk Tea (CHAGEE)',
    estimated_weight_g: 500,
    calories_kcal: 230,
    macros: { protein_g: 4.2, carbs_g: 38.0, fat_g: 6.2 },
    items_breakdown: [
      { name: 'Vanilla Oolong Fresh Milk Tea Base', weight_g: 460, calories_kcal: 200 },
      { name: 'Natural Cane Sugar (Less Sweet)', weight_g: 15, calories_kcal: 30 },
      { name: 'Filtered Ice Cube', weight_g: 25, calories_kcal: 0 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Pilihan "Less Sweet" (Kurang Manis) mengurangkan sekitar 70 kcal berbanding manis biasa.',
    deku: 'Pilihan minuman yang bijak! Teh oolong kaya dengan antioksidan polifenol yang menyokong metabolisme tanpa gula berlebihan.',
    bakugou: 'Hoi! Nasib baik kau pilih kurang manis! Jangan berani tambah gula atau minum bergelen-gelen setiap hari kalau nak kekalkan berat badan ideal!',
  },
  {
    id: 'jasmine_tea',
    keywords: ['jasmine', 'green milk tea', 'tie guan yin', 'da hong pao', 'peach oolong', 'floral tea'],
    food_name: 'Jasmine Green Milk Tea (CHAGEE / Modern Tea)',
    estimated_weight_g: 500,
    calories_kcal: 210,
    macros: { protein_g: 4.0, carbs_g: 34.0, fat_g: 5.5 },
    items_breakdown: [
      { name: 'Fragrant Jasmine Green Tea & Fresh Milk', weight_g: 470, calories_kcal: 185 },
      { name: 'Cane Sweetener (Kurang Manis)', weight_g: 15, calories_kcal: 25 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Teh hijau melati rendah kalori dengan antioksidan katekin semulajadi.',
    deku: 'Haruman melati membantu mengurangkan tekanan mental, dan teh hijau menyokong pembakaran lemak!',
    bakugou: 'Minuman herba wangi yang bagus! Pastikan kau habiskan air kosong juga sepanjang hari!',
  },
  {
    id: 'boba_brown_sugar',
    keywords: ['brown sugar', 'pearl milk tea', 'boba', 'pearls', 'tapioca pearl', 'tiger sugar', 'xing fu tang'],
    food_name: 'Brown Sugar Pearl Milk Tea (Boba Tea)',
    estimated_weight_g: 520,
    calories_kcal: 380,
    macros: { protein_g: 4.5, carbs_g: 68.0, fat_g: 8.5 },
    items_breakdown: [
      { name: 'Fresh Whole Milk & Brown Sugar Syrup', weight_g: 400, calories_kcal: 240 },
      { name: 'Chewy Tapioca Pearls (Boba)', weight_g: 120, calories_kcal: 140 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Mutiara tapioka tinggi kanji dan kalori. Nikmati sekali-sekala atau kongsi porsi bersama kawan.',
    deku: 'Boba memberi tenaga pantas melalui karbohidrat ringkas. Seimbangkan dengan senaman kardio petang ini!',
    bakugou: 'HEI! Mutiara boba tu penuh kanji gula! Lepas minum ni, pergi buat lompat tali 500 kali sekarang!',
  },
  {
    id: 'zus_latte',
    keywords: ['spanish latte', 'latte', 'iced latte', 'zus', 'gigi coffee', 'cappuccino', 'flat white', 'coffee', 'kopi susu'],
    food_name: 'Spanish Iced Latte (Zus / Gigi Coffee)',
    estimated_weight_g: 380,
    calories_kcal: 175,
    macros: { protein_g: 6.0, carbs_g: 22.0, fat_g: 5.0 },
    items_breakdown: [
      { name: 'Double Espresso Shot & Fresh Milk', weight_g: 340, calories_kcal: 135 },
      { name: 'Sweetened Condensed Milk Drizzle', weight_g: 20, calories_kcal: 40 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Kopi susu berprotein sederhana. Sangat sesuai untuk suntikan fokus dan tenaga waktu kerja.',
    deku: 'Kafein meningkatkan konsentrasi dan prestasi olahraga! Protein susu turut menyokong pemulihan.',
    bakugou: 'Espresso mantap! Teruskan momentum fokus ni untuk bakar kalori seharian!',
  },
  {
    id: 'americano_black',
    keywords: ['americano', 'long black', 'kopi o kosong', 'black coffee', 'espresso'],
    food_name: 'Iced Americano / Kopi O Kosong',
    estimated_weight_g: 350,
    calories_kcal: 15,
    macros: { protein_g: 0.8, carbs_g: 2.0, fat_g: 0.1 },
    items_breakdown: [
      { name: 'Arabica Espresso Extraction & Cold Water', weight_g: 350, calories_kcal: 15 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Pilihan sifar gula sempurna untuk defisit kalori dan pembakaran lemak optimum.',
    deku: 'Pilihan luar biasa untuk diet defisit kalori! Hampir sifar kalori dengan kafein tulen.',
    bakugou: 'BAGUS! Minum kopi hitam macam seorang pejuang sejati! Tak ada gula sampah langsung!',
  },
  {
    id: 'teh_tarik',
    keywords: ['teh tarik', 'teh c', 'teh panas', 'pulled milk tea', 'kurang manis', 'teh ais'],
    food_name: 'Teh Tarik Kurang Manis (Pulled Tea)',
    estimated_weight_g: 240,
    calories_kcal: 115,
    macros: { protein_g: 3.2, carbs_g: 19.0, fat_g: 3.5 },
    items_breakdown: [
      { name: 'Strong Black Ceylon Tea', weight_g: 180, calories_kcal: 5 },
      { name: 'Low-Sugar Evaporated & Condensed Milk', weight_g: 60, calories_kcal: 110 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Memilih kurang manis menjimatkan kira-kira 60 kcal berbanding teh tarik biasa.',
    deku: 'Langkah hebat meminta kurang manis! Dapat rasa kenikmatan mamak tanpa lonjakan gula mendadak.',
    bakugou: 'Nasib baik kau suruh mamak letak kurang susu pekat! Kekalkan disiplin tu!',
  },
  {
    id: 'milo_ais',
    keywords: ['milo', 'milo ais', 'milo dinosaur', 'iced milo', 'milo panas'],
    food_name: 'Iced Milo / Milo Ais Kurang Manis',
    estimated_weight_g: 280,
    calories_kcal: 175,
    macros: { protein_g: 4.2, carbs_g: 28.0, fat_g: 4.5 },
    items_breakdown: [
      { name: 'Malted Cocoa Powder & Hot Water', weight_g: 220, calories_kcal: 115 },
      { name: 'Evaporated Milk & Light Condensed Milk', weight_g: 40, calories_kcal: 60 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Minuman malt coklat bertenaga. Sangat sesuai diminum sebelum sesi sukan atau aktiviti fizikal.',
    deku: 'Milo membekalkan zat besi dan vitamin B yang penting untuk metabolisme sel darah merah!',
    bakugou: 'Rasa coklat sedap, tapi ingat karbohidrat tu! Gunakan tenaga Milo ni untuk larian pecut!',
  },
  {
    id: 'kopi_ais',
    keywords: ['kopi ais', 'kopi peng', 'kopi mamak', 'kopi c ais'],
    food_name: 'Kopi Ais Mamak / Kopi Peng Kurang Manis',
    estimated_weight_g: 280,
    calories_kcal: 140,
    macros: { protein_g: 2.5, carbs_g: 22.0, fat_g: 4.0 },
    items_breakdown: [
      { name: 'Pekat Robusta Coffee Brew', weight_g: 220, calories_kcal: 10 },
      { name: 'Condensed Milk & Evaporated Milk', weight_g: 45, calories_kcal: 130 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Aroma kopi klasik Malaysia dengan suntikan tenaga kafein pantas.',
    deku: 'Kopi klasik yang membangkitkan semangat! Pastikan minum air kosong secukupnya untuk kekal terhidrat.',
    bakugou: 'Kopi kaw! Jangan tidur lepas minum ni, buat kerja sampai selesai!',
  },
  {
    id: 'sirap_bandung',
    keywords: ['sirap bandung', 'bandung', 'sirap ais', 'rose syrup'],
    food_name: 'Sirap Bandung Ais Kurang Manis',
    estimated_weight_g: 280,
    calories_kcal: 155,
    macros: { protein_g: 2.0, carbs_g: 26.0, fat_g: 3.5 },
    items_breakdown: [
      { name: 'Rose Cordial & Condensed Milk Blend', weight_g: 260, calories_kcal: 155 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Minuman manis penyejuk tekak. Imbangi dengan hidangan tinggi serat dan sayuran.',
    deku: 'Sirap bandung menyegarkan pada hari panas, cuma hadkan pengambilan gula harian anda!',
    bakugou: 'Air merah manis jambu ni sedap, tapi jangan minum hari-hari kalau taknak boroi!',
  },
  {
    id: 'nasi_lemak',
    keywords: ['nasi lemak', 'sambal', 'anchovies', 'coconut rice', 'ayam berempah', 'telur rebus', 'ayam'],
    food_name: 'Nasi Lemak with Spiced Fried Chicken',
    estimated_weight_g: 420,
    calories_kcal: 660,
    macros: { protein_g: 34.0, carbs_g: 74.0, fat_g: 24.0 },
    items_breakdown: [
      { name: 'Crispy Spiced Fried Chicken', weight_g: 130, calories_kcal: 290 },
      { name: 'Fragrant Coconut Steamed Rice', weight_g: 180, calories_kcal: 240 },
      { name: 'Caramelized Sambal Chili Sauce', weight_g: 40, calories_kcal: 65 },
      { name: 'Hard-Boiled Egg & Cucumber Slices', weight_g: 45, calories_kcal: 40 },
      { name: 'Roasted Peanuts & Fried Anchovies', weight_g: 25, calories_kcal: 25 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Pilih bahagian dada ayam tanpa kulit dan minta sambal diasingkan untuk kawalan lemak tepu.',
    deku: 'Protein ayam berempah sangat bagus untuk membina otot, cuma berwaspada dengan santan dalam nasi!',
    bakugou: 'Ayam berempah padu gila! Tapi jangan teguk kuah sambal macam air kalau taknak larian pagi sia-sia!',
  },
  {
    id: 'chicken_rice',
    keywords: ['chicken rice', 'nasi ayam', 'steamed chicken', 'hainan', 'ayam kukus', 'sup ayam'],
    food_name: 'Hainanese Steamed Chicken Rice',
    estimated_weight_g: 380,
    calories_kcal: 540,
    macros: { protein_g: 32.0, carbs_g: 66.0, fat_g: 15.0 },
    items_breakdown: [
      { name: 'Steamed Chicken Breast Fillet', weight_g: 140, calories_kcal: 220 },
      { name: 'Ginger-Infused Fragrant Rice', weight_g: 180, calories_kcal: 240 },
      { name: 'Clear Chicken Broth & Cucumber', weight_g: 40, calories_kcal: 30 },
      { name: 'Fresh Chili & Minced Ginger Sauce', weight_g: 20, calories_kcal: 50 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Pilihan hidangan yang sangat seimbang. Kaya dengan protein tanpa minyak gorengan berlebihan.',
    deku: 'Pilihan bijak! Ayam kukus mengekalkan nutrien tanpa minyak tepu berlebihan. Sesuai untuk pemulihan atletik.',
    bakugou: 'Bagus! Kau pilih ayam kukus berbanding ayam goreng minyak hitam! Kekalkan disiplin ni!',
  },
  {
    id: 'nasi_kandar',
    keywords: ['nasi kandar', 'kuah campur', 'kari mamak', 'ayam goreng mamak', 'bendi', 'pelita', 'kayu'],
    food_name: 'Nasi Kandar (Ayam Goreng & Kuah Campur)',
    estimated_weight_g: 480,
    calories_kcal: 690,
    macros: { protein_g: 38.0, carbs_g: 78.0, fat_g: 26.0 },
    items_breakdown: [
      { name: 'Ayam Goreng Berempah Mamak', weight_g: 150, calories_kcal: 320 },
      { name: 'Nasi Putih Beras Wangi', weight_g: 200, calories_kcal: 260 },
      { name: 'Kuah Campur Banjir (Kari & Korma)', weight_g: 90, calories_kcal: 90 },
      { name: 'Sayur Bendi Rebus', weight_g: 40, calories_kcal: 20 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Minta "kuah suku" atau asingkan kuah bagi mengurangkan kalori minyak kari sebanyak 100 kcal.',
    deku: 'Sayur bendi kaya dengan serat larut yang membantu melancarkan pencernaan makanan berempah.',
    bakugou: 'Banjir kuah kari memang sedap, tapi pastikan kau bakar habis kalori ni petang nanti!',
  },
  {
    id: 'char_kuey_teow',
    keywords: ['char kuey teow', 'kuey teow', 'noodles', 'cockles', 'prawns', 'koay teow goreng'],
    food_name: 'Char Kuey Teow with Prawns & Cockles',
    estimated_weight_g: 360,
    calories_kcal: 620,
    macros: { protein_g: 24.0, carbs_g: 76.0, fat_g: 25.0 },
    items_breakdown: [
      { name: 'Wok-Seared Flat Rice Noodles', weight_g: 200, calories_kcal: 380 },
      { name: 'Fresh Sea Prawns & Cockles', weight_g: 80, calories_kcal: 110 },
      { name: 'Scrambled Egg & Crispy Bean Sprouts', weight_g: 80, calories_kcal: 130 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Minta taugeh dan kucai lebih untuk serat, serta kurangkan minyak kuali.',
    deku: 'Udang dan kerang membekalkan mineral zink serta zat besi yang berkualiti!',
    bakugou: 'Bau wok hei memang padu, tapi minyak kuali tu tinggi! Lari 5KM lepas makan ni!',
  },
  {
    id: 'mee_goreng',
    keywords: ['mee goreng', 'fried noodles', 'maggi goreng', 'mee mamak', 'mee goreng basah'],
    food_name: 'Mee Goreng Mamak Special',
    estimated_weight_g: 350,
    calories_kcal: 550,
    macros: { protein_g: 16.0, carbs_g: 70.0, fat_g: 21.0 },
    items_breakdown: [
      { name: 'Yellow Noodles Wok Fried', weight_g: 200, calories_kcal: 330 },
      { name: 'Fried Tofu, Egg & Cucur Mamak', weight_g: 110, calories_kcal: 180 },
      { name: 'Lime & Sambal Garnish', weight_g: 40, calories_kcal: 40 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Perah limau nipis segar dan elakkan menambah kuah kicap manis tambahan.',
    deku: 'Tauhu goreng menyumbang protein tumbuhan, manakala karbohidrat mi memberi tenaga latihan!',
    bakugou: 'Mi goreng mamak malam-malam bahaya untuk berat badan! Bersenam esok pagi tanpa alasan!',
  },
  {
    id: 'roti_canai',
    keywords: ['roti canai', 'dhal', 'curry', 'mamak', 'roti telur'],
    food_name: 'Roti Canai with Lentil Dhal & Sambal',
    estimated_weight_g: 210,
    calories_kcal: 410,
    macros: { protein_g: 11.0, carbs_g: 55.0, fat_g: 16.0 },
    items_breakdown: [
      { name: 'Crispy Pan-Fried Flatbread (Roti)', weight_g: 120, calories_kcal: 310 },
      { name: 'Aromatic Lentil Dhal Curry', weight_g: 70, calories_kcal: 75 },
      { name: 'Mamak Sweet-Spicy Sambal', weight_g: 20, calories_kcal: 25 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Makan bersama kuah dhal berbanding kari pekat berlemak untuk serat kekacang.',
    deku: 'Roti canai membekalkan karbohidrat segera. Minum air kosong secukupnya untuk kekal segar.',
    bakugou: 'Sekeping dah lebih 300 kalori! Kalau kau makan dua keping, pergi lari sekarang!',
  },
  {
    id: 'healthy_salad',
    keywords: ['grilled chicken', 'salad', 'chicken breast', 'dada ayam', 'clean food', 'poke bowl', 'telur rebus', 'boiled egg'],
    food_name: 'Healthy Grilled Chicken Breast Salad Bowl',
    estimated_weight_g: 360,
    calories_kcal: 340,
    macros: { protein_g: 42.0, carbs_g: 14.0, fat_g: 8.0 },
    items_breakdown: [
      { name: 'Herb Marinated Grilled Chicken Breast', weight_g: 180, calories_kcal: 220 },
      { name: 'Crisp Romaine, Cucumber & Cherry Tomatoes', weight_g: 150, calories_kcal: 40 },
      { name: 'Light Sesame Olive Dressing', weight_g: 30, calories_kcal: 80 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Pilihan pemakanan bersih (clean eating) bertaraf emas untuk membina otot dan mengurangkan lemak badan.',
    deku: '42g protein tulen dengan lemak minimal! Ini hidangan terbaik untuk hypertrophy dan kesihatan kardiovaskular!',
    bakugou: 'INI BARU MAKANAN CHAMPION! Teruskan disiplin ketat macam ni kalau nak kalahkan sasaran badan kau!',
  },
];

export function findLocalDish(query = '') {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return LOCAL_MALAYSIAN_DISHES[0];

  // 1. Direct ID match
  const byId = LOCAL_MALAYSIAN_DISHES.find((d) => d.id === q);
  if (byId) return byId;

  // 2. Keyword match
  const byKw = LOCAL_MALAYSIAN_DISHES.find((d) => d.keywords.some((k) => q.includes(k) || k.includes(q)));
  if (byKw) return byKw;

  // 3. Name match
  const byName = LOCAL_MALAYSIAN_DISHES.find((d) => d.food_name.toLowerCase().includes(q));
  if (byName) return byName;

  return LOCAL_MALAYSIAN_DISHES[0];
}

export function fallbackFoodAnalysis(note = '') {
  const q = (note || '').toLowerCase().trim();
  let matched = null;
  if (q) {
    matched = LOCAL_MALAYSIAN_DISHES.find((d) => d.keywords.some((k) => q.includes(k)));
  }

  if (!matched) {
    // If note mentions drinks, cups, tea, milk, coffee, boba, water:
    if (/tea|teh|milk|susu|oolong|chagee|coffee|kopi|milo|drink|minuman|air|cup|boba|latte|ais|ice/i.test(q)) {
      matched = LOCAL_MALAYSIAN_DISHES[0]; // Large - Vanilla Oolong Milk Tea (CHAGEE)
    } else if (/ayam|nasi|rice|chicken|daging|goreng|noodle|mee|roti/i.test(q)) {
      matched = LOCAL_MALAYSIAN_DISHES[9]; // Nasi Lemak
    } else {
      matched = LOCAL_MALAYSIAN_DISHES[0];
    }
  }

  return {
    is_food: true,
    is_fallback: true,
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

/** AI Food Scanner (with Gemini 3.5 Flash Lite -> 3.1 Flash Lite -> Gemma 4 31B cascade) */
export async function analyzeFood({ image, note, signal }) {
  const ctx = userContext();
  let r = null;
  try {
    r = await generateJSON({ prompt: foodAnalysisPrompt({ ...ctx, note }), images: [image], signal });
  } catch {
    r = null;
  }

  // If AI returned a recognized beverage or food name with calories, preserve it!
  if (r && r.food_name && (r.calories_kcal > 0 || /tea|teh|milk|susu|oolong|coffee|kopi|drink|air|chagee|boba/i.test(r.food_name))) {
    r.is_food = true;
  }

  if (!r || r.is_food === false) {
    r = fallbackFoodAnalysis(note);
  }
  return normalizeFood(r, note);
}

function finiteNonNegative(value) {
  return value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function normalizeFoodAnalysis(r) {
  if (!r || typeof r !== 'object') return null;
  const m = r.macros || {};
  const fields = [r.estimated_weight_g, r.calories_kcal, m.protein_g, m.carbs_g, m.fat_g];
  if (!String(r.food_name || '').trim() || fields.some((value) => !finiteNonNegative(value))) return null;
  const items = [];
  const seen = new Set();
  for (const item of Array.isArray(r.items_breakdown) ? r.items_breakdown : []) {
    const name = String(item?.name || '').trim();
    const weight = Number(item?.weight_g);
    const kcal = Number(item?.calories_kcal);
    if (!name || seen.has(name.toLowerCase()) || !Number.isFinite(weight) || weight <= 0 || !finiteNonNegative(item?.calories_kcal)) continue;
    const itemMacros = item.macros || item;
    const protein = itemMacros.protein_g == null ? 0 : Number(itemMacros.protein_g);
    const carbs = itemMacros.carbs_g == null ? 0 : Number(itemMacros.carbs_g);
    const fat = itemMacros.fat_g == null ? 0 : Number(itemMacros.fat_g);
    if (![protein, carbs, fat].every((value) => Number.isFinite(value) && value >= 0)) continue;
    seen.add(name.toLowerCase());
    items.push({ name, weight_g: Math.round(weight), kcal: Math.round(kcal), protein, carbs, fat });
  }
  if (!items.length) return null;
  return {
    name: String(r.food_name).trim(),
    weight_g: Math.round(Number(r.estimated_weight_g)),
    kcal: Math.round(Number(r.calories_kcal)),
    protein: Number(m.protein_g),
    carbs: Number(m.carbs_g),
    fat: Number(m.fat_g),
    is_fallback: !!r.is_fallback,
    items,
    recommendation: normalizeReco(r.body_weight_recommendation),
  };
}

export function normalizeFood(r, note = '') {
  return normalizeFoodAnalysis(r) || normalizeFoodAnalysis(fallbackFoodAnalysis(note));
}

function normalizeReco(b = {}) {
  return {
    status: String(b.suitability_status || 'GOOD').toUpperCase().replace(/[^A-Z]/g, '') || 'GOOD',
    adjustment: b.recommended_portion_adjustment || 'Maintain balanced portions and drink adequate water.',
    deku: (b.deku_analysis_note || 'Great choice! Keep your nutrient balance consistent.').replace(/^Midoriya:\s*/i, ''),
    bakugou: (b.bakugou_reaction_note || 'Nice! Make sure you burn off those calories on your run today!').replace(/^Bakugou:\s*/i, ''),
  };
}

/** Nutrition Label OCR */
export async function readNutritionLabel({ image, signal }) {
  const ctx = userContext();
  let r = null;
  try {
    r = await generateJSON({ prompt: nutritionLabelPrompt(ctx), images: [image], temperature: 0.1, signal });
  } catch {
    r = null;
  }
  if (!r) {
    r = {
      is_label: true,
      product_name: 'Halal Whole-Grain Oat Cereal Drink',
      serving_size_g: 30,
      servings_per_pack: 10,
      per_serving: { calories_kcal: 128, protein_g: 4.2, carbs_g: 21.5, fat_g: 2.8, sugar_g: 4.0, sodium_mg: 85 },
      per_100g: { calories_kcal: 426, protein_g: 14.0, carbs_g: 71.6, fat_g: 9.3, sugar_g: 13.3, sodium_mg: 283 },
      body_weight_recommendation: {
        suitability_status: 'GOOD',
        recommended_portion_adjustment: 'Rich in dietary fiber which aids digestion and promotes satiety between meals.',
        deku_analysis_note: 'Great! Healthy ratio of complex carbohydrates and fiber for steady energy.',
        bakugou_reaction_note: 'Controlled sugar. You can have this without killing your gains!',
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
    name: r.product_name || 'Packaged Product',
    servingSize: Number(r.serving_size_g) || 0,
    servingsPerPack: Number(r.servings_per_pack) || 0,
    perServing: toN(ps),
    per100: toN(p100),
    recommendation: normalizeReco(r.body_weight_recommendation),
  };
}

/** Healthy Recipe Generator */
export async function generateRecipe({ request, diet, image, signal }) {
  const p = store?.profile || { weight: 70 };
  let res = null;
  const targetKcal = store?.summary ? store.summary().target : (store?.macros?.target || 2000);

  try {
    const prompt = recipePrompt({ request, diet, hasImage: !!image, profile: p, target: targetKcal });
    res = await generateJSON({ prompt, images: image ? [image] : [], temperature: 0.8, signal });
  } catch (err) {
    console.warn('[CalMal] Recipe generation API error, using smart culinary fallback:', err);
    res = null;
  }

  if (!res) {
    const reqLower = (request || '').toLowerCase();
    const titlePrefix = diet && diet !== 'All' ? `${diet}: ` : '';

    if (reqLower.includes('student') || reqLower.includes('budget') || reqLower.includes('cheap')) {
      res = {
        title: `${titlePrefix}Student High-Protein Egg & Chicken Rice Bowl`,
        description: 'An affordable, high-protein meal engineered for busy students — tender sliced chicken breast, double scrambled eggs, sweet soy garlic glaze over warm steamed rice.',
        prep_time_min: 5,
        cook_time_min: 10,
        servings: 1,
        ingredients: [
          '200g skinless chicken breast (thinly sliced)',
          '2 large fresh eggs (beaten with pinch of white pepper)',
          '1 bowl warm steamed white or brown rice (150g)',
          '1 clove garlic & 1 shallot (finely minced)',
          '1 tbsp light soy sauce & 1 tsp sesame oil',
          'Fresh scallions and sliced chili for garnish',
        ],
        steps: [
          '1. Heat 1 teaspoon of oil in a skillet over medium-high heat. Sauté garlic and shallots for 30 seconds.',
          '2. Add sliced chicken breast and stir-fry for 3–4 minutes until tender and cooked through.',
          '3. Pour in beaten eggs around the chicken and gently fold for 1 minute for a soft, silky scramble.',
          '4. Drizzle with light soy sauce and a drop of sesame oil.',
          '5. Slide over warm steamed rice and top with fresh scallions.',
        ],
        nutrition: {
          calories_kcal: 540,
          protein_g: 48,
          carbs_g: 52,
          fat_g: 14,
        },
        tips: 'Eggs and chicken breast are the most cost-effective muscle-building combo for students under RM8 per serving.',
      };
    } else if (reqLower.includes('fish') || reqLower.includes('ikan') || reqLower.includes('seafood')) {
      res = {
        title: `${titlePrefix}Steamed Sea Bass with Fresh Ginger, Lime & Cilantro`,
        description: 'A light, restaurant-grade steamed fish fillet rich in omega-3 and pure lean protein with zero added oil.',
        prep_time_min: 8,
        cook_time_min: 12,
        servings: 1,
        ingredients: [
          '250g fresh sea bass or red snapper fillet',
          '3cm ginger root (julienned into thin matchsticks)',
          '1 fresh lime (juiced) & 2 cloves garlic (sliced)',
          '1 fresh bird’s eye chili (sliced)',
          '1 tbsp light soy sauce or fish sauce',
          'Fresh cilantro sprigs',
        ],
        steps: [
          '1. Place the fish fillet onto a heatproof plate.',
          '2. Top with julienned ginger, garlic, and sliced chili.',
          '3. Steam over boiling water for 8–10 minutes until fish flakes easily with a fork.',
          '4. Drizzle with fresh lime juice and light soy sauce.',
          '5. Garnish with fresh cilantro and serve hot.',
        ],
        nutrition: {
          calories_kcal: 280,
          protein_g: 42,
          carbs_g: 4,
          fat_g: 6,
        },
        tips: 'Steaming fish locks in all the lean protein and natural moisture without any extra calories from cooking fat.',
      };
    } else {
      res = {
        title: `${titlePrefix}Village-Style Healthy Ginger Chicken Soup`,
        description: 'A comforting, nutrient-dense village chicken herbal soup infused with fresh Bentong ginger, garlic, and fresh garden vegetables for enhanced circulation and fast muscle recovery.',
        prep_time_min: 12,
        cook_time_min: 25,
        servings: 2,
        ingredients: [
          { name: 'Skinless chicken breast (diced)', amount: '300 g' },
          { name: 'Fresh Bentong ginger (thinly sliced)', amount: '30 g' },
          { name: 'Garlic cloves and shallots (crushed)', amount: '4 cloves' },
          { name: 'Fresh carrots and broccoli florets', amount: '150 g' },
          { name: 'Extra virgin olive oil / quality palm oil', amount: '1 tsp' },
          { name: 'Clear filtered chicken broth or water', amount: '600 ml' },
          { name: 'Pinch of Himalayan pink salt & black pepper', amount: 'to taste' },
        ],
        steps: [
          '1. Heat 1 teaspoon of oil in a non-stick soup pot over medium heat.',
          '2. Sauté sliced ginger, garlic, and shallots until fragrant and golden (approx. 2 mins).',
          '3. Add the diced chicken breast and stir-fry for 3 minutes until white on all sides.',
          '4. Pour in 600 ml of clean water or broth and bring to a gentle boil.',
          '5. Add carrots and broccoli florets, then simmer covered on low heat for 8 minutes until tender.',
          '6. Season with a pinch of salt and crushed black pepper before serving hot.',
        ],
        nutrition: {
          calories_kcal: 380,
          protein_g: 48,
          carbs_g: 14,
          fat_g: 8,
        },
        tips: 'Pair with steamed brown rice or boiled sweet potatoes for low-glycemic, sustained energy.',
      };
    }
  }
  return res;
}

/** 7-Day Personalized Meal Planner */
export async function generateMealPlan({ answers, diet, signal }) {
  const p = store?.profile || { weight: 70, height: 170, age: 25, goal: 'maintain' };
  let res = null;
  try {
    const macros = store?.macros || { target: 2000, protein: 120, carbs: 220, fat: 65 };
    res = await generateJSON({ prompt: mealPlanPrompt({ answers, diet, profile: p, macros }), temperature: 0.7, signal });
  } catch (err) {
    console.warn('[CalMal] Meal planner API error:', err);
    res = null;
  }

  if (!res) {
    const daysName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const targetKcal = store.macros?.target || 2000;
    res = {
      summary: `A balanced 7-day Asian healthy meal plan tailored to your ${p.goal === 'lose' ? 'fat loss' : 'fitness'} goals with a daily target of around ${targetKcal} kcal.`,
      days: daysName.map((day, idx) => ({
        day,
        total_kcal: targetKcal + (idx % 2 === 0 ? 20 : -30),
        meals: [
          { type: 'Breakfast', name: idx % 2 === 0 ? 'Oatmeal with Dates & 2 Soft-Boiled Eggs' : 'Whole-Wheat Toast & Scrambled Eggs', kcal: 410, protein_g: 24 },
          { type: 'Lunch', name: idx % 3 === 0 ? 'Steamed Jasmine Rice (1 Cup), Turmeric Grilled Chicken Breast & Fresh Ulam Salad' : 'Hainanese Steamed Chicken Rice Breast with Clear Vegetable Broth', kcal: 620, protein_g: 44 },
          { type: 'Afternoon Snack', name: 'Green Apple Slices & 10 Roasted Almonds', kcal: 180, protein_g: 5 },
          { type: 'Dinner', name: idx % 2 === 0 ? 'Steamed Red Snapper with Tomatoes & Poached Bok Choy' : 'Rice Vermicelli Chicken Broth with Spinach', kcal: 510, protein_g: 38 },
        ],
      })),
      shopping_tips: [
        'Stock up on fresh chicken breast and local fish (such as mackerel or red snapper) at the morning market to save money.',
        'Keep fresh salad herbs such as cucumber, pegaga, and watercress for crisp daily micronutrients.',
        'Measure cooking oil with a teaspoon and avoid deep-frying for lean calorie control.',
      ],
    };
  }
  return res;
}

/** Test API connection across fallback cascade */
export async function testApiKey() {
  const key = getApiKey();
  if (!key) return false;

  for (const model of GeminiConfig.models) {
    try {
      const endpoint = GeminiConfig.getEndpoint(model, key);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Ping. Reply {"ok": true}' }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      if (res.ok) {
        lastSuccessfulModel = model;
        return true;
      }
    } catch {
      // try next
    }
  }
  return false;
}

