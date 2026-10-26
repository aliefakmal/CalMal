# 🚀 CalMal v2.0: Pelan Penambahbaikan Menyeluruh & Sprite Bible
**Dokumen Spesifikasi Kejuruteraan Perisian & Rujukan AI Developer Agent (Antigravity)**

---

## 1. Eksekutif & Ringkasan Projek

Dokumen ini ialah cetak biru (*blueprint*) kejuruteraan bagi menaik taraf repositori **CalMal** daripada prototaip berasaskan simpanan tempatan kepada aplikasi kesihatan bertaraf produksi moden. 

Matlamat utama pembaharuan ini:
1. **Antaramuka Minimalis & "Aesthetic"**: Menggabungkan tipografi bersih ala *Apple Health / Notion* dengan sentuhan visual *Modern Cyber-Anime*.
2. **Sistem Pengesahan (Auth) & Segerak Awan**: Integrasi pengesahan tanpa geseran (*frictionless authentication*) berasaskan Supabase dengan sokongan mod tetamu (*guest-first offline*).
3. **Penyembunyian Kunci API & Keselamatan**: Memindahkan panggilan AI daripada klien ke *Vercel Serverless Function*.
4. **Sprite & Voice SFX Bible**: Transformasi ikon SVG statik kepada sistem *Sprite Sheet* dinamik beranimasi dan kesan suara (Voice SFX) Izuku Midoriya & Katsuki Bakugou berdwibahasa (Jepun/Melayu).
5. **Ciri Konteks Tempatan Malaysia**: Penganggar porsi visual ("Pelaras Kuah") dan log makanan pantas 1-ketukan.

---

## 2. Audit Kod Semasa & Ruang Penambahbaikan

Berdasarkan semakan mendalam ke atas struktur fail projek:

| Komponen / Fail | Keadaan Semasa | Isu / Had | Cadangan Penambahbaikan v2.0 |
| :--- | :--- | :--- | :--- |
| **`src/services/store.js`** | Menggunakan `localStorage` (`calmal.v1`). | Data hilang jika pengguna membersihkan *cache* atau menukar telefon. | Tambah *Hybrid Offline-First Sync* bersama Supabase PostgreSQL. |
| **`src/config/gemini.js`** | Kunci API dipanggil terus di klien (`import.meta.env.VITE_GEMINI_API_KEY`). | Risiko keselamatan pendedahan kunci API Gemini dalam *bundle* klien. | Pindahkan panggilan ke `/api/gemini.js` (Vercel Serverless API) dengan pengesahan token JWT. |
| **`src/screens/dashboard.js`** | Susun atur kad memanjang menegak yang asas. | Terlalu padat pada peranti mudah alih; nisbah ruang kosong (*whitespace*) kurang optimum. | Reka bentuk semula kepada **Bento Grid** responsif dengan *Micro-Interactions*. |
| **`src/components/companion.js`** | Avatar berasaskan ikon SVG ringkas (kilat hijau & letupan oren). | Watak tidak mempunyai ekspresi emosi berasaskan situasi makanan/senaman; tiada audio suara sebenar. | Laksanakan **Sprite Matrix 5-Keadaan** dan **Web Audio Soundboard** (Voice SFX). |
| **`src/screens/scanner.js`** | Input teks nota konteks perlu ditaip secara manual. | Melambatkan pengguna semasa makan di restoran atau kedai mamak. | Sediakan **Malaysia Food Quick Chips** dan pelaras saiz hidangan visual pantas. |

---

## 3. Seni Bina Sistem Pengesahan (Supabase Authentication & Cloud Sync)

Aplikasi akan mengekalkan sifat pantas tempatan (*offline-first zero latency*) menggunakan gabungan `localStorage` dan **Supabase**.

```
[ Antaramuka Pengguna (UI) ]
         │
         ▼
[ Local Store (store.js) ] ── (Serta-merta / Zero Latency) ──> localStorage
         │
    (Debounce 2s / Background Task)
         │
         ▼
[ Supabase Client (supabaseClient.js) ]
         │
   (HTTPS / WSS)
         ▼
[ PostgreSQL Supabase Cloud ]
   ├── profiles (Biometrik, TDEE, Tetapan)
   ├── daily_logs (Makanan, Kalori, Makro)
   ├── activities (Laluan GPS, Jarak, MET)
   └── achievements (Lencana & EXP)
```

