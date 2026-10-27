import { BrowserMultiFormatReader } from '@zxing/browser';
import { icons } from '../components/icons.js';
import { toast, statusBadge, openSheet } from '../components/ui.js';
import { analyzeFood, readNutritionLabel, findLocalDish } from '../services/gemini.js';
import { lookupBarcode, scaleNutrients } from '../services/openFoodFacts.js';
import { compressImage, esc, round1, int } from '../utils/helpers.js';
import { companionBubble } from '../components/companion.js';
import { openMealEditor } from '../components/mealEditor.js';
import { onScanModeUsed, onMealLogged } from '../services/companionService.js';
import { store } from '../services/store.js';
import { t, getLang } from '../utils/i18n.js';

export function renderScanner(container) {
  let mode = 'food'; // 'food' | 'barcode' | 'ocr'
  let stream = null;
  let zxingReader = null;
  let capturedImage = null; // { dataUrl, base64, mime, thumb }
  let isAnalyzing = false;
  let analysisResult = null;
  let selectedChips = new Set();
  let customContextNote = '';
  let analysisInterval = null;

  let cameraState = 'starting'; // 'starting' | 'active' | 'denied' | 'error'
  let cameraErrorMessage = '';
  let facingMode = store.settings?.cameraFacing || 'environment'; // 'environment' | 'user'

  const QUICK_CHIPS_EN = [
    'Vanilla Oolong',
    'Milk tea / Boba',
    'Less sweet',
    'Teh Tarik',
    'Milo Ais',
    'Kopi O',
    'Half rice',
    'Less oil',
    'Chicken breast',
    'Extra veggies',
  ];

  const QUICK_CHIPS_MS = [
    'Vanilla Oolong',
    'Milk tea / Boba',
    'Kurang manis',
    'Teh Tarik',
    'Milo Ais',
    'Kopi O',
    'Nasi separuh',
    'Kurang minyak',
    'Ayam dada',
    'Sayur lebih',
  ];

  function render() {
    onScanModeUsed(mode);
    const isEn = getLang() === 'en';
    const currentChips = isEn ? QUICK_CHIPS_EN : QUICK_CHIPS_MS;

    container.innerHTML = `
      <div class="page-head">
        <div>
          <span class="eyebrow">${t('scan_eyebrow')}</span>
          <h1 class="page-title">${t('scan_title')}</h1>
        </div>
        <div class="row" style="gap:6px;flex-wrap:wrap">
          <label for="file-input-native" class="btn btn-sm btn-secondary" id="btn-iphone-snap" style="cursor:pointer;margin:0" title="Direct iPhone / Smartphone Camera">
            📱 ${isEn ? 'iPhone Camera' : 'Kamera Telefon'}
          </label>
          <button type="button" class="btn btn-sm btn-ghost" id="btn-voice-log" title="${isEn ? 'Log food using speech' : 'Rakam makanan guna suara'}">
            ${icons.sound} <span>${isEn ? 'Voice Note' : 'Nota Suara'}</span>
          </button>
          <button type="button" class="btn btn-icon btn-ghost btn-sm" id="btn-iphone-help" title="${isEn ? 'Camera setup guide' : 'Panduan kamera'}">
            ?
          </button>
        </div>
      </div>

      <!-- Scanner Mode Segmented Tabs -->
      <div class="segmented" id="scanner-mode-tabs" style="margin-bottom:16px">
        <button type="button" data-m="food" class="${mode === 'food' ? 'active' : ''}">
          ${icons.camera}
          <span>${t('scan_tab_food')}</span>
        </button>
        <button type="button" data-m="barcode" class="${mode === 'barcode' ? 'active' : ''}">
          ${icons.barcode}
          <span>${t('scan_tab_barcode')}</span>
        </button>
        <button type="button" data-m="ocr" class="${mode === 'ocr' ? 'active' : ''}">
          ${icons.label}
          <span>${t('scan_tab_label')}</span>
        </button>
      </div>

      <!-- Camera Viewport / Preview Box -->
      <div class="card flat" style="padding:14px;background:#0d0d0e;margin-bottom:14px">
        <div class="scanner-viewport" id="viewport-box">
          <video id="scanner-video" class="scanner-video" autoplay playsinline webkit-playsinline muted></video>
          <img id="scanner-preview-img" class="preview-thumb hidden" alt="Image preview" style="cursor:pointer" title="Tekan untuk kembali ke kamera langsung" />
          <div id="shutter-flash" style="position:absolute;inset:0;background:#ffffff;opacity:0;pointer-events:none;z-index:25;transition:opacity 0.14s ease-out"></div>

          <!-- Floating Retake / Live Camera Button -->
          <button type="button" class="btn btn-sm btn-secondary hidden" id="btn-retake-live" style="position:absolute;top:10px;right:10px;z-index:24;background:rgba(20,20,22,0.9);backdrop-filter:blur(8px);font-size:11.5px;padding:5px 11px;border:1px solid rgba(255,255,255,0.25);cursor:pointer;gap:5px">
            ${icons.refresh}
            <span>${isEn ? 'Live Camera' : 'Kamera Langsung'}</span>
          </button>

          <!-- Continuous Live Camera Status HUD -->
          <div id="camera-status-hud" class="hidden" style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:center;z-index:16;pointer-events:none">
            <span class="badge ok" style="font-size:11px;padding:4px 9px;background:rgba(28,28,30,0.85);backdrop-filter:blur(8px);border:1px solid rgba(61,220,151,0.3);pointer-events:auto">
              <span class="dot" style="background:var(--ok);width:6px;height:6px"></span>
              Camera Live
            </span>
            <span id="camera-facing-badge" class="badge" style="font-size:11px;padding:4px 9px;background:rgba(28,28,30,0.85);backdrop-filter:blur(8px);pointer-events:auto">
              ${facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
            </span>
          </div>

          <!-- Viewfinder Overlay -->
          <div id="camera-viewfinder" class="scanner-overlay hidden">
            <div id="viewfinder-shape" class="${mode === 'food' ? 'viewfinder-box' : mode === 'barcode' ? 'viewfinder-barcode' : 'viewfinder-label'}">
              ${mode === 'barcode' ? '<div class="viewfinder-laser"></div>' : ''}
            </div>
          </div>

          <!-- Mobile Camera Permission / Error Fallback Overlay -->
          <div id="camera-perm-overlay" class="camera-permission-overlay hidden" style="position:absolute;inset:0;background:rgba(13,13,14,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px;text-align:center;z-index:22">
            <div style="width:52px;height:52px;border-radius:16px;background:var(--surface-3);display:grid;place-items:center;color:#fff;margin-bottom:12px">
              ${icons.camera}
            </div>
            <b style="font-size:16px;color:#fff;margin-bottom:4px">Camera Access</b>
            <p id="camera-perm-msg" class="small muted" style="line-height:1.45;margin-bottom:16px;max-width:300px">
              Please allow browser camera access to scan food and barcodes automatically.
            </p>
            <div class="stack" style="gap:8px;width:100%;max-width:280px">
              <button type="button" class="btn btn-primary btn-sm btn-block" id="btn-request-cam-perm">
                ${icons.camera}
                <span>Retry Live Camera</span>
              </button>
              <label for="file-input-native" class="btn btn-secondary btn-sm btn-block" id="btn-open-native-cam" style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;margin:0">
                ${icons.image}
                <span>Open Device Camera</span>
              </label>
            </div>
          </div>

          <!-- AI Analysis Spinner with Dynamic Steps -->
          <div id="camera-spinner" class="hidden" style="position:absolute;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:20;padding:24px;text-align:center">
            <div class="spinner" style="width:40px;height:40px;border-width:3.5px"></div>
            <b id="spinner-title" style="color:#fff;font-size:15px;letter-spacing:-0.2px">Gemini 3.5 Flash Lite analyzing...</b>
            <span id="spinner-sub" class="small muted" style="max-width:270px;line-height:1.4">Mengenal pasti hidangan & lauk Malaysia...</span>
          </div>
        </div>

        <!-- Shutter, Gallery Upload & Camera Switch Controls -->
        <div class="scanner-controls">
          <input type="file" id="file-input" accept="image/*" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;opacity:0" />
          <input type="file" id="file-input-native" accept="image/*" capture="environment" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;opacity:0" />

          <label for="file-input" class="btn btn-icon btn-ghost" id="btn-upload-gallery" style="cursor:pointer;margin:0" title="Upload from Gallery" aria-label="Upload from gallery">
            ${icons.image}
          </label>

          <button type="button" class="shutter-btn" id="btn-shutter" title="Capture Photo" aria-label="Capture photo"></button>

          <button type="button" class="btn btn-icon btn-ghost" id="btn-switch-cam" title="Switch Front / Back Camera" aria-label="Switch camera">
            ${icons.refresh}
          </button>
        </div>
      </div>

      <!-- Quick Context Chips (Food AI Mode) -->
      <div id="food-chips-section" class="card stack ${mode === 'food' ? '' : 'hidden'}" style="margin-bottom:14px">
        <div class="card-title">
          <span>${isEn ? 'Quick Context Notes (Portion Fine-Tuning)' : 'Nota Pantas (Laras Saiz Porsi)'}</span>
          <span class="xs muted">${isEn ? 'Optional' : 'Pilihan'}</span>
        </div>
        <div class="chips" id="quick-chips-box">
          ${currentChips.map(
            (c) =>
              `<button type="button" class="chip ${selectedChips.has(c) ? 'active' : ''}" data-chip="${c}">+ ${c}</button>`
          ).join('')}
        </div>
        <input class="input" id="custom-context-input" value="${esc(customContextNote)}" placeholder="${isEn ? 'e.g. Chicken breast, half rice, sauce on side...' : 'cth. Dada ayam, nasi separuh, kuah asing...'}" />
      </div>

      <!-- Manual Barcode Search -->
      <div id="barcode-manual-section" class="card stack ${mode === 'barcode' ? '' : 'hidden'}" style="margin-bottom:14px">
        <div class="card-title"><span>${isEn ? 'Manual Barcode Search' : 'Carian Kod Bar Manual'}</span></div>
        <div class="row">
          <input class="input num" id="manual-barcode-input" placeholder="${isEn ? 'Enter barcode number (e.g. 9556001...)' : 'Masukkan nombor kod bar...'}" />
          <button type="button" class="btn btn-secondary" id="btn-lookup-barcode">${isEn ? 'Search' : 'Cari'}</button>
        </div>
      </div>

      <!-- Analysis Results -->
      <div id="results-container">
        ${renderResultHTML()}
      </div>
    `;

    bindEvents();
    startCamera();
  }

  function setCameraUIState(state, errorMsg = '') {
    cameraState = state;
    cameraErrorMessage = errorMsg;
    const isEn = getLang() === 'en';
    const hud = container.querySelector('#camera-status-hud');
    const vf = container.querySelector('#camera-viewfinder');
    const perm = container.querySelector('#camera-perm-overlay');
    const msgEl = container.querySelector('#camera-perm-msg');
    const facingBadge = container.querySelector('#camera-facing-badge');

    if (facingBadge) {
      facingBadge.textContent = facingMode === 'environment' ? (isEn ? 'Back Camera' : 'Kamera Belakang') : (isEn ? 'Front Camera' : 'Kamera Depan');
    }

    if (state === 'active') {
      hud?.classList.remove('hidden');
      vf?.classList.remove('hidden');
      perm?.classList.add('hidden');
    } else if (state === 'denied' || state === 'error') {
      hud?.classList.add('hidden');
      vf?.classList.add('hidden');
      perm?.classList.remove('hidden');
      if (msgEl) msgEl.textContent = errorMsg || (isEn ? 'Please allow camera access for automatic scanning.' : 'Sila benarkan akses kamera untuk pengimbasan automatik.');
    } else {
      hud?.classList.add('hidden');
      vf?.classList.add('hidden');
      perm?.classList.add('hidden');
    }
  }

  function updateViewfinder() {
    const vfShape = container.querySelector('#viewfinder-shape');
    if (!vfShape) return;
    if (mode === 'food') {
      vfShape.className = 'viewfinder-box';
      vfShape.innerHTML = '';
    } else if (mode === 'barcode') {
      vfShape.className = 'viewfinder-barcode';
      vfShape.innerHTML = '<div class="viewfinder-laser"></div>';
    } else {
      vfShape.className = 'viewfinder-label';
      vfShape.innerHTML = '';
    }
  }

  function getAnalysisSteps() {
    const isEn = getLang() === 'en';
    return isEn
      ? [
          { title: 'Gemini 3.5 Flash Lite analyzing...', sub: '🔍 Identifying Malaysian dishes & ingredients...' },
          { title: 'Estimating Portion & Gravy...', sub: '⚖️ Calibrating portion size, rice & gravy...' },
          { title: 'Computing Nutrition...', sub: '⚡ Calculating calories, protein, carbs & fat...' },
          { title: 'Finalizing Recommendations...', sub: '💬 Generating Deku & Bakugou coach feedback...' },
        ]
      : [
          { title: 'Gemini 3.5 Flash Lite menganalisis...', sub: '🔍 Mengenal pasti hidangan & lauk Malaysia...' },
          { title: 'Menganggar Porsi & Kuah...', sub: '⚖️ Menganggar sukatan, kuah & saiz porsi...' },
          { title: 'Mengira Nutrisi...', sub: '⚡ Mengira kalori, protein, karbo & lemak...' },
          { title: 'Merumuskan Cadangan...', sub: '💬 Merumuskan nasihat Deku & Bakugou...' },
        ];
  }

  function setAnalyzing(loading) {
    isAnalyzing = loading;
    const sp = container.querySelector('#camera-spinner');
    const titleEl = container.querySelector('#spinner-title');
    const subEl = container.querySelector('#spinner-sub');
    const steps = getAnalysisSteps();

    if (analysisInterval) {
      clearInterval(analysisInterval);
      analysisInterval = null;
    }

    if (sp) sp.classList.toggle('hidden', !loading);

    if (loading) {
      let stepIdx = 0;
      if (titleEl) titleEl.textContent = steps[0].title;
      if (subEl) subEl.textContent = steps[0].sub;
      analysisInterval = setInterval(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        if (titleEl) titleEl.textContent = steps[stepIdx].title;
        if (subEl) subEl.textContent = steps[stepIdx].sub;
      }, 950);
    }
  }

  function renderResultHTML() {
    if (!analysisResult) return '';
    const isEn = getLang() === 'en';

    if (mode === 'food') {
      const r = analysisResult;
      return `
        <div class="card stack fade-up" style="margin-top:14px">
          <div class="card-title row between">
            <div>
              <span class="eyebrow" style="display:block;margin-bottom:2px">${isEn ? 'AI Analysis Result' : 'Keputusan Analisis AI'}</span>
              <h2 style="font-size:22px;font-weight:800">${esc(r.name)}</h2>
            </div>
            ${statusBadge(r.recommendation.status)}
          </div>

          <div class="equation">
            <div class="eq-cell">
              <span>${t('me_calories')}</span>
              <b class="num">${r.kcal}</b>
              <span class="xs muted">kcal</span>
            </div>
            <div class="eq-cell">
              <span>${isEn ? 'Est. Weight' : 'Anggaran Berat'}</span>
              <b class="num">${r.weight_g}</b>
              <span class="xs muted">g</span>
            </div>
            <div class="eq-cell">
              <span>${t('me_protein')}</span>
              <b class="num">${round1(r.protein)}</b>
              <span class="xs muted">g</span>
            </div>
          </div>

          <div class="grid grid-2" style="font-size:13px;padding:8px 0">
            <div>${t('me_carbs')}: <b>${round1(r.carbs)}g</b></div>
            <div>${t('me_fat')}: <b>${round1(r.fat)}g</b></div>
          </div>

          ${
            r.items && r.items.length
              ? `<div class="divider"></div>
                 <div class="stack" style="gap:8px">
                   <span class="small bold muted">${isEn ? 'Dish Breakdown:' : 'Pecahan Hidangan:'}</span>
                   ${r.items
                     .map(
                       (it) => `
                     <div class="row between small" style="padding:4px 0;border-bottom:1px solid var(--border-soft)">
                       <span>${esc(it.name)} (${it.weight_g}g)</span>
                       <b class="num">${it.kcal} kcal</b>
                     </div>`
                     )
                     .join('')}
                 </div>`
              : ''
          }

          ${
            r.recommendation.adjustment
              ? `<p class="small muted" style="margin:4px 0;line-height:1.4"><b>${isEn ? 'Portion Recommendation:' : 'Cadangan Porsi:'}</b> ${esc(r.recommendation.adjustment)}</p>`
              : ''
          }

          ${r.recommendation.deku ? companionBubble('deku', r.recommendation.deku, { compact: true }) : ''}
          ${r.recommendation.bakugou ? companionBubble('bakugou', r.recommendation.bakugou, { compact: true }) : ''}

          <!-- 1-Tap Malaysian Food & Beverage Quick Switcher -->
          <div class="card flat" style="background:rgba(255,255,255,0.02);border:1px solid var(--border-soft);padding:10px 12px;margin:10px 0;border-radius:10px">
            <div class="row between" style="margin-bottom:7px;align-items:center">
              <span class="xs bold" style="color:var(--text-1)">💡 ${isEn ? 'Confirm / Quick Switch Item:' : 'Sahkan / Tukar Makanan & Minuman:'}</span>
              <span class="xs muted">1-Tap</span>
            </div>
            <div class="chips" id="switch-dish-chips" style="gap:5px;flex-wrap:wrap">
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Vanilla Oolong') ? 'active' : ''}" data-id="chagee_oolong">🧋 Vanilla Oolong (CHAGEE)</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Jasmine') ? 'active' : ''}" data-id="jasmine_tea">🧋 Jasmine Milk Tea</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Boba') ? 'active' : ''}" data-id="boba_brown_sugar">🧋 Boba Milk Tea</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Spanish') ? 'active' : ''}" data-id="zus_latte">☕ Spanish Latte</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Americano') ? 'active' : ''}" data-id="americano_black">☕ Kopi O Kosong</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Teh Tarik') ? 'active' : ''}" data-id="teh_tarik">☕ Teh Tarik Kurang Manis</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Milo') ? 'active' : ''}" data-id="milo_ais">🍫 Milo Ais</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Kopi Ais') ? 'active' : ''}" data-id="kopi_ais">☕ Kopi Ais Mamak</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Sirap') ? 'active' : ''}" data-id="sirap_bandung">🌸 Sirap Bandung</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Nasi Lemak') ? 'active' : ''}" data-id="nasi_lemak">🍚 Nasi Lemak Ayam</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Chicken Rice') || r.name.includes('Nasi Ayam') ? 'active' : ''}" data-id="chicken_rice">🍗 Nasi Ayam Hainan</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Kandar') ? 'active' : ''}" data-id="nasi_kandar">🍛 Nasi Kandar</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Char Kuey Teow') ? 'active' : ''}" data-id="char_kuey_teow">🍜 Char Kuey Teow</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Mee Goreng') ? 'active' : ''}" data-id="mee_goreng">🍜 Mee Goreng Mamak</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Roti Canai') ? 'active' : ''}" data-id="roti_canai">🥞 Roti Canai</button>
              <button type="button" class="chip btn-quick-switch ${r.name.includes('Salad') ? 'active' : ''}" data-id="healthy_salad">🥗 Dada Ayam Sihat</button>
            </div>
            <div style="margin-top:8px">
              <input type="text" id="quick-dish-search" class="input input-sm" placeholder="${isEn ? '🔍 Search food/drink (e.g. Chagee, Oolong, Milo, Ayam)...' : '🔍 Cari atau pilih hidangan (cth: Chagee, Oolong, Milo, Ayam)...'}" style="font-size:12px;padding:6px 10px;height:32px" />
            </div>
          </div>

          <div class="grid grid-2" style="margin-top:10px">
            <button type="button" class="btn btn-secondary" id="btn-quick-edit">
              ${icons.edit}
              <span>${t('scan_edit_details')}</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-save-log">
              ${icons.check}
              <span>${t('scan_log_meal')}</span>
            </button>
          </div>
        </div>
      `;
    }

    if (mode === 'barcode') {
      const p = analysisResult;
      return `
        <div class="card stack fade-up" style="margin-top:14px">
          <div class="card-title row between">
            <div>
              <span class="eyebrow">${esc(p.brand || (isEn ? 'Product' : 'Produk'))}</span>
              <h2 style="font-size:20px;font-weight:800">${esc(p.name)}</h2>
            </div>
            <span class="badge ok">Open Food Facts</span>
          </div>

          <div class="equation">
            <div class="eq-cell">
              <span>Per 100g</span>
              <b class="num">${p.per100.kcal}</b>
              <span class="xs muted">kcal</span>
            </div>
            <div class="eq-cell">
              <span>${t('me_protein')}</span>
              <b class="num">${round1(p.per100.protein)}g</b>
            </div>
            <div class="eq-cell">
              <span>${t('me_carbs')} / ${t('me_fat')}</span>
              <b class="num">${round1(p.per100.carbs)} / ${round1(p.per100.fat)}g</b>
            </div>
          </div>

          <div class="field" style="margin-top:8px">
            <label for="barcode-grams-input">${isEn ? 'Portion size consumed (grams):' : 'Saiz hidangan diambil (gram):'}</label>
            <div class="input-suffix">
              <input class="input num" id="barcode-grams-input" type="number" value="${p.servingSize || 100}" />
              <span>g</span>
            </div>
          </div>

          <button type="button" class="btn btn-primary btn-block" id="btn-save-barcode">
            ${icons.plus}
            <span>${t('scan_log_meal')}</span>
          </button>
        </div>
      `;
    }

    if (mode === 'ocr') {
      const r = analysisResult;
      return `
        <div class="card stack fade-up" style="margin-top:14px">
          <div class="card-title row between">
            <div>
              <span class="eyebrow">${t('scan_tab_label')} OCR</span>
              <h2 style="font-size:20px;font-weight:800">${esc(r.name)}</h2>
            </div>
            ${statusBadge(r.recommendation.status)}
          </div>

          <div class="equation">
            <div class="eq-cell">
              <span>Per Serving</span>
              <b class="num">${r.perServing.kcal || r.per100.kcal}</b>
              <span class="xs muted">kcal</span>
            </div>
            <div class="eq-cell">
              <span>${t('me_protein')}</span>
              <b class="num">${round1(r.perServing.protein || r.per100.protein)}g</b>
            </div>
            <div class="eq-cell">
              <span>Sugar / Sodium</span>
              <b class="num">${round1(r.perServing.sugar || 0)}g / ${int(r.perServing.sodium || 0)}mg</b>
            </div>
          </div>

          ${r.recommendation.deku ? companionBubble('deku', r.recommendation.deku, { compact: true }) : ''}
          ${r.recommendation.bakugou ? companionBubble('bakugou', r.recommendation.bakugou, { compact: true }) : ''}

          <div class="grid grid-2" style="margin-top:8px">
            <button type="button" class="btn btn-secondary" id="btn-ocr-edit">
              ${icons.edit}
              <span>${t('scan_edit_details')}</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-ocr-save">
              ${icons.check}
              <span>${t('scan_log_meal')}</span>
            </button>
          </div>
        </div>
      `;
    }

    return '';
  }

  function updateResultsUI() {
    const rc = container.querySelector('#results-container');
    if (rc) {
      rc.innerHTML = renderResultHTML();
      bindResultEvents();
    }
  }

  // ----------------- WebRTC & Mobile Camera Management -----------------
  async function startCamera() {
    const video = container.querySelector('#scanner-video');
    const prevImg = container.querySelector('#scanner-preview-img');
    if (!video) return;

    // Reset preview state
    if (prevImg) prevImg.classList.add('hidden');
    video.style.display = 'block';

    // 1. Semak Sokongan & Keselamatan Sambungan (HTTPS / Localhost)
    const hasMediaDevices = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
    const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    if (!hasMediaDevices || !isSecure) {
      const err = !isSecure
        ? 'Sambungan HTTP tidak disulitkan (unencrypted). Pelayar telefon menyekat live camera atas dasar keselamatan. Sila tekan "Open Device Camera" di bawah untuk mengimbas makanan, atau gunakan HTTPS.'
        : 'Pelayar ini tidak menyokong live camera WebRTC. Sila gunakan butang kamera peranti di bawah.';
      setCameraUIState('error', err);
      return;
    }

    // Jika strim sedia ada masih sihat dan aktif, gunakan semula
    if (stream && stream.active && video.srcObject === stream) {
      setCameraUIState('active');
      setupBarcodeReaderIfNeeded(video);
      return;
    }

    stopCamera();

    // Atribut mandatori untuk iOS Safari, Chrome Mobile & Android WebKit
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    try {
      setCameraUIState('starting');

      // Strategi Fallback Berperingkat untuk kestabilan 100% pada semua peranti
      const attempts = [
        // 1. Resolusi Standard HD dengan facingMode ideal
        {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        // 2. facingMode sahaja tanpa had resolusi
        {
          video: {
            facingMode: { ideal: facingMode },
          },
          audio: false,
        },
        // 3. Tukar arah kamera (user / environment) jika kamera pertama gagal
        {
          video: {
            facingMode: facingMode === 'environment' ? 'user' : 'environment',
          },
          audio: false,
        },
        // 4. Sebarang input kamera yang wujud (komputer riba, webcam USB, dll)
        {
          video: true,
          audio: false,
        },
      ];

      let mediaStream = null;
      let lastErr = null;
      for (const constraint of attempts) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(constraint);
          if (mediaStream) break;
        } catch (attemptErr) {
          lastErr = attemptErr;
        }
      }

      if (!mediaStream) {
        throw lastErr || new Error('Tidak dapat memulakan peranti kamera.');
      }

      stream = mediaStream;
      video.srcObject = stream;

      let readyDispatched = false;
      const markReady = () => {
        if (readyDispatched) return;
        readyDispatched = true;
        setCameraUIState('active');
        setupBarcodeReaderIfNeeded(video);
      };

      const tryPlay = async () => {
        try {
          await video.play();
          markReady();
        } catch (err) {
          console.warn('Waiting for video play event:', err);
        }
      };

      video.onloadedmetadata = tryPlay;
      video.oncanplay = tryPlay;
      video.onloadeddata = tryPlay;

      // Cuba main serta-merta
      tryPlay();

      // Semakan keselamatan sekunder selepas 400ms
      setTimeout(() => {
        if (stream && stream.active) {
          const liveTrack = stream.getVideoTracks().find((t) => t.readyState === 'live');
          if (liveTrack) markReady();
        }
      }, 400);

    } catch (e) {
      console.warn('Mobile camera access error:', e);
      let msg = '';
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        msg = 'Kebenaran kamera dinafikan oleh pelayar. Sila klik "Retry Live Camera" atau gunakan butang kamera telefon di bawah.';
        setCameraUIState('denied', msg);
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        msg = 'Tiada perkakasan kamera dikesan pada peranti ini.';
        setCameraUIState('error', msg);
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        msg = 'Kamera sedang digunakan oleh aplikasi lain. Sila tutup aplikasi kamera lain dan cuba lagi.';
        setCameraUIState('error', msg);
      } else {
        msg = e.message || 'Tidak dapat memulakan live camera. Anda boleh menggunakan kamera peranti di bawah.';
        setCameraUIState('error', msg);
      }
    }
  }

  function setupBarcodeReaderIfNeeded(video) {
    if (mode !== 'barcode') {
      if (zxingReader) {
        try { zxingReader.reset(); } catch {}
        zxingReader = null;
      }
      return;
    }

    if (!video || !video.srcObject) return;
    if (zxingReader) return; // already active

    try {
      zxingReader = new BrowserMultiFormatReader();
      zxingReader.decodeFromVideoElement(video, (result, err) => {
        if (result) {
          try { zxingReader.reset(); } catch {}
          zxingReader = null;
          handleBarcodeFound(result.getText());
        }
      });
    } catch (e) {
      console.warn('Failed to start barcode reader:', e);
    }
  }

  function stopCamera() {
    if (stream) {
      try {
        stream.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
      } catch {}
      stream = null;
    }
    const video = container.querySelector('#scanner-video');
    if (video) {
      video.srcObject = null;
    }
    if (zxingReader) {
      try { zxingReader.reset(); } catch {}
      zxingReader = null;
    }
  }

  function resetToLiveCamera() {
    const prevImg = container.querySelector('#scanner-preview-img');
    const videoEl = container.querySelector('#scanner-video');
    const btnRetake = container.querySelector('#btn-retake-live');

    if (prevImg) {
      prevImg.classList.add('hidden');
      prevImg.src = '';
    }
    if (btnRetake) {
      btnRetake.classList.add('hidden');
    }
    if (videoEl) {
      videoEl.style.display = 'block';
      if (videoEl.paused && stream && stream.active) {
        videoEl.play().catch(() => {});
      }
    }
    setCameraUIState('active');
  }

  function captureFrame() {
    const video = container.querySelector('#scanner-video');
    if (!video || !video.srcObject) return null;

    // Pastikan video aktif jika sebelum ini disembunyikan
    if (video.style.display === 'none') {
      video.style.display = 'block';
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);

      const full = canvas.toDataURL('image/jpeg', 0.85);
      const thumbCanvas = document.createElement('canvas');
      const sc = Math.min(1, 180 / Math.max(w, h));
      thumbCanvas.width = Math.max(1, Math.round(w * sc));
      thumbCanvas.height = Math.max(1, Math.round(h * sc));
      thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const thumb = thumbCanvas.toDataURL('image/jpeg', 0.6);

      return {
        dataUrl: full,
        base64: full.split(',')[1],
        mime: 'image/jpeg',
        thumb,
      };
    } catch (e) {
      console.warn('captureFrame error:', e);
      return null;
    }
  }

  async function processFoodScan(imgObj) {
    // Kosongkan keputusan lama serta-merta agar UI tidak tersekat pada hidangan sebelum ini
    analysisResult = null;
    updateResultsUI();

    setAnalyzing(true);
    try {
      capturedImage = imgObj;
      const prevImg = container.querySelector('#scanner-preview-img');
      const videoEl = container.querySelector('#scanner-video');
      const btnRetake = container.querySelector('#btn-retake-live');

      if (prevImg && (imgObj.dataUrl || imgObj.thumb)) {
        prevImg.src = imgObj.dataUrl || imgObj.thumb;
        prevImg.classList.remove('hidden');
        if (videoEl) videoEl.style.display = 'none';
      }
      if (btnRetake) {
        btnRetake.classList.remove('hidden');
      }

      // Imbas teks atau kod QR pada cawan/bungkusan secara setempat jika wujud
      let detectedText = '';
      try {
        const testImg = new Image();
        testImg.src = imgObj.dataUrl || imgObj.thumb;
        await new Promise((resolve) => {
          testImg.onload = resolve;
          testImg.onerror = resolve;
        });

        if (testImg.naturalWidth) {
          const testCanvas = document.createElement('canvas');
          testCanvas.width = testImg.naturalWidth;
          testCanvas.height = testImg.naturalHeight;
          const tCtx = testCanvas.getContext('2d');
          tCtx.drawImage(testImg, 0, 0);

          // 1. Semak jika terdapat kod QR/kod bar pada pelekat cawan (cth: CHAGEE Cup)
          try {
            const qrReader = new BrowserMultiFormatReader();
            const qrRes = qrReader.decodeFromCanvas(testCanvas);
            if (qrRes && qrRes.getText()) {
              detectedText += ' ' + qrRes.getText();
            }
          } catch {}

          // 2. Semak jika pelayar menyokong TextDetector (Chrome/Android)
          if (typeof window !== 'undefined' && 'TextDetector' in window) {
            try {
              const td = new window.TextDetector();
              const detected = await td.detect(testCanvas);
              if (detected && detected.length) {
                detectedText += ' ' + detected.map((d) => d.rawValue || '').join(' ');
              }
            } catch {}
          }
        }
      } catch (e) {
        console.warn('Local OCR text check error:', e);
      }

      const allNotes = [...selectedChips, customContextNote, detectedText].filter(Boolean).join(', ');
      const res = await analyzeFood({ image: imgObj, note: allNotes });
      analysisResult = res;
      toast(`AI recognized: ${res.name}`, 'success');
      updateResultsUI();
      container.querySelector('#results-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      toast(err.message || 'Failed to analyze food.', 'error');
    } finally {
      setAnalyzing(false);
    }
  }

  async function processOcrScan(imgObj) {
    setAnalyzing(true);
    try {
      capturedImage = imgObj;
      const prevImg = container.querySelector('#scanner-preview-img');
      const videoEl = container.querySelector('#scanner-video');
      if (prevImg && (imgObj.dataUrl || imgObj.thumb)) {
        prevImg.src = imgObj.dataUrl || imgObj.thumb;
        prevImg.classList.remove('hidden');
        if (videoEl) videoEl.style.display = 'none';
      }

      const res = await readNutritionLabel({ image: imgObj });
      analysisResult = res;
      toast(`Label scanned: ${res.name}`, 'success');
      updateResultsUI();
      container.querySelector('#results-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      toast(err.message || 'Failed to read nutrition label.', 'error');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleBarcodeFound(code) {
    toast(`Barcode detected: ${code}`, 'info');
    try {
      const prod = await lookupBarcode(code);
      analysisResult = prod;
      updateResultsUI();
      toast(`Product found: ${prod.name}`, 'success');
    } catch (err) {
      toast(err.message || 'Product not found.', 'error');
    }
  }

  function bindEvents() {
    // 1. Switch Mode Tabs
    container.querySelectorAll('#scanner-mode-tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        mode = b.dataset.m;
        analysisResult = null;
        updateResultsUI();

        container.querySelectorAll('#scanner-mode-tabs button').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.m === mode);
        });

        updateViewfinder();

        // Show/hide relevant sections
        container.querySelector('#food-chips-section')?.classList.toggle('hidden', mode !== 'food');
        container.querySelector('#barcode-manual-section')?.classList.toggle('hidden', mode !== 'barcode');

        const video = container.querySelector('#scanner-video');
        if (mode === 'barcode') {
          setupBarcodeReaderIfNeeded(video);
        } else if (zxingReader) {
          try { zxingReader.reset(); } catch {}
          zxingReader = null;
        }

        onScanModeUsed(mode);
      });
    });

    // 2. Context Chips
    container.querySelectorAll('#quick-chips-box .chip').forEach((c) => {
      c.addEventListener('click', () => {
        const val = c.dataset.chip;
        if (selectedChips.has(val)) selectedChips.delete(val);
        else selectedChips.add(val);
        c.classList.toggle('active', selectedChips.has(val));
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      });
    });

    // 3. Text Notes
    container.querySelector('#custom-context-input')?.addEventListener('input', (e) => {
      customContextNote = e.target.value;
    });

    // 3b. Direct iPhone / Smartphone Native Camera Button
    container.querySelector('#btn-iphone-snap')?.addEventListener('click', () => {
      toast('Membuka kamera telefon...', 'info', 1600);
    });

    // 3c. iPhone Camera Guide Sheet
    container.querySelector('#btn-iphone-help')?.addEventListener('click', () => {
      openSheet(
        `<div class="stack" style="gap:14px;padding:6px 0">
          <div class="row" style="gap:10px;align-items:center">
            <div style="font-size:26px">📱</div>
            <div>
              <h3 class="sheet-title" style="margin:0">iPhone / iOS Camera Guide</h3>
              <span class="xs muted">Cara aktifkan & gunakan kamera di Safari / iOS</span>
            </div>
          </div>
          
          <div class="card flat stack" style="gap:12px;background:var(--surface-2);padding:14px">
            <div style="font-size:13px;line-height:1.5">
              <b style="color:var(--text-1);display:block;margin-bottom:2px">1. Pilihan Terpantas (Kamera Asli):</b>
              Tekan butang <span class="badge" style="display:inline-flex;padding:2px 7px;font-weight:700">📱 iPhone Camera</span> di atas. Ia akan terus membuka aplikasi kamera rasmi iOS dengan HDR, fokus automatik dan resolusi penuh tanpa sebarang sekatan pelayar.
            </div>
            <div style="font-size:13px;line-height:1.5">
              <b style="color:var(--text-1);display:block;margin-bottom:2px">2. Kebenaran Safari (Live Viewfinder):</b>
              Jika viewfinder skrin gelap atau meminta kebenaran:
              <ul style="margin:4px 0 0 18px;padding:0">
                <li>Buka <b>Settings</b> iPhone ➔ <b>Safari</b> ➔ <b>Camera</b> ➔ pilih <b>Allow</b> (atau 'Ask').</li>
                <li>Di Safari, tekan ikon <b>aA</b> di tepi bar URL ➔ <b>Website Settings</b> ➔ <b>Camera</b> ➔ <b>Allow</b>.</li>
              </ul>
            </div>
            <div style="font-size:13px;line-height:1.5">
              <b style="color:var(--text-1);display:block;margin-bottom:2px">3. PWA (Add to Home Screen):</b>
              Jika dipasang pada skrin utama iPhone, pastikan anda klik "Allow" apabila iOS meminta izin akses kamera.
            </div>
          </div>

          <button type="button" class="btn btn-primary btn-block" data-close>Faham & Teruskan</button>
        </div>`,
        { className: 'sheet-md' }
      );
    });

    // 3d. Voice Log (Speech-to-Text for food notes)
    container.querySelector('#btn-voice-log')?.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        const text = prompt('Voice recognition tidak disokong pada pelayar ini. Sila taip nota makanan anda:');
        if (text) {
          customContextNote = (customContextNote ? customContextNote + ', ' : '') + text;
          const inp = container.querySelector('#custom-context-input');
          if (inp) inp.value = customContextNote;
          toast(`Nota disimpan: "${text}"`, 'success');
        }
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ms-MY';
        recognition.continuous = false;
        recognition.interimResults = false;

        const btnVoice = container.querySelector('#btn-voice-log');
        if (btnVoice) btnVoice.classList.add('loading');
        toast('Mendengar suara... Sila sebut makanan & kuantiti anda.', 'info', 4000);

        recognition.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            customContextNote = (customContextNote ? customContextNote + ', ' : '') + transcript;
            const inp = container.querySelector('#custom-context-input');
            if (inp) inp.value = customContextNote;
            toast(`Dicatat: "${transcript}"`, 'success');
          }
        };

        recognition.onerror = (err) => {
          console.warn('Voice recognition error:', err);
          toast('Tidak dapat menangkap suara. Sila cuba lagi atau taip nota.', 'warning');
        };

        recognition.onend = () => {
          if (btnVoice) btnVoice.classList.remove('loading');
        };

        recognition.start();
      } catch (e) {
        toast('Gagal memulakan rakaman suara.', 'error');
      }
    });

    // 3e. Floating Retake / Live Camera Button & Preview Tap
    container.querySelector('#btn-retake-live')?.addEventListener('click', () => {
      resetToLiveCamera();
      toast('Kamera langsung diaktifkan semula.', 'info', 1400);
    });
    container.querySelector('#scanner-preview-img')?.addEventListener('click', () => {
      resetToLiveCamera();
    });

    // 4. Shutter Button (Capture Frame)
    container.querySelector('#btn-shutter')?.addEventListener('click', async () => {
      // Kilat visual pengatup (tactile camera flash)
      const flashEl = container.querySelector('#shutter-flash');
      if (flashEl) {
        flashEl.style.opacity = '0.75';
        setTimeout(() => { flashEl.style.opacity = '0'; }, 130);
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(25); } catch {}
      }

      // Jika video sebelum ini ditutup oleh gambar beku terdahulu, aktifkan semula video
      const prevImg = container.querySelector('#scanner-preview-img');
      if (prevImg && !prevImg.classList.contains('hidden')) {
        resetToLiveCamera();
        await new Promise((r) => setTimeout(r, 90));
      }

      const img = captureFrame();
      if (!img) {
        // Fallback to native mobile device camera synchronously
        toast('Kamera langsung belum bersedia. Membuka kamera peranti...', 'info', 1600);
        container.querySelector('#file-input-native')?.click();
        return;
      }
      if (mode === 'food') processFoodScan(img);
      else if (mode === 'ocr') processOcrScan(img);
      else if (mode === 'barcode') {
        toast('Aim barcode at the red guideline for auto-scan.', 'info');
      }
    });

    // 5. Switch Front / Back Camera
    container.querySelector('#btn-switch-cam')?.addEventListener('click', async () => {
      facingMode = facingMode === 'environment' ? 'user' : 'environment';
      store.saveSettings({ cameraFacing: facingMode });
      toast(`Camera switched: ${facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}`, 'info');
      stopCamera();
      await startCamera();
    });

    // 6. Request Camera Permission / Retry
    container.querySelector('#btn-request-cam-perm')?.addEventListener('click', async () => {
      await startCamera();
    });

    // 7. Open Native Smartphone Camera
    const nativeCamInput = container.querySelector('#file-input-native');
    nativeCamInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        toast('Memproses gambar kamera...', 'info', 1600);
        const img = await compressImage(file);
        if (mode === 'food') processFoodScan(img);
        else if (mode === 'ocr') processOcrScan(img);
      } catch (err) {
        toast(err.message || 'Gagal memproses gambar kamera.', 'error');
      } finally {
        e.target.value = ''; // Membolehkan pengguna mengambil semula gambar
      }
    });

    // 8. Upload from Gallery
    const fileInput = container.querySelector('#file-input');
    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        toast('Memproses fail galeri...', 'info', 1600);
        const img = await compressImage(file);
        if (mode === 'food') processFoodScan(img);
        else if (mode === 'ocr') processOcrScan(img);
      } catch (err) {
        toast(err.message || 'Gagal memproses fail imej.', 'error');
      } finally {
        e.target.value = ''; // Membolehkan pemilihan semula
      }
    });

    // 9. Manual Barcode Lookup
    container.querySelector('#btn-lookup-barcode')?.addEventListener('click', () => {
      const code = container.querySelector('#manual-barcode-input')?.value.trim();
      if (code) handleBarcodeFound(code);
    });

    bindResultEvents();
  }

  function bindResultEvents() {
    // Quick Edit & Save Food AI Log
    container.querySelector('#btn-quick-edit')?.addEventListener('click', () => {
      if (!analysisResult) return;
      openMealEditor(
        {
          name: analysisResult.name,
          kcal: analysisResult.kcal,
          protein: analysisResult.protein,
          carbs: analysisResult.carbs,
          fat: analysisResult.fat,
          weight_g: analysisResult.weight_g,
          thumb: capturedImage?.thumb || capturedImage?.dataUrl,
        },
        {
          title: 'Quick Edit Meal',
          onSaved: () => {
            analysisResult = null;
            resetToLiveCamera();
            updateResultsUI();
          },
        }
      );
    });

    // Quick Dish & Beverage Switcher
    container.querySelectorAll('.btn-quick-switch').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dishId = btn.dataset.id;
        const dish = findLocalDish(dishId);
        if (dish) {
          analysisResult = {
            name: dish.food_name,
            weight_g: dish.estimated_weight_g,
            kcal: dish.calories_kcal,
            protein: dish.macros.protein_g,
            carbs: dish.macros.carbs_g,
            fat: dish.macros.fat_g,
            items: dish.items_breakdown.map((i) => ({ name: i.name, weight_g: i.weight_g, kcal: i.calories_kcal })),
            recommendation: {
              status: dish.suitability_status,
              adjustment: dish.recommended_portion_adjustment,
              deku: dish.deku,
              bakugou: dish.bakugou,
            },
          };
          updateResultsUI();
          toast(`Ditukar ke: ${dish.food_name}`, 'info', 1600);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(15); } catch {}
          }
        }
      });
    });

    // Quick Dish Search Input
    const searchInput = container.querySelector('#quick-dish-search');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (q.length >= 2) {
        const dish = findLocalDish(q);
        if (dish && dish.food_name !== analysisResult?.name) {
          analysisResult = {
            name: dish.food_name,
            weight_g: dish.estimated_weight_g,
            kcal: dish.calories_kcal,
            protein: dish.macros.protein_g,
            carbs: dish.macros.carbs_g,
            fat: dish.macros.fat_g,
            items: dish.items_breakdown.map((i) => ({ name: i.name, weight_g: i.weight_g, kcal: i.calories_kcal })),
            recommendation: {
              status: dish.suitability_status,
              adjustment: dish.recommended_portion_adjustment,
              deku: dish.deku,
              bakugou: dish.bakugou,
            },
          };
          updateResultsUI();
        }
      }
    });

    container.querySelector('#btn-save-log')?.addEventListener('click', () => {
      if (!analysisResult) return;
      const savedName = analysisResult.name;
      const meal = store.addMeal({
        name: analysisResult.name,
        kcal: analysisResult.kcal,
        protein: analysisResult.protein,
        carbs: analysisResult.carbs,
        fat: analysisResult.fat,
        weight_g: analysisResult.weight_g,
        thumb: capturedImage?.thumb || capturedImage?.dataUrl || '',
      });
      toast(`${savedName} berjaya disimpan ke log makanan!`, 'success');
      onMealLogged(meal);

      // Reset kamera kepada mod langsung supaya pengguna boleh imbas hidangan/minuman baru serta-merta
      resetToLiveCamera();
      analysisResult = null;
      capturedImage = null;

      // Paparkan banner pengesahan kemas dan sediakan butang imbas seterusnya
      const rc = container.querySelector('#results-container');
      if (rc) {
        const isEn = getLang() === 'en';
        rc.innerHTML = `
          <div class="card flat ok-border fade-up" style="margin-top:14px;background:rgba(61,220,151,0.06);border:1px solid rgba(61,220,151,0.3);padding:16px;text-align:center;border-radius:12px">
            <div style="font-size:28px;margin-bottom:6px">✅</div>
            <b style="color:var(--ok);font-size:16px;display:block;margin-bottom:4px">${esc(savedName)} ${isEn ? 'Logged!' : 'Berjaya Direkod!'}</b>
            <p class="small muted" style="margin:0 0 12px;line-height:1.4">${isEn ? 'Live camera is active for your next food or drink scan.' : 'Kamera langsung telah diaktifkan semula. Halakan kamera untuk imbas makanan atau minuman seterusnya.'}</p>
            <div class="row center" style="gap:8px;flex-wrap:wrap">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-scan-another">📸 ${isEn ? 'Scan Next Item' : 'Imbas Makanan Seterusnya'}</button>
              <a href="#dashboard" class="btn btn-primary btn-sm" id="btn-view-logged-dash">📊 ${isEn ? 'View Diary' : 'Lihat Log Hari Ini'}</a>
            </div>
          </div>
        `;
        rc.querySelector('#btn-scan-another')?.addEventListener('click', () => {
          resetToLiveCamera();
          rc.innerHTML = '';
        });
      }
    });

    // Save Barcode Log
    container.querySelector('#btn-save-barcode')?.addEventListener('click', () => {
      if (!analysisResult) return;
      const grams = Number(container.querySelector('#barcode-grams-input')?.value) || 100;
      const scaled = scaleNutrients(analysisResult.per100, grams);
      const meal = store.addMeal({
        name: `${analysisResult.name} (${grams}g)`,
        kcal: scaled.kcal,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        weight_g: grams,
        thumb: analysisResult.image || '',
      });
      toast(`${analysisResult.name} saved!`, 'success');
      onMealLogged(meal);
      resetToLiveCamera();
      analysisResult = null;
      updateResultsUI();
    });

    // OCR Save / Edit
    container.querySelector('#btn-ocr-save')?.addEventListener('click', () => {
      if (!analysisResult) return;
      const d = analysisResult.perServing.kcal ? analysisResult.perServing : analysisResult.per100;
      const meal = store.addMeal({
        name: analysisResult.name,
        kcal: d.kcal,
        protein: d.protein,
        carbs: d.carbs,
        fat: d.fat,
        weight_g: analysisResult.servingSize || 100,
        thumb: capturedImage?.thumb || capturedImage?.dataUrl || '',
      });
      toast(`${analysisResult.name} saved!`, 'success');
      onMealLogged(meal);
      resetToLiveCamera();
      analysisResult = null;
      updateResultsUI();
    });

    container.querySelector('#btn-ocr-edit')?.addEventListener('click', () => {
      if (!analysisResult) return;
      const d = analysisResult.perServing.kcal ? analysisResult.perServing : analysisResult.per100;
      openMealEditor(
        {
          name: analysisResult.name,
          kcal: d.kcal,
          protein: d.protein,
          carbs: d.carbs,
          fat: d.fat,
          weight_g: analysisResult.servingSize || 100,
          thumb: capturedImage?.thumb || capturedImage?.dataUrl,
        },
        {
          title: 'Adjust Label Portion',
          onSaved: () => {
            analysisResult = null;
            resetToLiveCamera();
            updateResultsUI();
          },
        }
      );
    });
  }

  // Pengendali bila pengguna beralih antara aplikasi/tab
  const onVisibility = () => {
    if (document.visibilityState === 'visible' && !stream && cameraState !== 'denied') {
      startCamera();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  render();

  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    stopCamera();
  };
}
