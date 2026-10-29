# CalMal daily-driver gaps: design

Date: 2026-10-29
Branch: `feat/hybrid-auth-sync` (work in worktree `feat/daily-driver-gaps`)
Source: `improvement.md`, `improvement 2.md` (gap analysis showed most items already shipped).

## Scope

Six features. All local-first and per-account. No new npm dependencies.
Out of scope: Supabase sync, password/biometric auth, companion sprite/audio assets (need user-supplied files).

## 1. Fasting mode (Sahur / Iftar)

- New `src/services/prayerTimes.js`:
  - `getFastingTimes(city)` calls `https://api.aladhan.com/v1/timingsByCity?city=<city>&country=Malaysia&method=17` (JAKIM).
  - Uses `Imsak` as Sahur end and `Maghrib` as Iftar.
  - Caches `{ date, city, imsak, maghrib }` in `settings.fastingTimes`. One fetch per day per city.
  - Offline or API error: falls back to last cache, then defaults `05:40` / `19:15`, marked `approx: true`.
- Profile: when the fasting toggle is on, show a city input (default `Kuala Lumpur`). Save it to `settings.fastingCity`.
- Dashboard: when fasting mode is on, show a slim strip: "Sahur ends 05:28 · Iftar 18:57", plus a live countdown to the next event.
- Reminders (`companionService.checkReminders`): while fasting mode is on, replace the breakfast/lunch/dinner reminders and the 17:30 inactivity alert with:
  - Sahur: from Imsak − 45 min to Imsak, if nothing is logged yet today.
  - Iftar: from Maghrib to Maghrib + 20 min, with a hydration nudge.

## 2. Streak shield

- New pure function `computeStreak(mealDates, today)` in `src/utils/streak.js`. It is derived from meal data, so no new stored state.
- It walks each day from the first logged date to yesterday, then today:
  - A logged day adds 1 to the streak. Every 7th consecutive day earns 1 shield, up to a maximum of 2.
  - A missed day uses 1 shield if available; the streak continues but that day does not count. With no shield, the streak resets to 0.
  - Today not yet logged never breaks the streak.
- Returns `{ streak, shields, shieldedDays }`.
- Dashboard header: a chip with a flame icon and the streak count, plus a shield icon and count when shields > 0. Tapping the chip opens a short sheet that explains the rule.
- `streak_3` badge keeps working. It switches to `computeStreak` so shielded days count.

## 3. Meal ideas for remaining kcal

- New pure function `suggestFoods(remaining, foods, n = 3)` in `src/utils/suggest.js`.
  - Candidates: `MALAYSIAN_FOODS` with kcal between 25% and 100% of the remaining kcal.
  - Ranking: protein per kcal, highest first. Returns the top `n`.
  - If remaining < 80 kcal, returns an empty list. The UI then shows "You're at target, water or plain tea are fine."
- Recipes → Generator tab: a "Fits your remaining X kcal" card at the top.
  - 3 offline food rows with a "Log" button each (via `store.addMeal` + `onMealLogged`).
  - An "Ask AI for a recipe" button. It prefills the request with a "max X kcal" constraint and runs the existing generator.

## 4. Late-night note

- In `onMealLogged`: if local time is between 22:30 and 03:59 and fasting mode is off, show one companion tip. The tip appears at most once per night (flag `latenight`).
- The meal always saves. Nothing blocks.
- Fix found during analysis: dashboard quick chips and recipe "Log" buttons call `store.addMeal` without `onMealLogged`. Badges and late-night notes therefore missed those paths. All `addMeal` call sites will call `onMealLogged`.

## 5. Story card

- New `src/utils/storyCard.js`: `buildStoryCard(summary, extras)` draws a 1080×1920 canvas and returns a PNG `Blob`.
  - Content: CalMal wordmark, date, kcal ring (in/target), remaining or over, P/C/F bars, water, streak, hero accent colour.
  - Draws text and shapes only, no meal thumbnails. This avoids tainted-canvas errors.
- `shareStoryCard()`: if `navigator.canShare({ files })` is true, use `navigator.share`. Otherwise download `calmal-YYYY-MM-DD.png`.
- Entry: a "Share day" button on the dashboard header, next to Scan.

## 6. Swipe-down bottom sheets

- `openSheet` in `src/components/ui.js` gains pointer-drag on the grip area: the grip plus the top 28 px of the sheet.
  - Drag moves the sheet with `translateY`. Releasing past 110 px, or with a fast flick, calls `close()`. Otherwise the sheet snaps back.
  - Skipped when `matchMedia('(min-width: 720px)')` matches. On desktop the grip is hidden.
  - The grip gets a larger hit area and `touch-action: none`.
- All existing sheets get this behaviour with no call-site changes.

## 7. Daily path map (Strava-style day view)

- Activity screen gets a "Daily path" day strip: 7 chips, today back to 6 days ago, each showing km. Days with no sessions are dimmed.
- Selecting a day draws every GPS session of that day on the existing Leaflet + OpenStreetMap map. No second map instance and no new dependency.
  - Each session uses its own colour from a fixed 5-colour list, with start (S) and finish (F) pins. The map fits bounds to all of that day's routes.
  - Summary row: sessions, total km, total steps (sum of saved `steps`), total kcal, total time.
- Selecting the same day again, or starting a run, clears the day view and returns to the live map. Day view and single-session inspect exclude each other.
- Dashboard activity card: a "Today's path" link to `#/activity`, which opens with today selected.
- Pure helper `dayRoutes(activities, date)` in `src/utils/dayRoutes.js` returns `{ sessions, km, steps, kcal, sec, coords }` and is unit tested.
- Limits (told to the user): the browser cannot count steps in the background or read Apple Health / Google Fit. Paths exist only for sessions recorded in CalMal.

## UI and copy

- Every new string goes in `i18n.js` in both EN and MS.
- Reuse existing tokens: `--hero-accent`, `.card`, `.chip`, `.badge`, `.btn`. No new colour palette.
- Mobile first: check at 320 px and 390 px widths. Tap targets ≥ 44 px.

## Testing

- Unit tests (node:test): `computeStreak` (gaps, shield earn and use, cap, today unlogged), `suggestFoods` (range, ordering, empty), and `prayerTimes` parse, cache and fallback with mocked `fetch`.
- `npm test`, `npm run build`, `git diff --check`.
- Browser pass: dashboard, recipes and profile at 390 px. Drag a sheet, export the story card, toggle fasting mode, and confirm no console errors.

## Risks

- Aladhan is a third-party API. It can be down or rate-limited. The cached and default fallback covers this, and the UI marks fallback times as approximate.
- City names must match Aladhan's geocoding. An unknown city gives an error, so the UI shows "City not found, using approximate times".
