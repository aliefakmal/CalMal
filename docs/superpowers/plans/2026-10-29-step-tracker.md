# Phase 1 Step Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real accelerometer step counting, auto-pause, interpolated MET, crash-safe live sessions and a daily step goal for the Activity screen.

**Architecture:** Pure math in `src/utils/calc.js`; a DOM-free step detector plus a thin `devicemotion` wrapper in new `src/services/pedometer.js`; `src/services/gpsTracker.js` fuses both, owns auto-pause and gap settling, and persists snapshots through new `store.js` live-session methods under a separate per-account key. UI changes stay in `src/screens/activity.js` and `src/components/profileEditor.js`.

**Tech Stack:** Vanilla JS ES modules, Vite, `node --test` (Node 22, no DOM), Leaflet (existing).

**Spec:** `docs/superpowers/specs/2026-10-29-step-tracker-design.md`

## Global Constraints

- No new dependencies.
- Every new user-facing string goes in both `en` and `ms` blocks of `src/utils/i18n.js`.
- Data stays on device. No network code. Sync mapping in `syncService.js` may change; `processSyncQueue` stays a no-op.
- `src/utils/calc.js` and the detector in `pedometer.js` must import nothing that touches `document`/`window` (tests run in Node).
- Live session key: `${store.getStorageKey()}.live`. Never inside the main state object; never triggers `emit`.
- Snapshots older than 12 h are dropped. Restored sessions come back `status: 'paused'`.
- Default step goal 8000; editor range 1000–50000, step 500.
- All 77 existing tests keep passing: `npm test`.

## Review Focus

1. Phone shaken in hand / riding in a car (vibration, no walking) → 0 steps. Pinned in Task 2 (`random noise counts 0`, `single spike counts 0`).
2. User locks phone for 10 min, walks 1 km, unlocks → time and steps jump to sensible values once, not double-counted on the next tick. Pinned in Task 1 (`settleGap`) and Task 4 (`gap is not added twice`).
3. Desktop Chrome: `DeviceMotionEvent` exists but never fires → source flips to GPS after 3 s, steps not stuck at 0. Pinned in Task 4 (`silent sensor falls back to gps`).
4. Account switch or sign-out mid-run → old account's session preserved paused, new account idle. Pinned in Task 4.
5. Corrupt or foreign JSON in the `.live` key → treated as no session, app does not crash. Pinned in Task 3 (`corrupt live snapshot returns null`).

---

### Task 1: Calc helpers

**Files:**
- Modify: `src/utils/calc.js` (replace `metForSpeed`, add helpers at end)
- Create: `tests/calc.test.js`

**Interfaces:**
- Produces:
  - `metForSpeed(kmh: number) → number` (interpolated)
  - `fuseSteps({ sensorOk: boolean, sensorSteps: number, distanceKm: number, heightCm: number }) → { steps: number, source: 'sensor' | 'gps' }`
  - `gapSteps(gapKm: number, heightCm: number) → number` (integer)
  - `settleGap({ gapSec: number, gapKm: number, weightKg: number }) → { movingSec: number, kcal: number }`
  - `autoPaused(prev: boolean, { speedKmh: number, msSinceLastStep: number }) → boolean`
  - `cadenceSpeedKmh(stepTimes: number[], nowMs: number, heightCm: number) → number`

- [ ] **Step 1: Write failing tests in `tests/calc.test.js`**

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { metForSpeed, kcalBurned, fuseSteps, gapSteps, settleGap, autoPaused, cadenceSpeedKmh, strideMeters } from '../src/utils/calc.js';

