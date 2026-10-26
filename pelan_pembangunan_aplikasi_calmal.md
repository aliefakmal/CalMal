# Pelan Pembangunan & Seni Bina Sistem: CalMal (Transformasi daripada `ovishkh/Cal-AI`)

Dokumen ini merupakan pelan induk kejuruteraan perisian untuk menaik taraf dan menjenamakan semula repositori asal **Cal-AI** (`https://github.com/ovishkh/Cal-AI`) kepada **CalMal** — sebuah aplikasi penjejak kalori pintar berasaskan masakan tempatan Malaysia, penjejak aktiviti fizikal bergaya Strava, serta sistem motivasi beranimasi **Katsuki Bakugou** dan **Izuku Midoriya (Deku)**.

---

## 1. Penjenamaan Semula & Konfigurasi Teras (Cal-AI $\rightarrow$ CalMal)

Repositori asal dibina menggunakan **Flutter**, **GetX** (pengurusan keadaan), **Firebase Authentication**, dan **Cloud Firestore**. Langkah pertama adalah penjenamaan semula kepada **CalMal** dan kemas kini konfigurasi AI:

### 1.1 Penjenamaan Semula (`CalMal`)
* **`pubspec.yaml`**: Ubah `name: cal_ai` kepada `name: calmal` dan kemas kini keterangan projek.
* **Android (`android/app/build.gradle` & `AndroidManifest.xml`)**:
  * Tukar `namespace` dan `applicationId` kepada `com.calmal.app`.
  * Tukar `android:label` kepada `"CalMal"`.
* **Web (`web/index.html` & `web/manifest.json`)**: Kemas kini `<title>` dan metadata aplikasi kepada **CalMal**.
* **Pemalar Aplikasi (`lib/constants/app_constants.dart`)**: Tetapkan `appName = "CalMal"`.

### 1.2 Konfigurasi Model Gemini 3.5 Flash Lite
* Di dalam fail `lib/config/api_keys.dart` dan `lib/services/gemini_service.dart`, tetapkan model lalai kepada **Gemini 3.5 Flash Lite**:
  ```dart
  class GeminiConfig {
    static const String apiKey = String.fromEnvironment('GEMINI_API_KEY');
    static const String modelName = 'gemini-3.5-flash-lite';
    static const String apiEndpoint = 
        'https://generativelanguage.googleapis.com/v1beta/models/$modelName:generateContent';
  }
  ```
* Model `gemini-3.5-flash-lite` dipilih kerana kepantasan respons multimodal (imej + teks) yang sangat rendah kependaman (*low latency*) dan kos efektif untuk imbasan makanan harian serta OCR label bungkusan.

---

## 2. Profil Biometrik & Anggaran Makanan Mengikut Berat Badan

Bagi memastikan **CalMal** memberi anggaran keperluan makanan dan kesesuaian porsi berdasarkan berat badan seseorang, modul profil pengguna (`lib/models/user_profile_model.dart`) akan diperluaskan.

### 2.1 Pengiraan Sasaran Kalori & Makronutrien Berdasarkan Berat Badan
Semasa pendaftaran (*Onboarding*) atau di skrin Profil, pengguna memasukkan:
* Berat badan semasa ($W$ dalam $\text{kg}$) dan berat badan sasaran ($W_{\text{target}}$ dalam $\text{kg}$)
* Tinggi ($H$ dalam $\text{cm}$), Umur ($A$ dalam tahun), Jantina, dan Tahap Aktiviti Harian ($AF$)

**Formula Kadar Metabolisme Asas (BMR - Persamaan Mifflin-St Jeor):**
* **Lelaki:**
  $$\text{BMR} = (10 \times W) + (6.25 \times H) - (5 \times A) + 5$$
* **Perempuan:**
  $$\text{BMR} = (10 \times W) + (6.25 \times H) - (5 \times A) - 161$$

**Jumlah Penggunaan Tenaga Harian ($\text{TDEE}$):**
$$\text{TDEE} = \text{BMR} \times AF$$

