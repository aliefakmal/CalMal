# Daily-Driver Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship fasting mode, streak shield, remaining-kcal ideas, late-night note, story card, swipe-down sheets and the daily path map in CalMal.

**Architecture:** Pure logic goes in small new `src/utils/*.js` modules with node:test coverage. Screens (`dashboard.js`, `activity.js`, `recipes.js`, `profile.js`) only render and wire events. Shared sheet drag lives in `openSheet` (`src/components/ui.js`). Fasting times come from a thin service with a cache in `store.settings`.

**Tech Stack:** Vanilla JS ES modules, Vite 8, Leaflet 1.9 (already installed), node:test.

**Spec:** `docs/superpowers/specs/2026-10-29-daily-driver-gaps-design.md`

## Global Constraints

- No new npm dependencies.
- Pure utils (`streak.js`, `suggest.js`, `dayRoutes.js`, `prayerTimes.js` parse/fallback) must not import `store.js` or `i18n.js`, so tests can import them directly.
- Every new UI string goes in `src/utils/i18n.js`, in both `en` and `ms`.
- Reuse existing classes and tokens: `.card`, `.chip`, `.badge`, `.btn`, `--hero-accent`. No new palette.
- Tap targets ≥ 44 px. Layout must work at 320 px and 390 px widths.
- Dates are local-time `YYYY-MM-DD` via `todayKey()` from `src/utils/helpers.js`.
- Aladhan URL: `https://api.aladhan.com/v1/timingsByCity?city=<city>&country=Malaysia&method=17`. Fallback times: `05:40` Imsak, `19:15` Maghrib.
- Shield rule: +1 shield per 7 consecutive logged days, max 2. A missed past day uses 1 shield. Today being unlogged never breaks the streak.
- Late-night window: 22:30–03:59 local time, only when fasting mode is off, at most once per night.
- Story card: 1080×1920 PNG, filename `calmal-YYYY-MM-DD.png`.
- Sheet close threshold: drag > 110 px, or velocity > 0.6 px/ms. Disabled at `(min-width: 720px)`.
- Run `npm test` with npm, never pnpm.

## Review Focus

- Aladhan returns times like `"05:28 (+08)"`. The parser must strip the suffix. Test with the suffix.
- Logged meals with no `date`, and dates in the future: `computeStreak` must ignore future dates.
- A day crosses midnight during the late-night window, so 00:30 belongs to the previous night. Use one flag key per night: the date of the evening, i.e. for times before 04:00 use yesterday's `todayKey`.
- Activities saved before this feature may have `segments` missing or `steps` undefined. `dayRoutes` must treat both as empty/0.
- `remaining` can be negative (over target). `suggestFoods` must return `[]`.

---

### Task 1: Streak with shields

**Files:**
- Create: `src/utils/streak.js`
- Modify: `src/services/companionService.js:106-115` (use `computeStreak` for `streak_3`)
- Test: `tests/streak.test.js`

**Interfaces:**
- Produces: `computeStreak(dates: string[], today: string) -> { streak: number, shields: number, shieldedDays: string[] }`

- [ ] **Step 1: Write failing tests** in `tests/streak.test.js`:
  - `[]` → `{ streak: 0, shields: 0, shieldedDays: [] }`.
  - Logged 3 days ending yesterday, today unlogged → `streak: 3`.
  - 7 consecutive days → `shields: 1`. 14 days → `shields: 2`. 21 days → `shields: 2` (cap).
  - 7 days, then 1 missed day, then 2 days ending today → `streak: 9`, `shields: 0`, `shieldedDays` contains the missed date.
  - 3 days, then 2 missed days, then today → `streak: 1` (no shield, reset).
  - A future date in input is ignored.
  - Duplicate dates count once.
- [ ] **Step 2: Run** `node --test tests/streak.test.js`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** Dedupe dates, drop dates after `today`, walk day by day from the earliest date to `today`. Logged day: `streak++`, `run++`, and when `run % 7 === 0` do `shields = min(2, shields + 1)`. Missed day other than `today`: use a shield if `shields > 0` (push to `shieldedDays`, `run` unchanged), else set `streak = 0`, `run = 0`. Iterate dates with `new Date(y, m-1, d+1)` to avoid DST/UTC drift.
- [ ] **Step 4: Run** the test again. Expected: PASS.
- [ ] **Step 5: Swap** the manual loop in `onMealLogged` for `computeStreak(store.state.meals.map(m => m.date), todayKey()).streak >= 3`.
- [ ] **Step 6: Run** `npm test`. Expected: all pass. Commit `feat(streak): add streak shield calculation`.

