// Aggregate every GPS session of one day for the daily path map.
import { todayKey } from './helpers.js';

export function dayRoutes(activities = [], date) {
  const sessions = activities.filter((a) => a.date === date);
  const sum = (k) => sessions.reduce((s, a) => s + (Number(a[k]) || 0), 0);
  return {
    sessions,
    km: Math.round(sum('distanceKm') * 100) / 100,
    steps: Math.round(sum('steps')),
    kcal: Math.round(sum('kcal')),
    sec: Math.round(sum('durationSec')),
    coords: sessions.flatMap((a) => (a.segments || []).flat()),
  };
}

export function lastNDays(n, today = new Date()) {
  return Array.from({ length: n }, (_, i) => todayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)));
}
