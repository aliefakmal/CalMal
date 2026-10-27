// Modal Panduan / Tutorial bagi Setiap Halaman CalMal
import { t, getLang } from './i18n.js';
import { openSheet } from '../components/ui.js';
import { icons } from '../components/icons.js';
import { esc } from './helpers.js';

export function openPageTutorial(pageKey) {
  const isEn = getLang() === 'en';
  let title = '';
  let desc = '';
  let steps = [];

  switch (pageKey) {
    case 'dashboard':
      title = isEn ? 'Dashboard & Nutrition Guide' : 'Panduan Dashboard & Nutrisi';
      desc = isEn ? 'Master your daily calorie balance, water tracking, and 1-tap meals:' : 'Kuasai baki kalori harian, penjejak air dan log makanan pantas:';
      steps = isEn
        ? [
            'Calorie Balance Formula: Daily Target - Food In + Burned = Remaining Calories. Green ring indicates on track; red warns surplus.',
            'Target Calibration: Tap "Adjust" on the Calorie Balance card to customize your target or reset to formula recommendation.',
            '1-Tap Malaysian Foods: Tap quick chips (Kopi O, 2 Telur, Roti Canai) to instantly log staple Malaysian items.',
            'Hydration Tracker: Tap "+ 250ml" for quick logging, or tap "Custom" / the water bar to input any exact amount in ml.',
            'Copy Yesterday: Tap "Copy Yesterday" to instantly duplicate all meals you logged yesterday into today.',
            'AI Food Scanner: Tap "+ SCAN" in the bottom navigation to snap a photo and auto-calculate calories and macros.',
          ]
        : [
            'Formula Baki Kalori: Sasaran Harian - Makanan Masuk + Terbakar = Baki Kalori. Hijau tanda dipatuhi; merah tanda lebihan.',
            'Kalibrasi Sasaran: Sentuh "Laras" pada kad baki kalori untuk memasukkan sasaran peribadi atau guna cadangan formula.',
            'Cip 1-Sentuhan Malaysia: Sentuh cip pantas (Kopi O, 2 Telur, Roti Canai) untuk log hidangan lazim serta-merta.',
            'Penjejak Air: Sentuh "+ 250ml" untuk log pantas, atau sentuh "Bebas" / bar air untuk tetapkan sebarang jumlah ml.',
            'Salin Semalam: Sentuh "Salin Semalam" untuk menyalin semua makanan semalam ke hari ini dalam satu sentuhan.',
            'Pengimbas AI: Sentuh "+ SCAN" di navigasi bawah untuk tangkap foto makanan dan anggar kalori automatik.',
          ];
      break;

    case 'scan':
      title = isEn ? 'AI Food & Nutrition Scanner Guide' : 'Panduan Pengimbas Makanan & Nutrisi AI';
      desc = isEn ? 'Effortlessly log meals using camera, voice, barcode, or nutrition labels:' : 'Log hidangan dengan mudah menggunakan kamera, suara, kod bar, atau label nutrisi:';
      steps = isEn
        ? [
            'Live Camera Scan: Point your camera at any meal, snap a photo, and CalMal AI identifies the dish, estimated portions, and macros.',
            'iPhone / Photo Library: Tap "iPhone Camera" to upload a high-res photo directly from your camera roll.',
            'Voice Note Logging: Tap "Voice Note" and describe what you ate (e.g., "Nasi lemak ayam goreng with teh tarik kurang manis").',
            'Barcode & Label OCR: Switch tabs to scan packaged Malaysian food barcodes or snap nutrition facts tables.',
            'Custom Notes & Quick Chips: Tap chips like "Half rice" or "Less oil" before analyzing to tune calorie accuracy.',
          ]
        : [
            'Imbas Kamera AI: Halakan kamera ke hidangan anda, tangkap foto dan AI CalMal akan mengenal pasti lauk, saiz hidangan, serta makro.',
            'Kamera Telefon / Galeri: Sentuh "Kamera Telefon" untuk memuat naik foto berkualiti tinggi dari album peranti anda.',
            'Log Nota Suara: Sentuh "Nota Suara" dan sebut apa yang anda makan (contoh: "Nasi lemak ayam goreng dan teh tarik kurang manis").',
            'Kod Bar & Label Nutrisi: Tukar tab untuk imbas kod bar makanan bungkusan atau tangkap jadual maklumat pemakanan.',
            'Cip Tambahan & Catatan: Sentuh cip pantas seperti "Nasi separuh" atau "Kurang minyak" sebelum imbas untuk ketepatan kalori.',
          ];
      break;

    case 'recipes':
      title = isEn ? 'Recipes & 7-Day Meal Plan Guide' : 'Panduan Resipi & Pelan Makanan 7-Hari';
      desc = isEn ? 'How to filter, customize, swap dishes, and generate AI recipes:' : 'Cara menapis, mengubah suai lauk, dan menjana resipi AI:';
      steps = isEn
        ? [
            'Filter by Day & Timing: Tap any day (Mon–Sun) or meal timing (Breakfast, Lunch, Dinner, Snack) to view scheduled dishes.',
            'Swap Dish: Tap "Swap Dish" on any meal to instantly rotate an alternative healthy Malaysian dish with matching macros.',
            'Quick Log (+ Log Meal): Tap "+ Log Meal" to instantly record that dish and its macros into today\'s calorie diary.',
            'Preferences & Calorie Target: Tap "Preferences" to recalibrate your daily target and diet focus (High Protein, Less Oil, Budget, etc.).',
            'AI Recipe Generator: Switch to the Generator tab to create personalized recipes from ingredients you have or fridge photos.',
            'Touch Market Guide: Tap the Market Guide card at the bottom to view fresh protein & shopping tips in a popup.',
          ]
        : [
            'Tapis Ikut Hari & Waktu: Sentuh mana-mana hari (Isnin–Ahad) atau waktu makan (Sarapan, Makan Tengah Hari, dll.) untuk semak lauk.',
            'Tukar Lauk: Sentuh "Tukar Lauk" pada mana-mana hidangan untuk menggantikan lauk sihat alternatif secara automatik.',
            'Log Pantas (+ Log Meal): Sentuh "+ Log Meal" untuk merekod hidangan tersebut terus ke diari makanan hari ini.',
            'Keutamaan & Sasaran: Sentuh "Keutamaan" untuk melaras sasaran kalori dan fokus diet (Tinggi Protein, Kurang Minyak, Bajet, dll.).',
            'Penjana Resipi AI: Pergi ke tab Penjana untuk mencipta resipi sihat daripada bahan dapur atau foto peti sejuk.',
            'Panduan Pasar: Sentuh kad Panduan Pasar di bawah untuk membuka tips pemilihan bahan basah segar dalam bentuk popup.',
          ];
      break;

    case 'activity':
      title = isEn ? 'GPS Activity Tracker Guide' : 'Panduan Penjejak Aktiviti GPS';
      desc = isEn ? 'Track your outdoor walks, runs, and rides with Strava-style routes:' : 'Rekod larian, jalan kaki, dan kayuhan dengan laluan bergaya Strava:';
      steps = isEn
        ? [
            'Start Workout: Tap "Start Activity" to begin real-time GPS tracking with distance, pace, and live polyline on OpenStreetMap.',
            'Simulation Mode: Toggle "Simulation Mode" to test route recording without needing to step outside.',
            'Pace & Metrics: View live elapsed time, current speed, average pace (min/km), and estimated calories burned.',
            'Save & Sync: Completed activities automatically sync burned calories to your dashboard calorie balance.',
          ]
        : [
            'Mula Aktiviti: Sentuh "Mula Aktiviti" untuk rakaman GPS masa nyata dengan jarak, kelajuan, dan laluan di peta OpenStreetMap.',
            'Mod Simulasi: Aktifkan "Mod Simulasi" untuk menguji rakaman laluan tanpa perlu keluar dari rumah.',
            'Metrik & Kelajuan: Paparan masa aktiviti, kelajuan semasa, purata pace (min/km), dan anggaran kalori terbakar.',
            'Simpan & Segerak: Aktiviti yang selesai akan disegerakkan terus ke baki kalori dashboard anda secara automatik.',
          ];
      break;

    case 'profile':
      title = isEn ? 'Profile & Preferences Guide' : 'Panduan Profil & Tetapan';
      desc = isEn ? 'Manage your body stats, AI anime hero coach, and app preferences:' : 'Urus maklumat badan, jurulatih anime AI, dan tetapan aplikasi:';
      steps = isEn
        ? [
            'Body Calibration: Tap "Edit Profile" to update height, weight, target goal, and age for exact BMR / TDEE calculations.',
            'AI Hero Coach: Switch between Deku and Bakugou for motivational voice and commentary based on your workout & nutrition.',
            'Language Switcher: Toggle between English and Bahasa Melayu anytime.',
            'Offline Privacy: CalMal is local-first; your personal stats are stored securely on your device.',
          ]
        : [
            'Kalibrasi Badan: Sentuh "Edit Profil" untuk mengemas kini tinggi, berat, sasaran dan umur bagi kiraan BMR / TDEE yang tepat.',
            'Jurulatih Hero AI: Pilih antara Deku dan Bakugou untuk suara motivasi dan komen audio mengikut pencapaian nutrisi anda.',
            'Tukar Bahasa: Beralih antara Bahasa Melayu dan English bila-bila masa.',
            'Privasi Luar Talian: CalMal berorientasikan privasi setempat; data anda disimpan selamat dalam peranti anda.',
          ];
      break;

    default:
      return;
  }

  openSheet(`
    <div class="guide-modal-sheet">
      <div class="row between" style="align-items:flex-start;margin-bottom:12px">
        <div style="flex:1;padding-right:12px">
          <div class="row" style="gap:6px;align-items:center;margin-bottom:4px">
            <span class="badge ok">${t('guide_badge')}</span>
            <span class="xs muted">${isEn ? 'Page Walkthrough' : 'Panduan Halaman'}</span>
          </div>
          <h3 style="font-size:17px;font-weight:800;color:#fff;margin:0;line-height:1.3">${esc(title)}</h3>
          <p class="xs muted" style="margin:4px 0 0;line-height:1.4">${esc(desc)}</p>
        </div>
        <button type="button" class="btn btn-icon btn-ghost btn-sm" data-close aria-label="${t('close')}">
          ${icons.close}
        </button>
      </div>

      <div class="guide-modal-steps">
        ${steps.map((st, idx) => `
          <div class="guide-modal-step-item">
            <div class="guide-step-num">${idx + 1}</div>
            <div class="guide-step-text">${esc(st)}</div>
          </div>
        `).join('')}
      </div>

      <button type="button" class="btn btn-primary btn-block" data-close style="margin-top:8px">
        <span>${isEn ? 'Got It' : 'Faham'}</span>
      </button>
    </div>
  `);
}
