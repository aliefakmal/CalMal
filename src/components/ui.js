// Komponen UI asas: toast, sheet, butang loading, cincin kemajuan, bar makro
import { icons } from './icons.js';
import { esc } from '../utils/helpers.js';

export function toast(message, type = 'info', ms = 3200) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ic = type === 'error' ? icons.close : type === 'success' ? icons.check : icons.sparkles;
  el.innerHTML = `<span style="width:18px;height:18px;display:inline-flex;flex:none">${ic}</span><span>${esc(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, ms);
}

/** Bottom sheet (mudah alih) / dialog tengah (desktop). Pulangkan { el, close } */
export function openSheet(html, { onClose, className = '' } = {}) {
  const root = document.getElementById('overlay-root');
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="sheet ${className}" role="dialog" aria-modal="true"><div class="sheet-grip"></div>${html}</div>`;
  root.appendChild(bd);
  document.body.style.overflow = 'hidden';
  const sheet = bd.querySelector('.sheet');

  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    bd.classList.add('closing');
    document.body.style.overflow = '';
    setTimeout(() => bd.remove(), 240);
    document.removeEventListener('keydown', onKey);
    onClose?.(result);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
  sheet.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => close()));
  return { el: sheet, close };
}

export function confirmSheet({ title, message, confirmText = 'Yes', danger = false }) {
  return new Promise((resolve) => {
    const { el, close } = openSheet(
      `<h3 class="sheet-title">${esc(title)}</h3>
       <p class="muted" style="margin:6px 0 20px;line-height:1.5">${esc(message)}</p>
       <div class="grid grid-2">
         <button class="btn btn-ghost" data-close>Cancel</button>
         <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-yes">${esc(confirmText)}</button>
       </div>`,
      { onClose: (r) => resolve(!!r) }
    );
    el.querySelector('#confirm-yes').addEventListener('click', () => close(true));
  });
}

export function setLoading(btn, loading, label) {
  if (!btn) return;
  if (loading) {
    btn.dataset.html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>${label ? `<span>${esc(label)}</span>` : ''}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
  }
}

/** Thin monochrome progress ring */
export function ringSVG({ size = 220, stroke = 6, progress = 0, over = false }) {
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="ring-fill ${over ? 'over' : ''}" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"
      stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - p)}"/>
  </svg>`;
}

/** Trigger ring animations */
export function animateRings(root = document) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      root.querySelectorAll('.ring-fill[data-target]').forEach((c) => { c.style.strokeDashoffset = c.dataset.target; });
      root.querySelectorAll('.bar > i[data-w]').forEach((b) => { b.style.width = b.dataset.w; });
    })
  );
}

export function macroBar({ label, value, target, unit = 'g', cls = '' }) {
  const pct = target ? (value / target) * 100 : 0;
  const over = pct > 105;
  return `<div class="macro">
    <div class="macro-head"><span>${esc(label)}</span><span class="num"><b>${Math.round(value)}</b><span class="muted"> / ${Math.round(target)} ${unit}</span></span></div>
    <div class="bar ${cls} ${over ? 'over' : ''}"><i data-w="${Math.min(100, pct)}%"></i></div>
  </div>`;
}

export function statusBadge(status) {
  const map = {
    GOOD: ['ok', 'OPTIMAL'],
    MODERATE: ['warn', 'MODERATE'],
    HIGH: ['bad', 'HIGH CALORIE'],
  };
  const [cls, label] = map[status] || map.MODERATE;
  return `<span class="badge ${cls}">${label}</span>`;
}

/** Lakaran laluan SVG mini ala Strava */
export function routeThumbSVG(segments = [], { w = 120, h = 80, stroke = 2.5 } = {}) {
  const pts = segments.flat();
  if (pts.length < 2) {
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%"><circle cx="${w / 2}" cy="${h / 2}" r="3" fill="#fff"/></svg>`;
  }
  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 8;
  const sx = (w - pad * 2) / (maxLng - minLng || 1e-6);
  const sy = (h - pad * 2) / (maxLat - minLat || 1e-6);
  const sc = Math.min(sx, sy);
  const ox = (w - (maxLng - minLng) * sc) / 2;
  const oy = (h - (maxLat - minLat) * sc) / 2;
  const toXY = (p) => `${(ox + (p[1] - minLng) * sc).toFixed(1)},${(h - oy - (p[0] - minLat) * sc).toFixed(1)}`;
  const paths = segments
    .filter((s) => s.length > 1)
    .map((s) => `<polyline points="${s.map(toXY).join(' ')}" fill="none" stroke="#fff" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${paths}</svg>`;
}
