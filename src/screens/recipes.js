// Skrin Resipi & Pelan Makanan AI CalMal
// Minimalist, Responsif, Sokong Paparan Ikut Hari & Ikut Waktu Makan, serta Preferences Dinamik
import { icons } from '../components/icons.js';
import { toast, openSheet } from '../components/ui.js';
import { generateRecipe, generateMealPlan } from '../services/gemini.js';
import { DIET_FILTERS, PLANNER_QUESTIONS } from '../constants/prompts.js';
import { compressImage, esc, round1 } from '../utils/helpers.js';
import { store } from '../services/store.js';
import { t, getLang, getDaysNames } from '../utils/i18n.js';

// Pool Menu Makanan Sihat Malaysia (Mengikut Waktu & Kategori Preferences)
// Minimalist, bersih, padat dan tepat mengikut makro & budaya tempatan
export const MALAYSIAN_MEAL_POOL = {
  breakfast: [
    { name: 'Roti Bakar & Telur Separuh Masak', desc: '2 telur separuh masak · Wholemeal · Kopi O', kcal: 320, protein_g: 17, tags: ['protein', 'quick', 'budget', 'all'] },
    { name: 'Oatmeal Epal & Susu Rendah Lemak', desc: 'Rolled oat, hirisan epal & susu rendah lemak', kcal: 310, protein_g: 14, tags: ['oil', 'quick', 'budget', 'all'] },
    { name: 'Tosai Garing & Kuah Dhal', desc: 'Tosai panas, kuah dhal & chutney pudina', kcal: 260, protein_g: 9, tags: ['mamak', 'oil', 'budget', 'all'] },
    { name: 'Nasi Lemak Sihat Telur Rebus', desc: 'Nasi 1/2 cawan, sambal kurang minyak & timun', kcal: 380, protein_g: 15, tags: ['melayu', 'budget', 'all'] },
    { name: 'Bihun Sup Ayam Dada Jernih', desc: 'Sup jernih dada ayam, daun bawang & cili', kcal: 330, protein_g: 24, tags: ['protein', 'oil', 'melayu', 'budget', 'all'] },
    { name: 'Roti Canai Kosong (1 Keping) & Dhal', desc: '1 keping garing & kuah dhal berasingan', kcal: 310, protein_g: 9, tags: ['mamak', 'budget', 'all'] },
    { name: 'Scrambled Eggs & Roti Wholemeal', desc: '2 telur hancur, tomato ceri & roti bakar', kcal: 300, protein_g: 19, tags: ['protein', 'lowcarb', 'quick', 'all'] },
    { name: 'Telur Dadar Herba & Sup Cendawan', desc: 'Telur dadar 2 biji & sup sayur bening', kcal: 250, protein_g: 16, tags: ['lowcarb', 'quick', 'oil', 'budget', 'all'] },
    { name: 'Naan Garlic & Dada Tandoori', desc: 'Naan bakar suku, dada ayam & kuah dhal', kcal: 390, protein_g: 28, tags: ['mamak', 'budget', 'protein', 'all'] },
    { name: 'Greek Yogurt, Pisang & Madu', desc: 'Greek yogurt tinggi protein, pisang & chia seeds', kcal: 240, protein_g: 15, tags: ['protein', 'quick', 'oil', 'all'] },
  ],
  lunch: [
    { name: 'Ayam Masak Lemak Cili Api & Nasi', desc: 'Dada ayam tanpa kulit, kubis kunyit & ulam', kcal: 680, protein_g: 54, tags: ['melayu', 'protein', 'budget', 'all'] },
    { name: 'Sup Ayam Utara & Ulam Kampung', desc: 'Sup jernih dada ayam, timun & sambal belacan', kcal: 620, protein_g: 52, tags: ['melayu', 'oil', 'protein', 'budget', 'all'] },
    { name: 'Ayam Bakar Madu & Ulam Raja', desc: 'Dada ayam bakar madu, nasi separuh & ulam raja', kcal: 640, protein_g: 52, tags: ['melayu', 'protein', 'oil', 'all'] },
    { name: 'Nasi Kerabu & Ayam Percik', desc: 'Dada ayam percik bakar, ulam kerabu & telur masin', kcal: 690, protein_g: 56, tags: ['melayu', 'protein', 'oil', 'budget', 'all'] },
    { name: 'Nasi Ayam Stim Hainan', desc: 'Dada ayam stim, sup timun jernih & sos halia', kcal: 590, protein_g: 46, tags: ['protein', 'oil', 'budget', 'quick', 'all'] },
    { name: 'Ikan Kembung Bakar Air Asam', desc: 'Ikan kembung bakar, bendi rebus & tauhu sumbat', kcal: 520, protein_g: 44, tags: ['melayu', 'oil', 'budget', 'protein', 'all'] },
    { name: 'Nasi Kandar Ayam Tandoori', desc: 'Dada tandoori, bendi celur & kuah dhal asing', kcal: 650, protein_g: 54, tags: ['mamak', 'protein', 'budget', 'all'] },
    { name: 'Nasi Goreng Kampung Dada Ayam', desc: 'Kurang minyak, isi ayam kunyit & kangkung', kcal: 620, protein_g: 42, tags: ['melayu', 'budget', 'quick', 'protein', 'all'] },
    { name: 'Sup Daging Empuk & Kentang', desc: 'Daging lembu lembut, lobak merah & nasi separuh', kcal: 610, protein_g: 46, tags: ['melayu', 'protein', 'oil', 'budget', 'all'] },
    { name: 'Salad Ulam Ayam Panggang', desc: 'Dada ayam rosemary, timun & sos air asam', kcal: 450, protein_g: 50, tags: ['lowcarb', 'protein', 'oil', 'quick', 'all'] },
    { name: 'Nasi Bujang Telur Mata & Sup', desc: 'Nasi separuh, 2 telur mata & sambal kicap cili', kcal: 490, protein_g: 22, tags: ['budget', 'quick', 'all'] },
    { name: 'Bihun Tomyam Putih Udang', desc: 'Udang segar, cendawan tiram & kuah tomyam jernih', kcal: 490, protein_g: 35, tags: ['oil', 'quick', 'budget', 'protein', 'all'] },
  ],
  dinner: [
    { name: 'Mee Hoon Sup Ayam & Taugeh', desc: 'Sup jernih tanpa minyak, isi ayam dada & taugeh', kcal: 480, protein_g: 42, tags: ['melayu', 'oil', 'protein', 'budget', 'all'] },
    { name: 'Bihun Goreng Putih Kampung', desc: 'Ayam cincang, sayur sawi & cili potong', kcal: 530, protein_g: 40, tags: ['melayu', 'protein', 'budget', 'quick', 'all'] },
    { name: 'Ikan Siakap Stim Limau & Halia', desc: 'Siakap stim, sayur bayam bening & nasi separuh', kcal: 510, protein_g: 48, tags: ['oil', 'protein', 'melayu', 'lowcarb', 'all'] },
    { name: 'Dada Ayam Panggang & Salad Jagung', desc: 'Ayam herba, kentang bakar & salad jagung manis', kcal: 520, protein_g: 52, tags: ['protein', 'quick', 'budget', 'all'] },
    { name: 'Sup Tulang Daging Halia', desc: 'Sup daging empuk halia, sayur sawi & nasi separuh', kcal: 550, protein_g: 44, tags: ['melayu', 'protein', 'oil', 'budget', 'all'] },
    { name: 'Kuey Teow Kungfu Udang', desc: 'Sup jernih telur putih, udang segar & kobis bunga', kcal: 490, protein_g: 36, tags: ['oil', 'quick', 'budget', 'protein', 'all'] },
    { name: 'Yong Tau Foo Sup Jernih', desc: 'Tauhu kukus, bendi, peria, telur & kangkung celur', kcal: 390, protein_g: 32, tags: ['oil', 'lowcarb', 'budget', 'quick', 'all'] },
    { name: 'Chapati & Ayam Tandoori', desc: '2 chapati garing, kuah dhal pekat & ayam tandoori', kcal: 550, protein_g: 46, tags: ['mamak', 'protein', 'oil', 'budget', 'all'] },
    { name: 'Sup Ayam Kampung & Keledek', desc: 'Ayam kampung herba rebus & keledek manis kukus', kcal: 470, protein_g: 42, tags: ['oil', 'melayu', 'protein', 'budget', 'all'] },
    { name: 'Wrap Tortilla Ayam Panggang', desc: 'Tortilla wholemeal, ayam dada & sos yogurt timun', kcal: 450, protein_g: 40, tags: ['quick', 'protein', 'lowcarb', 'budget', 'all'] },
  ],
  snack: [
    { name: 'Epal Hijau & Badam Panggang', desc: '1 biji epal hijau & 10 biji badam tanpa garam', kcal: 170, protein_g: 5, tags: ['oil', 'quick', 'budget', 'all'] },
    { name: 'Pisang Emas & Air Kelapa', desc: '2 biji pisang emas & air kelapa muda segar', kcal: 140, protein_g: 2, tags: ['quick', 'budget', 'all'] },
    { name: 'Telur Rebus & Kopi O Kosong', desc: '1 biji telur rebus segar & kopi o tanpa gula', kcal: 78, protein_g: 6.5, tags: ['protein', 'quick', 'lowcarb', 'budget', 'all'] },
    { name: 'Popiah Basah Sayur Segar', desc: '1 gulung popiah basah & sos kacang nipis', kcal: 120, protein_g: 4, tags: ['melayu', 'budget', 'all'] },
    { name: 'Greek Yogurt & Biji Chia', desc: 'Yogurt rendah lemak & taburan biji chia', kcal: 140, protein_g: 12, tags: ['protein', 'quick', 'lowcarb', 'all'] },
    { name: 'Tempe Bakar Sambal Kicap', desc: 'Tempe rangup bakar & sambal kicap pedas', kcal: 160, protein_g: 12, tags: ['protein', 'budget', 'melayu', 'all'] },
  ]
};

