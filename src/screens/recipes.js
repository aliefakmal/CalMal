// Skrin Resipi & Pelan Makanan AI CalMal
// Minimalist, Responsif, Sokong Paparan Ikut Hari & Ikut Waktu Makan, serta Preferences Dinamik
import { icons } from '../components/icons.js';
import { toast, openSheet } from '../components/ui.js';
import { generateRecipe, generateMealPlan } from '../services/gemini.js';
import { DIET_FILTERS, PLANNER_QUESTIONS } from '../constants/prompts.js';
import { compressImage, esc, round1 } from '../utils/helpers.js';
import { store } from '../services/store.js';

// Pool Menu Makanan Sihat Malaysia (Mengikut Waktu & Kategori Preferences)
export const MALAYSIAN_MEAL_POOL = {
  breakfast: [
    { name: 'Roti Bakar Wholemeal, 2 Telur Separuh Masak & Kopi O Kurang Manis', kcal: 320, protein_g: 16, tags: ['protein', 'quick', 'budget', 'all'] },
    { name: 'Oatmeal Bersama Buah Epal, Kismis & Segelas Susu Rendah Lemak', kcal: 310, protein_g: 14, tags: ['oil', 'quick', 'budget', 'all'] },
    { name: 'Tosai Garing Bersama Kuah Dhal & Chutney Pudina', kcal: 260, protein_g: 9, tags: ['mamak', 'oil', 'budget', 'all'] },
    { name: 'Nasi Lemak Sihat (Nasi Separuh, Sambal Kurang Minyak, Telur Rebus & Timun)', kcal: 380, protein_g: 14, tags: ['melayu', 'budget', 'all'] },
    { name: 'Bihun Sup Ayam Dada Jernih Bersama Daun Bawang & Cili Potong', kcal: 330, protein_g: 22, tags: ['protein', 'oil', 'melayu', 'all'] },
    { name: 'Roti Canai Kosong (1 Keping) Bersama Kuah Kari Ayam Asing', kcal: 340, protein_g: 10, tags: ['mamak', 'all'] },
    { name: 'Scrambled Eggs (2 Biji), Roti Bakar Gandum Penuh & Tomato Ceri', kcal: 290, protein_g: 18, tags: ['protein', 'lowcarb', 'quick', 'all'] },
    { name: 'Telur Dadar Herba & Sup Sayur Cendawan', kcal: 230, protein_g: 15, tags: ['lowcarb', 'quick', 'oil', 'all'] },
    { name: 'Roti Naan Garlic Bakar Tandoor Bersama Kuah Dhal Pekat', kcal: 350, protein_g: 12, tags: ['mamak', 'budget', 'all'] },
    { name: 'Greek Yogurt Bersama Hirisan Pisang & Sedikit Madu Asli', kcal: 240, protein_g: 15, tags: ['protein', 'quick', 'oil', 'all'] },
  ],
  lunch: [
    { name: 'Nasi Putih (1/2 Cawan), Ayam Masak Lemak Cili Api (Dada), Kubis Goreng Kunyit & Teh O Ais Kosong', kcal: 850, protein_g: 65, tags: ['melayu', 'protein', 'all'] },
    { name: 'Nasi Putih (1/2 Cawan), Sup Ayam Utara (Dada), Ulam Timun, Sambal Belacan & Limau Ais Kurang Manis', kcal: 820, protein_g: 63, tags: ['melayu', 'oil', 'protein', 'all'] },
    { name: 'Nasi Putih (1/2 Cawan), Ayam Bakar Madu Bersaiz Sederhana, Ulam Raja, Pegaga & Air Kosong', kcal: 830, protein_g: 64, tags: ['melayu', 'protein', 'oil', 'all'] },
    { name: 'Nasi Kerabu Kelantan Bersama Ayam Percik Dada, Ulam Segar & Telur Masin Separuh', kcal: 780, protein_g: 58, tags: ['melayu', 'protein', 'all'] },
    { name: 'Nasi Ayam Hainan Stim (Bahagian Dada), Sup Timun Jernih & Sos Halia Cili', kcal: 680, protein_g: 48, tags: ['protein', 'oil', 'all'] },
    { name: 'Nasi Campur Sihat: Nasi 1/2 Senduk, Ikan Kembung Bakar Air Asam, Bendi Rebus & Tauhu Sumbat', kcal: 540, protein_g: 44, tags: ['melayu', 'oil', 'budget', 'protein', 'all'] },
    { name: 'Nasi Kandar Sihat: Nasi 1/2, Ayam Tandoori Panggang, Bendi Celur & Kuah Dhal Asing', kcal: 690, protein_g: 54, tags: ['mamak', 'protein', 'all'] },
    { name: 'Nasi Goreng Kampung Kurang Minyak Bersama Dada Ayam Kunyit & Kangkung Belacan', kcal: 640, protein_g: 42, tags: ['melayu', 'budget', 'quick', 'all'] },
    { name: 'Sup Daging Empuk Bersama Kentang, Lobak Merah & Nasi Putih Separuh', kcal: 620, protein_g: 45, tags: ['melayu', 'protein', 'oil', 'all'] },
    { name: 'Salad Ulam Kampung Bersama Isi Ayam Panggang Rosemary & Sos Lemon Air Asam', kcal: 450, protein_g: 52, tags: ['lowcarb', 'protein', 'oil', 'all'] },
    { name: 'Nasi Bujang Sihat: Nasi 1/2, Telur Mata 2 Biji, Sup Kosong & Sambal Kicap Cili Padi', kcal: 490, protein_g: 22, tags: ['budget', 'quick', 'all'] },
    { name: 'Bihun Tomyam Putih Campur Udang Segar & Cendawan Tiram', kcal: 510, protein_g: 36, tags: ['oil', 'quick', 'all'] },
  ],
  dinner: [
    { name: 'Mee Hoon Sup Ayam (Tanpa Minyak Berlebihan) Dengan Lebihan Isi Ayam Dada & Taugeh', kcal: 890, protein_g: 62, tags: ['melayu', 'oil', 'protein', 'all'] },
    { name: 'Bihun Goreng Putih Kampung Bersama Ayam Cincang & Sawi Hijau', kcal: 940, protein_g: 64, tags: ['melayu', 'protein', 'all'] },
    { name: 'Sup Bihun Bersama Isi Ayam Dada & Sayur Campur Segar', kcal: 900, protein_g: 63, tags: ['oil', 'melayu', 'protein', 'all'] },
    { name: 'Ikan Siakap Stim Limau & Halia Bersama Sayur Bayam Bening & Nasi Putih 1/2 Cawan', kcal: 580, protein_g: 52, tags: ['oil', 'protein', 'melayu', 'all'] },
    { name: 'Ayam Dada Panggang Herba, Kentang Putar Tanpa Mentega & Salad Jagung Manis', kcal: 540, protein_g: 56, tags: ['protein', 'quick', 'all'] },
    { name: 'Sup Tulang / Daging Halia Bersama Sayur Sawi & Nasi Putih Separuh', kcal: 620, protein_g: 46, tags: ['melayu', 'protein', 'oil', 'all'] },
    { name: 'Kuey Teow Kungfu Sup Jernih Bersama Telur Putih, Udang & Kobis Bunga', kcal: 560, protein_g: 38, tags: ['oil', 'quick', 'all'] },
    { name: 'Yong Tau Foo Rebus Sup Jernih (Tauhu, Bendi, Peria, Telur & Kangkung Celur)', kcal: 420, protein_g: 34, tags: ['oil', 'lowcarb', 'budget', 'all'] },
    { name: 'Chapati Panas (2 Keping) Bersama Kuah Dhal Pekat & Ayam Tandoori Panggang', kcal: 580, protein_g: 48, tags: ['mamak', 'protein', 'oil', 'all'] },
    { name: 'Sup Ayam Kampung Herba Bersama Keledek Manis Rebus', kcal: 490, protein_g: 42, tags: ['oil', 'melayu', 'protein', 'all'] },
    { name: 'Wrap Tortilla Gandum Penuh Bersama Isi Ayam Dada, Salad Timun & Sos Yogurt', kcal: 460, protein_g: 40, tags: ['quick', 'protein', 'lowcarb', 'all'] },
  ],
  snack: [
    { name: 'Buah Epal Hijau Bersama 10 Biji Badam Panggang Tanpa Garam', kcal: 180, protein_g: 5, tags: ['oil', 'quick', 'budget', 'all'] },
    { name: 'Pisang Emas (2 Biji) & Air Kelapa Muda Segar Tanpa Gula', kcal: 140, protein_g: 2, tags: ['quick', 'budget', 'all'] },
    { name: 'Telur Rebus (1 Biji) Bersama Secawan Kopi O Kosong', kcal: 78, protein_g: 6.5, tags: ['protein', 'quick', 'lowcarb', 'budget', 'all'] },
    { name: 'Popiah Basah Sayur (1 Gulung) Bersama Sos Kacang Nipis', kcal: 110, protein_g: 4, tags: ['melayu', 'budget', 'all'] },
    { name: 'Greek Yogurt Rendah Lemak Bersama Sedikit Biji Chia', kcal: 130, protein_g: 11, tags: ['protein', 'quick', 'lowcarb', 'all'] },
    { name: 'Tempe Bakar Rangup Bersama Sambal Kicap Pedas', kcal: 160, protein_g: 12, tags: ['protein', 'budget', 'melayu', 'all'] },
  ]
};

