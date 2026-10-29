// Accelerometer pedometer: low-pass filtered magnitude + peak detection.
// Only counts during a recording session; browsers stop motion events when the page is hidden.

const THRESHOLD = 1.0; // m/s² above the gravity baseline
const MIN_STEP_MS = 250; // max 4 steps/s
const GAP_RESET_MS = 2000; // a pause this long ends a walking bout
const CONFIRM_STEPS = 4; // regular steps needed before a bout counts (rejects one-off shakes)

/** Pure detector. push() returns how many steps this sample credits. */
export function createStepDetector() {
  let gravity = null;
  let smooth = 0;
  let prev = 0;
  let prevPrev = 0;
  let prevT = 0;
  let lastPeakT = -Infinity;
  let pending = 0;
  let confirmed = false;

  return {
    push(ax, ay, az, tMs) {
      const mag = Math.hypot(ax, ay, az);
      gravity = gravity == null ? mag : gravity * 0.97 + mag * 0.03;
      smooth = smooth * 0.7 + (mag - gravity) * 0.3;

      if (tMs - lastPeakT > GAP_RESET_MS) {
        pending = 0;
        confirmed = false;
      }

      let credited = 0;
      const isPeak = prev > prevPrev && prev >= smooth && prev > THRESHOLD;
      if (isPeak && prevT - lastPeakT >= MIN_STEP_MS) {
        if (prevT - lastPeakT > GAP_RESET_MS) {
          pending = 0;
          confirmed = false;
        }
        lastPeakT = prevT;
        if (confirmed) credited = 1;
        else if (++pending >= CONFIRM_STEPS) {
          confirmed = true;
          credited = pending;
          pending = 0;
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
