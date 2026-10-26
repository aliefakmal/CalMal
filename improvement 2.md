# 🚀 Pelan Penambahbaikan & Evolusi Aplikasi: CalMal (Daily Driver Edition)

Dokumen ini mengandungi analisis menyeluruh, cadangan ciri baharu (features), serta penambahbaikan UI/UX dan prestasi berdasarkan struktur kod semasa **CalMal**. Dokumen ini direka khusus supaya ejen AI (**Antigravity**) boleh membaca konteks fail sedia ada dan terus melaksanakan kod secara berperingkat.

---

## 📂 Gambaran Struktur Semasa (Konteks Projek)
* **Frontend Architecture:** Vanilla JS (SPA) dengan pengurusan state tempatan (`src/services/store.js`) dan integrasi awan (`src/services/supabaseClient.js`).
* **AI & Integrasi:** Gemini API (`api/gemini.js`, `src/services/gemini.js`, `src/constants/prompts.js`) dan OpenFoodFacts (`src/services/openFoodFacts.js`).
* **Skrin Utama:** `dashboard.js`, `scanner.js`, `recipes.js`, `activity.js`, `profile.js`, `onboarding.js`.
* **Komponen & Servis Unik:** AI Companion (`src/components/companion.js`, `src/services/companionService.js`), Audio (`src/services/audioService.js`), GPS (`src/services/gpsTracker.js`), dan sokongan PWA (`public/sw.js`, `public/manifest.webmanifest`).

---

## 🎨 1. Penambahbaikan UI/UX: Bagi Nampak "Smooth", Moden & Sedap Ditekan

Untuk menjadikan web app rasa seperti aplikasi *native* (iOS/Android) yang orang seronok buka setiap hari:

### 1.1 Transisi Skrin & *Bottom Sheet* (`src/styles/index.css`, `src/styles/screens.css`, `src/components/ui.js`)
* **Masalah Biasa Web App:** Pertukaran skrin dalam `src/main.js` nampak kaku (instant DOM swap) dan *modal* muncul secara mengejut.
* **Solusi:**
  * Gunakan animasi CSS `cubic-bezier(0.22, 1, 0.36, 1)` untuk semua pertukaran tab (`dashboard`, `scanner`, `recipes`, `activity`, `profile`).
  * Tukar *modal* biasa dalam `mealEditor.js` dan `profileEditor.js` kepada **Draggable Bottom Sheet** (boleh *swipe down* untuk tutup pada skrin telefon).
  * Tambah `backdrop-filter: blur(12px)` (Glassmorphism) pada *bottom navigation bar* dan *header* supaya kandungan yang di-scroll di belakang nampak premium.

### 1.2 *Skeleton Loading* & *Optimistic UI* (`src/screens/dashboard.js`, `src/screens/scanner.js`)
* **Masalah:** Bila menunggu respons daripada `gemini.js` atau `supabaseClient.js`, pengguna hanya nampak *spinner* pusing yang membosankan.
* **Solusi:**
  * Buat komponen **Skeleton Shimmer** dalam `src/components/ui.js`. Semasa AI sedang menganalisis gambar makanan di `scanner.js`, paparkan *bounding box* beranimasi (seolah-olah AI sedang mengimbas bahagian nasi, ayam, dan kuah) berserta teks status dinamik: *"Mengenal pasti hidangan..." -> "Mengira anggaran sukatan..." -> "Menyemak nutrisi..."*.
  * **Optimistic Updates:** Apabila pengguna menambah air atau memadam makanan di `dashboard.js`, kemas kini UI serta-merta melalui `store.js` tanpa menunggu proses *sync* `supabaseClient.js` selesai di belakang tabir.

### 1.3 *Micro-Interactions* & Maklum Balas Haptik (`src/services/audioService.js`, `src/utils/helpers.js`)
* **Solusi:**
  * Tambah fungsi `triggerHaptic(type = 'light')` menggunakan `navigator.vibrate(15)` dalam `helpers.js` dan gabungkan dengan kesan bunyi halus dalam `audioService.js` apabila pengguna:
    * Berjaya *log* makanan.
    * Mencapai sasaran kalori/air harian (disertai animasi *confetti* ringan).
    * Berinteraksi dengan `companion.js`.
  * Animasi nombor bergerak (*number ticker/count-up*) pada gelung kalori (*Calorie Ring*) dan bar makronutrien (Protein, Karbohidrat, Lemak) di `dashboard.js`.