export function getPreferences() {
  return [
    { id: 'all', label: t('pref_all') },
    { id: 'protein', label: t('pref_protein') },
    { id: 'oil', label: t('pref_oil') },
    { id: 'budget', label: t('pref_budget') },
    { id: 'quick', label: t('pref_quick') },
    { id: 'lowcarb', label: t('pref_lowcarb') },
    { id: 'melayu', label: t('pref_melayu') },
    { id: 'mamak', label: t('pref_mamak') },
  ];
}

export const PREFERENCES = [
  { id: 'all', label: 'All Suggestions' },
  { id: 'protein', label: 'High Protein' },
  { id: 'oil', label: 'Less Oil / Soup' },
  { id: 'budget', label: 'Budget (< RM10)' },
  { id: 'quick', label: 'Quick (< 15m)' },
  { id: 'lowcarb', label: 'Low Carb' },
  { id: 'melayu', label: 'Malay Traditional' },
  { id: 'mamak', label: 'Healthy Mamak' },
];

export function getMealTypeInfo(type = '') {
  const isEn = getLang() === 'en';
  const str = (type || '').toLowerCase();
  if (str.includes('sarapan') || str.includes('breakfast')) {
    return { id: 'breakfast', label: isEn ? 'Breakfast' : 'Sarapan', colorClass: 'breakfast' };
  }
  if (str.includes('tengah hari') || str.includes('lunch') || str.includes('siang')) {
    return { id: 'lunch', label: isEn ? 'Lunch' : 'Tengah Hari', colorClass: 'lunch' };
  }
  if (str.includes('malam') || str.includes('dinner')) {
    return { id: 'dinner', label: isEn ? 'Dinner' : 'Malam', colorClass: 'dinner' };
  }
  if (str.includes('snek') || str.includes('snack') || str.includes('petang') || str.includes('afternoon')) {
    return { id: 'snack', label: isEn ? 'Snack' : 'Snek', colorClass: 'snack' };
  }
  return { id: 'other', label: type || (isEn ? 'Meal' : 'Hidangan'), colorClass: 'other' };
}

export function getNormalizedDayName(day = '') {
  const d = String(day).trim();
  const lower = d.toLowerCase();
  const isEn = getLang() === 'en';
  if (lower.startsWith('mon') || lower === 'isnin') return isEn ? 'Monday' : 'Isnin';
  if (lower.startsWith('tue') || lower === 'selasa') return isEn ? 'Tuesday' : 'Selasa';
  if (lower.startsWith('wed') || lower === 'rabu') return isEn ? 'Wednesday' : 'Rabu';
  if (lower.startsWith('thu') || lower === 'khamis') return isEn ? 'Thursday' : 'Khamis';
  if (lower.startsWith('fri') || lower === 'jumaat') return isEn ? 'Friday' : 'Jumaat';
  if (lower.startsWith('sat') || lower === 'sabtu') return isEn ? 'Saturday' : 'Sabtu';
  if (lower.startsWith('sun') || lower === 'ahad') return isEn ? 'Sunday' : 'Ahad';
  return d;
}

export function generateSmartPlan(pref = 'all', targetKcal = 1800, mealCount = 2) {
  const isEn = getLang() === 'en';
  const daysName = getDaysNames();
  
  function pickMeal(category, dayIdx) {
    const list = MALAYSIAN_MEAL_POOL[category] || MALAYSIAN_MEAL_POOL.lunch;
    const filtered = pref !== 'all' ? list.filter((m) => m.tags && m.tags.includes(pref)) : list;
    const pool = filtered.length ? filtered : list;
    const offset = category === 'breakfast' ? 0 : category === 'lunch' ? 2 : category === 'dinner' ? 5 : 7;
    return pool[(dayIdx + offset) % pool.length];
  }

  const days = daysName.map((day, idx) => {
    let rawMeals = [];
    const bType = isEn ? 'Breakfast' : 'Sarapan';
    const lType = isEn ? 'Lunch' : 'Makan Tengah Hari';
    const dType = isEn ? 'Dinner' : 'Makan Malam';
    const sType = isEn ? 'Snack' : 'Snek';

    if (mealCount === 2) {
      rawMeals = [
        { type: lType, dish: pickMeal('lunch', idx) },
        { type: dType, dish: pickMeal('dinner', idx) },
      ];
    } else if (mealCount === 3) {
      rawMeals = [
        { type: bType, dish: pickMeal('breakfast', idx) },
        { type: lType, dish: pickMeal('lunch', idx) },
        { type: dType, dish: pickMeal('dinner', idx) },
      ];
    } else {
      rawMeals = [
        { type: bType, dish: pickMeal('breakfast', idx) },
        { type: lType, dish: pickMeal('lunch', idx) },
        { type: sType, dish: pickMeal('snack', idx) },
        { type: dType, dish: pickMeal('dinner', idx) },
      ];
    }

    // Accurately calibrate calories to align with targetKcal
    const baseSum = rawMeals.reduce((sum, item) => sum + (Number(item.dish.kcal) || 500), 0);
    const ratio = baseSum > 0 ? targetKcal / baseSum : 1;

    let allocatedKcal = 0;
    const meals = rawMeals.map((item, mIdx) => {
      const isLast = mIdx === rawMeals.length - 1;
      let mealKcal;
      if (isLast) {
        mealKcal = Math.max(100, targetKcal - allocatedKcal);
      } else {
        mealKcal = Math.round(item.dish.kcal * ratio);
        allocatedKcal += mealKcal;
      }
      const mealProtein = Math.round(item.dish.protein_g * ratio);

      return {
        type: item.type,
        name: item.dish.name,
        desc: item.dish.desc || '',
        kcal: mealKcal,
        protein_g: mealProtein,
      };
    });

    const total_kcal = meals.reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
    return { day, total_kcal, meals };
  });

  const prefLabel = getPreferences().find((p) => p.id === pref)?.label || (isEn ? 'Balanced' : 'Seimbang');
  return {
    summary: isEn
      ? `7-Day Malaysian style meal plan aligned with ~${targetKcal} kcal daily target focusing on: ${prefLabel}.`
      : `Pelan 7-Hari gaya Malaysia diselaraskan mengikut sasaran ~${targetKcal} kcal sehari dengan fokus: ${prefLabel}.`,
    days,
    preference: pref,
    shopping_tips: getShoppingTips(),
  };
}

