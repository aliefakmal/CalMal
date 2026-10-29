# Phase 2 Dashboard & Body Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Goal-aware segmented calorie ring with steps row, expandable macro ring tiles, a BMI-first body stats bento, and AI-loading skeletons.

**Architecture:** All maths as pure functions in `src/utils/calc.js`; one new SVG helper `segmentedRingSVG` in `src/components/ui.js`; markup rewrites stay inside `src/screens/dashboard.js` and `src/screens/profile.js`; skeletons in `src/screens/recipes.js`. No new state is stored.

**Tech Stack:** Vanilla JS ES modules, inline SVG, Vite, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-29-dashboard-body-stats-design.md`

## Global Constraints

- No new dependencies. No chart library.
- Every new user-facing string in both `en` and `ms` in `src/utils/i18n.js`.
- Phone first: 390 px wide, no horizontal scroll, tap targets ≥ 44 px, visible `:focus-visible`.
- New colours only as tokens on `:root` in `src/styles/index.css` (`--macro-carbs`, `--macro-fat`, ≥ 3:1 against `#0d0d0e`).
- No looping animation; under `prefers-reduced-motion: reduce` rings and shimmer don't animate.
- Near-target band ±5 % of target on net; gain may go to +10 % and stay `on_target`.
- Ring is red only when `state === 'surplus'`.
- Companion, milestone flags, streak chip, water widget, fasting strip, story card keep working.
- All 121 current tests keep passing: `npm test`.

## Review Focus

1. Brand-new user: no meals, no `goal`, no `targetWeight` → card shows "maintain" grey ring, no `NaN` anywhere. Pinned in Task 1 (`calorieStatus missing goal`, `weightProgress without target`).
2. Meals with missing or string macro values (`null`, `"12"`) → breakdown treats them as numbers or skips them, never `NaN g`. Pinned in Task 1 (`macroBreakdown coerces and skips bad values`).
3. Profile with no height → no "normal range" line instead of `NaN – NaN kg`. Pinned in Task 1 (`healthyWeightRange without height`).
4. More food than allowance, plus heavy exercise → ring full red, `Left 0`, legend never negative. Pinned in Task 1 (`ringSegments over allowance`) and Task 2 (`surplus ring is red`).
5. Long Malay meal names in the breakdown at 390 px → truncate with ellipsis, no overflow. Pinned in Task 4 Step 5 browser check.

---

### Task 1: Calc helpers

**Files:**
- Modify: `src/utils/calc.js` (append)
- Test: `tests/calc.test.js` (append)

**Interfaces:**
- Produces:
  - `calorieStatus({ goal, target, kin, kout }) → { net, diff, state: 'deficit'|'left'|'on_target'|'surplus'|'eat_more', label: 'cal_<state>' }`
  - `ringSegments({ target, kin, kout }) → { eaten, left, earnedFrom, earnedTo, over }` (fractions of one turn)
  - `macroBreakdown(meals, key, limit = 3) → Array<{ name: string|null, grams, share, others?: number }>` (`name: null` + `others: N` for the merged row)
  - `healthyWeightRange(heightCm) → [min, max] | null`
  - `bmiScalePosition(bmi) → number` in 0..1
  - `weightProgress({ start, now, target }) → { pct, deltaKg, toGoKg }` (`toGoKg: null` when no target)

- [x] **Step 1: Append failing tests to `tests/calc.test.js`**

