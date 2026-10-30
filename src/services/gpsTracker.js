// Penjejak GPS ala Strava (pelan §3.4) — Lokasi Langsung, Pengesanan Ketepatan, Jarak, Masa, Pace & Laluan Polyline
import { haversineKm, metForSpeed, kcalBurned, paceMinPerKm, fuseSteps, gapSteps, settleGap, autoPaused, cadenceSpeedKmh } from '../utils/calc.js';
import { startPedometer, stopPedometer, lastMotionEventAt } from './pedometer.js';
import { store } from './store.js';

const listeners = new Set();
let runWatchId = null;
let idleWatchId = null;
let timer = null;
let simTimer = null;
let wakeLock = null;
let tickCount = 0;

const VEHICLE_KMH = 25; // faster than any walk/run pace we track: treat as a ride, not exercise
const GAP_SEC = 30; // fixes further apart than this mean the page was frozen (locked phone)

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
  motion: 'unsupported', // result of requestMotionPermission()
  sensorOk: false, // true once the accelerometer delivered events this session
  sensorSteps: 0,
  stepTimes: [], // last 30 step timestamps, for cadence
  lastStepAt: null,
  activeSince: null, // start/resume time; stillness is measured from here until the first step
  autoPaused: false,
  hiddenAt: null,
  hiddenKm: null,
  strideFromKm: null, // sensor was lost at this distance: steps after it come from stride
  restored: false,
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
  const fused = fuseSteps({ sensorOk: session.sensorOk, sensorSteps: session.sensorSteps, distanceKm: session.distanceKm, heightCm: profile.height || 170 });
  if (fused.source === 'sensor' && session.strideFromKm != null) fused.steps += gapSteps(session.distanceKm - session.strideFromKm, profile.height || 170);

  return {
    ...session,
    pace: currentPace,
    avgPace,
    steps: fused.steps,
    stepSource: fused.source,
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
          session.error = 'Location access denied. Please grant location permissions in your browser settings.';
        } else if (err.code === 2) {
          session.error = 'GPS signal not found. Please ensure device GPS is turned on.';
        } else {
          session.error = 'Location detection timed out. Please try again in an open outdoor area.';
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

// ----------------- Persistence & background resilience -----------------
function snapshot() {
  // points duplicate segments; segments stored as [lat, lng, alt, t] tuples to keep each write small
  const { points, ...rest } = session;
  return { ...rest, segments: session.segments.map((seg) => seg.map((p) => [+p.lat.toFixed(6), +p.lng.toFixed(6), p.alt, p.t])) };
}

function saveSnapshot() {
  if (session.status !== 'idle') store.saveLiveSession(snapshot());
}

function onHidden() {
  if (session.status !== 'running' || session.hiddenAt != null) return;
  tick();
  session.hiddenAt = Date.now();
  session.hiddenKm = session.distanceKm;
  saveSnapshot();
}

function onVisible() {
  if (session.status !== 'running' || session.hiddenAt == null) return;
  const now = Date.now();
  // Fixes that arrived while hidden were already added to distance; credit their time too.
  // A frozen page delivers none: the first fix after unlock settles that gap in onRunPosition.
  const gapKm = Math.max(0, session.distanceKm - session.hiddenKm);
  if (gapKm > 0) creditGap((now - session.hiddenAt) / 1000, gapKm);
  session.hiddenAt = null;
  session.hiddenKm = null;
  session.lastTick = now;
  session.activeSince = now;
  requestWakeLock();
  saveSnapshot();
  emit();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHidden();
    else onVisible();
  });
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', saveSnapshot);

/** Time, kcal and (if the sensor was counting) steps for distance covered while we got no ticks. */
function creditGap(gapSec, gapKm) {
  const settled = settleGap({ gapSec, gapKm, weightKg: Number(store.profile?.weight || 70) });
  session.elapsedSec += settled.movingSec;
  session.kcal += settled.kcal;
  // motion events stop while hidden; credit the distance walked meanwhile
  if (session.sensorOk && session.strideFromKm == null && settled.movingSec) session.sensorSteps += gapSteps(gapKm, store.profile?.height || 170);
}

