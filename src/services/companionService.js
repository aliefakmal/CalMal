// Smart Notifications & Anime Companion Triggers (English)
import { store } from './store.js';
import { showCompanion, showCutIn } from '../components/companion.js';
import { toast } from '../components/ui.js';

export const BADGES = {
  first_meal: { title: 'First Bite', desc: 'Logged your first meal', who: 'deku', iconKey: 'bowl', color: '#3ddc97' },
  first_run: { title: 'Hero Step', desc: 'Recorded first running session', who: 'bakugou', iconKey: 'footprints', color: '#00b4d8' },
  run_5k: { title: '5K Smash', desc: 'Completed a 5 km run', who: 'deku', iconKey: 'mountain', color: '#ff7a1a' },
  best_pace: { title: 'Pace Record', desc: 'Personal best pace (≥1 km)', who: 'bakugou', iconKey: 'clock', color: '#ffd60a' },
  target_day: { title: 'Bullseye', desc: 'Hit exact calorie target within 10%', who: 'deku', iconKey: 'crosshair', color: '#34d399' },
  protein_80: { title: 'Protein Hero', desc: 'Reached 80% daily protein target', who: 'deku', iconKey: 'sparkles', color: '#a78bfa' },
  streak_3: { title: '3-Day Consistency', desc: 'Logged meals for 3 consecutive days', who: 'deku', iconKey: 'flame', color: '#f97316' },
  weight_goal: { title: 'Plus Ultra!', desc: 'Achieved your target body weight', who: 'bakugou', iconKey: 'trophy', color: '#fbbf24' },
  scanner_pro: { title: 'Scan Master', desc: 'Used all 3 scanning modes', who: 'deku', iconKey: 'camera', color: '#38bdf8' },
};

const REMINDERS = [
  {
    id: 'breakfast', at: [8, 0], until: [10, 30], who: 'deku', meal: 'Breakfast',
    text: 'Good morning! Remember to snap a photo of your breakfast in CalMal so we can balance your daily calories!',
  },
  {
    id: 'lunch', at: [13, 0], until: [15, 0], who: 'deku', meal: 'Lunch',
    text: 'Lunchtime! Remember our dietitian rule: double the vegetables, opt for lean protein, and watch the heavy gravies!',
  },
  {
    id: 'dinner', at: [20, 0], until: [22, 30], who: 'bakugou', meal: 'Dinner',
    text: 'HEY! You haven’t logged dinner yet! Don’t think you can hide that sweet supper from me!',
  },
];

const INACTIVE_TEXT = 'OI SLACKER! The sun is setting and you haven’t burned even 100 kcal through exercise! Are your running shoes gathering dust?! Get outside and run right now!';

const mins = (h, m) => h * 60 + m;

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    toast('This browser does not support web notifications.', 'error');
    return false;
  }
  const p = await Notification.requestPermission();
  return p === 'granted';
}