### 3.1 Skema Pangkalan Data Supabase (SQL DDL)
Jalankan skrip SQL ini di dalam konsol Supabase:

```sql
-- 1. Jadual Profil Pengguna
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  gender text check (gender in ('male', 'female')),
  age integer check (age > 0),
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  target_weight_kg numeric(5,2),
  activity_level numeric(4,3),
  fitness_goal text check (fitness_goal in ('lose', 'maintain', 'gain')),
  selected_companion text default 'deku' check (selected_companion in ('deku', 'bakugou')),
  sound_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Jadual Log Makanan Harian
create table public.meals (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  meal_time timestamptz default now(),
  meal_type text check (meal_type in ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  food_name text not null,
  calories_kcal integer not null,
  protein_g numeric(5,1) default 0,
  carbs_g numeric(5,1) default 0,
  fat_g numeric(5,1) default 0,
  weight_g integer default 0,
  portion_multiplier numeric(3,2) default 1.0,
  image_url text,
  created_at timestamptz default now()
);

-- 3. Jadual Aktiviti Larian GPS (Strava-Style)
create table public.activities (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  activity_type text default 'GPS Run',
  distance_km numeric(6,3) not null,
  duration_sec integer not null,
  pace_min_per_km numeric(5,2) not null,
  calories_burned_kcal integer not null,
  elevation_gain_m numeric(6,1) default 0,
  route_geojson jsonb,
  created_at timestamptz default now()
);

-- 4. Polisi Keselamatan Baris (Row Level Security - RLS)
alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.activities enable row level security;

create policy "Pengguna hanya boleh membaca & mengubah data sendiri"
  on public.profiles for all
  using (auth.uid() = id);

create policy "Pengguna mengurus log makanan sendiri"
  on public.meals for all
  using (auth.uid() = user_id);

create policy "Pengguna mengurus rekod aktiviti sendiri"
  on public.activities for all
  using (auth.uid() = user_id);
```

### 3.2 Mod Pengesahan "Guest-First" (`src/screens/auth.js`)
* **Pengalaman Tanpa Paksaan:** Pengguna baharu boleh terus menggunakan aplikasi dalam *Guest Mode* tanpa perlu mendaftar segera.
* **Kad Promosi Akaun di Dashboard:**
  *"Simpan progres kalori dan buka kunci pencapaian Hero anda di awan!"*
* **Kaedah Log Masuk:**
  1. Google One-Tap OAuth (`supabase.auth.signInWithOAuth({ provider: 'google' })`).
  2. Magic Link Tanpa Kata Laluan (Email OTP).
  3. Mod Tetamu (*Local Offline Only*).

### 3.3 Keselamatan Kunci API Gemini (`api/gemini.js`)
Pindahkan pengurusan kunci rahsia ke Serverless Function pada Vercel:
```javascript
// api/gemini.js (Vercel Serverless Function)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Kunci API Gemini tidak dikonfigurasi di server.' });
  }

  try {
    const { model = 'gemini-3.5-flash-lite', contents, generationConfig } = req.body;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig }),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Ralat pelayan memproses permintaan AI: ' + err.message });
  }
}
```

---

## 4. Reka Bentuk Semula UI/UX: Minimalist, Elegan & "Cool"

### A. Prinsip Gaya Visual Minimalist
1. **Palet Warna Asas Monokrom Moden:**
   * Latar Belakang Tulen: `#09090B` (Zinc Darkest).
   * Kad & Permukaan (*Surfaces*): `#121215` (Border: `1px solid rgba(255, 255, 255, 0.08)`).
   * Tipografi: Fon sans-serif moden (*Inter* / *SF Pro*), teks utama `#F4F4F5`, teks sekunder `#71717A`.
2. **Dynamic Hero Accent Theming:**
   Antaramuka akan menyala lembut (*subtle rim-light*) mengikut tema jurulatih yang aktif:
   * **Mod Izuku Midoriya:** Aksen Hijau Zamrud (`--hero-accent: #10B981`, `--hero-glow: rgba(16, 185, 129, 0.25)`).
   * **Mod Katsuki Bakugou:** Aksen Oren Letupan (`--hero-accent: #F97316`, `--hero-glow: rgba(249, 115, 22, 0.25)`).

