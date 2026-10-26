// Storan Offline-First (pelan §3.6) — semua data disimpan lokal dahulu dengan sync_status.
import { todayKey, uid } from '../utils/helpers.js';
import { calcMacros } from '../utils/calc.js';

const KEY = 'calmal.v1';
const listeners = new Set();

const defaults = () => ({
  profile: null,
  meals: [],
  activities: [],
  weights: [],
  recipes: [],
  mealPlan: null,
  badges: {},
  flags: {},
  settings: { apiKey: '', notifications: false, companions: true, cameraAlwaysOn: true, cameraFacing: 'environment' },
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    return defaults();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Storan penuh — buang lakaran kecil makanan lama dahulu
    console.warn('Storan penuh, membuang lakaran lama', e);
    state.meals.slice(0, Math.floor(state.meals.length / 2)).forEach((m) => delete m.thumb);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* noop */ }
  }
}

function emit(type) {
  persist();
  listeners.forEach((fn) => fn(type, state));
}

export const store = {
  get state() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  // ---------- Profil ----------
  get profile() { return state.profile; },
  saveProfile(profile) {
    const first = !state.profile;
    state.profile = { ...state.profile, ...profile, updatedAt: new Date().toISOString() };
    if (first || !state.weights.length) {
      state.weights.push({ id: uid(), date: todayKey(), weight: Number(profile.weight), sync_status: 'PENDING' });
    }
    emit('profile');
  },
  get macros() { return state.profile ? calcMacros(state.profile) : null; },

  // ---------- Makanan ----------
  addMeal(meal) {
    const m = { id: uid(), date: todayKey(), time: new Date().toISOString(), sync_status: 'PENDING', ...meal };
    state.meals.unshift(m);
    emit('meals');
    return m;
  },
  updateMeal(id, patch) {
    const m = state.meals.find((x) => x.id === id);
    if (m) Object.assign(m, patch, { sync_status: 'PENDING' });
    emit('meals');
  },
  deleteMeal(id) {
    state.meals = state.meals.filter((m) => m.id !== id);
    emit('meals');
  },
  mealsOn(date = todayKey()) { return state.meals.filter((m) => m.date === date); },

  // ---------- Aktiviti ----------
  addActivity(act) {
    const a = { id: uid(), date: todayKey(), sync_status: 'PENDING', ...act };
    state.activities.unshift(a);
    emit('activities');
    return a;
  },
  deleteActivity(id) {
    state.activities = state.activities.filter((a) => a.id !== id);
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

  // ---------- Tetapan ----------
  get settings() { return state.settings; },
  saveSettings(patch) { state.settings = { ...state.settings, ...patch }; emit('settings'); },

  // ---------- Ringkasan harian ----------
  summary(date = todayKey()) {
    const meals = this.mealsOn(date);
    const acts = this.activitiesOn(date);
    const sum = (arr, k) => arr.reduce((s, x) => s + (Number(x[k]) || 0), 0);
    const macros = this.macros || { target: 2000, protein: 120, carbs: 220, fat: 65 };
    const kin = Math.round(sum(meals, 'kcal'));
    const kout = Math.round(sum(acts, 'kcal'));
    return {
      target: macros.target,
      macros,
      kin,
      kout,
      remaining: macros.target - kin + kout,
      protein: sum(meals, 'protein'),
      carbs: sum(meals, 'carbs'),
      fat: sum(meals, 'fat'),
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