### Task 2: Remaining-kcal food suggestions

**Files:**
- Create: `src/utils/suggest.js`
- Test: `tests/suggest.test.js`

**Interfaces:**
- Produces: `suggestFoods(remaining: number, foods: Array<{name,kcal,protein,carbs,fat,weight_g}>, n = 3) -> Food[]`

- [ ] **Step 1: Write failing tests:**
  - `remaining` 600: every result has `kcal` in `[150, 600]`.
  - Ordering: highest `protein / kcal` first.
  - Length ≤ `n`.
  - `remaining` 79, 0 and -200 → `[]`.
- [ ] **Step 2: Run** and confirm FAIL.
- [ ] **Step 3: Implement** with filter → sort → slice. Do not mutate the input.
- [ ] **Step 4: Run** and confirm PASS. Commit `feat(recipes): add remaining-kcal food suggestions`.

### Task 3: Day routes helper

**Files:**
- Create: `src/utils/dayRoutes.js`
- Test: `tests/dayRoutes.test.js`

**Interfaces:**
- Produces: `dayRoutes(activities: Activity[], date: string) -> { sessions: Activity[], km: number, steps: number, kcal: number, sec: number, coords: [lat,lng][] }`
- Produces: `lastNDays(n: number, today?: Date) -> string[]`, newest first, using `todayKey`.

- [ ] **Step 1: Write failing tests:**
  - Filters by `date`. Sums `distanceKm`, `steps`, `kcal` and `durationSec`.
  - `km` rounded to 2 decimals.
  - An activity with no `segments` and no `steps` contributes 0 and adds no coords.
  - `coords` flattens all segments of all sessions in order.
  - `lastNDays(7, new Date(2026, 9, 29))[0] === '2026-10-29'` and `[6] === '2026-10-23'`.
- [ ] **Step 2–4:** Fail, implement, pass. Commit `feat(activity): add day routes helper`.

### Task 4: Prayer times service

**Files:**
- Create: `src/services/prayerTimes.js`
- Test: `tests/prayerTimes.test.js`

**Interfaces:**
- Produces: `parseHHMM(s: string) -> string` ("05:28 (+08)" → "05:28").
- Produces: `async fetchFastingTimes(city: string, date: string, cache?: {date,city,imsak,maghrib}, fetchFn = fetch) -> { date, city, imsak, maghrib, approx: boolean, error?: 'city' | 'network' }`
  - Cache hit (same `date` and `city`, case-insensitive) → returns cache, no fetch.
  - HTTP OK with `code === 200` → `approx: false`.
  - API `code !== 200` or a 4xx status → `error: 'city'`. Network throw or 5xx → `error: 'network'`. Both errors return cached times if the cache matches the city, else the defaults `05:40` / `19:15`, with `approx: true`.
- Produces: `nextFastingEvent(times, now: Date) -> { kind: 'sahur' | 'iftar', at: Date, minsLeft: number }`. Before Imsak → sahur. Before Maghrib → iftar. After Maghrib → tomorrow's sahur, using the same Imsak time.
- No import of `store` or `i18n`. The caller saves the result in `settings.fastingTimes`.

- [ ] **Step 1: Write failing tests** with a stub `fetchFn`: suffix parse, cache hit makes zero calls, `error: 'city'` fallback, `error: 'network'` fallback to the matching cache, and `nextFastingEvent` at 04:00, 12:00 and 21:00.
- [ ] **Step 2–4:** Fail, implement, pass. Commit `feat(fasting): add JAKIM prayer times service`.

### Task 5: Fasting mode UI and reminders

**Files:**
- Modify: `src/screens/profile.js:287-294,505` (city field shown when toggle is on)
- Modify: `src/screens/dashboard.js` (fasting strip under the header)
- Modify: `src/services/companionService.js:64-81` (`checkReminders`)
- Modify: `src/utils/i18n.js` (`fast_*` keys, EN + MS)

**Interfaces:**
- Consumes: `fetchFastingTimes`, `nextFastingEvent` (Task 4).
- Settings keys: `fastingCity` (default `'Kuala Lumpur'`), `fastingTimes`.