### B. Susun Atur Bento Grid di Dashboard (`src/screens/dashboard.js`)
Struktur papan pemuka disusun dalam grid modular yang kemas:

```
┌────────────────────────────────────────────────────────┐
│  [Top Header] Hi, Alief!  ·  Level 4 Pro Hero          │
├──────────────────────────┬─────────────────────────────┤
│                          │  [Makro Mini-Grid]          │
│   [Kad 1: Baki Kalori]   │  ┌──────────┐ ┌──────────┐  │
│   • Gelung SVG Licin     │  │ Protein  │ │ Karbo    │  │
│   • 1,420 kcal baki      │  └──────────┘ └──────────┘  │
│   • Formula Ringkas      │  ┌──────────┐ ┌──────────┐  │
│                          │  │ Lemak    │ │ Air (1L) │  │
│                          │  └──────────┘ └──────────┘  │
├──────────────────────────┴─────────────────────────────┤
│  [Kad 2: Jurulatih Teman Interaktif (Deku / Bakugou)]  │
│  • Sprite Beranimasi + Buih Dialog Reaktif             │
├────────────────────────────────────────────────────────┤
│  [Kad 3: Makanan Hari Ini] · [Kad 4: Aktiviti Larian]  │
└────────────────────────────────────────────────────────┘
```

### C. Navigasi Bawah Terapung (Floating Glassmorphic Dock)
Menggantikan bar lama dengan reka bentuk terapung moden:
* **Ukuran & Kedudukan:** Jarak $16\text{ px}$ dari bawah skrin, bucu bulat penuh (`border-radius: 32px`), kesan kabur `backdrop-filter: blur(20px)`.
* **5 Butang Utama:**
  1. `[Utama]` (Ikon Rumah Minimalis)
  2. `[Aktiviti]` (Ikon Laluan GPS)
  3. **`[ + IMBAS AI ]`** (Butang terapung utama di tengah bersaiz besar dengan denyutan lembut)
  4. `[Resipi]` (Ikon Chef)
  5. `[Profil]` (Ikon Hero Pengguna)

### D. Penambahbaikan Mesra Pengguna (UX Tempatan Malaysia)
1. **Cip Makanan Pantas 1-Ketukan (*Quick-Add Chips*):**
   Di skrin `scanner.js` & `mealEditor.js`, letakkan cip cepat bagi hidangan popular:
   * *Nasi Lemak Telur Rebus* ($380\text{ kcal}$)
   * *Roti Canai Kosong + Dhal* ($360\text{ kcal}$)
   * *Teh Tarik Kurang Manis* ($110\text{ kcal}$)
   * *Ayam Dada Panggang* ($220\text{ kcal}$)
2. **Pelaras Kuah Visual ("Kuah Slider"):**
   Slider intuitif untuk makanan berlauk:
   * **[Kuah Asing / Kering]** $\rightarrow$ Potong kalori minyak sebanyak $20\%$.
   * **[Biasa / Sedang]** $\rightarrow$ Kalori standard.
   * **[Kuah Banjir / Pekat]** $\rightarrow$ Tambah $120\text{ kcal}$ santan dan minyak tumisan secara automatik.
3. **Maklum Balas Haptik & Skeleton Loading:**
   * Getaran lembut (`navigator.vibrate(10)`) setiap kali butang ditekan atau item berjaya disimpan.
   * Paparan *Shimmer Skeleton* animasi licin semasa model AI sedang memproses gambar makanan.

---

## 5. SPRITE & VOICE SFX BIBLE: Izuku Midoriya & Katsuki Bakugou

Bahagian ini mengandungi panduan visual, audio dan tingkah laku bagi sistem teman motivasi di dalam aplikasi (`src/components/companion.js` & `src/services/companionService.js`).

