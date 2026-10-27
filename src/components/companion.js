// Dual Character Companion System: Izuku Midoriya (Deku) & Katsuki Bakugou
// 5-State Matrix, Dynamic Animated SVG Avatars & Web Audio Soundboard
import { esc } from '../utils/helpers.js';
import { store } from '../services/store.js';
import { soundboard } from '../services/audioService.js';
import { icons } from './icons.js';

export const CHARACTERS = {
  deku: { name: 'Izuku Midoriya', short: 'Deku', role: 'Nutrition Coach' },
  bakugou: { name: 'Katsuki Bakugou', short: 'Bakugou', role: 'Fitness Coach' },
};

/**
 * 5-state SVG Avatar with heroic effects:
 * states: 'idle' | 'analyzing' | 'goal_hit' | 'over_limit' | 'workout'
 */
export function avatar(who, size = 52, state = 'idle') {
  if (who === 'bakugou') {
    const isOver = state === 'over_limit';
    const isGoal = state === 'goal_hit';
    const isAnalyzing = state === 'analyzing';
    const isWorkout = state === 'workout';

    return `<span class="avatar avatar-baku state-${state} ${isOver ? 'shake' : ''}" style="--sz:${size}px" aria-label="Bakugou (${state})">
      <svg viewBox="0 0 64 64">
        <defs>
          <radialGradient id="bg-b" cx="50%" cy="50%" r="60%">
            <stop offset="0" stop-color="${isOver ? '#ff3b30' : isGoal ? '#ffd700' : '#ffb347'}"/>
            <stop offset=".6" stop-color="#ff6a1a"/>
            <stop offset="1" stop-color="#c2300a"/>
          </radialGradient>
        </defs>
        <polygon class="burst" fill="url(#bg-b)" points="32,2 37,18 52,8 45,24 62,26 47,34 58,48 41,44 40,62 32,48 24,62 23,44 6,48 17,34 2,26 19,24 12,8 27,18"/>
        <circle cx="32" cy="33" r="13" fill="#111"/>
        <path d="M25 26l14 14M39 26L25 40" stroke="#ff8a2a" stroke-width="4" stroke-linecap="round"/>
        ${isOver ? '<path d="M20 18 L26 24 M44 18 L38 24" stroke="#ff3b30" stroke-width="3" stroke-linecap="round"/>' : ''}
      </svg>
      <i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i>
      ${isAnalyzing ? '<span class="avatar-smoke"></span>' : ''}
    </span>`;
  }

  // Deku
  const isGoal = state === 'goal_hit';
  const isOver = state === 'over_limit';
  const isAnalyzing = state === 'analyzing';

  return `<span class="avatar avatar-deku state-${state}" style="--sz:${size}px" aria-label="Deku (${state})">
    <svg viewBox="0 0 64 64">
      <defs>
        <radialGradient id="bg-d" cx="50%" cy="40%" r="65%">
          <stop offset="0" stop-color="${isGoal ? '#10b981' : isOver ? '#b45309' : '#173b2b'}"/>
          <stop offset="1" stop-color="#07130d"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#bg-d)" stroke="${isGoal ? '#34d399' : '#3ddc97'}" stroke-width="2"/>
      <path class="bolt" d="M35 8 18 36h12l-3 20 19-30H34z" fill="${isGoal ? '#6ee7b7' : '#3ddc97'}"/>
      <path class="crackle c1" d="M8 22l7 3-3 5 6 2" stroke="#9bffd1" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path class="crackle c2" d="M56 40l-6-1 2-5-6-3" stroke="#9bffd1" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    </svg>
    ${isAnalyzing ? '<span class="avatar-notes">📝</span>' : ''}
  </span>`;
}

/**
 * Interactive companion bubble with Voice SFX button, Reload button, and coach switch
 */
