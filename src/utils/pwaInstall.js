// CalMal PWA Install Manager & Guide
import { openSheet, toast } from '../components/ui.js';
import { getLang } from './i18n.js';

let deferredPrompt = null;
let isInstalled = false;
const listeners = new Set();

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    (typeof document !== 'undefined' && document.referrer.includes('android-app://'))
  );
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function canNativePrompt() {
  return Boolean(deferredPrompt);
}

export function initPwaInstall() {
  if (typeof window === 'undefined') return;

  isInstalled = isStandalone();

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    isInstalled = true;
    notifyListeners();
    toast(getLang() === 'en' ? 'CalMal installed successfully!' : 'CalMal berjaya dipasang!', 'success');
  });
}

export function subscribeInstallState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn({ isInstalled: isStandalone(), canPrompt: Boolean(deferredPrompt) });
    } catch (_) {}
  });
}

export async function promptInstall() {
  const isEn = getLang() === 'en';

  if (isStandalone()) {
    toast(
      isEn
        ? 'CalMal is already running from your Home Screen!'
        : 'CalMal sudah dipasang dan dibuka dari Skrin Utama!',
      'info'
    );
    return;
  }

  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        toast(
          isEn
            ? 'CalMal installed to your Home Screen!'
            : 'CalMal berjaya dipasang ke Skrin Utama!',
          'success'
        );
      }
      deferredPrompt = null;
      notifyListeners();
      return;
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
  }

  // Fallback or iOS Safari: Open Visual Step-by-Step Install Guide Sheet
  openInstallGuideSheet();
}

export function openInstallGuideSheet() {
  const isEn = getLang() === 'en';
  const ios = isIOS();

  openSheet(`
    <div class="guide-modal-sheet install-modal-sheet">
      <div class="center" style="margin-bottom:14px">
        <img src="/calmal-logo.png" alt="CalMal Logo" style="width:58px;height:58px;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.15);object-fit:cover;margin:0 auto 10px" />
        <div class="row" style="gap:6px;align-items:center;justify-content:center;margin-bottom:4px">
          <span class="badge ok">${isEn ? 'Home Screen App' : 'Aplikasi Skrin Utama'}</span>
          <span class="xs muted">PWA Standalone</span>
        </div>
        <h3 style="font-size:18px;font-weight:800;color:#fff;margin:0;line-height:1.3">
          ${isEn ? 'Install CalMal to Home Screen' : 'Pasang CalMal ke Skrin Utama'}
        </h3>
        <p class="xs muted" style="margin:4px auto 0;max-width:340px;line-height:1.4">
          ${isEn
            ? 'Enjoy seamless full-screen view, faster startup, and offline nutrition tracking without browser address bars.'
            : 'Nikmati paparan skrin penuh tanpa bar pelayar, capaian pantas, dan sokongan luar talian terus dari telefon anda.'}
        </p>
      </div>

      <div class="guide-modal-steps" style="margin:12px 0 16px">
        ${
          ios
            ? `
            <div class="guide-modal-step-item">
              <div class="guide-step-num">1</div>
              <div class="guide-step-text">
                <b style="color:#fff">${isEn ? 'Tap the Share icon' : 'Sentuh butang Kongsi (Share)'}</b>
                <div class="xs muted" style="margin-top:2px">${isEn ? 'Look for the square icon with an upward arrow in Safari’s bottom toolbar.' : 'Cari ikon kotak beranak panah ke atas di bar bawah Safari.'}</div>
              </div>
            </div>
            <div class="guide-modal-step-item">
              <div class="guide-step-num">2</div>
              <div class="guide-step-text">
                <b style="color:#fff">${isEn ? 'Select "Add to Home Screen"' : 'Pilih "Tambah ke Skrin Utama"'}</b>
                <div class="xs muted" style="margin-top:2px">${isEn ? 'Scroll down the share menu and tap the [+] Add to Home Screen option.' : 'Tatal menu ke bawah dan sentuh pilihan bertanda [+] Tambah ke Skrin Utama.'}</div>
              </div>
            </div>
            <div class="guide-modal-step-item">
              <div class="guide-step-num">3</div>
              <div class="guide-step-text">
                <b style="color:#fff">${isEn ? 'Tap "Add" in Top-Right' : 'Sentuh "Tambah" (Add) di atas kanan'}</b>
                <div class="xs muted" style="margin-top:2px">${isEn ? 'CalMal icon will appear on your Home Screen. Tap it to launch full-screen!' : 'Ikon CalMal akan muncul di Skrin Utama anda. Sentuh untuk mula guna!'}</div>
              </div>
            </div>
          `
            : `
            <div class="guide-modal-step-item">
              <div class="guide-step-num">1</div>
              <div class="guide-step-text">
                <b style="color:#fff">${isEn ? 'Open Browser Menu' : 'Buka Menu Pelayar'}</b>
                <div class="xs muted" style="margin-top:2px">${isEn ? 'Tap the 3 dots (⋮) in the top-right or bottom of your browser.' : 'Sentuh ikon 3 titik (⋮) di penjuru pelayar anda.'}</div>
              </div>
            </div>
            <div class="guide-modal-step-item">
              <div class="guide-step-num">2</div>
              <div class="guide-step-text">
                <b style="color:#fff">${isEn ? 'Select "Install app" or "Add to Home screen"' : 'Pilih "Pasang aplikasi" atau "Tambah ke Skrin Utama"'}</b>
                <div class="xs muted" style="margin-top:2px">${isEn ? 'Tap to confirm installation on your device.' : 'Sentuh untuk mengesahkan pemasangan pada peranti anda.'}</div>
              </div>
            </div>
            <div class="guide-modal-step-item">
              <div class="guide-step-num">3</div>
              <div class="guide-step-text">
                <b style="color:#fff">${isEn ? 'Launch CalMal App' : 'Lancarkan Aplikasi CalMal'}</b>
                <div class="xs muted" style="margin-top:2px">${isEn ? 'Access CalMal anytime directly from your home screen apps.' : 'Buka CalMal bila-bila masa terus dari senarai aplikasi telefon anda.'}</div>
              </div>
            </div>
          `
        }
      </div>

      <button type="button" class="btn btn-primary btn-block" data-close>
        <span>${isEn ? 'Got It' : 'Faham'}</span>
      </button>
    </div>
  `);
}
