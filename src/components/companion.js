// Sistem Kompanion Dwi-Karakter (pelan §4): Izuku Midoriya (Deku) & Katsuki Bakugou
// Avatar ialah lambang SVG asli beranimasi (kilat hijau One For All & letupan Explosion).
import { esc } from '../utils/helpers.js';
import { store } from '../services/store.js';

export const CHARACTERS = {
  deku: { name: 'Izuku Midoriya', short: 'Deku', role: 'Jurulatih Nutrisi' },
  bakugou: { name: 'Katsuki Bakugou', short: 'Bakugou', role: 'Jurulatih Kecergasan' },
};

export function avatar(who, size = 52) {
  if (who === 'bakugou') {
    return `<span class="avatar avatar-baku" style="--sz:${size}px" aria-label="Bakugou">
      <svg viewBox="0 0 64 64">
        <defs>
          <radialGradient id="bg-b" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#ffb347"/><stop offset=".6" stop-color="#ff6a1a"/><stop offset="1" stop-color="#c2300a"/></radialGradient>
        </defs>
        <polygon class="burst" fill="url(#bg-b)" points="32,2 37,18 52,8 45,24 62,26 47,34 58,48 41,44 40,62 32,48 24,62 23,44 6,48 17,34 2,26 19,24 12,8 27,18"/>
        <circle cx="32" cy="33" r="13" fill="#111"/>
        <path d="M25 26l14 14M39 26L25 40" stroke="#ff8a2a" stroke-width="4" stroke-linecap="round"/>
      </svg>
      <i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i>
    </span>`;
  }
  return `<span class="avatar avatar-deku" style="--sz:${size}px" aria-label="Deku">
    <svg viewBox="0 0 64 64">
      <defs>
        <radialGradient id="bg-d" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#173b2b"/><stop offset="1" stop-color="#07130d"/></radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#bg-d)" stroke="#3ddc97" stroke-width="2"/>
      <path class="bolt" d="M35 8 18 36h12l-3 20 19-30H34z" fill="#3ddc97"/>
      <path class="crackle c1" d="M8 22l7 3-3 5 6 2" stroke="#9bffd1" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path class="crackle c2" d="M56 40l-6-1 2-5-6-3" stroke="#9bffd1" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    </svg>
  </span>`;
}

/** Gelembung dialog sebaris (untuk kad keputusan/papan pemuka) */
export function companionBubble(who, text, { compact = false } = {}) {
  const c = CHARACTERS[who];
  return `<div class="cbubble cbubble-${who} ${compact ? 'compact' : ''}">
    ${avatar(who, compact ? 40 : 48)}
    <div class="cbubble-body">
      <div class="cbubble-name">${c.short}<span>${c.role}</span></div>
      <p>${esc(text)}</p>
    </div>
  </div>`;
}

let activePanel = null;

/** Paparan kompanion terapung (in-app) */
export function showCompanion({ who = 'deku', text, title, duration = 7000 }) {
  if (!store.settings.companions) return;
  activePanel?.remove();
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className = `companion-pop companion-${who}`;
  const whoList = who === 'both' ? ['deku', 'bakugou'] : [who];
  el.innerHTML = `
    <div class="cp-avatars">${whoList.map((w) => avatar(w, 58)).join('')}</div>
    <div class="cp-body">
      <div class="cp-title">${esc(title || (who === 'both' ? 'Deku & Bakugou' : CHARACTERS[who].short))}</div>
      <p>${esc(text)}</p>
    </div>
    <button class="cp-close" aria-label="Tutup">×</button>`;
  if (who === 'bakugou') el.insertAdjacentHTML('afterbegin', '<div class="boom"></div>');
  root.appendChild(el);
  activePanel = el;
  const close = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
    if (activePanel === el) activePanel = null;
  };
  el.querySelector('.cp-close').addEventListener('click', close);
  if (duration) setTimeout(close, duration);
  if (navigator.vibrate && who === 'bakugou') navigator.vibrate([60, 40, 120]);
}

/** Cut-in manga skrin penuh untuk pencapaian besar */
export function showCutIn({ title, subtitle, lines = [] }) {
  if (!store.settings.companions) return;
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className = 'cutin';
  el.innerHTML = `
    <div class="cutin-lines"></div>
    <div class="cutin-inner">
      <div class="cutin-title">${esc(title)}</div>
      ${subtitle ? `<div class="cutin-sub">${esc(subtitle)}</div>` : ''}
      <div class="cutin-panels">
        ${lines.map((l, i) => `
          <div class="cutin-panel cutin-${l.who}" style="animation-delay:${0.35 + i * 0.25}s">
            ${avatar(l.who, 64)}
            <div><b>${CHARACTERS[l.who].short}</b><p>${esc(l.text)}</p></div>
          </div>`).join('')}
      </div>
      <button class="btn btn-primary cutin-btn">PLUS ULTRA!</button>
    </div>`;
  root.appendChild(el);
  if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 200]);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 400); };
  el.querySelector('.cutin-btn').addEventListener('click', close);
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
}