function onStep(n, t) {
  if (session.status !== 'running') return;
  session.sensorOk = true;
  session.sensorSteps += n;
  session.lastStepAt = t;
  session.stepTimes = [...session.stepTimes, t].slice(-30);
}

function startMotion() {
  if (session.motion === 'granted' && !session.simulated) startPedometer(onStep);
}

// ----------------- Kitaran Sesi Larian (Strava Recording) -----------------
function tick() {
  if (session.status !== 'running' || session.hiddenAt != null) return;
  const now = Date.now();
  const dt = (now - session.lastTick) / 1000;
  session.lastTick = now;
  if (!session.sensorOk && session.motion === 'granted' && lastMotionEventAt() != null) session.sensorOk = true;

  session.autoPaused = autoPaused(session.autoPaused, {
    speedKmh: session.speedKmh,
    msSinceLastStep: now - (session.lastStepAt ?? session.activeSince ?? now),
  });

  if (!session.autoPaused) {
    session.elapsedSec += dt;
    // Formula MET dinamik berdasarkan kelajuan dan berat badan pengguna; treadmill uses cadence
    const profile = store.profile || {};
    const speed = session.speedKmh >= 1 ? session.speedKmh : cadenceSpeedKmh(session.stepTimes, now, profile.height || 170);
    session.kcal += kcalBurned(metForSpeed(speed), Number(profile.weight || 70), dt / 60);
  }
  if (++tickCount % 5 === 0) saveSnapshot();
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

    if (dt > GAP_SEC) {
      // Page was frozen (locked phone). Average speed over the gap decides walk vs ride.
      if ((d / dt) * 3600 > VEHICLE_KMH) {
        session.segments.push([pt]);
        session.points.push(pt);
        emit();
        return;
      }
      session.distanceKm += d;
      creditGap(dt, d);
      // this gap is settled; onVisible must only credit what comes after it
      if (session.hiddenAt != null) { session.hiddenAt = Date.now(); session.hiddenKm = session.distanceKm; }
      session.lastTick = Date.now();
      session.activeSince = session.lastTick;
      seg.push(pt);
      session.points.push(pt);
      emit();
      return;
    }

    // Tapis jitter (bergerak kurang daripada 2 meter)
    if (d * 1000 < Math.max(2.2, accuracy * 0.22)) {
      session.speedKmh = speed != null && speed >= 0 ? speed * 3.6 : session.speedKmh * 0.75;
      emit();
      return;
    }

    const rawKmh = speed != null && speed >= 0 ? speed * 3.6 : (d / dt) * 3600;
    // In a vehicle (or a GPS teleport): start a new segment, count no distance
    if (rawKmh > VEHICLE_KMH || (d / dt) * 3600 > 45) {
      session.speedKmh = 0;
      session.segments.push([pt]);
      session.points.push(pt);
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
    ? 'Location access denied. Please allow GPS access in browser settings.'
    : 'GPS signal lost. Please ensure you are outdoors with a clear view of the sky.';
  emit();
}

function startRunWatch() {
  if (session.simulated) return startRunSim();
  if (!('geolocation' in navigator)) {
    session.error = 'This browser does not support GPS tracking.';
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
export function start({ simulate = false, motion = 'unsupported' } = {}) {
  if (session.status !== 'idle') return;
  stopIdleLocationWatch();

  session = freshSession();
  session.simulated = simulate;
  session.motion = motion;
  session.status = 'running';
  session.startedAt = new Date().toISOString();
  session.lastTick = Date.now();
  session.activeSince = session.lastTick;

  startRunWatch();
  startMotion();
  saveSnapshot();
  timer = setInterval(tick, 1000);
  requestWakeLock();
  emit();
}

export function pause() {
  if (session.status !== 'running') return;
  tick();
  session.status = 'paused';
  session.speedKmh = 0;
  session.autoPaused = false;
  stopRunWatch();
  stopPedometer();
  clearInterval(timer);
  releaseWakeLock();
  saveSnapshot();
  emit();
}

/** motion: pass a fresh requestMotionPermission() result after a reload (iOS forgets the grant). */
export function resume({ motion } = {}) {
  if (session.status !== 'paused') return;
  if (motion) session.motion = motion;
  // Sensor counted before but can't now: continue the count from distance
  if (session.sensorOk && session.motion !== 'granted' && session.strideFromKm == null) session.strideFromKm = session.distanceKm;
  session.status = 'running';
  session.restored = false;
  session.lastTick = Date.now();
  session.activeSince = session.lastTick;
  session.segments.push([]);
  startRunWatch();
  startMotion();
  timer = setInterval(tick, 1000);
  requestWakeLock();
  emit();
}

/** Tamatkan sesi larian, format data dan pulangkan untuk simpanan kekal */
export function finish() {
  if (session.status === 'running') tick();
  stopRunWatch();
  stopPedometer();
  clearInterval(timer);
  releaseWakeLock();
  store.clearLiveSession();

  const stats = getStats();
  const maxPts = 600;
  const step = Math.max(1, Math.ceil(stats.points.length / maxPts));

  const avgKmh = stats.elapsedSec ? (stats.distanceKm / (stats.elapsedSec / 3600)) : 0;
  const result = {
    type: 'Outdoor Run / Walk',
    activityType: avgKmh >= 7.5 ? 'run' : 'walk',
    stepSource: stats.stepSource,
    movingSec: Math.round(stats.elapsedSec),
    startedAt: session.startedAt || new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationSec: Math.round(stats.elapsedSec),
    distanceKm: Math.round(stats.distanceKm * 1000) / 1000,
    pace: stats.avgPace,
    avgKmh,
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
  stopPedometer();
  clearInterval(timer);
  releaseWakeLock();
  store.clearLiveSession();
  session = freshSession();
  emit();
  startIdleLocationWatch();
}

export const isActive = () => session.status !== 'idle';
export const getLiveLocation = () => liveLocation;


const NUM_FIELDS = ['elapsedSec', 'distanceKm', 'elevGain', 'kcal', 'sensorSteps'];

function validSnapshot(snap) {
  return (snap.status === 'running' || snap.status === 'paused')
    && NUM_FIELDS.every((k) => snap[k] === undefined || Number.isFinite(snap[k]))
    && (snap.stepTimes === undefined || (Array.isArray(snap.stepTimes) && snap.stepTimes.every(Number.isFinite)))
    && (snap.strideFromKm == null || Number.isFinite(snap.strideFromKm));
}

/** [[lat, lng, alt, t], ...] per segment back to point objects; null if any point is malformed. */
function parseSegments(raw) {
  if (raw === undefined) return [[]];
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const seg of raw) {
    if (!Array.isArray(seg)) return null;
    const pts = [];
    for (const p of seg) {
      if (!Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
      pts.push({ lat: p[0], lng: p[1], alt: Number.isFinite(p[2]) ? p[2] : null, t: Number.isFinite(p[3]) ? p[3] : 0 });
    }
    out.push(pts);
  }
  return out.length ? out : [[]];
}

/** Bring back a session saved before a reload/kill. Always paused: we can't know what happened meanwhile. */
export function restoreLiveSession() {
  if (session.status !== 'idle') return false;
  const snap = store.getLiveSession();
  if (!snap) return false;
  const segments = parseSegments(snap.segments);
  if (!segments || !validSnapshot(snap)) {
    store.clearLiveSession();
    return false;
  }
  const { savedAt, ...rest } = snap;
  session = {
    ...freshSession(),
    ...rest,
    segments,
    points: segments.flat(),
    status: 'paused',
    speedKmh: 0,
    autoPaused: false,
    hiddenAt: null,
    hiddenKm: null,
    restored: true,
  };
  stopIdleLocationWatch();
  emit();
  return true;
}

/** Called by the store before the active account changes: park this session under the current account. */
export function freezeForAccountChange() {
  if (session.status === 'idle') return;
  if (session.status === 'running') tick();
  stopRunWatch();
  stopPedometer();
  clearInterval(timer);
  releaseWakeLock();
  store.saveLiveSession({ ...snapshot(), status: 'paused', speedKmh: 0, autoPaused: false, hiddenAt: null, hiddenKm: null });
  session = freshSession();
  emit();
}

store.onBeforeAccountChange(freezeForAccountChange);
store.subscribe((type) => { if (type === 'account') restoreLiveSession(); });
restoreLiveSession();
