// Quick Edit Modal Component — Portion Adjuster, Malaysian Modifiers (Kuah, Nasi, Manis) & Quick Search
import { openSheet, toast } from './ui.js';
import { store } from '../services/store.js';
import { onMealLogged } from '../services/companionService.js';
import { esc, MEAL_TYPES, mealTypeNow, round1, int } from '../utils/helpers.js';
import { MALAYSIAN_FOODS, searchMalaysianFoods } from '../constants/malaysianFoods.js';

export function openMealEditor(draft = {}, { existingId = null, title, onSaved } = {}) {
  const base = {
    kcal: Number(draft.kcal) || 0,
    protein: Number(draft.protein) || 0,
    carbs: Number(draft.carbs) || 0,
    fat: Number(draft.fat) || 0,
    weight_g: Number(draft.weight_g) || 0,
  };
  let mult = Number(draft.portion) && existingId ? 1 : 1;
  let kuahMod = draft.kuah || 'biasa'; // 'asing' (-80 kcal) | 'biasa' (0) | 'banjir' (+120 kcal)
  let nasiMod = draft.nasi || 'biasa'; // 'separuh' (-100 kcal) | 'biasa' (0) | 'tambah' (+150 kcal)
  let manisMod = draft.manis || 'biasa'; // 'kosong' (-45 kcal) | 'kurang' (-25 kcal) | 'biasa' (0) | 'kaw' (+60 kcal)

  const quickSamples = MALAYSIAN_FOODS.slice(0, 8);

  const { el, close } = openSheet(`
    <h3 class="sheet-title">${esc(title || (existingId ? 'Edit Meal' : 'Quick Meal Entry'))}</h3>
    <p class="muted small" style="margin-bottom:12px">Fine-tune portions, Malaysian gravy, rice & sweetness modifiers.</p>

    <!-- Malaysian Quick-Tap Favorites (if creating or blank) -->
    ${
      !existingId && !draft.name
        ? `<div class="quick-chips-box" style="margin-bottom:12px">
            <span class="label xs bold muted" style="text-transform:uppercase;letter-spacing:0.05em">Malaysian Favorites 1-Tap:</span>
            <div class="chips" style="margin-top:6px;gap:6px;max-height:85px;overflow-y:auto">
              ${quickSamples.map(
                (m, idx) => `<button type="button" class="chip btn-malay-chip" data-idx="${idx}">${m.name} (${m.kcal} kcal)</button>`
              ).join('')}
            </div>
          </div>`
        : ''
    }

    <div class="stack" style="gap:12px">
      <div class="field">
        <label for="me-name">Dish Name (Offline Search Available)</label>
        <input class="input" id="me-name" list="malaysian-foods-list" value="${esc(draft.name || '')}" placeholder="Search e.g., Nasi Lemak, Roti Canai, Teh Tarik..." autocomplete="off" />
        <datalist id="malaysian-foods-list">
          ${MALAYSIAN_FOODS.map((f) => `<option value="${f.name}">${f.kcal} kcal · P:${f.protein}g C:${f.carbs}g F:${f.fat}g</option>`).join('')}
        </datalist>
      </div>

      <div class="field">
        <label>Meal Time</label>
        <div class="segmented" id="me-type">
          ${MEAL_TYPES.map((t) => `<button type="button" data-v="${t}" class="${(draft.mealType || mealTypeNow()) === t ? 'active' : ''}">${t}</button>`).join('')}
        </div>
      </div>

      <!-- Malaysian Modifiers Card (Clean, Minimalist & Responsive) -->
      <div class="mod-card">
        <div class="row between" style="align-items:center">
          <span style="font-size:13px;font-weight:800;color:#fff;display:flex;align-items:center;gap:6px">
            🇲🇾 Malaysian Modifiers
          </span>
          <span class="xs muted">Auto-calibrated</span>
        </div>

        <!-- Minimalist How-To-Use Guide -->
        <div class="mod-guide-box" id="mod-guide-box">
          <div class="mod-guide-header" id="btn-toggle-mod-guide" role="button" tabindex="0">
            <span style="font-size:11.5px;font-weight:700;color:#fff;display:flex;align-items:center;gap:5px">
              <span>💡</span> <span>Cara Guna / How to Use</span>
            </span>
            <span class="xs muted" id="guide-toggle-icon" style="font-size:10px">Tutup ▲</span>
          </div>
          <div class="mod-guide-content" id="mod-guide-body">
            <div style="font-size:11px;color:#d1d1d6;line-height:1.45;margin-bottom:6px">
              Sentuh pilihan di bawah untuk melaraskan kalori secara automatik mengikut gaya hidangan Malaysia:
            </div>
            <div class="grid grid-3" style="gap:5px">
              <div style="background:rgba(255,255,255,0.03);padding:5px 6px;border-radius:6px">
                <b style="color:#fff;font-size:10.5px;display:block">🍲 Kuah</b>
                <span style="font-size:9.5px;color:var(--muted)">Asing (-80 kcal) vs Banjir (+120 kcal)</span>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:5px 6px;border-radius:6px">
                <b style="color:#fff;font-size:10.5px;display:block">🍚 Nasi</b>
                <span style="font-size:9.5px;color:var(--muted)">Separuh (-100 kcal) vs Tambah (+150 kcal)</span>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:5px 6px;border-radius:6px">
                <b style="color:#fff;font-size:10.5px;display:block">🥤 Minuman</b>
                <span style="font-size:9.5px;color:var(--muted)">Kosong (-45) / Kurang (-25) / Kaw (+60)</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Kuah Modifier Row -->
        <div class="mod-row">
          <div class="mod-header">
            <span>Pelaras Kuah (Gravy)</span>
            <span class="mod-badge" id="kuah-label">${kuahMod === 'asing' ? '-80 kcal' : kuahMod === 'banjir' ? '+120 kcal' : 'Normal'}</span>
          </div>
          <div class="mod-track">
            <button type="button" class="mod-btn btn-mod-kuah ${kuahMod === 'asing' ? 'active' : ''}" data-v="asing">
              <span>Asing</span>
              <small>-80 kcal</small>
            </button>
            <button type="button" class="mod-btn btn-mod-kuah ${kuahMod === 'biasa' ? 'active' : ''}" data-v="biasa">
              <span>Biasa</span>
              <small>0 kcal</small>
            </button>
            <button type="button" class="mod-btn btn-mod-kuah ${kuahMod === 'banjir' ? 'active' : ''}" data-v="banjir">
              <span>Banjir</span>
              <small>+120 kcal</small>
            </button>
          </div>
        </div>

        <!-- Nasi Modifier Row -->
        <div class="mod-row">
          <div class="mod-header">
            <span>Sukatan Nasi (Rice Portion)</span>
            <span class="mod-badge" id="nasi-label">${nasiMod === 'separuh' ? '-100 kcal' : nasiMod === 'tambah' ? '+150 kcal' : 'Normal'}</span>
          </div>
          <div class="mod-track">
            <button type="button" class="mod-btn btn-mod-nasi ${nasiMod === 'separuh' ? 'active' : ''}" data-v="separuh">
              <span>Separuh</span>
              <small>-100 kcal</small>
            </button>
            <button type="button" class="mod-btn btn-mod-nasi ${nasiMod === 'biasa' ? 'active' : ''}" data-v="biasa">
              <span>Biasa</span>
              <small>0 kcal</small>
            </button>
            <button type="button" class="mod-btn btn-mod-nasi ${nasiMod === 'tambah' ? 'active' : ''}" data-v="tambah">
              <span>Tambah</span>
              <small>+150 kcal</small>
            </button>
          </div>
        </div>

        <!-- Minuman / Manis Modifier Row -->
        <div class="mod-row">
          <div class="mod-header">
            <span>Tahap Manis / Susu (Drinks)</span>
            <span class="mod-badge" id="manis-label">${manisMod === 'kosong' ? '-45 kcal' : manisMod === 'kurang' ? '-25 kcal' : manisMod === 'kaw' ? '+60 kcal' : 'Normal'}</span>
          </div>
          <div class="mod-track">
            <button type="button" class="mod-btn btn-mod-manis ${manisMod === 'kosong' ? 'active' : ''}" data-v="kosong">
              <span>Kosong</span>
              <small>-45 kcal</small>
            </button>
            <button type="button" class="mod-btn btn-mod-manis ${manisMod === 'kurang' ? 'active' : ''}" data-v="kurang">
              <span>Kurang</span>
              <small>-25 kcal</small>
            </button>
            <button type="button" class="mod-btn btn-mod-manis ${manisMod === 'biasa' ? 'active' : ''}" data-v="biasa">
              <span>Biasa</span>
              <small>0 kcal</small>
            </button>
            <button type="button" class="mod-btn btn-mod-manis ${manisMod === 'kaw' ? 'active' : ''}" data-v="kaw">
              <span>Kaw</span>
              <small>+60 kcal</small>
            </button>
          </div>
        </div>
      </div>

      <!-- Portion Multiplier Slider Card -->
      <div class="portion-box">
        <div class="row between">
          <span class="label">Overall Portion Multiplier</span>
          <b class="num portion-val" id="me-mult">1.00×</b>
        </div>
        <input type="range" id="me-range" min="0.25" max="2.5" step="0.05" value="1" aria-label="Portion multiplier" />
        <div class="chips" style="justify-content:space-between">
          ${[0.5, 0.75, 1, 1.5, 2].map((v) => `<button type="button" class="chip ${v === 1 ? 'active' : ''}" data-mult="${v}">${v}×</button>`).join('')}
        </div>
      </div>

      <!-- Nutrition Breakdown Section -->
      <div class="stack" style="gap:8px">
        <div class="row between" style="align-items:center">
          <span class="label bold small" style="margin:0">Nutrition Breakdown</span>
          <button type="button" class="btn btn-ghost btn-xs" id="me-calc" title="Auto calculate calories from macros" style="font-size:11.5px;padding:3px 8px;gap:4px">
            ✨ <span>Auto-sum macros</span>
          </button>
        </div>

        <div class="grid grid-2" style="gap:10px">
          <div class="field"><label for="me-kcal">Calories</label><div class="input-suffix"><input class="input num" id="me-kcal" type="number" inputmode="decimal" min="0" /><span>kcal</span></div></div>
          <div class="field"><label for="me-weight">Serving Weight</label><div class="input-suffix"><input class="input num" id="me-weight" type="number" inputmode="decimal" min="0" /><span>g</span></div></div>
        </div>

        <div class="grid grid-3" style="gap:8px">
          <div class="field"><label for="me-protein">Protein</label><div class="input-suffix"><input class="input num" id="me-protein" type="number" inputmode="decimal" min="0" /><span>g</span></div></div>
          <div class="field"><label for="me-carbs">Carbs</label><div class="input-suffix"><input class="input num" id="me-carbs" type="number" inputmode="decimal" min="0" /><span>g</span></div></div>
          <div class="field"><label for="me-fat">Fat</label><div class="input-suffix"><input class="input num" id="me-fat" type="number" inputmode="decimal" min="0" /><span>g</span></div></div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:6px;gap:10px">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="me-save">${existingId ? 'Save Changes' : 'Log Meal'}</button>
      </div>
    </div>
  `);

  const fields = ['kcal', 'protein', 'carbs', 'fat', 'weight_g'];
  const inputOf = (k) => el.querySelector(`#me-${k === 'weight_g' ? 'weight' : k}`);

  function getModifiersDelta() {
    let kDelta = 0;
    let cDelta = 0;
    let fDelta = 0;

    // Kuah
    if (kuahMod === 'asing') { kDelta -= 80; fDelta -= 5; }
    else if (kuahMod === 'banjir') { kDelta += 120; fDelta += 8; }

    // Nasi
    if (nasiMod === 'separuh') { kDelta -= 100; cDelta -= 22; }
    else if (nasiMod === 'tambah') { kDelta += 150; cDelta += 33; }

    // Manis
    if (manisMod === 'kosong') { kDelta -= 45; cDelta -= 11; }
    else if (manisMod === 'kurang') { kDelta -= 25; cDelta -= 6; }
    else if (manisMod === 'kaw') { kDelta += 60; cDelta += 12; fDelta += 2; }

    return { kDelta, cDelta, fDelta };
  }

  const paint = () => {
    const { kDelta, cDelta, fDelta } = getModifiersDelta();

    fields.forEach((k) => {
      let v = base[k] * mult;
      if (k === 'kcal') v = Math.max(0, v + kDelta);
      if (k === 'carbs') v = Math.max(0, v + cDelta);
      if (k === 'fat') v = Math.max(0, v + fDelta);
      inputOf(k).value = k === 'kcal' || k === 'weight_g' ? int(v) : round1(v);
    });

    el.querySelector('#me-mult').textContent = `${mult.toFixed(2)}×`;
    el.querySelector('#me-range').value = mult;
    el.querySelectorAll('[data-mult]').forEach((c) => c.classList.toggle('active', Number(c.dataset.mult) === mult));

    // Update labels with visual status indicators
    const kl = el.querySelector('#kuah-label');
    if (kl) {
      kl.textContent = kuahMod === 'asing' ? '-80 kcal' : kuahMod === 'banjir' ? '+120 kcal' : 'Normal';
      kl.className = `mod-badge ${kuahMod === 'asing' ? 'neg' : kuahMod === 'banjir' ? 'pos' : ''}`;
    }
    const nl = el.querySelector('#nasi-label');
    if (nl) {
      nl.textContent = nasiMod === 'separuh' ? '-100 kcal' : nasiMod === 'tambah' ? '+150 kcal' : 'Normal';
      nl.className = `mod-badge ${nasiMod === 'separuh' ? 'neg' : nasiMod === 'tambah' ? 'pos' : ''}`;
    }
    const ml = el.querySelector('#manis-label');
    if (ml) {
      ml.textContent = manisMod === 'kosong' ? '-45 kcal' : manisMod === 'kurang' ? '-25 kcal' : manisMod === 'kaw' ? '+60 kcal' : 'Normal';
      ml.className = `mod-badge ${manisMod === 'kosong' || manisMod === 'kurang' ? 'neg' : manisMod === 'kaw' ? 'pos' : ''}`;
    }
  };
  paint();

  // Toggle How-To-Use guide
  const guideToggle = el.querySelector('#btn-toggle-mod-guide');
  const guideBody = el.querySelector('#mod-guide-body');
  const guideIcon = el.querySelector('#guide-toggle-icon');
  if (guideToggle && guideBody) {
    guideToggle.addEventListener('click', () => {
      const isHidden = guideBody.classList.toggle('hidden');
      if (guideIcon) guideIcon.textContent = isHidden ? 'Buka ▼' : 'Tutup ▲';
    });
  }

  // Autocomplete change listener on name input
  el.querySelector('#me-name')?.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    const matched = MALAYSIAN_FOODS.find((f) => f.name.toLowerCase() === val);
    if (matched) {
      base.kcal = matched.kcal;
      base.protein = matched.protein;
      base.carbs = matched.carbs;
      base.fat = matched.fat;
      base.weight_g = matched.weight_g;
      mult = 1;
      kuahMod = 'biasa';
      nasiMod = 'biasa';
      manisMod = 'biasa';
      el.querySelectorAll('.btn-mod-kuah, .btn-mod-nasi, .btn-mod-manis').forEach((b) =>
        b.classList.toggle('active', b.dataset.v === 'biasa')
      );
      paint();
    }
  });

  // Malaysian Quick Chips Click
  el.querySelectorAll('.btn-malay-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      const chosen = quickSamples[idx];
      if (chosen) {
        el.querySelector('#me-name').value = chosen.name;
        base.kcal = chosen.kcal;
        base.protein = chosen.protein;
        base.carbs = chosen.carbs;
        base.fat = chosen.fat;
        base.weight_g = chosen.weight_g;
        mult = 1;
        kuahMod = 'biasa';
        nasiMod = 'biasa';
        manisMod = 'biasa';
        el.querySelectorAll('.btn-mod-kuah, .btn-mod-nasi, .btn-mod-manis').forEach((b) =>
          b.classList.toggle('active', b.dataset.v === 'biasa')
        );
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
        paint();
      }
    });
  });

  // Kuah Modifiers Click
  el.querySelectorAll('.btn-mod-kuah').forEach((btn) => {
    btn.addEventListener('click', () => {
      kuahMod = btn.dataset.v;
      el.querySelectorAll('.btn-mod-kuah').forEach((b) => b.classList.toggle('active', b === btn));
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      paint();
    });
  });

  // Nasi Modifiers Click
  el.querySelectorAll('.btn-mod-nasi').forEach((btn) => {
    btn.addEventListener('click', () => {
      nasiMod = btn.dataset.v;
      el.querySelectorAll('.btn-mod-nasi').forEach((b) => b.classList.toggle('active', b === btn));
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      paint();
    });
  });

  // Manis Modifiers Click
  el.querySelectorAll('.btn-mod-manis').forEach((btn) => {
    btn.addEventListener('click', () => {
      manisMod = btn.dataset.v;
      el.querySelectorAll('.btn-mod-manis').forEach((b) => b.classList.toggle('active', b === btn));
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
    const name = el.querySelector('#me-name').value.trim() || 'Dish';
    const kcal = int(inputOf('kcal').value);
    const weight_g = int(inputOf('weight').value);
    const protein = round1(inputOf('protein').value);
    const carbs = round1(inputOf('carbs').value);
    const fat = round1(inputOf('fat').value);

    const mealData = {
      name,
      mealType,
      kcal,
      weight_g,
      protein,
      carbs,
      fat,
      portion: mult,
      kuah: kuahMod,
      nasi: nasiMod,
      manis: manisMod,
      thumb: draft.thumb,
    };

    if (existingId) {
      store.updateMeal(existingId, mealData);
      toast('Meal updated successfully!', 'success');
    } else {
      store.addMeal(mealData);
      toast(`Logged: ${name} (${kcal} kcal)`, 'success');
      onMealLogged(mealData);
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([15, 30]);
    close();
    onSaved?.();
  });
}