test('metForSpeed is 0 when stopped', () => { assert.equal(metForSpeed(0), 0); assert.equal(metForSpeed(0.9), 0); });
test('metForSpeed hits table points', () => { assert.equal(metForSpeed(4.8), 3.5); assert.equal(metForSpeed(8.0), 8.3); });
test('metForSpeed interpolates between points', () => { assert.ok(Math.abs(metForSpeed(7.2) - 6.65) < 0.01); });
test('metForSpeed caps above table', () => { assert.equal(metForSpeed(30), 14.5); });
test('kcalBurned known case', () => { assert.ok(Math.abs(kcalBurned(8, 70, 30) - 294) < 0.01); });
test('fuseSteps uses sensor when ok', () => assert.deepEqual(fuseSteps({ sensorOk: true, sensorSteps: 1200, distanceKm: 2, heightCm: 170 }), { steps: 1200, source: 'sensor' }));
test('fuseSteps uses stride when sensor not ok', () => assert.deepEqual(fuseSteps({ sensorOk: false, sensorSteps: 0, distanceKm: 1, heightCm: 170 }), { steps: Math.round(1000 / strideMeters(170)), source: 'gps' }));
test('gapSteps converts distance to steps', () => { assert.equal(gapSteps(0, 170), 0); assert.equal(gapSteps(1, 170), Math.round(1000 / strideMeters(170))); });
test('settleGap below 20 m is auto-paused', () => assert.deepEqual(settleGap({ gapSec: 600, gapKm: 0.019, weightKg: 70 }), { movingSec: 0, kcal: 0 }));
test('settleGap at 20 m+ counts whole gap at average speed MET', () => {
  const r = settleGap({ gapSec: 600, gapKm: 1, weightKg: 70 }); // 6 km/h
  assert.equal(r.movingSec, 600);
  assert.ok(Math.abs(r.kcal - kcalBurned(metForSpeed(6), 70, 10)) < 0.01);
});
test('autoPaused enters after 10 s still', () => { assert.equal(autoPaused(false, { speedKmh: 0.5, msSinceLastStep: 10000 }), true); assert.equal(autoPaused(false, { speedKmh: 0.5, msSinceLastStep: 9000 }), false); assert.equal(autoPaused(false, { speedKmh: 3, msSinceLastStep: 60000 }), false); });
test('autoPaused leaves on step or speed > 1.5', () => { assert.equal(autoPaused(true, { speedKmh: 0, msSinceLastStep: 500 }), false); assert.equal(autoPaused(true, { speedKmh: 1.6, msSinceLastStep: 60000 }), false); assert.equal(autoPaused(true, { speedKmh: 1.2, msSinceLastStep: 60000 }), true); });
test('cadenceSpeedKmh from last 10 s of steps', () => {
  const now = 100000; const times = Array.from({ length: 20 }, (_, i) => now - i * 500); // 120 spm
  assert.ok(Math.abs(cadenceSpeedKmh(times, now, 170) - 120 * strideMeters(170) * 60 / 1000) < 0.01);
  assert.equal(cadenceSpeedKmh([], now, 170), 0);
});
```

- [ ] **Step 2: Run `node --test tests/calc.test.js`** — expected FAIL (missing exports / old MET values).

- [ ] **Step 3: Implement in `src/utils/calc.js`**

`metForSpeed`: piecewise-linear over `[[1,0],[3.2,2.8],[4.8,3.5],[5.6,4.3],[6.4,5.0],[8.0,8.3],[9.7,9.8],[11.3,11.0],[12.9,11.8],[16.1,14.5]]`; `kmh < 1 → 0`; between 1 and 3.2 interpolate from (1, 2.0) — i.e. treat the first point as `[1, 2.0]` so slow shuffling is not 0; `> 16.1 → 14.5`. Keep `metLabel` bands as is.
`autoPaused`: `prev ? !(msSinceLastStep < 1000 || speedKmh > 1.5) : (speedKmh < 1 && msSinceLastStep >= 10000)`.
`cadenceSpeedKmh`: count `stepTimes` with `nowMs - t <= 10000`, `spm = count * 6`, return `spm * strideMeters(heightCm) * 60 / 1000`.
`settleGap`: `gapKm < 0.02 → zeros`; else `movingSec = gapSec`, `kcal = kcalBurned(metForSpeed(gapKm / (gapSec / 3600)), weightKg, gapSec / 60)`.

- [ ] **Step 4: Run `node --test tests/calc.test.js`** — expected PASS. Then `npm test` — all pass.

- [ ] **Step 5: Commit** — `git add src/utils/calc.js tests/calc.test.js && git commit -m "feat(calc): interpolated MET, step fusion and auto-pause helpers"`

---

### Task 2: Pedometer

**Files:**
- Create: `src/services/pedometer.js`
- Create: `tests/pedometer.test.js`

**Interfaces:**
- Produces:
  - `createStepDetector() → { push(ax, ay, az, tMs): number }` — returns the number of steps credited by this sample (0, 1, or the buffered 4 on confirmation).
  - `requestMotionPermission() → Promise<'granted' | 'denied' | 'unsupported'>`
  - `startPedometer(onStep: (count: number, tMs: number) => void) → void`
  - `stopPedometer() → void`
  - `lastMotionEventAt() → number | null` (ms timestamp of last `devicemotion` event since start, for silence detection)

- [ ] **Step 1: Write failing tests in `tests/pedometer.test.js`**

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStepDetector } from '../src/services/pedometer.js';

const run = (fn, secs = 10, hz = 50) => { const d = createStepDetector(); let n = 0; for (let i = 0; i < secs * hz; i++) { const t = i * 1000 / hz; n += d.push(0, 0, fn(t / 1000, i), t); } return n; };

test('2 Hz walking wave counts ~20 steps in 10 s', () => { const n = run((s) => 9.81 + 3 * Math.sin(2 * Math.PI * 2 * s)); assert.ok(n >= 18 && n <= 22, `got ${n}`); });
test('random noise counts 0', () => { let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5); assert.equal(run(() => 9.81 + 0.6 * rnd()), 0); });
test('single spike counts 0', () => assert.equal(run((s, i) => 9.81 + (i === 100 ? 8 : 0)), 0));
test('three steps then stop counts 0', () => assert.equal(run((s) => 9.81 + (s < 1.5 ? 3 * Math.sin(2 * Math.PI * 2 * s) : 0)), 0));
```

