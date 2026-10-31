import { avatar } from './companion.js';
import { getLang } from '../utils/i18n.js';
import { soundboard } from '../services/audioService.js';

export function renderIntro(container, onComplete) {
  const ms = getLang() === 'ms';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const skip = ms ? 'Langkau' : 'Skip';
  const proceed = ms ? 'Teruskan' : 'Continue';

  container.innerHTML = `
    <section class="kickoff" aria-labelledby="kickoff-title">
      <button type="button" class="kickoff-skip" data-intro-skip>${motion.matches ? proceed : skip}</button>
      <div class="kickoff-stage">
        <div class="kickoff-scene" aria-hidden="true">
          <svg class="kickoff-path" viewBox="0 0 560 260" width="560" height="260" fill="none">
            <path class="kickoff-route" pathLength="1" d="M110 130 C170 130 160 200 245 200 S330 60 395 60 S460 110 450 130" />
            <g class="kickoff-plate"><circle cx="110" cy="130" r="52"/><circle cx="110" cy="130" r="37"/><path d="M37 98v25m-7-25v16q0 10 14 0V98m-7 25v39m146-64q-14 8-14 30h14m0-30v64"/></g>
            <path class="kickoff-frame" d="M42 72V52h20m96 0h20v20M42 188v20h20m96 0h20v-20"/>
            <path class="kickoff-scan" d="M50 130h120"/>
            <g class="kickoff-finish"><circle cx="450" cy="130" r="38"/><path d="m433 131 12 12 23-27"/></g>
          </svg>
          <div class="kickoff-coach kickoff-coach-food">${avatar('deku', 64)}</div>
          <div class="kickoff-coach kickoff-coach-move">${avatar('bakugou', 64)}</div>
        </div>
        <div class="kickoff-labels"><span>${ms ? 'Kenali makanan anda' : 'Know your meals'}</span><span>${ms ? 'Terus bergerak' : 'Keep moving'}</span></div>
        <h1 id="kickoff-title" class="kickoff-title">CalMal<span class="kickoff-period">.</span></h1>
        <p class="kickoff-caption">${ms ? 'Makan dengan bijak. Bergerak setiap hari.' : 'Eat with intention. Move every day.'}</p>
      </div>
      <p class="kickoff-foot">${ms ? 'Pemakanan dan kecergasan, bersama jurulatih anda.' : 'Nutrition and fitness, with your coaches.'}</p>
    </section>`;

  const button = container.querySelector('[data-intro-skip]');
  let finished = false;
  let timer;

  // Autoplay intro theme immediately as natural background audio
  soundboard.playIntroTheme?.();

  // If autoplay is restricted by browser policy, start immediately on first user touch anywhere
  const triggerAudioOnFirstGesture = () => {
    soundboard.unlockAudio?.()?.then?.(() => {
      soundboard.playIntroTheme?.();
    })?.catch?.(() => {});
    cleanupGesture();
  };

  const cleanupGesture = () => {
    window?.removeEventListener?.('pointerdown', triggerAudioOnFirstGesture);
    window?.removeEventListener?.('touchstart', triggerAudioOnFirstGesture);
    window?.removeEventListener?.('keydown', triggerAudioOnFirstGesture);
    window?.removeEventListener?.('click', triggerAudioOnFirstGesture);
  };

  window?.addEventListener?.('pointerdown', triggerAudioOnFirstGesture, { passive: true });
  window?.addEventListener?.('touchstart', triggerAudioOnFirstGesture, { passive: true });
  window?.addEventListener?.('keydown', triggerAudioOnFirstGesture, { passive: true });
  window?.addEventListener?.('click', triggerAudioOnFirstGesture, { passive: true });

  const cleanup = () => {
    clearTimeout(timer);
    cleanupGesture();
    document.removeEventListener?.('keydown', onKey);
    button.removeEventListener?.('click', finish);
    motion.removeEventListener?.('change', onMotion);
  };

  function finish() {
    if (finished) return;
    finished = true;
    cleanup();
    onComplete();
  }

  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault?.(); finish(); }
  }

  function onMotion() {
    clearTimeout(timer);
    button.textContent = motion.matches ? proceed : skip;
    if (!motion.matches) timer = setTimeout(finish, 4000);
  }

  button.addEventListener('click', finish);
  document.addEventListener?.('keydown', onKey);
  motion.addEventListener?.('change', onMotion);
  if (!motion.matches) timer = setTimeout(finish, 4000);
  button.focus?.({ preventScroll: true });

  return () => { finished = true; cleanup(); };
}
