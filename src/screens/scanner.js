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
    'nasi separuh',
    'minyak sikit',
    'kuah banjir',
    'ayam bahagian dada',
    'kurang manis',
    'tanpa kulit',
    'sayur lebih',
    'sambal asing',
  ];

  function render() {
    onScanModeUsed(mode);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <span class="eyebrow">Pengimbas 3-dalam-1 · Kamera Sentiasa Aktif</span>
          <h1 class="page-title">Imbas & Analisis</h1>
        </div>
      </div>

      <!-- Segmented Mod Pengimbas -->
      <div class="segmented" id="scanner-mode-tabs" style="margin-bottom:16px">
        <button type="button" data-m="food" class="${mode === 'food' ? 'active' : ''}">
          ${icons.camera}
          <span>AI Makanan</span>
        </button>
        <button type="button" data-m="barcode" class="${mode === 'barcode' ? 'active' : ''}">
          ${icons.barcode}
          <span>Kod Bar</span>
        </button>
        <button type="button" data-m="ocr" class="${mode === 'ocr' ? 'active' : ''}">
          ${icons.label}
          <span>Label OCR</span>
        </button>
      </div>

      <!-- Bahagian Kamera / Pratonton (Kekal dalam DOM tanpa musnah) -->
      <div class="card flat" style="padding:14px;background:#0d0d0e;margin-bottom:14px">
        <div class="scanner-viewport" id="viewport-box">
          <video id="scanner-video" class="scanner-video" autoplay playsinline webkit-playsinline muted></video>
          <img id="scanner-preview-img" class="preview-thumb hidden" alt="Pratonton imej" />

          <!-- Lapisan Penunjuk Status Kamera Sentiasa Aktif -->
          <div id="camera-status-hud" class="hidden" style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:center;z-index:16;pointer-events:none">
            <span class="badge ok" style="font-size:11px;padding:4px 9px;background:rgba(28,28,30,0.85);backdrop-filter:blur(8px);border:1px solid rgba(61,220,151,0.3);pointer-events:auto">
              <span class="dot" style="background:var(--ok);width:6px;height:6px"></span>
              Kamera Aktif
            </span>
            <span id="camera-facing-badge" class="badge" style="font-size:11px;padding:4px 9px;background:rgba(28,28,30,0.85);backdrop-filter:blur(8px);pointer-events:auto">
              ${facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
            </span>
          </div>

          <!-- Lapisan Viewfinder (apabila kamera aktif) -->
          <div id="camera-viewfinder" class="scanner-overlay hidden">
            <div id="viewfinder-shape" class="${mode === 'food' ? 'viewfinder-box' : mode === 'barcode' ? 'viewfinder-barcode' : 'viewfinder-label'}">
              ${mode === 'barcode' ? '<div class="viewfinder-laser"></div>' : ''}
            </div>
          </div>

          <!-- Skrin Permintaan / Ralat Kebenaran Kamera Mobile -->
          <div id="camera-perm-overlay" class="camera-permission-overlay hidden" style="position:absolute;inset:0;background:rgba(13,13,14,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px;text-align:center;z-index:22">
            <div style="width:52px;height:52px;border-radius:16px;background:var(--surface-3);display:grid;place-items:center;color:#fff;margin-bottom:12px">
              ${icons.camera}
            </div>
            <b style="font-size:16px;color:#fff;margin-bottom:4px">Kamera Mobile</b>
            <p id="camera-perm-msg" class="small muted" style="line-height:1.45;margin-bottom:16px;max-width:300px">
              Sila benarkan akses kamera pelayar untuk mengimbas makanan secara automatik.
            </p>
            <div class="stack" style="gap:8px;width:100%;max-width:280px">
              <button type="button" class="btn btn-primary btn-sm btn-block" id="btn-request-cam-perm">
                ${icons.camera}
                <span>Benarkan Akses Kamera</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-block" id="btn-open-native-cam">
                ${icons.image}
                <span>Buka Kamera Telefon Pintar</span>
              </button>
            </div>
          </div>

          <!-- Spinner Analisis AI -->
          <div id="camera-spinner" class="hidden" style="position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:20">
            <div class="spinner" style="width:36px;height:36px;border-width:3.5px"></div>
            <b style="color:#fff;font-size:15px">Gemini 3.5 Flash Lite menganalisis...</b>
            <span class="small muted">Mengenal pasti masakan & nutrisi tempatan</span>
          </div>
        </div>

        <!-- Kawalan Shutter, Muat Naik Galeri & Tukar Kamera -->
        <div class="scanner-controls">
          <input type="file" id="file-input" accept="image/*" class="hidden" />
          <input type="file" id="file-input-native" accept="image/*" capture="environment" class="hidden" />

          <button type="button" class="btn btn-icon btn-ghost" id="btn-upload-gallery" title="Pilih dari Galeri" aria-label="Pilih imej dari galeri">
            ${icons.image}
          </button>

          <button type="button" class="shutter-btn" id="btn-shutter" title="Tangkap Gambar" aria-label="Tangkap gambar"></button>

          <button type="button" class="btn btn-icon btn-ghost" id="btn-switch-cam" title="Tukar Kamera Depan / Belakang" aria-label="Tukar kamera depan/belakang">
            ${icons.refresh}
          </button>
        </div>
      </div>

      <!-- Quick Context Chips (Mod AI Makanan) -->
      <div id="food-chips-section" class="card stack ${mode === 'food' ? '' : 'hidden'}" style="margin-bottom:14px">
        <div class="card-title">
          <span>Nota Konteks Pantas (Portion Fine-Tuning)</span>
          <span class="xs muted">Pilihan</span>
        </div>
        <div class="chips" id="quick-chips-box">
          ${QUICK_CHIPS.map(
            (c) =>
              `<button type="button" class="chip ${selectedChips.has(c) ? 'active' : ''}" data-chip="${c}">+ ${c}</button>`
          ).join('')}
        </div>
        <input class="input" id="custom-context-input" value="${esc(customContextNote)}" placeholder="cth. Ayam bahagian dada, nasi separuh, sambal asing..." />
      </div>

      <!-- Carian Manual Kod Bar -->
      <div id="barcode-manual-section" class="card stack ${mode === 'barcode' ? '' : 'hidden'}" style="margin-bottom:14px">
        <div class="card-title"><span>Carian Manual Kod Bar</span></div>
        <div class="row">
          <input class="input num" id="manual-barcode-input" placeholder="Masukkan nombor kod bar (cth. 9556001...)" />
          <button type="button" class="btn btn-secondary" id="btn-lookup-barcode">Cari</button>
        </div>
      </div>

      <!-- Keputusan Analisis AI / Produk -->
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
      facingBadge.textContent = facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan';
    }

    if (state === 'active') {
      hud?.classList.remove('hidden');
      vf?.classList.remove('hidden');
      perm?.classList.add('hidden');
    } else if (state === 'denied' || state === 'error') {
      hud?.classList.add('hidden');
      vf?.classList.add('hidden');
      perm?.classList.remove('hidden');
      if (msgEl) msgEl.textContent = errorMsg || 'Sila benarkan akses kamera untuk imbasan automatik.';
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
              <span class="eyebrow" style="display:block;margin-bottom:2px">Hasil Analisis AI</span>
              <h2 style="font-size:22px;font-weight:800">${esc(r.name)}</h2>
            </div>
            ${statusBadge(r.recommendation.status)}
          </div>

          <div class="equation">
            <div class="eq-cell">
              <span>Kalori</span>
              <b class="num">${r.kcal}</b>
              <span class="xs muted">kcal</span>
            </div>
            <div class="eq-cell">
              <span>Berat Anggaran</span>
              <b class="num">${r.weight_g}</b>
              <span class="xs muted">gram</span>
            </div>
            <div class="eq-cell">
              <span>Protein</span>
              <b class="num">${round1(r.protein)}</b>
              <span class="xs muted">gram</span>
            </div>
          </div>

          <div class="grid grid-2" style="font-size:13px;padding:8px 0">
            <div>Karbohidrat: <b>${round1(r.carbs)}g</b></div>
            <div>Lemak: <b>${round1(r.fat)}g</b></div>
          </div>

          ${
            r.items && r.items.length
              ? `<div class="divider"></div>
                 <div class="stack" style="gap:8px">
                   <span class="small bold muted">Pecahan Hidangan:</span>
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
              ? `<p class="small muted" style="margin:4px 0;line-height:1.4"><b>Cadangan Porsi:</b> ${esc(r.recommendation.adjustment)}</p>`
              : ''
          }

          ${r.recommendation.deku ? companionBubble('deku', r.recommendation.deku, { compact: true }) : ''}
          ${r.recommendation.bakugou ? companionBubble('bakugou', r.recommendation.bakugou, { compact: true }) : ''}

          <div class="grid grid-2" style="margin-top:10px">
            <button type="button" class="btn btn-secondary" id="btn-quick-edit">
              ${icons.edit}
              <span>Laras Porsi</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-save-log">
              ${icons.check}
              <span>Simpan ke Log</span>
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
              <span class="eyebrow">${esc(p.brand || 'Produk')}</span>
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
              <span>Karbo / Lemak</span>
              <b class="num">${round1(p.per100.carbs)} / ${round1(p.per100.fat)}g</b>
            </div>
          </div>

          <div class="field" style="margin-top:8px">
            <label for="barcode-grams-input">Saiz hidangan yang anda makan (gram):</label>
            <div class="input-suffix">
              <input class="input num" id="barcode-grams-input" type="number" value="${p.servingSize || 100}" />
              <span>g</span>
            </div>
          </div>

          <button type="button" class="btn btn-primary btn-block" id="btn-save-barcode">
            ${icons.plus}
            <span>Simpan ke Log Makanan</span>
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
              <span class="eyebrow">OCR Label Nutrisi</span>
              <h2 style="font-size:20px;font-weight:800">${esc(r.name)}</h2>
            </div>
            ${statusBadge(r.recommendation.status)}
          </div>

          <div class="equation">
            <div class="eq-cell">
              <span>Per Hidangan</span>
              <b class="num">${r.perServing.kcal || r.per100.kcal}</b>
              <span class="xs muted">kcal</span>
            </div>
            <div class="eq-cell">
              <span>Protein</span>
              <b class="num">${round1(r.perServing.protein || r.per100.protein)}g</b>
            </div>
            <div class="eq-cell">
              <span>Gula / Natrium</span>
              <b class="num">${round1(r.perServing.sugar || 0)}g / ${int(r.perServing.sodium || 0)}mg</b>
            </div>
          </div>

          ${r.recommendation.deku ? companionBubble('deku', r.recommendation.deku, { compact: true }) : ''}
          ${r.recommendation.bakugou ? companionBubble('bakugou', r.recommendation.bakugou, { compact: true }) : ''}

          <div class="grid grid-2" style="margin-top:8px">
            <button type="button" class="btn btn-secondary" id="btn-ocr-edit">
              ${icons.edit}
              <span>Laras Porsi</span>
            </button>
            <button type="button" class="btn btn-primary" id="btn-ocr-save">
              ${icons.check}
              <span>Simpan ke Log</span>
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

  // ----------------- Pengurusan Kamera WebRTC & Mobile -----------------
  async function startCamera() {
    const video = container.querySelector('#scanner-video');
    if (!video) return;

    // Semakan Konteks Selamat (HTTPS / Localhost)
    const isSecure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = !isSecure
        ? 'Pelayar menyekat kamera kerana pautan menggunakan HTTP biasa. Sila buka kamera telefon menggunakan butang di bawah atau gunakan sambungan HTTPS (cth. di Vercel).'
        : 'Peranti atau pelayar ini tidak menyokong siaran langsung WebRTC. Sila gunakan kamera telefon pintar di bawah.';
      setCameraUIState('error', err);
      return;
    }

    // Jika stream sedia ada sedang berjalan elok, kekalkan
    if (stream && stream.active && video.srcObject === stream) {
      setCameraUIState('active');
      setupBarcodeReaderIfNeeded(video);
      return;
    }

    stopCamera();

    // Persediaan atribut wajib iOS Safari & Android WebKit
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    try {
      setCameraUIState('starting');

      // Strategi Fallback Bertingkat (Mencegah OverconstrainedError pada pelbagai jenis telefon)
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

      video.onloadedmetadata = () => {
        const p = video.play();
        if (p !== undefined) {
          p.catch((e) => console.warn('video.play() tertangguh:', e));
        }
        setCameraUIState('active');
        setupBarcodeReaderIfNeeded(video);
      };
    } catch (e) {
      console.warn('Ralat capaian kamera mobile:', e);
      let msg = '';
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        msg = 'Kebenaran kamera disekat oleh pelayar. Tekan "Benarkan Akses Kamera" atau buka tetapan laman pelayar telefon anda dan pilih Allow.';
        setCameraUIState('denied', msg);
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        msg = 'Tiada perkakasan kamera ditemui pada peranti ini.';
        setCameraUIState('error', msg);
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        msg = 'Kamera sedang digunakan oleh aplikasi lain. Sila tutup aplikasi kamera lain dan tekan cuba lagi.';
        setCameraUIState('error', msg);
      } else {
        msg = e.message || 'Kamera tidak dapat dimulakan. Anda boleh menggunakan kamera telefon terus di bawah.';
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
    if (zxingReader) return; // sudah aktif

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
      console.warn('Gagal memulakan pengimbas kod bar:', e);
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

  async function captureFrame() {
    const video = container.querySelector('#scanner-video');
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const full = canvas.toDataURL('image/jpeg', 0.85);
    const thumbCanvas = document.createElement('canvas');
    const sc = Math.min(1, 180 / Math.max(canvas.width, canvas.height));
    thumbCanvas.width = Math.round(canvas.width * sc);
    thumbCanvas.height = Math.round(canvas.height * sc);
    thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const thumb = thumbCanvas.toDataURL('image/jpeg', 0.6);

    return {
      dataUrl: full,
      base64: full.split(',')[1],
      mime: 'image/jpeg',
      thumb,
    };
  }

  async function processFoodScan(imgObj) {
    setAnalyzing(true);
    try {
      const allNotes = [...selectedChips, customContextNote].filter(Boolean).join(', ');
      const res = await analyzeFood({ image: imgObj, note: allNotes });
      analysisResult = res;
      capturedImage = imgObj;
      toast(`AI mengecam: ${res.name}`, 'success');
      updateResultsUI();
      container.querySelector('#results-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      toast(err.message || 'Gagal menganalisis makanan.', 'error');
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
      toast(`Label dibaca: ${res.name}`, 'success');
      updateResultsUI();
      container.querySelector('#results-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      toast(err.message || 'Gagal membaca label pemakanan.', 'error');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleBarcodeFound(code) {
    toast(`Kod bar dikesan: ${code}`, 'info');
    try {
      const prod = await lookupBarcode(code);
      analysisResult = prod;
      updateResultsUI();
      toast(`Produk dijumpai: ${prod.name}`, 'success');
    } catch (err) {
      toast(err.message || 'Produk tidak ditemui.', 'error');
    }
  }

  function bindEvents() {
    // 1. Tukar Tab Mod (Kekalkan stream kamera tanpa restart hardware)
    container.querySelectorAll('#scanner-mode-tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        mode = b.dataset.m;
        analysisResult = null;
        updateResultsUI();

        container.querySelectorAll('#scanner-mode-tabs button').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.m === mode);
        });

        updateViewfinder();

        // Tunjukkan bahagian berkaitan
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
      });
    });

    // 3. Nota teks
    container.querySelector('#custom-context-input')?.addEventListener('input', (e) => {
      customContextNote = e.target.value;
    });

    // 4. Butang Shutter (Tangkap Gambar)
    container.querySelector('#btn-shutter')?.addEventListener('click', async () => {
      const img = await captureFrame();
      if (!img) {
        // Jika kamera WebRTC belum bersedia atau disekat, buka kamera peranti mobile secara terus
        container.querySelector('#file-input-native')?.click();
        return;
      }
      if (mode === 'food') processFoodScan(img);
      else if (mode === 'ocr') processOcrScan(img);
      else if (mode === 'barcode') {
        toast('Arahkan kod bar ke garisan merah untuk imbasan automatik.', 'info');
      }
    });

    // 5. Tukar Kamera Depan / Belakang
    container.querySelector('#btn-switch-cam')?.addEventListener('click', async () => {
      facingMode = facingMode === 'environment' ? 'user' : 'environment';
      store.saveSettings({ cameraFacing: facingMode });
      toast(`Kamera ditukar: ${facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}`, 'info');
      stopCamera();
      await startCamera();
    });

    // 6. Minta Kebenaran Kamera Semula
    container.querySelector('#btn-request-cam-perm')?.addEventListener('click', async () => {
      await startCamera();
    });

    // 7. Buka Kamera Telefon Pintar Asli (Fallback yang 100% berfungsi walaupun tanpa HTTPS)
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
        toast('Gagal memproses gambar kamera.', 'error');
      }
    });

    // 8. Muat Naik Galeri
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
        toast('Gagal memproses fail imej.', 'error');
      }
    });

    // 9. Carian Manual Kod Bar
    container.querySelector('#btn-lookup-barcode')?.addEventListener('click', () => {
      const code = container.querySelector('#manual-barcode-input')?.value.trim();
      if (code) handleBarcodeFound(code);
    });

    bindResultEvents();
  }

  function bindResultEvents() {
    // Quick Edit & Simpan Log AI Makanan
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
          title: 'Quick Edit Hidangan',
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
      toast(`${analysisResult.name} berjaya disimpan ke log!`, 'success');
      onMealLogged(meal);
      analysisResult = null;
      updateResultsUI();
    });

    // Simpan Kod Bar
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
      toast(`${analysisResult.name} disimpan!`, 'success');
      onMealLogged(meal);
      analysisResult = null;
      updateResultsUI();
    });

    // OCR Simpan / Edit
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
      toast(`${analysisResult.name} disimpan!`, 'success');
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
          title: 'Laras Porsi Label',
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
