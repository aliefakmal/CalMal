# Final Fix Report: Local Account Sessions

## 1. Guest state migration

`createLocalAccount` now runs guest migration only when creating the first account in an otherwise empty, valid registry. The account metadata is written before migration begins. `migrateLegacyStateToAccount(username)` copies `calmal.v1` to that account's storage key and creates `calmal.v1.backup` without using a vault, password, or cloud identity.

The helper does not overwrite a different destination or an existing backup. It reads back both required copies before removing `calmal.v1`. A destination, backup, parse, read, write, or verification failure leaves the legacy state available. The account metadata may remain after a failed migration, but the account is not activated; another new account cannot claim the guest data because the registry is no longer empty.

The existing legacy vault-plus-state migration is unchanged.

Regression coverage includes the Create Account flow, first-account migration, no inheritance by later accounts, preservation of existing destination/backup values, failed destination and backup writes, unverified writes, and activation blocking after migration failure.

## 2. Malformed account registry

Account reads retain their safe behavior: malformed or invalid registry data lists no accounts, or filters invalid records as before. Registry writes now use strict parsing and validation. `createLocalAccount` throws a readable storage error for malformed JSON, a non-array registry, or invalid records before writing metadata or migrating state.

Regression coverage verifies rejection and byte-for-byte preservation of the original malformed registry, with no destination or backup writes.

## 3. Local-only sync

All current accounts are local and have no binding to a Supabase user. The flow now disables remote access at every existing entry point:

- `processSyncQueue` is a no-op and never removes locally queued mutations.
- `enqueueMutation` and `enqueueStateSync` retain account-scoped local queues without processing them online.
- `mergeGuestDataToCloud` only copies active-account state into its local queue.
- Online and visibility cloud callbacks are removed.
- `scheduleCloudSync` is a no-op and creates no delayed work.
- `getCurrentUser` returns null without reading a persisted cloud session.
- Supabase is not constructed, preventing session reuse and automatic token refresh even when configuration values are present. Existing exports and the package dependency remain for compatibility.

`getSyncStatus` retains its `saved_offline` default and account-scoped status reads. Legacy unscoped queues remain untouched.

Regression coverage uses configured-looking clients and persisted-session responses to assert zero client construction, auth requests, table access, upserts, and queue deletion. It also covers account switching, sign out, local queue retention, and absence of online/visibility listeners.

## Verification

- `npm test`: PASS, 49 tests.
- `npm run build`: PASS. Vite retains its existing large-chunk warning.
- `git diff --cached --check`: run before commit.

## Remaining concern

A failed first-account guest migration intentionally leaves valid account metadata while blocking activation. The original guest state remains authoritative and later new accounts cannot inherit it. Recovery requires resolving the reported storage problem and using the saved account or migration path again.
