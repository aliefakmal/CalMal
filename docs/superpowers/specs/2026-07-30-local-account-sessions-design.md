# CalMal Local Account Sessions Design

## Intent

Let a CalMal user stay signed in on their browser, sign out to a fresh Create Account screen, and reopen an earlier account and all of its progress without entering a password again.

## Goals

- Keep one active local username across reloads and browser restarts.
- Store each user's complete application state under a username-specific localStorage key.
- Show all saved accounts after sign out and resume one with a single activation.
- Start a newly created account with empty application state and its own onboarding.
- Migrate the existing single-user state and biometric vault without deleting the original data.
- Keep local account state and queued sync operations isolated between accounts.

## Non-goals

- Password verification when resuming a saved account.
- Biometric or Supabase authentication in the local account flow.
- Cloud download or cross-device account recovery.
- Deleting saved data during sign out.
- A visual redesign of CalMal.

## Constraints

Anyone using the same browser profile and device can open a saved local account. This is convenience on a personal device, not authentication against another device user. Passwords are validated during account creation but are never stored. Reset Data remains a separate, confirmed destructive operation.

The existing CalMal dark theme, typography, spacing, components, and navigation are the design direction. Preserve uncommitted work in `src/components/companion.js`, `src/screens/scanner.js`, and `src/styles/screens.css`.

## Approaches

1. A single account map containing every user's state. This requires fewer keys but reads and writes every account together and raises the impact of malformed JSON.
2. Separate per-username state keys with a small account index, selected. This isolates reads, writes, and corruption and supports direct migration of `calmal.v1`.
3. Supabase-backed restoration. This does not satisfy local-only recovery and cannot securely support passwordless account selection on a shared browser.

## Architecture

`authService.js` owns the account index and active username. It exposes account creation, listing, resuming, sign-out, and migration of the old biometric vault. It stores only account metadata and the active username, never passwords or derived authentication secrets.

`store.js` owns the active user's state. Its storage key is `calmal.user.<encoded-username>`. Switching accounts persists the current state first, then loads only the selected account's state. A fresh account gets defaults. The legacy `calmal.v1` state is copied once to the migrated account and backed up before the old key is removed.

`syncService.js` derives queue and status keys from the active username. With no active account it does not enqueue or process mutations. Existing unscoped queues remain untouched.

`main.js` gates routing on a local active account before onboarding. `auth.js` presents Create Account plus saved-account buttons. `profile.js` shows the current username and a working Sign Out action; obsolete biometric/cloud controls are removed from this local flow.

## Verification

Test fresh account creation, validation, duplicate handling, persistence across a simulated reload, sign out, passwordless restoration, account isolation, complete state restoration, legacy migration, malformed storage, and queue isolation. Run the production build and exercise the changed controls at desktop and mobile widths. Commit and push the approved result to `feat/hybrid-auth-sync` without reverting unrelated user changes.
