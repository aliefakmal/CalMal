// Web Audio & Companion Soundboard Service (Deku & Bakugou SFX / Accurate Japanese Voice)
import { store } from './store.js';

export const JAPANESE_VOICE_SCRIPTS = {
  deku: {
    greet: {
      ja: '大丈夫！',
      romaji: 'Daijoubu!',
    },
    analyze: {
      ja: '大丈夫！',
      romaji: 'Daijoubu!',
    },
    goal: {
      ja: 'ワン・フォー・オール 100万%！！',
      romaji: 'One For All Hyakuman Pāsento!!',
    },
    over: {
      ja: '大丈夫！',
      romaji: 'Daijoubu!',
    },
    run: {
      ja: 'スマァァッシュ！！',
      romaji: 'SMAAASH!!',
    },
  },
  bakugou: {
    greet: {
      ja: 'おいおいおい！上に上がれば関係ねぇ！',
      romaji: 'Oi oi oi! Ue ni agarya kankei nee!',
    },
    analyze: {
      ja: 'バカ！',
      romaji: 'Baka!',
    },
    goal: {
      ja: '爆豪の勝利だ！当たり前だ！',
      romaji: 'Bakugou no shouri da! Atarimae da!',
    },
    over: {
      ja: '死ねぇぇ！！',
      romaji: 'SHINEEEE!!',
    },
    run: {
      ja: '爆豪の決戦だ！ぶっ飛ばして走れぇ！',
      romaji: 'Bakugou no kessen da! Buttobashite hashireee!',
    },
  },
};

export const VOICE_SHUFFLE_CATALOG = {
  deku: [
    {
      file: 'deku_line1.mp3',
      ja: '大丈夫！',
      romaji: 'Daijoubu!',
      en: 'Don’t worry, you’ve got this!',
      ms: 'Jangan risau, semuanya akan baik-baik saja!',
    },
    {
      file: 'deku_line2.mp3',
      ja: 'スマァァッシュ！！',
      romaji: 'SMAAASH!!',
      en: 'SMAAASH!! Break through your limits!',
      ms: 'SMAAASH!! Mari melepasi had batasan kita!',
    },
    {
      file: 'deku_line3.mp3',
      ja: 'デラウェア・デトロイト・スマッシュ！！',
      romaji: 'Delaware Detroit SMASH!!',
      en: 'Delaware Detroit SMASH!!',
      ms: 'Delaware Detroit SMASH!!',
    },
    {
      file: 'deku_line4.mp3',
      ja: '更に向こうへ！プルス・ウルトラ！！',
      romaji: 'Sara ni mukou e! PLUS ULTRA!!',
      en: 'Go Beyond! PLUS ULTRA!!',
      ms: 'Melangkah Lebih Jauh! PLUS ULTRA!!',
    },
    {
      file: 'deku_line5.mp3',
      ja: 'ワン・フォー・オール 100万%！！',
      romaji: 'One For All Hyakuman Pāsento!!',
      en: 'One For All 1,000,000%!!',
      ms: 'One For All 1,000,000%!!',
    },
    {
      file: 'deku_line6.mp3',
      ja: 'お疲れ様です！',
      romaji: 'Otsukaresama desu!',
      en: 'Thank you for your hard work today! (Great job!)',
      ms: 'Terima kasih atas usaha gigih hari ini! (Kerja yang bagus!)',
    },
  ],
  bakugou: [
    {
      file: 'bakugou_line1.mp3',
      ja: 'おいおいおい！上に上がれば関係ねぇ！',
      romaji: 'Oi oi oi! Ue ni agarya kankei nee!',
      en: 'Oi oi oi! As long as I climb to the top, nothing else matters!',
      ms: 'Oi oi oi! Janji aku naik sampai puncak, benda lain tak penting!',
    },
    {
      file: 'bakugou_line2.mp3',
      ja: '死ねぇぇ！！',
      romaji: 'SHINEEEE!!',
      en: 'SHINEEEE!! (Blast through!!)',
      ms: 'LEBURKAN SEMUANYA!!',
    },
    {
      file: 'bakugou_line3.mp3',
      ja: 'おいおいおい！',
      romaji: 'Oi oi oi!',
      en: 'Oi oi oi! What are you doing, don’t slack off!',
      ms: 'Oi oi oi! Kau buat apa tu, jangan bermalas-malasan!',
    },
    {
      file: 'bakugou_line4.mp3',
      ja: 'バカ！',
      romaji: 'Baka!',
      en: 'Idiot! Get moving and give it your all!',
      ms: 'Bongok! Bangun dan bersungguh-sungguhlah!',
    },
    {
      file: 'bakugou_line5.mp3',
      ja: '爆豪の勝利だ！当たり前だ！',
      romaji: 'Bakugou no shouri da! Atarimae da!',
      en: 'Bakugo’s victory! Of course it is, now keep up!',
      ms: 'Kemenangan mutlak Bakugo! Dah tentulah, sekarang ikut aku!',
    },
    {
      file: 'bakugou_line6.mp3',
      ja: '爆豪の決戦だ！ぶっ飛ばして走れぇ！',
      romaji: 'Bakugou no kessen da! Buttobashite hashireee!',
      en: 'Bakugo’s showdown starts now! Sprint like crazy!',
      ms: 'Pertempuran penentu Bakugo bermula! Lari sekuat hati!',
    },
  ],
};