- [ ] **Step 2: Run `node --test tests/pedometer.test.js`** — expected FAIL (module not found).

- [ ] **Step 3: Implement `src/services/pedometer.js`**

Detector algorithm (the tests do not pin the filter, so it is given here; tune constants only if tests or a real phone demand it):

```js
// per sample:
mag = hypot(ax, ay, az)
gravity = gravity == null ? mag : gravity * 0.97 + mag * 0.03   // slow low-pass
dyn = mag - gravity
smooth = smooth * 0.7 + dyn * 0.3                               // fast low-pass vs tremor
// peak = previous smooth was a local max above THRESHOLD (1.0 m/s²)
// and tMs - lastPeakT >= 250 ms
// candidate peaks go into `pending`; a gap > 2000 ms since the last peak clears `pending`
// when pending reaches 4 → confirmed = true, return 4; while confirmed, each peak returns 1
// gap > 2000 ms also sets confirmed = false
```

`requestMotionPermission`: `typeof DeviceMotionEvent === 'undefined' → 'unsupported'`; if `typeof DeviceMotionEvent.requestPermission === 'function'` await it and map `'granted'`/other; else `'granted'`. Catch → `'denied'`.
`startPedometer`: new detector, `window.addEventListener('devicemotion', handler)`; handler reads `e.accelerationIncludingGravity` (skip if any axis null), records `lastEventAt = Date.now()`, calls `onStep(n, Date.now())` when `n > 0`. `stopPedometer` removes it. Only the wrapper functions touch `window`; module top level must not.

- [ ] **Step 4: Run `node --test tests/pedometer.test.js`** — PASS. `npm test` — all pass.

- [ ] **Step 5: Commit** — `git add src/services/pedometer.js tests/pedometer.test.js && git commit -m "feat: accelerometer step detector with peak detection"`

---

### Task 3: Store live session + account hook + sync mapping

**Files:**
- Modify: `src/services/store.js` (add methods to `store`; call hook at the start of `activateAccount` and `clearActiveAccount`)
- Modify: `src/services/syncService.js:enqueueStateSync`
- Test: `tests/store.test.js`, `tests/syncService.test.js`

**Interfaces:**
- Produces on `store`:
  - `getLiveSession(nowMs = Date.now()) → object | null` — parsed snapshot; `null` if missing, unparsable, not an object, or `nowMs - savedAt > 12 * 3600e3` (also removes the key in the expired/corrupt cases).
  - `saveLiveSession(snapshot: object) → void` — writes `{ ...snapshot, savedAt: Date.now() }`; no-op without an active account; swallows storage errors.
  - `clearLiveSession() → void`
  - `onBeforeAccountChange(fn: () => void) → void` — single callback slot; called first thing in `activateAccount` and `clearActiveAccount`.
- Sync: profiles payload gains `daily_step_goal: state.profile.stepGoal ?? null`; activity payload `activity_type` becomes `a.activityType || 'walk'`, `start_time: a.startedAt`, `end_time: a.endedAt`.

- [ ] **Step 1: Write failing tests** (in `tests/store.test.js`, using existing `createAccount` + `auth.resumeLocalAccount` pattern)