**Sasaran Harian ($\text{Sasaran Harian}$) Mengikut Matlamat Berat Badan:**
* **Turun Berat Badan (Defisit):** $\text{Sasaran Harian} = \text{TDEE} - 500\text{ kcal}$
* **Kekal Berat Badan:** $\text{Sasaran Harian} = \text{TDEE}$
* **Tambah Berat Badan / Otot (Surplus):** $\text{Sasaran Harian} = \text{TDEE} + 300\text{ kcal}$

**Anggaran Keperluan Makronutrien Mengikut Berat Badan ($W$):**
* **Protein:** $1.6\text{ g} \times W$ hingga $2.2\text{ g} \times W$ sehari ($1\text{ g protein} = 4\text{ kcal}$)
* **Lemak:** $0.8\text{ g} \times W$ hingga $1.0\text{ g} \times W$ sehari ($1\text{ g lemak} = 9\text{ kcal}$)
* **Karbohidrat:** Baki kalori harian dibahagikan dengan $4\text{ kcal/g}$

Setiap kali pengguna menangkap gambar makanan, berat badan pengguna ($W$) dan baki sasaran kalori semasa akan dihantar bersama ke dalam prompt `gemini-3.5-flash-lite` supaya AI dapat memberi cadangan porsi khusus untuk berat badan tersebut (contohnya: *"Untuk berat badan anda $75\text{ kg}$, porsi ayam ini mencukupi tetapi kurangkan nasi sebanyak $30\%$ untuk kekal dalam sasaran defisit"*).

---

## 3. Struktur Ciri Asas & Ciri Tambahan ("All-Rounder")

### 3.1 AI Visual Calorie Estimator + Masakan Tempatan Malaysia & Portion Fine-Tuning
* **Aliran Kerja Kamera (`lib/screens/scanner/food_scanner_screen.dart`):**
  1. Pengguna menangkap gambar makanan menggunakan kamera atau memilih dari galeri.
  2. **Input Pantas Nota Konteks (*Portion Fine-Tuning*):** Sebelum atau selepas menangkap gambar, terdapat medan cip pantas (*quick chips*) dan input teks ringkas seperti `"nasi separuh"`, `"minyak sikit"`, `"kuah banjir"`, `"ayam bahagian dada"`, atau `"kurang manis"`.
  3. Imej (dikodkan dalam `base64`), nota konteks pengguna, dan data berat badan pengguna ($W$) dihantar ke `GeminiService` menggunakan model `gemini-3.5-flash-lite`.
* **Prompt Engineering Sistem (Konteks Tempatan & Output JSON Berstruktur):**
  ```text
  Anda ialah pakar nutrisi dan dietitian Malaysia untuk aplikasi CalMal.
  Analisis gambar makanan yang diberikan bersama nota konteks pengguna: "{user_context_note}".
  Maklumat pengguna: Berat badan = {user_weight_kg} kg, Sasaran Kalori Harian = {daily_target_kcal} kcal.
  
  Kenal pasti masakan tempatan Malaysia dengan tepat (contoh: Nasi Lemak, Roti Canai, Ayam Goreng Berempah, Teh Tarik, Char Kuey Teow, Nasi Kerabu, Laksa, Kuih-muih) atau makanan antarabangsa.
  Ambil kira kandungan santan, minyak tumisan, sambal, dan susu pekat melainkan nota konteks menyatakan sebaliknya.

  Pulangkan HANYA format JSON yang sah mengikut skema berikut:
  {
    "food_name": "Nama hidangan (Contoh: Nasi Lemak Ayam Goreng Berempah)",
    "estimated_weight_g": 420,
    "calories_kcal": 780,
    "macros": {
      "protein_g": 34.5,
      "carbs_g": 82.0,
      "fat_g": 35.0
    },
    "items_breakdown": [
      {"name": "Nasi santan (separuh)", "weight_g": 100, "calories_kcal": 180},
      {"name": "Ayam goreng berempah", "weight_g": 150, "calories_kcal": 390},
      {"name": "Sambal, ikan bilis, kacang & telur rebus", "weight_g": 170, "calories_kcal": 210}
    ],
    "body_weight_recommendation": {
      "suitability_status": "MODERATE",
      "recommended_portion_adjustment": "Untuk berat {user_weight_kg} kg, hidangan ini menyumbang 45% daripada sasaran harian anda. Asingkan kulit ayam untuk jimat 90 kcal.",
      "deku_analysis_note": "Midoriya: Analisis penuh selesai! Protein daripada ayam berempah bagus untuk pemulihan otot, tapi jaga-jaga dengan lemak santan!",
      "bakugou_reaction_note": "Bakugou: OI! Kalau kau makan sambal lebih minyak macam tu, pastikan kau bakar balik petang nanti!"
    }
  }
  ```
