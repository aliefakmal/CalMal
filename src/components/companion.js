// Dual Character Companion System: Izuku Midoriya (Deku) & Katsuki Bakugou
// 5-State Matrix, Dynamic Animated SVG Avatars & Web Audio Soundboard
import { esc } from '../utils/helpers.js';
import { store } from '../services/store.js';
import { soundboard, VOICE_SHUFFLE_CATALOG } from '../services/audioService.js';
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
      <div class="cbubble-name row between" style="align-items:center;gap:6px">
        <span class="cbubble-coach-title"><b>${c.short}</b> <small style="opacity:0.75;font-weight:600">(${c.role})</small></span>
        <div class="cbubble-actions row" style="gap:4px;align-items:center;flex-shrink:0">
          <button type="button" class="btn-voice-trigger btn btn-icon btn-ghost btn-xs" title="Play Voice / Mainkan Suara" aria-label="Play Voice SFX" style="width:28px;height:28px;padding:0;touch-action:manipulation">
            ${icons.sound || '🔊'}
          </button>
          <button type="button" class="btn-voice-stop btn btn-icon btn-ghost btn-xs" title="Pause / Resume Voice" aria-label="Pause or Resume Voice SFX" style="width:28px;height:28px;padding:0;touch-action:manipulation">
            <span class="icon-pause">${icons.pause}</span>
            <span class="icon-resume">${icons.play}</span>
          </button>
          <button type="button" class="btn-voice-reload btn btn-icon btn-ghost btn-xs" title="Reload Voice Line & Quote / Muat Semula Dialog" aria-label="Reload Voice Line" style="width:28px;height:28px;padding:0;touch-action:manipulation">
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
    let currentLineObj = store.getCompanionActiveLine?.(who) || VOICE_SHUFFLE_CATALOG[who]?.[0];

    function updateBubbleText(lineObj) {
      if (!lineObj || !textWrap) return;
      currentLineObj = lineObj;
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

    // 1. Click on Sound icon -> if playing: pause; if paused: resume SAME line; if idle: play current line
    el.querySelector('.btn-voice-trigger')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (soundboard.isPlayingVoice()) {
        soundboard.pauseVoice();
        soundboard.playUISound('toggle-off');
      } else if (soundboard.isPausedVoice()) {
        soundboard.resumeVoice();
        soundboard.playUISound('confirm');
      } else {
        soundboard.playLineAudio(who, currentLineObj).catch(() => {});
      }
    });

    // 2. Click on Pause / Resume icon -> pause if playing, resume if paused, play if idle
    el.querySelector('.btn-voice-stop')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (soundboard.isPlayingVoice()) {
        soundboard.pauseVoice();
        soundboard.playUISound('toggle-off');
      } else if (soundboard.isPausedVoice()) {
        soundboard.resumeVoice();
        soundboard.playUISound('confirm');
      } else {
        soundboard.playLineAudio(who, currentLineObj).catch(() => {});
      }
    });

    // 3. Click on Reload icon -> explicitly shuffle to next quote and play audio
    el.querySelector('.btn-voice-reload')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerShuffle();
    });

    // 4. Click on the bubble body -> play or resume current quote without changing it
    el.querySelector('.cbubble-body')?.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      if (soundboard.isPlayingVoice()) {
        soundboard.pauseVoice();
      } else if (soundboard.isPausedVoice()) {
        soundboard.resumeVoice();
      } else {
        soundboard.playLineAudio(who, currentLineObj).catch(() => {});
      }
    });

    // Listen to global voice state events to highlight active playing or paused state
    const onVoiceState = (ev) => {
      const isPlaying = ev.detail?.isPlaying;
      const isPaused = ev.detail?.isPaused;
      const btnStop = el.querySelector('.btn-voice-stop');

      if (isPlaying) {
        el.classList.add('is-playing');
        el.classList.remove('is-paused');
        if (btnStop) {
          btnStop.title = 'Pause Voice / Jeda Suara';
          btnStop.setAttribute('aria-label', 'Pause Voice SFX');
        }
      } else if (isPaused) {
        el.classList.remove('is-playing');
        el.classList.add('is-paused');
        if (btnStop) {
          btnStop.title = 'Resume Voice / Sambung Semula Suara';
          btnStop.setAttribute('aria-label', 'Resume Voice SFX');
        }
      } else {
        el.classList.remove('is-playing');
        el.classList.remove('is-paused');
        if (btnStop) {
          btnStop.title = 'Pause / Resume Voice';
          btnStop.setAttribute('aria-label', 'Pause or Resume Voice SFX');
        }
      }
    };
    window.addEventListener('calmal:voice-state', onVoiceState);

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