- `live session round trip`: save `{ status: 'running', distanceKm: 1.2 }`, `getLiveSession()` returns it with `status`, `distanceKm`, numeric `savedAt`.
- `live session expires after 12 h`: save, then `getLiveSession(Date.now() + 12 * 3600e3 + 1)` is `null` and the `.live` key is gone from `storage.entries()`.
- `corrupt live snapshot returns null`: `storage.setItem(key + '.live', '{oops')` → `null`; `'[1]'` → `null`.
- `live session is per account`: save as A, activate B → `getLiveSession()` is `null`; activate A → snapshot back.
- `onBeforeAccountChange runs before switch`: register fn recording `store.getStorageKey()`; `activateAccount('b')` → recorded key is A's key. Same for `clearActiveAccount()`.

In `tests/syncService.test.js`: profile with `stepGoal: 9000` enqueues `daily_step_goal: 9000`; activity with `activityType: 'run'` enqueues `activity_type: 'run'`.

- [ ] **Step 2: Run `npm test`** — new tests FAIL.
- [ ] **Step 3: Implement** the interfaces above.
- [ ] **Step 4: Run `npm test`** — all PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(store): per-account live session snapshot and account-change hook"`

---

### Task 4: Tracker integration

**Files:**
- Modify: `src/services/gpsTracker.js`
- Create: `tests/gpsTracker.test.js`

**Interfaces:**
- Consumes: Task 1 helpers, Task 2 pedometer API, Task 3 store methods.
- Produces:
  - `start({ simulate = false, motion = 'unsupported' } = {})` — `motion` is the result of `requestMotionPermission()`; pedometer starts when `'granted'`.
  - `getStats()` gains `steps` (from `fuseSteps`), `stepSource`, `autoPaused`, `restored`.
  - `finish()` result gains `activityType` (`'run'` if `avgKmh >= 7.5` else `'walk'`), `stepSource`, `movingSec` (= `durationSec`).
  - `restoreLiveSession() → boolean` (exported for tests; also called at module load and on store `'account'` events).
  - `freezeForAccountChange() → void` (exported for tests; registered via `store.onBeforeAccountChange`).

Behaviour:
- Session fields added to `freshSession()`: `sensorSteps: 0`, `sensorOk: false`, `motion: 'unsupported'`, `autoPaused: false`, `lastStepAt: null`, `stepTimes: []` (keep last 30), `hiddenAt: null`, `hiddenKm: null`, `restored: false`.
- `sensorOk` becomes true on first `devicemotion` event; if `lastMotionEventAt()` is still null 3 s after start/resume, it stays false (GPS source).
- `onStep(n, t)`: add to `sensorSteps`, push times, `lastStepAt = t`.
- `tick()`: compute `autoPaused` via `autoPaused(prev, { speedKmh, msSinceLastStep })` (no steps yet → `Infinity`); if auto-paused, advance `lastTick` and add no time/kcal. MET speed = `speedKmh >= 1 ? speedKmh : cadenceSpeedKmh(...)`.
- Persist: `store.saveLiveSession(snapshotOf(session))` every 5th tick, on each accepted GPS point, and on `visibilitychange → hidden` / `pagehide`. `clearLiveSession()` in `finish()` and `discard()`.
- Visibility: on hidden record `hiddenAt`, `hiddenKm = distanceKm`. On visible (status running): `gapSec`, `gapKm = distanceKm - hiddenKm`; `settleGap` adds `movingSec` to `elapsedSec` and `kcal`; if `sensorOk`, `sensorSteps += gapSteps(gapKm, height)`; set `lastTick = Date.now()`; clear hidden fields. Re-request wake lock (existing).
- Restore: `getLiveSession()`; if status running/paused → `session = { ...freshSession(), ...snap, status: 'paused', speedKmh: 0, autoPaused: false, restored: true }`; emit. `resume()` clears `restored` and restarts pedometer if `motion === 'granted'`.
- Freeze: if status not idle → `tick()` if running, save snapshot with `status: 'paused'`, stop watch/pedometer/timer, release wake lock, `session = freshSession()`, emit.
- Guard module-level `document.addEventListener` / `window.addEventListener` with `typeof document !== 'undefined'` so the module imports in Node.

- [ ] **Step 1: Write failing tests in `tests/gpsTracker.test.js`** (install mock storage + create/resume account A before importing the tracker with a cache-busting query, as `tests/store.test.js` does; call `discard()` in `afterEach` so no interval keeps Node alive)