- [ ] **Step 1: Profile.** Under the toggle, render a text input `#fasting-city` and a Save button when `settings.fastingMode`. On save, `store.saveSettings({ fastingCity })`, then refresh times and toast the result. On `error: 'city'`, toast "City not found, using approximate times".
- [ ] **Step 2: Dashboard strip.** When `fastingMode` is on, render `.card` strip: "Sahur ends 05:28 · Iftar 18:57" plus "Iftar in 2h 14m" from `nextFastingEvent`. Show "(approx.)" when `approx`. Fetch on render if the cache date ≠ today, then save to settings (the save triggers a re-render, so guard with an in-flight flag). Update the countdown every 60 s with `setInterval`. Clear it in the screen's existing cleanup.
- [ ] **Step 3: Reminders.** If `fastingMode`, skip `REMINDERS` and the inactivity alert. Fire `remind:sahur` in [Imsak − 45 min, Imsak] if no meal is logged today. Fire `remind:iftar` in [Maghrib, Maghrib + 20 min]. Use cached `settings.fastingTimes`, or the defaults.
- [ ] **Step 4:** `npm test` and `npm run build` pass. Manually check: toggle on, dashboard strip visible, no console errors. Commit `feat(fasting): sahur/iftar strip and reminders`.

### Task 6: Streak chip, late-night note, onMealLogged gaps

**Files:**
- Modify: `src/screens/dashboard.js:41-53` (streak chip), `:597-611` (quick chips call `onMealLogged`)
- Modify: `src/screens/recipes.js:1834,2113` (call `onMealLogged` after `store.addMeal`)
- Modify: `src/services/companionService.js` (`onMealLogged` late-night branch)
- Modify: `src/utils/i18n.js` (`streak_*`, `late_*` keys)

**Interfaces:**
- Consumes: `computeStreak` (Task 1).
- Produces: `isLateNight(now: Date) -> { late: boolean, nightKey: string }` exported from `src/utils/streak.js`. `late` is true for 22:30–23:59 and 00:00–03:59. `nightKey` is the evening's date.

- [ ] **Step 1: Test** `isLateNight` in `tests/streak.test.js`: at 22:29 → false; at 22:30 → true with today's key; at 00:30 → true with yesterday's key; at 04:00 → false.
- [ ] **Step 2: Implement** `isLateNight` and confirm PASS.
- [ ] **Step 3: Late-night branch.** At the top of `onMealLogged`, after `unlock('first_meal')`: if `!store.settings.fastingMode`, `isLateNight(new Date()).late`, and `!store.flag('latenight', nightKey)`, then `store.setFlag('latenight', nightKey)` and `showCompanion({ who: currentCoach, text })`. Text comes from i18n `late_tip`. Do not return; let other checks continue.
- [ ] **Step 4: Streak chip.** In the dashboard header, add a `<button class="chip" id="btn-streak">` showing the flame icon, the streak count, and a shield count when > 0. It opens an `openSheet` that explains the rule in i18n copy.
- [ ] **Step 5: Wire `onMealLogged`.** Call it in dashboard quick chips and both recipes `addMeal` sites. Import it in `recipes.js`.
- [ ] **Step 6:** Run `npm test` and the build. Commit `feat(streak): streak chip, late-night tip, log hooks`.

### Task 7: Remaining-kcal card in Recipes

**Files:**
- Modify: `src/screens/recipes.js` (`renderRecipeGenerator` top card, `bindEvents`)
- Modify: `src/utils/i18n.js` (`fit_*` keys)

**Interfaces:**
- Consumes: `suggestFoods` (Task 2), `MALAYSIAN_FOODS`, `store.summary().remaining`.

- [ ] **Step 1:** At the top of `renderRecipeGenerator`, add a card titled "Fits your remaining {X} kcal". It holds 3 rows (name, kcal, protein) with a `.btn-fit-log` button each, carrying the index in `data-i`. If the list is empty, show "You're at target, water or plain tea are fine."
- [ ] **Step 2:** `.btn-fit-log` runs `store.addMeal({ ...food, mealType: mealTypeNow() })`, then `onMealLogged`, a toast, and `render()`.
- [ ] **Step 3:** `#btn-fit-ai` sets `recipeTextRequest` to the i18n prompt containing "max {X} kcal". It then calls the existing generate handler (same path as `#btn-gen-recipe`). The button is disabled when `remaining < 80`.
- [ ] **Step 4:** Build passes. Check manually at 390 px. Commit `feat(recipes): suggest meals for remaining kcal`.

### Task 8: Story card export

**Files:**
- Create: `src/utils/storyCard.js`
- Modify: `src/screens/dashboard.js` (header button `#btn-share-day`)
- Modify: `src/utils/i18n.js` (`story_*` keys)

**Interfaces:**
- Produces: `async buildStoryCard(data: { name, date, kin, target, kout, remaining, protein, carbs, fat, macros, water, waterTarget, streak, accent, labels }) -> Blob` (PNG).
- Produces: `async shareStoryCard(blob, filename) -> 'shared' | 'downloaded' | 'cancelled'`.