export function companionBubble(who, text, { compact = false, state = 'idle', soundKey = 'greet', allowSwitch = true, ja = '', activeLine = null } = {}) {
  const c = CHARACTERS[who] || CHARACTERS.deku;
  const isBaku = who === 'bakugou';

  if (!activeLine) {
    activeLine = store.getCompanionActiveLine?.(who) || null;
  }
  const jaText = ja || activeLine?.ja || '';
  const isMs = store.settings?.language === 'ms';
  const subtitle = activeLine ? (isMs ? (activeLine.ms || activeLine.en) : (activeLine.en || activeLine.ms)) : text;

  return `<div class="cbubble cbubble-${who} ${compact ? 'compact' : ''}" data-who="${who}" data-sound="${soundKey}">
    ${avatar(who, compact ? 40 : 48, state)}
    <div class="cbubble-body" style="cursor:pointer" title="Tap to reload anime voice line">
      <div class="cbubble-name row between">
        <span>${c.short} <small style="opacity:0.75;font-weight:normal">(${c.role})</small></span>
        <div class="row" style="gap:4px;align-items:center">
          <button type="button" class="btn-voice-trigger btn btn-icon btn-ghost btn-xs" title="Play Authentic Anime Voice" aria-label="Play Voice SFX" style="width:28px;height:28px;padding:0;touch-action:manipulation">
            ${icons.sound || '🔊'}
          </button>
          <button type="button" class="btn-voice-reload btn btn-icon btn-ghost btn-xs" title="Reload Voice Line & Quote" aria-label="Reload Voice Line" style="width:28px;height:28px;padding:0;touch-action:manipulation">
            ${icons.refresh}
          </button>
          ${
            allowSwitch
              ? `<button type="button" class="btn-coach-switch btn btn-ghost btn-xs" title="Switch Coach to ${isBaku ? 'Deku' : 'Bakugou'}" aria-label="Switch Coach" style="padding:2px 8px;font-size:10px;height:24px;border:1px solid var(--border-soft);touch-action:manipulation">
                  ⇄ ${isBaku ? 'Deku' : 'Bakugo'}
                </button>`
              : ''
          }
        </div>
      </div>
      <div class="cbubble-text-wrap">
        ${jaText ? `<div class="cbubble-ja-row" style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--hero-accent);margin-bottom:3px;font-weight:600"><span style="font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);letter-spacing:0.04em">JP</span><span class="cbubble-ja">${esc(jaText)}</span></div>` : ''}
        <p class="cbubble-text">${esc(subtitle)}</p>
      </div>
    </div>
  </div>`;
}

/**
 * Wire audio and coach switch click handlers on companion bubbles in a container
 */
export function bindCompanionEvents(container, onCoachSwitch) {
  container.querySelectorAll('.cbubble').forEach((el) => {
    const who = el.dataset.who || 'deku';
    const textWrap = el.querySelector('.cbubble-text-wrap') || el.querySelector('.cbubble-text');

    function updateBubbleText(lineObj) {
      if (!lineObj || !textWrap) return;
      const isEn = store.settings?.language !== 'ms';
      const lineText = isEn ? lineObj.en : lineObj.ms;
      textWrap.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
      textWrap.style.opacity = '0';
      textWrap.style.transform = 'translateY(-2px)';
      setTimeout(() => {
        textWrap.innerHTML = `
          <div class="cbubble-ja-row" style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--hero-accent);margin-bottom:3px;font-weight:600">
            <span style="font-size:9px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);letter-spacing:0.04em">JP</span>
            <span class="cbubble-ja">${esc(lineObj.ja)}</span>
          </div>
          <p class="cbubble-text">${esc(lineText)}</p>
        `;
        textWrap.style.opacity = '1';
        textWrap.style.transform = 'translateY(0)';
      }, 120);
    }

    function triggerShuffle() {
      const picked = soundboard.pickNextLine(who);
      if (picked?.line) {
        updateBubbleText(picked.line);
        soundboard.playLineAudio(who, picked.line).catch(() => {});
      }
    }

    // 1. Click on Sound icon -> instant reload quote + play audio
    el.querySelector('.btn-voice-trigger')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerShuffle();
    });

    // 2. Click on Reload icon -> instant reload quote + play audio
    el.querySelector('.btn-voice-reload')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerShuffle();
    });

    // 3. Click on the bubble body -> instant reload quote + play audio
    el.querySelector('.cbubble-body')?.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      triggerShuffle();
    });

    // 4. Switch coach
    el.querySelector('.btn-coach-switch')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const nextCoach = who === 'bakugou' ? 'deku' : 'bakugou';
      if (store.profile) {
        store.saveProfile({ selectedCompanion: nextCoach });
      }
      store.applyHeroTheme(nextCoach);
      const picked = soundboard.pickNextLine(nextCoach);
      if (picked?.line) {
        soundboard.playLineAudio(nextCoach, picked.line).catch(() => {});
      }
      onCoachSwitch?.(nextCoach);
    });
  });
}

let activePanel = null;

/** Floating in-app companion dialogue overlay */
export function showCompanion({ who = 'deku', text, title, duration = 7000, state = 'idle', soundKey = 'greet' }) {
  if (!store.settings.companions) return;
  activePanel?.remove();
  const root = document.getElementById('overlay-root');
  if (!root) return;

  const el = document.createElement('div');
  el.className = `companion-pop companion-${who}`;
  const whoList = who === 'both' ? ['deku', 'bakugou'] : [who];

  el.innerHTML = `
    <div class="cp-avatars">${whoList.map((w) => avatar(w, 58, state)).join('')}</div>
    <div class="cp-body">
      <div class="cp-title row between">
        <span>${esc(title || (who === 'both' ? 'Deku & Bakugou' : CHARACTERS[who].short))}</span>
        <button type="button" class="cp-audio-btn" style="background:none;border:none;color:#fff;cursor:pointer;font-size:14px" title="Shuffle Voice Line">🔊</button>
      </div>
      <p>${esc(text)}</p>
    </div>
    <button class="cp-close" aria-label="Close">×</button>`;

  if (who === 'bakugou') el.insertAdjacentHTML('afterbegin', '<div class="boom"></div>');
  root.appendChild(el);
  activePanel = el;

  soundboard.play(who, soundKey, text);

  el.querySelector('.cp-audio-btn')?.addEventListener('click', async () => {
    const res = await soundboard.play(who, 'shuffle');
    if (res?.line) {
      const isEn = store.settings?.language !== 'ms';
      const lineText = isEn ? res.line.en : res.line.ms;
      const p = el.querySelector('p');
      if (p) {
        p.style.transition = 'opacity 0.15s ease';
        p.style.opacity = '0';
        setTimeout(() => {
          p.innerHTML = `<span style="display:block;font-size:11.5px;opacity:0.85;margin-bottom:2px">${esc(res.line.ja)}</span>${esc(lineText)}`;
          p.style.opacity = '1';
        }, 150);
      }
    }
  });

  const close = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
    if (activePanel === el) activePanel = null;
  };
  el.querySelector('.cp-close').addEventListener('click', close);
  if (duration) setTimeout(close, duration);
}

/** Full-screen manga cut-in for major milestones */
export function showCutIn({ title, subtitle, lines = [] }) {
  if (!store.settings.companions) return;
  const root = document.getElementById('overlay-root');
  if (!root) return;

  const el = document.createElement('div');
  el.className = 'cutin';
  el.innerHTML = `
    <div class="cutin-lines"></div>
    <div class="cutin-inner">
      <div class="cutin-title">${esc(title)}</div>
      ${subtitle ? `<div class="cutin-sub">${esc(subtitle)}</div>` : ''}
      <div class="cutin-panels">
        ${lines
          .map(
            (l, i) => `
          <div class="cutin-panel cutin-${l.who}" style="animation-delay:${0.35 + i * 0.25}s">
            ${avatar(l.who, 64, 'goal_hit')}
            <div><b>${CHARACTERS[l.who].short}</b><p>${esc(l.text)}</p></div>
          </div>`
          )
          .join('')}
      </div>
      <button class="btn btn-primary cutin-btn">PLUS ULTRA!</button>
    </div>`;
  root.appendChild(el);

  soundboard.play('deku', 'goal');

  const close = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 400);
  };
  el.querySelector('.cutin-btn').addEventListener('click', close);
  el.addEventListener('click', (e) => {
    if (e.target === el) close();
  });
}