- `restore brings session back paused`: `store.saveLiveSession({ status: 'running', distanceKm: 1.5, elapsedSec: 600, segments: [[]], points: [] })`, `restoreLiveSession()` → `getStats().status === 'paused'`, `restored === true`, `distanceKm === 1.5`.
- `account switch freezes session under old account`: `start({ simulate: true })`, `store.activateAccount('b')` → tracker `getStats().status === 'idle'`; activate A → `store.getLiveSession().status === 'paused'`.
- `silent sensor falls back to gps`: `start({ motion: 'granted' })` with no motion events; after 3 s check (expose check via fake timers `mock.timers.enable({ apis: ['setInterval','setTimeout','Date'] })`) → `getStats().stepSource === 'gps'`.
- `gap is not added twice`: start, simulate hidden (call exported `_onHidden()` / `_onVisible()` test hooks or dispatch through the guarded handler), advance fake clock 600 s with `distanceKm` raised by 1 km, visible, then one tick → `elapsedSec` ≈ 600 + 1, not 1200.
- `finish clears live session and sets activityType`.

- [ ] **Step 2: Run `node --test --experimental-test-module-mocks tests/gpsTracker.test.js`** — FAIL.
- [ ] **Step 3: Implement** as above.
- [ ] **Step 4: Run `npm test`** — all PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(tracker): sensor steps, auto-pause, gap settling and crash-safe sessions"`

---

### Task 5: Activity UI, step goal, i18n, SW

**Files:**
- Modify: `src/screens/activity.js`, `src/components/profileEditor.js`, `src/utils/i18n.js`, `src/styles/screens.css`, `public/sw.js`

**Interfaces:**
- Consumes: Task 4 `getStats()` fields, `start({ simulate, motion })`; `requestMotionPermission` from Task 2; `dayRoutes`, `lastNDays`; `ringSVG` from `ui.js`.

- [ ] **Step 1: Start button** — first line of the click handler: `const motion = isSim ? 'unsupported' : await requestMotionPermission();` (before any other `await`, so iOS sees the gesture), pass to `tracker.start`. Toast uses an i18n key.
- [ ] **Step 2: Step goal card** above the metric grid in every state: `ringSVG` progress of `todaySteps / goal`, where `todaySteps = dayRoutes(history, todayKey()).steps + (status !== 'idle' ? stats.steps : 0)`, goal `store.profile?.stepGoal || 8000`; label `X / Y steps`. Live-updated in the tracker subscription (`#hud-goal-steps`, ring progress).
- [ ] **Step 3: 7-day bars** under the ring (idle only): `lastNDays(7)` oldest→newest, bar height ∝ steps / max(goal, maxDay), dashed goal line, today highlighted, weekly total text. Each bar is a `<button>` with `aria-label` "<date>: N steps"; click sets `selectedDay` and re-renders.
- [ ] **Step 4: HUD** — badge shows `AUTO-PAUSED` / `JEDA AUTO` when `stats.autoPaused`; steps tile label shows source (`sensor` / `GPS est.`). Replace the hard-coded "Est. Steps" with i18n keys.
- [ ] **Step 5: Restore banner** — when `stats.restored`, a card above the controls: "Session restored. Resume or finish it." (existing paused controls already offer Resume / Finish / Discard).
- [ ] **Step 6: Sources sheet** — replace the 4-band MET text with: interpolated Compendium MET from walking 2.8 to running 14.5, auto-pause rule, step source rule.
- [ ] **Step 7: Profile editor** — `formState.stepGoal = Number(current.stepGoal) || 8000`; number input `#pe-step-goal` (min 1000, max 50000, step 500); validate on submit with an i18n error toast.
- [ ] **Step 8: i18n** — all new keys in `en` and `ms`. Convert the touched Start/Finish/Discard toasts and confirm sheets in `activity.js` to keys.
- [ ] **Step 9: SW** — bump `CACHE` in `public/sw.js` to `calmal-v27`.
- [ ] **Step 10: Verify** — `npm test` all pass; `npm run build` succeeds; `npm run dev`, open Activity in a mobile viewport: start in Simulation Mode, see steps (GPS source), ring moves, reload mid-session → restored paused banner, Resume continues totals, Finish saves with step count; switch language → no English leftovers in new UI.
- [ ] **Step 11: Commit** — `git commit -m "feat(activity): step goal ring, weekly steps, auto-pause HUD and session restore"`