async function pushNotification(title, body) {
  if (!store.settings.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
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

/** Periodic reminder check: meals & 5:30 PM inactivity alert */
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
  setTimeout(() => toast(`Badge Unlocked: ${b.title} 🏅`, 'success'), 600);
  return true;
}

/** Check achievements after meal is logged */
export function onMealLogged(meal) {
  unlock('first_meal');
  const s = store.summary();

  // 3-day streak
  const days = new Set(store.state.meals.map((x) => x.date));
  const d = new Date();
  let streak = 0;
  for (let i = 0; i < 3; i++) {
    const k = new Date(d.getTime() - i * 864e5);
    const key = `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, '0')}-${String(k.getDate()).padStart(2, '0')}`;
    if (days.has(key)) streak++;
  }
  if (streak >= 3) unlock('streak_3');

  // 80% Protein
  if (s.protein >= s.macros.protein * 0.8 && !store.flag('protein80')) {
    store.setFlag('protein80');
    unlock('protein_80');
    showCompanion({
      who: 'deku',
      text: `Plus Ultra! You have reached ${Math.round((s.protein / s.macros.protein) * 100)}% of your daily protein goal today! Keep up the momentum!`,
    });
    return;
  }

  // Target calorie hit within 90-100%
  const ratio = s.kin / (s.target + s.kout);
  if (ratio >= 0.9 && ratio <= 1.0 && !store.flag('target')) {
    store.setFlag('target');
    unlock('target_day');
    showCompanion({ who: 'both', title: 'Fist Bump! 👊', text: 'Deku: Perfect calorie balance today! · Bakugou: Hmph, don’t you dare overeat tomorrow!' });
    return;
  }

  if (ratio > 1.1 && !store.flag('over')) {
    store.setFlag('over');
    showCompanion({ who: 'bakugou', text: `OI! You exceeded your target by ${Math.abs(s.remaining)} kcal! Put on your running shoes and burn it off right now!` });
  }
}

/** Check achievements after running activity ends */
export function onActivityFinished(act) {
  const first = unlock('first_run');
  const past = store.state.activities.filter((a) => a.id !== act.id && a.distanceKm >= 1 && a.pace > 0);
  const bestPast = past.length ? Math.min(...past.map((a) => a.pace)) : Infinity;
  const newBest = act.distanceKm >= 1 && act.pace > 0 && act.pace < bestPast && past.length > 0;

  if (act.distanceKm >= 5 || newBest) {
    if (act.distanceKm >= 5) unlock('run_5k');
    if (newBest) unlock('best_pace');
    showCutIn({
      title: act.distanceKm >= 5 ? '5K SMASH!!' : 'NEW RECORD!',
      subtitle: `${act.distanceKm.toFixed(2)} km · ${act.kcal} kcal`,
      lines: [
        { who: 'deku', text: 'Incredible! You completed the run with an amazingly steady pace! SMASH!!' },
        { who: 'bakugou', text: 'Hmph! Not bad for a warm-up. Tomorrow, beat your own record time!' },
      ],
    });
  } else if (act.kcal >= 100) {
    showCompanion({ who: 'bakugou', text: `Hmph. ${act.kcal} kcal burned. That’s just a warm-up — run further tomorrow!` });
  } else if (first) {
    showCompanion({ who: 'deku', text: 'First activity recorded! Every hero begins with a single bold step!' });
  } else {
    showCompanion({ who: 'bakugou', text: 'Is that it?! Less than 100 kcal! Don’t embarrass me!' });
  }
}

/** Check target body weight achievement */
export function onWeightLogged(weight) {
  const p = store.profile;
  if (!p?.targetWeight) return;
  const reached = p.goal === 'gain' ? weight >= p.targetWeight : weight <= p.targetWeight;
  if (reached && unlock('weight_goal')) {
    showCutIn({
      title: 'PLUS ULTRA!!',
      subtitle: `Target weight of ${p.targetWeight} kg reached!`,
      lines: [
        { who: 'deku', text: 'You did it! All that effort, every logged meal, every run — it was all worth it!' },
        { who: 'bakugou', text: 'Tch... Alright, I’ll admit it. You were awesome. Now set an even higher goal!' },
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

/** Contextual companion bubble for dashboard */
export function dashboardMessage() {
  const s = store.summary();
  const h = new Date().getHours();
  const pct = s.kin / s.target;
  if (!s.meals.length && h < 11) return { who: 'deku', text: 'Good morning! Let’s start the day with high-protein fuel. Scan your breakfast when you’re ready!' };
  if (h >= 17 && s.kout < 100) return { who: 'bakugou', text: 'It’s already evening and you haven’t moved?! Open the Activity tab and RUN!' };
  if (s.remaining < 0) return { who: 'bakugou', text: `You’re over by ${Math.abs(s.remaining)} kcal. Burn it off with a ${Math.ceil(Math.abs(s.remaining) / 70)} km run!` };
  if (s.protein < s.macros.protein * 0.5 && h >= 14) return { who: 'deku', text: `Protein is currently at ${Math.round(s.protein)} g. Try adding chicken, fish, eggs, or tofu for your next meal!` };
  if (pct >= 0.9) return { who: 'deku', text: 'Almost at your calorie target! Choose a light fruit snack if you feel hungry.' };
  if (s.kout >= 200) return { who: 'bakugou', text: `${s.kout} kcal burned today! Hmph, respectable work. Don’t stop now!` };
  return { who: 'deku', text: `You have ${s.remaining} kcal remaining today. I recommend a balanced plate: half vegetables, quarter lean protein, quarter carbs!` };
}
