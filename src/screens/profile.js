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
      return `<div class="empty small"><p>Perlukan sekurang-kurangnya 2 rekod berat badan untuk graf.</p></div>`;
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
          <!-- Garis sasaran -->
          ${
            targetY != null
              ? `<line x1="${pad}" y1="${targetY}" x2="${w - pad}" y2="${targetY}" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="4 4" />
                 <text x="${w - pad}" y="${targetY - 4}" fill="var(--ok)" font-size="10" text-anchor="end" font-weight="700">Sasaran: ${targetW}kg</text>`
              : ''
          }
          <!-- Garis lengkung berat -->
          <polyline points="${polylinePts}" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Titik bulatan -->
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
          <span class="eyebrow">Profil Biometrik & Tetapan</span>
          <h1 class="page-title">${esc(profile.name)}</h1>
        </div>
        <div class="row" style="gap:6px">
          ${
            pendingCount > 0
              ? `<span class="badge" title="Data tersimpan lokal dan sedia disegerakkan">${pendingCount} lokal</span>`
              : `<span class="badge ok">Terselaras</span>`
          }
        </div>
      </div>

      <div class="stack">
        <!-- Kad Ringkasan Biometrik Semasa -->
        <div class="card">
          <div class="card-title row between">
            <span>Status Fizikal Semasa</span>
            <span class="badge ok">${bmiCategory} (BMI ${bmi.toFixed(1)})</span>
          </div>

          <div class="equation">
            <div class="eq-cell">
              <span>Berat Semasa</span>
              <b class="num">${profile.weight}<small style="font-size:12px;color:var(--muted)">kg</small></b>
            </div>
            <div class="eq-cell">
              <span>Sasaran</span>
              <b class="num">${profile.targetWeight || '–'}<small style="font-size:12px;color:var(--muted)">kg</small></b>
            </div>
            <div class="eq-cell">
              <span>Sasaran Tenaga</span>
              <b class="num">${targetKcal}<small style="font-size:12px;color:var(--muted)">kcal</small></b>
            </div>
          </div>

          <!-- Graf Kemajuan Berat Badan -->
          <div style="margin-top:16px">
            <div class="row between" style="margin-bottom:4px">
              <span class="small bold muted" style="text-transform:uppercase;letter-spacing:0.06em">Kemajuan Berat Badan</span>
              <span class="xs muted">${weights.length} rekod</span>
            </div>
            ${renderWeightChart(weights, profile.targetWeight)}
          </div>

          <!-- Input Log Berat Harian -->
          <div class="divider"></div>
          <div class="row" style="align-items:flex-end;gap:10px">
            <div class="field" style="flex:1">
              <label for="new-weight-input">Timbang Berat Hari Ini:</label>
              <div class="input-suffix">
                <input class="input num" id="new-weight-input" type="number" step="0.1" value="${profile.weight}" />
                <span>kg</span>
              </div>
            </div>
            <button type="button" class="btn btn-primary" id="btn-log-weight">
              ${icons.scale}
              <span>Catat Berat</span>
            </button>
          </div>
        </div>

        <!-- Kad Koleksi Lencana Bakugou & Deku -->
        <div class="card">
          <div class="card-title row between">
            <span>Koleksi Lencana Hero</span>
            <span class="muted">${Object.keys(store.state.badges).length} / ${Object.keys(BADGES).length} dibuka</span>
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
                    ${unlocked ? `<span class="badge ok" style="font-size:9.5px;height:18px;padding:0 6px">BUKA</span>` : '<span class="badge" style="font-size:9.5px;height:18px;padding:0 6px;opacity:0.6">KUNCI</span>'}
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Kad Info Peta OpenStreetMap -->
        <div class="card stack">
          <div class="card-title row between">
            <span>Peta & Penjejak Laluan</span>
            <span class="badge ok">${icons.pin} OpenStreetMap</span>
          </div>
          <p class="small muted" style="line-height:1.45">
            Peta aktiviti larian dan penjejakan GPS ala Strava menggunakan data <b>OpenStreetMap (OSM)</b>. Tiada kunci API diperlukan — berfungsi terus daripada GPS peranti anda.
          </p>
        </div>

        <!-- Kad Tetapan Model Gemini 3.5 Flash Lite (Pilihan Lanjutan) -->
        <div class="card stack">
          <div class="card-title row between">
            <span>Integrasi Gemini AI</span>
            <span class="badge ok">${GeminiConfig.modelName}</span>
          </div>

          <p class="small muted" style="line-height:1.45">
            Sistem CalMal kini dilengkapi enjin AI pemakanan tempatan sedia ada. Anda juga boleh memasukkan kunci API <b>Gemini 3.5 Flash Lite</b> peribadi anda di bawah jika ingin sambungan terus ke pelayan awan Google Gemini.
          </p>

          <div class="field">
            <label for="api-key-input">Kunci API Gemini (Pilihan):</label>
            <input class="input" id="api-key-input" type="password" value="${esc(settings.apiKey || '')}" placeholder="AIzaSy... (Pilihan)" autocomplete="off" />
          </div>

          <div class="row" style="gap:10px">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-save-key">
              ${icons.check}
              <span>Simpan Kunci</span>
            </button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-test-key">
              ${icons.refresh}
              <span>Uji Sambungan</span>
            </button>
          </div>
        </div>

        <!-- Kad Pilihan Notifikasi & Kompanion Anime -->
        <div class="card stack">
          <div class="card-title">
            <span>Pilihan Kompanion & Notifikasi</span>
          </div>

          <label class="row between" style="padding:8px 0;cursor:pointer">
            <div>
              <b>Kompanion Deku & Bakugou</b>
              <p class="small muted">Animasi komik & tip motivasi bersuara di papan pemuka dan imbasan.</p>
            </div>
            <input type="checkbox" id="companion-toggle" ${settings.companions !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>

          <div class="divider"></div>

          <label class="row between" style="padding:8px 0;cursor:pointer">
            <div>
              <b>Peringatan Pintar Harian</b>
              <p class="small muted">Notifikasi makan (8:00am, 1:00pm, 8:00pm) dan amaran larian 5:30 petang.</p>
            </div>
            <input type="checkbox" id="notif-toggle" ${settings.notifications ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>

          <div class="divider"></div>

          <label class="row between" style="padding:8px 0;cursor:pointer">
            <div>
              <b>Kamera Sentiasa Aktif (Lalai: Hidup)</b>
              <p class="small muted">Memulakan siaran kamera telefon secara automatik serta-merta apabila membuka tab Imbas.</p>
            </div>
            <input type="checkbox" id="camera-always-toggle" ${settings.cameraAlwaysOn !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#fff" />
          </label>
        </div>

        <!-- Kad Pengurusan Data -->
        <div class="card stack">
          <div class="card-title">
            <span>Pengurusan Data</span>
          </div>

          <div class="row wrap" style="gap:10px">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-export-data">
              ${icons.download}
              <span>Eksport Data (JSON)</span>
            </button>
            <button type="button" class="btn btn-danger btn-sm" id="btn-reset-app">
              ${icons.trash}
              <span>Reset Semua Data</span>
            </button>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Catat Berat
    container.querySelector('#btn-log-weight')?.addEventListener('click', () => {
      const val = Number(container.querySelector('#new-weight-input')?.value);
      if (!val || val < 30 || val > 300) {
        toast('Sila masukkan nilai berat yang sah.', 'error');
        return;
      }
      store.logWeight(val);
      toast(`Berat ${val} kg berjaya dicatat!`, 'success');
      onWeightLogged(val);
      render();
    });

    // Simpan Kunci API
    container.querySelector('#btn-save-key')?.addEventListener('click', () => {
      const key = container.querySelector('#api-key-input')?.value.trim();
      store.saveSettings({ apiKey: key });
      toast('Kunci API disimpan!', 'success');
    });

    // Uji Kunci API
    const testBtn = container.querySelector('#btn-test-key');
    testBtn?.addEventListener('click', async () => {
      const key = container.querySelector('#api-key-input')?.value.trim();
      if (!key) {
        toast('Sila masukkan kunci API sebelum menguji.', 'error');
        return;
      }
      store.saveSettings({ apiKey: key });
      setLoading(testBtn, true, 'Menguji...');
      try {
        const ok = await testApiKey();
        if (ok) toast('Kunci API Gemini 3.5 Flash Lite sah & aktif! 🎉', 'success');
        else toast('Ujian gagal. Semak semula kunci anda.', 'error');
      } catch (err) {
        toast(err.message || 'Ralat sambungan API.', 'error');
      } finally {
        setLoading(testBtn, false);
      }
    });

    // Toggle Kompanion
    container.querySelector('#companion-toggle')?.addEventListener('change', (e) => {
      store.saveSettings({ companions: e.target.checked });
      toast(`Kompanion ${e.target.checked ? 'diaktifkan' : 'dimatikan'}.`, 'info');
    });

    // Toggle Notifikasi
    container.querySelector('#notif-toggle')?.addEventListener('change', async (e) => {
      if (e.target.checked) {
        const granted = await requestNotificationPermission();
        if (granted) {
          store.saveSettings({ notifications: true });
          toast('Notifikasi pintar diaktifkan!', 'success');
        } else {
          e.target.checked = false;
          store.saveSettings({ notifications: false });
        }
      } else {
        store.saveSettings({ notifications: false });
        toast('Notifikasi dimatikan.', 'info');
      }
    });

    // Toggle Kamera Sentiasa Aktif
    container.querySelector('#camera-always-toggle')?.addEventListener('change', (e) => {
      store.saveSettings({ cameraAlwaysOn: e.target.checked });
      toast(`Kamera sentiasa aktif: ${e.target.checked ? 'Dihidupkan' : 'Dimatikan'}.`, 'info');
    });

    // Eksport Data JSON
    container.querySelector('#btn-export-data')?.addEventListener('click', () => {
      const json = store.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calmal_backup_${todayKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Data berjaya dieksport!', 'success');
    });

    // Reset Data
    container.querySelector('#btn-reset-app')?.addEventListener('click', async () => {
      const ok = await confirmSheet({
        title: 'Reset Semua Data Aplikasi?',
        message: 'Tindakan ini akan memadam semua profil, rekod makanan, larian dan lencana secara kekal.',
        confirmText: 'Padam Semua',
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
