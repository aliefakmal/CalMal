// User Onboarding Screen (Plan §2.1 & §3.5) — Biometric Profile & Mifflin-St Jeor TDEE Calculator (English)
import { store } from '../services/store.js';
import { calcBMR, calcTDEE, calcDailyTarget, calcMacros, ACTIVITY_LEVELS, GOALS, calcBMI, bmiLabel } from '../utils/calc.js';
import { avatar } from '../components/companion.js';
import { toast } from '../components/ui.js';
import { icons } from '../components/icons.js';

export function renderOnboarding(container, onComplete) {
  let form = {
    name: 'Hero',
    gender: 'male',
    age: 25,
    height: 170,
    weight: 70,
    targetWeight: 65,
    activity: 1.375,
    goal: 'lose',
    apiKey: '',
  };

  function compute() {
    const bmr = calcBMR(form);
    const tdee = calcTDEE(form);
    const target = calcDailyTarget(form);
    const macros = calcMacros(form);
    const bmi = calcBMI(form);
    const bmiText = bmiLabel(bmi);
    return { bmr, tdee, target, macros, bmi, bmiText };
  }

  function render() {
    const stats = compute();

    container.innerHTML = `
      <div class="stack" style="max-width:540px;margin:20px auto 40px">
        <div class="center" style="margin-bottom:8px">
          <img src="/icon.svg" alt="CalMal Logo" style="width:68px;height:68px;margin:0 auto 12px;border-radius:18px;box-shadow:0 8px 30px rgba(255,255,255,0.15)" />
          <h1 class="page-title">Welcome to CalMal</h1>
          <p class="page-sub">AI-powered calorie tracker, Strava-grade GPS running, and anime coaching with Deku & Bakugou.</p>
        </div>

        <div class="card" style="border-left:4px solid var(--deku)">
          <div class="row" style="align-items:flex-start;gap:12px">
            ${avatar('deku', 46)}
            <div style="flex:1">
              <b style="color:var(--deku);font-size:13.5px">Izuku Midoriya</b>
              <p class="small" style="color:#e5e5ea;margin-top:2px;line-height:1.45">
                "Let's build your biometric profile first! We need your height, weight, and activity level to calculate your exact metabolic BMR & TDEE, along with balanced portion recommendations!"
              </p>
            </div>
          </div>
        </div>

        <form id="onboard-form" class="card stack">
          <div class="card-title"><span>Personal Info</span><span class="muted">Biometrics</span></div>

          <div class="field">
            <label for="ob-name">Your Name / Nickname</label>
            <input class="input" id="ob-name" type="text" value="${form.name}" placeholder="e.g. Alex" required />
          </div>

          <div class="field">
            <label>Gender</label>
            <div class="segmented" id="ob-gender">
              <button type="button" data-v="male" class="${form.gender === 'male' ? 'active' : ''}">Male</button>
              <button type="button" data-v="female" class="${form.gender === 'female' ? 'active' : ''}">Female</button>
            </div>
          </div>

          <div class="grid grid-3">
            <div class="field">
              <label for="ob-age">Age</label>
              <div class="input-suffix"><input class="input num" id="ob-age" type="number" min="12" max="100" value="${form.age}" /><span>yrs</span></div>
            </div>
            <div class="field">
              <label for="ob-height">Height</label>
              <div class="input-suffix"><input class="input num" id="ob-height" type="number" min="100" max="230" value="${form.height}" /><span>cm</span></div>
            </div>
            <div class="field">
              <label for="ob-weight">Current Weight</label>
              <div class="input-suffix"><input class="input num" id="ob-weight" type="number" step="0.5" min="30" max="250" value="${form.weight}" /><span>kg</span></div>
            </div>
          </div>

          <div class="field">
            <label for="ob-targetWeight">Target Weight Goal</label>
            <div class="input-suffix"><input class="input num" id="ob-targetWeight" type="number" step="0.5" min="30" max="250" value="${form.targetWeight}" /><span>kg</span></div>
          </div>

          <div class="field">
            <label for="ob-activity">Daily Activity Level</label>
            <select class="select" id="ob-activity">
              ${ACTIVITY_LEVELS.map((a) => `<option value="${a.value}" ${form.activity === a.value ? 'selected' : ''}>${a.label} — ${a.desc}</option>`).join('')}
            </select>
          </div>

          <div class="field">
            <label for="ob-goal">Fitness & Dietary Goal</label>
            <select class="select" id="ob-goal">
              ${GOALS.map((g) => `<option value="${g.value}" ${form.goal === g.value ? 'selected' : ''}>${g.label} (${g.desc})</option>`).join('')}
            </select>
          </div>

          <div class="divider"></div>

          <div class="card flat" style="background:#0d0d0e;border:1px solid var(--border)">
            <div class="card-title" style="margin-bottom:8px">
              <span>Metabolic Calculation</span>
              <span class="badge ok">BMI ${stats.bmi.toFixed(1)} · ${stats.bmiText}</span>
            </div>
            <div class="equation" style="margin-top:4px">
              <div class="eq-cell">
                <span class="small muted">BMR</span>
                <b class="num">${stats.bmr}</b>
                <span class="xs muted">kcal/day</span>
              </div>
              <div class="eq-cell">
                <span class="small muted">TDEE</span>
                <b class="num">${stats.tdee}</b>
                <span class="xs muted">kcal/day</span>
              </div>
              <div class="eq-cell" style="border-color:var(--text)">
                <span class="small" style="color:#fff">Target Goal</span>
                <b class="num" style="color:#fff">${stats.target}</b>
                <span class="xs muted">kcal/day</span>
              </div>
            </div>

            <div style="margin-top:12px;font-size:12.5px;color:var(--muted);display:flex;justify-content:space-between">
              <span>Protein: <b style="color:#fff">${stats.macros.protein}g</b> (${stats.macros.proteinRange[0]}–${stats.macros.proteinRange[1]}g)</span>
              <span>Carbs: <b style="color:#fff">${stats.macros.carbs}g</b></span>
              <span>Fat: <b style="color:#fff">${stats.macros.fat}g</b></span>
            </div>
          </div>

          <div class="field" style="margin-top:4px">
            <label for="ob-api" class="row between">
              <span>Gemini API Key (Optional)</span>
              <span class="xs muted">Cascade: Gemini 3.5 → 3.1 → Gemma 4</span>
            </label>
            <input class="input" id="ob-api" type="password" value="${form.apiKey}" placeholder="AIzaSy... (Can be configured later in Profile)" autocomplete="off" />
            <span class="xs muted">Keys are stored securely on your local device only.</span>
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-block" style="margin-top:10px">
            <span>Get Started with CalMal</span>
            ${icons.chevronRight}
          </button>
        </form>

        <div class="card" style="border-left:4px solid var(--baku)">
          <div class="row" style="align-items:flex-start;gap:12px">
            ${avatar('bakugou', 46)}
            <div style="flex:1">
              <b style="color:var(--baku);font-size:13.5px">Katsuki Bakugou</b>
              <p class="small" style="color:#e5e5ea;margin-top:2px;line-height:1.45">
                "HEY! Don’t you dare slack off! Once this profile is set, log every single thing you eat and don’t you dare skip your afternoon run!"
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const formEl = container.querySelector('#onboard-form');
    if (!formEl) return;

    const syncForm = () => {
      form.name = container.querySelector('#ob-name').value.trim() || 'Hero';
      form.age = Number(container.querySelector('#ob-age').value) || 25;
      form.height = Number(container.querySelector('#ob-height').value) || 170;
      form.weight = Number(container.querySelector('#ob-weight').value) || 70;
      form.targetWeight = Number(container.querySelector('#ob-targetWeight').value) || 65;
      form.activity = Number(container.querySelector('#ob-activity').value) || 1.375;
      form.goal = container.querySelector('#ob-goal').value || 'lose';
      form.apiKey = container.querySelector('#ob-api').value.trim();
    };

    container.querySelectorAll('#ob-gender button').forEach((b) => {
      b.addEventListener('click', () => {
        form.gender = b.dataset.v;
        syncForm();
        render();
      });
    });

    ['#ob-age', '#ob-height', '#ob-weight', '#ob-targetWeight', '#ob-activity', '#ob-goal'].forEach((sel) => {
      container.querySelector(sel)?.addEventListener('change', () => {
        syncForm();
        render();
      });
    });

    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      syncForm();
      if (!form.weight || !form.height || !form.age) {
        toast('Please fill in your biometric information.', 'error');
        return;
      }

      store.saveProfile({
        name: form.name,
        gender: form.gender,
        age: form.age,
        height: form.height,
        weight: form.weight,
        targetWeight: form.targetWeight,
        activity: form.activity,
        goal: form.goal,
      });

      if (form.apiKey) {
        store.saveSettings({ apiKey: form.apiKey });
      }

      toast('CalMal profile created! Welcome aboard!', 'success');
      onComplete?.();
    });
  }

  render();
}
