import { todayKey, uid } from '../utils/helpers.js';
import { calcMacros } from '../utils/calc.js';
import { scheduleCloudSync } from './supabaseClient.js';
import { enqueueMutation, enqueueStateSync } from './syncService.js';
import { getAccountStorageKey, getActiveUsername, resumeLocalAccount, signOut } from './authService.js';

const listeners = new Set();

const defaults = () => ({
  profile: null,
  meals: [],
  activities: [],
  weights: [],
  recipes: [],
  mealPlan: null,
  water: {},
  badges: {},
  flags: {},
  scanCache: {},
  companionLines: { deku: null, bakugou: null },
  settings: { apiKey: '', notifications: false, companions: true, soundEnabled: true, cameraAlwaysOn: true, cameraFacing: 'environment' },
});

export function applyHeroTheme(coach) {
  if (typeof document === 'undefined') return;
  const isBaku = coach === 'bakugou';
  document.documentElement.style.setProperty('--hero-accent', isBaku ? '#f97316' : '#10b981');
  document.documentElement.style.setProperty('--hero-glow', isBaku ? 'rgba(249, 115, 22, 0.28)' : 'rgba(16, 185, 129, 0.28)');
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeState(parsed) {
  if (!isRecord(parsed)) return defaults();
  const def = defaults();
  const merged = { ...def, ...parsed };
  for (const key of ['meals', 'activities', 'weights', 'recipes']) {
    merged[key] = Array.isArray(merged[key]) ? merged[key] : [];
  }
  for (const key of ['water', 'badges', 'flags']) {
    merged[key] = isRecord(merged[key]) ? merged[key] : {};
  }
  merged.scanCache = isRecord(merged.scanCache)
    ? Object.fromEntries(Object.entries(merged.scanCache).filter(([, value]) => isRecord(value) && Number.isFinite(value.savedAt)))
    : {};
  merged.profile = isRecord(merged.profile) ? merged.profile : null;
  merged.mealPlan = isRecord(merged.mealPlan) ? merged.mealPlan : null;
  merged.companionLines = isRecord(merged.companionLines) ? merged.companionLines : def.companionLines;
  merged.settings = { ...def.settings, ...(isRecord(merged.settings) ? merged.settings : {}) };
  return merged;
}

function load() {
  try {
    const username = getActiveUsername();
    if (!username) return defaults();
    const raw = localStorage.getItem(getAccountStorageKey(username));
    const loaded = raw ? normalizeState(JSON.parse(raw)) : defaults();
    if (loaded.profile?.selectedCompanion) applyHeroTheme(loaded.profile.selectedCompanion);
    return loaded;
  } catch {
    return defaults();
  }
}

let state = load();
let beforeAccountChange = null;
const LIVE_MAX_AGE_MS = 12 * 3600e3;
const liveKey = () => {
  const username = getActiveUsername();
  return username ? `${getAccountStorageKey(username)}.live` : null;
};

function persist() {
  const username = getActiveUsername();
  if (!username) return true;
  const key = getAccountStorageKey(username);
  try {
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch (e) {
    // Retry a staged copy so a failed save leaves the active state untouched.
    console.warn('Storage full, pruning old thumbnails', e);
    const pruned = { ...state, meals: state.meals.map((meal) => ({ ...meal })) };
    pruned.meals.slice(0, Math.floor(pruned.meals.length / 2)).forEach((m) => delete m.thumb);
    try {
      localStorage.setItem(key, JSON.stringify(pruned));
      state = pruned;
      return true;
    } catch {
      return false;
    }
  }
}

function persistForSwitch() {
  if (!persist()) throw new Error('Could not save current account state.');
}

function emit(type) {
  if (!persist()) return false;
  enqueueStateSync(state);
  scheduleCloudSync(state);
  listeners.forEach((fn) => fn(type, state));
  return true;
}

export const store = {
  get state() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  getStorageKey() {
    const username = getActiveUsername();
    return username ? getAccountStorageKey(username) : null;
  },
  activateAccount(username) {
    beforeAccountChange?.();
    persistForSwitch();
    resumeLocalAccount(username);
    state = load();
    if (state.profile?.selectedCompanion) applyHeroTheme(state.profile.selectedCompanion);
    listeners.forEach((fn) => fn('account', state));
    return state;
  },
  async clearActiveAccount() {
    beforeAccountChange?.();
    persistForSwitch();
    await signOut();
    state = defaults();
    listeners.forEach((fn) => fn('reset', state));
  },

  // Lets the GPS tracker freeze its session before the account key changes, without store importing it.
  onBeforeAccountChange(fn) { beforeAccountChange = fn; },

  // ---------- Live activity session (separate key: written every few seconds, never synced) ----------
  getLiveSession(nowMs = Date.now()) {
    const key = liveKey();
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const snap = JSON.parse(raw);
      if (isRecord(snap) && Number.isFinite(snap.savedAt) && nowMs - snap.savedAt <= LIVE_MAX_AGE_MS) return snap;
    } catch { /* corrupt snapshot: drop it below */ }
    try { localStorage.removeItem(key); } catch { /* noop */ }
    return null;
  },
  saveLiveSession(snapshot) {
    const key = liveKey();
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify({ ...snapshot, savedAt: Date.now() })); } catch { /* storage full: keep running */ }
  },
  clearLiveSession() {
    const key = liveKey();
    if (!key) return;
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },

  // ---------- Verified scanner cache ----------
  getScanCache(identity) {
    const key = String(identity || '').trim();
    const value = key ? state.scanCache?.[key] : null;
    return isRecord(value) ? { ...value } : null;
  },
  saveScanCache(identity, record) {
    const key = String(identity || '').trim();
    if (!key || !isRecord(record)) return null;
    const safe = {};
    for (const field of ['code', 'name', 'brand', 'servingLabel', 'servingSize', 'quantity', 'image', 'per100', 'perServing', 'kcal', 'protein', 'carbs', 'fat', 'items', 'recommendation']) {
      if (record[field] == null || (field === 'image' && String(record[field]).startsWith('data:'))) continue;
      safe[field] = record[field];
    }
    safe.savedAt = Date.now();
    state.scanCache = { ...(state.scanCache || {}), [key]: safe };
    const entries = Object.entries(state.scanCache).sort((a, b) => (a[1].savedAt || 0) - (b[1].savedAt || 0));
    state.scanCache = Object.fromEntries(entries.slice(-50));
    emit('scanCache');
    enqueueMutation('food_scan_cache', 'UPSERT', { identity: key, product: safe, updated_at: new Date().toISOString() });
    return { ...safe };
  },
  clearScanCache(identity) {
    const key = String(identity || '').trim();
    if (!key || !state.scanCache?.[key]) return;
    const next = { ...state.scanCache };
    delete next[key];
    state.scanCache = next;
    emit('scanCache');
    enqueueMutation('food_scan_cache', 'DELETE', { identity: key });
  },

  // ---------- Profile ----------
  get profile() { return state.profile; },
  saveProfile(profile) {
    const first = !state.profile;
    const oldWeight = state.profile?.weight;
    state.profile = {
      selectedCompanion: 'deku',
      ...state.profile,
      ...profile,
      updatedAt: new Date().toISOString()
    };
    applyHeroTheme(state.profile.selectedCompanion);
    state.weights = (state.weights || []).filter((w) => !isNaN(Number(w.weight)));
    if (first || !state.weights.length || (profile?.weight != null && Number(profile.weight) !== Number(oldWeight))) {
      const wVal = Number(state.profile.weight || 70);
      if (!isNaN(wVal)) {
        state.weights.push({ id: uid(), date: todayKey(), weight: wVal, sync_status: 'PENDING' });
      }
    }
    emit('profile');
  },
  get macros() { return state.profile ? calcMacros(state.profile) : null; },
  applyHeroTheme(coach) {
    applyHeroTheme(coach);
  },

  // ---------- Companion Active Voice Line ----------
  getCompanionActiveLine(who) {
    const charKey = (who === 'baku' || who === 'bakugo') ? 'bakugou' : (who || 'deku');
    return state.companionLines?.[charKey] || null;
  },
  setCompanionActiveLine(who, line) {
    const charKey = (who === 'baku' || who === 'bakugo') ? 'bakugou' : (who || 'deku');
    state.companionLines = state.companionLines || {};
    state.companionLines[charKey] = line;
    persist();
  },

  // ---------- Settings ----------
  get settings() {
    return state.settings || { apiKey: '', notifications: false, companions: true, soundEnabled: true, cameraAlwaysOn: true, cameraFacing: 'environment' };
  },
  saveSettings(patch = {}) {
    state.settings = { ...(state.settings || {}), ...patch };
    emit('settings');
    return state.settings;
  },

  // ---------- Makanan ----------
  addMeal(meal) {
    const m = { id: uid(), date: todayKey(), time: new Date().toISOString(), sync_status: 'PENDING', ...meal };
    state.meals.unshift(m);
    this._rearmMilestones(m.date);
    emit('meals');
    return m;
  },
  updateMeal(id, patch) {
    const m = state.meals.find((x) => x.id === id);
    if (m) {
      Object.assign(m, patch, { sync_status: 'PENDING' });
      this._rearmMilestones(m.date);
    }
    emit('meals');
  },
  deleteMeal(id) {
    const m = state.meals.find((x) => x.id === id);
    const date = m?.date || todayKey();
    enqueueMutation('meal_logs', 'DELETE', { client_id: id });
    state.meals = state.meals.filter((x) => x.id !== id);
    this._rearmMilestones(date);
    emit('meals');
  },
  mealsOn(date = todayKey()) { return state.meals.filter((m) => m.date === date); },

  // ---------- Aktiviti ----------
  addActivity(act) {
    const a = { id: uid(), date: todayKey(), sync_status: 'PENDING', ...act };
    state.activities.unshift(a);
    this._rearmMilestones(a.date);
    emit('activities');
    return a;
  },
  deleteActivity(id) {
    const a = state.activities.find((x) => x.id === id);
    const date = a?.date || todayKey();
    enqueueMutation('activity_sessions', 'DELETE', { client_id: id });
    state.activities = state.activities.filter((x) => x.id !== id);
    this._rearmMilestones(date);
    emit('activities');
  },
  activitiesOn(date = todayKey()) { return state.activities.filter((a) => a.date === date); },

  // ---------- Berat badan ----------
  logWeight(weight) {
    const date = todayKey();
    const existing = state.weights.find((w) => w.date === date);
    if (existing) existing.weight = Number(weight);
    else state.weights.push({ id: uid(), date, weight: Number(weight), sync_status: 'PENDING' });
    state.weights.sort((a, b) => a.date.localeCompare(b.date));
    if (state.profile) state.profile.weight = Number(weight);
    emit('weights');
  },

  // ---------- Resipi & pelan ----------
  saveRecipe(r) { state.recipes.unshift({ id: uid(), createdAt: new Date().toISOString(), ...r }); emit('recipes'); },
  deleteRecipe(id) { state.recipes = state.recipes.filter((r) => r.id !== id); emit('recipes'); },
  saveMealPlan(plan) { state.mealPlan = { ...plan, createdAt: new Date().toISOString() }; emit('mealPlan'); },

  // ---------- Lencana & bendera ----------
  hasBadge(id) { return !!state.badges[id]; },
  unlockBadge(id) {
    if (state.badges[id]) return false;
    state.badges[id] = new Date().toISOString();
    emit('badges');
    return true;
  },
  flag(name, date = todayKey()) { return !!state.flags[`${date}:${name}`]; },
  setFlag(name, date = todayKey()) {
    state.flags[`${date}:${name}`] = true;
    // buang bendera lebih 14 hari
    const cutoff = todayKey(new Date(Date.now() - 14 * 864e5));
    Object.keys(state.flags).forEach((k) => { if (k.slice(0, 10) < cutoff) delete state.flags[k]; });
    emit('flags');
  },
  clearFlag(name, date = todayKey(), notify = false) {
    const key = `${date}:${name}`;
    if (state.flags && state.flags[key]) {
      delete state.flags[key];
      persist();
      if (notify) emit('flags');
    }
  },

  // Re-arm milestone celebration flags if numbers drop below required targets
  _rearmMilestones(date = todayKey()) {
    try {
      const meals = this.mealsOn(date);
      const acts = this.activitiesOn(date);
      const sum = (arr, k) => arr.reduce((s, x) => s + (Number(x[k]) || 0), 0);
      const macros = this.macros || { target: 2000, protein: 120, carbs: 220, fat: 65 };
      const kin = Math.round(sum(meals, 'kcal'));
      const kout = Math.round(sum(acts, 'kcal'));
      const protein = sum(meals, 'protein');
      const effectiveTarget = macros.target + kout;

      // If calorie intake exits target range (95%-105%) or fewer than 2 meals, re-arm celebrate:calories
      if (effectiveTarget >= 800 && (kin < effectiveTarget * 0.95 || kin > effectiveTarget * 1.05 || meals.length < 2)) {
        if (state.flags[`${date}:celebrate:calories`]) delete state.flags[`${date}:celebrate:calories`];
      }

      // If protein drops below daily target, re-arm celebrate:macros
      if (macros.protein > 20 && protein < macros.protein) {
        if (state.flags[`${date}:celebrate:macros`]) delete state.flags[`${date}:celebrate:macros`];
      }
    } catch { /* noop */ }
  },

  // ---------- Water Tracker ----------
  getWater(date = todayKey()) {
    return (state.water && state.water[date]) || 0;
  },
  addWater(amount = 250, date = todayKey()) {
    state.water = state.water || {};
    const newAmt = Math.max(0, (state.water[date] || 0) + amount);
    state.water[date] = newAmt;
    const target = this.getWaterTarget();
    // If water was reduced below target, re-arm celebrate:water flag immediately
    if (newAmt < target) {
      delete state.flags[`${date}:celebrate:water`];
    }
    emit('water');
    return state.water[date];
  },
  setWater(amount, date = todayKey()) {
    state.water = state.water || {};
    const newAmt = Math.max(0, Number(amount) || 0);
    state.water[date] = newAmt;
    const target = this.getWaterTarget();
    if (newAmt < target) {
      delete state.flags[`${date}:celebrate:water`];
    }
    emit('water');
    return state.water[date];
  },
  getWaterTarget() {
    return Number(state.profile?.waterTarget) || 2000;
  },
  setWaterTarget(target) {
    const newTarget = Math.max(500, Number(target) || 2000);
    const curWater = this.getWater();
    if (curWater < newTarget) {
      delete state.flags[`${todayKey()}:celebrate:water`];
    }
    this.saveProfile({ waterTarget: newTarget });
  },
  copyYesterdayMeals() {
    const yest = new Date(Date.now() - 864e5);
    const yestKey = todayKey(yest);
    const yesterdayMeals = this.mealsOn(yestKey);
    if (!yesterdayMeals.length) return 0;
    yesterdayMeals.forEach((m) => {
      this.addMeal({
        name: m.name,
        kcal: m.kcal,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        weight_g: m.weight_g,
        mealType: m.mealType,
        thumb: m.thumb,
      });
    });
    return yesterdayMeals.length;
  },
  weeklySummary() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5);
      const k = todayKey(d);
      const meals = this.mealsOn(k);
      const acts = this.activitiesOn(k);
      const sum = (arr, key) => arr.reduce((acc, x) => acc + (Number(x[key]) || 0), 0);
      const target = this.macros?.target || 2000;
      const kin = Math.round(sum(meals, 'kcal'));
      const kout = Math.round(sum(acts, 'kcal'));
      days.push({ date: k, kin, kout, target, net: kin - kout, balance: target - kin + kout });
    }
    const totalTarget = days.reduce((acc, d) => acc + d.target, 0);
    const totalIn = days.reduce((acc, d) => acc + d.kin, 0);
    const totalOut = days.reduce((acc, d) => acc + d.kout, 0);
    const bankRemaining = totalTarget - totalIn + totalOut;
    return { days, totalTarget, totalIn, totalOut, bankRemaining };
  },

  // ---------- Hero Rank & Gamification ----------
  getHeroRank() {
    const mealCount = state.meals.length;
    const totalKm = state.activities.reduce((sum, a) => sum + (Number(a.distanceKm) || 0), 0);
    const badgeCount = Object.keys(state.badges || {}).length;

    // Calculate EXP: 15 per meal, 40 per km, 100 per badge
    const exp = (mealCount * 15) + Math.round(totalKm * 40) + (badgeCount * 100);

    const RANKS = [
      { level: 1, title: 'General Studies Trainee', minExp: 0, maxExp: 250 },
      { level: 2, title: 'Class 1-A Trainee', minExp: 250, maxExp: 750 },
      { level: 3, title: 'Provisional Hero', minExp: 750, maxExp: 1800 },
      { level: 4, title: 'Top 10 Pro Hero', minExp: 1800, maxExp: 3500 },
      { level: 5, title: 'Symbol of Peace', minExp: 3500, maxExp: 10000 },
    ];

    let current = RANKS[0];
    for (const r of RANKS) {
      if (exp >= r.minExp) current = r;
    }

    const range = Math.max(1, current.maxExp - current.minExp);
    const currentProgress = Math.min(range, Math.max(0, exp - current.minExp));
    const percent = Math.min(100, Math.round((currentProgress / range) * 100));

    return {
      level: current.level,
      title: current.title,
      exp,
      currentExp: exp,
      nextExp: current.maxExp,
      nextLevelExp: current.maxExp,
      pct: percent,
      percent,
    };
  },

  // ---------- Daily Summary ----------
  summary(date = todayKey()) {
    const meals = this.mealsOn(date);
    const acts = this.activitiesOn(date);
    const sum = (arr, k) => arr.reduce((s, x) => s + (Number(x[k]) || 0), 0);
    const macros = this.macros || { target: 2000, protein: 120, carbs: 220, fat: 65 };
    const kin = Math.round(sum(meals, 'kcal'));
    const kout = Math.round(sum(acts, 'kcal'));
    const water = this.getWater(date);
    return {
      target: macros.target,
      macros,
      kin,
      kout,
      remaining: macros.target - kin + kout,
      protein: sum(meals, 'protein'),
      carbs: sum(meals, 'carbs'),
      fat: sum(meals, 'fat'),
      water,
      meals,
      acts,
      distance: sum(acts, 'distanceKm'),
    };
  },

  pendingCount() {
    return [...state.meals, ...state.activities, ...state.weights].filter((x) => x.sync_status === 'PENDING').length;
  },

  exportJSON() { return JSON.stringify(state, null, 2); },
  reset() { state = defaults(); emit('reset'); },
};

