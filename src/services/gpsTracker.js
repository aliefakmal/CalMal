// Penjejak GPS ala Strava (pelan §3.4) — Lokasi Langsung, Pengesanan Ketepatan, Jarak, Masa, Pace & Laluan Polyline
import { haversineKm, metForSpeed, kcalBurned, strideMeters, paceMinPerKm } from '../utils/calc.js';
import { store } from './store.js';

const listeners = new Set();
let runWatchId = null;
let idleWatchId = null;
let timer = null;
let wakeLock = null;
let simTimer = null;

// Keadaan Lokasi Langsung (sentiasa diperbaharui walaupun belum mula lari)
let liveLocation = null; // { lat, lng, accuracy, alt, speed, timestamp }
let permissionStatus = 'unknown'; // 'unknown' | 'prompt' | 'granted' | 'denied' | 'unavailable'

const freshSession = () => ({
  status: 'idle', // idle | running | paused
  points: [],
  segments: [[]], // pecahan laluan
  startedAt: null,
  elapsedSec: 0,
  distanceKm: 0,
  elevGain: 0,
  kcal: 0,
  speedKmh: 0,
  lastAlt: null,
  lastTick: null,
  accuracy: null,
  error: null,
  simulated: false,
});

let session = freshSession();

function emit() {
  const stats = getStats();
  listeners.forEach((fn) => {
    try { fn(stats); } catch (e) { console.error('GPS subscriber error:', e); }
  });
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(getStats());
  return () => listeners.delete(fn);
}

export function getStats() {
  const profile = store.profile || { height: 170, weight: 70 };
  const currentPace = session.speedKmh > 1.2 ? 60 / session.speedKmh : paceMinPerKm(session.elapsedSec, session.distanceKm);
  const avgPace = paceMinPerKm(session.elapsedSec, session.distanceKm);

  return {
    ...session,
    pace: currentPace,
    avgPace,
    steps: Math.round((session.distanceKm * 1000) / strideMeters(profile.height || 170)),
    liveLocation,
    permissionStatus,
  };
}

// ----------------- Pengesanan Lokasi Langsung & Kebenaran -----------------
export async function checkPermissionStatus() {
  if (!('geolocation' in navigator)) {
    permissionStatus = 'unavailable';
    emit();
    return permissionStatus;
  }
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const p = await navigator.permissions.query({ name: 'geolocation' });
      permissionStatus = p.state; // 'granted' | 'prompt' | 'denied'
      p.onchange = () => {
        permissionStatus = p.state;
        if (p.state === 'granted') detectLiveLocation();
        emit();
      };
    } catch {
      // Sesetengah pelayar tidak menyokong query geolocation
    }
  }
  emit();
  return permissionStatus;
}

/** Meminta kebenaran lokasi daripada pelayar dan mengesan koordinat semasa pengguna */
export function detectLiveLocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      permissionStatus = 'unavailable';
      session.error = 'Pelayar ini tidak menyokong GPS Geolocation.';
      emit();
      reject(new Error(session.error));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        permissionStatus = 'granted';
        const { latitude: lat, longitude: lng, accuracy, altitude: alt, speed } = pos.coords;
        liveLocation = {
          lat,
          lng,
          accuracy: Math.round(accuracy || 0),
          alt: alt != null ? Math.round(alt) : null,
          speed: speed != null ? +(speed * 3.6).toFixed(1) : 0,
          timestamp: pos.timestamp || Date.now(),
        };
        session.error = null;
        emit();
        resolve(liveLocation);
      },
      (err) => {
        if (err.code === 1) {
          permissionStatus = 'denied';
          session.error = 'Akses lokasi ditolak. Sila benarkan kebenaran lokasi dalam pelayar telefon anda.';
        } else if (err.code === 2) {
          session.error = 'Isyarat GPS tidak ditemui. Pastikan GPS peranti dihidupkan.';
        } else {
          session.error = 'Masa pengesanan lokasi tamat. Cuba semula di kawasan terbuka.';
        }
        emit();
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
      }
    );
  });
}

