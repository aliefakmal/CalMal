// Quick Edit Modal Component — Portion Adjuster, Malaysian Gravy Slider ("Pelaras Kuah") & Quick Chips
import { openSheet, toast } from './ui.js';
import { store } from '../services/store.js';
import { onMealLogged } from '../services/companionService.js';
import { esc, MEAL_TYPES, mealTypeNow, round1, int } from '../utils/helpers.js';

const MALAYSIAN_QUICK_MEALS = [
  { name: 'Nasi Lemak Telur Rebus', kcal: 380, protein: 14, carbs: 52, fat: 14, weight_g: 220 },
  { name: 'Roti Canai Kosong + Dhal', kcal: 360, protein: 9, carbs: 48, fat: 15, weight_g: 160 },
  { name: 'Teh Tarik Kurang Manis', kcal: 110, protein: 3, carbs: 16, fat: 4, weight_g: 240 },
  { name: 'Ayam Dada Panggang', kcal: 220, protein: 36, carbs: 0, fat: 8, weight_g: 180 },
  { name: 'Mee Goreng Mamak', kcal: 480, protein: 16, carbs: 64, fat: 18, weight_g: 260 },
  { name: 'Tosai + Chutney', kcal: 210, protein: 6, carbs: 36, fat: 5, weight_g: 150 },
];

/**
 * @param {object} draft  meal values (name, kcal, protein, carbs, fat, weight_g, ...)
 * @param {object} opts   { existingId, title, onSaved }
 */