- [ ] **Step 1: Implement** `buildStoryCard`. Canvas 1080×1920. Background is `#000` with an accent radial glow. The design, top to bottom: wordmark "CalMal", the date, a 520 px ring (accent arc = kin / (target + kout)), the big remaining/over number, then 3 macro bars, then water and streak rows. Labels are passed in, so the util stays free of i18n. Use `await document.fonts.ready` before drawing. Get the blob with `canvas.toBlob(..., 'image/png')`.
- [ ] **Step 2: Implement** `shareStoryCard`. Build a `File`. If `navigator.canShare?.({ files: [file] })`, call `navigator.share({ files: [file] })` and return `'cancelled'` on `AbortError`. Otherwise download via `URL.createObjectURL` with an `<a download>`, and revoke the URL after the click.
- [ ] **Step 3: Dashboard.** Add a ghost icon button next to Scan, with `aria-label` from i18n. Use `setLoading` while building. Toast on download.
- [ ] **Step 4:** Check in the browser that clicking downloads a PNG and the console shows no errors. Commit `feat(dashboard): share day story card`.

### Task 9: Swipe-down sheets

**Files:**
- Modify: `src/components/ui.js:19-43` (`openSheet`)
- Modify: `src/styles/index.css:645-664` (grip hit area, `touch-action: none`, `.dragging` disables transition)

- [ ] **Step 1:** In `openSheet`, unless `matchMedia('(min-width: 720px)').matches`, listen for `pointerdown` on the sheet. Start a drag only if `e.target.closest('.sheet-grip')` or `e.clientY - sheet.getBoundingClientRect().top < 28`. Use `setPointerCapture`. On move, set `translateY(max(0, dy))`. On up: if `dy > 110` or `dy / dt > 0.6`, call `close()`; else clear the transform. Also handle `pointercancel`.
- [ ] **Step 2: CSS.** `.sheet-grip` gets `padding: 10px 0` via a pseudo hit area or margins, `cursor: grab`, `touch-action: none`. `.sheet.dragging { transition: none; animation: none; }`.
- [ ] **Step 3:** In the browser at 390 px: drag the meal editor sheet down 150 px and it closes. Drag 50 px and it snaps back. Scrolling inside the sheet content still works. Commit `feat(ui): swipe-down to close bottom sheets`.

### Task 10: Daily path map on Activity

**Files:**
- Modify: `src/screens/activity.js` (day strip, `drawDayRoutes`, state `selectedDay`)
- Modify: `src/screens/dashboard.js:256-263` (link "Today's path" → `#/activity?day=today`)
- Modify: `src/utils/i18n.js` (`day_*` keys)
- Modify: `src/styles/screens.css` (day strip)

**Interfaces:**
- Consumes: `dayRoutes`, `lastNDays` (Task 3).

- [ ] **Step 1: Day strip.** Above the map, add a horizontally scrolling `.chips` of 7 days: weekday short name + km. Days with 0 sessions get `opacity: .45` but stay clickable to show the empty state. The selected day gets `.active`.
- [ ] **Step 2: Drawing.** `drawDayRoutes(date)` clears the layers. It draws each session's segments with colour `['#ff5a1a','#3ddc97','#38bdf8','#a78bfa','#fbbf24'][i % 5]`, adds S/F pins per session, and calls `fitBounds(coords)` when coords exist. Under the map, show a summary row: sessions · km · steps · kcal · time.
- [ ] **Step 3: State rules.** `selectedDay` and `inspectingActivityId` exclude each other. Clicking the selected day again sets `selectedDay = null` and redraws live. Starting a run clears `selectedDay`. `initMap` checks `selectedDay` before `inspectingActivityId`.
- [ ] **Step 4: Deep link.** If `location.hash` includes `day=today`, preselect today. Check that `main.js` routing tolerates the query part. If it doesn't, strip it in `route()`.
- [ ] **Step 5:** In the browser, use Simulation Mode to record 2 short sessions. Select today: both routes draw, and the summary totals match. No console errors. Commit `feat(activity): daily path map`.

### Task 11: Final verification and push

- [ ] `npm test`: all pass. That is 49 old tests plus the new ones.
- [ ] `npm run build` succeeds. Only the existing chunk-size warning remains.
- [ ] `git diff --check` is clean.
- [ ] Browser pass at 320 px and 390 px: dashboard (streak chip, fasting strip, share), recipes generator card, profile fasting city, activity day strip, sheet drag. The console shows no errors.
- [ ] Merge the worktree branch into `feat/hybrid-auth-sync`, then run `git push origin feat/hybrid-auth-sync`. If it is rejected, fetch and merge, retest, and push. Never force-push.
