// Accelerometer pedometer: low-pass filtered magnitude + peak detection.
// Only counts during a recording session; browsers stop motion events when the page is hidden.

const THRESHOLD = 1.0; // m/s² above the gravity baseline
const MIN_STEP_MS = 280; // ~214 steps/min, above any real running cadence
const GAP_RESET_MS = 2000; // a pause this long ends a walking bout
const CONFIRM_STEPS = 4; // regular steps needed before a bout counts (rejects one-off shakes)
const MAX_PEAK = 8.5; // m/s²: harder than a running footstrike = shaking / impact, not a step
const MAX_STEP_MS = 1000; // a bout must start at 60+ steps/min; slower peaks are bumps, not walking
const MAX_JITTER = 0.25; // confirming intervals may differ from their mean by at most 25%

/** Pure detector. push() returns how many steps this sample credits. */
export function createStepDetector() {
  let gravity = null;
  let smooth = 0;
  let prev = 0;
  let prevPrev = 0;
  let prevT = 0;
  let lastPeakT = -Infinity;
  let pending = 0;
  let intervals = [];
  let confirmed = false;

  return {
    push(ax, ay, az, tMs) {
      const mag = Math.hypot(ax, ay, az);
      gravity = gravity == null ? mag : gravity * 0.97 + mag * 0.03;
      smooth = smooth * 0.7 + (mag - gravity) * 0.3;

      const reset = () => { pending = 0; intervals = []; confirmed = false; };
      if (tMs - lastPeakT > GAP_RESET_MS) reset();

      let credited = 0;
      const isPeak = prev > prevPrev && prev >= smooth && prev > THRESHOLD;
      if (isPeak && prev > MAX_PEAK) {
        // violent shake: drop the bout and wait for a quiet gap
        reset();
        lastPeakT = prevT;
      } else if (isPeak && prevT - lastPeakT < MIN_STEP_MS) {
        // faster than a human cadence: shaking or vibration unless a bout is already confirmed
        if (!confirmed) { reset(); lastPeakT = prevT; }
      } else if (isPeak) {
        const interval = prevT - lastPeakT;
        if (interval > GAP_RESET_MS) reset();
        lastPeakT = prevT;
        if (confirmed) credited = 1;
        else {
          if (pending > 0) intervals.push(interval);
          pending++;
          if (pending >= CONFIRM_STEPS) {
            const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            if (mean <= MAX_STEP_MS && intervals.every((i) => Math.abs(i - mean) <= mean * MAX_JITTER)) {
              confirmed = true;
              credited = pending;
              pending = 0;
              intervals = [];
            } else {
              // irregular: slide the window forward one peak
              pending--;
              intervals.shift();
            }
          }
        }
      }

      prevPrev = prev;
      prev = smooth;
      prevT = tMs;
      return credited;
    },
  };
}

export async function requestMotionPermission() {
  if (typeof DeviceMotionEvent === 'undefined') return 'unsupported';
  try {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      return (await DeviceMotionEvent.requestPermission()) === 'granted' ? 'granted' : 'denied';
    }
    return 'granted';
  } catch {
    return 'denied';
  }
}

let handler = null;
let lastEventAt = null;

export function startPedometer(onStep) {
  stopPedometer();
  const detector = createStepDetector();
  lastEventAt = null;
  handler = (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    const now = Date.now();
    lastEventAt = now;
    const n = detector.push(a.x, a.y, a.z, now);
    if (n > 0) onStep(n, now);
  };
  window.addEventListener('devicemotion', handler);
}

export function stopPedometer() {
  if (handler) window.removeEventListener('devicemotion', handler);
  handler = null;
}

export const lastMotionEventAt = () => lastEventAt;
