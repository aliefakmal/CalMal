// Web Audio & Companion Soundboard Service (Deku & Bakugou SFX / Voice)
import { store } from './store.js';

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
   * Synthesize heroic tones using Web Audio API oscillators when audio files are not on disk
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
        // Aggressive sawtooth explosion / burst sound
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
        // Deku: Energetic bright sine / triangle chirp (One For All electrical pulse)
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
   * Speak anime dialogue via Web Speech API (bilingual Japanese/English/Malay tone)
   */
  speakDialogue(character, dialogue) {
    if (!('speechSynthesis' in window) || this.isMuted) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(dialogue);
      utter.rate = character === 'bakugou' ? 1.15 : 1.05;
      utter.pitch = character === 'bakugou' ? 0.9 : 1.2;
      utter.volume = 0.8;
      window.speechSynthesis.speak(utter);
    } catch {
      // Silent error fallback
    }
  }

  /**
   * Play sound effect or voice clip for a character
   */
  async play(character = 'deku', soundKey = 'greet', dialogueText = '') {
    if (store.settings?.soundEnabled === false || this.isMuted) return;
    this.init();

    // Trigger haptic vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (character === 'bakugou') navigator.vibrate([30, 20, 60]);
      else navigator.vibrate(15);
    }

    const filePath = `/assets/companions/${character}/audio/${character}_${soundKey}.mp3`;

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
      // If audio file is missing or blocked by browser autoplay, use Web Audio Synth
      this.playSyntheticHeroSFX(character, soundKey);
      if (dialogueText) {
        this.speakDialogue(character, dialogueText);
      }
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
