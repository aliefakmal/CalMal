// Quick Edit Modal (Plan §3.1) — Portion adjustment 0.5×–2× or manual entry of calories & macros
import { openSheet, toast } from './ui.js';
import { store } from '../services/store.js';
import { onMealLogged } from '../services/companionService.js';
import { esc, MEAL_TYPES, mealTypeNow, round1, int } from '../utils/helpers.js';

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

  const { el, close } = openSheet(`
    <h3 class="sheet-title">${esc(title || (existingId ? 'Edit Meal' : 'Quick Edit'))}</h3>
    <p class="muted small" style="margin-bottom:18px">Adjust portion sizes or fine-tune AI estimates.</p>

    <div class="stack">
      <div class="field">
        <label for="me-name">Dish Name</label>
        <input class="input" id="me-name" value="${esc(draft.name || '')}" placeholder="e.g., Nasi Lemak Chicken Breast" />
      </div>

      <div class="field">
        <label>Meal Time</label>
        <div class="segmented" id="me-type">
          ${MEAL_TYPES.map((t) => `<button type="button" data-v="${t}" class="${(draft.mealType || mealTypeNow()) === t ? 'active' : ''}">${t}</button>`).join('')}
        </div>
      </div>

      <div class="portion-box">
        <div class="row between">
          <span class="label">Portion Size</span>
          <b class="num portion-val" id="me-mult">1.00×</b>
        </div>
        <input type="range" id="me-range" min="0.25" max="2.5" step="0.05" value="1" aria-label="Portion multiplier" />
        <div class="chips" style="justify-content:space-between">
          ${[0.5, 0.75, 1, 1.5, 2].map((v) => `<button type="button" class="chip ${v === 1 ? 'active' : ''}" data-mult="${v}">${v}×</button>`).join('')}
        </div>
      </div>

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
  const paint = () => {
    fields.forEach((k) => {
      const v = base[k] * mult;
      inputOf(k).value = k === 'kcal' || k === 'weight_g' ? int(v) : round1(v);
    });
    el.querySelector('#me-mult').textContent = `${mult.toFixed(2)}×`;
    el.querySelector('#me-range').value = mult;
    el.querySelectorAll('[data-mult]').forEach((c) => c.classList.toggle('active', Number(c.dataset.mult) === mult));
  };
  paint();

  el.querySelector('#me-range').addEventListener('input', (e) => { mult = Number(e.target.value); paint(); });
  el.querySelectorAll('[data-mult]').forEach((c) => c.addEventListener('click', () => { mult = Number(c.dataset.mult); paint(); }));
  fields.forEach((k) => inputOf(k).addEventListener('input', (e) => { base[k] = (Number(e.target.value) || 0) / mult; }));
  el.querySelector('#me-calc').addEventListener('click', () => {
    base.kcal = (base.protein * 4 + base.carbs * 4 + base.fat * 9);
    paint();
  });

  let mealType = draft.mealType || mealTypeNow();
  el.querySelectorAll('#me-type button').forEach((b) => b.addEventListener('click', () => {
    mealType = b.dataset.v;
    el.querySelectorAll('#me-type button').forEach((x) => x.classList.toggle('active', x === b));
  }));

  el.querySelector('#me-save').addEventListener('click', () => {
    const name = el.querySelector('#me-name').value.trim() || 'Meal';
    const values = {
      name,
      mealType,
      kcal: int(base.kcal * mult),
      protein: round1(base.protein * mult),
      carbs: round1(base.carbs * mult),
      fat: round1(base.fat * mult),
      weight_g: int(base.weight_g * mult),
      portion: mult,
      thumb: draft.thumb,
    };
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
