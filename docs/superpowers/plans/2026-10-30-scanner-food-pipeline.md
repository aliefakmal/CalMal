# Scanner Food Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden food and barcode scanning, add account-isolated verified lookup caching, normalize AI nutrition output, and verify Phase 3/4 behavior.

**Architecture:** Keep scanner rendering in `src/screens/scanner.js`. Put pure identity, dedupe, nutrition validation, and AI normalization in small utilities. Extend existing `store.js`, `openFoodFacts.js`, `gemini.js`, `syncService.js`, and `supabase/schema.sql` without adding dependencies or changing account boundaries.

**Tech Stack:** Vanilla JS ES modules, `node:test`, ZXing, Gemini, Open Food Facts, localStorage, existing sync queue, Vite.

**Spec:** `docs/superpowers/specs/2026-10-30-scanner-food-pipeline-design.md`

## Global Constraints

- No new dependency or scanner library.
- Keep scan cache isolated by active username.
- Never let stale request results replace current scanner state.
- Reject incomplete or non-finite nutrition records before render or log.
- Raw images and prompts stay local; verified records use existing sync queue.
- Preserve current store, sync, i18n, and Supabase boundaries.
- Add English and Malay text for new user-facing states.
- Run `npm test`, `npm run build`, and `git diff --check` before delivery.

## Review Focus

1. Account switch during lookup: result and cache must stay with originating account. Pinned in Task 3.
2. Same barcode with spaces, hyphens, or leading zeroes: one normalized identity. Pinned in Task 1.
3. Open Food Facts product with missing macros or string `NaN`: reject and allow fallback. Pinned in Task 2.
4. Gemini response with duplicate, malformed, or zero-weight items: keep valid items and reject empty output. Pinned in Task 4.
5. Camera mode switch while request is pending: stop reader and ignore stale completion. Pinned in Task 5.

### Task 1: Scanner identity and deduplication helpers

**Files:**
- Create: `src/utils/scanner.js`
- Test: `tests/scanner.test.js`

**Interfaces:**
- Produces `normalizeBarcode(value) -> string | null`.
- Produces `imageFingerprint(dataUrl) -> string`.
- Produces `createScanGuard({ cooldownMs }) -> { begin(key), invalidate(), isLocked() }`.

- [ ] **Step 1: Write failing tests** for barcode normalization, deterministic image fingerprints, active request locking, cooldown rejection, and invalidation.
- [ ] **Step 2: Run** `node --test tests/scanner.test.js`; expect missing export failures.
- [ ] **Step 3: Implement** pure helpers with no DOM or storage access.
- [ ] **Step 4: Run** focused tests, then `npm test`; expect all pass.
- [ ] **Step 5: Commit** `feat(scanner): add scan identity and deduplication helpers`.

### Task 2: Nutrition validation and lookup filtering

**Files:**
- Modify: `src/services/openFoodFacts.js`
- Test: `tests/openFoodFacts.test.js`

**Interfaces:**
- Produces `isCompleteNutrition(record) -> boolean`.
- `lookupBarcode(code)` returns only normalized complete products or throws a typed not-found/incomplete error.

- [ ] **Step 1: Write failing tests** for valid records, numeric strings, missing name, missing serving basis, missing macro, `NaN`, and zero-calorie records.
- [ ] **Step 2: Run** `node --test tests/openFoodFacts.test.js`; expect missing export or current incomplete result failures.
- [ ] **Step 3: Implement** filtering and normalization around the existing Open Food Facts request. Preserve `scaleNutrients` behavior.
- [ ] **Step 4: Run** focused tests and full `npm test`.
- [ ] **Step 5: Commit** `fix(scanner): reject incomplete barcode nutrition`.

### Task 3: Account-isolated scan cache

**Files:**
- Modify: `src/services/store.js`, `src/services/syncService.js`, `supabase/schema.sql`
- Test: `tests/store.test.js` or new `tests/scanCache.test.js`