```js
import { calorieStatus, ringSegments, macroBreakdown, healthyWeightRange, bmiScalePosition, weightProgress } from '../src/utils/calc.js';

const cs = (goal, net, target = 2000) => calorieStatus({ goal, target, kin: net, kout: 0 }).state;
test('calorieStatus lose', () => { assert.equal(cs('lose', 1500), 'deficit'); assert.equal(cs('lose', 1900), 'on_target'); assert.equal(cs('lose', 2101), 'surplus'); });
test('calorieStatus maintain', () => { assert.equal(cs('maintain', 1500), 'left'); assert.equal(cs('maintain', 2100), 'on_target'); assert.equal(cs('maintain', 2101), 'surplus'); });
test('calorieStatus gain', () => { assert.equal(cs('gain', 1500), 'eat_more'); assert.equal(cs('gain', 2180), 'on_target'); assert.equal(cs('gain', 2221), 'surplus'); });
test('calorieStatus missing goal', () => assert.equal(cs(undefined, 1500), 'left'));
test('calorieStatus net and diff use burned', () => {
  const r = calorieStatus({ goal: 'lose', target: 1850, kin: 1240, kout: 310 });
  assert.deepEqual([r.net, r.diff, r.label], [930, 920, 'cal_deficit']);
});

test('ringSegments mockup day', () => {
  const r = ringSegments({ target: 1850, kin: 1240, kout: 310 });
  assert.ok(Math.abs(r.eaten - 1240 / 2160) < 1e-9);
  assert.ok(Math.abs(r.left - 920 / 2160) < 1e-9);
  assert.ok(Math.abs(r.earnedFrom - 1850 / 2160) < 1e-9);
  assert.equal(r.earnedTo, 1);
  assert.equal(r.over, false);
  assert.ok(Math.abs(r.eaten + r.left - 1) < 1e-9);
});
test('ringSegments empty day', () => assert.deepEqual(ringSegments({ target: 2000, kin: 0, kout: 0 }), { eaten: 0, left: 1, earnedFrom: 1, earnedTo: 1, over: false }));
test('ringSegments over allowance', () => { const r = ringSegments({ target: 1800, kin: 2600, kout: 400 }); assert.equal(r.eaten, 1); assert.equal(r.left, 0); assert.equal(r.over, true); });
test('ringSegments zero target', () => assert.equal(ringSegments({ target: 0, kin: 0, kout: 0 }).left, 1));

test('macroBreakdown sorts and merges', () => {
  const meals = [{ name: 'A', protein: 5 }, { name: 'B', protein: 30 }, { name: 'C', protein: 0 }, { name: 'D', protein: 10 }, { name: 'E', protein: 15 }];
  const r = macroBreakdown(meals, 'protein');
  assert.deepEqual(r.map((x) => x.name), ['B', 'E', 'D', null]);
  assert.equal(r[3].others, 1);
  assert.equal(r[3].grams, 5);
  assert.ok(Math.abs(r[0].share - 0.5) < 1e-9);
});
test('macroBreakdown coerces and skips bad values', () => {
  const r = macroBreakdown([{ name: 'A', fat: '12' }, { name: 'B', fat: null }, { name: 'C', fat: 'x' }], 'fat');
  assert.deepEqual(r, [{ name: 'A', grams: 12, share: 1 }]);
});
test('macroBreakdown empty', () => assert.deepEqual(macroBreakdown([], 'carbs'), []));

test('healthyWeightRange', () => assert.deepEqual(healthyWeightRange(172), [54.7, 67.7]));
test('healthyWeightRange without height', () => { assert.equal(healthyWeightRange(0), null); assert.equal(healthyWeightRange(undefined), null); });
test('bmiScalePosition clamps', () => { assert.equal(bmiScalePosition(10), 0); assert.equal(bmiScalePosition(40), 1); assert.ok(Math.abs(bmiScalePosition(26.4) - 0.57) < 1e-9); });

test('weightProgress lose', () => assert.deepEqual(weightProgress({ start: 82, now: 78, target: 70 }), { pct: 1 / 3, deltaKg: -4, toGoKg: 8 }));
test('weightProgress gain', () => assert.deepEqual(weightProgress({ start: 60, now: 63, target: 66 }), { pct: 0.5, deltaKg: 3, toGoKg: 3 }));
test('weightProgress overshoot clamps', () => assert.equal(weightProgress({ start: 82, now: 68, target: 70 }).pct, 1));
test('weightProgress start equals target', () => assert.equal(weightProgress({ start: 70, now: 70, target: 70 }).pct, 1));
test('weightProgress without target', () => assert.deepEqual(weightProgress({ start: 70, now: 69, target: undefined }), { pct: 0, deltaKg: -1, toGoKg: null }));
```

