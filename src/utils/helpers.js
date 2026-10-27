// Utiliti umum DOM, tarikh & imej

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function fmtDate(iso, opts = { day: 'numeric', month: 'short' }) {
  return new Date(iso).toLocaleDateString('en-US', opts);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export function mealTypeNow() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'Breakfast';
  if (h >= 11 && h < 16) return 'Lunch';
  if (h >= 18 && h < 23) return 'Dinner';
  return 'Snack';
}

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
export const int = (n) => Math.round(Number(n) || 0);
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

/** Mampatkan fail imej → JPEG base64 (untuk Gemini) + lakaran kecil (untuk log). Sokong iPhone, Android & desktop. */
export async function compressImage(file, maxDim = 1024, quality = 0.82) {
  if (!file) throw new Error('No image file provided');

  // Jika sudah sedia dalam format objek imej { dataUrl, base64 }
  if (file && typeof file === 'object' && file.base64 && file.dataUrl) {
    return file;
  }

  let width = 0;
  let height = 0;
  let source = null;

  // 1. Cuba createImageBitmap terlebih dahulu (cepat, cekap memori & auto-orientasi EXIF)
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      width = bmp.width;
      height = bmp.height;
      source = bmp;
    } catch (e) {
      // Abaikan jika format tidak disokong secara terus oleh createImageBitmap
    }
  }

  // 2. Fallback kepada FileReader + Image()
  if (!source) {
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error('Gagal membaca fail gambar daripada peranti.'));
      r.readAsDataURL(file);
    });

    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Format gambar tidak dapat dinyahkod. Sila pilih gambar JPEG/PNG atau gunakan kamera peranti.'));
      i.src = dataUrl;
    });

    width = img.width || 800;
    height = img.height || 600;
    source = img;
  }

  const draw = (max, q) => {
    const scale = Math.min(1, max / Math.max(width, height, 1));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(width * scale));
    c.height = Math.max(1, Math.round(height * scale));
    const ctx = c.getContext('2d');
    ctx.drawImage(source, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  };

  const full = draw(maxDim, quality);
  const thumb = draw(180, 0.6);

  // Tutup bitmap jika perlu untuk elak kebocoran memori pada telefon mudah alih
  if (source && typeof source.close === 'function') {
    try { source.close(); } catch {}
  }

  return {
    dataUrl: full,
    base64: full.split(',')[1],
    mime: 'image/jpeg',
    thumb,
  };
}

export function debounce(fn, ms = 300) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export function animateNumber(el, to, { duration = 900, decimals = 0 } = {}) {
  if (!el) return;
  const from = Number(el.dataset.v || 0);
  el.dataset.v = to;
  const start = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - start) / duration);
    const e = 1 - Math.pow(1 - p, 3);
    const v = from + (to - from) * e;
    el.textContent = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
