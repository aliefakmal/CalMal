// Profile Editor Modal Component — Live Biometric & Coach Recalibration
import { store } from '../services/store.js';
import { icons } from './icons.js';
import { toast } from './ui.js';
import { calcBMR, calcTDEE, calcDailyTarget, calcMacros, ACTIVITY_LEVELS, GOALS } from '../utils/calc.js';
import { esc } from '../utils/helpers.js';

export function openProfileEditor(onSaved) {
  const root = document.getElementById('overlay-root') || document.body;
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

  const wrap = document.createElement('div');
  wrap.className = 'sheet-backdrop';

  function calculatePreview() {
    const bmr = calcBMR(formState);
    const tdee = calcTDEE(formState);
    const targetKcal = calcDailyTarget(formState);
    const macros = calcMacros({ ...formState, customTarget: targetKcal });
    return { bmr, tdee, targetKcal, macros };
  }

  function renderHTML() {
    const { bmr, tdee, targetKcal, macros } = calculatePreview();

    return `
      <div class="sheet" style="max-height:90vh;overflow-y:auto;padding-bottom:28px">
        <div class="sheet-head row between">
          <div>
            <span class="eyebrow">Personal Biometrics</span>
            <h3 style="margin:2px 0 0;font-size:20px;font-weight:800">Edit Profile & Goals</h3>
          </div>
          <button type="button" class="btn btn-icon btn-ghost btn-sm close-btn" aria-label="Close">
            ${icons.close}
          </button>
        </div>

        <form id="profile-edit-form" class="stack" style="gap:16px;margin-top:14px">
          <!-- Name -->
          <div class="field">
            <label for="pe-name">Hero Alias / Name:</label>
            <input class="input" id="pe-name" value="${esc(formState.name)}" placeholder="Enter your name" required />
          </div>

          <!-- Gender & Coach Duo Row -->
          <div class="grid grid-2" style="gap:10px">
            <div class="field">
              <label>Biological Gender:</label>
              <div class="segmented" style="height:42px">
                <button type="button" class="btn-gender ${formState.gender === 'male' ? 'active' : ''}" data-g="male">Male</button>
                <button type="button" class="btn-gender ${formState.gender === 'female' ? 'active' : ''}" data-g="female">Female</button>
              </div>
            </div>

            <div class="field">
              <label>Hero Coach:</label>
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
              <label for="pe-age">Age:</label>
              <input class="input num" id="pe-age" type="number" min="10" max="100" value="${formState.age}" />
            </div>
            <div class="field">
              <label for="pe-height">Height (cm):</label>
              <input class="input num" id="pe-height" type="number" min="100" max="250" value="${formState.height}" />
            </div>
            <div class="field">
              <label for="pe-weight">Weight (kg):</label>
              <input class="input num" id="pe-weight" type="number" step="0.1" min="30" max="250" value="${formState.weight}" />
            </div>
          </div>

          <!-- Target Weight -->
          <div class="field">
            <label for="pe-target-w">Target Goal Weight (kg):</label>
            <div class="input-suffix">
              <input class="input num" id="pe-target-w" type="number" step="0.1" min="30" max="250" value="${formState.targetWeight}" />
              <span>kg</span>
            </div>
          </div>

          <!-- Activity Level -->
          <div class="field">
            <label for="pe-activity">Activity Level:</label>
            <select class="input" id="pe-activity">
              ${ACTIVITY_LEVELS.map(
                (a) => `<option value="${a.multiplier}" ${Math.abs(formState.activity - a.multiplier) < 0.01 ? 'selected' : ''}>${a.label} (${a.multiplier}x)</option>`
              ).join('')}
            </select>
          </div>

          <!-- Fitness Goal -->
          <div class="field">
            <label for="pe-goal">Primary Fitness Goal:</label>
            <select class="input" id="pe-goal">
              ${GOALS.map(
                (g) => `<option value="${g.id}" ${formState.goal === g.id ? 'selected' : ''}>${g.label} (${g.delta >= 0 ? '+' : ''}${g.delta} kcal)</option>`
              ).join('')}
            </select>
          </div>

          <!-- Live Calorie & Macro Recalibration Box -->
          <div class="card flat" style="background:#09090b;border:1px solid rgba(255,255,255,0.12);padding:14px;border-radius:14px">
            <div class="row between" style="margin-bottom:8px">
              <span class="small bold" style="text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)">Recalculated Target:</span>
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
                <span>Protein</span>
                <b class="num" id="prev-p">${macros.protein}g</b>
              </div>
              <div class="eq-cell">
                <span>Carbs/Fat</span>
                <b class="num" id="prev-cf">${macros.carbs}/${macros.fat}g</b>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-2" style="margin-top:8px">
            <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">
              ${icons.check}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    `;
  }

  function updateLivePreview() {
    const { bmr, tdee, targetKcal, macros } = calculatePreview();
    const badge = wrap.querySelector('#preview-target-badge');
    const elBmr = wrap.querySelector('#prev-bmr');
    const elTdee = wrap.querySelector('#prev-tdee');
    const elP = wrap.querySelector('#prev-p');
    const elCf = wrap.querySelector('#prev-cf');

    if (badge) badge.textContent = `${targetKcal} kcal/day`;
    if (elBmr) elBmr.textContent = bmr;
    if (elTdee) elTdee.textContent = tdee;
    if (elP) elP.textContent = `${macros.protein}g`;
    if (elCf) elCf.textContent = `${macros.carbs}/${macros.fat}g`;
  }

  function close() {
    wrap.classList.add('out');
    setTimeout(() => wrap.remove(), 250);
  }

  function bindEvents() {
    wrap.querySelector('.close-btn')?.addEventListener('click', close);
    wrap.querySelector('.cancel-btn')?.addEventListener('click', close);

    // Gender buttons
    wrap.querySelectorAll('.btn-gender').forEach((btn) => {
      btn.addEventListener('click', () => {
        formState.gender = btn.dataset.g;
        wrap.querySelectorAll('.btn-gender').forEach((b) => b.classList.toggle('active', b === btn));
        updateLivePreview();
      });
    });

    // Coach buttons
    wrap.querySelectorAll('.btn-coach').forEach((btn) => {
      btn.addEventListener('click', () => {
        formState.selectedCompanion = btn.dataset.c;
        wrap.querySelectorAll('.btn-coach').forEach((b) => b.classList.toggle('active', b === btn));
        updateLivePreview();
      });
    });

    // Inputs
    wrap.querySelector('#pe-name')?.addEventListener('input', (e) => {
      formState.name = e.target.value.trim() || 'Hero';
    });

    ['age', 'height', 'weight', 'target-w'].forEach((key) => {
      wrap.querySelector(`#pe-${key}`)?.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        if (key === 'age') formState.age = val;
        else if (key === 'height') formState.height = val;
        else if (key === 'weight') formState.weight = val;
        else if (key === 'target-w') formState.targetWeight = val;
        updateLivePreview();
      });
    });

    wrap.querySelector('#pe-activity')?.addEventListener('change', (e) => {
      formState.activity = Number(e.target.value);
      updateLivePreview();
    });

    wrap.querySelector('#pe-goal')?.addEventListener('change', (e) => {
      formState.goal = e.target.value;
      updateLivePreview();
    });

    // Submit form
    wrap.querySelector('#profile-edit-form')?.addEventListener('submit', (e) => {
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
      if (navigator.vibrate) navigator.vibrate(20);

      // Save to store
      store.saveProfile(formState);

      toast(`Profile updated for ${formState.name}!`, 'success');
      close();
      onSaved?.();
    });
  }

  wrap.innerHTML = renderHTML();
  root.appendChild(wrap);
  bindEvents();
}