export const MILESTONE_SCRIPTS = {
  water: {
    title: {
      en: 'Water Hydration Complete! 💧',
      ms: 'Penghidratan Air Lengkap! 💧',
    },
    subtitle: {
      en: '100% Daily Hydration Target Reached!',
      ms: '100% Sasaran Air Harian Berjaya Dicapai!',
    },
    deku: {
      file: 'deku_line4.mp3',
      ja: '更に向こうへ！プルス・ウルトラ！！',
      romaji: 'Sara ni mukou e! PLUS ULTRA!!',
      en: 'Go Beyond! PLUS ULTRA!! Full hydration achieved!',
      ms: 'Melangkah Lebih Jauh! PLUS ULTRA!! Penghidratan penuh berjaya dicapai!',
    },
    bakugou: {
      file: 'bakugou_line5.mp3',
      ja: '爆豪の勝利だ！当たり前だ！',
      romaji: 'Bakugou no shouri da! Atarimae da!',
      en: 'Bakugo’s victory! Of course you hit the hydration goal!',
      ms: 'Kemenangan mutlak Bakugo! Dah tentulah, cukup air hari ni!',
    },
  },
  calories: {
    title: {
      en: 'Calorie Target Balance Hit! 🎯',
      ms: 'Sasaran Kalori Tepat Sasaran! 🎯',
    },
    subtitle: {
      en: 'Daily Energy Balance Achieved!',
      ms: 'Sasaran Kalori Harian Berjaya Diseimbangkan!',
    },
    deku: {
      file: 'deku_line5.mp3',
      ja: 'ワン・フォー・オール 100万%！！',
      romaji: 'One For All Hyakuman Pāsento!!',
      en: 'One For All 1,000,000%!! Perfect calorie fuel for today!',
      ms: 'One For All 1,000,000%!! Pembakaran dan tenaga kalori sempurna hari ini!',
    },
    bakugou: {
      file: 'bakugou_line5.mp3',
      ja: '爆豪の勝利だ！当たり前だ！',
      romaji: 'Bakugou no shouri da! Atarimae da!',
      en: 'Bakugo’s victory! Perfect fuel, don’t you dare slack off tomorrow!',
      ms: 'Kemenangan mutlak Bakugo! Kalori tepat sasaran, esok jangan malas!',
    },
  },
  macros: {
    title: {
      en: 'Daily Macronutrients Complete! ⚡',
      ms: 'Sasaran Makronutrien Lengkap! ⚡',
    },
    subtitle: {
      en: 'Protein & Muscle Fuel Goals Met!',
      ms: 'Sasaran Protein & Nutrisi Otot Dipenuhi!',
    },
    deku: {
      file: 'deku_line6.mp3',
      ja: 'お疲れ様です！',
      romaji: 'Otsukaresama desu!',
      en: 'Great work today! Your muscles have all the fuel they need!',
      ms: 'Terima kasih atas usaha gigih hari ini! Otot sedia pulih dan membina kekuatan!',
    },
    bakugou: {
      file: 'bakugou_line6.mp3',
      ja: '爆豪の決戦だ！ぶっ飛ばして走れぇ！',
      romaji: 'Bakugou no kessen da! Buttobashite hashireee!',
      en: 'Bakugo’s showdown starts now! All macros loaded, now dominate!',
      ms: 'Pertempuran penentu Bakugo bermula! Makronutrien lengkap, sekarang dominasi!',
    },
  },
};