export function getShoppingTips() {
  const isEn = getLang() === 'en';
  return isEn
    ? [
        'Buy fresh chicken breast, lean cuts, and local fish (sea bass / mackerel) at morning markets for freshness and best value.',
        'Incorporate local fresh herbs and greens like pegaga, ulam raja, cucumbers, and okra for micronutrients and satiety.',
        'Moderate rich gravies and highlight turmeric, ginger, lemongrass, and chili for bold Malaysian flavor without excess calories.',
        'Choose wholemeal bread, whole rolled oats, or half portions of white rice to keep daily carbohydrate spikes controlled.',
        'Drink plain warm water or sugar-free Chinese tea / Teh O Kosong instead of sweetened condensed milk beverages.',
      ]
    : [
        'Beli dada ayam segar, daging tanpa lemak, dan ikan tempatan (siakap / kembung) di pasar pagi untuk kualiti segar dan harga jimat.',
        'Amalkan ulam-ulaman segar tempatan seperti pegaga, timun, bendi dan raja untuk mikronutrien serta serat kenyang.',
        'Kawal santan dan lebihkan herba rempah ratus seperti kunyit, halia, serai dan cili untuk rasa sedap tanpa kalori tersembunyi.',
        'Pilih roti mil gandum penuh, oat, atau kurangkan nasi putih kepada separuh hidangan untuk kawal lonjakan gula darah.',
        'Amalkan air kosong atau teh cina / teh o kosong tanpa gula berbanding minuman susu pekat manis.',
      ];
}

export function openMarketGuideModal() {
  const isEn = getLang() === 'en';
  const tips = getShoppingTips();

  openSheet(`
    <div class="guide-modal-sheet">
      <div class="row between" style="align-items:flex-start;margin-bottom:12px">
        <div style="flex:1;padding-right:12px">
          <div class="row" style="gap:6px;align-items:center;margin-bottom:4px">
            <span class="badge ok">${isEn ? 'Market Guide' : 'Panduan Pasar'}</span>
            <span class="xs muted">${isEn ? 'Malaysian Grocers & Wet Markets' : 'Pasar Pagi & Pasar Raya'}</span>
          </div>
          <h3 style="font-size:17px;font-weight:800;color:#fff;margin:0;line-height:1.3">${isEn ? 'Grocery & Market Shopping Tips' : 'Tips Pasar & Bahan Masakan'}</h3>
          <p class="xs muted" style="margin:4px 0 0;line-height:1.4">${isEn ? 'Smart strategies to buy fresh proteins and budget-friendly greens in Malaysia:' : 'Cara bijak membeli bahan segar, tinggi protein dan jimat di Malaysia:'}</p>
        </div>
        <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="${t('close')}">
          ${icons.close}
        </button>
      </div>

      <div class="guide-modal-steps">
        ${tips.map((tip, idx) => `
          <div class="guide-modal-step-item">
            <div class="guide-step-num">${idx + 1}</div>
            <div class="guide-step-text">${esc(tip)}</div>
          </div>
        `).join('')}
      </div>

      <button type="button" class="btn btn-primary btn-block" data-close style="margin-top:8px">
        <span>${isEn ? 'Got It' : 'Faham'}</span>
      </button>
    </div>
  `);
}

export function renderGuideButton(id, label = '') {
  const isEn = getLang() === 'en';
  const text = label || (isEn ? 'Tutorial' : 'Panduan');
  return `
    <button type="button" class="btn-guide-pill section-guide-btn" data-guide="${id}" title="${esc(text)}" aria-label="${esc(text)}">
      ${icons.help}
      <span>${esc(text)}</span>
    </button>
  `;
}

export function openGuideModal(guideId) {
  const isEn = getLang() === 'en';
  let title = '';
  let desc = '';
  let steps = [];

  switch (guideId) {
    case 'planner':
      title = t('guide_planner_title');
      desc = t('guide_planner_desc');
      steps = [
        t('guide_planner_s1'),
        t('guide_planner_s2'),
        t('guide_planner_s3'),
        t('guide_planner_s4'),
        t('guide_planner_s5'),
        t('guide_planner_s6'),
      ];
      break;
    case 'market':
      title = t('guide_market_title');
      desc = t('guide_market_desc');
      steps = [
        t('guide_market_s1'),
        t('guide_market_s2'),
        t('guide_market_s3'),
        t('guide_market_s4'),
      ];
      break;
    case 'generator':
      title = t('guide_generator_title');
      desc = t('guide_generator_desc');
      steps = [
        t('guide_generator_s1'),
        t('guide_generator_s2'),
        t('guide_generator_s3'),
        t('guide_generator_s4'),
      ];
      break;
    case 'saved':
      title = t('guide_saved_title');
      desc = t('guide_saved_desc');
      steps = [
        t('guide_saved_s1'),
        t('guide_saved_s2'),
        t('guide_saved_s3'),
      ];
      break;
    case 'dash_calorie':
      title = t('guide_dash_cal_title');
      desc = t('guide_dash_cal_desc');
      steps = [
        t('guide_dash_cal_s1'),
        t('guide_dash_cal_s2'),
        t('guide_dash_cal_s3'),
        t('guide_dash_cal_s4'),
      ];
      break;
    case 'dash_water':
      title = t('guide_dash_water_title');
      desc = t('guide_dash_water_desc');
      steps = [
        t('guide_dash_water_s1'),
        t('guide_dash_water_s2'),
        t('guide_dash_water_s3'),
      ];
      break;
    case 'dash_meals':
      title = t('guide_dash_meals_title');
      desc = t('guide_dash_meals_desc');
      steps = [
        t('guide_dash_meals_s1'),
        t('guide_dash_meals_s2'),
        t('guide_dash_meals_s3'),
        t('guide_dash_meals_s4'),
      ];
      break;
    default:
      return;
  }

  openSheet(`
    <div class="guide-modal-sheet">
      <div class="row between" style="align-items:flex-start;margin-bottom:12px">
        <div style="flex:1;padding-right:12px">
          <div class="row" style="gap:6px;align-items:center;margin-bottom:4px">
            <span class="badge ok">${t('guide_badge')}</span>
            <span class="xs muted">${isEn ? 'Step-by-Step Walkthrough' : 'Langkah Demi Langkah'}</span>
          </div>
          <h3 style="font-size:17px;font-weight:800;color:#fff;margin:0;line-height:1.3">${esc(title)}</h3>
          <p class="xs muted" style="margin:4px 0 0;line-height:1.4">${esc(desc)}</p>
        </div>
        <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="${t('close')}">
          ${icons.close}
        </button>
      </div>

      <div class="guide-modal-steps">
        ${steps.map((st, idx) => `
          <div class="guide-modal-step-item">
            <div class="guide-step-num">${idx + 1}</div>
            <div class="guide-step-text">${esc(st)}</div>
          </div>
        `).join('')}
      </div>

      <button type="button" class="btn btn-primary btn-block" data-close style="margin-top:8px">
        <span>${isEn ? 'Got It' : 'Faham'}</span>
      </button>
    </div>
  `);
}

