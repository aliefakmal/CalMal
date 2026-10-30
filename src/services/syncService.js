import { getAccountStorageKey, getActiveUsername } from './authService.js';

export const SYNC_QUEUE_KEY = 'calmal_sync_queue';
const STATUS_KEY = 'calmal_sync_status';
const listeners = new Set();

function accountKeys(username) {
  const suffix = encodeURIComponent(username);
  return {
    queue: `${SYNC_QUEUE_KEY}.${suffix}`,
    status: `${STATUS_KEY}.${suffix}`,
  };
}
function readQueue(username) {
  try {
    const queue = JSON.parse(localStorage.getItem(accountKeys(username).queue) || '[]');
    return Array.isArray(queue) ? queue : [];
  } catch { return []; }
}
function writeQueue(username, queue) {
  try { localStorage.setItem(accountKeys(username).queue, JSON.stringify(queue)); } catch {}
}
function keyOf(payload = {}) { return payload.client_id || payload.id || payload.logged_date; }
export function subscribeSync(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getSyncStatus() {
  const username = getActiveUsername();
  if (!username) return { status: 'saved_offline' };
  try { return JSON.parse(localStorage.getItem(accountKeys(username).status) || '{"status":"saved_offline"}'); } catch { return { status: 'saved_offline' }; }
}

export function enqueueMutation(table, action, payload) {
  const username = getActiveUsername();
  if (!username || typeof localStorage === 'undefined') return;
  const item = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, table, action, payload, timestamp: Date.now() };
  const queue = readQueue(username);
  const key = `${table}:${keyOf(payload)}`;
  writeQueue(username, [...queue.filter((x) => `${x.table}:${keyOf(x.payload)}` !== key), item]);
  return item;
}

export function enqueueScanCache(identity, product) {
  if (!identity || !product) return;
  enqueueMutation('food_scan_cache', 'UPSERT', {
    identity,
    product,
    updated_at: new Date().toISOString(),
  });
}

export function enqueueStateSync(state) {
  if (!state || !getActiveUsername()) return;
  if (state.profile) enqueueMutation('profiles', 'UPSERT', {
    id: state.profile.id, username: state.profile.username,
    display_name: state.profile.name || state.profile.displayName || 'Hero',
    height_cm: state.profile.height, weight_kg: state.profile.weight, age: state.profile.age,
    gender: state.profile.gender, activity_level: state.profile.activity,
    daily_calorie_goal: state.profile.dailyCalorieGoal, daily_step_goal: state.profile.stepGoal ?? null, selected_companion: state.profile.selectedCompanion || 'deku',
    updated_at: state.profile.updatedAt || new Date().toISOString(),
  });
  (state.meals || []).forEach((m) => enqueueMutation('meal_logs', 'UPSERT', {
    client_id: m.id, logged_date: m.date, meal_type: m.mealType, food_name: m.name || m.food_name || 'Meal',
    calories: m.kcal || m.calories || 0, protein_g: m.protein || 0, carbs_g: m.carbs || 0, fat_g: m.fat || 0,
    portion_multiplier: m.portion_multiplier || 1, image_url: m.image_url || null, updated_at: m.updatedAt || new Date().toISOString(),
  }));
  (state.activities || []).forEach((a) => enqueueMutation('activity_sessions', 'UPSERT', {
    client_id: a.id, activity_type: a.activityType || 'walk', start_time: a.startedAt || a.startTime, end_time: a.endedAt || a.endTime,
    duration_sec: a.durationSec || a.duration, distance_meters: (a.distanceKm || 0) * 1000, steps: a.steps || 0,
    calories_burned: a.kcal || a.calories || 0, avg_pace_sec_per_km: a.avgPaceSecPerKm || null, route_geojson: a.routeGeojson || null,
  }));
}

// Local accounts have no cloud identity. Their queues stay on this device.
export async function processSyncQueue() {}

export async function mergeGuestDataToCloud() {
  const username = getActiveUsername();
  if (!username || typeof localStorage === 'undefined') return;
  try { enqueueStateSync(JSON.parse(localStorage.getItem(getAccountStorageKey(username)) || '{}')); } catch {}
}