export const PREFERENCES = [
  { id: 'all', label: 'Semua Pilihan', icon: '✨' },
  { id: 'protein', label: 'Tinggi Protein', icon: '💪' },
  { id: 'oil', label: 'Kurang Minyak / Sup', icon: '🥗' },
  { id: 'budget', label: 'Bajet Jimat (<RM10)', icon: '💰' },
  { id: 'quick', label: 'Cepat & Mudah (<15m)', icon: '⚡' },
  { id: 'lowcarb', label: 'Rendah Karbo', icon: '🌾' },
  { id: 'melayu', label: 'Lauk Melayu', icon: '🇲🇾' },
  { id: 'mamak', label: 'Mamak Sihat', icon: '🍛' },
];

export function getMealTypeInfo(type = '') {
  const t = (type || '').toLowerCase();
  if (t.includes('sarapan') || t.includes('breakfast')) {
    return { id: 'breakfast', label: 'Sarapan', icon: '🌅', colorClass: 'breakfast' };
  }
  if (t.includes('tengah hari') || t.includes('lunch') || t.includes('siang')) {
    return { id: 'lunch', label: 'Makan Tengah Hari', icon: '☀️', colorClass: 'lunch' };
  }
  if (t.includes('malam') || t.includes('dinner')) {
    return { id: 'dinner', label: 'Makan Malam', icon: '🌙', colorClass: 'dinner' };
  }
  if (t.includes('snek') || t.includes('snack') || t.includes('petang') || t.includes('afternoon')) {
    return { id: 'snack', label: 'Snek', icon: '🍎', colorClass: 'snack' };
  }
  return { id: 'other', label: type || 'Hidangan', icon: '🍽️', colorClass: 'other' };
}

