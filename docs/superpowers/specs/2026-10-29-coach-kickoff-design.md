# CalMal coach kickoff and interaction design

Status: approved by the user on 2026-10-29. Implementation follows the latest branch's local-account-first routing, as subsequently delegated by the user.

## Intent and agreed direction

Introduce CalMal before users enter its existing app flow. Preserve food scanning, nutrition logs, activity tracking, recipes, coaches, settings, and existing data. The user selected Coach kickoff and requested an introduction every time the app opens.

Antislop mode: during, selected by the user. Design read: a mobile-first nutrition and fitness app, using its existing black canvas and green/orange coach identity. ENERGY 3 / RHYTHM 2 / MOTION 3 for the introduction; ENERGY 2 / RHYTHM 2 / MOTION 2 inside the app.

## Approaches considered

1. Coach kickoff, selected: existing coach emblems introduce nutrition and movement, then reveal CalMal. Most connected to the app's identity.
2. Daily journey: a meal scan transforms into a running route. Strong feature narrative, but requires more new illustration.
3. Logo reveal: the shortest implementation, but explains less about the app.

## Opening sequence

Proposed timing is four seconds total, without audio or flashes:

- 0-0.8 seconds: existing green nutrition and orange fitness emblems enter from opposite sides with restrained overshoot.
- 0.8-2.4 seconds: a scan frame and a short route stroke introduce food scanning and activity tracking. Use existing relevant icons and SVG paths, not fabricated stats or new character artwork.
- 2.4-3.4 seconds: the emblems settle around the CalMal name. Copy: "Know your meals. Keep moving."
- 3.4-4 seconds: the composition fades into the next screen.

Keep Skip visible and keyboard-operable from the first frame. Escape skips. Reduced-motion users see the final static composition and an immediately available Continue button, without a forced countdown. English and Bahasa Melayu text follow the app's language setting.

Builder decision: a launch means a fresh document load, including reload and a fresh PWA launch. Switching tabs, returning from the background, hash navigation, language changes, and internal re-renders do not replay it. A resumed PWA document does not replay. Store the completed flag in memory only, not persistent storage. This avoids interrupting a workout when the user checks another app.

Mount before route rendering so sign-in cannot flash underneath. Finish once, whether triggered by Skip, Escape, Continue, or timeout. Clean up timers and listeners. Preserve requested hash destination and existing authentication state. A timer fallback completes the animated sequence even if animation events never fire. An intro rendering failure must fall through to the existing route.

After the introduction, use existing routing: new guests reach profile setup; users with a local locked account reach sign-in; existing usable sessions reach their requested screen. The introduction must not sign users out, create accounts, or become an authentication gate.

## Shared interaction improvements

Keep existing layouts and typography. The monochrome surface and coach accents already identify CalMal; avoid a new font download or a new animation dependency.

- Navigation: short directional emphasis on the selected destination, visible keyboard focus, and current-page semantics. No repeated entrance animation from ordinary state updates.
- Buttons, chips, and segmented controls: consistent press/release feedback, hover only on hover-capable devices, visible focus, and distinct disabled/busy states. Animate transform and opacity where possible; avoid blanket transition-all rules.
- Dialogs and sheets: preserve the existing mobile sheet/desktop dialog pattern; move focus inside, trap keyboard focus, support Escape, and restore focus on close. Respect nested dialogs and prior scroll lock.
- Forms and asynchronous actions: show honest progress and errors, prevent duplicate submissions, and restore controls in finally blocks. Do not move focus or erase entered text during unrelated updates.
- Toasts: retain readable messages and guarantee removal without relying on animationend.
- Reduced motion: suppress decorative movement and looping effects while keeping progress and state feedback understandable.

Apply shared behavior across Dashboard, Scanner, Activity, Recipes, and Profile. Do not animate maps, camera previews, or live metrics continuously. Reserve space for visuals and retain mobile safe-area padding.

## Bugs and safety boundaries

Confirmed locally: Profile handlers read event.currentTarget after await; sheets lack focus management; toast removal depends on animation completion; reset clears all origin storage. Fix these within the interaction work. Reset must remove only intended CalMal data, with explicit confirmation, and must not silently destroy authentication credentials or unrelated origin data.

The local authentication prototype does not verify WebAuthn signatures. This is a separate security defect, not something motion can fix. Do not describe it as secure or ship it as newly validated authentication. Before release, compare the complete latest GitHub source against this incomplete local snapshot. Base the UI patch on the reviewed repository, preserving assets/configuration and unrelated work. If unsafe authentication is already part of the target source, report the exact release blocker and propose a separate secure repair before production deployment.

## Implementation reach and constraints

Expected touch points: main route/bootstrap, a dedicated introduction component and styles, shared UI helpers, existing interaction CSS, Profile handlers/reset, translations, and focused tests. Inspect all callers before changing shared helpers. Use native browser APIs and installed tooling. No dependency installation is needed for animation.

Local source is not a Git checkout and lacks public assets/configuration. Obtain complete source and inspect current branch/main before editing product code. Preserve the user's branch work. Existing permission to push remains valid; do not force-push or merge into production without an explicit request. Target feat/hybrid-auth-sync after checking it still exists and is appropriate.

## Verification and delivery

- Test fresh launches, reloads, internal navigation, language changes, direct hash links, Skip/timeout races, and intro cleanup.
- Test reduced motion, keyboard-only use, focus restoration, delayed/rejected async actions, disabled controls, and toast cleanup without animation events.
- Exercise existing navigation and primary controls on desktop and narrow mobile layouts. Check overflow, safe areas, EN/BM text, runtime errors, and preservation of stored data.
- Add meaningful regression tests for new lifecycle logic and the fixed shared behavior. Build with the project's existing package manager.
- Run antislop's delivery gate with evidence for changed UI; distinguish existing unrelated issues and untested hardware/cloud flows.
- Commit only reviewed changes and push to the existing feature branch. Verify the remote commit. A feature-branch push does not prove the production site changed; report deployment state separately.
- If GitHub still returns 403 Resource not accessible by integration, retain the tested commit/patch and explain the required repository write access. Never claim a successful push without verification.

## Non-goals and builder discretion

No new tracking features, generated character art, autoplay sound, replacement authentication architecture, forced sign-out, or broad dashboard redesign. Existing features remain available. The builder chooses exact easing curves, responsive sizes, and minor copy within this direction. New security work or a change to the sign-in policy requires a separately reviewable design.
