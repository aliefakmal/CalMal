// Kalkulator biometrik & aktiviti (pelan §2.1 & §3.4)

export const ACTIVITY_LEVELS = [
  { value: 1.2, multiplier: 1.2, mult: 1.2, label: 'Sedentary', desc: 'Desk job, little to no exercise' },
  { value: 1.375, multiplier: 1.375, mult: 1.375, label: 'Lightly Active', desc: 'Light exercise 1–3 days/week' },
  { value: 1.55, multiplier: 1.55, mult: 1.55, label: 'Moderately Active', desc: 'Moderate exercise 3–5 days/week' },
  { value: 1.725, multiplier: 1.725, mult: 1.725, label: 'Very Active', desc: 'Hard exercise 6–7 days/week' },
  { value: 1.9, multiplier: 1.9, mult: 1.9, label: 'Extremely Active', desc: 'Athlete / physical labor job' },
];

export const GOALS = [
  { value: 'lose', id: 'lose', label: 'Fat Loss', desc: '-500 kcal deficit', delta: -500 },
  { value: 'maintain', id: 'maintain', label: 'Maintain Weight', desc: 'Equal to TDEE', delta: 0 },
  { value: 'gain', id: 'gain', label: 'Build Muscle', desc: '+300 kcal surplus', delta: 300 },
];

/** Mifflin-St Jeor */
export function calcBMR({ weight, height, age, gender }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
}

export function calcTDEE(profile) {
  return Math.round(calcBMR(profile) * Number(profile.activity || 1.2));
}

export function calcSuggestedDailyTarget(profile) {
  const goal = GOALS.find((g) => g.value === profile?.goal) || GOALS[1];
  return Math.max(1200, calcTDEE(profile || {}) + goal.delta);
}

export function calcDailyTarget(profile) {
  if (profile && profile.customTarget && Number(profile.customTarget) >= 500) {
    return Math.round(Number(profile.customTarget));
  }
  return calcSuggestedDailyTarget(profile);
}

/** Makro berasaskan berat badan: protein 1.6–2.2 g/kg, lemak 0.8–1.0 g/kg, baki = karbohidrat */
export function calcMacros(profile) {
  const W = Number(profile.weight);
  const target = calcDailyTarget(profile);
  const proteinPerKg = profile.goal === 'maintain' ? 1.6 : profile.goal === 'gain' ? 2.0 : 1.8;
  const protein = Math.round(W * proteinPerKg);
  const fat = Math.round(W * 0.9);
  const carbs = Math.max(50, Math.round((target - protein * 4 - fat * 9) / 4));
  return {
    target,
    protein,
    fat,
    carbs,
    proteinRange: [Math.round(W * 1.6), Math.round(W * 2.2)],
    fatRange: [Math.round(W * 0.8), Math.round(W * 1.0)],
  };
}

export function calcBMI({ weight, height }) {
  const m = height / 100;
  return weight / (m * m);
}

export function calc7DayMovingAverage(weightRecords = []) {
  const sorted = [...weightRecords]
    .filter((w) => !isNaN(Number(w.weight)) && Number(w.weight) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((item, idx) => {
    const windowStart = Math.max(0, idx - 6);
    const windowSlice = sorted.slice(windowStart, idx + 1);
    const avg = windowSlice.reduce((s, x) => s + Number(x.weight), 0) / windowSlice.length;
    return {
      date: item.date,
      weight: Number(item.weight),
      avg: Math.round(avg * 10) / 10,
    };
  });
}

export function bmiLabel(bmi) {
  // Asian BMI classification (WHO/MOH)
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 23) return 'Normal Weight';
  if (bmi < 27.5) return 'Overweight';
  return 'Obese';
}

// Compendium of Physical Activities walking/running points, km/h -> MET.
const MET_TABLE = [[1, 2.0], [3.2, 2.8], [4.8, 3.5], [5.6, 4.3], [6.4, 5.0], [8.0, 8.3], [9.7, 9.8], [11.3, 11.0], [12.9, 11.8], [16.1, 14.5]];

/** Dynamic MET, linearly interpolated between Compendium points */
export function metForSpeed(kmh) {
  if (!(kmh >= 1)) return 0; // stopped
  const last = MET_TABLE[MET_TABLE.length - 1];
  if (kmh >= last[0]) return last[1];
  const i = MET_TABLE.findIndex(([v]) => v > kmh);
  const [v0, m0] = MET_TABLE[i - 1];
  const [v1, m1] = MET_TABLE[i];
  return m0 + ((kmh - v0) / (v1 - v0)) * (m1 - m0);
}

export function metLabel(kmh) {
  if (kmh < 1) return 'Idle / Stopped';
  if (kmh < 5) return 'Casual Walk';
  if (kmh < 7.5) return 'Brisk Walk';
  if (kmh < 10) return 'Jogging';
  return 'Fast Running';
}

/** Kalori Terbakar = MET × 3.5 × W / 200 × T(minit) */
export function kcalBurned(met, weightKg, minutes) {
  return (met * 3.5 * weightKg) / 200 * minutes;
}

/** Jarak Haversine dalam km */
export function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Pace dalam min/km */
export function paceMinPerKm(seconds, km) {
  if (!km || km < 0.01) return 0;
  return seconds / 60 / km;
}

export function formatPace(pace) {
  if (!pace || !isFinite(pace) || pace > 60) return '–:––';
  const m = Math.floor(pace);
  const s = Math.round((pace - m) * 60);
  return `${m}:${String(s === 60 ? 0 : s).padStart(2, '0')}`;
}

export function formatDuration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function strideMeters(heightCm) {
  return (heightCm * 0.415) / 100;
}


/** Sensor steps when the accelerometer works, otherwise a walking-stride estimate from GPS distance. */
export function fuseSteps({ sensorOk, sensorSteps, distanceKm, heightCm }) {
  if (sensorOk) return { steps: Math.round(sensorSteps), source: 'sensor' };
  return { steps: gapSteps(distanceKm, heightCm), source: 'gps' };
}

export function gapSteps(gapKm, heightCm) {
  return Math.round(((gapKm || 0) * 1000) / strideMeters(heightCm || 170));
}

/** Time the page was hidden counts as moving only if at least 20 m were covered. */
export function settleGap({ gapSec, gapKm, weightKg }) {
  if (!(gapKm >= 0.02) || !(gapSec > 0)) return { movingSec: 0, kcal: 0 };
  return { movingSec: gapSec, kcal: kcalBurned(metForSpeed(gapKm / (gapSec / 3600)), weightKg, gapSec / 60) };
}

export function autoPaused(prev, { speedKmh, msSinceLastStep }) {
  return prev
    ? !(msSinceLastStep < 1000 || speedKmh > 1.5)
    : speedKmh < 1 && msSinceLastStep >= 10000;
}

/** Walking speed implied by cadence over the last 10 s (treadmill / no GPS movement). */
export function cadenceSpeedKmh(stepTimes, nowMs, heightCm) {
  const spm = stepTimes.filter((t) => nowMs - t <= 10000).length * 6;
  return (spm * strideMeters(heightCm || 170) * 60) / 1000;
}
