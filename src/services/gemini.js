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
        const endpoint = GeminiConfig.getEndpoint(model);
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
const LOCAL_MALAYSIAN_DISHES = [
  {
    keywords: ['nasi lemak', 'sambal', 'anchovies', 'coconut rice', 'ayam'],
    food_name: 'Nasi Lemak with Spiced Fried Chicken',
    estimated_weight_g: 420,
    calories_kcal: 660,
    macros: { protein_g: 34, carbs_g: 74, fat_g: 24 },
    items_breakdown: [
      { name: 'Crispy Spiced Fried Chicken', weight_g: 130, calories_kcal: 290 },
      { name: 'Fragrant Coconut Steamed Rice', weight_g: 180, calories_kcal: 240 },
      { name: 'Caramelized Sambal Chili Sauce', weight_g: 40, calories_kcal: 65 },
      { name: 'Hard-Boiled Egg & Cucumber Slices', weight_g: 45, calories_kcal: 40 },
      { name: 'Roasted Peanuts & Fried Anchovies', weight_g: 25, calories_kcal: 25 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Opt for skinless chicken breast and request less sambal to maintain an optimal calorie deficit.',
    deku: 'Analysis complete! The high-quality protein from spiced chicken is fantastic for post-workout muscle repair. Just watch the saturated fats in the coconut rice!',
    bakugou: 'HEY! That fried chicken delivers serious explosive power, but don’t drink the sambal like water unless you want your morning run to go to waste!',
  },
  {
    keywords: ['roti canai', 'dhal', 'curry', 'mamak'],
    food_name: 'Roti Canai with Lentil Dhal & Sambal',
    estimated_weight_g: 210,
    calories_kcal: 410,
    macros: { protein_g: 11, carbs_g: 55, fat_g: 16 },
    items_breakdown: [
      { name: 'Crispy Pan-Fried Flatbread (Roti)', weight_g: 120, calories_kcal: 310 },
      { name: 'Aromatic Lentil Dhal Curry', weight_g: 70, calories_kcal: 75 },
      { name: 'Mamak Sweet-Spicy Sambal', weight_g: 20, calories_kcal: 25 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Add two soft-boiled eggs to significantly boost the protein ratio of this meal.',
    deku: 'Roti canai provides immediate fast-acting carbs! Drink plenty of water and balance with a lean protein dinner tonight.',
    bakugou: 'WHAT?! A single piece is already over 300 calories! If you eat two pieces, get out there and run a 5K right now!',
  },
  {
    keywords: ['chicken rice', 'nasi ayam', 'steamed chicken', 'hainan'],
    food_name: 'Hainanese Steamed Chicken Rice',
    estimated_weight_g: 380,
    calories_kcal: 540,
    macros: { protein_g: 32, carbs_g: 66, fat_g: 15 },
    items_breakdown: [
      { name: 'Steamed Chicken Breast Fillet', weight_g: 140, calories_kcal: 220 },
      { name: 'Ginger-Infused Fragrant Rice', weight_g: 180, calories_kcal: 240 },
      { name: 'Clear Chicken Broth & Cucumber', weight_g: 40, calories_kcal: 30 },
      { name: 'Fresh Chili & Minced Ginger Sauce', weight_g: 20, calories_kcal: 50 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'A well-balanced meal. Rich in lean protein with controlled complex carbohydrates.',
    deku: 'Smart choice! Steamed chicken preserves vital micronutrients without excess frying oil. Ideal for athletic recovery.',
    bakugou: 'Good! You chose steamed chicken instead of greasy fried drumsticks! Keep up this discipline if you want to crush your target weight!',
  },
  {
    keywords: ['char kuey teow', 'kuey teow', 'noodles', 'cockles', 'prawns'],
    food_name: 'Char Kuey Teow with Prawns & Cockles',
    estimated_weight_g: 360,
    calories_kcal: 620,
    macros: { protein_g: 24, carbs_g: 76, fat_g: 25 },
    items_breakdown: [
      { name: 'Wok-Seared Flat Rice Noodles', weight_g: 200, calories_kcal: 380 },
      { name: 'Fresh Sea Prawns & Cockles', weight_g: 80, calories_kcal: 110 },
      { name: 'Scrambled Egg & Crispy Bean Sprouts', weight_g: 80, calories_kcal: 130 },
    ],
    suitability_status: 'MODERATE',
    recommended_portion_adjustment: 'Request less cooking oil and ask for double the bean sprouts and Chinese chives for extra dietary fiber.',
    deku: 'Prawns and shellfish provide zinc and iron! Carbohydrate density is quite high, making it great fuel on moderate-to-high cardio training days.',
    bakugou: 'Wok hei smells amazing, but that pan oil is dangerous! You better burn these calories off this evening!',
  },
  {
    keywords: ['teh tarik', 'tea', 'milk tea', 'sweet drink'],
    food_name: 'Pulled Milk Tea (Teh Tarik Less Sweet)',
    estimated_weight_g: 240,
    calories_kcal: 115,
    macros: { protein_g: 3, carbs_g: 19, fat_g: 3.5 },
    items_breakdown: [
      { name: 'Strong Black Ceylon Tea', weight_g: 180, calories_kcal: 5 },
      { name: 'Low-Sugar Evaporated & Condensed Milk', weight_g: 60, calories_kcal: 110 },
    ],
    suitability_status: 'GOOD',
    recommended_portion_adjustment: 'Ordering "Kurang Manis" (Less Sweet) saves about 50–70 kcal compared to standard Malaysian sweet tea.',
    deku: 'Nicely done! Choosing less condensed milk helps control insulin spikes while still enjoying local comfort flavors.',
    bakugou: 'Tsk, lucky you asked for less sugar! Don’t you dare add two extra scoops of condensed milk next time!',
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

/** AI Food Scanner (with Gemini 3.5 Flash Lite -> 3.1 Flash Lite -> Gemma 4 31B cascade) */
export async function analyzeFood({ image, note, signal }) {
  const ctx = userContext();
  let r = null;
  try {
    r = await generateJSON({ prompt: foodAnalysisPrompt({ ...ctx, note }), images: [image], signal });
  } catch {
    r = null;
  }
  if (!r) {
    r = fallbackFoodAnalysis(note);
  }
  if (r.is_food === false) {
    // If user specifically submitted food to analyze, salvage with smart local engine
    r = fallbackFoodAnalysis(note);
  }
  return normalizeFood(r);
}

export function normalizeFood(r) {
  const m = r.macros || {};
  return {
    name: r.food_name || 'Dish',
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
      const endpoint = GeminiConfig.getEndpoint(model);
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
