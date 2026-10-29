# Phase 1 — Strava-style step & activity tracker

Date: 2026-10-29. Part 1 of 4 of the CalMal upgrade (source brief: `gemini-code-1793274558323.md`).

## Intent

Users record walks and runs in the Activity screen. Today steps are a guess (`distance ÷ stride`), time keeps running when the user stops at a traffic light, and a reload or a killed tab loses the whole session. The user wants the tracker to feel like Strava: real step counts, honest moving time, a live session that survives leaving the app, and a daily step goal with history.

## Goals

1. Count real steps from the accelerometer (`DeviceMotionEvent`) during a session, with iOS permission handled.
2. Fall back to stride-based steps from GPS distance when the sensor is missing or silent.
3. Live metrics: steps, moving time (auto-pause), distance, current pace, kcal.
4. kcal from a MET that varies smoothly with speed, using the user's profile weight.
5. A session survives tab switch, screen lock, reload and app kill, and resyncs when the user returns.
6. Daily step goal (editable) with progress, plus a 7-day step history.

## Non-goals

- Counting steps while the phone is locked or the app is in the background. The web platform does not deliver motion events then. Wake Lock keeps the screen on during a session; that is the mitigation.
- All-day step counting outside a session (option B, rejected).
- Writing `daily_steps` or any Supabase table. Data stays on this device (user decision). Sync queue mapping may be updated so it is correct if sync is re-enabled, but no network code.
- An auto-pause on/off setting. Auto-pause is always on.
- Cycling as an activity type.

## Anti-goals (failure even if it "works")

- A step count that is visibly wrong: double counting from sensor + GPS, or shaking the phone in hand producing hundreds of steps.
- Losing a recorded session because the browser reloaded or killed the tab.
- Breaking login/account switching, companion audio, prayer times, bilingual UI, or any of the 77 existing tests.

## Constraints

- Vanilla JS + Vite, no new dependencies.
- Respect the existing layers: `src/services/gpsTracker.js` owns the session; `src/services/store.js` owns persistence; `src/utils/calc.js` holds pure math; `src/utils/i18n.js` holds every user-facing string in `en` and `ms`.
- Storage is per local account (`store.getStorageKey()`); the live session must also be per account.
- iOS 13+ requires `DeviceMotionEvent.requestPermission()` to be called from a user gesture.
- Tests run with `node --test` (no DOM). New logic must be testable as pure functions.

## Approaches considered

- **A. Steps during sessions only (chosen).** Pedometer runs only while a session records; fuses with GPS. Honest about platform limits, reuses the existing GPS session.
- B. A plus an all-day counter while the app is open. Rejected: undercounts badly because most walking happens with the phone locked, so a goal ring fed by it would mislead.
- C. Generic Sensor API `Accelerometer`. Rejected: Chromium only, no iOS.

## Design

### 1. Pedometer — new `src/services/pedometer.js`

- `createStepDetector()` — pure, no DOM. `push(ax, ay, az, tMs) → boolean` (true when a step is counted).
  - Magnitude of `accelerationIncludingGravity`.
  - Gravity estimate by slow low-pass; subtract it to get the dynamic signal.
  - Fast low-pass on the dynamic signal to kill hand tremor and noise.
  - Step = local peak above a threshold, with at least 250 ms since the previous step (max 4 steps/s).
  - Require a short run of regular steps (about 4 within ~3 s) before counting starts, then credit those buffered steps. This rejects one-off shakes.
- `requestMotionPermission()` — calls `DeviceMotionEvent.requestPermission()` when it exists, returns `'granted' | 'denied' | 'unsupported'`. Called from the Start button click, before `tracker.start()`.
- `startPedometer(onStep)` / `stopPedometer()` — attach/detach the `devicemotion` listener.
- Sensor considered **silent** if no `devicemotion` event arrives within 3 s of start (desktop Chrome exposes the API but never fires it).

### 2. Step fusion

Not `max()`: `strideMeters` is a walking stride (height × 0.415), so on a run the GPS estimate would exceed a correct sensor count and inflate it.

`calc.js`: `fuseSteps({ sensorOk, sensorSteps, distanceKm, heightCm })`:

- `sensorOk` → `sensorSteps`. `stepSource: 'sensor'`.
- otherwise (no API, permission denied, or silent for 3 s) → `round(distanceKm·1000 / strideMeters(heightCm))`. `stepSource: 'gps'`.
- Treadmill / indoors: sensor count, GPS not used.
- The two are never added or maxed, so no double counting.

Gap fill (sensor stalls while the page is hidden): record `distanceKm` on `visibilitychange → hidden`; on `→ visible`, add `round(gapKm·1000 / strideMeters)` to `sensorSteps`. This is the only place a stride estimate enters a sensor count. Pure helper `gapSteps(gapKm, heightCm)`.

The HUD shows which source is active in small text.

### 3. Dynamic MET

Replace the 4-step `metForSpeed` with piecewise-linear interpolation over Compendium of Physical Activities points (km/h → MET): 0–1 → 0 (stopped), 3.2 → 2.8, 4.8 → 3.5, 5.6 → 4.3, 6.4 → 5.0, 8.0 → 8.3, 9.7 → 9.8, 11.3 → 11.0, 12.9 → 11.8, 16.1 → 14.5, capped above. `metLabel` keeps its bands. `kcalBurned` formula unchanged. Weight comes from `store.profile.weight` (already the case).

Indoor speed: when GPS speed is under 1 km/h but steps arrived in the last 10 s, speed for MET purposes = cadence (steps/min over the last 10 s) × stride. This makes treadmill walking burn kcal instead of 0.

