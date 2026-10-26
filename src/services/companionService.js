// Notifikasi pintar & pencetus kompanion (pelan §4.2)
import { store } from './store.js';
import { showCompanion, showCutIn } from '../components/companion.js';
import { toast } from '../components/ui.js';

export const BADGES = {
  first_meal: { title: 'Suapan Pertama', desc: 'Log makanan pertama', who: 'deku' },
  first_run: { title: 'Langkah Wira', desc: 'Rekod aktiviti pertama', who: 'bakugou' },
  run_5k: { title: '5K Smash', desc: 'Tamatkan larian 5 km', who: 'deku' },
  best_pace: { title: 'Rekod Pace Baharu', desc: 'Pace terbaik peribadi (≥1 km)', who: 'bakugou' },
  target_day: { title: 'Sasaran Tepat', desc: 'Capai sasaran kalori tanpa terlebih', who: 'deku' },
  protein_80: { title: 'Protein Hero', desc: 'Capai 80% sasaran protein', who: 'deku' },
  streak_3: { title: 'Konsisten 3 Hari', desc: 'Log makanan 3 hari berturut', who: 'deku' },
  weight_goal: { title: 'Plus Ultra!', desc: 'Capai berat badan sasaran', who: 'bakugou' },
  scanner_pro: { title: 'Pakar Imbasan', desc: 'Guna ketiga-tiga mod imbasan', who: 'deku' },
};

const REMINDERS = [
  {
    id: 'breakfast', at: [8, 0], until: [10, 30], who: 'deku', meal: 'Sarapan',
    text: 'Selamat pagi! Jangan lupa tangkap gambar sarapan anda di CalMal supaya kita boleh rancang baki kalori hari ini!',
  },
  {
    id: 'lunch', at: [13, 0], until: [15, 0], who: 'deku', meal: 'Tengah Hari',
    text: 'Waktu makan tengah hari! Kalau makan Nasi Campur, ingat tip kita: tambah sayur dan kawal kuah!',
  },
  {
    id: 'dinner', at: [20, 0], until: [22, 30], who: 'bakugou', meal: 'Makan Malam',
    text: 'Oi! Kau belum log makan malam lagi! Jangan ingat kau boleh sorok Teh Tarik kau daripada aku!',
  },
];

const INACTIVE_TEXT = 'OI DEKU-Kaki Bangku! Hari dah nak gelap dan kau belum bakar walau 100 kcal pun melalui senaman! Kasut sukan kau dah berhabuk ke?! Keluar dan mulakan larian sekarang!';

const mins = (h, m) => h * 60 + m;

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    toast('Pelayar ini tidak menyokong notifikasi.', 'error');
    return false;
  }
  const p = await Notification.requestPermission();
  return p === 'granted';
}

async function pushNotification(title, body) {
  if (!store.settings.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
  // Jika app sedang dilihat, kompanion in-app sudah memadai
  if (document.visibilityState === 'visible') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification(title, { body, icon: '/icon.svg', badge: '/icon.svg', tag: title });
    else new Notification(title, { body, icon: '/icon.svg' });
  } catch { /* noop */ }
}

function fire(id, who, text) {
  if (store.flag(id)) return;
  store.setFlag(id);
  showCompanion({ who, text, duration: 10000 });
  pushNotification(who === 'bakugou' ? 'Bakugou 💥' : 'Deku ⚡', text);
}

/** Semakan berkala: peringatan waktu makan & amaran tidak aktif 5:30 petang */
export function checkReminders() {
  if (!store.profile) return;
  const now = new Date();
  const m = mins(now.getHours(), now.getMinutes());
  const meals = store.mealsOn();

  for (const r of REMINDERS) {
    if (m >= mins(...r.at) && m <= mins(...r.until)) {
      const logged = meals.some((x) => x.mealType === r.meal);
      if (!logged) fire(`remind:${r.id}`, r.who, r.text);
    }
  }

  if (m >= mins(17, 30) && m <= mins(21, 0)) {
    const burned = store.summary().kout;
    if (burned < 100) fire('remind:inactive', 'bakugou', INACTIVE_TEXT);
  }
}

let interval = null;
export function startReminderLoop() {
  clearInterval(interval);
  setTimeout(checkReminders, 4000);
  interval = setInterval(checkReminders, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(checkReminders, 1500);
  });
}

function unlock(id) {
  if (!store.unlockBadge(id)) return false;
  const b = BADGES[id];
  setTimeout(() => toast(`Lencana dibuka: ${b.title} 🏅`, 'success'), 600);
  return true;
}

