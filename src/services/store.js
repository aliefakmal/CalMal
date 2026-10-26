import { todayKey, uid } from '../utils/helpers.js';
import { calcMacros } from '../utils/calc.js';
import { scheduleCloudSync } from './supabaseClient.js';

const KEY = 'calmal.v1';
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
  settings: { apiKey: '', notifications: false, companions: true, soundEnabled: true, cameraAlwaysOn: true, cameraFacing: 'environment' },
});

let state = load();

function applyHeroTheme(coach) {
  if (typeof document === 'undefined') return;
  const isBaku = coach === 'bakugou';
  document.documentElement.style.setProperty('--hero-accent', isBaku ? '#f97316' : '#10b981');
  document.documentElement.style.setProperty('--hero-glow', isBaku ? 'rgba(249, 115, 22, 0.28)' : 'rgba(16, 185, 129, 0.28)');
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = { ...defaults(), ...JSON.parse(raw) };
    if (parsed.profile?.selectedCompanion) {
      applyHeroTheme(parsed.profile.selectedCompanion);
    }
    return parsed;
  } catch {
    return defaults();
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // Storage full — prune oldest image thumbnails
    console.warn('Storage full, pruning old thumbnails', e);
    state.meals.slice(0, Math.floor(state.meals.length / 2)).forEach((m) => delete m.thumb);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* noop */ }
  }
}

function emit(type) {
  persist();
  scheduleCloudSync(state);
  listeners.forEach((fn) => fn(type, state));
}

export const store = {
  get state() { return state; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

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
    if (first || !state.weights.length || (oldWeight && Number(profile.weight) !== Number(oldWeight))) {
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

  // ---------- Water Tracker ----------
  getWater(date = todayKey()) {
    return (state.water && state.water[date]) || 0;
  },
  addWater(amount = 250, date = todayKey()) {
    state.water = state.water || {};
    state.water[date] = Math.max(0, (state.water[date] || 0) + amount);
    emit('water');
    return state.water[date];
  },
  setWater(amount, date = todayKey()) {
    state.water = state.water || {};
    state.water[date] = Math.max(0, Number(amount) || 0);
    emit('water');
    return state.water[date];
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
      nextExp: current.maxExp,
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
