import { store } from '../services/store.js';
import { icons } from '../components/icons.js';
import { BADGES, onWeightLogged, requestNotificationPermission } from '../services/companionService.js';
import { GeminiConfig } from '../config/gemini.js';
import { testApiKey } from '../services/gemini.js';
import { toast, confirmSheet, setLoading } from '../components/ui.js';
import { calcBMI, bmiLabel, calcDailyTarget, calc7DayMovingAverage } from '../utils/calc.js';
import { avatar } from '../components/companion.js';
import { openProfileEditor } from '../components/profileEditor.js';
import { soundboard } from '../services/audioService.js';
import { esc, fmtDate, todayKey } from '../utils/helpers.js';
import { t, getLang } from '../utils/i18n.js';


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

    // 7-Day Moving Average to smooth out daily water weight fluctuations
    const maList = calc7DayMovingAverage(list);
    const maPts = maList.map((m, idx) => ({ x: getX(idx), y: getY(m.avg), avg: m.avg }));
    const maPolylinePts = maPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

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
          <!-- 7-Day Moving Average trend (amber dashed) -->
          ${
            maPts.length >= 2
              ? `<polyline points="${maPolylinePts}" fill="none" stroke="#f6ad55" stroke-width="2" stroke-dasharray="4 3" opacity="0.9" />`
              : ''
          }
          <!-- Weight trend curve (solid white) -->
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
        <div class="row between xs muted" style="margin-top:6px;padding:0 4px">
          <div class="row" style="gap:12px;align-items:center">
            <span class="row" style="gap:4px;align-items:center"><span style="width:10px;height:2.5px;background:#fff;display:inline-block;border-radius:2px"></span> Daily Weight</span>
            <span class="row" style="gap:4px;align-items:center"><span style="width:10px;height:2px;background:#f6ad55;display:inline-block;border-radius:2px"></span> 7-Day Trend (Smoothed)</span>
          </div>
          ${targetW ? `<span style="color:var(--ok)">Target: ${targetW}kg</span>` : ''}
        </div>
      </div>
    `;
  }

  function render() {
    profile = store.profile || profile;
    const bmi = calcBMI(profile);
    const bmiCategory = bmiLabel(bmi);
    const targetKcal = calcDailyTarget(profile);
    const pendingCount = store.pendingCount();
    const heroRank = store.getHeroRank();
    const activeCoach = profile.selectedCompanion || 'deku';

    const isEn = getLang() === 'en';

    container.innerHTML = `
      <div class="page-head row between" style="align-items:center">
        <div>
          <span class="eyebrow">${t('prof_eyebrow')}</span>
          <h1 class="page-title">${esc(profile.name)}</h1>
        </div>
        <button type="button" class="btn btn-sm btn-primary" id="btn-edit-profile-head">
          ${icons.edit}
          <span>${t('prof_edit_btn')}</span>
        </button>
      </div>

      <div class="stack">
        <!-- 1. Current Biometrics Summary Card (TOP PRIORITY STATS) -->
        <div class="card stack">
          <div class="card-title row between" style="align-items:center">
            <span class="row" style="gap:6px;align-items:center">
              <span>${icons.scale}</span>
              <span>${t('prof_stats_title')}</span>
            </span>
            <div class="row" style="gap:6px;align-items:center">
              <span class="badge ${profile.goal === 'lose' ? 'primary' : 'ok'}">${t('prof_goal_' + (profile.goal || 'lose'))}</span>
              <span class="badge ok">${bmiCategory} (BMI ${bmi.toFixed(1)})</span>
              <button type="button" class="btn btn-xs btn-ghost" id="btn-edit-profile-card" title="${t('edit')}">
                ${icons.edit}
                <span>${t('edit')}</span>
              </button>
            </div>
          </div>

          <!-- Key Metrics Equation -->
          <div class="equation">
            <div class="eq-cell">
              <span>${t('prof_weight')}</span>
              <b class="num">${profile.weight}<small style="font-size:12px;color:var(--muted)">kg</small></b>
            </div>
            <div class="eq-cell">
              <span>${t('prof_target_weight')}</span>
              <b class="num">${profile.targetWeight || '–'}<small style="font-size:12px;color:var(--muted)">kg</small></b>
            </div>
            <div class="eq-cell">
              <span>${t('dash_target')}</span>
              <b class="num">${targetKcal}<small style="font-size:12px;color:var(--muted)">kcal</small></b>
            </div>
          </div>

          <!-- Weight Progress Chart -->
          <div style="margin-top:12px">
            <div class="row between" style="margin-bottom:4px">
              <span class="small bold muted" style="text-transform:uppercase;letter-spacing:0.06em">${isEn ? 'Weight Progress' : 'Kemajuan Berat Badan'}</span>
              <span class="xs muted">${weights.length} ${isEn ? 'records' : 'rekod'}</span>
            </div>
            ${renderWeightChart(weights, profile.targetWeight)}
          </div>

          <!-- Daily Weight Log Input -->
          <div class="divider"></div>
          <div class="row" style="align-items:flex-end;gap:10px">
            <div class="field" style="flex:1">
              <label for="new-weight-input">${isEn ? "Log Today's Weight:" : 'Rekod Berat Hari Ini:'}</label>
              <div class="input-suffix">
                <input class="input num" id="new-weight-input" type="number" step="0.1" value="${profile.weight}" />
                <span>kg</span>
              </div>
            </div>
            <button type="button" class="btn btn-primary" id="btn-log-weight">
              ${icons.scale}
              <span>${t('save')}</span>
            </button>
          </div>
        </div>

        <!-- 2. Hero Rank & License Status Card -->
        <div class="card" style="border:1px solid var(--hero-glow);background:linear-gradient(135deg, rgba(18,18,21,0.95), rgba(28,28,30,0.85))">
          <div class="card-title row between">
            <div class="row" style="gap:10px;align-items:center">
              ${avatar(activeCoach, 40)}
              <div>
                <b style="font-size:15px;color:#fff">${esc(heroRank.title)}</b>
                <div class="xs muted">Coach: ${activeCoach === 'bakugou' ? 'Bakugou (Fitness)' : 'Deku (Nutrition)'}</div>
              </div>
            </div>
            <span class="badge ok">Level ${heroRank.level} / 5</span>
          </div>

          <div style="margin:12px 0 6px">
            <div class="row between" style="margin-bottom:6px">
              <span class="small bold muted" style="text-transform:uppercase;letter-spacing:0.05em">${isEn ? 'Hero EXP Progress' : 'Kemajuan EXP Wira'}</span>
              <span class="small num" style="color:var(--hero-accent)">${heroRank.currentExp} / ${heroRank.nextLevelExp} EXP (${heroRank.pct}%)</span>
            </div>
            <div class="macro-track" style="height:10px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden">
              <div class="macro-fill" style="width:${heroRank.pct}%;background:var(--hero-accent);transition:width 0.4s var(--ease)"></div>
            </div>
            <div class="xs muted" style="margin-top:8px;line-height:1.4">
              ${isEn ? 'Earn EXP by logging meals (+10 EXP), hitting protein targets (+20 EXP), and running (+25 EXP).' : 'Dapatkan EXP dengan merekod hidangan (+10 EXP), mencapai sasaran protein (+20 EXP), dan berlari (+25 EXP).'}
            </div>
          </div>
        </div>

        <!-- 3. Hero Badges Card -->
        <div class="card">
          <div class="card-title row between">
            <span>${isEn ? 'Hero Badge Collection' : 'Koleksi Lencana Wira'}</span>
            <span class="muted">${Object.keys(store.state.badges).length} / ${Object.keys(BADGES).length} ${isEn ? 'unlocked' : 'dibuka'}</span>
          </div>

          <div class="badge-grid">
            ${Object.entries(BADGES)
              .map(([id, b]) => {
                const unlocked = store.hasBadge(id);
                const badgeIcon = icons[b.iconKey] || (b.who === 'bakugou' ? icons.flame : icons.bolt);
                return `
                  <div class="badge-card ${unlocked ? 'unlocked' : 'locked'}" style="${unlocked ? `border-color:${b.color}55;box-shadow:0 0 14px ${b.color}20` : ''}">
                    <div class="badge-icon" style="${unlocked ? `background:${b.color};color:#000` : `color:${b.color};background:rgba(255,255,255,0.05)`}">
                      ${badgeIcon}
                    </div>
                    <div class="badge-title">${esc(b.title)}</div>
                    <div class="badge-desc">${esc(b.desc)}</div>
                    ${unlocked ? `<span class="badge ok" style="font-size:9.5px;height:18px;padding:0 6px;background:${b.color}25;color:${b.color};border-color:${b.color}66">${isEn ? 'UNLOCKED' : 'DIBUKA'}</span>` : `<span class="badge" style="font-size:9.5px;height:18px;padding:0 6px;opacity:0.6">${isEn ? 'LOCKED' : 'DIKUNCI'}</span>`}
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- 4. App Preferences & System Settings Card -->
        <div class="card stack">
          <div class="card-title row between" style="align-items:center">
            <span>${t('prof_settings_title')}</span>
            <span class="xs muted">CalMal System</span>
          </div>

          <!-- Japanese Voice & Sound Effects -->
          <label class="row between" style="padding:6px 0;cursor:pointer">
            <div>
              <b style="color:#fff">${t('prof_voice_effects')}</b>
              <p class="xs muted" style="margin:2px 0 0">${isEn ? 'Web Audio Japanese voice cues and hero sound effects.' : 'Kesan audio suara bahasa Jepun dan nada wira.'}</p>
            </div>
            <input type="checkbox" id="sound-toggle" ${settings.soundEnabled !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>

          <div class="divider"></div>

          <!-- Companions Dialogues -->
          <label class="row between" style="padding:6px 0;cursor:pointer">
            <div>
              <b style="color:#fff">${isEn ? 'Deku & Bakugou Companions' : 'Teman Deku & Bakugou'}</b>
              <p class="xs muted" style="margin:2px 0 0">${isEn ? 'Manga dialogue & motivational cues on dashboard and scanner.' : 'Dialog manga & kata semangat di papan pemuka dan pengimbas.'}</p>
            </div>
            <input type="checkbox" id="companion-toggle" ${settings.companions !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>

          <div class="divider"></div>

          <!-- Daily Smart Reminders -->
          <label class="row between" style="padding:6px 0;cursor:pointer">
            <div>
              <b style="color:#fff">${isEn ? 'Daily Smart Reminders' : 'Peringatan Harian Pintar'}</b>
              <p class="xs muted" style="margin:2px 0 0">${isEn ? 'Meal reminders (8 AM, 1 PM, 8 PM) and workout alerts (5:30 PM).' : 'Peringatan waktu makan dan aktiviti riadah.'}</p>
            </div>
            <input type="checkbox" id="notif-toggle" ${settings.notifications ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>

          <div class="divider"></div>

          <!-- Fasting Mode -->
          <label class="row between" style="padding:6px 0;cursor:pointer">
            <div>
              <b style="color:#fff">${isEn ? 'Fasting Mode / Puasa (Ramadan & Intermittent)' : 'Mod Puasa (Ramadan & Berselang)'}</b>
              <p class="xs muted" style="margin:2px 0 0">${isEn ? 'Reschedules hydration & meal alerts for Sahur & Iftar.' : 'Menyesuaikan peringatan makan & air untuk Sahur & Iftar.'}</p>
            </div>
            <input type="checkbox" id="fasting-toggle" ${settings.fastingMode ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>

          <div class="divider"></div>

          <!-- Continuous Live Camera -->
          <label class="row between" style="padding:6px 0;cursor:pointer">
            <div>
              <b style="color:#fff">${isEn ? 'Continuous Live Camera (Default: On)' : 'Kamera Langsung Automatik'}</b>
              <p class="xs muted" style="margin:2px 0 0">${isEn ? 'Starts camera feed immediately upon opening Scan tab.' : 'Buka kamera secara automatik apabila ke tab Imbas.'}</p>
            </div>
            <input type="checkbox" id="camera-always-toggle" ${settings.cameraAlwaysOn !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>
        </div>

        <!-- 5. Gemini Multi-Model Cascade Card -->
        <div class="card stack">
          <div class="card-title row between">
            <span>${isEn ? 'AI Engine & Fallback Cascade' : 'Enjin AI & Tindanan Alternatif'}</span>
            <span class="badge ok">Gemini 3.5 → 3.1 → Gemma 4</span>
          </div>

          <p class="small muted" style="line-height:1.45">
            ${isEn
              ? 'CalMal features an intelligent multi-tier AI cascading engine: <b>Gemini 3.5 Flash Lite</b> (primary) → <b>Gemini 3.1 Flash Lite</b> (fallback 1) → <b>Gemma 4 31B</b> (fallback 2) → <b>Smart Asian Dietary Engine</b> (offline fallback). An API key is completely optional — you can provide your Google Gemini API key below to unlock personal cloud quota.'
              : 'CalMal dilengkapi enjin AI bertindih pintar: <b>Gemini 3.5 Flash Lite</b> (utama) → <b>Gemini 3.1 Flash Lite</b> → <b>Gemma 4 31B</b> → <b>Enjin Pemakanan Tempatan</b> (luar talian). Kunci API adalah pilihan sahaja.'}
          </p>

          <div class="field">
            <label for="api-key-input">${t('prof_api_key')}:</label>
            <input class="input" id="api-key-input" type="password" value="${esc(settings.apiKey || '')}" placeholder="AIzaSy... (Optional)" autocomplete="off" />
          </div>

          <div class="row" style="gap:10px">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-save-key">
              ${icons.check}
              <span>${t('save')}</span>
            </button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-test-key">
              ${icons.refresh}
              <span>${isEn ? 'Test Connection' : 'Uji Sambungan'}</span>
            </button>
          </div>
        </div>

        <!-- 6. Data Management Card -->
        <div class="card stack">
          <div class="card-title row between" style="align-items:center">
            <span>${isEn ? 'Data Management' : 'Pengurusan Data'}</span>
            <span class="xs muted">Local-First Storage</span>
          </div>

          <div class="row wrap" style="gap:10px">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-export-data">
              ${icons.download}
              <span>${isEn ? 'Export Data (JSON)' : 'Eksport Data (JSON)'}</span>
            </button>
            <button type="button" class="btn btn-danger btn-sm" id="btn-reset-app">
              ${icons.trash}
              <span>${isEn ? 'Reset All Data' : 'Set Semula Semua Data'}</span>
            </button>
          </div>
        </div>

        <!-- 7. Sources & Attributions Card (BOTTOM) -->
        <div class="card stack">
          <div class="card-title row between">
            <span>${isEn ? 'Sources & Attributions' : 'Sumber & Rujukan'}</span>
            <span class="badge ok">${isEn ? 'Verified' : 'Disahkan'}</span>
          </div>
          <div class="stack" style="gap:10px;font-size:13px">
            <div class="row between" style="padding:6px 0;border-bottom:1px solid var(--border-soft)">
              <div>
                <b style="color:#fff">OpenStreetMap (OSM)</b>
                <div class="xs muted">Live GPS cartography & Strava-style routes</div>
              </div>
              <span class="xs muted">ODbL Contributor</span>
            </div>
            <div class="row between" style="padding:6px 0;border-bottom:1px solid var(--border-soft)">
              <div>
                <b style="color:#fff">Google Gemini & Gemma AI</b>
                <div class="xs muted">Multimodal nutritional vision cascade</div>
              </div>
              <span class="xs muted">Google Cloud</span>
            </div>
            <div class="row between" style="padding:6px 0;border-bottom:1px solid var(--border-soft)">
              <div>
                <b style="color:#fff">Open Food Facts</b>
                <div class="xs muted">Global barcode & packaged food database</div>
              </div>
              <span class="xs muted">Open Database</span>
            </div>
            <div class="row between" style="padding:6px 0;border-bottom:1px solid var(--border-soft)">
              <div>
                <b style="color:#fff">WHO & MOH Malaysia</b>
                <div class="xs muted">Asian BMI classifications & Mifflin-St Jeor BMR</div>
              </div>
              <span class="xs muted">Public Health</span>
            </div>
            <div class="row between" style="padding:6px 0">
              <div>
                <b style="color:#fff">Compendium of Physical Activities</b>
                <div class="xs muted">Velocity-adjusted MET metabolic expenditure</div>
              </div>
              <span class="xs muted">Ainsworth et al.</span>
            </div>
          </div>
          <div class="xs muted center" style="margin-top:6px;padding-top:8px;border-top:1px solid var(--border-soft)">
            CalMal v2.5 · Local-first privacy · Data stored securely on your device
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Edit Profile Modal Trigger
    const triggerEditProfile = () => {
      openProfileEditor((updatedProfile) => {
        profile = updatedProfile || store.profile;
        render();
      });
    };
    container.querySelector('#btn-edit-profile-head')?.addEventListener('click', triggerEditProfile);
    container.querySelector('#btn-edit-profile-card')?.addEventListener('click', triggerEditProfile);

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

    // Toggle Sound SFX & Voice
    container.querySelector('#sound-toggle')?.addEventListener('change', (e) => {
      store.saveSettings({ soundEnabled: e.target.checked });
      soundboard.setMute(!e.target.checked);
      toast(`Hero SFX & Voice: ${e.target.checked ? 'Enabled' : 'Muted'}.`, 'info');
      if (e.target.checked) soundboard.play(profile.selectedCompanion || 'deku', 'greet');
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

    // Toggle Fasting / Puasa Mode
    container.querySelector('#fasting-toggle')?.addEventListener('change', (e) => {
      store.saveSettings({ fastingMode: e.target.checked });
      toast(e.target.checked ? 'Fasting mode activated! Reminders adjusted for Sahur & Iftar.' : 'Fasting mode disabled.', 'info');
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