/** Memulakan pemantauan lokasi langsung secara santai (idle) semasa skrin dibuka */
export function startIdleLocationWatch() {
  if (idleWatchId != null || session.status === 'running') return;
  if (!('geolocation' in navigator)) return;

  checkPermissionStatus();

  idleWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      permissionStatus = 'granted';
      const { latitude: lat, longitude: lng, accuracy, altitude: alt, speed } = pos.coords;
      liveLocation = {
        lat,
        lng,
        accuracy: Math.round(accuracy || 0),
        alt: alt != null ? Math.round(alt) : null,
        speed: speed != null ? +(speed * 3.6).toFixed(1) : 0,
        timestamp: pos.timestamp || Date.now(),
      };
      emit();
    },
    () => {
      // abaikan ralat latar belakang semasa idle
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 20000,
    }
  );
}

export function stopIdleLocationWatch() {
  if (idleWatchId != null) {
    navigator.geolocation.clearWatch(idleWatchId);
    idleWatchId = null;
  }
}

// ----------------- Kawalan WakeLock Skrin -----------------
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch { /* noop */ }
}
function releaseWakeLock() {
  try { wakeLock?.release(); } catch { /* noop */ }
  wakeLock = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && session.status === 'running') requestWakeLock();
});

// ----------------- Kitaran Sesi Larian (Strava Recording) -----------------
function tick() {
  if (session.status !== 'running') return;
  const now = Date.now();
  const dt = (now - session.lastTick) / 1000;
  session.lastTick = now;
  session.elapsedSec += dt;

  // Formula MET dinamik berdasarkan kelajuan dan berat badan pengguna
  const weight = Number(store.profile?.weight || 70);
  session.kcal += kcalBurned(metForSpeed(session.speedKmh), weight, dt / 60);
  emit();
}

function onRunPosition(pos) {
  if (session.status !== 'running') return;
  const { latitude: lat, longitude: lng, altitude: alt, accuracy, speed } = pos.coords;

  session.accuracy = Math.round(accuracy || 0);
  session.error = null;

  liveLocation = {
    lat,
    lng,
    accuracy: session.accuracy,
    alt: alt != null ? Math.round(alt) : null,
    speed: speed != null ? +(speed * 3.6).toFixed(1) : 0,
    timestamp: pos.timestamp || Date.now(),
  };

  const firstPoint = !session.points.length;
  // Tapis bacaan GPS yang terlalu lemah
  if (accuracy > (firstPoint ? 75 : 45)) {
    emit();
    return;
  }

  const pt = { lat, lng, alt: alt ?? null, t: pos.timestamp || Date.now() };
  const seg = session.segments[session.segments.length - 1];
  const prev = seg[seg.length - 1];

  if (prev) {
    const d = haversineKm(prev, pt);
    const dt = Math.max(0.5, (pt.t - prev.t) / 1000);

    // Tapis jitter (bergerak kurang daripada 2 meter)
    if (d * 1000 < Math.max(2.2, accuracy * 0.22)) {
      session.speedKmh = speed != null && speed >= 0 ? speed * 3.6 : session.speedKmh * 0.75;
      emit();
      return;
    }

    const rawKmh = speed != null && speed >= 0 ? speed * 3.6 : (d / dt) * 3600;
    // Tapis lonjakan teleport tidak munasabah (> 45 km/j untuk larian manusia)
    if (rawKmh > 45) {
      emit();
      return;
    }

    // Melicinkan bacaan kelajuan dengan exponential moving average
    session.speedKmh = session.speedKmh ? session.speedKmh * 0.6 + rawKmh * 0.4 : rawKmh;
    session.distanceKm += d;
  }

  if (alt != null) {
    if (session.lastAlt != null) {
      const dAlt = alt - session.lastAlt;
      if (dAlt > 1.2) session.elevGain += dAlt;
      if (Math.abs(dAlt) > 1.2) session.lastAlt = alt;
    } else {
      session.lastAlt = alt;
    }
  }

  seg.push(pt);
  session.points.push(pt);
  emit();
}

function onRunError(err) {
  session.error = err.code === 1
    ? 'Akses lokasi ditolak. Sila benarkan akses GPS dalam tetapan pelayar.'
    : 'Isyarat GPS terputus. Pastikan anda berada di luar bangunan.';
  emit();
}