* **Butang Quick Edit (`lib/widgets/meal_quick_edit_sheet.dart`):**
  * Membolehkan pengguna melaras nilai gram porsi dengan *slider* (contoh: $0.5\times$, $1.0\times$, $1.5\times$) atau menaip terus nilai kalori dan makronutrien sekiranya anggaran AI perlu diperbetulkan.

### 3.2 Net Calorie Balance Dashboard (Real-Time)
* Dipaparkan di bahagian paling atas Skrin Utama (`lib/screens/home/dashboard_screen.dart`).
* **Formula Pengiraan Masa Nyata:**
  $$\text{Baki Kalori} = \text{Sasaran Harian} - \text{Kalori Makanan (In)} + \text{Kalori Senaman (Out)}$$
* **Reka Bentuk Visual:**
  * Menggunakan **Progress Ring Monokrom Nipis** (`CustomPainter` dengan ketebalan garisan $6\text{ px}$ berwarna `#FFFFFF` di atas trek `#1C1C1E`) dan **Bar Horizontal Minimalis** untuk pecahan Protein, Karbohidrat, dan Lemak.
  * Nombor utama $\text{Baki Kalori}$ dipaparkan dalam saiz fon besar (`48sp`, fon `Inter Bold` / `SF Pro Display`).

### 3.3 Barcode & Packaging OCR Scanner
* Di dalam skrin kamera yang sama (`food_scanner_screen.dart`), sediakan 3 tab mod imbasan di bahagian bawah: **[AI Makanan]**, **[Kod Bar]**, dan **[Label Nutrisi OCR]**.
* **Mod Kod Bar:**
  * Menggunakan pakej `mobile_scanner` untuk membaca kod bar EAN-13 / UPC pada bungkusan makanan (protein bar, susu kotak, roti, yogurt).
  * Membuat panggilan GET ke **Open Food Facts API**:
    `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
  * Mengekstrak nama produk, saiz hidangan, tenaga ($\text{kcal}$), protein, karbohidrat, dan lemak.
* **Mod Label Nutrisi OCR:**
  * Jika produk tempatan tiada dalam pangkalan data Open Food Facts, pengguna menangkap gambar jadual *Maklumat Pemakanan / Nutrition Facts* di belakang bungkusan.
  * Menggunakan `google_mlkit_text_recognition` (luar talian) atau menghantar imej label terus ke `gemini-3.5-flash-lite` untuk mengekstrak nilai kalori per hidangan dan per $100\text{ g}$ secara automatik ke dalam format JSON yang sama.

### 3.4 Strava-Style Route & Activity Tracker
* **Peta Tema Gelap/Monokrom OpenStreetMap (`lib/screens/activity/strava_tracker_screen.dart`):**
  * Menggunakan **OpenStreetMap (OSM)** melalui **Leaflet** (100% percuma & tanpa sebarang API key diperlukan) dengan jubin monokrom/gelap di mana jalan raya berwarna kelabu gelap (`#2C2C2E`), air berwarna hitam pekat (`#000000`), dan garisan laluan (*polyline*) dilukis dengan warna putih terang (`#FFFFFF`, ketebalan $5\text{ px}$). Pilihan jubin OpenStreetMap standard turut disertakan.
