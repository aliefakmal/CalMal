# Phase 2 — Dashboard calorie ring, macros, body stats & polish

Date: 2026-10-29. Part 2 of 4 of the CalMal upgrade (source brief: `gemini-code-1793274558323.md`). Builds on Phase 1 (`2026-10-29-step-tracker-design.md`).

## Intent

The dashboard and profile answer "how am I doing today / overall" but read flat: a countdown ring, three static macro tiles, a BMI badge and three numbers. The user wants the same information to be graspable at a glance and to feel alive: a calorie card that shows *why* the number is what it is, macros that show what's left and where they came from, and body stats that place the user on a scale instead of listing numbers.

Mockups agreed in the visual companion (kept at `.superpowers/brainstorm/638-1793286554/content/`, git-ignored): `calorie-ring-v2.html` option B1 (replaces `calorie-card.html` B, whose segments could not add up), `macros.html` option A, `body-stats.html` option A.

## Goals

1. **Calorie card (dashboard):** segmented ring + equation, colour by the user's goal.
2. **Macros (dashboard):** three ring tiles with eaten / target / left / %, tap to expand per-meal breakdown.
3. **Body stats (profile):** bento with BMI scale first, BMR + TDEE, TDEE-to-target equation, weight progress.
4. **Steps on dashboard:** one row in the calorie card: today's steps / goal, links to Activity.
5. **Polish:** skeletons while AI generates in Recipes, press feedback on new tappable tiles, rings animate once on load, any missing icons added in the existing stroke style.

## Non-goals

- Redesign of Recipes, Scanner, Onboarding, or Activity screens (Scanner is Phase 3).
- Light theme. App stays dark-only.
- New data: nothing new is stored. Everything derives from `store.summary()`, `store.profile`, `store.state.weights`, and activities.
- Chart library or component framework.
- Changing the story card (`storyCard.js`) or the weekly calorie bank logic.

## Anti-goals

- Colour that rewards the wrong behaviour: a gain-goal user seeing green for under-eating.
- A ring whose segments don't add up to the numbers printed beside it.
- Endless/looping animation, or animation when `prefers-reduced-motion: reduce`.
- Breaking companion states, milestone celebrations (`celebrate:calories`, `celebrate:macros`), streak chip, water widget, fasting strip, story card share, or `en`/`ms` text.

## Constraints

- Vanilla JS template strings + inline SVG, as `ringSVG` and `renderWeightChart` do today. No new dependencies.
- Pure maths in `src/utils/calc.js`, unit-tested with `node --test`.
- Every user-facing string in both `en` and `ms` in `src/utils/i18n.js`.
- Phone first: 390 px wide, 16 px gutters, no horizontal scroll, tap targets ≥ 44 px.
- Existing tokens in `src/styles/index.css` (`--ok`, `--danger`, `--warn`, `--muted`, `--surface-3`, `--hero-accent`). New colours only as tokens.
- All 121 current tests keep passing.

## Approaches considered

- **Vanilla SVG in place (chosen).** Extends `ringSVG` / existing markup; pure helpers in `calc.js`. Smallest change, matches the codebase.
- Chart library (Chart.js etc.). Rejected: a dependency for three ring shapes and a bar; project already hand-draws SVG.
- Shared component layer. Rejected: the app is per-screen template strings; a component system is a refactor this phase doesn't need.

## Design

### 1. Calorie status — `calc.js`

`calorieStatus({ goal, target, kin, kout }) → { net, diff, state, label }`

- `net = kin − kout`; `diff = target − net` (positive = under target).
- `near` when `|net − target| ≤ 5% of target` (same band as the existing celebration rule in `store._rearmMilestones`).
- States and colour token by goal:

| goal | net < target (not near) | near | net > target (not near) |
|---|---|---|---|
| `lose` | `deficit` → `--ok` | `on_target` → `--ok` | `surplus` → `--danger` |
| `maintain` | `left` → neutral (`--muted` text, white ring) | `on_target` → `--ok` | `surplus` → `--danger` |
| `gain` | `eat_more` → `--warn` | `on_target` → `--ok` | ≤ +10 %: `on_target` → `--ok`; beyond: `surplus` → `--danger` |

