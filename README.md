# 🇲🇾 CalMal — AI Calorie Tracker & Strava GPS Activity Tracker

<div align="center">

![CalMal Logo](https://img.shields.io/badge/CalMal-AI%20Health%20%26%20Fitness-000000?style=for-the-badge&logo=apple&logoColor=white)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/ES6+-Vanilla%20JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![OpenStreetMap](https://img.shields.io/badge/Maps-OpenStreetMap%20%2B%20Leaflet-7EBC6F?style=flat-square&logo=openstreetmap&logoColor=white)](https://www.openstreetmap.org/)
[![Gemini 3.5](https://img.shields.io/badge/AI-Gemini%203.5%20Flash%20Lite-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-white?style=flat-square)](LICENSE)

**Aplikasi penjejak kalori pintar khas untuk makanan Malaysia dengan pengesanan GPS ala Strava dan kompanion motivasi anime Izuku Midoriya & Katsuki Bakugou.**

[Ciri-Ciri Utama](#-ciri-ciri-utama) • [Teknologi](#-teknologi) • [Pemasangan](#-pemasangan--permulaan-pantas) • [Struktur Projek](#-struktur-projek) • [Lesen](#-lesen)

</div>

---

## 🌟 Gambaran Keseluruhan (Overview)

**CalMal** ialah aplikasi web progresif (PWA) moden yang direka khusus untuk gaya hidup dan pemakanan rakyat Malaysia. CalMal menggabungkan tiga fungsi utama dalam satu reka bentuk monokrom minimalis yang pantas dan lancar:

1. **Pengimbas Makanan Pintar (AI Food Scanner)**: Mengenal pasti hidangan Malaysia (Nasi Lemak, Roti Canai, Mee Goreng Mamak, Nasi Ayam, Char Kuey Teow, dll.) secara automatik dengan kiraan kalori dan makronutrien lengkap.
2. **Penjejak Aktiviti GPS Bergaya Strava**: Penjejakan langsung menggunakan **OpenStreetMap (OSM)** dan Leaflet tanpa sebarang kunci API pihak ketiga. Menjejaki jarak (km), masa, pace purata (min/km), kelajuan, pembakaran kalori MET, dan melakar laluan polyline secara masa nyata.
3. **Kompanion Anime Interaktif (Deku & Bakugou)**: Gandingan Midoriya (analisis saintifik & empati) dan Bakugou (motivasi tegas & cabaran membakar kalori) dengan animasi komik dan sintesis suara.

---

## ✨ Ciri-Ciri Utama

### 📸 1. Pengimbas Makanan & OCR Label Pemakanan
- **Kamera Sentiasa Aktif (Always-On Camera)**: Akses pantas kamera belakang atau hadapan serta-merta tanpa perlu menekan butang berulang kali.
- **Pengecaman Kod Bar Terus**: Menggunakan `@zxing/browser` dan integrasi pangkalan data produk tempatan OpenFoodFacts.
- **Enjin AI Pemakanan Tempatan Sedia Ada**: Berfungsi 100% tanpa sebarang API key. Jika kunci peribadi dimasukkan, sistem boleh menggunakan model **Gemini 3.5 Flash Lite**.
- **Pecahan Makro & Bahan**: Menganggarkan berat (gram), kalori (kcal), protein, karbohidrat, dan lemak bagi setiap komponen hidangan.

### 🏃 2. Penjejak GPS Larian Ala Strava
- **Kesan Lokasi Langsung (Live Geolocation)**: Mengesan koordinat GPS sebenar pengguna serta-merta dengan meminta kebenaran lokasi pelayar secara selamat.
- **Peta Berpusat Terbuka (OpenStreetMap + Leaflet)**: 100% percuma, pantas, dan tiada had kuota atau keperluan API key Google Maps / Mapbox.
- **Penanda Radar Denyutan (Live GPS Pulse Dot)**: Menunjukkan posisi tepat pengguna di peta dengan animasi lingkaran ketepatan (`accuracy circle`).
- **Butang Terapung "Lokasi Saya"**: Memusatkan semula paparan peta ke kedudukan semasa dengan satu sentuhan.
- **Statistik Larian Lengkap**:
  - Jarak tepat (formula Haversine dalam kilometer)
  - Masa larian (`MM:SS` / `HH:MM:SS`)
  - Pace masa nyata dan purata (`min/km`)
  - Kelajuan semasa (`km/j`)
  - Pembakaran kalori dinamik formula MET berdasarkan berat badan
  - Peningkatan elevasi (m) dan anggaran langkah
- **Lakaran Laluan Polyline**: Melukis garisan larian secara langsung semasa bergerak dengan penanda mula dan tamat.
- **Simpanan & Semakan Arkib**: Sesi disimpan ke dalam storan kekal sistem, menolak kalori terbakar daripada baki kalori harian, serta membolehkan pengguna menekan mana-mana rekod lama untuk meneliti semula peta laluannya.

### 🤖 3. Kompanion Anime Dinamik (Deku & Bakugou)
- **Izuku Midoriya (Deku)**: Menganalisis keseimbangan makro, pemulihan otot, dan mencadangkan pelarasan hidangan secara bijak.
- **Katsuki Bakugou**: Reaksi spontan, mencabar pengguna membakar kalori yang diambil dengan senaman larian.
- **Sintesis Suara (Web Speech API)**: Ucapan motivasi bersuara di papan pemuka dan imbasan makanan.

### 🍲 4. Penjana Resipi Sihat Halal & Pelan 7 Hari
- **Penjana Resipi Tempatan**: Resipi masakan kampung dan sihat berasaskan bahan yang ada di dapur pengguna (cth. Sup Ayam Halia, Sambal Tempeh Rendah Kalori, dsb.).
- **Pelan Makanan 7 Hari (Isnin - Ahad)**: Menghasilkan jadual sarapan, makan tengah hari, snek, dan makan malam mengikut sasaran kalori harian pengguna.

### 📊 5. Papan Pemuka & Baki Kalori Bersih
- **Formula Baki Bersih**: `Baki Kalori = Sasaran Harian - Kalori Masuk + Kalori Dibakar (Senaman)`.
- **Graf Kemajuan Berat Badan**: Visualisasi SVG garis berat badan dari masa ke masa berbanding berat sasaran.
- **Sistem Lencana & Pencapaian**: Membuka lencana motivasi (Pahlawan Malaysia, Pelari 5K, Streak 7 Hari, dsb.).

---

## 🛠️ Teknologi

| Komponen | Teknologi Digunakan |
| :--- | :--- |
| **Enjin / Bundler** | [Vite 8.x](https://vitejs.dev/) |
| **Frontend** | Vanilla JavaScript (ES6+ Modules), HTML5 Semantik |
| **Reka Bentuk / Gaya** | CSS3 Vanilla Moden (Monochrome Dark Mode Palette `#000000`, `#1C1C1E`, `#2C2C2E`, `#FFFFFF`) |
| **Peta & Laluan** | [Leaflet 1.9](https://leafletjs.com/) & [OpenStreetMap](https://www.openstreetmap.org/) (Tanpa API Key) |
| **Pengimbas Kod Bar** | [@zxing/browser](https://github.com/zxing-js/browser) |
| **Enjin AI** | Enjin Tempatan Makanan Malaysia + [Google Gemini 3.5 Flash Lite](https://ai.google.dev/) |
| **Pangkalan Data Produk** | [OpenFoodFacts API v2](https://world.openfoodfacts.org/) |
| **Storan Data** | Storan Tempatan (Offline-First `localStorage`) dengan sokongan Eksport/Import JSON |

---

## 🚀 Pemasangan & Permulaan Pantas

### Pra-syarat
- **Node.js** v18+ atau **pnpm** terpasang pada komputer anda.

### Langkah Pemasangan

1. **Klon Repositori**:
   ```bash
   git clone https://github.com/aliefakmal/CalMal.git
   cd CalMal
   ```

2. **Pasang Dependensi**:
   ```bash
   pnpm install
   # atau menggunakan npm
   npm install
   ```

3. **Konfigurasi Alam Sekitar (Pilihan)**:
   Salin fail `.env.example` kepada `.env` jika anda ingin menggunakan kunci Google Gemini anda sendiri:
   ```bash
   cp .env.example .env
   ```
   *(Nota: CalMal berfungsi serta-merta tanpa sebarang kunci API!)*

4. **Mulakan Pelayan Pembangunan (Dev Server)**:
   ```bash
   pnpm run dev
   ```
   Buka pelayar anda di `http://localhost:5173/`.

5. **Bina untuk Produksi**:
   ```bash
   pnpm run build
   ```

---

## 📁 Struktur Projek

```
CalMal/
├── index.html                           # Shell utama aplikasi dengan Bottom Nav & Desktop Sidebar
├── package.json                         # Dependensi dan skrip projek
├── pelan_pembangunan_aplikasi_calmal.md # Dokumen spesifikasi dan pelan seni bina
├── public/
│   ├── favicon.svg                      # Logo CalMal
│   └── manifest.json                    # Konfigurasi PWA mudah alih
└── src/
    ├── main.js                          # Titik masuk aplikasi dan penghalaan SPA
    ├── config/
    │   └── gemini.js                    # Konfigurasi model Gemini 3.5 Flash Lite
    ├── constants/
    │   └── prompts.js                   # Gesaan AI pemakanan Malaysia & soalan pelan makanan
    ├── components/
    │   ├── icons.js                     # Koleksi ikon SVG monokrom
    │   ├── ui.js                        # Komponen Toast, Sheet Pengesahan, Lencana, Thumbnail Laluan
    │   └── companion.js                 # Avatar animasi & buih dialog Deku & Bakugou
    ├── services/
    │   ├── store.js                     # Pengurus storan reaktif luar talian
    │   ├── gpsTracker.js                # Enjin penjejak GPS masa nyata, izin lokasi & Strava MET
    │   ├── gemini.js                    # Enjin pemakanan AI & fallback tempatan
    │   ├── openFoodFacts.js             # Carian produk kod bar antarabangsa & tempatan
    │   ├── companionService.js          # Logik tindak balas anime & Web Speech
    │   └── audioService.js              # Kesan bunyi antara muka web
    ├── utils/
    │   ├── calc.js                      # Pengiraan BMR/TDEE Mifflin-St Jeor, Haversine, Pace & MET
    │   └── helpers.js                   # Pemampatan gambar, tarikh, dan utiliti rentetan
    ├── screens/
    │   ├── onboarding.js                # Aliran pendaftaran & tetapan biometrik
    │   ├── dashboard.js                 # Papan pemuka kalori harian & dialog kompanion
    │   ├── scanner.js                   # Pengimbas makanan, kamera sentiasa aktif & kod bar
    │   ├── activity.js                  # Peta larian OpenStreetMap ala Strava & sejarah laluan
    │   ├── recipes.js                   # Penjana resipi Halal & pelan makan 7 hari
    │   └── profile.js                   # Graf berat badan, lencana & tetapan
    └── styles/
        ├── index.css                    # Sistem reka bentuk monokrom & tipografi
        └── screens.css                  # Penggayaan khusus skrin, radar GPS & kad kompanion
```

---

## 📄 Lesen

Dilesenkan di bawah [Lesen MIT](LICENSE). Hak Cipta (c) 2026 Alief Akmal (LyLief).
Bebas untuk digunakan, diubah suai, dan diedarkan.