class AudioService {
  constructor() {
    this.cache = new Map();
    this.audioContext = null;
    this.isMuted = false;
    this.voices = [];
    this.lastShuffledIndex = { deku: -1, bakugou: -1 };
    this.currentAudio = null;
    this.currentSourceNode = null;
    this.isPaused = false;
    this.currentLine = null;
    this.introGainNode = null;
    this.introActiveNodes = [];
    this.introThemePlayed = false;
    this._introPending = false;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
      this.voices = window.speechSynthesis.getVoices();
    }

    // Auto-stop audio when app is minimized, sent to background, or navigated
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.stopAll();
        }
      });
      window.addEventListener('pagehide', () => this.stopAll());
      window.addEventListener('beforeunload', () => this.stopAll());
      window.addEventListener('hashchange', () => this.stopAll());
      this.setupUIListeners();
    }
  }

  /**
   * Unlock AudioContext on initial touch/click and automatically wire anime UI SFX
   * to all interactive buttons, links, inputs, and toggles across the web app.
   */
  setupUIListeners() {
    if (typeof document === 'undefined') return;

    // Unlock AudioContext on first gesture (conforms to browser autoplay policies)
    const unlockAudio = () => {
      this.init();
      if (this._introPending && !this.introThemePlayed) {
        this.playIntroTheme();
      }
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    let lastSoundTime = 0;

    // Use capturing click listener to catch all button interactions before stopPropagation
    document.addEventListener('click', (e) => {
      if (store.settings?.soundEnabled === false || this.isMuted) return;

      const now = performance.now();
      if (now - lastSoundTime < 35) return; // Prevent double-trigger on rapid bubbling

      const target = e.target.closest('button, a, input, select, textarea, [role="button"], .chip, .nav-item, .side-item, .pill, .btn, .bento-card, .tab');
      if (!target) return;

      // Don't play on disabled elements
      if (target.disabled || target.getAttribute('aria-disabled') === 'true' || target.classList.contains('disabled')) {
        return;
      }

      // Check explicit data-sound attribute
      const explicit = target.closest('[data-sound]')?.getAttribute('data-sound');
      if (explicit === 'none' || explicit === 'false' || explicit === 'off') return;

      lastSoundTime = now;

      // Classify the interactive element to appropriate anime UI sound
      let soundType = explicit || 'tap';

      if (!explicit) {
        const tag = target.tagName.toLowerCase();
        const type = (target.type || '').toLowerCase();

        if (type === 'checkbox' || type === 'radio') {
          soundType = target.checked ? 'toggle-on' : 'toggle-off';
        } else if (
          target.classList.contains('nav-item') ||
          target.classList.contains('side-item') ||
          target.classList.contains('tab') ||
          target.classList.contains('lang-pill-btn') ||
          target.id === 'topbar-lang-toggle' ||
          target.id === 'topbar-tutorial-btn' ||
          (tag === 'a' && target.getAttribute('href')?.startsWith('#/'))
        ) {
          soundType = 'nav';
        } else if (
          type === 'submit' ||
          target.classList.contains('btn-primary') ||
          target.classList.contains('btn-success') ||
          target.classList.contains('nav-fab') ||
          target.id?.includes('save') ||
          target.id?.includes('confirm') ||
          target.id === 'btn-quick-scan'
        ) {
          soundType = 'confirm';
        } else if (
          target.classList.contains('chip') ||
          target.classList.contains('water-btn') ||
          target.dataset.act === 'add' ||
          target.dataset.act === 'sub'
        ) {
          soundType = 'stepper';
        } else if (
          target.classList.contains('btn-danger') ||
          target.classList.contains('sheet-close') ||
          target.classList.contains('modal-close') ||
          target.classList.contains('cp-close') ||
          target.id?.includes('delete') ||
          target.id?.includes('close')
        ) {
          soundType = 'cancel';
        }
      }

      this.playUISound(soundType);
    }, { capture: true, passive: true });
  }

  /**
   * Procedural Anime UI Sound Effects (No human voices, 0ms latency, Web Audio API)
   * Types: 'tap', 'nav', 'confirm', 'toggle', 'toggle-on', 'toggle-off', 'stepper', 'cancel'
   */
  playUISound(type = 'tap') {
    if (store.settings?.soundEnabled === false || this.isMuted) return;
    this.init();
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => this._synthUISound(type)).catch(() => {});
    } else {
      this._synthUISound(type);
    }
  }

  _synthUISound(type) {
    try {
      const ctx = this.audioContext;
      if (!ctx) return;
      const now = ctx.currentTime;

      switch (type) {
        case 'nav': {
          // Melodic ascending two-tone anime menu chime (C6 1046.5Hz -> G6 1567.98Hz)
          const notes = [
            { freq: 1046.5, time: 0, dur: 0.035, vol: 0.18 },
            { freq: 1567.98, time: 0.026, dur: 0.048, vol: 0.24 }
          ];
          notes.forEach(({ freq, time, dur, vol }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + time);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.04, now + time + dur);
            gain.gain.setValueAtTime(vol, now + time);
            gain.gain.exponentialRampToValueAtTime(0.0005, now + time + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + time);
            osc.stop(now + time + dur + 0.005);
          });
          break;
        }

        case 'confirm': {
          // Triumphant 3-note ascending anime data confirm arpeggio (D6 -> F#6 -> A6)
          const notes = [
            { freq: 1174.66, time: 0, dur: 0.035, vol: 0.18 },
            { freq: 1479.98, time: 0.032, dur: 0.04, vol: 0.22 },
            { freq: 1760.00, time: 0.068, dur: 0.075, vol: 0.28 }
          ];
          notes.forEach(({ freq, time, dur, vol }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + time);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.06, now + time + dur);
            gain.gain.setValueAtTime(vol, now + time);
            gain.gain.exponentialRampToValueAtTime(0.0005, now + time + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + time);
            osc.stop(now + time + dur + 0.005);
          });
          break;
        }

        case 'toggle':
        case 'toggle-on': {
          // Crisp high-tech switch snap (upward pitch 1100Hz -> 1760Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1100, now);
          osc.frequency.exponentialRampToValueAtTime(1760, now + 0.024);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.026);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.028);
          break;
        }

        case 'toggle-off': {
          // Soft mechanical down-click (downward pitch 1500Hz -> 900Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1500, now);
          osc.frequency.exponentialRampToValueAtTime(900, now + 0.024);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.026);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.028);
          break;
        }

        case 'stepper': {
          // Light digital counter tick (1320Hz -> 1650Hz, 22ms)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1320, now);
          osc.frequency.exponentialRampToValueAtTime(1650, now + 0.02);
          gain.gain.setValueAtTime(0.20, now);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.022);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.024);
          break;
        }

        case 'cancel': {
          // Gentle descending dismiss tone (980Hz -> 650Hz, 35ms)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(980, now);
          osc.frequency.exponentialRampToValueAtTime(650, now + 0.032);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.035);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.038);
          break;
        }

        case 'tap':
        default: {
          // Anime HUD glass cursor tap: clean sine sweep 1760Hz -> 1200Hz (26ms)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1760, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.025);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.028);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.03);
          break;
        }
      }
    } catch {
      // Audio synthesis handled gracefully
    }
  }

  /**
   * Check if voice or dialogue audio is currently playing
   */
  isPlayingVoice() {
    return !!(
      (this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended) ||
      this.currentSourceNode ||
      (typeof window !== 'undefined' && window.speechSynthesis?.speaking && !window.speechSynthesis?.paused)
    );
  }

  /**
   * Check if voice audio is currently in a paused state
   */
  isPausedVoice() {
    return !!(
      this.isPaused ||
      (this.currentAudio && this.currentAudio.paused && this.currentAudio.currentTime > 0 && !this.currentAudio.ended) ||
      (typeof window !== 'undefined' && window.speechSynthesis?.paused)
    );
  }

  /**
   * Pause currently playing voice audio without resetting playback progress
   */
  pauseVoice() {
    let didPause = false;
    this.isPaused = true;
    if (this.currentAudio && !this.currentAudio.paused) {
      try {
        this.currentAudio.pause();
        didPause = true;
      } catch { /* noop */ }
    }
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking && !window.speechSynthesis?.paused) {
      try {
        window.speechSynthesis.pause();
        didPause = true;
      } catch { /* noop */ }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calmal:voice-state', {
        detail: { isPlaying: false, isPaused: true, character: this.currentLine?.character }
      }));
    }
    return didPause;
  }

  /**
   * Resume voice audio from where it was paused without changing the line
   */
  async resumeVoice() {
    this.isPaused = false;
    if (this.currentAudio && this.currentAudio.paused && !this.currentAudio.ended) {
      try {
        await this.currentAudio.play();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('calmal:voice-state', {
            detail: { isPlaying: true, isPaused: false, character: this.currentLine?.character }
          }));
        }
        return true;
      } catch { /* fallback to replaying line */ }
    }
    if (typeof window !== 'undefined' && window.speechSynthesis?.paused) {
      try {
        window.speechSynthesis.resume();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('calmal:voice-state', {
            detail: { isPlaying: true, isPaused: false, character: this.currentLine?.character }
          }));
        }
        return true;
      } catch { /* noop */ }
    }
    // Replay active line if audio element lost buffer
    if (this.currentLine?.character && this.currentLine?.line) {
      await this.playLineAudio(this.currentLine.character, this.currentLine.line);
      return true;
    }
    return false;
  }

  /**
   * Procedural Heroic Anime Opening Jingle (Web Audio API)
   * 3.5s catchy anime shonen fanfare (Deku/Bakugou kickoff theme)
   * Plays during 4-second app launch screen.
   */
  unlockAudio() {
    this.init();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      return this.audioContext.resume();
    }
    return Promise.resolve();
  }

  playIntroTheme(force = false) {
    if (store.settings?.soundEnabled === false || this.isMuted) return;
    if (this.introThemePlayed && !force) return;
    this.init();
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this._introPending = true;
      this.audioContext.resume().then(() => {
        if (this.audioContext && this.audioContext.state === 'running' && (this._introPending || force)) {
          this._synthIntroTheme();
        }
      }).catch(() => {});
    } else {
      this._synthIntroTheme();
    }
  }

  _synthIntroTheme() {
    try {
      this.introThemePlayed = true;
      this._introPending = false;
      this.stopIntroTheme();
      const ctx = this.audioContext;
      if (!ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      // Clear, rich, punchy volume (0.65) so it is clearly audible on mobile & laptop speakers
      masterGain.gain.setValueAtTime(0.65, now);
      masterGain.connect(ctx.destination);
      this.introGainNode = masterGain;
      this.introActiveNodes = [];

      // 1. Rising Sparkle Arpeggio (0.0s -> 0.8s)
      const arpeggio = [
        { freq: 523.25, time: 0.00, dur: 0.22, vol: 0.45, type: 'triangle' }, // C5
        { freq: 659.25, time: 0.15, dur: 0.22, vol: 0.48, type: 'triangle' }, // E5
        { freq: 783.99, time: 0.30, dur: 0.25, vol: 0.52, type: 'triangle' }, // G5
        { freq: 1046.50, time: 0.45, dur: 0.35, vol: 0.58, type: 'sine' },     // C6
        { freq: 1318.51, time: 0.60, dur: 0.40, vol: 0.60, type: 'sine' },     // E6
      ];

      // 2. Anime Heroic Brass / Power Chord hits (0.75s -> 2.6s)
      const chords = [
        // Chord 1 (F major / heroic lift) at 0.9s
        { freq: 349.23, time: 0.90, dur: 0.55, vol: 0.40, type: 'sawtooth' },
        { freq: 440.00, time: 0.90, dur: 0.55, vol: 0.38, type: 'triangle' },
        { freq: 523.25, time: 0.90, dur: 0.55, vol: 0.45, type: 'sine' },

        // Chord 2 (G major / dominant peak) at 1.45s
        { freq: 392.00, time: 1.45, dur: 0.60, vol: 0.42, type: 'sawtooth' },
        { freq: 493.88, time: 1.45, dur: 0.60, vol: 0.40, type: 'triangle' },
        { freq: 587.33, time: 1.45, dur: 0.60, vol: 0.48, type: 'sine' },

        // Chord 3 - Final PLUS ULTRA Power Chord (C major) at 2.05s
        { freq: 261.63, time: 2.05, dur: 1.65, vol: 0.45, type: 'sawtooth' }, // C4
        { freq: 392.00, time: 2.05, dur: 1.65, vol: 0.40, type: 'triangle' }, // G4
        { freq: 659.25, time: 2.05, dur: 1.65, vol: 0.45, type: 'sine' },     // E5
        { freq: 1046.50, time: 2.05, dur: 1.65, vol: 0.50, type: 'triangle' },// C6
        { freq: 1567.98, time: 2.05, dur: 1.45, vol: 0.35, type: 'sine' },    // G6
      ];

      const allNotes = [...arpeggio, ...chords];

      allNotes.forEach(({ freq, time, dur, vol, type }) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        if (time >= 0.75) {
          osc.frequency.linearRampToValueAtTime(freq * 1.015, now + time + dur * 0.4);
          osc.frequency.linearRampToValueAtTime(freq, now + time + dur);
        }

        noteGain.gain.setValueAtTime(0.0001, now + time);
        noteGain.gain.linearRampToValueAtTime(vol, now + time + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);

        this.introActiveNodes.push({ osc, gain: noteGain });
      });

      masterGain.gain.setValueAtTime(0.65, now + 3.2);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

      setTimeout(() => {
        if (this.introGainNode === masterGain) {
          this.stopIntroTheme();
        }
      }, 3900);
    } catch {
      // Audio synthesis fallback silently ignored
    }
  }

  stopIntroTheme() {
    this.introThemePlayed = false;
    this._introPending = false;
    if (this.introGainNode) {
      try {
        const ctx = this.audioContext;
        if (ctx) {
          this.introGainNode.gain.setValueAtTime(this.introGainNode.gain.value, ctx.currentTime);
          this.introGainNode.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        }
      } catch { /* noop */ }
      this.introGainNode = null;
    }

    if (this.introActiveNodes && this.introActiveNodes.length) {
      this.introActiveNodes.forEach(({ osc, gain }) => {
        try {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        } catch { /* noop */ }
      });
      this.introActiveNodes = [];
    }
  }

  /**
   * Immediately stops any currently playing audio, speech, or SFX
   * Prevents audio running in the background or overlapping
   */
  stopAll() {
    this._playbackId = (this._playbackId || 0) + 1;
    this.isPaused = false;
    this.stopIntroTheme();
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch { /* noop */ }
      this.currentAudio = null;
    }
    if (this.cache) {
      this.cache.forEach((audio) => {
        try {
          if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
          }
        } catch { /* noop */ }
      });
    }
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch { /* noop */ }
      this.currentSourceNode = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch { /* noop */ }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('calmal:voice-state', { detail: { isPlaying: false, isPaused: false } }));
    }
  }

  init() {
    if (!this.audioContext && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioContext = new AudioCtx();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Procedural Audio FX: Bakugou Explosions & Deku One For All electrical surges
   */
  playSyntheticHeroSFX(character, eventKey) {
    if (!this.audioContext) return;
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      if (character === 'bakugou') {
        // 1. Procedural explosion noise burst
        const bufferSize = Math.floor(ctx.sampleRate * 0.35);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(140, now + 0.32);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);

        // 2. Deep sub-bass explosion impact thud
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.3);

        oscGain.gain.setValueAtTime(0.2, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        // Deku: One For All electrical chime & triumphant harmonic arpeggio
        const chord = eventKey === 'goal' ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          const startTime = now + idx * 0.05;
          osc.frequency.setValueAtTime(freq, startTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.22);

          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.25);
        });
      }
    } catch {
      // Audio synth handled gracefully
    }
  }

  /**
   * Speak authentic Japanese anime voice dialogue via Web Speech API
   * Falls back gracefully to phonetic Romaji if Japanese voice pack is not installed
   */
  speakJapanese(character, soundKey) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || this.isMuted) return;
    try {
      window.speechSynthesis.cancel();

      const scriptObj = JAPANESE_VOICE_SCRIPTS[character]?.[soundKey] || JAPANESE_VOICE_SCRIPTS[character]?.greet;
      if (!scriptObj) return;

      const voices = this.voices.length ? this.voices : window.speechSynthesis.getVoices();
      const jaVoice = voices.find((v) => v.lang.startsWith('ja') || v.lang.includes('JP'));

      // Strict requirement: Never speak Japanese anime lines in an English robotic voice
      if (!jaVoice) return;

      const spokenText = scriptObj.ja;
      const utter = new SpeechSynthesisUtterance(spokenText);
      utter.voice = jaVoice;
      utter.lang = 'ja-JP';

      if (character === 'bakugou') {
        utter.rate = 1.15; // Aggressive, explosive pace
        utter.pitch = 0.8; // Lower, fiery Bakugou tone
      } else {
        utter.rate = 1.05; // Bright, eager pace
        utter.pitch = 1.25; // Higher, heroic Deku tone
      }

      utter.volume = 1.0;
      window.speechSynthesis.speak(utter);
    } catch {
      // Speech handled safely
    }
  }

  /**
   * Synchronously pick the next line for a character, save to store, and return it.
   * This guarantees 0ms delay for UI updates!
   */
  pickNextLine(character = 'deku') {
    const charKey = (character === 'baku' || character === 'bakugo') ? 'bakugou' : character;
    const pool = VOICE_SHUFFLE_CATALOG[charKey] || VOICE_SHUFFLE_CATALOG.deku;
    if (!pool || !pool.length) return null;

    let nextIdx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && nextIdx === this.lastShuffledIndex[charKey]) {
      nextIdx = (nextIdx + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    }
    this.lastShuffledIndex[charKey] = nextIdx;
    const pickedLine = pool[nextIdx];

    // Persist to store so dashboard and other screens stay in sync
    store.setCompanionActiveLine?.(charKey, pickedLine);

    return { character: charKey, line: pickedLine, index: nextIdx };
  }

  /**
   * Play the audio for a specific line in background (non-blocking)
   * Auto-stops when finished and stops any previous audio
   */
  async playLineAudio(character = 'deku', lineObj) {
    if (store.settings?.soundEnabled === false || this.isMuted) return;
    this.stopAll();
    this.init();
    const playbackId = ++this._playbackId;
    const charKey = (character === 'baku' || character === 'bakugo') ? 'bakugou' : character;
    const line = lineObj || VOICE_SHUFFLE_CATALOG[charKey]?.[0];
    if (!line) return;

    this.isPaused = false;
    this.currentLine = { character: charKey, line };

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (charKey === 'bakugou') navigator.vibrate([40, 25, 70]);
      else navigator.vibrate(20);
    }

    const version = 'v=6';
    const primaryPath = `/assets/companions/${charKey}/audio/${line.file}?${version}`;
    const rawPrimaryPath = `/assets/companions/${charKey}/audio/${line.file}`;
    const fallbackPath = `/assets/companions/${charKey}/audio/${charKey}_voice.mp3?${version}`;

    for (const p of [primaryPath, rawPrimaryPath, fallbackPath]) {
      if (this._playbackId !== playbackId) return;
      try {
        let audio = this.cache.get(p);
        if (!audio) {
          audio = new Audio(p);
          audio.preload = 'auto';
          this.cache.set(p, audio);
        }
        audio.currentTime = 0;
        this.currentAudio = audio;

        // Auto-stop tracking when finished
        audio.onended = () => {
          if (this.currentAudio === audio) {
            this.currentAudio = null;
            this.isPaused = false;
          }
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('calmal:voice-state', { detail: { isPlaying: false, isPaused: false } }));
        };
        audio.onpause = () => {
          if (!this.isPaused && this.currentAudio === audio) {
            this.currentAudio = null;
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('calmal:voice-state', {
              detail: { isPlaying: false, isPaused: this.isPaused, character: this.currentLine?.character }
            }));
          }
        };
        audio.onerror = () => {
          if (this.currentAudio === audio) {
            this.currentAudio = null;
            this.isPaused = false;
          }
          if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('calmal:voice-state', { detail: { isPlaying: false, isPaused: false } }));
        };

        await audio.play();
        if (this._playbackId !== playbackId) {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
          return;
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('calmal:voice-state', { detail: { isPlaying: true, isPaused: false, character: charKey } }));
        }
        return;
      } catch {
        // try next
      }
    }

    if (this._playbackId !== playbackId) return;

    // Direct Web Audio fallback with auto-stop tracking
    try {
      if (this.audioContext) {
        const resp = await fetch(primaryPath);
        if (this._playbackId !== playbackId) return;
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          if (this._playbackId !== playbackId) return;
          const audioBuf = await this.audioContext.decodeAudioData(arrayBuf);
          if (this._playbackId !== playbackId) return;
          const srcNode = this.audioContext.createBufferSource();
          srcNode.buffer = audioBuf;
          srcNode.connect(this.audioContext.destination);
          this.currentSourceNode = srcNode;
          srcNode.onended = () => {
            if (this.currentSourceNode === srcNode) this.currentSourceNode = null;
            this.isPaused = false;
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('calmal:voice-state', { detail: { isPlaying: false, isPaused: false } }));
          };
          srcNode.start(0);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('calmal:voice-state', { detail: { isPlaying: true, isPaused: false, character: charKey } }));
          }
          return;
        }
      }
    } catch {
      // fallback
    }

    if (this._playbackId !== playbackId) return;

    this.playSyntheticHeroSFX(charKey, 'greet');
    this.speakJapanese(charKey, 'greet');
  }

  /**
   * Shuffle and play a random line for a character, avoiding consecutive repeats
   */
  async playShuffled(character = 'deku') {
    const picked = this.pickNextLine(character);
    if (!picked) return null;

    // Trigger audio in background without blocking UI
    this.playLineAudio(picked.character, picked.line).catch(() => {});

    return { success: true, character: picked.character, line: picked.line, index: picked.index };
  }

  /**
   * Play sound effect or voice clip for a character
   */
  async play(character = 'deku', soundKey = 'greet', customText = '') {
    if (store.settings?.soundEnabled === false || this.isMuted) return null;
    this.stopAll();
    this.init();

    const charKey = (character === 'baku' || character === 'bakugo') ? 'bakugou' : character;

    // If caller wants shuffle or greet (general tap on voice icon), use shuffle engine
    if (soundKey === 'shuffle' || soundKey === 'greet' || !soundKey) {
      return this.playShuffled(charKey);
    }

    // Trigger haptic vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (charKey === 'bakugou') navigator.vibrate([30, 20, 60]);
      else navigator.vibrate(15);
    }

    const version = 'v=6';
    const candidatePaths = [
      `/assets/companions/${charKey}/audio/${charKey}_${soundKey}.mp3?${version}`,
      `/assets/companions/${charKey}/audio/${charKey}_${soundKey}.mp3`,
      charKey === 'bakugou' ? `/assets/companions/bakugou/audio/baku_${soundKey}.mp3?${version}` : null,
      `/assets/companions/${charKey}/audio/${charKey}_line1.mp3?${version}`,
      `/assets/companions/${charKey}/audio/${charKey}_voice.mp3?${version}`,
    ].filter(Boolean);

    for (const filePath of candidatePaths) {
      try {
        let audio = this.cache.get(filePath);
        if (!audio) {
          audio = new Audio(filePath);
          audio.preload = 'auto';
          this.cache.set(filePath, audio);
        }
        audio.currentTime = 0;
        this.currentAudio = audio;
        audio.onended = () => {
          if (this.currentAudio === audio) this.currentAudio = null;
        };
        audio.onpause = () => {
          if (this.currentAudio === audio) this.currentAudio = null;
        };
        audio.onerror = () => {
          if (this.currentAudio === audio) this.currentAudio = null;
        };
        await audio.play();
        return { success: true, character: charKey, soundKey };
      } catch {
        // Continue to next candidate or fallback
      }
    }

    // High-precision Web Audio procedural FX + Japanese-only Speech Synthesis fallback
    this.playSyntheticHeroSFX(charKey, soundKey);
    this.speakJapanese(charKey, soundKey);
    return { success: true, character: charKey, soundKey };
  }

  playSound(character = 'deku', soundKey = 'greet', customText = '') {
    return this.play(character, soundKey, customText);
  }

  setMute(muted) {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }
}

export const soundboard = new AudioService();