export function renderRecipes(container) {
  let tab = 'planner'; // Default to planner as requested for smooth navigation, can toggle to recipe/saved
  let selectedDiet = 'Halal';
  let recipeTextRequest = '';
  let ingredientImage = null;
  let currentRecipe = null;
  let isGenerating = false;

  // Meal Planner state
  let currentStep = 0;
  let mcqAnswers = {};

  function getValidMealPlan() {
    const plan = store.state.mealPlan;
    if (plan && Array.isArray(plan.days) && plan.days.length > 0 && plan.days.some((d) => Array.isArray(d.meals) && d.meals.length > 0)) {
      return plan;
    }
    const target = store.macros?.target || 1800;
    const newPlan = generateSmartPlan('all', target, 2);
    store.saveMealPlan(newPlan);
    return newPlan;
  }

  let currentMealPlan = getValidMealPlan();
  let isGeneratingPlan = false;

  // Planner View Modes & Preference states
  let planViewMode = 'day'; // 'day' (Ikut Hari) | 'meal' (Ikut Waktu Makan / Menu)
  let selectedDayIndex = -1; // -1 for 'All Days' (default), 0: Isnin, 1: Selasa, ...
  let selectedMealFilter = 'all'; // 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
  let selectedPreference = currentMealPlan?.preference || 'all';

  // Persistent horizontal scroll positions for Filter Dock
  const filterScrolls = {
    day: 0,
    meal: 0,
    pref: 0,
  };

  function captureFilterScrolls() {
    const dayEl = container.querySelector('#day-selector-scroll');
    if (dayEl) filterScrolls.day = dayEl.scrollLeft;

    const mealEl = container.querySelector('#meal-filter-scroll');
    if (mealEl) filterScrolls.meal = mealEl.scrollLeft;

    const prefEl = container.querySelector('#pref-chips');
    if (prefEl) filterScrolls.pref = prefEl.scrollLeft;
  }

  function restoreFilterScrolls() {
    requestAnimationFrame(() => {
      const dayEl = container.querySelector('#day-selector-scroll');
      if (dayEl && filterScrolls.day > 0) dayEl.scrollLeft = filterScrolls.day;

      const mealEl = container.querySelector('#meal-filter-scroll');
      if (mealEl && filterScrolls.meal > 0) mealEl.scrollLeft = filterScrolls.meal;

      const prefEl = container.querySelector('#pref-chips');
      if (prefEl && filterScrolls.pref > 0) prefEl.scrollLeft = filterScrolls.pref;
    });
  }

  function render() {
    captureFilterScrolls();
    const savedWindowY = window.scrollY || document.documentElement.scrollTop || 0;

    container.innerHTML = `
      <div class="page-head">
        <div>
          <span class="eyebrow">${t('rec_eyebrow')}</span>
          <h1 class="page-title">${t('rec_title')}</h1>
        </div>
      </div>

      <!-- Segmented Tab -->
      <div class="segmented" id="recipe-tabs" style="margin-bottom:16px">
        <button type="button" data-t="planner" class="${tab === 'planner' ? 'active' : ''}">
          ${icons.sparkles}
          <span>${t('rec_tab_planner')}</span>
        </button>
        <button type="button" data-t="recipe" class="${tab === 'recipe' ? 'active' : ''}">
          ${icons.chef}
          <span>${t('rec_tab_generator')}</span>
        </button>
        <button type="button" data-t="saved" class="${tab === 'saved' ? 'active' : ''}">
          ${icons.bowl}
          <span>${t('rec_tab_saved')} (${store.state.recipes.length})</span>
        </button>
      </div>

      ${tab === 'planner' ? renderMealPlanner() : tab === 'recipe' ? renderRecipeGenerator() : renderSavedRecipes()}
    `;

    restoreFilterScrolls();
    if (savedWindowY > 0) {
      window.scrollTo(0, savedWindowY);
    }

    bindEvents();
  }

  function renderRecipeGenerator() {
    const isEn = getLang() === 'en';
    return `
      <div class="stack fade-up">
        <div class="card stack">
          <div class="card-title row between" style="align-items:center">
            <div>
              <span>${t('rec_diet_focus')}</span>
              <span class="xs muted" style="margin-left:6px">${isEn ? 'Halal / Health Focus' : 'Fokus Sihat & Halal'}</span>
            </div>
          </div>

          <div class="chips" id="diet-chips" style="margin-top:4px">
            ${DIET_FILTERS.map((d) => `<button type="button" class="chip ${selectedDiet === d ? 'active' : ''}" data-d="${d}">${d}</button>`).join('')}
          </div>

          <div class="field" style="margin-top:4px">
            <label for="recipe-input">${t('rec_request_placeholder')}</label>
            <textarea class="textarea" id="recipe-input" placeholder="${t('rec_request_placeholder')}">${esc(recipeTextRequest)}</textarea>
          </div>

          <div class="row between" style="align-items:center">
            <input type="file" id="recipe-img-file" accept="image/*" class="hidden" />
            <button type="button" class="btn btn-sm btn-ghost" id="btn-add-ing-img">
              ${icons.camera}
              <span>${ingredientImage ? 'Change Photo' : 'Fridge / Ingredients Photo'}</span>
            </button>
            ${ingredientImage ? '<span class="badge ok">1 photo</span>' : ''}
          </div>

          ${
            ingredientImage
              ? `<div style="position:relative;width:100px;height:70px;border-radius:10px;overflow:hidden;border:1px solid var(--border)">
                  <img src="${ingredientImage.dataUrl}" style="width:100%;height:100%;object-fit:cover" />
                  <button type="button" id="btn-remove-ing-img" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);color:#fff;border:0;border-radius:50%;width:20px;height:20px;cursor:pointer">×</button>
                </div>`
              : ''
          }

          <button type="button" class="btn btn-primary btn-block" id="btn-gen-recipe" style="margin-top:6px" ${isGenerating ? 'disabled' : ''}>
            ${isGenerating ? '<span class="spinner"></span>' : icons.sparkles}
            <span>${isGenerating ? t('rec_generating') : t('rec_generate_ai')}</span>
          </button>
        </div>

        ${currentRecipe ? renderRecipeCard(currentRecipe) : ''}
      </div>
    `;
  }

  function renderRecipeCard(r) {
    const n = r.nutrition || {};
    return `
      <div class="card stack fade-up" id="recipe-card">
        <div class="card-title row between">
          <div>
            <span class="eyebrow">${esc(selectedDiet)}</span>
            <h2 style="font-size:22px;font-weight:800">${esc(r.title)}</h2>
          </div>
          <span class="badge ok">${r.prep_time_min + r.cook_time_min} min</span>
        </div>

        <p class="small muted" style="line-height:1.45">${esc(r.description || '')}</p>

        <!-- Nutrition Metrics -->
        <div class="equation">
          <div class="eq-cell">
            <span>${t('me_calories')}</span>
            <b class="num">${n.calories_kcal || 0}</b>
            <span class="xs muted">kcal</span>
          </div>
          <div class="eq-cell">
            <span>${t('me_protein')}</span>
            <b class="num">${round1(n.protein_g || 0)}</b>
            <span class="xs muted">g</span>
          </div>
          <div class="eq-cell">
            <span>${t('me_carbs')} / ${t('me_fat')}</span>
            <b class="num">${round1(n.carbs_g || 0)}/${round1(n.fat_g || 0)}</b>
            <span class="xs muted">g</span>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <b class="small" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">${t('rec_ingredients')}</b>
          <ul style="padding-left:20px;margin:8px 0;line-height:1.6;font-size:14px">
            ${(r.ingredients || []).map((ing) => `<li>${esc(typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.name || ''}`)}</li>`).join('')}
          </ul>
        </div>

        <div>
          <b class="small" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">${t('rec_instructions')}</b>
          <ol style="padding-left:20px;margin:8px 0;line-height:1.6;font-size:14px">
            ${(r.steps || []).map((st) => `<li>${esc(st)}</li>`).join('')}
          </ol>
        </div>

        ${r.tips ? `<div class="card flat" style="background:#0d0d0e;border:1px solid var(--border);padding:12px;font-size:13px"><b style="color:var(--deku)">Chef Tip:</b> ${esc(r.tips)}</div>` : ''}

        <div class="grid grid-2" style="margin-top:8px">
          <button type="button" class="btn btn-secondary" id="btn-save-recipe">
            ${icons.plus}
            <span>${t('rec_save_recipe')}</span>
          </button>
          <button type="button" class="btn btn-primary" id="btn-log-recipe-meal">
            ${icons.check}
            <span>${t('scan_log_meal')}</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderMealPlanner() {
    if (currentMealPlan && !isGeneratingPlan) {
      return renderMealPlanResult(currentMealPlan);
    }

    const q = PLANNER_QUESTIONS[currentStep];
    const pct = Math.round(((currentStep + 1) / PLANNER_QUESTIONS.length) * 100);

    return `
      <div class="stack fade-up">
        <div class="card stack">
          <div class="row between">
            <span class="eyebrow">Question ${currentStep + 1} of ${PLANNER_QUESTIONS.length}</span>
            <span class="small bold muted">${pct}%</span>
          </div>
          <div class="stepper-progress">
            <div class="stepper-bar" style="width:${pct}%"></div>
          </div>

          <h3 style="font-size:19px;font-weight:800;margin:4px 0 12px">${esc(q.q)}</h3>

          <div class="stack" style="gap:8px">
            ${q.options
              .map(
                (opt) => `
              <button type="button" class="mcq-option ${mcqAnswers[q.id] === opt ? 'selected' : ''}" data-ans="${opt}">
                <span>${esc(opt)}</span>
                ${mcqAnswers[q.id] === opt ? icons.check : ''}
              </button>`
              )
              .join('')}
          </div>

          <div class="row between" style="margin-top:14px">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-step-prev" ${currentStep === 0 ? 'disabled' : ''}>
              ${icons.chevronLeft}
              <span>${t('previous')}</span>
            </button>
            ${
              currentStep === PLANNER_QUESTIONS.length - 1
                ? `<button type="button" class="btn btn-primary" id="btn-submit-planner" ${!mcqAnswers[q.id] || isGeneratingPlan ? 'disabled' : ''}>
                    ${isGeneratingPlan ? '<span class="spinner"></span>' : icons.sparkles}
                    <span>${isGeneratingPlan ? t('rec_generating') : t('rec_generate_ai')}</span>
                  </button>`
                : `<button type="button" class="btn btn-secondary btn-sm" id="btn-step-next" ${!mcqAnswers[q.id] ? 'disabled' : ''}>
                    <span>${t('next')}</span>
                    ${icons.chevronRight}
                  </button>`
            }
          </div>

          <div class="divider" style="margin:12px 0 8px"></div>
          <button type="button" class="btn btn-ghost btn-sm btn-block" id="btn-quick-default-plan" style="color:var(--deku);gap:6px">
            ${icons.bolt} <span>${t('rec_quick_default')}</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderMealCard(meal, dayIdx, mealIdx, showDayBadge = false, dayName = '') {
    const isEn = getLang() === 'en';
    const typeInfo = getMealTypeInfo(meal.type);
    return `
      <div class="plan-meal-card">
        <div class="plan-meal-body">
          <div class="plan-meal-header">
            <div class="row" style="gap:6px;align-items:center">
              ${showDayBadge ? `<span class="meal-day-pill">${esc(dayName)}</span>` : ''}
              <span class="meal-type-tag ${typeInfo.colorClass}">${esc(typeInfo.label)}</span>
            </div>
            <div class="meal-metrics-clean">
              <span class="meal-metric-kcal">${meal.kcal} <small>kcal</small></span>
              <span class="meal-metric-dot">·</span>
              <span class="meal-metric-protein">${meal.protein_g}g <small>protein</small></span>
            </div>
          </div>
          <h4 class="plan-meal-title">${esc(meal.name)}</h4>
          ${meal.desc ? `<p class="plan-meal-desc">${esc(meal.desc)}</p>` : ''}
        </div>

        <div class="plan-meal-actions">
          <button type="button" class="plan-action-btn primary btn-log-meal" data-didx="${dayIdx}" data-midx="${mealIdx}" title="Log into today's diary">
            ${icons.plus} <span>${isEn ? 'Log Meal' : 'Log Hidangan'}</span>
          </button>
          <button type="button" class="plan-action-btn btn-swap-meal" data-didx="${dayIdx}" data-midx="${mealIdx}" title="Swap with alternative dish">
            ${icons.refresh} <span>${isEn ? 'Swap' : 'Tukar'}</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderPlanContent(plan) {
    const isEn = getLang() === 'en';

    function matchMeal(meal) {
      if (selectedMealFilter === 'all') return true;
      const typeInfo = getMealTypeInfo(meal.type);
      return typeInfo.id === selectedMealFilter;
    }

    if (selectedDayIndex >= 0) {
      const day = plan.days?.[selectedDayIndex];
      if (!day) return `<div class="empty">${t('rec_no_meals_filter')}</div>`;

      const dayName = getNormalizedDayName(day.day);
      const filteredMeals = (day.meals || []).filter(matchMeal);
      const dayTotalKcal = (day.meals || []).reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
      const dayTotalProtein = (day.meals || []).reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0);

      return `
        <div class="plan-day-section fade-up">
          <div class="plan-day-banner">
            <div>
              <div class="plan-day-title">${esc(dayName)}</div>
              <div class="xs muted" style="margin-top:2px">${filteredMeals.length} ${isEn ? 'dishes scheduled' : 'hidangan berjadual'}</div>
            </div>
            <div class="meal-metrics-clean" style="font-size:13px">
              <span class="meal-metric-kcal">${dayTotalKcal} <small>kcal total</small></span>
              <span class="meal-metric-dot">·</span>
              <span class="meal-metric-protein">${dayTotalProtein}g <small>protein</small></span>
            </div>
          </div>

          ${
            filteredMeals.length === 0
              ? `<div class="empty" style="padding:28px 16px;text-align:center;color:var(--muted);font-size:13px">
                  <p style="margin-bottom:8px">${t('rec_no_meals_filter')}</p>
                  <button type="button" class="btn btn-sm btn-ghost btn-reset-filter" style="margin:0 auto">
                    ${icons.refresh} <span>${isEn ? 'View All Meals' : 'Lihat Semua Hidangan'}</span>
                  </button>
                </div>`
              : `<div class="plan-meals-grid">
                  ${filteredMeals.map((meal) => {
                    const originalIdx = day.meals.indexOf(meal);
                    return renderMealCard(meal, selectedDayIndex, originalIdx >= 0 ? originalIdx : 0, false);
                  }).join('')}
                </div>`
          }
        </div>
      `;
    }

    // View for All Days (-1): Group by day
    const daysWithMatches = (plan.days || []).map((day, dIdx) => ({
      day,
      dIdx,
      dayName: getNormalizedDayName(day.day),
      meals: (day.meals || []).filter(matchMeal),
    })).filter((item) => item.meals.length > 0);

    if (daysWithMatches.length === 0) {
      return `
        <div class="empty" style="padding:28px 16px;text-align:center;color:var(--muted);font-size:13px">
          <p style="margin-bottom:8px">${t('rec_no_meals_filter')}</p>
          <button type="button" class="btn btn-sm btn-ghost btn-reset-filter" style="margin:0 auto">
            ${icons.refresh} <span>${isEn ? 'View All Meals' : 'Lihat Semua Hidangan'}</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="stack fade-up" style="gap:16px">
        ${daysWithMatches.map((item) => {
          const dayKcal = (item.day.meals || []).reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
          const dayProtein = (item.day.meals || []).reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0);
          return `
            <div class="plan-day-section">
              <div class="plan-day-banner">
                <div class="plan-day-title">${esc(item.dayName)}</div>
                <div class="meal-metrics-clean" style="font-size:12.5px">
                  <span class="meal-metric-kcal">${dayKcal} <small>kcal</small></span>
                  <span class="meal-metric-dot">·</span>
                  <span class="meal-metric-protein">${dayProtein}g <small>protein</small></span>
                </div>
              </div>
              <div class="plan-meals-grid">
                ${item.meals.map((meal) => {
                  const mIdx = item.day.meals.indexOf(meal);
                  return renderMealCard(meal, item.dIdx, mIdx >= 0 ? mIdx : 0, false);
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderMealPlanResult(plan) {
    const isEn = getLang() === 'en';
    const dayShortNames = isEn
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Aha'];

    const mealCategories = [
      { id: 'all', label: isEn ? 'All Meals' : 'Semua Hidangan' },
      { id: 'breakfast', label: isEn ? 'Breakfast' : 'Sarapan' },
      { id: 'lunch', label: isEn ? 'Lunch' : 'Makan Tengah Hari' },
      { id: 'dinner', label: isEn ? 'Dinner' : 'Makan Malam' },
      { id: 'snack', label: isEn ? 'Snack' : 'Snek' },
    ];

    return `
      <div class="plan-container fade-up">
        <!-- Top Header Card -->
        <div class="plan-header-card">
          <div class="row between" style="align-items:flex-start;flex-wrap:wrap;gap:12px">
            <div style="flex:1 1 200px;min-width:180px">
              <span class="eyebrow">${t('rec_tab_planner')}</span>
              <h2 style="font-size:20px;font-weight:800;color:#fff;margin:2px 0 4px">${t('rec_schedule_title')}</h2>
              <p class="xs muted" style="line-height:1.4">${esc(plan.summary || t('rec_schedule_sub'))}</p>
            </div>
            <div class="row" style="gap:6px;align-items:center;flex-shrink:0">
              <button type="button" class="btn btn-sm btn-ghost" id="btn-pref-modal" title="Preferences & Targets">
                ${icons.settings}
                <span>${isEn ? 'Preferences' : 'Keutamaan'}</span>
              </button>
              <button type="button" class="btn btn-sm btn-ghost btn-icon" id="btn-refresh-suggestions" title="Regenerate Plan" aria-label="Regenerate Plan">
                ${icons.refresh}
              </button>
              <button type="button" class="btn btn-sm btn-ghost btn-icon" id="btn-print-plan" title="Print / PDF" aria-label="Print PDF">
                ${icons.printer}
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Dock (Sticky / Unified) -->
        <div class="plan-filter-dock" id="plan-filter-dock">
          <!-- Row 1: Day Tabs -->
          <div class="plan-filter-scroll" id="day-selector-scroll">
            <button type="button" class="plan-pill ${selectedDayIndex === -1 ? 'active' : ''}" data-didx="-1">
              <span>${isEn ? 'All Days' : 'Semua Hari'}</span>
            </button>
            ${dayShortNames.map((short, idx) => `
              <button type="button" class="plan-pill ${selectedDayIndex === idx ? 'active' : ''}" data-didx="${idx}">
                <span>${short}</span>
              </button>
            `).join('')}
          </div>

          <!-- Row 2: Meal Time Filter Pills -->
          <div class="plan-filter-scroll" id="meal-filter-scroll">
            ${mealCategories.map((c) => `
              <button type="button" class="plan-pill ${selectedMealFilter === c.id ? 'active' : ''}" data-mf="${c.id}">
                <span>${c.label}</span>
              </button>
            `).join('')}
          </div>

          <!-- Row 3: Dietary Preference Filter Chips -->
          <div class="plan-filter-scroll" id="pref-chips">
            ${getPreferences().map((p) => `
              <button type="button" class="plan-pref-chip ${selectedPreference === p.id ? 'active' : ''}" data-pref="${p.id}">
                <span>${p.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Main Plan Content -->
        <div id="plan-content-wrap">
          ${renderPlanContent(plan)}
        </div>

        <!-- Compact Touch UI Market Guide Card -->
        <div class="card flat market-touch-card" id="btn-open-market-guide" role="button" tabindex="0" style="background:#09090b;border:1px solid rgba(255,255,255,0.09);padding:12px 14px;cursor:pointer;border-radius:12px;margin-top:4px;transition:all 0.2s var(--ease)">
          <div class="row between" style="align-items:center">
            <div class="row" style="gap:10px;align-items:center">
              <div class="water-icon-circle" style="background:rgba(61,220,151,0.12);color:#3ddc97;width:32px;height:32px">
                ${icons.bowl}
              </div>
              <div>
                <div class="row" style="gap:6px;align-items:center">
                  <span class="badge ok" style="font-size:10px;padding:2px 6px">${isEn ? 'Market Guide' : 'Panduan Pasar'}</span>
                  <b style="font-size:13px;color:#fff">${isEn ? 'Grocery & Wet Market Tips' : 'Tips Pasar & Bahan Masakan'}</b>
                </div>
                <div class="xs muted" style="margin-top:2px">${isEn ? 'Tap to view fresh Malaysian proteins & smart shopping tips' : 'Sentuh untuk panduan bahan basah segar & jimat'}</div>
              </div>
            </div>
            <div class="row" style="gap:4px;align-items:center;color:var(--hero-accent)">
              <span class="xs bold">${isEn ? 'View' : 'Lihat'}</span>
              <span style="font-size:14px">›</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSavedRecipes() {
    const list = store.state.recipes;
    const isEn = getLang() === 'en';
    return `
      <div class="stack fade-up">
        <div class="card stack">
          <div class="card-title row between" style="align-items:center">
            <div>
              <span>${t('rec_saved_collection')}</span>
              <span class="muted" style="margin-left:6px">${list.length} ${isEn ? 'recipes' : 'resipi'}</span>
            </div>
          </div>

          <div class="list">
            ${
              list.length === 0
                ? `<div class="empty">
                    ${icons.chef}
                    <p>${t('rec_no_saved')}</p>
                    <span class="small muted">${t('rec_no_saved_sub')}</span>
                  </div>`
                : list
                    .map(
                      (r) => `
                  <div class="list-item" data-id="${r.id}">
                    <div class="thumb">${icons.chef}</div>
                    <div class="li-main">
                      <div class="li-title">${esc(r.title)}</div>
                      <div class="li-sub">
                        <span>${r.prep_time_min + r.cook_time_min} min</span> · 
                        <span>${r.nutrition?.calories_kcal || 0} kcal</span> · 
                        <span>${r.nutrition?.protein_g || 0}g protein</span>
                      </div>
                    </div>
                    <div class="row" style="gap:4px">
                      <button class="btn btn-icon btn-ghost btn-sm view-saved-btn" data-id="${r.id}" title="View">
                        ${icons.chevronRight}
                      </button>
                      <button class="btn btn-icon btn-ghost btn-sm del-saved-btn" data-id="${r.id}" title="Delete" style="color:var(--danger)">
                        ${icons.trash}
                      </button>
                    </div>
                  </div>`
                    )
                    .join('')
            }
          </div>
        </div>
      </div>
    `;
  }

  function openPreferenceModal() {
    const targetKcal = store.macros?.target || 1800;
    const { el, close } = openSheet(`
      <h3 class="sheet-title">${t('rec_pref_modal_title')}</h3>
      <p class="muted small" style="margin-bottom:14px">${t('rec_pref_modal_sub')}</p>

      <div class="stack" style="gap:12px">
        <div class="field">
          <label>${t('rec_target_label')}</label>
          <input class="input num" id="pref-kcal-target" type="number" value="${targetKcal}" min="1000" max="4500" step="50" />
        </div>

        <div class="field">
          <label>${t('rec_meals_per_day')}</label>
          <div class="segmented" id="pref-meal-count" style="margin-top:4px">
            <button type="button" data-c="2" class="${currentMealPlan?.days?.[0]?.meals?.length === 2 ? 'active' : ''}">${t('rec_2_meals')}</button>
            <button type="button" data-c="3" class="${currentMealPlan?.days?.[0]?.meals?.length === 3 ? 'active' : ''}">${t('rec_3_meals')}</button>
            <button type="button" data-c="4" class="${currentMealPlan?.days?.[0]?.meals?.length === 4 ? 'active' : ''}">${t('rec_4_meals')}</button>
          </div>
        </div>

        <div class="field">
          <label>${t('rec_diet_focus')}</label>
          <div class="chips" id="pref-focus-chips" style="margin-top:4px">
            ${getPreferences().map((p) => `<button type="button" class="chip ${selectedPreference === p.id ? 'active' : ''}" data-p="${p.id}">${p.label}</button>`).join('')}
          </div>
        </div>

        <div class="grid grid-2" style="margin-top:8px;gap:10px">
          <button class="btn btn-ghost" data-close>${t('cancel')}</button>
          <button class="btn btn-primary" id="btn-save-pref">${t('rec_save_recalc')}</button>
        </div>
      </div>
    `);

    let mealCount = currentMealPlan?.days?.[0]?.meals?.length || 2;
    el.querySelectorAll('#pref-meal-count button').forEach((b) => {
      b.addEventListener('click', () => {
        mealCount = Number(b.dataset.c);
        el.querySelectorAll('#pref-meal-count button').forEach((x) => x.classList.toggle('active', x === b));
      });
    });

    let tempPref = selectedPreference;
    el.querySelectorAll('#pref-focus-chips button').forEach((b) => {
      b.addEventListener('click', () => {
        tempPref = b.dataset.p;
        el.querySelectorAll('#pref-focus-chips button').forEach((x) => x.classList.toggle('active', x === b));
      });
    });

      el.querySelector('#btn-save-pref').addEventListener('click', () => {
        const newTarget = Number(el.querySelector('#pref-kcal-target').value) || targetKcal;
        selectedPreference = tempPref;
        currentMealPlan = generateSmartPlan(selectedPreference, newTarget, mealCount);
        store.saveMealPlan(currentMealPlan);
        toast(getLang() === 'en' ? 'Preferences saved & new meal plan generated!' : 'Preferences disimpan & menu baru telah dijana!', 'success');
        close();
        render();
      });
    }

    function swapMeal(dayIdx, mealIdx) {
      if (!currentMealPlan?.days?.[dayIdx]?.meals?.[mealIdx]) return;
      const oldMeal = currentMealPlan.days[dayIdx].meals[mealIdx];
      const typeInfo = getMealTypeInfo(oldMeal.type);
      const pool = MALAYSIAN_MEAL_POOL[typeInfo.id] || MALAYSIAN_MEAL_POOL.lunch;

      // Filter alternatives
      const alternatives = pool.filter((m) => m.name !== oldMeal.name);
      const picked = alternatives[Math.floor(Math.random() * alternatives.length)] || pool[0];

      // Keep calories proportional to the slot being swapped
      const oldKcal = Number(oldMeal.kcal) || picked.kcal;
      const scale = oldKcal > 0 && picked.kcal > 0 ? oldKcal / picked.kcal : 1;
      const newKcal = Math.round(picked.kcal * scale);
      const newProtein = Math.round((picked.protein_g || 20) * scale);

      currentMealPlan.days[dayIdx].meals[mealIdx] = {
        type: oldMeal.type,
        name: picked.name,
        desc: picked.desc || '',
        kcal: newKcal,
        protein_g: newProtein,
      };

      // Recalculate day total kcal
      currentMealPlan.days[dayIdx].total_kcal = currentMealPlan.days[dayIdx].meals.reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);

      store.saveMealPlan(currentMealPlan);
      toast(getLang() === 'en' ? `Swapped to: ${picked.name}` : `Lauk ditukar: ${picked.name}`, 'success');
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
      updatePlanViewInPlace();
    }

    function logPlanMeal(dayIdx, mealIdx) {
      const m = currentMealPlan?.days?.[dayIdx]?.meals?.[mealIdx];
      if (!m) return;
      const typeInfo = getMealTypeInfo(m.type);
      const kVal = Number(m.kcal) || 0;
      const pVal = Number(m.protein_g) || 0;
      const cVal = Math.round((kVal * 0.45) / 4);
      const fVal = Math.round((kVal * 0.25) / 9);

      store.addMeal({
        name: m.name,
        kcal: kVal,
        protein: pVal,
        carbs: cVal,
        fat: fVal,
        weight_g: 350,
        mealType: typeInfo.id === 'breakfast' ? 'Breakfast' : typeInfo.id === 'dinner' ? 'Dinner' : typeInfo.id === 'snack' ? 'Snack' : 'Lunch',
      });

      toast(getLang() === 'en' ? `Logged: ${m.name} (+${kVal} kcal)` : `Berjaya log: ${m.name} (+${kVal} kcal)!`, 'success');
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30]);
    }

    function updatePlanViewInPlace() {
      const wrap = container.querySelector('#plan-content-wrap');
      if (!wrap) {
        render();
        return;
      }

      // 1. Update Day pill active states in-place
      container.querySelectorAll('#day-selector-scroll .plan-pill').forEach((btn) => {
        const didx = Number(btn.dataset.didx);
        btn.classList.toggle('active', didx === selectedDayIndex);
      });

      // 2. Update Meal pill active states in-place
      container.querySelectorAll('#meal-filter-scroll .plan-pill').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.mf === selectedMealFilter);
      });

      // 3. Update Preference chip active states in-place
      container.querySelectorAll('#pref-chips .plan-pref-chip').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.pref === selectedPreference);
      });

      // 4. Update header subtitle if plan summary changed
      const summaryEl = container.querySelector('.plan-header-card p.xs.muted');
      if (summaryEl && currentMealPlan?.summary) {
        summaryEl.textContent = currentMealPlan.summary;
      }

      // 5. Update plan content HTML smoothly without touching the filter dock
      wrap.innerHTML = renderPlanContent(currentMealPlan);

      // 6. Bind plan content actions
      bindPlanContentActions();
    }

    function bindPlanContentActions() {
      // Reset filter button listener
      container.querySelectorAll('.btn-reset-filter').forEach((b) => {
        b.addEventListener('click', () => {
          selectedMealFilter = 'all';
          updatePlanViewInPlace();
        });
      });

      // Log Meal button listener
      container.querySelectorAll('.btn-log-meal').forEach((btn) => {
        btn.addEventListener('click', () => {
          const dayIdx = Number(btn.dataset.didx);
          const mealIdx = Number(btn.dataset.midx);
          logPlanMeal(dayIdx, mealIdx);
        });
      });

      // Swap Meal button listener
      container.querySelectorAll('.btn-swap-meal').forEach((btn) => {
        btn.addEventListener('click', () => {
          const dayIdx = Number(btn.dataset.didx);
          const mealIdx = Number(btn.dataset.midx);
          swapMeal(dayIdx, mealIdx);
        });
      });
    }

    function bindEvents() {
      // Market Guide Touch Card Popup
      container.querySelector('#btn-open-market-guide')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openMarketGuideModal();
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });

      container.querySelectorAll('#recipe-tabs button').forEach((b) => {
        b.addEventListener('click', () => {
          tab = b.dataset.t;
          render();
        });
      });

      if (tab === 'planner') {
        // Track live scrolling on each row so filterScrolls is always accurate
        const dayScroll = container.querySelector('#day-selector-scroll');
        dayScroll?.addEventListener('scroll', () => { filterScrolls.day = dayScroll.scrollLeft; }, { passive: true });

        const mealScroll = container.querySelector('#meal-filter-scroll');
        mealScroll?.addEventListener('scroll', () => { filterScrolls.meal = mealScroll.scrollLeft; }, { passive: true });

        const prefScroll = container.querySelector('#pref-chips');
        prefScroll?.addEventListener('scroll', () => { filterScrolls.pref = prefScroll.scrollLeft; }, { passive: true });

        // Preference chips click (Instantly adapts the plan without jumping)
        container.querySelectorAll('#pref-chips button').forEach((btn) => {
          btn.addEventListener('click', () => {
            selectedPreference = btn.dataset.pref;
            const targetKcal = store.macros?.target || 1800;
            const mealCount = currentMealPlan?.days?.[0]?.meals?.length || 2;
            currentMealPlan = generateSmartPlan(selectedPreference, targetKcal, mealCount);
            store.saveMealPlan(currentMealPlan);
            const prefLabel = getPreferences().find((p) => p.id === selectedPreference)?.label || selectedPreference;
            toast(getLang() === 'en' ? `Plan adapted to: ${prefLabel}!` : `Menu diselaraskan mengikut: ${prefLabel}!`, 'success');
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
            updatePlanViewInPlace();
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          });
        });

        // Day selector click (Ikut Hari - Stays in place)
        container.querySelectorAll('#day-selector-scroll button').forEach((btn) => {
          btn.addEventListener('click', () => {
            selectedDayIndex = Number(btn.dataset.didx);
            updatePlanViewInPlace();
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          });
        });

        // Meal filter click (Ikut Waktu Makan - Stays in place)
        container.querySelectorAll('#meal-filter-scroll button').forEach((btn) => {
          btn.addEventListener('click', () => {
            selectedMealFilter = btn.dataset.mf;
            updatePlanViewInPlace();
            btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          });
        });

        // Refresh / Regenerate suggestions button
        container.querySelector('#btn-refresh-suggestions')?.addEventListener('click', () => {
          const targetKcal = store.macros?.target || 1800;
          const mealCount = currentMealPlan?.days?.[0]?.meals?.length || 2;
          currentMealPlan = generateSmartPlan(selectedPreference, targetKcal, mealCount);
          store.saveMealPlan(currentMealPlan);
          toast(getLang() === 'en' ? 'New 7-day meal plan generated!' : 'Cadangan menu 7-hari baru telah dijana!', 'success');
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 25]);
          render();
        });

        // Preferences modal trigger
        container.querySelector('#btn-pref-modal')?.addEventListener('click', () => {
          openPreferenceModal();
        });

        // Print / PDF
        container.querySelector('#btn-print-plan')?.addEventListener('click', () => {
          window.print();
        });

        // Quick 1-tap default plan from MCQ page
        container.querySelector('#btn-quick-default-plan')?.addEventListener('click', () => {
          currentMealPlan = generateSmartPlan('all', store.macros?.target || 1800, 2);
          store.saveMealPlan(currentMealPlan);
          toast(getLang() === 'en' ? '7-Day meal plan loaded!' : 'Pelan 7-Hari berjaya dimuatkan!', 'success');
          render();
        });

        // Bind initial plan content actions
        bindPlanContentActions();

      // MCQ navigation if in survey mode
      container.querySelectorAll('.mcq-option').forEach((optBtn) => {
        optBtn.addEventListener('click', () => {
          const q = PLANNER_QUESTIONS[currentStep];
          mcqAnswers[q.id] = optBtn.dataset.ans;
          if (currentStep < PLANNER_QUESTIONS.length - 1) {
            currentStep++;
          }
          render();
        });
      });

      container.querySelector('#btn-step-prev')?.addEventListener('click', () => {
        if (currentStep > 0) currentStep--;
        render();
      });

      container.querySelector('#btn-step-next')?.addEventListener('click', () => {
        if (currentStep < PLANNER_QUESTIONS.length - 1) currentStep++;
        render();
      });

      container.querySelector('#btn-submit-planner')?.addEventListener('click', async () => {
        isGeneratingPlan = true;
        render();

        try {
          const res = await generateMealPlan({
            answers: mcqAnswers,
            diet: selectedDiet,
          });
          currentMealPlan = res || generateSmartPlan('all', store.macros?.target || 1800, 2);
          store.saveMealPlan(currentMealPlan);
          toast('Pelan 7-Hari berjaya dijana!', 'success');
        } catch {
          currentMealPlan = generateSmartPlan('all', store.macros?.target || 1800, 2);
          store.saveMealPlan(currentMealPlan);
          toast('Pelan 7-Hari dimuatkan!', 'success');
        } finally {
          isGeneratingPlan = false;
          render();
        }
      });
    }

    if (tab === 'recipe') {
      container.querySelectorAll('#diet-chips button').forEach((c) => {
        c.addEventListener('click', () => {
          selectedDiet = c.dataset.d;
          render();
        });
      });

      container.querySelector('#recipe-input')?.addEventListener('input', (e) => {
        recipeTextRequest = e.target.value;
      });

      const imgInput = container.querySelector('#recipe-img-file');
      container.querySelector('#btn-add-ing-img')?.addEventListener('click', () => imgInput?.click());
      imgInput?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          ingredientImage = await compressImage(file);
          render();
        } catch {
          toast('Failed to process image.', 'error');
        }
      });

      container.querySelector('#btn-remove-ing-img')?.addEventListener('click', () => {
        ingredientImage = null;
        render();
      });

      container.querySelector('#btn-gen-recipe')?.addEventListener('click', async () => {
        isGenerating = true;
        render();

        try {
          const res = await generateRecipe({
            request: recipeTextRequest,
            diet: selectedDiet,
            image: ingredientImage,
          });
          currentRecipe = res;
          toast(`Recipe ready: ${res.title}!`, 'success');
        } catch (err) {
          toast(err.message || 'Failed to generate recipe.', 'error');
        } finally {
          isGenerating = false;
          render();
        }
      });

      container.querySelector('#btn-save-recipe')?.addEventListener('click', () => {
        if (!currentRecipe) return;
        store.saveRecipe(currentRecipe);
        toast(`Recipe "${currentRecipe.title}" saved to collection!`, 'success');
      });

      container.querySelector('#btn-log-recipe-meal')?.addEventListener('click', () => {
        if (!currentRecipe) return;
        const n = currentRecipe.nutrition || {};
        store.addMeal({
          name: currentRecipe.title,
          kcal: n.calories_kcal || 500,
          protein: n.protein_g || 30,
          carbs: n.carbs_g || 50,
          fat: n.fat_g || 15,
          weight_g: 350,
        });
        toast(`Meal "${currentRecipe.title}" logged for today!`, 'success');
      });
    }

    if (tab === 'saved') {
      container.querySelectorAll('.view-saved-btn').forEach((b) => {
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          const r = store.state.recipes.find((x) => x.id === id);
          if (r) {
            currentRecipe = r;
            tab = 'recipe';
            render();
          }
        });
      });

      container.querySelectorAll('.del-saved-btn').forEach((b) => {
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          store.deleteRecipe(id);
          render();
        });
      });
    }
  }

  render();
}
