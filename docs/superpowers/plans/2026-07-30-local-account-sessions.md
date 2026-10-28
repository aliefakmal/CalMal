# Local Account Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep CalMal users signed in locally and restore username-isolated progress through a saved-account list after sign out.

**Architecture:** A small local account index stores usernames and the active username. Each username owns an independent application-state key and sync queue. The existing store switches state only through the account service, while routing gates on the active account before onboarding.

**Tech Stack:** Vanilla JavaScript ES modules, browser localStorage, Vite 8, Node 22 built-in test runner.

**Spec:** `docs/superpowers/specs/2026-07-30-local-account-sessions-design.md`

## Global Constraints

- Never store passwords, plaintext or derived, in localStorage.
- Sign out clears only the active account, not account metadata or user progress.
- Resuming a saved account requires no password or biometric check.
- Local-only account behavior must not upload one account's state to another account's cloud identity.
- Preserve unrelated uncommitted changes in `companion.js`, `scanner.js`, and `screens.css`.
- Reuse CalMal's existing dark visual direction and native controls.

## Review Focus

- Duplicate usernames with different casing or whitespace must resolve to the same account; cover this in Task 1.
- Malformed account metadata or state must produce a usable error/default without deleting other accounts; cover this in Tasks 1 and 2.
- A storage write failure during account switching must not silently discard the current state; cover this in Task 2.
- Legacy migration must not overwrite an existing user store or remove its only backup; cover this in Task 1.
- Automatic sync callbacks after sign out or account switching must not write to the previous account; cover this in Task 3.

---

### Task 1: Local Account Registry and Migration

**Files:**
- Modify: `src/services/authService.js`
- Create: `tests/authService.test.js`
- Create: `tests/helpers/mockStorage.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `createLocalAccount(username, password) -> {username}`, `listLocalAccounts() -> [{username, createdAt}]`, `resumeLocalAccount(username) -> {username}`, `getActiveUsername() -> string|null`, `isCombinedAuthActive() -> boolean`, `hasCombinedAuthVault() -> boolean`, `signOut() -> Promise<void>`, `getAccountStorageKey(username) -> string`.
- Retains: `validateUsername(username)`, `validatePassword(password)`.

- [ ] **Step 1: Write failing registry tests**

Install a fresh mock `localStorage` before dynamically importing `authService.js`. Test normalization, current password rules, creation, duplicate rejection, sorted account listing, active-account persistence, sign-out retention, passwordless resume, unknown resume rejection, and absence of password text in every stored value. Seed `calmal_auth_v1` with a valid old vault plus `calmal.v1`; assert one-time migration to `getAccountStorageKey(username)`, an unchanged backup, and no overwrite of an existing migrated state.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/authService.test.js`
Expected: FAIL because the new local account functions are not exported.

- [ ] **Step 3: Implement the local account registry**

Replace the biometric/Supabase account service with a local registry at `calmal_accounts_v1` and active username at `calmal_active_username_v1`. Validate index records, normalize usernames, create accounts without persisting passwords, and retain accounts on sign out. Migrate the old `calmal_auth_v1` vault defensively: copy legacy state to the user key, preserve `calmal.v1.backup`, then remove the old state only after successful writes. Remove unused biometric and cloud helpers after confirming their consumers are updated in later tasks.

- [ ] **Step 4: Run the registry tests**

Run: `node --test tests/authService.test.js`
Expected: PASS, including malformed JSON and quota/write-failure cases.

- [ ] **Step 5: Add a repeatable test script**

Set `package.json` `test` to `node --test tests/*.test.js`. Run `npm test`.
Expected: PASS.

### Task 2: Username-Isolated Application State

**Files:**
- Modify: `src/services/store.js`
- Create: `tests/store.test.js`

**Interfaces:**
- Consumes: Task 1 account getters and storage-key function.
- Produces: `store.activateAccount(username) -> state`, `store.clearActiveAccount() -> void`, `store.getStorageKey() -> string|null`.
- Preserves: Existing `store.state`, profile, meals, activities, settings, reset, and subscription APIs.

- [ ] **Step 1: Write failing store tests**

Mock storage and dynamically import fresh auth/store modules. Test that account A writes only A's key, account B starts with defaults, returning to A restores profile/meals/activities/weights/recipes/settings, and reload restores A. Test that clearing the active account leaves both user stores intact and emits a routing notification. Seed malformed state and verify safe defaults. Force a failed persist before switching and assert the switch is rejected rather than losing the active state.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/store.test.js`
Expected: FAIL because the store still uses the shared `calmal.v1` key.

- [ ] **Step 3: Implement scoped state loading and switching**

Load state from the active username's key. Centralize safe default merging and array/object normalization. Make persistence report failure instead of silently continuing. `activateAccount` persists current state, resumes the account, reloads state, applies its hero theme, and notifies subscribers. `clearActiveAccount` persists current state and clears only session selection. Keep all existing tracking and summary methods unchanged.