export function openMealEditor(draft = {}, { existingId = null, title, onSaved } = {}) {
  const base = {
    kcal: Number(draft.kcal) || 0,
    protein: Number(draft.protein) || 0,
    carbs: Number(draft.carbs) || 0,
    fat: Number(draft.fat) || 0,
    weight_g: Number(draft.weight_g) || 0,
  };
  let mult = Number(draft.portion) && existingId ? 1 : 1;
  let kuahLevel = draft.kuah || 'sedang'; // 'kering' (-20% fat/oil) | 'sedang' (1.0x) | 'banjir' (+120 kcal)

  const { el, close } = openSheet(`
    <h3 class="sheet-title">${esc(title || (existingId ? 'Edit Meal' : 'Quick Meal Entry'))}</h3>
    <p class="muted small" style="margin-bottom:14px">Adjust portion sizes, gravy thickness, or fine-tune macros.</p>

    <!-- Malaysian Quick-Add Chips (if creating or blank) -->
    ${
      !existingId && !draft.name
        ? `<div class="quick-chips-box" style="margin-bottom:14px">
            <span class="label xs bold muted" style="text-transform:uppercase;letter-spacing:0.05em">Malaysian Favorites Quick-Tap:</span>
            <div class="chips" style="margin-top:6px;gap:6px">
              ${MALAYSIAN_QUICK_MEALS.map(
                (m, idx) => `<button type="button" class="chip btn-malay-chip" data-idx="${idx}">${m.name} (${m.kcal} kcal)</button>`
              ).join('')}
            </div>
          </div>`
        : ''
    }

    <div class="stack">
      <div class="field">
        <label for="me-name">Dish Name</label>
        <input class="input" id="me-name" value="${esc(draft.name || '')}" placeholder="e.g., Nasi Lemak Sambal Sotong" />
      </div>

      <div class="field">
        <label>Meal Time</label>
        <div class="segmented" id="me-type">
          ${MEAL_TYPES.map((t) => `<button type="button" data-v="${t}" class="${(draft.mealType || mealTypeNow()) === t ? 'active' : ''}">${t}</button>`).join('')}
        </div>
      </div>

      <!-- Pelaras Kuah (Gravy / Sauce Slider) -->
      <div class="card flat kuah-box" style="background:#09090b;border:1px solid rgba(255,255,255,0.1);padding:12px;border-radius:12px">
        <div class="row between" style="margin-bottom:8px">
          <span class="label small bold">Pelaras Kuah (Gravy Adjuster)</span>
          <span class="badge ok" id="kuah-badge" style="font-size:10px">Biasa / Sedang (1.0x)</span>
        </div>
        <div class="segmented kuah-segmented" style="height:36px">
          <button type="button" class="btn-kuah ${kuahLevel === 'kering' ? 'active' : ''}" data-kuah="kering">Kering / Asing (-20%)</button>
          <button type="button" class="btn-kuah ${kuahLevel === 'sedang' ? 'active' : ''}" data-kuah="sedang">Biasa (Normal)</button>
          <button type="button" class="btn-kuah ${kuahLevel === 'banjir' ? 'active' : ''}" data-kuah="banjir">Banjir (+120 kcal)</button>
        </div>
      </div>

      <!-- Portion Slider -->
      <div class="portion-box">
        <div class="row between">
          <span class="label">Portion Multiplier</span>
          <b class="num portion-val" id="me-mult">1.00×</b>
        </div>
        <input type="range" id="me-range" min="0.25" max="2.5" step="0.05" value="1" aria-label="Portion multiplier" />
        <div class="chips" style="justify-content:space-between">
          ${[0.5, 0.75, 1, 1.5, 2].map((v) => `<button type="button" class="chip ${v === 1 ? 'active' : ''}" data-mult="${v}">${v}×</button>`).join('')}
        </div>
      </div>

      <!-- Macros Grid -->
      <div class="grid grid-2">
        <div class="field"><label for="me-kcal">Calories</label><div class="input-suffix"><input class="input num" id="me-kcal" type="number" inputmode="decimal" min="0" /><span>kcal</span></div></div>
        <div class="field"><label for="me-weight">Weight</label><div class="input-suffix"><input class="input num" id="me-weight" type="number" inputmode="decimal" min="0" /><span>g</span></div></div>
        <div class="field"><label for="me-protein">Protein</label><div class="input-suffix"><input class="input num" id="me-protein" type="number" inputmode="decimal" min="0" /><span>g</span></div></div>
        <div class="field"><label for="me-carbs">Carbs</label><div class="input-suffix"><input class="input num" id="me-carbs" type="number" inputmode="decimal" min="0" /><span>g</span></div></div>
        <div class="field"><label for="me-fat">Fat</label><div class="input-suffix"><input class="input num" id="me-fat" type="number" inputmode="decimal" min="0" /><span>g</span></div></div>
        <div class="field" style="justify-content:flex-end"><button type="button" class="btn btn-ghost" id="me-calc" title="Calculate calories from macros">Auto-sum macros</button></div>
      </div>

      <div class="grid grid-2" style="margin-top:6px">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="me-save">${existingId ? 'Save Changes' : 'Log Meal'}</button>
      </div>
    </div>
  `);

  const fields = ['kcal', 'protein', 'carbs', 'fat', 'weight_g'];
  const inputOf = (k) => el.querySelector(`#me-${k === 'weight_g' ? 'weight' : k}`);

  function getKuahModifier() {
    if (kuahLevel === 'kering') return { kcalDelta: -Math.round(base.kcal * 0.15), fatDelta: -4 };
    if (kuahLevel === 'banjir') return { kcalDelta: 120, fatDelta: 9 };
    return { kcalDelta: 0, fatDelta: 0 };
  }

  const paint = () => {
    const { kcalDelta, fatDelta } = getKuahModifier();

    fields.forEach((k) => {
      let v = base[k] * mult;
      if (k === 'kcal') v = Math.max(0, v + kcalDelta);
      if (k === 'fat') v = Math.max(0, v + fatDelta);
      inputOf(k).value = k === 'kcal' || k === 'weight_g' ? int(v) : round1(v);
    });

    el.querySelector('#me-mult').textContent = `${mult.toFixed(2)}×`;
    el.querySelector('#me-range').value = mult;
    el.querySelectorAll('[data-mult]').forEach((c) => c.classList.toggle('active', Number(c.dataset.mult) === mult));

    const kb = el.querySelector('#kuah-badge');
    if (kb) {
      kb.textContent =
        kuahLevel === 'kering'
          ? 'Kuah Asing / Kering (-20%)'
          : kuahLevel === 'banjir'
          ? 'Kuah Banjir (+120 kcal)'
          : 'Biasa / Sedang (1.0x)';
    }
  };
  paint();

  // Malaysian Quick Chips Click
  el.querySelectorAll('.btn-malay-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      const chosen = MALAYSIAN_QUICK_MEALS[idx];
      if (chosen) {
        el.querySelector('#me-name').value = chosen.name;
        base.kcal = chosen.kcal;
        base.protein = chosen.protein;
        base.carbs = chosen.carbs;
        base.fat = chosen.fat;
        base.weight_g = chosen.weight_g;
        mult = 1;
        kuahLevel = 'sedang';
        el.querySelectorAll('.btn-kuah').forEach((b) => b.classList.toggle('active', b.dataset.kuah === 'sedang'));
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
        paint();
      }
    });
  });

  // Pelaras Kuah Buttons
  el.querySelectorAll('.btn-kuah').forEach((btn) => {
    btn.addEventListener('click', () => {
      kuahLevel = btn.dataset.kuah;
      el.querySelectorAll('.btn-kuah').forEach((b) => b.classList.toggle('active', b === btn));
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      paint();
    });
  });

  el.querySelector('#me-range').addEventListener('input', (e) => {
    mult = Number(e.target.value);
    paint();
  });

  el.querySelectorAll('[data-mult]').forEach((c) =>
    c.addEventListener('click', () => {
      mult = Number(c.dataset.mult);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      paint();
    })
  );

  fields.forEach((k) =>
    inputOf(k).addEventListener('input', (e) => {
      base[k] = (Number(e.target.value) || 0) / mult;
    })
  );

  el.querySelector('#me-calc').addEventListener('click', () => {
    base.kcal = base.protein * 4 + base.carbs * 4 + base.fat * 9;
    paint();
  });

  let mealType = draft.mealType || mealTypeNow();
  el.querySelectorAll('#me-type button').forEach((b) =>
    b.addEventListener('click', () => {
      mealType = b.dataset.v;
      el.querySelectorAll('#me-type button').forEach((x) => x.classList.toggle('active', x === b));
    })
  );

  el.querySelector('#me-save').addEventListener('click', () => {
    const name = el.querySelector('#me-name').value.trim() || 'Meal';
    const { kcalDelta, fatDelta } = getKuahModifier();

    const values = {
      name,
      mealType,
      kcal: Math.max(0, int(base.kcal * mult + kcalDelta)),
      protein: round1(base.protein * mult),
      carbs: round1(base.carbs * mult),
      fat: Math.max(0, round1(base.fat * mult + fatDelta)),
      weight_g: int(base.weight_g * mult),
      portion: mult,
      kuah: kuahLevel,
      thumb: draft.thumb,
    };

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 30, 20]);
    }

    if (existingId) {
      store.updateMeal(existingId, values);
      toast(`Updated "${name}"`, 'success');
    } else {
      const m = store.addMeal(values);
      toast(`Logged "${name}" (${values.kcal} kcal)!`, 'success');
      onMealLogged(m);
    }
    close(true);
    onSaved?.(values);
  });
}