let activeMilestoneOverlay = null;

/**
 * Animated Celebration Popup with Hero Sprite Bubble
 * Triggers on Water Hydration 100%, Calorie Balance On-Target, or Daily Macronutrients Complete
 */
export function showMilestoneCelebration({
  milestone = 'water',
  who = null,
  statText = '',
  onClose = null,
} = {}) {
  if (!store.settings.companions) return;

  if (activeMilestoneOverlay) {
    try {
      activeMilestoneOverlay.remove();
    } catch { /* noop */ }
    activeMilestoneOverlay = null;
  }
  document.querySelectorAll('.milestone-overlay').forEach((el) => {
    try { el.remove(); } catch { /* noop */ }
  });

  const hero = (who === 'bakugou' || who === 'baku' || (!who && store.profile?.selectedCompanion === 'bakugou'))
    ? 'bakugou'
    : 'deku';

  const isMs = store.settings?.language === 'ms';
  const milestoneData = MILESTONE_SCRIPTS[milestone] || MILESTONE_SCRIPTS.water;
  const titleText = isMs ? milestoneData.title.ms : milestoneData.title.en;
  const subText = isMs ? milestoneData.subtitle.ms : milestoneData.subtitle.en;
  const scriptObj = milestoneData[hero] || milestoneData.deku;
  const quoteText = isMs ? scriptObj.ms : scriptObj.en;

  let root = document.getElementById('overlay-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'overlay-root';
    document.body.appendChild(root);
  }

  const overlay = document.createElement('div');
  overlay.className = 'milestone-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="milestone-card milestone-card-${hero}">
      <div class="milestone-burst-bg"></div>
      <div style="position:relative;z-index:3">
        <div class="milestone-avatar-wrap">
          <div class="milestone-avatar-aura"></div>
          ${avatar(hero, 76, 'goal_hit')}
        </div>
        <div class="milestone-title">${esc(titleText)}</div>
        <div class="milestone-subtitle">
          ${esc(subText)}
          ${statText ? `<span style="display:block;margin-top:2px;color:#fff;font-weight:800;letter-spacing:0.02em">${esc(statText)}</span>` : ''}
        </div>
        <div class="milestone-sprite-bubble">
          <div class="milestone-ja-quote">
            <span class="milestone-ja-tag">JP</span>
            <span>${esc(scriptObj.ja)}</span>
          </div>
          <div class="milestone-trans-quote">${esc(quoteText)}</div>
        </div>
        <button type="button" class="btn btn-primary btn-block milestone-action-btn" id="btn-milestone-claim">
          ${isMs ? 'TERUSKAN PERJUANGAN! (PLUS ULTRA)' : 'PLUS ULTRA! KEEP GOING'}
        </button>
      </div>
    </div>
  `;

  root.appendChild(overlay);
  activeMilestoneOverlay = overlay;

  // Play authentic Japanese anime voice line matching the text
  soundboard.playLineAudio(hero, scriptObj).catch(() => {});

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([40, 50, 80, 50, 120]);
  }

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    soundboard.stopAll();
    overlay.classList.add('out');
    setTimeout(() => {
      overlay.remove();
      if (activeMilestoneOverlay === overlay) activeMilestoneOverlay = null;
      onClose?.();
    }, 320);
  };

  overlay.querySelector('#btn-milestone-claim')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  setTimeout(close, 7500);
}

let activeMotivationPopup = null;

/**
 * Animated Hero Motivation Popup (Izuku Midoriya or Katsuki Bakugou)
 * Randomly triggers on food / nutrition scan with authentic Japanese voice and heroic cheer.
 */
export function showMotivationPopup({
  who = null,
  advice = '',
  duration = 7500,
} = {}) {
  if (!store.settings?.companions) return;

  if (activeMotivationPopup) {
    try {
      activeMotivationPopup.remove();
    } catch { /* noop */ }
    activeMotivationPopup = null;
  }
  document.querySelectorAll('.motivation-pop').forEach((el) => {
    try { el.remove(); } catch { /* noop */ }
  });

  let root = document.getElementById('overlay-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'overlay-root';
    document.body.appendChild(root);
  }

  // Randomize between Deku and Bakugou if not explicitly specified
  const hero = (who === 'bakugou' || who === 'baku')
    ? 'bakugou'
    : (who === 'deku' ? 'deku' : (Math.random() < 0.5 ? 'deku' : 'bakugou'));

  const isBaku = hero === 'bakugou';
  const isMs = store.settings?.language === 'ms';

  // Pick a fresh motivational voice line from the catalog
  const picked = soundboard.pickNextLine(hero);
  const lineObj = picked?.line || (VOICE_SHUFFLE_CATALOG[hero] ? VOICE_SHUFFLE_CATALOG[hero][0] : null);

  const jaText = lineObj?.ja || '';
  const quoteText = lineObj
    ? (isMs ? (lineObj.ms || lineObj.en) : (lineObj.en || lineObj.ms))
    : (isBaku ? 'LEBURKAN SEMUANYA!!' : 'Melangkah Lebih Jauh! PLUS ULTRA!!');

  const heroRole = isBaku ? 'Fitness Coach' : 'Nutrition Coach';

  const el = document.createElement('div');
  el.className = `motivation-pop motivation-pop-${hero}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'false');

  el.innerHTML = `
    <div class="mp-aura"></div>
    <div class="mp-avatar-col">
      ${avatar(hero, 52, 'goal_hit')}
    </div>
    <div class="mp-content">
      <div class="mp-header row between">
        <span class="mp-badge">${isBaku ? '💥 BAKUGOU' : '⚡ DEKU'} <small style="opacity:0.75;font-weight:600">(${heroRole})</small></span>
        <div class="mp-actions row">
          <button type="button" class="mp-btn-audio btn-ghost" title="${isMs ? 'Mainkan Semula Suara' : 'Replay Voice'}" aria-label="Replay Voice">
            🔊
          </button>
          <button type="button" class="mp-btn-close btn-ghost" title="${isMs ? 'Tutup' : 'Close'}" aria-label="Close">
            ×
          </button>
        </div>
      </div>
      ${jaText ? `
        <div class="mp-ja-row">
          <span class="mp-ja-tag">JP</span>
          <span class="mp-ja-text">${esc(jaText)}</span>
        </div>
      ` : ''}
      <p class="mp-quote">${esc(quoteText)}</p>
      ${advice ? `<p class="mp-advice">💡 ${esc(advice)}</p>` : ''}
    </div>
  `;

  root.appendChild(el);
  activeMotivationPopup = el;

  // Immediately play the authentic Japanese voice line matching the line
  if (lineObj) {
    soundboard.playLineAudio(hero, lineObj).catch(() => {});
  } else {
    soundboard.play(hero, 'greet').catch(() => {});
  }

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    el.classList.add('out');
    setTimeout(() => {
      try { el.remove(); } catch {}
      if (activeMotivationPopup === el) activeMotivationPopup = null;
    }, 320);
  };

  el.querySelector('.mp-btn-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });

  el.querySelector('.mp-btn-audio')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (lineObj) {
      soundboard.playLineAudio(hero, lineObj).catch(() => {});
    }
  });

  el.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    if (lineObj) {
      soundboard.playLineAudio(hero, lineObj).catch(() => {});
    }
  });

  if (duration > 0) {
    setTimeout(() => {
      if (!closed) close();
    }, duration);
  }
}