Update the "Activity Sources" sheet text to describe the interpolated MET.

### 4. Auto-pause (moving time)

- Session gains `autoPaused: boolean`. Status stays `'running'` so GPS and pedometer stay on.
- Enter auto-pause when speed < 1 km/h **and** no step for 10 s.
- Leave auto-pause on the next step or when speed > 1.5 km/h.
- While auto-paused, `tick()` adds no elapsed time and no kcal.
- HUD badge shows "AUTO-PAUSED" / "JEDA AUTO" instead of "RECORDING".
- Manual Pause/Resume unchanged.

### 5. Background resilience

- **Wake Lock:** already requested on start/resume and re-requested on `visibilitychange → visible`. Keep. Also release on finish/discard (already done).
- **Visibility:** on return to visible, settle the hidden gap before the next `tick()`:
  - `gapKm` = distance gained while hidden (GPS points that arrived late included).
  - `gapKm ≥ 0.02` (20 m): the whole gap counts as moving time; kcal for the gap uses MET at average gap speed `gapKm / gapHours`.
  - Otherwise: the gap is auto-paused (no time, no kcal).
  - Pure helper `settleGap({ gapSec, gapKm, weightKg }) → { movingSec, kcal }`, tested.
  - `tick()` must not also add the gap (reset `lastTick` after settling).
- **Persistence:** `store.js` gets `getLiveSession() / saveLiveSession(snapshot) / clearLiveSession()` writing to a separate key `${store.getStorageKey()}.live`. The live session is not put in the main state object (the main state can be MBs with meal thumbnails; writing it every few seconds is too heavy, and it must not trigger `emit`/sync).
  - Save on every GPS point and every 5 s tick, and on `visibilitychange → hidden` and `pagehide`.
  - Clear on finish and discard.
- **Restore:** on app start and on account activation (`gpsTracker.js` subscribes to store `'account'` events), if a snapshot exists with status running/paused, restore it as **paused** with a banner: "Session restored — Resume or Finish". Paused because we cannot know what happened while the app was dead. Snapshots older than 12 h are dropped.
- **Account switch / sign-out:** the session is module state in `gpsTracker.js`, and `store.getStorageKey()` changes on switch. So before `store.activateAccount` / `store.clearActiveAccount` swap accounts, the tracker must save account A's snapshot as paused under A's key, stop GPS/pedometer/timer, and reset to idle. Then restore runs for account B. Hook: `store` calls a registered `beforeAccountChange` callback (set by `gpsTracker.js`) at the start of both methods, so `store.js` does not import the tracker (avoid a cycle). Nothing is lost; A sees the restore banner on next login.

### 6. Daily step goal & history

- `profile.stepGoal`, default 8000, editable in `src/components/profileEditor.js` (number, 1000–50000, step 500).
- Map to `daily_step_goal` in `enqueueStateSync` (column exists in `supabase/schema.sql`; no schema change).
- Activity screen, all states, above the metric grid: today's steps vs goal as a progress ring/bar, today = sum of today's saved sessions (`dayRoutes`) + live session steps. Updates live via the tracker subscription.
- Dashboard: no change in Phase 1. Phase 2 decides where steps appear there.
- 7-day step history: one compact bar per day (last 7 days via `lastNDays`), goal line, today highlighted, tap a bar selects that day in the existing day strip.
- Weekly total under the bars.

### 7. Saved activity record

`finish()` result adds: `activityType: 'walk' | 'run'` (run when avg speed ≥ 7.5 km/h), `stepSource`, `movingSec` (= `durationSec`, now moving time). Keep `type` label for display. Sync mapping uses `activityType` so it satisfies the `activity_sessions.activity_type` check.

### 8. Service worker

Bump `CACHE` in `public/sw.js` so clients pick up the new code. No background-sync feature (not possible for sensors).

### 9. i18n

Every new string in both `en` and `ms` in `src/utils/i18n.js`. Existing hard-coded English toasts touched by this work move to i18n keys.

## Tests

New `tests/calc.test.js` and `tests/pedometer.test.js`:

- `metForSpeed` interpolation at table points, between points, 0 below 1 km/h, capped above.
- `kcalBurned` for a known case.
- `fuseSteps` sensor ok, sensor not ok; `gapSteps`; `settleGap` above and below 20 m.
- Step detector: synthetic 2 Hz walking sine wave for 10 s counts ~20 steps (±2); random noise counts 0; a single spike counts 0.
- Auto-pause decision as a pure helper (`shouldAutoPause(speedKmh, msSinceLastStep)`).
- Live-session save/restore round trip via `tests/helpers/mockStorage.js`, including the 12 h expiry and per-account isolation.
- Account switch mid-session: A's snapshot saved under A's key as paused, B starts idle.

All 77 existing tests must still pass (baseline run 2026-10-29: 77/77 pass).

## Calls made by the designer (not user decisions)

- Step fusion: sensor or GPS, never `max`; stride fill only for hidden gaps.
- Hidden gap: counts as moving only if ≥ 20 m covered; kcal at average gap speed.
- Account switch mid-session: freeze as paused under the old account, never block the switch.
- Step goal ring on Activity screen in every state; dashboard untouched until Phase 2.
- Restored sessions come back paused; snapshots older than 12 h are dropped.
- Default step goal 8000.

## Left to the builder

- Exact filter constants and threshold for the step detector, tuned against the synthetic tests and a real phone.
- Visual design of the goal ring and 7-day bars, following the existing activity screen styles in `src/styles/screens.css`.
- Whether the restore banner is a card or a sheet.
