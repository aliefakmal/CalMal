// Profile Editor Modal Component — Live Biometric & Coach Recalibration
import { store } from '../services/store.js';
import { icons } from './icons.js';
import { openSheet, toast } from './ui.js';
import { calcBMR, calcTDEE, calcDailyTarget, calcMacros, ACTIVITY_LEVELS, GOALS } from '../utils/calc.js';
import { esc } from '../utils/helpers.js';
import { t, getLang } from '../utils/i18n.js';

export function openProfileEditor(onSaved) {
  const current = store.profile || {
    name: 'Hero',
    gender: 'male',
    age: 24,
    height: 172,
    weight: 70,
    targetWeight: 65,
    activity: 1.375,
    goal: 'lose',
    selectedCompanion: 'deku',
  };

  const formState = {
    name: current.name || 'Hero',
    gender: current.gender || 'male',
    age: Number(current.age) || 24,
    height: Number(current.height) || 172,
    weight: Number(current.weight) || 70,
    targetWeight: Number(current.targetWeight) || 65,
    activity: Number(current.activity) || 1.375,
    goal: current.goal || 'lose',
    selectedCompanion: current.selectedCompanion || 'deku',
  };

  function calculatePreview() {
    const bmr = calcBMR(formState);
    const tdee = calcTDEE(formState);
    const targetKcal = calcDailyTarget(formState);
    const macros = calcMacros({ ...formState, customTarget: targetKcal });
    return { bmr, tdee, targetKcal, macros };
  }

  const { bmr, tdee, targetKcal, macros } = calculatePreview();

  const isEn = getLang() === 'en';

  const { el: sheet, close } = openSheet(`
    <div class="sheet-head row between" style="margin-bottom:12px">
      <div>
        <span class="eyebrow">${t('prof_eyebrow')}</span>
        <h3 style="margin:2px 0 0;font-size:20px;font-weight:800">${t('prof_edit_btn')}</h3>
      </div>
      <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="${t('close')}">
        ${icons.close}
      </button>
    </div>

    <form id="profile-edit-form" class="stack" style="gap:14px">
      <!-- Name -->
      <div class="field">
        <label for="pe-name">${isEn ? 'Hero Name / Alias:' : 'Nama / Gelaran Wira:'}</label>
        <input class="input" id="pe-name" value="${esc(formState.name)}" placeholder="Enter your name" required />
      </div>

      <!-- Gender & Coach Duo Row -->
      <div class="grid grid-2" style="gap:10px">
        <div class="field">
          <label>${t('prof_gender')}:</label>
          <div class="segmented" style="height:42px">
            <button type="button" class="btn-gender ${formState.gender === 'male' ? 'active' : ''}" data-g="male">${isEn ? 'Male' : 'Lelaki'}</button>
            <button type="button" class="btn-gender ${formState.gender === 'female' ? 'active' : ''}" data-g="female">${isEn ? 'Female' : 'Perempuan'}</button>
          </div>
        </div>

        <div class="field">
          <label>${t('prof_companion_title')}:</label>
          <div class="segmented" style="height:42px">
            <button type="button" class="btn-coach ${formState.selectedCompanion === 'deku' ? 'active' : ''}" data-c="deku" style="color:var(--deku)">
              <span>Deku</span>
            </button>
            <button type="button" class="btn-coach ${formState.selectedCompanion === 'bakugou' ? 'active' : ''}" data-c="bakugou" style="color:var(--baku)">
              <span>Bakugou</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Age, Height, Weight Grid -->
      <div class="grid grid-3" style="gap:10px">
        <div class="field">
          <label for="pe-age">${t('prof_age')}:</label>
          <input class="input num" id="pe-age" type="number" min="10" max="100" value="${formState.age}" />
        </div>
        <div class="field">
          <label for="pe-height">${t('prof_height')} (cm):</label>
          <input class="input num" id="pe-height" type="number" min="100" max="250" value="${formState.height}" />
        </div>
        <div class="field">
          <label for="pe-weight">${t('prof_weight')} (kg):</label>
          <input class="input num" id="pe-weight" type="number" step="0.1" min="30" max="250" value="${formState.weight}" />
        </div>
      </div>

      <!-- Target Weight -->
      <div class="field">
        <label for="pe-target-w">${t('prof_target_weight')} (kg):</label>
        <div class="input-suffix">
          <input class="input num" id="pe-target-w" type="number" step="0.1" min="30" max="250" value="${formState.targetWeight}" />
          <span>kg</span>
        </div>
      </div>

      <!-- Activity Level -->
      <div class="field">
        <label for="pe-activity">${isEn ? 'Activity Level:' : 'Tahap Aktiviti Fizikal:'}</label>
        <select class="input" id="pe-activity">
          ${ACTIVITY_LEVELS.map(
            (a) => `<option value="${a.value}" ${Math.abs(formState.activity - a.value) < 0.01 ? 'selected' : ''}>${a.label} (${a.value}x)</option>`
          ).join('')}
        </select>
      </div>

      <!-- Fitness Goal -->
      <div class="field">
        <label for="pe-goal">${t('prof_goal')}:</label>
        <select class="input" id="pe-goal">
          ${GOALS.map(
            (g) => `<option value="${g.value}" ${formState.goal === g.value ? 'selected' : ''}>${g.label} (${g.delta >= 0 ? '+' : ''}${g.delta} kcal)</option>`
          ).join('')}
        </select>
      </div>

      <!-- Live Calorie & Macro Recalibration Box -->
      <div class="card flat" style="background:#09090b;border:1px solid rgba(255,255,255,0.12);padding:14px;border-radius:14px">
        <div class="row between" style="margin-bottom:8px">
          <span class="small bold" style="text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)">${isEn ? 'Recalculated Target:' : 'Sasaran Dikalibrasi:'}</span>
          <span class="badge ok" id="preview-target-badge">${targetKcal} kcal/day</span>
        </div>
        <div class="equation" style="grid-template-columns:repeat(4, 1fr);font-size:12px">
          <div class="eq-cell">
            <span>BMR</span>
            <b class="num" id="prev-bmr">${bmr}</b>
          </div>
          <div class="eq-cell">
            <span>TDEE</span>
            <b class="num" id="prev-tdee">${tdee}</b>
          </div>
          <div class="eq-cell">
            <span>${t('dash_protein')}</span>
            <b class="num" id="prev-p">${macros.protein}g</b>
          </div>
          <div class="eq-cell">
            <span>${t('dash_carbs')}/${t('dash_fat')}</span>
            <b class="num" id="prev-cf">${macros.carbs}/${macros.fat}g</b>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-2" style="margin-top:8px">
        <button type="button" class="btn btn-secondary" data-close>${t('cancel')}</button>
        <button type="submit" class="btn btn-primary">
          ${icons.check}
          <span>${t('save')}</span>
        </button>
      </div>
    </form>
  `);

  function updateLivePreview() {
    const preview = calculatePreview();
    const badge = sheet.querySelector('#preview-target-badge');
    const elBmr = sheet.querySelector('#prev-bmr');
    const elTdee = sheet.querySelector('#prev-tdee');
    const elP = sheet.querySelector('#prev-p');
    const elCf = sheet.querySelector('#prev-cf');

    if (badge) badge.textContent = `${preview.targetKcal} kcal/day`;
    if (elBmr) elBmr.textContent = preview.bmr;
    if (elTdee) elTdee.textContent = preview.tdee;
    if (elP) elP.textContent = `${preview.macros.protein}g`;
    if (elCf) elCf.textContent = `${preview.macros.carbs}/${preview.macros.fat}g`;
  }

  function bindEvents() {
    // Gender buttons
    sheet.querySelectorAll('.btn-gender').forEach((btn) => {
      btn.addEventListener('click', () => {
        formState.gender = btn.dataset.g;
        sheet.querySelectorAll('.btn-gender').forEach((b) => b.classList.toggle('active', b === btn));
        updateLivePreview();
      });
    });

    // Coach buttons
    sheet.querySelectorAll('.btn-coach').forEach((btn) => {
      btn.addEventListener('click', () => {
        formState.selectedCompanion = btn.dataset.c;
        sheet.querySelectorAll('.btn-coach').forEach((b) => b.classList.toggle('active', b === btn));
        updateLivePreview();
      });
    });

    // Inputs
    sheet.querySelector('#pe-name')?.addEventListener('input', (e) => {
      formState.name = e.target.value.trim() || 'Hero';
    });

    ['age', 'height', 'weight', 'target-w'].forEach((key) => {
      sheet.querySelector(`#pe-${key}`)?.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        if (key === 'age') formState.age = val;
        else if (key === 'height') formState.height = val;
        else if (key === 'weight') formState.weight = val;
        else if (key === 'target-w') formState.targetWeight = val;
        updateLivePreview();
      });
    });

    sheet.querySelector('#pe-activity')?.addEventListener('change', (e) => {
      formState.activity = Number(e.target.value);
      updateLivePreview();
    });

    sheet.querySelector('#pe-goal')?.addEventListener('change', (e) => {
      formState.goal = e.target.value;
      updateLivePreview();
    });

    // Submit form
    sheet.querySelector('#profile-edit-form')?.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!formState.name) {
        toast('Please enter a display name.', 'error');
        return;
      }
      if (formState.weight < 30 || formState.weight > 250) {
        toast('Please enter a valid weight between 30 and 250 kg.', 'error');
        return;
      }

      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);

      // Save to store
      store.saveProfile(formState);

      toast(`Profile updated for ${formState.name}!`, 'success');
      close();
      onSaved?.(formState);
    });
  }

  bindEvents();
}
