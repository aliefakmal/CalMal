# Phase 3 and 4 Scanner Food Pipeline Design

## Intent

Make food and barcode scanning reliable on phones, prevent duplicate or stale results, improve nutrition lookup quality, and prove the flow with tests.

## Goals

- Stop camera tracks, ZXing readers, timers, and pending work when scanner leaves or changes mode.
- Reject duplicate barcodes and repeated image scans during active requests and short cooldowns.
- Use per-account verified scan cache before Open Food Facts and AI fallback.
- Accept only complete, finite nutrition records before rendering or logging.
- Normalize Gemini food output into one strict meal schema with item-level nutrition.
- Keep current `store.js`, `syncService.js`, i18n, and Supabase boundaries.
- Add pure unit tests for deduplication, nutrition filtering, cache isolation, and response normalization.

## Non-goals

- No new dependency or scanner library.
- No broad redesign of Scanner UI.
- No automatic cloud upload of unverified AI output.
- No sharing of scan cache between local accounts.
- No push or pull unless the user explicitly requests GitHub delivery after verification.

## Approaches

1. **Scanner reliability first**: fix lifecycle and duplicate guards, then leave lookup behavior mostly unchanged. Lowest risk, but weak nutrition coverage remains.
2. **Food pipeline first**: expand lookup and AI normalization, then patch scanner lifecycle. Better data quality, but stale camera requests can still corrupt results during rollout.
3. **Balanced pipeline**: add small pure helpers for lifecycle guards, deduplication, nutrition validation, and cache access; wire existing scanner and lookup services through them. This keeps changes reviewable and protects both camera state and nutrition trust. Selected because it covers the user request without new infrastructure.

## Decisions

- Cache key includes active username and normalized scan identity.
- Barcode identity uses trimmed digits; image identity uses a deterministic hash of the captured data URL.
- A request carries a generation token. Results from older generations cannot replace current state.
- Open Food Facts records pass only when name, serving basis, calories, protein, carbs, and fat are finite.
- AI fallback runs only after local cache and Open Food Facts fail.
- AI results are normalized before display. Invalid items are dropped; an empty result becomes an error state.
- Verified barcode and manually confirmed meal records enter existing sync queue. Raw images and prompts stay local.
- When Supabase schema is deployed, verified cache metadata syncs to a user-owned `food_scan_cache` table. Local-only accounts remain local.
- New user-facing text gets English and Malay entries.

## Verification

- Run focused unit tests for helpers and scanner service behavior.
- Run full `npm test` and `npm run build`.
- Inspect 390 px scanner states: permission denied, camera active, duplicate barcode, stale response, empty lookup, valid result, and error retry.
- Run `git diff --check` and commit only related files.

### Phase 3/4 Verification Record (2026-10-30)

- Automated suite: `node --experimental-test-module-mocks --test tests/*.test.js` — 155/155 passing.
- Production build: `node_modules\\.bin\\vite.cmd build` — passed; Vite reports one existing large-chunk warning.
- Diff hygiene: `git diff --check` — passed.
- Camera cleanup covers media tracks, ZXing reset, analysis timer, request generation, and scan guard invalidation.
- Cache checks cover account isolation, malformed entries, replacement, reload persistence, and raw image stripping.
- Nutrition checks cover incomplete Open Food Facts records and malformed Gemini items.
- Manual 390 px device verification remains pending because no physical camera session was available.

Residual risk: barcode AI fallback estimates a meal-shaped record when Open Food Facts has no complete product; user must review before logging.
