// Skrin Pengimbas 3-dalam-1 (pelan §3.1 & §3.3): AI Makanan, Kod Bar & OCR Label
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

  // Tetapan Kamera Sentiasa Aktif (Always On Camera by default)
  let cameraState = 'starting'; // 'starting' | 'active' | 'denied' | 'error'
  let cameraErrorMessage = '';
  let facingMode = store.settings.cameraFacing || 'environment'; // 'environment' (kamera belakang) | 'user' (kamera depan)

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

      <!-- Bahagian Kamera / Pratonton -->
      <div class="card flat" style="padding:14px;background:#0d0d0e;margin-bottom:14px">
        <div class="scanner-viewport" id="viewport-box">
          <video id="scanner-video" class="scanner-video" autoplay playsinline muted></video>
          <img id="scanner-preview-img" class="preview-thumb hidden" alt="Pratonton imej" />

          <!-- Lapisan Penunjuk Status Kamera Sentiasa Aktif -->
          ${
            cameraState === 'active'
              ? `<div style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:center;z-index:16;pointer-events:none">
                  <span class="badge ok" style="font-size:11px;padding:4px 9px;background:rgba(28,28,30,0.85);backdrop-filter:blur(8px);border:1px solid rgba(61,220,151,0.3);pointer-events:auto">
                    <span class="dot" style="background:var(--ok);width:6px;height:6px"></span>
                    Kamera Aktif
                  </span>
                  <span class="badge" style="font-size:11px;padding:4px 9px;background:rgba(28,28,30,0.85);backdrop-filter:blur(8px);pointer-events:auto">
                    ${facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
                  </span>
                </div>`
              : ''
          }

          <!-- Lapisan Viewfinder (apabila kamera aktif) -->
          ${
            cameraState === 'active'
              ? `<div class="scanner-overlay" id="scanner-overlay">
                  ${
                    mode === 'food'
                      ? '<div class="viewfinder-box"></div>'
                      : mode === 'barcode'
                      ? '<div class="viewfinder-barcode"><div class="viewfinder-laser"></div></div>'
                      : '<div class="viewfinder-label"></div>'
                  }
                </div>`
              : ''
          }

          <!-- Skrin Permintaan / Ralat Kebenaran Kamera Mobile -->
          ${
            cameraState === 'denied' || cameraState === 'error'
              ? `<div class="camera-permission-overlay" style="position:absolute;inset:0;background:rgba(13,13,14,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:22px;text-align:center;z-index:22">
                  <div style="width:52px;height:52px;border-radius:16px;background:var(--surface-3);display:grid;place-items:center;color:#fff;margin-bottom:12px">
                    ${icons.camera}
                  </div>
                  <b style="font-size:16px;color:#fff;margin-bottom:4px">Kebenaran Kamera Diperlukan</b>
                  <p class="small muted" style="line-height:1.45;margin-bottom:16px;max-width:300px">
                    ${esc(cameraErrorMessage || 'Sila benarkan akses kamera pelayar untuk mengimbas makanan secara automatik.')}
                  </p>
                  <div class="stack" style="gap:8px;width:100%;max-width:280px">
                    <button type="button" class="btn btn-primary btn-sm btn-block" id="btn-request-cam-perm">
                      ${icons.camera}
                      <span>Benarkan Akses Kamera</span>
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm btn-block" id="btn-open-native-cam">
                      ${icons.image}
                      <span>Buka Kamera Sistem Mobile</span>
                    </button>
                  </div>
                </div>`
              : ''
          }

          <!-- Spinner Analisis AI -->
          ${
            isAnalyzing
              ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,0.75);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:20">
                  <div class="spinner" style="width:36px;height:36px;border-width:3.5px"></div>
                  <b style="color:#fff;font-size:15px">Gemini 3.5 Flash Lite sedang menganalisis...</b>
                  <span class="small muted">Mengenal pasti masakan & nutrisi tempatan</span>
                </div>`
              : ''
          }
        </div>

        <!-- Kawalan Shutter, Muat Naik Galeri & Kamera Mobile -->
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

      <!-- Quick Context Chips & Nota Pengguna (Khusus untuk Mod AI Makanan) -->
      ${
        mode === 'food'
          ? `<div class="card stack" style="margin-bottom:14px">
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
              <input class="input" id="custom-context-input" value="${esc(customContextNote)}" placeholder="cth. Ayam bahagian paha, nasi separuh, sambal lebih..." />
            </div>`
          : ''
      }

      <!-- Mod Manual Kod Bar Jika Tiada Kamera -->
      ${
        mode === 'barcode'
          ? `<div class="card stack" style="margin-bottom:14px">
              <div class="card-title"><span>Carian Manual Kod Bar</span></div>
              <div class="row">
                <input class="input num" id="manual-barcode-input" placeholder="Masukkan nombor kod bar (cth. 9556001...)" />
                <button type="button" class="btn btn-secondary" id="btn-lookup-barcode">Cari</button>
              </div>
            </div>`
          : ''
      }

      <!-- Keputusan Analisis AI / Produk -->
      <div id="results-container">
        ${renderResultSection()}
      </div>
    `;

    bindEvents();
    startCamera();
  }

  function renderResultSection() {
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

          <div class="divider"></div>

          <!-- Cadangan & Ulasan Deku + Bakugou -->
          <div class="stack" style="gap:10px">
            <p class="small" style="color:#d1d1d6;line-height:1.45;background:#0d0d0e;padding:12px;border-radius:12px;border:1px solid var(--border)">
              <b>Cadangan Porsi:</b> ${esc(r.recommendation.adjustment)}
            </p>
            ${r.recommendation.deku ? companionBubble('deku', r.recommendation.deku, { compact: true }) : ''}
            ${r.recommendation.bakugou ? companionBubble('bakugou', r.recommendation.bakugou, { compact: true }) : ''}
          </div>

          <div class="grid grid-2" style="margin-top:10px">
            <button type="button" class="btn btn-secondary" id="btn-quick-edit">
              ${icons.edit}
              <span>Quick Edit</span>
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

  async function startCamera() {
    stopCamera();
    const video = container.querySelector('#scanner-video');
    if (!video) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraState = 'error';
      cameraErrorMessage = 'Pelayar ini tidak menyokong akses kamera terus (WebRTC). Sila gunakan butang kamera sistem mobile.';
      render();
      return;
    }

    try {
      cameraState = 'starting';
      if (mode === 'barcode') {
        zxingReader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const matchedCam = devices.find((d) =>
          facingMode === 'user' ? /front|user/i.test(d.label) : /back|rear|environment/i.test(d.label)
        ) || devices[0];
        const deviceId = matchedCam ? matchedCam.deviceId : undefined;

        await zxingReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
          if (result) {
            zxingReader.reset();
            handleBarcodeFound(result.getText());
          }
        });
        cameraState = 'active';
        cameraErrorMessage = '';
      } else {
        const constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        await video.play();
        cameraState = 'active';
        cameraErrorMessage = '';
      }

      // Pastikan video kelihatan dan tiada penunjuk ralat
      const permOverlay = container.querySelector('.camera-permission-overlay');
      if (permOverlay) permOverlay.remove();
      const statusHud = container.querySelector('.camera-status-hud');
      if (!statusHud) render();
    } catch (e) {
      console.warn('Kamera tidak dapat diakses:', e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        cameraState = 'denied';
        cameraErrorMessage = 'Kebenaran kamera disekat oleh pelayar. Sila ketik "Benarkan Akses Kamera" atau buka tetapan laman pelayar anda dan pilih Allow.';
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        cameraState = 'error';
        cameraErrorMessage = 'Tiada perkakasan kamera ditemui pada peranti ini.';
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        cameraState = 'error';
        cameraErrorMessage = 'Kamera sedang digunakan oleh aplikasi lain. Sila tutup aplikasi kamera lain dan cuba lagi.';
      } else {
        cameraState = 'error';
        cameraErrorMessage = e.message || 'Kamera tidak dapat dihidupkan.';
      }
      render();
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (zxingReader) {
      try { zxingReader.reset(); } catch { /* noop */ }
      zxingReader = null;
    }
  }

  async function captureFrame() {
    const video = container.querySelector('#scanner-video');
    if (!video || !video.videoWidth) return null;

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
    isAnalyzing = true;
    render();

    try {
      const allNotes = [...selectedChips, customContextNote].filter(Boolean).join(', ');
      const res = await analyzeFood({ image: imgObj, note: allNotes });
      analysisResult = res;
      capturedImage = imgObj;
      toast(`AI mengecam: ${res.name}`, 'success');
    } catch (err) {
      toast(err.message || 'Gagal menganalisis makanan.', 'error');
    } finally {
      isAnalyzing = false;
      render();
    }
  }

  async function processOcrScan(imgObj) {
    isAnalyzing = true;
    render();

    try {
      const res = await readNutritionLabel({ image: imgObj });
      analysisResult = res;
      capturedImage = imgObj;
      toast(`Label dibaca: ${res.name}`, 'success');
    } catch (err) {
      toast(err.message || 'Gagal membaca label pemakanan.', 'error');
    } finally {
      isAnalyzing = false;
      render();
    }
  }

  async function handleBarcodeFound(code) {
    toast(`Kod bar dikesan: ${code}`, 'info');
    try {
      const prod = await lookupBarcode(code);
      analysisResult = prod;
      render();
      toast(`Produk dijumpai: ${prod.name}`, 'success');
    } catch (err) {
      toast(err.message || 'Produk tidak ditemui.', 'error');
    }
  }

  function bindEvents() {
    // Tukar Tab Mod
    container.querySelectorAll('#scanner-mode-tabs button').forEach((b) => {
      b.addEventListener('click', () => {
        mode = b.dataset.m;
        analysisResult = null;
        render();
      });
    });

    // Chips
    container.querySelectorAll('#quick-chips-box .chip').forEach((c) => {
      c.addEventListener('click', () => {
        const val = c.dataset.chip;
        if (selectedChips.has(val)) selectedChips.delete(val);
        else selectedChips.add(val);
        c.classList.toggle('active', selectedChips.has(val));
      });
    });

    // Nota teks
    container.querySelector('#custom-context-input')?.addEventListener('input', (e) => {
      customContextNote = e.target.value;
    });

    // Demo Masakan Tempatan (tanpa perlu API key)
    container.querySelector('#btn-demo-food')?.addEventListener('click', () => {
      analysisResult = {
        name: 'Nasi Lemak Ayam Goreng Berempah',
        weight_g: 420,
        kcal: 740,
        protein: 34.5,
        carbs: 78.0,
        fat: 32.0,
        items: [
          { name: 'Nasi santan kukus', weight_g: 160, kcal: 260 },
          { name: 'Ayam goreng berempah', weight_g: 140, kcal: 320 },
          { name: 'Sambal tumis & ikan bilis kacang', weight_g: 70, kcal: 110 },
          { name: 'Telur rebus separuh & timun', weight_g: 50, kcal: 50 },
        ],
        recommendation: {
          status: 'MODERATE',
          adjustment: 'Untuk berat badan anda, hidangan ini menyumbang ~40% sasaran harian. Asingkan kulit ayam jika mahu jimat 90 kcal.',
          deku: 'Midoriya: Analisis selesai! Kandungan protein daripada ayam berempah sangat baik untuk pemulihan otot, tapi awasi lemak tepu santan!',
          bakugou: 'Bakugou: OI! Kalau dah makan nasi lemak berempah macam ni, pastikan kau buka tab Aktiviti petang ni dan bakar balik!',
        },
      };
      toast('Demo masakan dimuatkan!', 'success');
      render();
    });

    // Butang Shutter
    container.querySelector('#btn-shutter')?.addEventListener('click', async () => {
      const img = await captureFrame();
      if (!img) {
        // Jika stream belum aktif atau disekat, buka kamera sistem secara automatik
        container.querySelector('#file-input-native')?.click();
        return;
      }
      if (mode === 'food') processFoodScan(img);
      else if (mode === 'ocr') processOcrScan(img);
    });

    // Tukar Kamera Depan / Belakang
    container.querySelector('#btn-switch-cam')?.addEventListener('click', async () => {
      facingMode = facingMode === 'environment' ? 'user' : 'environment';
      store.saveSettings({ cameraFacing: facingMode });
      toast(`Kamera ditukar: ${facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}`, 'info');
      stopCamera();
      await startCamera();
      render();
    });

    // Minta Kebenaran Kamera Semula
    container.querySelector('#btn-request-cam-perm')?.addEventListener('click', async () => {
      cameraState = 'starting';
      await startCamera();
      render();
    });

    // Buka Kamera Sistem Mobile Asli
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

    // Muat Naik Galeri
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

    // Carian Manual Kod Bar
    container.querySelector('#btn-lookup-barcode')?.addEventListener('click', () => {
      const code = container.querySelector('#manual-barcode-input')?.value.trim();
      if (code) handleBarcodeFound(code);
    });

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
            render();
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
      render();
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
      render();
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
      render();
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
            render();
          },
        }
      );
    });
  }

  // Sentiasa hidupkan semula kamera apabila pengguna kembali ke pelayar mobile
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
