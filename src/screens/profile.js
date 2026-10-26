// Skrin Profil & Kemajuan Berat Badan (pelan §2 & §4) — Graf Berat, Lencana & Tetapan API Gemini
import { store } from '../services/store.js';
import { icons } from '../components/icons.js';
import { BADGES, onWeightLogged, requestNotificationPermission } from '../services/companionService.js';
import { GeminiConfig } from '../config/gemini.js';
import { testApiKey } from '../services/gemini.js';
import { toast, confirmSheet, setLoading } from '../components/ui.js';
import { calcBMI, bmiLabel, calcDailyTarget } from '../utils/calc.js';
import { avatar } from '../components/companion.js';
import { esc, fmtDate, todayKey } from '../utils/helpers.js';

export function renderProfile(container) {
  let profile = store.profile || {
    name: 'Wira',
    gender: 'male',
    age: 25,
    height: 170,
    weight: 70,
    targetWeight: 65,
    activity: 1.375,
    goal: 'lose',
  };

  const weights = store.state.weights || [];
  const settings = store.settings || {};

  function renderWeightChart(list, targetW) {
    if (list.length < 2) {
      return `<div class="empty small"><p>Need at least 2 weight records to render chart.</p></div>`;
    }

    const w = 480;
    const h = 130;
    const pad = 24;

    const vals = list.map((x) => Number(x.weight));
    if (targetW) vals.push(Number(targetW));
    const minW = Math.floor(Math.min(...vals) - 1);
    const maxW = Math.ceil(Math.max(...vals) + 1);

    const getX = (idx) => pad + (idx / (list.length - 1)) * (w - pad * 2);
    const getY = (val) => h - pad - ((val - minW) / (maxW - minW || 1)) * (h - pad * 2);

    const pts = list.map((item, idx) => ({ x: getX(idx), y: getY(Number(item.weight)), val: Number(item.weight), date: item.date }));
    const polylinePts = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const targetY = targetW ? getY(Number(targetW)) : null;

    return `
      <div class="weight-chart-wrap">
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <!-- Target guideline -->
          ${
            targetY != null
              ? `<line x1="${pad}" y1="${targetY}" x2="${w - pad}" y2="${targetY}" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="4 4" />
                 <text x="${w - pad}" y="${targetY - 4}" fill="var(--ok)" font-size="10" text-anchor="end" font-weight="700">Target: ${targetW}kg</text>`
              : ''
          }
          <!-- Weight trend curve -->
          <polyline points="${polylinePts}" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Points -->
          ${pts
            .map(
              (p) => `
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="#ffffff" stroke="#000000" stroke-width="2" />
            <text x="${p.x}" y="${p.y - 8}" fill="#8e8e93" font-size="10" text-anchor="middle" font-weight="600">${p.val}kg</text>
          `
            )
            .join('')}
        </svg>
      </div>
    `;
  }

  function render() {
    const bmi = calcBMI(profile);
    const bmiCategory = bmiLabel(bmi);
    const targetKcal = calcDailyTarget(profile);
    const pendingCount = store.pendingCount();

    container.innerHTML = `
      <div class="page-head">
        <div>
          <span class="eyebrow">Biometric Profile & Settings</span>
          <h1 class="page-title">${esc(profile.name)}</h1>
        </div>
        <div class="row" style="gap:6px">
          ${
            pendingCount > 0
              ? `<span class="badge" title="Data stored locally and ready to sync">${pendingCount} local</span>`
              : `<span class="badge ok">Synced</span>`
          }
        </div>
      </div>

      <div class="stack">
        <!-- Current Biometrics Summary Card -->
        <div class="card">
          <div class="card-title row between">
            <span>Current Physical Status</span>
            <span class="badge ok">${bmiCategory} (BMI ${bmi.toFixed(1)})</span>
          </div>

          <div class="equation">
            <div class="eq-cell">
              <span>Current Weight</span>
              <b class="num">${profile.weight}<small style="font-size:12px;color:var(--muted)">kg</small></b>
            </div>
            <div class="eq-cell">
              <span>Target Weight</span>
              <b class="num">${profile.targetWeight || '–'}<small style="font-size:12px;color:var(--muted)">kg</small></b>
            </div>
            <div class="eq-cell">
              <span>Calorie Target</span>
              <b class="num">${targetKcal}<small style="font-size:12px;color:var(--muted)">kcal</small></b>
            </div>
          </div>

          <!-- Weight Progress Chart -->
          <div style="margin-top:16px">
            <div class="row between" style="margin-bottom:4px">
              <span class="small bold muted" style="text-transform:uppercase;letter-spacing:0.06em">Weight Progress</span>
              <span class="xs muted">${weights.length} records</span>
            </div>
            ${renderWeightChart(weights, profile.targetWeight)}
          </div>

          <!-- Daily Weight Log Input -->
          <div class="divider"></div>
          <div class="row" style="align-items:flex-end;gap:10px">
            <div class="field" style="flex:1">
              <label for="new-weight-input">Log Today's Weight:</label>
              <div class="input-suffix">
                <input class="input num" id="new-weight-input" type="number" step="0.1" value="${profile.weight}" />
                <span>kg</span>
              </div>
            </div>
            <button type="button" class="btn btn-primary" id="btn-log-weight">
              ${icons.scale}
              <span>Record Weight</span>
            </button>
          </div>
        </div>

        <!-- Hero Badges Card -->
        <div class="card">
          <div class="card-title row between">
            <span>Hero Badge Collection</span>
            <span class="muted">${Object.keys(store.state.badges).length} / ${Object.keys(BADGES).length} unlocked</span>
          </div>

          <div class="badge-grid">
            ${Object.entries(BADGES)
              .map(([id, b]) => {
                const unlocked = store.hasBadge(id);
                return `
                  <div class="badge-card ${unlocked ? 'unlocked' : 'locked'}">
                    <div class="badge-icon">
                      ${b.who === 'bakugou' ? icons.flame : icons.bolt}
                    </div>
                    <div class="badge-title">${esc(b.title)}</div>
                    <div class="badge-desc">${esc(b.desc)}</div>
                    ${unlocked ? `<span class="badge ok" style="font-size:9.5px;height:18px;padding:0 6px">UNLOCKED</span>` : '<span class="badge" style="font-size:9.5px;height:18px;padding:0 6px;opacity:0.6">LOCKED</span>'}
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- OpenStreetMap Info Card -->
        <div class="card stack">
          <div class="card-title row between">
            <span>Map & Route Tracker</span>
            <span class="badge ok">${icons.pin} OpenStreetMap</span>
          </div>
          <p class="small muted" style="line-height:1.45">
            Live run tracking and Strava-style GPS maps use <b>OpenStreetMap (OSM)</b>. No API key required — works straight from your device GPS.
          </p>
        </div>

        <!-- Gemini Multi-Model Cascade Card -->
        <div class="card stack">
          <div class="card-title row between">
            <span>AI Engine & Fallback Cascade</span>
            <span class="badge ok">Gemini 3.5 → 3.1 → Gemma 4</span>
          </div>

          <p class="small muted" style="line-height:1.45">
            CalMal features an intelligent multi-tier AI cascading engine: <b>Gemini 3.5 Flash Lite</b> (primary) → <b>Gemini 3.1 Flash Lite</b> (fallback 1) → <b>Gemma 4 31B</b> (fallback 2) → <b>Smart Asian Dietary Engine</b> (offline fallback). An API key is completely optional — you can provide your Google Gemini API key below to unlock cloud capabilities.
          </p>

          <div class="field">
            <label for="api-key-input">Gemini API Key (Optional):</label>
            <input class="input" id="api-key-input" type="password" value="${esc(settings.apiKey || '')}" placeholder="AIzaSy... (Optional)" autocomplete="off" />
          </div>

          <div class="row" style="gap:10px">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-save-key">
              ${icons.check}
              <span>Save Key</span>
            </button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-test-key">
              ${icons.refresh}
              <span>Test Connection</span>
            </button>
          </div>
        </div>

        <!-- Companion & Notification Settings Card -->
        <div class="card stack">
          <div class="card-title">
            <span>Companion & Notification Settings</span>
          </div>

          <label class="row between" style="padding:8px 0;cursor:pointer">
            <div>
              <b>Deku & Bakugou Companions</b>
              <p class="small muted">Manga dialogue & motivational voice bubble cues on dashboard and scanner.</p>
            </div>
            <input type="checkbox" id="companion-toggle" ${settings.companions !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>

          <div class="divider"></div>

          <label class="row between" style="padding:8px 0;cursor:pointer">
            <div>
              <b>Daily Smart Reminders</b>
              <p class="small muted">Meal reminders (8:00 AM, 1:00 PM, 8:00 PM) and evening run alerts (5:30 PM).</p>
            </div>
            <input type="checkbox" id="notif-toggle" ${settings.notifications ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>

          <div class="divider"></div>

          <label class="row between" style="padding:8px 0;cursor:pointer">
            <div>
              <b>Continuous Live Camera (Default: On)</b>
              <p class="small muted">Automatically starts camera feed immediately upon navigating to the Scan tab.</p>
            </div>
            <input type="checkbox" id="camera-always-toggle" ${settings.cameraAlwaysOn !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>
        </div>

        <!-- Data Management Card -->
        <div class="card stack">
          <div class="card-title">
            <span>Data Management</span>
          </div>

          <div class="row wrap" style="gap:10px">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-export-data">
              ${icons.download}
              <span>Export Data (JSON)</span>
            </button>
            <button type="button" class="btn btn-danger btn-sm" id="btn-reset-app">
              ${icons.trash}
              <span>Reset All Data</span>
            </button>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Record Weight
    container.querySelector('#btn-log-weight')?.addEventListener('click', () => {
      const val = Number(container.querySelector('#new-weight-input')?.value);
      if (!val || val < 30 || val > 300) {
        toast('Please enter a valid weight value.', 'error');
        return;
      }
      store.logWeight(val);
      toast(`Weight ${val} kg recorded!`, 'success');
      onWeightLogged(val);
      render();
    });

    // Save API Key
    container.querySelector('#btn-save-key')?.addEventListener('click', () => {
      const key = container.querySelector('#api-key-input')?.value.trim();
      store.saveSettings({ apiKey: key });
      toast('API key saved!', 'success');
    });

    // Test API Key
    const testBtn = container.querySelector('#btn-test-key');
    testBtn?.addEventListener('click', async () => {
      const key = container.querySelector('#api-key-input')?.value.trim();
      if (!key) {
        toast('Please enter an API key before testing.', 'error');
        return;
      }
      store.saveSettings({ apiKey: key });
      setLoading(testBtn, true, 'Testing...');
      try {
        const ok = await testApiKey();
        if (ok) toast('Gemini AI connection verified & active! 🎉', 'success');
        else toast('Connection failed. Check your API key.', 'error');
      } catch (err) {
        toast(err.message || 'API connection error.', 'error');
      } finally {
        setLoading(testBtn, false);
      }
    });

    // Toggle Companions
    container.querySelector('#companion-toggle')?.addEventListener('change', (e) => {
      store.saveSettings({ companions: e.target.checked });
      toast(`Companions ${e.target.checked ? 'enabled' : 'disabled'}.`, 'info');
    });

    // Toggle Notifications
    container.querySelector('#notif-toggle')?.addEventListener('change', async (e) => {
      if (e.target.checked) {
        const granted = await requestNotificationPermission();
        if (granted) {
          store.saveSettings({ notifications: true });
          toast('Smart notifications enabled!', 'success');
        } else {
          e.target.checked = false;
          store.saveSettings({ notifications: false });
        }
      } else {
        store.saveSettings({ notifications: false });
        toast('Notifications disabled.', 'info');
      }
    });

    // Toggle Continuous Live Camera
    container.querySelector('#camera-always-toggle')?.addEventListener('change', (e) => {
      store.saveSettings({ cameraAlwaysOn: e.target.checked });
      toast(`Continuous live camera: ${e.target.checked ? 'Enabled' : 'Disabled'}.`, 'info');
    });

    // Export Data JSON
    container.querySelector('#btn-export-data')?.addEventListener('click', () => {
      const json = store.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calmal_backup_${todayKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Data exported successfully!', 'success');
    });

    // Reset Data
    container.querySelector('#btn-reset-app')?.addEventListener('click', async () => {
      const ok = await confirmSheet({
        title: 'Reset All Application Data?',
        message: 'This will permanently delete your profile, meal logs, runs, and badges.',
        confirmText: 'Delete All',
        danger: true,
      });
      if (ok) {
        store.reset();
        localStorage.clear();
        location.reload();
      }
    });
  }

  render();
}