- [x] **Step 2: Run `node --test tests/calc.test.js`.** Expected: FAIL, missing export.

- [x] **Step 3: Implement in `src/utils/calc.js`**

- `calorieStatus`: `net = kin − kout`, `diff = target − net`, `t = target > 0 ? target : 1`; `near = |net − t| ≤ 0.05·t`; under = `net < t`. Unknown goal → `maintain`. Gain: over and `net ≤ 1.10·t` → `on_target`. Table in spec §1.
- `ringSegments`: spec §2 formulas, `allowance = t + kout`, `scale = max(allowance, kin)`.
- `macroBreakdown`: `grams = Number(m[key])`, keep only finite `> 0`; sort desc; total over all kept; first `limit` rows as `{ name, grams, share }`; remainder merged as `{ name: null, others: n, grams: sum, share }` only when `n > 0`.
- `healthyWeightRange`: `null` unless `heightCm > 0`; `m² = (h/100)²`; `[round1(18.5·m²), round1(22.9·m²)]`.
- `bmiScalePosition`: `(clamp(bmi, 15, 35) − 15) / 20`.
- `weightProgress`: `deltaKg = round1(now − start)`; no finite target → `{ pct: 0, deltaKg, toGoKg: null }`; `start === target` → pct 1; else `clamp((start − now)/(start − target), 0, 1)`; `toGoKg = round1(|target − now|)`.

- [x] **Step 4: Run `npm test`.** Expected: all pass.
- [x] **Step 5: Commit**: `git commit -m "feat(calc): calorie status, allowance ring, macro breakdown and body stat helpers"`

---

### Task 2: `segmentedRingSVG`

**Files:**
- Modify: `src/components/ui.js` (after `ringSVG`)
- Test: `tests/ui.test.js` (append)

**Interfaces:**
- Consumes: `ringSegments` output from Task 1.
- Produces: `segmentedRingSVG({ size, stroke, segments, state }) → string` (SVG). Root has class `seg-ring seg-<state>`; eaten arc has class `seg-eaten`, earned band `seg-earned` (omitted when `earnedTo − earnedFrom` is 0), track `ring-track`. Arcs start at 12 o'clock.

- [x] **Step 1: Failing tests**

```js
import { segmentedRingSVG } from '../src/components/ui.js';
test('earned band omitted without activity', () => {
  const svg = segmentedRingSVG({ size: 100, stroke: 10, segments: { eaten: 0.5, left: 0.5, earnedFrom: 1, earnedTo: 1, over: false }, state: 'deficit' });
  assert.ok(!svg.includes('seg-earned'));
  assert.ok(svg.includes('seg-eaten'));
});
test('surplus ring is red', () => {
  const svg = segmentedRingSVG({ size: 100, stroke: 10, segments: { eaten: 1, left: 0, earnedFrom: 0.8, earnedTo: 1, over: true }, state: 'surplus' });
  assert.ok(svg.includes('seg-surplus'));
  assert.ok(svg.includes('seg-earned'));
});
```

- [x] **Step 2: Run `node --test tests/ui.test.js`.** Expected: FAIL.
- [x] **Step 3: Implement.** Use `stroke-dasharray`/`dashoffset` like `ringSVG`, and the `data-target` animation pattern so `animateRings` animates the eaten arc. Unique hatch `<pattern>` id per call. Colours come from CSS classes (Task 3), not inline.
- [x] **Step 4: Run `npm test`.** Expected: all pass.
- [x] **Step 5: Commit**: `git commit -m "feat(ui): segmented allowance ring"`

---

### Task 3: Dashboard calorie card + steps row

**Files:**
- Modify: `src/screens/dashboard.js` (calorie card block ~L111–198, companion state ~L117–123), `src/utils/i18n.js`, `src/styles/screens.css`, `src/styles/index.css` (tokens)

