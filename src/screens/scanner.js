// Skrin Pengimbas 3-dalam-1 (pelan §3.1 & §3.3): AI Makanan, Kod Bar & OCR Label (Dioptimumkan Penuh untuk Mobile)
import { BrowserMultiFormatReader } from '@zxing/browser';
import { icons } from '../components/icons.js';
import { toast, statusBadge } from '../components/ui.js';
import { analyzeFood, readNutritionLabel } from '../services/gemini.js';
import { lookupBarcode, scaleNutrients } from '../services/openFoodFacts.js';
import { compressImage, esc, round1, int } from '../utils/helpers.js';
import { companionBubble } from '../components/companion.js';
import { openMealEditor } from '../components/mealEditor.js';
import { onScanModeUsed, onMealLogged } from '../services/companionService.js';
import { store } from '../services/store.js';

export function renderScanner(container) {
  let mode = 'food'; // 'food' | 'barcode' | 'ocr'
  let stream = null;
  let zxingReader = null;
  let capturedImage = null; // { dataUrl, base64, mime, thumb }
  let isAnalyzing = false;
  let analysisResult = null;
  let selectedChips = new Set();
  let customContextNote = '';

  let cameraState = 'starting'; // 'starting' | 'active' | 'denied' | 'error'
  let cameraErrorMessage = '';
  let facingMode = store.settings.cameraFacing || 'environment'; // 'environment' | 'user'

  const QUICK_CHIPS = [
    'Nasi separuh (half rice)',
    'Kurang minyak (less oil)',
    'Kuah banjir (extra gravy)',
    'Kuah asing (gravy on side)',
    'Ayam dada (chicken breast)',
    'Kurang manis (less sweet)',
    'Tanpa kulit (skinless)',
    'Sambal asing (sambal on side)',
    'Telur rebus (boiled egg)',
    'Sayur lebih (extra veggies)',
  ];

  function render() {
    onScanModeUsed(mode);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <span class="eyebrow">3-in-1 Scanner · Continuous Live Camera</span>
          <h1 class="page-title">Scan & Analyze</h1>
        </div>
      </div>

      <!-- Scanner Mode Segmented Tabs -->
      <div class="segmented" id="scanner-mode-tabs" style="margin-bottom:16px">
        <button type="button" data-m="food" class="${mode === 'food' ? 'active' : ''}">
          ${icons.camera}
          <span>Food AI</span>
        </button>
        <button type="button" data-m="barcode" class="${mode === 'barcode' ? 'active' : ''}">
          ${icons.barcode}
          <span>Barcode</span>
        </button>
        <button type="button" data-m="ocr" class="${mode === 'ocr' ? 'active' : ''}">
          ${icons.label}
          <span>Label OCR</span>
        </button>
      </div>

      <!-- Camera Viewport / Preview Box -->
      <div class="card flat" style="padding:14px;background:#0d0d0e;margin-bottom:14px">
        <div class="scanner-viewport" id="viewport-box">
          <video id="scanner-video" class="scanner-video" autoplay playsinline webkit-playsinline muted></video>
          <img id="scanner-preview-img" class="preview-thumb hidden" alt="Image preview" />

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
                <span>Enable Camera Access</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-block" id="btn-open-native-cam">
                ${icons.image}
                <span>Open Device Camera</span>
              </button>
            </div>
          </div>

          <!-- AI Analysis Spinner -->
          <div id="camera-spinner" class="hidden" style="position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:20">
            <div class="spinner" style="width:36px;height:36px;border-width:3.5px"></div>
            <b style="color:#fff;font-size:15px">Gemini 3.5 Flash Lite analyzing...</b>
            <span class="small muted">Identifying dishes, portions & nutrition</span>
          </div>
        </div>

        <!-- Shutter, Gallery Upload & Camera Switch Controls -->
        <div class="scanner-controls">
          <input type="file" id="file-input" accept="image/*" class="hidden" />
          <input type="file" id="file-input-native" accept="image/*" capture="environment" class="hidden" />

          <button type="button" class="btn btn-icon btn-ghost" id="btn-upload-gallery" title="Upload from Gallery" aria-label="Upload from gallery">
            ${icons.image}
          </button>

          <button type="button" class="shutter-btn" id="btn-shutter" title="Capture Photo" aria-label="Capture photo"></button>

          <button type="button" class="btn btn-icon btn-ghost" id="btn-switch-cam" title="Switch Front / Back Camera" aria-label="Switch camera">
            ${icons.refresh}
          </button>
        </div>
      </div>

      <!-- Quick Context Chips (Food AI Mode) -->
      <div id="food-chips-section" class="card stack ${mode === 'food' ? '' : 'hidden'}" style="margin-bottom:14px">
        <div class="card-title">
          <span>Quick Context Notes (Portion Fine-Tuning)</span>
          <span class="xs muted">Optional</span>
        </div>
        <div class="chips" id="quick-chips-box">
          ${QUICK_CHIPS.map(
            (c) =>
              `<button type="button" class="chip ${selectedChips.has(c) ? 'active' : ''}" data-chip="${c}">+ ${c}</button>`
          ).join('')}
        </div>
        <input class="input" id="custom-context-input" value="${esc(customContextNote)}" placeholder="e.g. Chicken breast, half rice, sauce on side..." />
      </div>

      <!-- Manual Barcode Search -->
      <div id="barcode-manual-section" class="card stack ${mode === 'barcode' ? '' : 'hidden'}" style="margin-bottom:14px">
        <div class="card-title"><span>Manual Barcode Search</span></div>
        <div class="row">
          <input class="input num" id="manual-barcode-input" placeholder="Enter barcode number (e.g. 9556001...)" />
          <button type="button" class="btn btn-secondary" id="btn-lookup-barcode">Search</button>
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
    const hud = container.querySelector('#camera-status-hud');
    const vf = container.querySelector('#camera-viewfinder');
    const perm = container.querySelector('#camera-perm-overlay');
    const msgEl = container.querySelector('#camera-perm-msg');
    const facingBadge = container.querySelector('#camera-facing-badge');

    if (facingBadge) {
      facingBadge.textContent = facingMode === 'environment' ? 'Back Camera' : 'Front Camera';
    }

    if (state === 'active') {
      hud?.classList.remove('hidden');
      vf?.classList.remove('hidden');
      perm?.classList.add('hidden');
    } else if (state === 'denied' || state === 'error') {
      hud?.classList.add('hidden');
      vf?.classList.add('hidden');
      perm?.classList.remove('hidden');
      if (msgEl) msgEl.textContent = errorMsg || 'Please allow camera access for automatic scanning.';
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

  function setAnalyzing(loading) {
    isAnalyzing = loading;
    const sp = container.querySelector('#camera-spinner');
    if (sp) sp.classList.toggle('hidden', !loading);
  }

  function renderResultHTML() {
    if (!analysisResult) return '';

    if (mode === 'food') {
      const r = analysisResult;
      return `
        <div class="card stack fade-up" style="margin-top:14px">
          <div class="card-title row between">
            <div>
              <span class="eyebrow" style="display:block;margin-bottom:2px">AI Analysis Result</span>
              <h2 style="font-size:22px;font-weight:800">${esc(r.name)}</h2>
            </div>
            ${statusBadge(r.recommendation.status)}
          </div>

          <div class="equation">
            <div class="eq-cell">
              <span>Calories</span>
              <b class="num">${r.kcal}</b>
              <span class="xs muted">kcal</span>
            </div>
            <div class="eq-cell">
              <span>Est. Weight</span>
              <b class="num">${r.weight_g}</b>
              <span class="xs muted">grams</span>
            </div>
            <div class="eq-cell">
              <span>Protein</span>
              <b class="num">${round1(r.protein)}</b>
              <span class="xs muted">grams</span>
            </div>
          </div>

          <div class="grid grid-2" style="font-size:13px;padding:8px 0">
            <div>Carbohydrates: <b>${round1(r.carbs)}g</b></div>
            <div>Fat: <b>${round1(r.fat)}g</b></div>
          </div>

          ${
            r.items && r.items.length
              ? `<div class="divider"></div>
                 <div class="stack" style="gap:8px">
                   <span class="small bold muted">Dish Breakdown:</span>
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
              ? `<p class="small muted" style="margin:4px 0;line-height:1.4"><b>Portion Recommendation:</b> ${esc(r.recommendation.adjustment)}</p>`
              : ''
          }

          ${r.recommendation.deku ? companionBubble('deku', r.recommendation.deku, { compact: true }) : ''}
          ${r.recommendation.bakugou ? companionBubble('bakugou', r.recommendation.bakugou, { compact: true }) : ''}

          <div class="grid grid-2" style="margin-top:10px">
            <button type="button" class="btn btn-secondary" id="btn-quick-edit">
              ${icons.edit}
              <span>Adjust Portion</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-save-log">
              ${icons.check}
              <span>Save to Log</span>
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
              <span class="eyebrow">${esc(p.brand || 'Product')}</span>
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
              <span>Protein</span>
              <b class="num">${round1(p.per100.protein)}g</b>
            </div>
            <div class="eq-cell">
              <span>Carbs / Fat</span>
              <b class="num">${round1(p.per100.carbs)} / ${round1(p.per100.fat)}g</b>
            </div>
          </div>

          <div class="field" style="margin-top:8px">
            <label for="barcode-grams-input">Portion size consumed (grams):</label>
            <div class="input-suffix">
              <input class="input num" id="barcode-grams-input" type="number" value="${p.servingSize || 100}" />
              <span>g</span>
            </div>
          </div>

          <button type="button" class="btn btn-primary btn-block" id="btn-save-barcode">
            ${icons.plus}
            <span>Save to Food Log</span>
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
              <span class="eyebrow">Nutrition Label OCR</span>
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
              <span>Protein</span>
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
              <span>Adjust Portion</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-ocr-save">
              ${icons.check}
              <span>Save to Log</span>
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
    if (!video) return;

    // Secure context check (HTTPS / Localhost)
    const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = !isSecure
        ? 'Browser blocked camera because connection is unencrypted HTTP. Open device camera below or use HTTPS (e.g. on Vercel).'
        : 'This device or browser does not support WebRTC streaming. Please use the device camera button below.';
      setCameraUIState('error', err);
      return;
    }

    // Keep existing active stream if healthy
    if (stream && stream.active && video.srcObject === stream) {
      setCameraUIState('active');
      setupBarcodeReaderIfNeeded(video);
      return;
    }

    stopCamera();

    // Required attributes for iOS Safari & Android WebKit
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    try {
      setCameraUIState('starting');

      // Multi-tier Fallback Strategy (prevents OverconstrainedError across phones)
      let mediaStream = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
          },
          audio: false,
        });
      } catch (err1) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode } },
            audio: false,
          });
        } catch (err2) {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      stream = mediaStream;
      video.srcObject = stream;

      const markReady = () => {
        setCameraUIState('active');
        setupBarcodeReaderIfNeeded(video);
      };

      video.onloadedmetadata = () => {
        const p = video.play();
        if (p !== undefined) p.catch(() => {});
        markReady();
      };
      video.oncanplay = markReady;

      const pImmediate = video.play();
      if (pImmediate !== undefined) {
        pImmediate.then(markReady).catch(() => {});
      }

      setTimeout(() => {
        if (stream && stream.active) markReady();
      }, 500);
    } catch (e) {
      console.warn('Mobile camera access error:', e);
      let msg = '';
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Tap "Enable Camera Access" or allow camera in browser site settings.';
        setCameraUIState('denied', msg);
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        msg = 'No camera hardware found on this device.';
        setCameraUIState('error', msg);
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        msg = 'Camera is currently in use by another app. Please close other camera apps and retry.';
        setCameraUIState('error', msg);
      } else {
        msg = e.message || 'Could not start camera. You can use your device camera directly below.';
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
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (zxingReader) {
      try { zxingReader.reset(); } catch {}
      zxingReader = null;
    }
  }

  function captureFrame() {
    const video = container.querySelector('#scanner-video');
    // Ensure video is actively playing and has positive intrinsic video frame data
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    try {
      const w = video.videoWidth;
      const h = video.videoHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);

      const full = canvas.toDataURL('image/jpeg', 0.85);
      const thumbCanvas = document.createElement('canvas');
      const sc = Math.min(1, 180 / Math.max(w, h));
      thumbCanvas.width = Math.round(w * sc);
      thumbCanvas.height = Math.round(h * sc);
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
    setAnalyzing(true);
    try {
      const allNotes = [...selectedChips, customContextNote].filter(Boolean).join(', ');
      const res = await analyzeFood({ image: imgObj, note: allNotes });
      analysisResult = res;
      capturedImage = imgObj;
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
      const res = await readNutritionLabel({ image: imgObj });
      analysisResult = res;
      capturedImage = imgObj;
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

    // 4. Shutter Button (Capture Frame)
    container.querySelector('#btn-shutter')?.addEventListener('click', () => {
      const img = captureFrame();
      if (!img) {
        // Fallback to native mobile device camera synchronously in user gesture
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

    // 6. Request Camera Permission Again
    container.querySelector('#btn-request-cam-perm')?.addEventListener('click', async () => {
      await startCamera();
    });

    // 7. Open Native Smartphone Camera
    const nativeCamInput = container.querySelector('#file-input-native');
    container.querySelector('#btn-open-native-cam')?.addEventListener('click', () => {
      nativeCamInput?.click();
    });

    nativeCamInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const img = await compressImage(file);
        if (mode === 'food') processFoodScan(img);
        else if (mode === 'ocr') processOcrScan(img);
      } catch (err) {
        toast('Failed to process camera image.', 'error');
      }
    });

    // 8. Upload from Gallery
    const fileInput = container.querySelector('#file-input');
    container.querySelector('#btn-upload-gallery')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const img = await compressImage(file);
        if (mode === 'food') processFoodScan(img);
        else if (mode === 'ocr') processOcrScan(img);
      } catch (err) {
        toast('Failed to process image file.', 'error');
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
          thumb: capturedImage?.thumb,
        },
        {
          title: 'Quick Edit Meal',
          onSaved: () => {
            analysisResult = null;
            updateResultsUI();
          },
        }
      );
    });

    container.querySelector('#btn-save-log')?.addEventListener('click', () => {
      if (!analysisResult) return;
      const meal = store.addMeal({
        name: analysisResult.name,
        kcal: analysisResult.kcal,
        protein: analysisResult.protein,
        carbs: analysisResult.carbs,
        fat: analysisResult.fat,
        weight_g: analysisResult.weight_g,
        thumb: capturedImage?.thumb,
      });
      toast(`${analysisResult.name} saved to log!`, 'success');
      onMealLogged(meal);
      analysisResult = null;
      updateResultsUI();
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
        thumb: capturedImage?.thumb,
      });
      toast(`${analysisResult.name} saved!`, 'success');
      onMealLogged(meal);
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
          thumb: capturedImage?.thumb,
        },
        {
          title: 'Adjust Label Portion',
          onSaved: () => {
            analysisResult = null;
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
