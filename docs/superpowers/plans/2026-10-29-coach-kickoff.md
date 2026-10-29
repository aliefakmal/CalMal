# Coach Kickoff Implementation Plan

> Execute inline with executing-plans; use one independent final review.

Goal: add the approved four-second launch introduction and improve shared interactions without changing account or tracking behavior.
Architecture: a native DOM/SVG introduction owns its timers and input listeners. Bootstrap defers routing until completion. Shared styles and UI helpers provide consistent feedback.
Tech stack: existing JavaScript ES modules, CSS, Vite, node:test.
Spec: approved 2026-10-29-coach-kickoff-design.md in the earlier local source snapshot.

## Constraints and rulings

- User approved the design and delegated execution decisions. Implement inline; ask about the pull request after verification.
- Base: feat/hybrid-auth-sync at 36a5ec4ef12c68bb0bf9fc278780d7805efebc3d. Main is three commits ahead with no file differences reported by GitHub compare.
- Preserve current local-account-first routing. It supersedes the obsolete local biometric prototype.
- The current account reset already scopes data correctly. Do not rewrite it.
- No new runtime dependencies or new character art. Preserve existing swipe sheets.
- Git clone is unavailable because automatic approval review failed. Source is fetched with the authorized GitHub connector; preserve unchanged binary assets in the remote tree.

## Review focus

1. Skip racing timeout must call completion once and clear listeners.
2. Navigation during introduction must not bypass or restart it.
3. Reduced motion must stay static and immediately operable.
4. Nested dialogs must retain scroll lock and focus only the top dialog.
5. Rejected sign-out must restore its button even after event dispatch ends.

## Tasks

- [x] Add tests/intro.test.js: completion once, cleanup, reduced motion, Escape, and timer behavior. Run node --test tests/intro.test.js and observe failure before implementing.
- [x] Add src/components/intro.js exporting renderIntro(container, onComplete), returning cleanup; use four-second timeout, native Skip/Continue, EN/BM copy, existing coach emblems. Add src/styles/intro.css. Gate src/main.js route and startup with an in-memory completion flag; preserve hash and focus the next view.
- [x] Add regression tests for toast fallback and repeated loading state. Fix src/components/ui.js focus, nested sheet behavior, reduced-motion cleanup, loading labels, and drag cancellation. Preserve all openSheet callers.
- [x] Fix src/screens/profile.js sign-out handler by retaining the button before await; cover rejected sign-out in existing authFlow tests.
- [x] Add src/styles/interactions.css: scoped press/focus/disabled feedback, active navigation semantics, reduce decorative loops, final reduced-motion override. Preserve layouts and fonts.
- [x] Run existing and new node tests; build using installed dependencies. Browser-check launch/skip/reload, EN/BM, auth flow, navigation, sheets, keyboard and narrow layouts. Record limitations explicitly.
- [ ] Review changed files independently, fix important findings, produce a path-preserving patch and verification report, attempt one atomic GitHub update with an expected-head lease. Verify remote commit before claiming push. Ask about opening the pull request when ready; never merge automatically.
