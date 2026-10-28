import { getCurrentUser, supabase } from './supabaseClient.js';
import { getAccountStorageKey, getActiveUsername } from './authService.js';

export const SYNC_QUEUE_KEY = 'calmal_sync_queue';
const STATUS_KEY = 'calmal_sync_status';
const listeners = new Set();
let processingUsername = null;
let processingId = 0;

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
function notify(username, status) {
  try { localStorage.setItem(accountKeys(username).status, JSON.stringify({ status, at: new Date().toISOString() })); } catch {}
  listeners.forEach((fn) => fn(status));
}
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
  if (typeof navigator !== 'undefined' && navigator.onLine) processSyncQueue();
  return item;
}

export function enqueueStateSync(state) {
  if (!state || !getActiveUsername()) return;
  if (state.profile) enqueueMutation('profiles', 'UPSERT', {
    id: state.profile.id, username: state.profile.username,
    display_name: state.profile.name || state.profile.displayName || 'Hero',
    height_cm: state.profile.height, weight_kg: state.profile.weight, age: state.profile.age,
    gender: state.profile.gender, activity_level: state.profile.activity,
    daily_calorie_goal: state.profile.dailyCalorieGoal, selected_companion: state.profile.selectedCompanion || 'deku',
    updated_at: state.profile.updatedAt || new Date().toISOString(),
  });
  (state.meals || []).forEach((m) => enqueueMutation('meal_logs', 'UPSERT', {
    client_id: m.id, logged_date: m.date, meal_type: m.mealType, food_name: m.name || m.food_name || 'Meal',
    calories: m.kcal || m.calories || 0, protein_g: m.protein || 0, carbs_g: m.carbs || 0, fat_g: m.fat || 0,
    portion_multiplier: m.portion_multiplier || 1, image_url: m.image_url || null, updated_at: m.updatedAt || new Date().toISOString(),
  }));
  (state.activities || []).forEach((a) => enqueueMutation('activity_sessions', 'UPSERT', {
    client_id: a.id, activity_type: a.type || a.activityType || 'walk', start_time: a.startTime, end_time: a.endTime,
    duration_sec: a.durationSec || a.duration, distance_meters: (a.distanceKm || 0) * 1000, steps: a.steps || 0,
    calories_burned: a.kcal || a.calories || 0, avg_pace_sec_per_km: a.avgPaceSecPerKm || null, route_geojson: a.routeGeojson || null,
  }));
}

async function upsert(table, payload) {
  if (table === 'daily_steps') {
    const { data, error: readError } = await supabase.from(table).select('id, step_count').eq('logged_date', payload.logged_date).maybeSingle();
    if (readError) throw readError;
    if (data) payload.step_count = Math.max(Number(data.step_count) || 0, Number(payload.step_count) || 0);
  }
  const conflict = table === 'profiles' ? 'id' : table === 'daily_steps' ? 'user_id,logged_date' : 'client_id';
  const { error } = await supabase.from(table).upsert(payload, { onConflict: conflict });
  if (error) throw error;
}
async function remove(table, payload) {
  const column = table === 'profiles' ? 'id' : 'client_id';
  const { error } = await supabase.from(table).delete().eq(column, keyOf(payload));
  if (error) throw error;
}
export async function processSyncQueue() {
  const username = getActiveUsername();
  if (!username || processingUsername || !supabase || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  const isCurrentAccount = () => getActiveUsername() === username;
  const user = await getCurrentUser();
  if (!user || !isCurrentAccount() || processingUsername) return;
  processingUsername = username;
  const runId = ++processingId;
  notify(username, 'syncing');
  try {
    const processed = [];
    const pending = [];
    for (const item of readQueue(username)) {
      if (!isCurrentAccount()) return;
      try {
        const payload = { ...item.payload, user_id: user.id };
        if (item.table === 'profiles') payload.id = user.id;
        if (item.action === 'DELETE') await remove(item.table, payload); else await upsert(item.table, payload);
        processed.push(item);
        if (!isCurrentAccount()) return;
      } catch (err) {
        pending.push(item);
        console.warn('[CalMal sync]', item.table, err?.message || err);
        if (!isCurrentAccount()) return;
      }
    }
    const processedIds = new Set(processed.map((item) => item.id));
    const remaining = [...pending, ...readQueue(username).filter((item) => !processedIds.has(item.id))];
    writeQueue(username, remaining);
    notify(username, remaining.length ? 'saved_offline' : 'synced');
  } finally {
    if (processingId === runId) processingUsername = null;
  }
}
export async function mergeGuestDataToCloud() {
  const username = getActiveUsername();
  if (!username) return;
  if (typeof localStorage !== 'undefined') {
    try { enqueueStateSync(JSON.parse(localStorage.getItem(getAccountStorageKey(username)) || '{}')); } catch {}
  }
  if (getActiveUsername() === username) return processSyncQueue();
}
if (typeof window !== 'undefined') window.addEventListener('online', processSyncQueue);
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') processSyncQueue(); });