* **Penjejakan Metrik GPS & Sensor:**
  * Menggunakan `geolocator` (tetapan `LocationAccuracy.bestForNavigation`) dan `pedometer` untuk merekod:
    1. Koordinat GPS berterusan (`List<LatLng>`).
    2. Jarak keseluruhan ($D$ dalam $\text{km}$) menggunakan formula Haversine antara titik koordinat.
    3. Kelajuan purata / *Pace* ($\text{min/km}$):
       $$\text{Pace} = \frac{\text{Masa Aktiviti (minit)}}{D\text{ (km)}}$$
    4. Perubahan elevasi ($\Delta \text{Altitud}$ dalam meter) daripada data altitud GPS.
    5. Kiraan langkah (*Step count*).
* **Pengiraan Kalori Terbakar Automatik Berdasarkan Formula MET:**
  * Nilai $\text{MET}$ (*Metabolic Equivalent of Task*) ditentukan secara dinamik berdasarkan kelajuan larian/berjalan:
    * Berjalan santai ($< 5\text{ km/j}$): $\text{MET} = 3.5$
    * Berjalan laju ($5 - 7.5\text{ km/j}$): $\text{MET} = 5.0$
    * Joging ($7.5 - 10\text{ km/j}$): $\text{MET} = 8.3$
    * Larian laju ($> 10\text{ km/j}$): $\text{MET} = 11.0$
  * **Formula Kalori Terbakar ($\text{Kalori Senaman (Out)}$):**
    $$\text{Kalori Terbakar (kcal)} = \text{MET} \times 3.5 \times \frac{W\text{ (kg)}}{200} \times T\text{ (minit)}$$
  * Nilai ini terus dikemas kini secara langsung ke dalam formula $\text{Baki Kalori}$ di papan pemuka utama.

### 3.5 Minimalist Monochrome UI Design System
* **Palet Warna Rasmi (`lib/constants/app_colors.dart`):**
  * Latar Belakang Utama: `#000000` (Hitam Tulen OLED)
  * Kad & Permukaan Sekunder: `#1C1C1E` (Kelabu Gelap Arang)
  * Sempadan Kad Halus (*Subtle Border*): `#2C2C2E`
  * Teks Utama & Elemen Penting: `#FFFFFF` (Putih Tulen)
  * Teks Sekunder / Pudar: `#8E8E93` (Kelabu Neutral)
* **Tipografi (`lib/constants/app_typography.dart`):**
  * Menggunakan fon **Inter** atau **SF Pro Display** dengan ciri `FontFeature.tabularFigures()` supaya angka kalori, masa jam randik, dan jarak kilometer tidak bergoyang apabila berubah secara masa nyata.

### 3.6 Offline-First Caching & Background Sync
* **Pangkalan Data Lokal (`Hive` & `sqflite`):**
  * Semua log makanan harian, profil berat badan, dan titik koordinat GPS disimpan terlebih dahulu di dalam storan lokal (`Hive` untuk log makanan & tetapan, `sqflite` untuk siri titik koordinat `LatLng` laluan larian yang besar).
  * Setiap rekod mempunyai status penyegerakan: `sync_status: 'PENDING' | 'SYNCED'`.
* **Enjin Penyegerakan Latar Belakang (`lib/services/sync_service.dart`):**
  * Menggunakan pakej `connectivity_plus` dan `workmanager`.
  * Semasa pengguna berjoging di kawasan hutan atau tempat tiada liputan internet, GPS telefon tetap melukis laluan dan mengira kalori menggunakan pangkalan data lokal.
  * Sebaik sahaja sambungan internet kembali stabil, `SyncService` akan memuat naik rekod berstatus `'PENDING'` ke koleksi `users/{uid}/meals` dan `users/{uid}/activities` di dalam **Cloud Firestore** secara automatik tanpa mengganggu pengguna.

---

