# Phase 3 & 4 — Scanner Camera Stability, Malaysian Food Database & Final Verification

Date: 2026-10-30  
Source Brief: `C:\Users\USER\Downloads\gemini-code-1793274558323.md`  
Builds on: Phase 1 (`step-tracker`) & Phase 2 (`dashboard-body-stats`)  
Branch: `feat/strava-steps-ui-scanner-upgrade`

---

## 1. Intent & Scope

Upgrade the food logging scanner (`src/screens/scanner.js`) into a robust 3-in-1 scanner (Barcode, Food Camera AI, and Manual Search) backed by a comprehensive Malaysian food database, with reliable hardware resource handling, caching, and regression-free test coverage.

---

## 2. Phase 3: Technical Specifications

### A. Camera Input/Output Stability (`src/screens/scanner.js`)
1. **MediaStream Lifecycle:**
   - Explicitly stop all camera tracks (`track.stop()`) on component unmount, navigation changes, or camera switch to prevent hanging hardware locks.
   - Clean handling of user camera permission denial or unavailable hardware.
2. **Debounce & Deduplication:**
   - Implement frame hash or barcode deduplication to prevent spamming backend requests while pointing at a barcode.
   - Request locking (`isProcessing` latch) to discard incoming frames until current inference or API query settles.
   - Never display stale result cards from prior scans.
3. **Visual Feedback:**
   - Active viewfinder reticle with animated scanning target.
   - Clear state banners: "Searching database...", "Analyzing Malaysian dish...", and human-friendly error messages when items are unreadable.

### B. Hybrid Lookup Pipeline & Malaysian Food Database
**Files:** `src/constants/malaysianFoods.js`, `src/services/openFoodFacts.js`, `src/services/gemini.js`, `api/gemini.js`, `src/constants/prompts.js`, `src/services/store.js`, `src/services/syncService.js`

1. **Expanded Malaysian Food Catalog (`src/constants/malaysianFoods.js`):**
   - Add local meals with realistic portion sizes (grams), calibrated kcal, protein, carbs, and fat:
     - Nasi Berlauk (Nasi Lemak, Nasi Kerabu, Nasi Kandar, Nasi Dagang).
     - Hawkers & Noodles (Char Kway Teow, Laksa, Mee Goreng Mamak, Roti Canai).
     - Kuih-Muih & Snacks (Karipap, Kuih Seri Muka, Pisang Goreng).
     - Mamak / Kopitiam Drinks (Teh Tarik, Kopi O, Milo Ais, Limau Ais).
2. **Layered Hybrid Pipeline:**
   - **Tier 1 (Local / IndexedDB / Supabase):** Instant exact match from cached user meals and local catalog.
   - **Tier 2 (Barcode via OpenFoodFacts):** Query `openFoodFacts.js`, filter incomplete records, and map product nutrients cleanly.
   - **Tier 3 (Food Photo via Gemini AI):** Send camera snapshot to `gemini.js`. Prompt instructs AI to identify individual dish components, calibrate nutrition against Malaysian portion standards, and return strictly valid JSON matching application schema.
3. **Persistence:**
   - Save verified lookup items into local cache (`store.js`) and queue offline sync to Supabase (`syncService.js`).

---

## 3. Phase 4: Verification & GitHub Release

1. **Unit Testing:**
   - Add `tests/scanner.test.js` covering camera state lifecycle, debounce logic, barcode deduplication, and lookup fallback cascade.
2. **Full Regression Gate:**
   - Verify all tests pass (`npm test`).
   - Verify Vite production build succeeds (`npm run build`).
   - Validate backward compatibility: accounts, local sessions, Bakugo/Deku audio companion, prayer times, and `en`/`ms` translations.
3. **Git Release:**
   - Clean commits per task.
   - Push completed branch `feat/strava-steps-ui-scanner-upgrade`.