- Missing/unknown goal → `maintain`.
- `label` is an i18n key: `cal_deficit`, `cal_left`, `cal_on_target`, `cal_surplus`, `cal_eat_more`.

Tested at each boundary for all three goals.

### 2. Segmented ring geometry — `calc.js`

`ringSegments({ target, kin, kout }) → { eaten, earnedFrom, earnedTo, left, over }` as fractions of one full turn (user-approved option B1: **the circle is today's allowance**):

- `allowance = target + kout` (burning calories earns room). `scale = max(allowance, kin)` so food never overflows.
- `eaten = kin / scale` — white arc from 12 o'clock.
- `left = max(0, allowance − kin) / scale` — grey arc after eaten. Invariant: `eaten + left = 1` when not over; `left × scale` equals the centre number whenever under target.
- `earnedFrom = target / scale`, `earnedTo = allowance / scale` — hatched band marking the room activity added, drawn at the end of the circle **under** the eaten arc (eaten paints over it when food reaches into it).
- `over = kin > allowance` — the eaten arc fills the circle.
- Edge cases: `kin = 0` → eaten 0, left 1; `kout = 0` → no hatched band; `target ≤ 0` → treat as 1.

Ring rendering: new `segmentedRingSVG({ size, stroke, segments, state })` in `src/components/ui.js` alongside `ringSVG`. Three `<circle>`s with `stroke-dasharray` offsets, drawn in order track → hatched earned band (SVG hatch pattern in the state colour) → eaten arc; eaten is white (or `--danger` when `calorieStatus(...).state === 'surplus'`, so ring, badge and companion always agree). Centre: `|diff|` large, state label below in state colour. Legend chips under the ring: Eaten {kin}, Left {max(0, diff)}, +{kout} earned by activity (hidden when kout = 0). Tap/Enter on the ring toggles the equation row `Food − Burned = Net / Target` (default: shown on ≥ 768 px, collapsed on phones; state remembered per session in a module variable, not storage).

The card keeps: Adjust target button, weekly bank pill. Badge text uses `label`.

### 3. Steps row in calorie card

Under the legend: `[step icon] 4,210 / 8,000 steps` with a thin progress bar; whole row is a link to `#/activity`. Steps = today's saved sessions (`dayRoutes(store.state.activities, todayKey()).steps`) + live session steps if `tracker.isActive()` (use `tracker.getStats().steps`). Goal = `store.profile.stepGoal || 8000`.

### 4. Macro ring tiles — `dashboard.js`

Three tiles (protein, carbs, fat), each a `<button>`:

- Small ring (`ringSVG`, size ~64) with `%` in centre; ring colour per macro (protein `--ok`, carbs and fat get new tokens `--macro-carbs` and `--macro-fat`, picked to pass 3:1 against `#0d0d0e`).
- `eaten / target g`, then `N g left`, or `N g over` in `--danger` when over target.
- `aria-expanded`, `aria-controls` the breakdown panel.

Breakdown panel (one shared panel under the row, shows the selected macro; tapping the same tile closes it):

- `calc.js`: `macroBreakdown(meals, key, limit = 3) → [{ name, grams, share }]` sorted desc, grams > 0 only; anything past `limit` merges into one `"+N others"` row. `share` = grams / total for the bar width.
- Empty state: "No {macro} logged yet today. Scan a meal to start." with a link to `#/scan`.

### 5. Body stats bento — `profile.js`

Replace the "Current Biometrics Summary" card's metric row with a bento grid (2 columns on phone):

- **BMI tile (full width):** value, category in category colour, scale bar with four bands (Asian cut-offs 18.5 / 23 / 27.5, display range 15–35, marker clamped to range), and "Normal range for you: X – Y kg" from `healthyWeightRange(heightCm) → [18.5·m², 22.9·m²]` rounded to 0.1.
  - `calc.js`: `bmiScalePosition(bmi) → 0..1`.
- **BMR tile** and **TDEE tile** (half width each). TDEE is a button; tap expands a full-width equation row: `BMR × activity = TDEE ± goal delta = daily target` using `calcBMR`, `calcTDEE`, `GOALS` delta, and `calcDailyTarget` (if `customTarget` is set, show "custom target" instead of the delta step; if `calcSuggestedDailyTarget` hit its 1200 kcal floor, show a "min 1,200" step so the sum adds up).
- **Weight tile (full width):** existing `renderWeightChart` kept, plus a start → now → target progress bar. Start = first entry in `store.state.weights` (by date); progress `= (start − now) / (start − target)` clamped 0..1, direction-aware for gain goals. Header shows "−4.0 kg so far" (sign by direction). Fewer than 2 weights: bar still shows start = now, chart shows existing empty message.
  - `calc.js`: `weightProgress({ start, now, target }) → { pct, deltaKg, toGoKg }`.
- Log-weight input stays below the bento, unchanged.

Badges for goal and BMI in the card header are removed (BMI tile carries it; goal is in the equation row).

### 6. Polish

- **Skeletons:** Recipes AI meal plan and AI recipe generation show skeleton cards shaped like the result (title line, 3 ingredient lines, macro row) using the existing `.skeleton` class, replacing the spinner-only state. Under reduced motion the shimmer is off (static block).
- **Press feedback:** new tappable tiles get `transform: scale(0.97)` on `:active` (≤ 120 ms), and a visible `:focus-visible` ring.
- **Ring animation:** reuse `animateRings()`; one transition on load, none on re-render from tracker ticks. Reduced motion: no transition.
- **Icons:** add `footprints` (steps row) and any other missing glyph to `icons.js` matching the current stroke width/caps.

### 7. Companion & celebrations

Companion state (`over_limit` / `goal_hit` / `idle`) and milestone flags keep their current rules. `over_limit` switches to `calorieStatus(...).state === 'surplus'` so the companion agrees with the ring colour.

## Tests

`tests/calc.test.js` additions:

- `calorieStatus`: lose/maintain/gain × under/near/over; gain +9 % → on_target, +11 % → surplus; missing goal → maintain; boundary exactly 5 %.
- `ringSegments`: mockup day (1850/1240/310) → eaten 1240/2160, left 920/2160, earned 1850/2160..1; `eaten + left = 1` when under; `kin = 0`; `kout = 0` (earnedFrom = earnedTo); `kin > allowance` sets `over` and `eaten = 1`; target 0.
- `macroBreakdown`: sort, zero-gram skip, `+N others` merge, empty.
- `healthyWeightRange`, `bmiScalePosition` (clamp below 15 and above 35), `weightProgress` (lose, gain, overshoot clamps to 1, start == target).

UI verified in headless Chrome at 390 px: each goal colour state, macro expand/collapse via click and keyboard, TDEE equation toggle, no console errors, no horizontal overflow, `ms` strings.

## Decided by the user

- Colour follows each user's goal (table in §1); deficit is a positive state for `lose`.
- Calorie ring: segmented ring, option B1 (circle = target + burned).
- Macros: ring tiles with inline breakdown. Body stats: BMI scale first.
- Steps row on the dashboard; polish scope as listed in §6.

## Calls made by the designer (not user decisions)

- Near-target band ±5 % of target, measured on net (equivalent to food within ±5 % of target + burned, close to the celebration rule); gain surplus allowed to +10 %.
- Red ring only in the `surplus` state, never for an on-target overshoot.
- Equation row collapsed by default on phones, shown on ≥ 768 px.
- Macro breakdown shows top 3 meals, rest merged.
- Skeletons only in Recipes AI generation: the dashboard "Adjust target" is local maths, so nothing there waits on an API.
- Companion `over_limit` follows the new surplus state.
- Goal and BMI header badges removed from the profile card.

## Left to the builder

- Exact hatch pattern, ring sizes, and spacing, matching the mockups and existing card styles.
- Exact token values for `--macro-carbs` / `--macro-fat` (must pass 3:1 on `#0d0d0e`).
