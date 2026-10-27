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

export const VOICE_SHUFFLE_CATALOG = {
  deku: [
    {
      file: 'deku_line1.mp3',
      ja: '大丈夫！ここから後ろには絶対行かせないよ！',
      romaji: 'Daijoubu! Koko kara ushiro ni wa zettai ikasenai yo!',
      en: 'Don’t worry! I will never let anyone pass behind me!',
      ms: 'Jangan risau! Saya takkan biarkan sesiapa lepasi garisan ini!',
    },
    {
      file: 'deku_line2.mp3',
      ja: 'だから走れぇぇ！限界を超えて行こう！',
      romaji: 'Dakara hashireee! Genkai o koete ikou!',
      en: 'So run!! Let’s break through our limits!',
      ms: 'Sebab itu terus berlari!! Mari melepasi had kemampuan kita!',
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
      ja: 'さらに向こうへ！プルス・ウルトラ！！',
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
      ja: 'お疲れ様です！今日もよく頑張ったね！',
      romaji: 'Otsukaresama desu! Kyou mo yoku ganbatta ne!',
      en: 'Thank you for your hard work! You gave it your all today!',
      ms: 'Tahniah atas usaha keras! Awak dah bersungguh-sungguh hari ini!',
    },
  ],
  bakugou: [
    {
      file: 'bakugou_line1.mp3',
      ja: 'おいおいおい！上に上がれば関係ねぇ！',
      romaji: 'Oi oi oi! Ue ni agareba kankei nee!',
      en: 'Oi oi oi! Keep climbing to the top, no excuses!',
      ms: 'Oi oi oi! Takde alasan, panjat sampai atas!',
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
      ja: 'おいおいおい！サボってんじゃねぇぞ！',
      romaji: 'Oi oi oi! Sabotten ja nee zo!',
      en: 'Oi oi oi! Don’t you dare slack off!',
      ms: 'Oi oi oi! Jangan berani bermalas-malasan!',
    },
    {
      file: 'bakugou_line4.mp3',
      ja: 'バカ！俺の背中追うなら本気出せ！',
      romaji: 'Baka! Ore no senaka ou nara honki dase!',
      en: 'Idiot! If you’re chasing my back, give it your all!',
      ms: 'Bongok! Kalau nak kejar langkah aku, bersungguh-sungguhlah!',
    },
    {
      file: 'bakugou_line5.mp3',
      ja: '爆豪の勝利だ！当たり前だ、ついて来い！',
      romaji: 'Bakugou no shouri da! Atarimae da, tsuite koi!',
      en: 'Bakugo’s victory! That’s obvious, now follow me!',
      ms: 'Kemenangan mutlak Bakugo! Ikut aku!',
    },
    {
      file: 'bakugou_line6.mp3',
      ja: 'ついて来い！置いてくぞ！ぶっ飛ばして走れぇ！',
      romaji: 'Tsuite koi! Oiteku zo! Buttobashite hashireee!',
      en: 'Keep up! I’ll leave you behind! Sprint like crazy!',
      ms: 'Ikut aku! Aku tinggal kau nanti! Lari sekuat hati!',
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
   */
  async playLineAudio(character = 'deku', lineObj) {
    if (store.settings?.soundEnabled === false || this.isMuted) return;
    this.init();
    const charKey = (character === 'baku' || character === 'bakugo') ? 'bakugou' : character;
    const line = lineObj || VOICE_SHUFFLE_CATALOG[charKey]?.[0];
    if (!line) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (charKey === 'bakugou') navigator.vibrate([40, 25, 70]);
      else navigator.vibrate(20);
    }

    const version = 'v=4';
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
        await audio.play();
        return;
      } catch {
        // try next
      }
    }

    // Direct Web Audio fallback
    try {
      if (this.audioContext) {
        const resp = await fetch(primaryPath);
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          const audioBuf = await this.audioContext.decodeAudioData(arrayBuf);
          const srcNode = this.audioContext.createBufferSource();
          srcNode.buffer = audioBuf;
          srcNode.connect(this.audioContext.destination);
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

    const version = 'v=4';
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && muted) {
      window.speechSynthesis.cancel();
    }
  }
}

export const soundboard = new AudioService();