---

## 🍛 2. Ciri Kegunaan Harian (Daily Utility) — "Biar Orang Guna Hari-Hari"

Sebab utama pengguna berhenti guna aplikasi *calorie tracker* adalah kerana **penat nak ambil gambar atau taip makanan yang sama setiap hari**.

### 2.1 *1-Tap Quick Log* & "Makanan Biasa Saya" (`src/screens/dashboard.js`, `src/services/store.js`)
* **Ciri Baharu:**
  * **Butang "Salin Semalam" (Copy Yesterday's Meal):** Satu klik untuk salin sarapan yang sama seperti semalam.
  * **Cip Makanan Pantas (Quick Chips):** Di bawah bahagian *Add Meal* pada `dashboard.js`, letakkan cip pantas berdasarkan sejarah makanan pengguna (contoh: `+ Kopi O Kosong (20 kcal)`, `+ Telur Separuh Masak 2 Biji (140 kcal)`, `+ Nasi Putih 1 Senduk (150 kcal)`).
  * **Pangkalan Data Makanan Malaysia Terbina Dalam (`src/constants/malaysianFoods.js`):** Senarai 100+ makanan harian Malaysia (Mamak, Gerai, Kuih-muih, Minuman) yang boleh dicari secara *offline* dengan pantas tanpa perlu memanggil API Gemini setiap kali.

### 2.2 Pengubah Suai Makanan Malaysia / "Malaysian Modifiers" (`src/components/mealEditor.js`, `src/constants/prompts.js`)
* **Konteks Tempatan:** Kalori makanan Malaysia sangat bergantung pada cara hidangan.
* **Ciri Baharu dalam `mealEditor.js`:**
  * Untuk **Makanan Berkuah/Nasi**: Tambah *toggle pills* pantas:
    * `[Kuah Asing (-80 kcal)]` | `[ biasa ]` | `[Kuah Banjir (+120 kcal)]`
    * `[Nasi Separuh (-100 kcal)]` | `[Tambah Nasi (+150 kcal)]`
  * Untuk **Minuman (Teh Tarik, Milo, Nescafe, Sirap)**:
    * `[Kosong]` | `[Kurang Manis (-45 kcal)]` | `[Kaw / Lebih Susu (+60 kcal)]`
  * Pengubah suai ini akan melaraskan kiraan kalori dan karbohidrat/gula secara automatik tanpa pengguna perlu menaip semula!

### 2.3 *Voice-to-Log* (Log Makanan Guna Suara) (`src/screens/scanner.js`, `src/services/gemini.js`)
* **Ciri Baharu:** Kadang-kadang pengguna segan nak ambil gambar makanan depan kawan-kawan di kedai mamak, atau sudah habis makan baru teringat nak *log*.
* **Pelaksanaan:** Gunakan Web Speech API (`webkitSpeechRecognition`) atau rakaman suara pantas yang menghantar teks ke `gemini.js`. Pengguna hanya perlu tekan ikon mikrofon dan cakap: *"Tadi aku makan roti telur sekeping dengan teh o ais limau kurang manis"*. Gemini akan terus memulangkan JSON struktur makanan dan makronutrien untuk disahkan.

### 2.4 Penjejak Air Pintar & *Intermittent Fasting* / Mode Puasa (`src/screens/dashboard.js`)
* **Penjejak Air (Water Tracker):** Widget interaktif di `dashboard.js` dengan butang `+250ml (1 Gelas)` dan `+500ml (1 Botol)` berserta visual paras air yang naik secara animasi.
* **Mode Puasa (IF / Puasa Sunat / Ramadan):** Toggle khas dalam `profile.js` dan `dashboard.js` yang memaparkan masa berbaki untuk *Fasting Window* atau waktu Sahur/Berbuka, serta menukar cadangan waktu makan kepada **Sahur, Iftar, dan Moreh**.

---

## 🤖 3. Evolusi AI Companion & Gamifikasi (`src/components/companion.js`, `src/services/companionService.js`)

CalMal sudah mempunyai asas yang sangat menarik iaitu `companion.js`. Jadikan ia sebab utama pengguna sayang nak tinggal aplikasi ini:

* **Reaksi Visual & Emosi Dinamik:**
  * *Companion* berubah ekspresi/keadaan mengikut tabiat harian:
    * **Bertenaga / Gembira:** Bila pengguna capai sasaran protein dan air.
    * **Mengantuk / Dahaga:** Bila pengguna belum *log* air atau makanan sehingga tengah hari.
    * **Pakai Baju Sukan (Workout Gear):** Semasa pengguna berada di skrin `activity.js` atau sedang menggunakan `gpsTracker.js`.
* **Sistem *Streak Freeze* & Lencana (Badges):**
  * Simpan rekod *Daily Streak* dalam `store.js` & `supabaseClient.js`.
  * Jika pengguna terlupa *log* satu hari, benarkan mereka guna "Streak Shield" (diperoleh selepas 7 hari konsisten) supaya mereka tidak patah semangat apabila *streak* kembali ke $0$.
* **Konteks Sembang Lebih Pintar (`src/constants/prompts.js`):**
  * Pastikan `companionService.js` menyuntik ringkasan data hari ini (baki kalori, jumlah protein semasa, aktiviti senaman hari ini) ke dalam *system prompt* supaya apabila pengguna bersembang, *Companion* boleh memberi cadangan spesifik seperti: *"Baki kalori kau ada lagi $450\text{ kcal}$ untuk malam ni dan protein kurang $25\text{g}$. Apa kata cari ayam bakar atau sup tulang dekat pasar malam nanti?"*

---

## 📸 4. Penambahbaikan Teknikal: Scanner, Resipi & GPS

### 4.1 Optimasi Kamera & Pemampatan Imej (`src/screens/scanner.js`)
* **Masalah:** Gambar terus dari kamera telefon pintar moden bersaiz $4\text{MB} - 8\text{MB}$. Menghantar *base64* bersaiz besar ke `/api/gemini.js` menyebabkan proses imbasan lambat dan memakan kuota data/API.
* **Solusi:** Sebelum menghantar imej ke `src/services/gemini.js`, lukis semula imej pada elemen `<canvas>` tersembunyi dengan resolusi maksimum $1024 \times 1024\text{px}$ dan kualiti JPEG `0.7` (saiz akan turun ke sekitar $100\text{KB} - 180\text{KB}$). Masa tindak balas AI akan menjadi **3x lebih pantas**!

### 4.2 Pecahan Komponen Pinggan (Multi-Item Breakdown) (`src/constants/prompts.js`, `src/components/mealEditor.js`)
* **Solusi:** Apabila mengimbas "Nasi Campur", arahkan `prompts.js` untuk memulangkan pecahan item dalam array JSON (contoh: `Nasi Putih`, `Ayam Goreng Kunyit`, `Sayur Kobis Goreng`, `Sambal Belacan`) dan bukannya satu jumlah pukal sahaja. Dalam `mealEditor.js`, pengguna boleh membuang atau melaras berat setiap item secara berasingan.

### 4.3 Penjejak GPS Tanpa Gangguan (`src/services/gpsTracker.js`, `src/screens/activity.js`)
* **Masalah Web App:** Apabila skrin telefon terpadam semasa berlari/berjalan, pelayar web akan menghentikan bacaan GPS.
* **Solusi:**
  * Gunakan **Screen Wake Lock API** (`navigator.wakeLock.request('screen')`) di dalam `gpsTracker.js` semasa sesi aktiviti sedang berjalan supaya skrin kekal hidup (atau tambah mod "Dim Screen / Battery Saver Overlay" berwarna hitam pekat dalam `activity.js`).
  * Tambah penapis hingar GPS (*Kalman filter* ringkas atau abaikan titik koordinat jika `coords.accuracy > 30` meter) supaya kiraan jarak kilometer tidak melompat-lompat apabila pengguna berada di bawah bangunan atau pokok.

### 4.4 Penjana Resipi Mengikut Bajet Kalori Semasa (`src/screens/recipes.js`)
* **Ciri Baharu:** Tambah butang **"Cadangkan Ikut Baki Kalori Saya"** di `recipes.js`. Jika baki kalori pengguna di `store.js` tinggal $500\text{ kcal}$, `recipes.js` akan meminta Gemini menjana resipi ringkas (atau cadangan menu kedai makan) yang berada tepat di bawah $500\text{ kcal}$.

---

## 📊 5. Analitik & Kiraan Pintar (`src/utils/calc.js`, `src/screens/profile.js`)

* **Graf Trend Berat & Purata 7-Hari (`src/screens/profile.js`):**
  * Berat badan harian turun naik disebabkan berat air (*water weight*). Dalam `calc.js`, tambah fungsi pengiraan **7-Day Moving Average** supaya pengguna nampak trend penurunan sebenar yang stabil di atas graf SVG/Canvas yang kemas.
* **Visualisasi Baki Mingguan (Weekly Calorie Bank) (`src/screens/dashboard.js`):**
  * Kadang-kadang pengguna terlebih makan pada hari Sabtu (kenduri kahwin / makan besar). Tunjukkan bar **Bajet Kalori Mingguan** supaya mereka tahu mereka masih berada dalam defisit mingguan walaupun terlebih sedikit pada satu hari.

---

## 🛠️ Pelan Tindakan Berfasa Untuk Antigravity (Execution Roadmap)

> **Arahan untuk Antigravity:** Sila laksanakan penambahbaikan di bawah mengikut fasa supaya kod kekal stabil dan mudah diuji.

### 🟢 Fasa 1: UI/UX Polish, Performance & Image Compression
1. Kemas kini `src/styles/index.css` dan `src/styles/screens.css` dengan animasi transisi skrin yang lancar, *glassmorphism bottom nav*, dan reka bentuk *Bottom Sheet* untuk modal.
2. Tambah fungsi pemampatan imej (`compressImage()`) dalam `src/utils/helpers.js` dan gunakannya dalam `src/screens/scanner.js` sebelum menghantar gambar ke `src/services/gemini.js`.
3. Bina komponen *Skeleton Loader* dan *Toast Notification* yang lebih kemas dalam `src/components/ui.js`.

### 🟡 Fasa 2: Lokalisasi Malaysia & Kecekapan Log Harian (Daily Driver Core)
1. Kemas kini `src/components/mealEditor.js` untuk menyokong **Malaysian Modifiers** (*Kurang Manis, Kosong, Kuah Banjir, Kuah Asing, Nasi Separuh*) yang melaras kalori dan makro secara dinamik.
2. Tambah bahagian **Quick Log Chips** (Makanan Kerap & Makanan Malaysia Popular) serta butang **"Salin Makanan Semalam"** pada `src/screens/dashboard.js` dan `src/services/store.js`.
3. Kemas kini `src/constants/prompts.js` supaya imbasan makanan Nasi Campur memulangkan pecahan item (*sub-items*) di samping jumlah keseluruhan.

### 🔵 Fasa 3: Penjejak Air, Voice Log & Peningkatan Companion
1. Bina widget **Water Tracker** interaktif pada `src/screens/dashboard.js` dan simpan rekod harian dalam `src/services/store.js`.
2. Tambah ciri **Voice-to-Log** menggunakan Web Speech API dalam `src/screens/scanner.js` untuk membolehkan pengguna merekod makanan melalui suara.
3. Tingkatkan `src/components/companion.js` dan `src/services/companionService.js` supaya memaparkan mood/status berdasarkan pencapaian kalori, protein, dan air semasa pengguna.

### 🟣 Fasa 4: Wake Lock GPS, Graf Trend & PWA Offline Sync
1. Integrasikan `navigator.wakeLock` dan penapis ketepatan GPS (`coords.accuracy`) di dalam `src/services/gpsTracker.js` serta skrin `src/screens/activity.js`.
2. Tambah carta visual **7-Day Weight & Calorie Trend** menggunakan SVG tulen yang ringan di `src/screens/profile.js` dan `src/utils/calc.js`.
3. Kemas kini `public/sw.js` dan `src/services/store.js` dengan barisan giliran luar talian (*offline sync queue*) supaya semua data yang direkod tanpa internet akan diselaraskan secara automatik ke `supabaseClient.js` sebaik sahaja talian kembali pulih.