- [ ] **Step 4: Run store and registry tests**

Run: `npm test`
Expected: PASS with no shared-state writes.

### Task 3: Account-Aware Sync Boundaries

**Files:**
- Modify: `src/services/syncService.js`
- Modify: `src/services/supabaseClient.js`
- Create: `tests/syncService.test.js`

**Interfaces:**
- Consumes: `getActiveUsername()` and `getAccountStorageKey(username)`.
- Produces: Username-scoped queue/status behavior; sync no-ops when no local account is active.

- [ ] **Step 1: Write failing sync-isolation tests**

Verify queues written for A are invisible for B and after sign out. Verify `mergeGuestDataToCloud` reads the active account's key rather than `calmal.v1`. Capture the user identity before each asynchronous operation and assert a delayed response cannot append an item to a different active account's queue.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/syncService.test.js`
Expected: FAIL because queue keys are global and migration reads `calmal.v1`.

- [ ] **Step 3: Scope queue operations and cancel stale cloud sync**

Derive queue/status suffixes from the active username, no-op without one, and read active user state through `getAccountStorageKey`. Prevent delayed `scheduleCloudSync` work from syncing stale state after an account change. Leave legacy unscoped queues untouched.

- [ ] **Step 4: Run all unit tests**

Run: `npm test`
Expected: PASS.

### Task 4: Create Account, Saved Accounts, and Sign Out UI

**Files:**
- Modify: `src/screens/auth.js`
- Modify: `src/main.js`
- Modify: `src/screens/profile.js`
- Delete: `src/components/authModal.js`
- Modify: `src/styles/screens.css`
- Modify: `src/screens/onboarding.js`
- Create: `tests/authFlow.test.js`

**Interfaces:**
- Consumes: Tasks 1 to 3 account/store APIs.
- Produces: `renderAuth(container, {onSuccess})`, `renderOnboarding(container, onComplete, {username})`, and a profile Sign Out control that calls `store.clearActiveAccount()` then routes.

- [ ] **Step 1: Write failing flow tests with a minimal DOM harness**

Test first-run Create Account rendering, saved usernames rendered as native buttons, one-click resume invoking the correct username, invalid/duplicate submission feedback, busy/disabled submission, and onboarding storing the active username in its profile. Test sign out invokes only session clearing and does not call reset or clear localStorage.

- [ ] **Step 2: Run the flow tests to verify they fail**

Run: `node --test tests/authFlow.test.js`
Expected: FAIL because saved-account selection and local sign out do not exist.

- [ ] **Step 3: Implement the account gate and controls**

Route to Create Account whenever there is no active username, before checking profile onboarding. On creation, activate the username and show onboarding. After sign out, render Create Account above a saved-account list whose buttons resume that username without credentials. On duplicate creation, direct the user to the saved account instead of overwriting it. Preserve status text for validation and storage errors. Replace obsolete account/biometric/cloud controls in Profile with current username, local-data explanation, and Sign Out. Remove `authModal.js` and its imports. Save `username` during onboarding. Keep reset explicitly destructive and scoped, never use `localStorage.clear()`.

- [ ] **Step 4: Style only the saved-account list and auth feedback**

Use existing CalMal colors, cards, buttons, and spacing. Give account buttons text labels, visible focus, 44px minimum targets, disabled states, and wrapping usernames. Avoid new decoration or animation. Check 320px, 768px, and desktop widths by code inspection and browser measurement.

- [ ] **Step 5: Run all tests and a production build**

Run: `npm test`
Run: `npm run build`
Expected: PASS and a Vite build with no module-resolution or syntax errors.

### Task 5: Browser Verification, Review, and Delivery

**Files:**
- Modify as required by verified defects only.
- Verify: All changed files and unrelated pre-existing modifications.

- [ ] **Step 1: Exercise the actual browser flow**

Create account A, finish onboarding, add a meal and setting, reload, sign out, create account B, verify empty progress, sign out, resume A without a password, and verify A's data. Check validation, duplicate handling, keyboard activation/focus, mobile overflow, and console errors. Do not claim checks that cannot be executed.

- [ ] **Step 2: Review the diff and protect existing work**

Run `git diff --check`, inspect the full auth/store/sync diff, and confirm the original `companion.js`, `scanner.js`, and motivation-popup CSS changes remain. Fix only confirmed related errors.

- [ ] **Step 3: Run final verification**

Run: `npm test`
Run: `npm run build`
Expected: PASS with no test or build failures.

- [ ] **Step 4: Commit and push**

Stage only intended implementation, tests, design, and plan files plus the preserved user changes after reporting their inclusion. Commit with `feat: restore local accounts without passwords`. Push `feat/hybrid-auth-sync` to `origin` and report the commit and remote result.