export function getNormalizedDayName(day = '') {
  const d = String(day).trim();
  const lower = d.toLowerCase();
  if (lower.startsWith('mon') || lower === 'isnin') return 'Isnin';
  if (lower.startsWith('tue') || lower === 'selasa') return 'Selasa';
  if (lower.startsWith('wed') || lower === 'rabu') return 'Rabu';
  if (lower.startsWith('thu') || lower === 'khamis') return 'Khamis';
  if (lower.startsWith('fri') || lower === 'jumaat') return 'Jumaat';
  if (lower.startsWith('sat') || lower === 'sabtu') return 'Sabtu';
  if (lower.startsWith('sun') || lower === 'ahad') return 'Ahad';
  return d;
}

export function generateSmartPlan(pref = 'all', targetKcal = 1800, mealCount = 2) {
  const daysName = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'];
  
  function pickMeal(category, dayIdx) {
    const list = MALAYSIAN_MEAL_POOL[category] || MALAYSIAN_MEAL_POOL.lunch;
    const filtered = pref !== 'all' ? list.filter((m) => m.tags.includes(pref)) : list;
    const pool = filtered.length ? filtered : list;
    return pool[(dayIdx * 3 + (category === 'dinner' ? 2 : category === 'lunch' ? 1 : 0)) % pool.length];
  }

  const days = daysName.map((day, idx) => {
    let meals = [];
    if (mealCount === 2) {
      // Makan Tengah Hari & Makan Malam (seperti skrin asal pengguna)
      const l = pickMeal('lunch', idx);
      const d = pickMeal('dinner', idx);
      meals = [
        { type: 'Makan Tengah Hari', name: l.name, kcal: l.kcal, protein_g: l.protein_g },
        { type: 'Makan Malam', name: d.name, kcal: d.kcal, protein_g: d.protein_g },
      ];
    } else if (mealCount === 3) {
      const b = pickMeal('breakfast', idx);
      const l = pickMeal('lunch', idx);
      const d = pickMeal('dinner', idx);
      meals = [
        { type: 'Sarapan', name: b.name, kcal: b.kcal, protein_g: b.protein_g },
        { type: 'Makan Tengah Hari', name: l.name, kcal: l.kcal, protein_g: l.protein_g },
        { type: 'Makan Malam', name: d.name, kcal: d.kcal, protein_g: d.protein_g },
      ];
    } else {
      const b = pickMeal('breakfast', idx);
      const l = pickMeal('lunch', idx);
      const s = pickMeal('snack', idx);
      const d = pickMeal('dinner', idx);
      meals = [
        { type: 'Sarapan', name: b.name, kcal: b.kcal, protein_g: b.protein_g },
        { type: 'Makan Tengah Hari', name: l.name, kcal: l.kcal, protein_g: l.protein_g },
        { type: 'Snek', name: s.name, kcal: s.kcal, protein_g: s.protein_g },
        { type: 'Makan Malam', name: d.name, kcal: d.kcal, protein_g: d.protein_g },
      ];
    }

    const total_kcal = meals.reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);
    return { day, total_kcal, meals };
  });

  const prefLabel = PREFERENCES.find((p) => p.id === pref)?.label || 'Seimbang';
  return {
    summary: `Pelan 7-Hari gaya Malaysia diselaraskan mengikut sasaran ~${targetKcal} kcal sehari dengan fokus: ${prefLabel}.`,
    preference: pref,
    days,
    shopping_tips: [
      'Beli dada ayam segar dan ikan tempatan (siakap / kembung) di pasar pagi untuk kualiti segar dan harga jimat.',
      'Amalkan ulam-ulaman segar tempatan seperti pegaga, timun, bendi dan raja untuk mikronutrien serta serat kenyang.',
      'Kawal santan dan lebihkan herba rempah ratus seperti kunyit, halia, serai dan cili untuk rasa sedap tanpa kalori tersembunyi.',
    ],
  };
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
  let currentMealPlan = store.state.mealPlan || generateSmartPlan('all', store.macros?.target || 1800, 2);
  let isGeneratingPlan = false;

  // Planner View Modes & Preference states
  let planViewMode = 'day'; // 'day' (Ikut Hari) | 'meal' (Ikut Waktu Makan / Menu)
  let selectedDayIndex = 0; // 0: Isnin, 1: Selasa, ... or -1 for 'Semua Hari'
  let selectedMealFilter = 'all'; // 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'
  let selectedPreference = currentMealPlan?.preference || 'all';

  function render() {
    container.innerHTML = `
      <div class="page-head">
        <div>
          <span class="eyebrow">AI Nutrition & Malaysian Culinary Kitchen</span>
          <h1 class="page-title">Recipes & Meal Plans</h1>
        </div>
      </div>

      <!-- Segmented Tab -->
      <div class="segmented" id="recipe-tabs" style="margin-bottom:16px">
        <button type="button" data-t="planner" class="${tab === 'planner' ? 'active' : ''}">
          ${icons.sparkles}
          <span>7-Day Plan</span>
        </button>
        <button type="button" data-t="recipe" class="${tab === 'recipe' ? 'active' : ''}">
          ${icons.chef}
          <span>Recipe Generator</span>
        </button>
        <button type="button" data-t="saved" class="${tab === 'saved' ? 'active' : ''}">
          ${icons.bowl}
          <span>Saved (${store.state.recipes.length})</span>
        </button>
      </div>

      ${tab === 'planner' ? renderMealPlanner() : tab === 'recipe' ? renderRecipeGenerator() : renderSavedRecipes()}
    `;

    bindEvents();
  }

  function renderRecipeGenerator() {
    return `
      <div class="stack fade-up">
        <div class="card stack">
          <div class="card-title">
            <span>Dietary Filter</span>
            <span class="xs muted">Halal / Health Focus</span>
          </div>
          <div class="chips" id="diet-chips">
            ${DIET_FILTERS.map((d) => `<button type="button" class="chip ${selectedDiet === d ? 'active' : ''}" data-d="${d}">${d}</button>`).join('')}
          </div>

          <div class="field" style="margin-top:4px">
            <label for="recipe-input">Your Request / Ingredients</label>
            <textarea class="textarea" id="recipe-input" placeholder="e.g. I have chicken breast, spinach and light coconut milk. Suggest a healthy, high-protein meal...">${esc(recipeTextRequest)}</textarea>
          </div>

          <div class="row between" style="align-items:center">
            <input type="file" id="recipe-img-file" accept="image/*" class="hidden" />
            <button type="button" class="btn btn-sm btn-ghost" id="btn-add-ing-img">
              ${icons.camera}
              <span>${ingredientImage ? 'Change Ingredient Photo' : 'Fridge / Ingredients Photo'}</span>
            </button>
            ${ingredientImage ? '<span class="badge ok">1 photo attached</span>' : ''}
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
            <span>${isGenerating ? 'Gemini is Crafting Recipe...' : 'Generate Recipe with AI'}</span>
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
            <span>Calories</span>
            <b class="num">${n.calories_kcal || 0}</b>
            <span class="xs muted">kcal</span>
          </div>
          <div class="eq-cell">
            <span>Protein</span>
            <b class="num">${round1(n.protein_g || 0)}</b>
            <span class="xs muted">g</span>
          </div>
          <div class="eq-cell">
            <span>Carbs / Fat</span>
            <b class="num">${round1(n.carbs_g || 0)}/${round1(n.fat_g || 0)}</b>
            <span class="xs muted">g</span>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <b class="small" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Ingredients:</b>
          <ul style="padding-left:20px;margin:8px 0;line-height:1.6;font-size:14px">
            ${(r.ingredients || []).map((ing) => `<li>${esc(typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.name || ''}`)}</li>`).join('')}
          </ul>
        </div>

        <div>
          <b class="small" style="text-transform:uppercase;letter-spacing:0.06em;color:var(--muted)">Cooking Instructions:</b>
          <ol style="padding-left:20px;margin:8px 0;line-height:1.6;font-size:14px">
            ${(r.steps || []).map((st) => `<li>${esc(st)}</li>`).join('')}
          </ol>
        </div>

        ${r.tips ? `<div class="card flat" style="background:#0d0d0e;border:1px solid var(--border);padding:12px;font-size:13px"><b style="color:var(--deku)">Chef Tip:</b> ${esc(r.tips)}</div>` : ''}

        <div class="grid grid-2" style="margin-top:8px">
          <button type="button" class="btn btn-secondary" id="btn-save-recipe">
            ${icons.plus}
            <span>Save Recipe</span>
          </button>
          <button type="button" class="btn btn-primary" id="btn-log-recipe-meal">
            ${icons.check}
            <span>Log This Meal</span>
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
              <span>Previous</span>
            </button>
            ${
              currentStep === PLANNER_QUESTIONS.length - 1
                ? `<button type="button" class="btn btn-primary" id="btn-submit-planner" ${!mcqAnswers[q.id] || isGeneratingPlan ? 'disabled' : ''}>
                    ${isGeneratingPlan ? '<span class="spinner"></span>' : icons.sparkles}
                    <span>${isGeneratingPlan ? 'Generating 7-Day Plan...' : 'Generate 7-Day Plan'}</span>
                  </button>`
                : `<button type="button" class="btn btn-secondary btn-sm" id="btn-step-next" ${!mcqAnswers[q.id] ? 'disabled' : ''}>
                    <span>Next</span>
                    ${icons.chevronRight}
                  </button>`
            }
          </div>

          <div class="divider" style="margin:12px 0 8px"></div>
          <button type="button" class="btn btn-ghost btn-sm btn-block" id="btn-quick-default-plan" style="color:var(--deku);gap:6px">
            ⚡ <span>Gunakan Cadangan Pantas (1-Tap Serta-merta)</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderMealCard(meal, dayIdx, mealIdx, showDayBadge = false, dayName = '') {
    const typeInfo = getMealTypeInfo(meal.type);
    return `
      <div class="plan-meal-card">
        <div class="plan-meal-header">
          <div style="display:flex;align-items:center;gap:6px">
            ${showDayBadge ? `<span style="background:rgba(255,255,255,0.08);padding:2px 7px;border-radius:6px;color:#fff;font-size:11px;font-weight:700">${esc(dayName)}</span>` : ''}
            <span class="meal-type-tag ${typeInfo.colorClass}">
              <span>${typeInfo.icon}</span> <span>${esc(typeInfo.label)}</span>
            </span>
          </div>
          <div class="meal-metrics-group">
            <span class="meal-metric-badge kcal">🔥 ${meal.kcal} kcal</span>
            <span class="meal-metric-badge protein">💪 ${meal.protein_g}g P</span>
          </div>
        </div>

        <div class="plan-meal-title">${esc(meal.name)}</div>

        <div class="plan-meal-actions">
          <button type="button" class="plan-action-btn primary btn-log-meal" data-didx="${dayIdx}" data-midx="${mealIdx}" title="Log into today's diary">
            <span>+</span> <span>Log Meal</span>
          </button>
          <button type="button" class="plan-action-btn btn-swap-meal" data-didx="${dayIdx}" data-midx="${mealIdx}" title="Swap with alternative dish">
            <span>🔄</span> <span>Tukar Lauk</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderSingleDay(day, dayIdx) {
    const targetKcal = store.macros?.target || 1800;
    const dayName = getNormalizedDayName(day.day);
    const dayProtein = (day.meals || []).reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0);

    return `
      <div class="plan-day-section fade-up">
        <div class="plan-day-banner">
          <div class="plan-day-title">
            <span>📅 ${dayName}</span>
          </div>
          <div class="row" style="gap:6px;align-items:center">
            <span class="meal-metric-badge kcal" style="font-size:12px;padding:3px 9px">🔥 ${day.total_kcal} kcal</span>
            <span class="meal-metric-badge protein" style="font-size:12px;padding:3px 9px">💪 ${dayProtein}g P</span>
          </div>
        </div>

        <div class="stack" style="gap:8px">
          ${(day.meals || []).map((m, mIdx) => renderMealCard(m, dayIdx, mIdx)).join('')}
        </div>
      </div>
    `;
  }

  function renderAllDays(days = []) {
    return `
      <div class="stack" style="gap:14px">
        ${days.map((d, dIdx) => {
          const dName = getNormalizedDayName(d.day);
          return `
            <div class="plan-day-section">
              <div class="plan-day-banner">
                <div class="plan-day-title">
                  <span>📅 ${dName}</span>
                </div>
                <div class="row" style="gap:6px;align-items:center">
                  <span class="meal-metric-badge kcal">🔥 ${d.total_kcal} kcal</span>
                </div>
              </div>
              <div class="stack" style="gap:8px">
                ${(d.meals || []).map((m, mIdx) => renderMealCard(m, dIdx, mIdx)).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderMealModeView(plan) {
    const mealFilters = [
      { id: 'all', label: 'Semua Menu', icon: '🍽️' },
      { id: 'breakfast', label: 'Sarapan', icon: '🌅' },
      { id: 'lunch', label: 'Makan Tengah Hari', icon: '☀️' },
      { id: 'dinner', label: 'Makan Malam', icon: '🌙' },
      { id: 'snack', label: 'Snek', icon: '🍎' },
    ];

    // Gather all meals with their corresponding day information
    const allFilteredMeals = [];
    (plan.days || []).forEach((d, dayIdx) => {
      const dayName = getNormalizedDayName(d.day);
      (d.meals || []).forEach((m, mealIdx) => {
        const typeInfo = getMealTypeInfo(m.type);
        if (selectedMealFilter === 'all' || typeInfo.id === selectedMealFilter) {
          allFilteredMeals.push({ meal: m, dayIdx, mealIdx, dayName });
        }
      });
    });

    return `
      <div class="stack fade-up" style="gap:10px">
        <!-- Meal Time Filter Horizontal Scroll -->
        <div class="plan-filter-scroll" id="meal-filter-scroll">
          ${mealFilters.map((f) => `
            <button type="button" class="plan-pill ${selectedMealFilter === f.id ? 'active' : ''}" data-mf="${f.id}">
              <span>${f.icon}</span> <span>${f.label}</span>
            </button>
          `).join('')}
        </div>

        <!-- Meals List -->
        <div class="stack" style="gap:8px">
          ${
            allFilteredMeals.length === 0
              ? `<div class="empty" style="padding:20px;text-align:center;color:var(--muted);font-size:13px">
                  Tiada hidangan untuk waktu makan ini dalam pelan semasa.
                </div>`
              : allFilteredMeals.map((item) => renderMealCard(item.meal, item.dayIdx, item.mealIdx, true, item.dayName)).join('')
          }
        </div>
      </div>
    `;
  }

  function renderDayModeView(plan) {
    return `
      <div class="stack fade-up" style="gap:10px">
        <!-- Day Selector Horizontal Scroll -->
        <div class="plan-filter-scroll" id="day-selector-scroll">
          <button type="button" class="plan-pill ${selectedDayIndex === -1 ? 'active' : ''}" data-didx="-1">
            <span>🗓️ Semua Hari</span>
          </button>
          ${(plan.days || []).map((d, idx) => {
            const dName = getNormalizedDayName(d.day);
            return `
              <button type="button" class="plan-pill ${selectedDayIndex === idx ? 'active' : ''}" data-didx="${idx}">
                <span>${dName}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Single Day View or All Days View -->
        ${selectedDayIndex >= 0 && plan.days?.[selectedDayIndex] ? renderSingleDay(plan.days[selectedDayIndex], selectedDayIndex) : renderAllDays(plan.days)}
      </div>
    `;
  }

  function renderMealPlanResult(plan) {
    const targetKcal = store.macros?.target || 1800;

    return `
      <div class="plan-container fade-up">
        <!-- Top Header Card -->
        <div class="plan-header-card">
          <div class="row between" style="align-items:flex-start">
            <div>
              <span class="eyebrow">Pelan Pemakanan 7-Hari</span>
              <h2 style="font-size:20px;font-weight:800;color:#fff;margin:2px 0 4px">Jadual Menu Sihat</h2>
              <p class="xs muted" style="line-height:1.4">${esc(plan.summary || 'Pelan pemakanan seimbang mengikut cita rasa tempatan Malaysia.')}</p>
            </div>
            <div class="row" style="gap:6px">
              <button type="button" class="btn btn-sm btn-ghost" id="btn-pref-modal" title="Tetapan Preferences & Sasaran">
                <span>⚙️</span> <span>Preferences</span>
              </button>
              <button type="button" class="btn btn-sm btn-ghost" id="btn-print-plan" title="Cetak / Simpan PDF">
                ${icons.printer}
              </button>
            </div>
          </div>

          <!-- Active Preferences Bar -->
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:2px">
            <div class="row between" style="align-items:center">
              <span class="xs bold muted" style="text-transform:uppercase;letter-spacing:0.04em">Pilihan Preferences:</span>
              <button type="button" class="btn btn-xs btn-ghost" id="btn-refresh-suggestions" style="color:var(--deku);font-size:11px;padding:2px 8px;gap:4px">
                <span>🔄</span> <span>Rombak Menu Baru</span>
              </button>
            </div>
            <div class="plan-filter-scroll" id="pref-chips">
              ${PREFERENCES.map((p) => `
                <button type="button" class="plan-pref-chip ${selectedPreference === p.id ? 'active' : ''}" data-pref="${p.id}">
                  <span>${p.icon}</span> <span>${p.label}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- View Mode Switcher: Ikut Hari vs Ikut Waktu Makan -->
          <div class="plan-view-switch" style="margin-top:4px">
            <button type="button" class="plan-view-btn ${planViewMode === 'day' ? 'active' : ''}" data-vm="day">
              <span>📅</span> <span>Ikut Hari (Day by Day)</span>
            </button>
            <button type="button" class="plan-view-btn ${planViewMode === 'meal' ? 'active' : ''}" data-vm="meal">
              <span>🍽️</span> <span>Ikut Waktu Makan / Menu</span>
            </button>
          </div>
        </div>

        <!-- Dynamic Content View -->
        ${planViewMode === 'day' ? renderDayModeView(plan) : renderMealModeView(plan)}

        <!-- Shopping & Grocery Tips Accordion/Card -->
        ${
          plan.shopping_tips && plan.shopping_tips.length
            ? `<div class="card flat" style="background:#09090b;border:1px solid rgba(255,255,255,0.07);padding:12px 14px">
                <b class="xs muted" style="text-transform:uppercase;letter-spacing:0.05em">🛒 Tips Pasar & Jimat Belanja:</b>
                <ul style="padding-left:18px;margin:6px 0 0;line-height:1.55;font-size:12px;color:var(--text-2)">
                  ${plan.shopping_tips.map((t) => `<li>${esc(t)}</li>`).join('')}
                </ul>
              </div>`
            : ''
        }
      </div>
    `;
  }

  function renderSavedRecipes() {
    const list = store.state.recipes;
    return `
      <div class="stack fade-up">
        <div class="card">
          <div class="card-title">
            <span>Your Recipe Collection</span>
            <span class="muted">${list.length} recipes</span>
          </div>

          <div class="list">
            ${
              list.length === 0
                ? `<div class="empty">
                    ${icons.chef}
                    <p>No saved recipes yet.</p>
                    <span class="small muted">Generate healthy recipes in the "Recipe Generator" tab and save them here!</span>
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
      <h3 class="sheet-title">⚙️ Preferences & Sasaran Menu</h3>
      <p class="muted small" style="margin-bottom:14px">Ubah suai keutamaan hidangan dan sasaran kalori harian anda.</p>

      <div class="stack" style="gap:12px">
        <div class="field">
          <label>Sasaran Kalori Harian (kcal)</label>
          <input class="input num" id="pref-kcal-target" type="number" value="${targetKcal}" min="1000" max="4500" step="50" />
        </div>

        <div class="field">
          <label>Kekerapan Hidangan Sehari</label>
          <div class="segmented" id="pref-meal-count" style="margin-top:4px">
            <button type="button" data-c="2" class="${currentMealPlan?.days?.[0]?.meals?.length === 2 ? 'active' : ''}">2 Kali (Siang & Malam)</button>
            <button type="button" data-c="3" class="${currentMealPlan?.days?.[0]?.meals?.length === 3 ? 'active' : ''}">3 Kali (+ Sarapan)</button>
            <button type="button" data-c="4" class="${currentMealPlan?.days?.[0]?.meals?.length === 4 ? 'active' : ''}">3 Kali + Snek</button>
          </div>
        </div>

        <div class="field">
          <label>Fokus Diet Utama</label>
          <div class="chips" id="pref-focus-chips" style="margin-top:4px">
            ${PREFERENCES.map((p) => `<button type="button" class="chip ${selectedPreference === p.id ? 'active' : ''}" data-p="${p.id}">${p.icon} ${p.label}</button>`).join('')}
          </div>
        </div>

        <div class="grid grid-2" style="margin-top:8px;gap:10px">
          <button class="btn btn-ghost" data-close>Batal</button>
          <button class="btn btn-primary" id="btn-save-pref">Simpan & Jana Semula</button>
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
      toast('Preferences disimpan & menu baru telah dijana!', 'success');
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

    currentMealPlan.days[dayIdx].meals[mealIdx] = {
      type: oldMeal.type,
      name: picked.name,
      kcal: picked.kcal,
      protein_g: picked.protein_g,
    };

    // Recalculate day total kcal
    currentMealPlan.days[dayIdx].total_kcal = currentMealPlan.days[dayIdx].meals.reduce((sum, m) => sum + (Number(m.kcal) || 0), 0);

    store.saveMealPlan(currentMealPlan);
    toast(`Lauk ditukar kepada: ${picked.name.slice(0, 35)}...`, 'success');
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
    render();
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

    toast(`Berjaya log: ${m.name.slice(0, 30)} (+${kVal} kcal)!`, 'success');
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30]);
  }

  function bindEvents() {
    container.querySelectorAll('#recipe-tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        tab = b.dataset.t;
        render();
      });
    });

    if (tab === 'planner') {
      // Preference chips click (Instantly adapts the plan)
      container.querySelectorAll('#pref-chips button').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedPreference = btn.dataset.pref;
          const targetKcal = store.macros?.target || 1800;
          const mealCount = currentMealPlan?.days?.[0]?.meals?.length || 2;
          currentMealPlan = generateSmartPlan(selectedPreference, targetKcal, mealCount);
          store.saveMealPlan(currentMealPlan);
          const prefLabel = PREFERENCES.find((p) => p.id === selectedPreference)?.label || selectedPreference;
          toast(`Menu diselaraskan mengikut: ${prefLabel}!`, 'success');
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
          render();
        });
      });

      // View mode switcher: Day vs Meal
      container.querySelectorAll('.plan-view-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          planViewMode = btn.dataset.vm;
          render();
        });
      });

      // Day selector click (Ikut Hari)
      container.querySelectorAll('#day-selector-scroll button').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedDayIndex = Number(btn.dataset.didx);
          render();
        });
      });

      // Meal filter click (Ikut Waktu Makan)
      container.querySelectorAll('#meal-filter-scroll button').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedMealFilter = btn.dataset.mf;
          render();
        });
      });

      // Refresh / Regenerate suggestions button
      container.querySelector('#btn-refresh-suggestions')?.addEventListener('click', () => {
        const targetKcal = store.macros?.target || 1800;
        const mealCount = currentMealPlan?.days?.[0]?.meals?.length || 2;
        currentMealPlan = generateSmartPlan(selectedPreference, targetKcal, mealCount);
        store.saveMealPlan(currentMealPlan);
        toast('Cadangan menu 7-hari baru telah dijana!', 'success');
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
        toast('Pelan 7-Hari berjaya dimuatkan!', 'success');
        render();
      });

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
