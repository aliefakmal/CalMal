// Web Audio & Companion Soundboard Service (Deku & Bakugou SFX / Accurate Japanese Voice)
import { store } from './store.js';

export const JAPANESE_VOICE_SCRIPTS = {
  deku: {
    greet: {
      ja: '大丈夫！ここから後ろには絶対行かせないよ！',
      romaji: 'Daijoubu! Koko kara ushiro ni wa zettai ikasenai yo!',
    },
    analyze: {
      ja: '大丈夫！ノートにカロリーと栄養素をしっかり記録したよ！',
      romaji: 'Daijoubu! Nooto ni karorii to eiyouso o shikkari kiroku shita yo!',
    },
    goal: {
      ja: '更に向こうへ！100万% デラウェア・デトロイト・スマッシュ！！',
      romaji: 'Sara ni mukou e! Hyakuman Pāsento Delaware Detroit SMASH!!',
    },
    over: {
      ja: '大丈夫！諦めちゃダメだ！一緒に走って消費しよう！',
      romaji: 'Daijoubu! Akiramecha dame da! Issho ni hashitte shouhi shiyou!',
    },
    run: {
      ja: 'だから走れぇぇ！ワン・フォー・オール、限界を超えるんだ！',
      romaji: 'Dakara hashireee! Wan Foo Ooru, genkai o koerunda!',
    },
  },
  bakugou: {
    greet: {
      ja: 'バカ！俺の背中追うならサボってんじゃねぇ！',
      romaji: 'Baka! Ore no senaka ou nara sabotten ja nee!',
    },
    analyze: {
      ja: 'バカ！何食おうとしてやがる、俺が見てやる！',
      romaji: 'Baka! Nani kuou to shite yagaru, ore ga mite yaru!',
    },
    goal: {
      ja: '爆豪の勝利だ！当たり前だ！俺について来い！',
      romaji: 'Bakugou no shouri da! Atarimae da! Ore ni tsuite koi!',
    },
    over: {
      ja: 'おいコラァ！！カロリーオーバーだ！今すぐ走って全部燃やせぇ！',
      romaji: 'Oi koraaa!! Karorii oobaa da! Ima sugu hashitte zenbu moyaseee!',
    },
    run: {
      ja: 'バカ！ついて来い！置いてくぞ！ぶっ飛ばして走れぇ！',
      romaji: 'Baka! Tsuite koi! Oiteku zo! Buttobashite hashireee!',
    },
  },
};

class AudioService {
  constructor() {
    this.cache = new Map();
    this.audioContext = null;
    this.isMuted = false;
    this.voices = [];

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
      this.voices = window.speechSynthesis.getVoices();
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

      // If Japanese voice exists, use authentic Kanji/Kana; if not, use phonetic Romaji
      const spokenText = jaVoice ? scriptObj.ja : scriptObj.romaji;
      const utter = new SpeechSynthesisUtterance(spokenText);

      if (jaVoice) {
        utter.voice = jaVoice;
        utter.lang = 'ja-JP';
      } else {
        utter.lang = 'en-US';
      }

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
   * Play sound effect or voice clip for a character
   */
  async play(character = 'deku', soundKey = 'greet', customText = '') {
    if (store.settings?.soundEnabled === false || this.isMuted) return;
    this.init();

    const charKey = (character === 'baku' || character === 'bakugo') ? 'bakugou' : character;

    // Trigger haptic vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (charKey === 'bakugou') navigator.vibrate([30, 20, 60]);
      else navigator.vibrate(15);
    }

    const candidatePaths = [
      `/assets/companions/${charKey}/audio/${charKey}_${soundKey}.mp3`,
      charKey === 'bakugou' ? `/assets/companions/bakugou/audio/baku_${soundKey}.mp3` : null,
      `/assets/companions/${charKey}/audio/${charKey}_voice.mp3`,
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
        await audio.play();
        return; // Successfully played audio
      } catch (err) {
        // Continue to next candidate or fallback
      }
    }

    // High-precision Web Audio procedural FX + Speech Synthesis fallback
    this.playSyntheticHeroSFX(charKey, soundKey);
    this.speakJapanese(charKey, soundKey);
  }

  setMute(muted) {
    this.isMuted = muted;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && muted) {
      window.speechSynthesis.cancel();
    }
  }
}

export const soundboard = new AudioService();