**Interfaces:**
- Consumes: `calorieStatus`, `ringSegments` (Task 1); `segmentedRingSVG` (Task 2); `dayRoutes` (`src/utils/dayRoutes.js`); `tracker.isActive()`, `tracker.getStats().steps` (`src/services/gpsTracker.js`); `icons.footprints`.

- [x] **Step 1: Replace ring logic.** `const status = calorieStatus({ goal: p.goal, target: s.target, kin: s.kin, kout: s.kout })`. `isOver` becomes `status.state === 'surplus'` everywhere it is used (companion `over_limit`, sound key).
- [x] **Step 2: Card markup.** Badge text `t(status.label)`. Ring: `segmentedRingSVG({ size: 210, stroke: 12, segments: ringSegments(...), state: status.state })`. Centre: `Math.abs(status.diff)`, label `t(status.label)` in the state colour. Legend chips: eaten `s.kin`, left `max(0, status.diff)`, `+s.kout` earned (hidden when 0). The ring is a `<button aria-expanded>` that toggles the equation row (`Food − Burned = Net / Target`). Default: open on ≥ 768 px via `matchMedia`, otherwise closed; the toggled state is held in a module-level variable. Keep the Adjust button and weekly bank pill.
- [x] **Step 3: Steps row** under the legend: `<a href="#/activity">` with footprints icon, `{steps} / {goal}` and a thin bar. Steps = `dayRoutes(store.state.activities, todayKey()).steps + (tracker.isActive() ? tracker.getStats().steps : 0)`, goal = `store.profile?.stepGoal || 8000`.
- [x] **Step 4: CSS + i18n.** State classes `.seg-deficit/.seg-on_target` → `--ok`, `.seg-left` → white eaten and muted label, `.seg-eat_more` → `--warn`, `.seg-surplus` → `--danger` eaten and label. Keys in `en` + `ms`: `cal_deficit`, `cal_left`, `cal_on_target`, `cal_surplus`, `cal_eat_more`, `cal_eaten`, `cal_left_chip`, `cal_earned`, `cal_net`, `cal_show_math`, `steps_of_goal`.
- [x] **Step 5: Verify.** `npm test` all pass. `npm run build` succeeds. In headless Chrome at 390 px, check `goal` = lose / maintain / gain with under, near and over meal sets: badge text, ring colour and centre number match. Check the equation toggle works by click and by Enter. Check `ms` strings, no console errors and `scrollWidth ≤ innerWidth`.
- [x] **Step 6: Commit**: `git commit -m "feat(dashboard): goal-aware allowance ring and steps row"`

---

### Task 4: Macro ring tiles + breakdown

**Files:**
- Modify: `src/screens/dashboard.js` (macro card ~L207–234), `src/utils/i18n.js`, `src/styles/screens.css`, `src/styles/index.css`

**Interfaces:**
- Consumes: `macroBreakdown` (Task 1), `ringSVG`, `s.meals` from `store.summary()`.

- [x] **Step 1: Tiles.** Three `<button class="macro-tile" aria-expanded aria-controls="macro-breakdown">`, each with `ringSVG({ size: 64, stroke: 6, progress: eaten/target })`, a `%` in the centre, `eaten / target g`, and `N g left` or `N g over` (`--danger`). Ring colour per macro: protein `--ok`, carbs `--macro-carbs`, fat `--macro-fat`.
- [x] **Step 2: Breakdown panel** `#macro-breakdown` under the row, for the selected macro only. Tapping the same tile again closes it. Rows show name (ellipsis), grams and a share bar. The merged row reads `t('mac_others').replace('{n}', others)`. Empty state: `mac_empty` with the macro name and a link to `#/scan`. The selected macro is held in a module-level variable so a re-render keeps it.
- [x] **Step 3: i18n** `mac_left`, `mac_over`, `mac_by_meal`, `mac_others`, `mac_empty` in `en` + `ms`. Tokens `--macro-carbs`, `--macro-fat`: check contrast with the antislop contrast tool.
- [x] **Step 4: Remove** the old `.macro-mini-tile` markup, plus its CSS if nothing else uses it (grep first).
- [x] **Step 5: Verify.** `npm test`. In the browser at 390 px: expand/collapse by tap and keyboard; switch between macros; empty day; a meal named `Nasi Kandar (Nasi + Ayam Goreng + Sayur Kubis + Kuah Campur)` truncates without overflow.
- [x] **Step 6: Commit**: `git commit -m "feat(dashboard): macro ring tiles with per-meal breakdown"`