## 4. Sistem Animasi & Peringatan Pintar: Katsuki Bakugou & Izuku Midoriya (Deku)

Bagi menjadikan pengalaman pengguna lebih hidup di atas antara muka monokrom `#000000`, aplikasi menyertakan **Sistem Kompanion Dwi-Karakter** menggunakan animasi **Lottie / Rive / Sprite Beranimasi** (`lib/widgets/anime_companion_overlay.dart`).

### 4.1 Peranan & Personaliti Karakter
| Karakter | Peranan dalam CalMal | Gaya Animasi & Visual | Contoh Dialog / Kata-Kata Semangat |
| :--- | :--- | :--- | :--- |
| **Izuku Midoriya (Deku)** | **Jurulatih Nutrisi & Peringatan Mesra:** Menganalisis makanan, memberi peringatan waktu makan, dan meraikan pencapaian konsisten. | Animasi buku nota (*Hero Analysis Notes*), kilat hijau/monokrom *One For All Full Cowling*, ekspresi bersemangat. | *"Plus Ultra! Anda dah capai $80\%$ sasaran protein untuk berat badan anda hari ini! Teruskan usaha!"* |
| **Katsuki Bakugou (Kacchan)** | **Jurulatih Kecergasan Tegas & Penggera Aktiviti:** Menegur pengguna apabila malas bersenam, memantau kelajuan larian, dan memberi pujian *tsundere* apabila berjaya. | Animasi percikan letupan (*Explosion Quirk*), ekspresi garang bersemangat, bingkai komik manga monokrom yang kontras dengan tema gelap. | *"OI! Dah pukul 5:30 petang dan GPS kau masih tak bergerak satu meter pun?! Bangun dan lari sekarang sebelum aku letupkan alasan kau!"* |

### 4.2 Smart Daily Reminders & Pencetus Notifikasi Pintar (`lib/services/notification_companion_service.dart`)
Menggunakan `flutter_local_notifications` dan pemeriksaan latar belakang:

1. **Peringatan Log Hidangan (Pagi, Tengah Hari, Malam):**
   * **8:00 Pagi (Deku):** *"Selamat pagi! Jangan lupa tangkap gambar sarapan anda di CalMal supaya kita boleh rancang baki kalori hari ini!"*
   * **1:00 Tengah Hari (Deku):** *"Waktu makan tengah hari! Kalau makan Nasi Campur, ingat tip kita: tambah sayur dan kawal kuah!"*
   * **8:00 Malam (Bakugou):** *"Oi! Kau belum log makan malam lagi! Jangan ingat kau boleh sorok Teh Tarik kau daripada aku!"*

2. **Peringatan Aktif Berdasarkan Semakan GPS Petang (Jam 5:30 Petang):**
   * Jika jam melepasi **17:30 (5:30 Petang)** dan sistem mendapati tiada aktiviti fizikal / jarak langkah GPS yang direkodkan pada hari tersebut:
   * Notifikasi & *In-App Animasi Bakugou* akan muncul dengan animasi letupan:
     > **Bakugou:** *"OI DEKU-Kaki Bangku! Hari dah nak gelap dan kau belum bakar walau $100\text{ kcal}$ pun melalui senaman! Kasut sukan kau dah berhabuk ke?! Keluar dan mulakan larian sekarang!"*

3. **Notifikasi & Animasi Semasa Mencapai Progress (*Milestone Celebration*):**
   * **Mencapai Sasaran Kalori Harian Tanpa Terlebih:** Animasi *Fist Bump* Deku & Bakugou muncul di skrin utama.
   * **Menamatkan Larian $5\text{ km}$ / Rekod Pace Baharu di Strava Tracker:**
     * **Deku:** *"Luar biasa! Anda berjaya menamatkan larian dengan rentak yang sangat stabil! SMASH!!"*
     * **Bakugou:** *"Hmph! Boleh tahan untuk permulaan. Esok kalahkan rekod masa kau sendiri!"*
   * **Penurunan / Pencapaian Berat Badan Sasaran Mingguan:** Animasi khas skrin penuh (*Full-Screen Manga Cut-In*) meraikan kejayaan pengguna.