### A. Struktur Folder Aset Suara & Sprite
Susun aset di bawah direktori `public/`:
```text
public/assets/companions/
├── deku/
│   ├── sprites/
│   │   ├── idle.webp               <-- Loop nafas santai, senyuman mesra
│   │   ├── analyzing.webp          <-- Membebel laju, tulis buku nota No. 13
│   │   ├── goal_hit.webp           <-- Full Cowling lompat gembira
│   │   ├── over_limit.webp         <-- Risau, peluh anime melambai tangan
│   │   └── workout.webp            <-- Pose larian Shoot Style pantas
│   └── audio/
│       ├── deku_greet.mp3          <-- "Ohayou! Kyou mo ganbarou!"
│       ├── deku_analyze.mp3        <-- SFX buku diselak & bisikan laju
│       ├── deku_goal.mp3           <-- "Yosh! PLUS ULTRA!"
│       ├── deku_over.mp3           <-- "Daijoubu! Kita boleh jalan kaki malam ni!"
│       └── deku_run.mp3            <-- "Ikuze! Jaga rentak pernafasan!"
└── bakugou/
    ├── sprites/
    │   ├── idle.webp               <-- Berpeluk tubuh, senyuman sinis
    │   ├── analyzing.webp          <-- Mata garang, tangan berasap
    │   ├── goal_hit.webp           <-- Thumbs-up sambil toleh tepi (tsundere)
    │   ├── over_limit.webp         <-- Urat dahi timbul, letupan di tangan
    │   └── workout.webp            <-- Terbang meluncur dengan letupan
    └── audio/
        ├── baku_greet.mp3          <-- "Oi! Jangan berani mengelat harini!"
        ├── baku_analyze.mp3        <-- "Haa?! Nanda kore... Biar aku check!"
        ├── baku_goal.mp3           <-- "Hmph! Boleh tahan untuk extra macam kau."
        ├── baku_over.mp3           <-- "OI KUSO NERD!! Bakar balik lemak tu!!"
        └── baku_run.mp3            <-- "LARI CEPAT! Siapa suruh perlahan?!"
```

---

### B. Matriks Keadaan Sprite (Companion State Machine)

Setiap watak bertindak balas kepada $5$ keadaan utama sistem:

#### 1. IZUKU MIDORIYA (DEKU)
| State ID | Acara Pencetus (Trigger Event) | Visual Sprite & Animasi | Kesan Khas UI (CSS Glow) |
| :--- | :--- | :--- | :--- |
| `idle` | Pengguna berada di Dashboard secara biasa. | Berdiri tegak dalam sut pahlawan, senyum mesra, animasi nafas perlahan (*looping*). | Cahaya hijau lembut di sekeliling bingkai avatar. |
| `analyzing` | Kamera/AI sedang mengira kalori makanan. | **Meme "Mumbling Deku"**: Menulis pantas di dalam buku nota sambil mulut terkumat-kamit, nota kecil terapung. | Garis getaran halus (*micro-jitter*). |
| `goal_hit` | Sasaran protein/kalori harian tercapai. | **One For All Full Cowling**: Lompat gembira, menggenggam penumbuk ke udara dengan kilat hijau. | Denyutan kilat hijau (`#10B981`) di tepi kad. |
| `over_limit` | Kalori harian melebihi had ($>15\%$). | Wajah risau dengan titisan peluh anime besar, tangan melambai menenangkan pengguna. | Garisan ambar malap (`#F59E0B`). |
| `workout` | Mod Penjejak GPS berjalan aktif. | Larian pantas gaya *Shoot Style* (condong ke depan, kasut besi merah bercahaya). | Garisan laju anime (*speed lines*) di latar belakang. |

#### 2. KATSUKI BAKUGOU (KACCHAN)
| State ID | Acara Pencetus (Trigger Event) | Visual Sprite & Animasi | Kesan Khas UI (CSS Glow) |
| :--- | :--- | :--- | :--- |
| `idle` | Pengguna berada di Dashboard secara biasa. | Berpeluk tubuh, memandang tajam dengan senyuman sinis (*smirk*), percikan api kecil di tapak tangan. | Cahaya oren berdenyut perlahan. |
| `analyzing` | Kamera/AI sedang mengira kalori makanan. | Mengecilkan mata memerhati makanan, tangan mengeluarkan asap nipis kelabu. | Asap tipis naik di sisi widget. |
| `goal_hit` | Sasaran protein/kalori harian tercapai. | Memberi *thumbs-up* tetapi muka toleh ke tepi (gaya tsundere), letupan bunga api kecil di belakang. | Kilauan emas jingga cerah (`#F97316`). |
| `over_limit` | Kalori harian melebihi had ($>15\%$). | **Explosion Mode**: Urat kepala timbul, mata menyala, kedua-dua tangan meletup berterusan! | Kad bergegar pantas (`shake` animasi) dengan kilatan merah. |
| `workout` | Mod Penjejak GPS berjalan aktif. | Terbang meluncur ke hadapan didorong tujahan letupan api dari tangannya (*Explosive Speed*). | Percikan api animasi berterusan di penjuru skrin. |