/** Semakan pencapaian selepas log makanan */
export function onMealLogged(meal) {
  unlock('first_meal');
  const s = store.summary();

  // Streak 3 hari
  const days = new Set(store.state.meals.map((x) => x.date));
  const d = new Date();
  let streak = 0;
  for (let i = 0; i < 3; i++) {
    const k = new Date(d.getTime() - i * 864e5);
    const key = `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, '0')}-${String(k.getDate()).padStart(2, '0')}`;
    if (days.has(key)) streak++;
  }
  if (streak >= 3) unlock('streak_3');

  // Protein 80%
  if (s.protein >= s.macros.protein * 0.8 && !store.flag('protein80')) {
    store.setFlag('protein80');
    unlock('protein_80');
    showCompanion({
      who: 'deku',
      text: `Plus Ultra! Anda dah capai ${Math.round((s.protein / s.macros.protein) * 100)}% sasaran protein untuk berat badan anda hari ini! Teruskan usaha!`,
    });
    return;
  }

  // Sasaran kalori dicapai tanpa terlebih (90–100%)
  const ratio = s.kin / (s.target + s.kout);
  if (ratio >= 0.9 && ratio <= 1.0 && !store.flag('target')) {
    store.setFlag('target');
    unlock('target_day');
    showCompanion({ who: 'both', title: 'Fist Bump! 👊', text: 'Deku: Sasaran kalori tepat! · Bakugou: Hmph, jangan berani terlebih makan lepas ni!' });
    return;
  }

  if (ratio > 1.1 && !store.flag('over')) {
    store.setFlag('over');
    showCompanion({ who: 'bakugou', text: `OI! Kau dah terlebih ${Math.abs(s.remaining)} kcal! Pakai kasut sekarang dan bakar balik!` });
  }
}

/** Semakan pencapaian selepas aktiviti tamat */
export function onActivityFinished(act) {
  const first = unlock('first_run');
  const past = store.state.activities.filter((a) => a.id !== act.id && a.distanceKm >= 1 && a.pace > 0);
  const bestPast = past.length ? Math.min(...past.map((a) => a.pace)) : Infinity;
  const newBest = act.distanceKm >= 1 && act.pace > 0 && act.pace < bestPast && past.length > 0;

  if (act.distanceKm >= 5 || newBest) {
    if (act.distanceKm >= 5) unlock('run_5k');
    if (newBest) unlock('best_pace');
    showCutIn({
      title: act.distanceKm >= 5 ? '5K SMASH!!' : 'REKOD BAHARU!',
      subtitle: `${act.distanceKm.toFixed(2)} km · ${act.kcal} kcal`,
      lines: [
        { who: 'deku', text: 'Luar biasa! Anda berjaya menamatkan larian dengan rentak yang sangat stabil! SMASH!!' },
        { who: 'bakugou', text: 'Hmph! Boleh tahan untuk permulaan. Esok kalahkan rekod masa kau sendiri!' },
      ],
    });
  } else if (act.kcal >= 100) {
    showCompanion({ who: 'bakugou', text: `Hmph. ${act.kcal} kcal dibakar. Itu baru panas badan — esok lari lebih jauh!` });
  } else if (first) {
    showCompanion({ who: 'deku', text: 'Aktiviti pertama direkod! Setiap wira bermula dengan satu langkah!' });
  } else {
    showCompanion({ who: 'bakugou', text: 'Itu je?! Kurang 100 kcal! Jangan buat aku malu!' });
  }
}

/** Semakan berat badan sasaran */
export function onWeightLogged(weight) {
  const p = store.profile;
  if (!p?.targetWeight) return;
  const reached = p.goal === 'gain' ? weight >= p.targetWeight : weight <= p.targetWeight;
  if (reached && unlock('weight_goal')) {
    showCutIn({
      title: 'PLUS ULTRA!!',
      subtitle: `Berat sasaran ${p.targetWeight} kg dicapai!`,
      lines: [
        { who: 'deku', text: 'Anda berjaya! Semua usaha, semua log makanan, semua larian — semuanya berbaloi!' },
        { who: 'bakugou', text: 'Tch... Okay, aku mengaku. Kau memang hebat. Sekarang tetapkan sasaran baru!' },
      ],
    });
  }
}

export function onScanModeUsed(mode) {
  const key = 'scanModes';
  const used = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  used.add(mode);
  localStorage.setItem(key, JSON.stringify([...used]));
  if (used.size >= 3) unlock('scanner_pro');
}

/** Mesej kontekstual untuk kad kompanion di papan pemuka */
export function dashboardMessage() {
  const s = store.summary();
  const h = new Date().getHours();
  const pct = s.kin / s.target;
  if (!s.meals.length && h < 11) return { who: 'deku', text: 'Selamat pagi! Mari mulakan hari dengan sarapan berprotein. Imbas makanan anda bila sedia!' };
  if (h >= 17 && s.kout < 100) return { who: 'bakugou', text: 'Dah petang dan kau belum bergerak?! Buka tab Aktiviti dan LARI sekarang!' };
  if (s.remaining < 0) return { who: 'bakugou', text: `Kau terlebih ${Math.abs(s.remaining)} kcal. Bakar balik dengan larian ${Math.ceil(Math.abs(s.remaining) / 70)} km!` };
  if (s.protein < s.macros.protein * 0.5 && h >= 14) return { who: 'deku', text: `Protein baru ${Math.round(s.protein)} g. Cuba tambah ayam, ikan, telur atau tauhu untuk hidangan seterusnya!` };
  if (pct >= 0.9) return { who: 'deku', text: 'Hampir capai sasaran! Pilih snek ringan seperti buah jika lapar lagi.' };
  if (s.kout >= 200) return { who: 'bakugou', text: `${s.kout} kcal dibakar hari ni. Hmph, boleh tahan. Jangan berhenti!` };
  return { who: 'deku', text: `Baki ${s.remaining} kcal hari ini. Saya cadangkan hidangan seimbang: separuh sayur, suku protein, suku nasi!` };
}