---

### Task 5: Profile body stats bento

**Files:**
- Modify: `src/screens/profile.js` (biometrics card ~L136–200), `src/utils/i18n.js`, `src/styles/screens.css`

**Interfaces:**
- Consumes: `healthyWeightRange`, `bmiScalePosition`, `weightProgress` (Task 1); existing `calcBMI`, `bmiLabel`, `calcBMR`, `calcTDEE`, `calcSuggestedDailyTarget`, `calcDailyTarget`, `GOALS`, `renderWeightChart`.

- [x] **Step 1: Bento** replaces the header badges and the `.equation` row. Tiles:
  - **BMI** (full width): value, category, four-band scale (15 / 18.5 / 23 / 27.5 / 35) with a marker at `bmiScalePosition`, and the normal-range line only when `healthyWeightRange` is not null.
  - **BMR** and **TDEE** (half width each). TDEE is a `<button aria-expanded>` that toggles the equation row:
    - Normal: `BMR × activity = TDEE ± goal delta = daily target`.
    - `customTarget` set: the last step reads `custom target {n}`.
    - Floor applied (`calcSuggestedDailyTarget` > `TDEE + delta`): adds a `min 1,200` step.
  - **Weight** (full width): `renderWeightChart`, plus a start → now → target bar from `weightProgress`. Start = earliest entry in `store.state.weights` (else `profile.weight`). Header shows `deltaKg` with its sign.
- [x] **Step 2: i18n** `body_bmi`, `body_normal_range`, `body_bmr`, `body_bmr_sub`, `body_tdee`, `body_tdee_sub`, `body_weight`, `body_so_far`, `body_start`, `body_now`, `body_target`, `body_min_floor`, `body_custom_target` in `en` + `ms`.
- [x] **Step 3: Verify.** `npm test`. In the browser at 390 px:
  - Profile with 2+ weights, no `targetWeight`, and with `customTarget`.
  - TDEE toggle by click and by keyboard.
  - Log-weight input still saves.
  - `ms` strings, no overflow.
- [x] **Step 4: Commit**: `git commit -m "feat(profile): BMI-first body stats bento"`

---

### Task 6: Polish

**Files:**
- Modify: `src/screens/recipes.js` (~L1350 recipe result, ~L1420 `renderMealPlanner`), `src/styles/interactions.css`, `src/styles/index.css` (reduced-motion block ~L714), `public/sw.js`

- [ ] **Step 1: Skeletons.** While `isGenerating`, render a skeleton block in place of `renderRecipeCard(currentRecipe)`. While `isGeneratingPlan`, render one in place of the planner question card. Shape: title line, 3 ingredient lines, a macro row, all built with the existing `.skeleton` class. Add `aria-busy="true"` and a visually hidden `rec_generating` label.
- [ ] **Step 2: Press feedback.** In `interactions.css`, `.macro-tile, .seg-ring-btn, .tdee-btn, .step-row` get `:active { transform: scale(0.97) }` (120 ms) and a `:focus-visible` outline.
- [ ] **Step 3: Reduced motion.** Under `prefers-reduced-motion: reduce`: `.skeleton { animation: none }` and ring fills `transition: none`.
- [ ] **Step 4: SW.** Bump `CACHE` to `calmal-v28`.
- [ ] **Step 5: Verify.** `npm test` all pass; `npm run build`. In the browser, stub `generateRecipe` with a delayed promise and screenshot the skeleton. Emulate reduced motion and confirm no transitions on the dashboard.
- [ ] **Step 6: Commit**: `git commit -m "feat(ui): AI skeletons, press feedback, reduced-motion rings"`
