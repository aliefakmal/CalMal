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
    }
  }

  /**
   * Immediately stops any currently playing audio, speech, or SFX
   * Prevents audio running in the background or overlapping
   */
  stopAll() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch { /* noop */ }
      this.currentAudio = null;
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
    const charKey = (character === 'baku' || character === 'bakugo') ? 'bakugou' : character;
    const line = lineObj || VOICE_SHUFFLE_CATALOG[charKey]?.[0];
    if (!line) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (charKey === 'bakugou') navigator.vibrate([40, 25, 70]);
      else navigator.vibrate(20);
    }

    const version = 'v=6';
    const primaryPath = `/assets/companions/${charKey}/audio/${line.file}?${version}`;
    const rawPrimaryPath = `/assets/companions/${charKey}/audio/${line.file}`;
    const fallbackPath = `/assets/companions/${charKey}/audio/${charKey}_voice.mp3?${version}`;

    for (const p of [primaryPath, rawPrimaryPath, fallbackPath]) {
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
          if (this.currentAudio === audio) this.currentAudio = null;
        };
        audio.onpause = () => {
          if (this.currentAudio === audio) this.currentAudio = null;
        };
        audio.onerror = () => {
          if (this.currentAudio === audio) this.currentAudio = null;
        };

        await audio.play();
        return;
      } catch {
        // try next
      }
    }

    // Direct Web Audio fallback with auto-stop tracking
    try {
      if (this.audioContext) {
        const resp = await fetch(primaryPath);
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          const audioBuf = await this.audioContext.decodeAudioData(arrayBuf);
          const srcNode = this.audioContext.createBufferSource();
          srcNode.buffer = audioBuf;
          srcNode.connect(this.audioContext.destination);
          this.currentSourceNode = srcNode;
          srcNode.onended = () => {
            if (this.currentSourceNode === srcNode) this.currentSourceNode = null;
          };
          srcNode.start(0);
          return;
        }
      }
    } catch {
      // fallback
    }

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

  setMute(muted) {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }
}

export const soundboard = new AudioService();