---

### C. Voice SFX & Jadual Pencetus Audio (`audioService.js`)

Aplikasi memainkan klip audio pendek ($1 - 2$ saat) disusuli teks buih dialog Bahasa Melayu bersahaja:

| Acara | Watak | Fail Audio | Skrip Suara Asal (Jepun) | Teks Dialog Bahasa Melayu |
| :--- | :--- | :--- | :--- | :--- |
| **Buka App (Pagi)** | **Deku** | `deku_greet.mp3` | *"Ohayou! Kyou mo ganbarou!"* | "Selamat pagi! Mulakan sarapan dengan protein secukupnya. Buku nota saya dah sedia!" |
| **Buka App (Pagi)** | **Bakugou** | `baku_greet.mp3` | *"Oi! Okita ka, temee!"* | "Oi! Bangun pun kau! Jangan berani ponteng *workout* hari ni!" |
| **Imbas Makanan** | **Deku** | `deku_analyze.mp3` | *"Butsubutsu... (Mumbling)* | "Hmm kalau saiz porsi ni dalam 150g, minyak kurang sikit... *mumble mumble*..." |
| **Imbas Makanan** | **Bakugou** | `baku_analyze.mp3` | *"Haa?! Nanda kore!"* | "Haa?! Makanan apa kau nak telan ni?! Biar aku periksa kandungan kalori dia!" |
| **Target Tercapai** | **Deku** | `deku_goal.mp3` | *"Yosh! PLUS ULTRA!"* | "Hebatnya! Sasaran makro dan kalori hari ni tepat pada sasaran! Kekalkan disiplin ni!" |
| **Target Tercapai** | **Bakugou** | `baku_goal.mp3` | *"Hmph! Warukunee na."* | "Hmph! Boleh tahan untuk seekor *extra*. Esok jangan berani turun standard!" |
| **Terlebih Kalori** | **Deku** | `deku_over.mp3` | *"Daijoubu, akiramenaide!"* | "Eh, dah terlebih sikit ni... Tak apa, jangan putus asa! Jom kita jalan santai 20 minit malam ni!" |
| **Terlebih Kalori** | **Bakugou** | `baku_over.mp3` | *"OI KUSO NERD! SHINEE!"* | "OI!! Berapa banyak minyak kau bedal ha?! Pakai kasut sukan sekarang, pergi bakar balik kalori tu!!" |
| **Mula Larian GPS**| **Deku** | `deku_run.mp3` | *"Ikuze! Full Cowling!"* | "GPS telah disambung! Tarik nafas ikut ritma, mari pecahkan rekod jarak minggu ini!" |
| **Mula Larian GPS**| **Bakugou** | `baku_run.mp3` | *"Tsuite koi! Oitetsuku zo!"* | "Lari laju-laju kat belakang aku! Kalau kau jalan kaki, siap kau aku kerjakan!" |

---

### D. Kod Pelaksanaan Audio Service (`src/services/audioService.js`)

Untuk mengelakkan isu blok *autoplay* pelayar web, bina modul perkhidmatan audio Web Audio API:

```javascript
// src/services/audioService.js
import { store } from './store.js';

class AudioService {
  constructor() {
    this.cache = new Map();
    this.audioContext = null;
    this.isMuted = false;
  }

  init() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioContext = new AudioCtx();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  async play(character, soundKey) {
    if (store.settings?.soundEnabled === false || this.isMuted) return;
    this.init();

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
    } catch (err) {
      console.warn(`[AudioService] Main balik audio gagal untuk ${filePath}:`, err.message);
    }
  }

  setMute(muted) {
    this.isMuted = muted;
  }
}

export const soundboard = new AudioService();
```

---

## 6. Ciri-Ciri Tambahan Bernilai Tinggi (Aesthetic & Viral)

