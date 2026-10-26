// Web Audio & Companion Soundboard Service (Deku & Bakugou SFX / Japanese Voice)
import { store } from './store.js';

export const JAPANESE_VOICE_SCRIPTS = {
  deku: {
    greet: 'おはよう！今日も一日、全力で頑張ろう！',
    analyze: 'なるほど… カロリーと栄養バランスをしっかり計算するね！',
    goal: 'やった！今日の目標達成だ！プルス・ウルトラ！',
    over: '大丈夫！諦めないで、今夜ウォーキングしよう！',
    run: '行こう！ワン・フォー・オール、フルカウル！',
  },
  bakugou: {
    greet: 'おい！起きたか！サボるんじゃねえぞ！',
    analyze: '何食おうとしてんだ？！俺がチェックしてやる！',
    goal: 'フン、悪くねえな。明日もこの調子でいけ！',
    over: 'おいクソ野郎！カロリーオーバーだ！今すぐ走れ！',
    run: 'ついて来い！置いてくぞ！爆破するぞ！',
  },
};

class AudioService {
  constructor() {
    this.cache = new Map();
    this.audioContext = null;
    this.isMuted = false;
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
   * Synthesize heroic tones using Web Audio API oscillators
   */
  playSyntheticHeroSFX(character, eventKey) {
    if (!this.audioContext) return;
    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (character === 'bakugou') {
        // Aggressive sawtooth explosion burst
        osc.type = 'sawtooth';
        if (eventKey === 'goal') {
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(740, now + 0.25);
        } else if (eventKey === 'over') {
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.linearRampToValueAtTime(90, now + 0.35);
        } else {
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(520, now + 0.2);
        }
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Deku: Energetic One For All electrical surge
        osc.type = 'triangle';
        if (eventKey === 'goal') {
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
        } else if (eventKey === 'over') {
          osc.frequency.setValueAtTime(380, now);
          osc.frequency.linearRampToValueAtTime(220, now + 0.3);
        } else {
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.exponentialRampToValueAtTime(1046, now + 0.18);
        }
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Audio synth fallback ignored silently
    }
  }

  /**
   * Speak authentic Japanese anime dialogue via Web Speech API
   */
  speakJapanese(character, japaneseText) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || this.isMuted) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(japaneseText);
      utter.lang = 'ja-JP';

      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find((v) => v.lang.startsWith('ja') || v.lang.includes('JP'));
      if (jaVoice) {
        utter.voice = jaVoice;
      }

      if (character === 'bakugou') {
        utter.rate = 1.15; // Aggressive, explosive pace
        utter.pitch = 0.8; // Lower, intense Bakugou tone
      } else {
        utter.rate = 1.05; // Bright, youthful pace
        utter.pitch = 1.25; // Higher, eager Deku tone
      }

      utter.volume = 1.0;
      window.speechSynthesis.speak(utter);
    } catch {
      // Speech fallback handled safely
    }
  }

  /**
   * Play sound effect or voice clip for a character
   */
  async play(character = 'deku', soundKey = 'greet', customText = '') {
    if (store.settings?.soundEnabled === false || this.isMuted) return;
    this.init();

    // Trigger haptic vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (character === 'bakugou') navigator.vibrate([30, 20, 60]);
      else navigator.vibrate(15);
    }

    const filePath = `/assets/companions/${character}/audio/${character}_${soundKey}.mp3`;
    const jaLine = JAPANESE_VOICE_SCRIPTS[character]?.[soundKey] || JAPANESE_VOICE_SCRIPTS[character]?.greet;

    try {
      let audio = this.cache.get(filePath);
      if (!audio) {
        audio = new Audio(filePath);
        audio.preload = 'auto';
        this.cache.set(filePath, audio);
      }
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // If audio file is missing or blocked by browser autoplay, use Web Audio Synth and speak in Japanese
      this.playSyntheticHeroSFX(character, soundKey);
      this.speakJapanese(character, jaLine);
    }
  }

  setMute(muted) {
    this.isMuted = muted;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && muted) {
      window.speechSynthesis.cancel();
    }
  }
}

export const soundboard = new AudioService();
