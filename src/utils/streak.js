// Logging streak with earnable shields, derived purely from meal dates.
import { todayKey } from './helpers.js';

const MAX_SHIELDS = 2;
const DAYS_PER_SHIELD = 7;

function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function computeStreak(dates = [], today = todayKey()) {
  const logged = new Set(dates.filter((d) => typeof d === 'string' && d <= today));
  const result = { streak: 0, shields: 0, shieldedDays: [] };
  if (!logged.size) return result;

  let run = 0;
  const end = parseKey(today);
  // Local-date stepping (not +24h) so DST or UTC offsets never skip a day.
  for (let d = parseKey([...logged].sort()[0]); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const key = todayKey(d);
    if (logged.has(key)) {
      result.streak++;
      run++;
      if (run % DAYS_PER_SHIELD === 0) result.shields = Math.min(MAX_SHIELDS, result.shields + 1);
    } else if (key === today) {
      break;
    } else if (result.shields > 0) {
      result.shields--;
      result.shieldedDays.push(key);
    } else {
      result.streak = 0;
      run = 0;
      result.shieldedDays = [];
    }
  }
  return result;
}

/** 22:30-03:59 counts as one "night", keyed by the evening's date. */
export function isLateNight(now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 22 * 60 + 30) return { late: true, nightKey: todayKey(now) };
  if (mins < 4 * 60) {
    return { late: true, nightKey: todayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) };
  }
  return { late: false, nightKey: todayKey(now) };
}