1. **Sistem Pangkat Hero U.A. High (Gamification):**
   * Pengguna memulakan kembara sebagai *General Studies Trainee* $\rightarrow$ *Class 1-A Hero Trainee* $\rightarrow$ *Provisional License* $\rightarrow$ *Top 10 Pro Hero*.
   * Dapatkan EXP daripada larian konsisten dan pencapaian sasaran protein harian.
2. **Mod "Mamak Late-Night Detector":**
   * Sekiranya pengguna membuka kamera pengimbas melepasi jam 10:30 malam, teman motivasi memberi amaran visual khas:
     * *Bakugou:* Menyalakan api amaran: *"Maggi Goreng waktu tengah malam macam ni?! Kau dah gila ke?!"*
     * *Deku:* *"Tengah malam ni... Kalau boleh minta teh o ais limau tanpa gula ya!"*
3. **Penjana Kad Cerita Media Sosial (Instagram/WhatsApp Story Exporter):**
   * Eksport kad statistik senaman bergaya tinggi (*dark cyber-aesthetic*) yang memaparkan:
     * Garisan laluan larian GPS (vektor SVG bercahaya).
     * Jarak ($d\text{ in km}$), tempoh ($t$), dan purata masa larian ($\text{pace in min/km}$).
     * Watak Izuku atau Bakugou memberi tabik kejayaan.

---

## 7. Senarai Semak Pelaksanaan untuk Ejen AI (Antigravity Task List)

Ejen Antigravity boleh menjalankan pembinaan semula ini langkah demi langkah mengikut senarai semak di bawah:

### Fasa 1: Pengesahan & Pangkalan Data Awan (Supabase)
- [ ] Cipta fail `src/services/supabaseClient.js` menggunakan `@supabase/supabase-js`.
- [ ] Cipta fail `src/services/authService.js` untuk menguruskan sesi pengguna (*Google OAuth*, *Email Magic Link*, dan *Guest Mode*).
- [ ] Ubah suai `src/services/store.js` supaya setiap perubahan data tempatan (*local state*) dihantar secara segerak (*background debounce sync*) ke Supabase.
- [ ] Sediakan fail pelayan fungsi Vercel `/api/gemini.js` dan buang pendedahan kunci API terus di dalam fail `src/config/gemini.js`.

### Fasa 2: Pembaharuan UI/UX Minimalist & Bento Grid
- [ ] Kemas kini pembolehubah CSS di `src/styles/index.css` bagi menyokong tema moden `#09090B`, sempadan lembut, dan warna aksen dinamik (`--hero-accent`).
- [ ] Reka bentuk semula `src/screens/dashboard.js` ke bentuk susun atur **Bento Grid** (Gelung Kalori SVG nipis, Mini Makro Bar, dan Widget Air Pantas).
- [ ] Ubah suai bar navigasi di `src/main.js` kepada dok terapung berkaca (*Floating Glassmorphic Dock*) dengan butang imbasan kamera AI di bahagian tengah.

### Fasa 3: Enjin Audio & Sprite Bible Izuku & Bakugou
- [ ] Cipta `src/services/audioService.js` dengan keupayaan *pre-caching* audio dan pencegahan sekatan *autoplay* pelayar.
- [ ] Naik taraf `src/components/companion.js` dan `src/services/companionService.js` untuk mengendalikan $5$ keadaan sprite (`idle`, `analyzing`, `goal_hit`, `over_limit`, `workout`).
- [ ] Tambah suis audio on/off di dalam skrin `profile.js` dan buih dialog kompanion.
- [ ] Kemas kini *system prompts* di dalam fail `src/constants/prompts.js` bagi menyuntik persona suara Izuku dan Bakugou dalam Bahasa Melayu.

### Fasa 4: Pengoptimuman Pengalaman Makanan Tempatan
- [ ] Tambah cip pantas hidangan popular Malaysia di bahagian atas skrin `src/screens/scanner.js` dan `src/components/mealEditor.js`.
- [ ] Tambah *slider* penalaan saiz kuah ("Kering / Sedang / Banjir") dalam modul pengesahan makanan.
- [ ] Tambah maklum balas getaran haptik (`navigator.vibrate`) apabila kalori berjaya didaftarkan.