**Interfaces:**
- `store.getScanCache(identity) -> record | null`.
- `store.saveScanCache(identity, record) -> record`.
- `store.clearScanCache(identity) -> void`.
- Cache storage is scoped by `store.getStorageKey()` and active username.
- Supabase schema adds user-owned `food_scan_cache(identity unique, product jsonb, updated_at)` with RLS when cloud auth is enabled.

- [ ] **Step 1: Write failing tests** for save/read, account isolation, malformed cache entries, replacement by identity, and persistence across reload.
- [ ] **Step 2: Run** focused tests; expect missing methods.
- [ ] **Step 3: Implement** a bounded cache in account state with finite size and no raw image data. Use existing `emit` and sync queue only for verified records.
- [ ] **Step 4: Run** focused tests and full `npm test`.
- [ ] **Step 5: Commit** `feat(scanner): add account-isolated verified scan cache`.

### Task 4: Strict Gemini food normalization

**Files:**
- Modify: `src/services/gemini.js`, `src/constants/prompts.js`, `api/gemini.js`
- Test: `tests/gemini.test.js`

**Interfaces:**
- Produces `normalizeFoodAnalysis(value) -> normalized meal | null`.
- Normalized meal has finite `name`, `kcal`, `protein`, `carbs`, `fat`, `weight_g`, `items`, and `recommendation` fields.
- Item rows require a name, positive weight, and finite nutrition values.

- [ ] **Step 1: Write failing tests** for strict valid output, numeric strings, duplicate item names, malformed items, zero-weight items, and empty valid-item result.
- [ ] **Step 2: Run** focused tests; expect missing export or malformed output failures.
- [ ] **Step 3: Implement** normalization and update prompt/API schema to request component-level nutrition and local-food references.
- [ ] **Step 4: Run** focused tests and full `npm test`.
- [ ] **Step 5: Commit** `feat(scanner): normalize structured Gemini nutrition`.

### Task 5: Scanner lifecycle, stale guards, and hybrid pipeline

**Files:**
- Modify: `src/screens/scanner.js`, `src/utils/i18n.js`, `src/constants/malaysianFoods.js`
- Test: `tests/scanner.test.js`

**Interfaces:**
- Scanner uses Task 1 guard, Task 2 validation, Task 3 cache, and Task 4 normalization.
- Camera cleanup stops tracks, resets ZXing, clears analysis interval, and invalidates pending work.
- Barcode flow: cache -> Open Food Facts -> AI fallback.
- Food flow: local Malaysian match/reference -> Gemini -> normalized output -> verified cache after confirmation.

- [ ] **Step 1: Add failing tests** for mode-switch invalidation, duplicate barcode suppression, stale food result suppression, cache hit bypassing network, and fallback after incomplete product.
- [ ] **Step 2: Run** focused tests; expect current repeated/stale behavior.
- [ ] **Step 3: Wire** one cleanup path, generation tokens, scan guards, hybrid lookup, cache writes, and verified sync without changing existing result markup.
- [ ] **Step 4: Expand** `malaysianFoods.js` with a small reviewed set covering nasi, kuih, mamak drinks, kopitiam drinks, and hawker meals. Keep nutrition fields explicit per serving.
- [ ] **Step 5: Add bilingual error/status strings** and ensure retry returns to a clean scanner state.
- [ ] **Step 6: Run** focused tests, full `npm test`, and `npm run build`.
- [ ] **Step 7: Commit** `feat(scanner): harden camera flow and hybrid food lookup`.

### Task 6: Phase 4 verification and delivery record

**Files:**
- Modify: `docs/superpowers/specs/2026-10-30-scanner-food-pipeline-design.md`
- Test: all `tests/*.test.js`

- [ ] **Step 1: Run** `npm test` and record test count.
- [ ] **Step 2: Run** `npm run build` and inspect warnings/errors.
- [ ] **Step 3: Run** `git diff --check`; inspect only related diffs and preserve unrelated user files.
- [ ] **Step 4: Record** manual verification states and any residual risks in the design doc.
- [ ] **Step 5: Commit** `test(scanner): verify phase 3 and 4 pipeline`.
- [ ] **Step 6: Show** `git log --oneline -8` and working-tree status. Do not push without explicit approval.