function startRunWatch() {
  if (session.simulated) return startRunSim();
  if (!('geolocation' in navigator)) {
    session.error = 'Pelayar ini tidak menyokong penjejakan GPS.';
    emit();
    return;
  }
  runWatchId = navigator.geolocation.watchPosition(onRunPosition, onRunError, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000,
  });
}

function stopRunWatch() {
  if (runWatchId != null) {
    navigator.geolocation.clearWatch(runWatchId);
    runWatchId = null;
  }
  clearInterval(simTimer);
  simTimer = null;
}

/** Simulasi larian interaktif di sekeliling kedudukan semasa atau KLCC */
function startRunSim() {
  const center = liveLocation
    ? { lat: liveLocation.lat, lng: liveLocation.lng }
    : { lat: 3.1579, lng: 101.7116 }; // KLCC Park laluan joging

  let angle = session.points.length ? session._simAngle || 0 : 0;
  simTimer = setInterval(() => {
    angle += 0.0055;
    session._simAngle = angle;
    const r = 0.0042 + Math.sin(angle * 3) * 0.0007;
    onRunPosition({
      coords: {
        latitude: center.lat + Math.sin(angle) * r,
        longitude: center.lng + Math.cos(angle) * r * 1.15,
        altitude: 40 + Math.sin(angle * 2) * 5,
        accuracy: 5,
        speed: 2.8 + Math.sin(angle * 4) * 0.35, // ~10 km/j
      },
      timestamp: Date.now(),
    });
  }, 1000);
}

// ----------------- API Luaran Sesi Larian -----------------
export function start({ simulate = false } = {}) {
  if (session.status !== 'idle') return;
  stopIdleLocationWatch();

  session = freshSession();
  session.simulated = simulate;
  session.status = 'running';
  session.startedAt = new Date().toISOString();
  session.lastTick = Date.now();

  startRunWatch();
  timer = setInterval(tick, 1000);
  requestWakeLock();
  emit();
}

export function pause() {
  if (session.status !== 'running') return;
  tick();
  session.status = 'paused';
  session.speedKmh = 0;
  stopRunWatch();
  clearInterval(timer);
  releaseWakeLock();
  emit();
}

export function resume() {
  if (session.status !== 'paused') return;
  session.status = 'running';
  session.lastTick = Date.now();
  session.segments.push([]);
  startRunWatch();
  timer = setInterval(tick, 1000);
  requestWakeLock();
  emit();
}

/** Tamatkan sesi larian, format data dan pulangkan untuk simpanan kekal */
export function finish() {
  if (session.status === 'running') tick();
  stopRunWatch();
  clearInterval(timer);
  releaseWakeLock();

  const stats = getStats();
  const maxPts = 600;
  const step = Math.max(1, Math.ceil(stats.points.length / maxPts));

  const result = {
    type: 'Larian/Jalan',
    startedAt: session.startedAt || new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationSec: Math.round(stats.elapsedSec),
    distanceKm: Math.round(stats.distanceKm * 1000) / 1000,
    pace: stats.avgPace,
    avgKmh: stats.elapsedSec ? (stats.distanceKm / (stats.elapsedSec / 3600)) : 0,
    elevGain: Math.round(stats.elevGain),
    steps: stats.steps,
    kcal: Math.round(stats.kcal),
    segments: session.segments
      .filter((seg) => seg.length)
      .map((seg) => seg.filter((_, i) => i % step === 0 || i === seg.length - 1).map((p) => [+p.lat.toFixed(6), +p.lng.toFixed(6)])),
    simulated: session.simulated,
  };

  session = freshSession();
  emit();

  // Sambung pantau idle lokasi pengguna semula
  startIdleLocationWatch();
  return result;
}

export function discard() {
  stopRunWatch();
  clearInterval(timer);
  releaseWakeLock();
  session = freshSession();
  emit();
  startIdleLocationWatch();
}

export const isActive = () => session.status !== 'idle';
export const getLiveLocation = () => liveLocation;