---

## 5. Seni Bina Folder Projek Baharu (`lib/`)

Berikut adalah struktur direktori `lib/` yang dikemas kini daripada struktur asal `ovishkh/Cal-AI`:

```text
lib/
├── main.dart                                  # Permulaan aplikasi CalMal, Hive, SQLite & Firebase
├── config/
│   ├── api_keys.dart                          # Konfigurasi kunci API & model 'gemini-3.5-flash-lite'
│   └── map_monochrome_style.dart              # Gaya JSON peta hitam-putih (Dark/Monochrome)
├── constants/
│   ├── app_colors.dart                        # Palet #000000, #FFFFFF, #1C1C1E, #8E8E93
│   ├── app_typography.dart                    # Fon Inter / SF Pro Display (Tabular Figures)
│   └── malaysian_food_prompts.dart            # Prompt sistem masakan tempatan Malaysia
├── models/
│   ├── user_profile_model.dart                # Berat badan, tinggi, umur, BMR, TDEE, sasaran kalori
│   ├── meal_log_model.dart                    # Data makanan, makro, nota konteks, status sync
│   └── activity_route_model.dart              # Polylines GPS, jarak, pace, elevasi, kalori MET
├── services/
│   ├── gemini_service.dart                    # Integrasi Gemini 3.5 Flash Lite (Imej Makanan & OCR)
│   ├── open_food_facts_service.dart           # Carian kod bar produk berbungkus
│   ├── gps_tracker_service.dart               # Latar belakang GPS, pengiraan jarak, pace & MET
│   ├── local_db_service.dart                  # Storan Offline-First (Hive & SQLite)
│   ├── sync_service.dart                      # Background Sync ke Cloud Firestore apabila ada internet
│   └── companion_notification_service.dart    # Notifikasi pintar & pencetus animasi Bakugou/Deku
├── controllers/                               # GetX Controllers
│   ├── dashboard_controller.dart              # Pengiraan masa nyata Baki Kalori = Sasaran - In + Out
│   ├── scanner_controller.dart                # Kawalan kamera AI, Kod Bar, OCR & Quick Edit
│   ├── activity_controller.dart               # Kawalan penjejak laluan ala Strava
│   └── companion_controller.dart              # Pengurusan keadaan animasi & dialog Bakugou/Deku
├── screens/
│   ├── onboarding/
│   │   └── body_weight_setup_screen.dart      # Input berat badan & sasaran pengguna
│   ├── home/
│   │   └── dashboard_screen.dart              # Net Calorie Balance Dashboard & Progress Ring Monokrom
│   ├── scanner/
│   │   ├── food_scanner_screen.dart           # Kamera 3-dalam-1 (AI Makanan, Kod Bar, OCR)
│   │   └── meal_result_edit_screen.dart       # Paparan JSON AI, Nota Konteks & Butang Quick Edit
│   ├── activity/
│   │   └── strava_tracker_screen.dart         # Peta monokrom, polyline GPS, pace & elevasi
│   └── profile/
│       └── profile_progress_screen.dart       # Graf berat badan & koleksi lencana Bakugou/Deku
└── widgets/
    ├── monochrome_progress_ring.dart          # Cincin kemajuan nipis #FFFFFF di atas #1C1C1E
    ├── macro_horizontal_bar.dart              # Bar makronutrien minimalis
    ├── quick_context_chips.dart               # Cip pantas: "Nasi Separuh", "Minyak Sikit", dll.
    └── anime_companion_widget.dart            # Widget animasi Lottie/Sprite Bakugou & Midoriya
```

---

## 6. Senarai Pakej (`pubspec.yaml`) yang Perlu Ditambah

Bagi menyokong kesemua ciri baharu di atas repositori asal `ovishkh/Cal-AI`, kemas kini `dependencies` di dalam `pubspec.yaml`:

```yaml
name: calmal
description: CalMal - AI Calorie Estimator & Strava-Style Activity Tracker for Malaysia.
publish_to: 'none'
version: 2.0.0+1

dependencies:
  flutter:
    sdk: flutter

  # State Management & Core (Sedia Ada)
  get: ^4.6.6
  firebase_core: ^3.6.0
  firebase_auth: ^5.3.1
  cloud_firestore: ^5.4.4
  shared_preferences: ^2.3.2
  google_fonts: ^6.2.1

  # AI, Kamera, Kod Bar & OCR
  http: ^1.2.2
  image_picker: ^1.1.2
  camera: ^0.11.0+2
  mobile_scanner: ^5.2.3                       # Imbasan Kod Bar (Open Food Facts)
  google_mlkit_text_recognition: ^0.13.1       # Imbasan OCR Label Nutrition Facts Luar Talian

  # Strava-Style GPS & Activity Tracker
  flutter_map: ^7.0.2 / leaflet: ^1.9.4        # OpenStreetMap (OSM) — Percuma, Tanpa Kunci API
  geolocator: ^13.0.1                          # Koordinat GPS, kelajuan & elevasi
  flutter_polyline_points: ^2.1.0              # Lukisan garisan laluan (polyline)
  pedometer: ^4.0.2                            # Pengiraan langkah kaki

  # Offline-First Caching & Background Sync
  hive: ^2.2.3
  hive_flutter: ^1.1.0
  sqflite: ^2.4.0                              # Storan lokal titik koordinat GPS
  connectivity_plus: ^6.0.5                    # Pengesan status sambungan internet
  workmanager: ^0.5.2                          # Tugas penyegerakan latar belakang (Background Sync)

  # Notifikasi Pintar & Animasi Bakugou / Midoriya
  flutter_local_notifications: ^17.2.3         # Peringatan waktu makan & amaran tidak aktif GPS
  lottie: ^3.1.2                               # Animasi karakter Katsuki Bakugou & Izuku Midoriya
```

---

## 7. Pelan Fasa Pelaksanaan (Implementation Roadmap)

1. **Fasa 1: Penjenamaan Semula, UI Monokrom & Profil Berat Badan**
   * Kemas kini nama aplikasi kepada **CalMal** dan terapkan tema warna `#000000`, `#1C1C1E`, `#FFFFFF`, dan `#8E8E93`.
   * Bina modul pengiraan $\text{BMR}$, $\text{TDEE}$, dan cadangan makronutrien mengikut berat badan pengguna.
2. **Fasa 2: Integrasi `gemini-3.5-flash-lite`, Masakan Tempatan & Pengimbas 3-dalam-1**
   * Konfigurasikan `GeminiService` kepada model `gemini-3.5-flash-lite` dengan prompt sistem masakan Malaysia dan output JSON berstruktur.
   * Tambah input nota konteks pantas (*"minyak sikit"*, *"nasi separuh"*), butang *Quick Edit*, pengimbas kod bar Open Food Facts, dan OCR label pemakanan.
3. **Fasa 3: Papan Pemuka Kalori Bersih & Penjejak Aktiviti Ala Strava**
   * Bina cincin kemajuan monokrom untuk persamaan $\text{Baki Kalori} = \text{Sasaran Harian} - \text{Kalori Makanan (In)} + \text{Kalori Senaman (Out)}$.
   * Integrasikan peta monokrom, rakaman *polyline* GPS, *pace*, elevasi, dan formula $\text{MET}$.
4. **Fasa 4: Pangkalan Data Offline-First & Animasi Kompanion Bakugou + Midoriya**
   * Sediakan storan lokal `Hive`/`sqflite` beserta penyegerakan automatik ke Cloud Firestore.
   * Integrasikan aset animasi dan sistem notifikasi pintar **Katsuki Bakugou** serta **Izuku Midoriya** untuk peringatan makan, teguran senaman petang, dan sambutan pencapaian sasaran.