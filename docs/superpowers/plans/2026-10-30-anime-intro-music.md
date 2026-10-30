# Anime Intro Music Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Implement a 3.5-second procedural heroic anime opening jingle using the Web Audio API during CalMal's 4-second kickoff intro screen, with clean stop/fadeout on skip or exit.

---

### Task 1: Add Unit Tests for Intro Theme in `tests/audioService.test.js`

- [ ] Create `tests/audioService.test.js` checking that `playIntroTheme()` and `stopIntroTheme()` handle audio context state safely, respect `soundEnabled`, and manage oscillator nodes cleanly.
- [ ] Run `npm test` and verify the test fails or passes as appropriate.

---

### Task 2: Implement `playIntroTheme()` and `stopIntroTheme()` in `src/services/audioService.js`

- [ ] In `src/services/audioService.js`, implement `playIntroTheme()` using Web Audio API synthesis:
  - 3-phase heroic anime jingle:
    - Phase 1 (0.0s - 0.9s): Rising arpeggio notes (C5 -> E5 -> G5 -> C6).
    - Phase 2 (0.9s - 2.5s): Triumphant power chords (F -> G -> C major).
    - Phase 3 (2.5s - 3.5s): Smooth exponential decay fadeout.
  - Track active oscillators and a master `introGainNode`.
- [ ] Implement `stopIntroTheme()`:
  - Ramps `introGainNode.gain` to 0.0001 in 80ms, stops active nodes, and nulls references.
- [ ] Wire `stopIntroTheme()` into `stopAll()` in `src/services/audioService.js`.
- [ ] Run `npm test` to verify Task 1 tests pass.

---

### Task 3: Wire Intro Jingle into `src/components/intro.js` and Update `tests/intro.test.js`

- [ ] In `src/components/intro.js`:
  - Import `soundboard` from `../services/audioService.js`.
  - In `renderIntro()`, invoke `soundboard.playIntroTheme()`.
  - Attach gesture fallback to unlock audio on first `pointerdown` / `click` if initially blocked by browser autoplay policy.
  - In `finish()` and `cleanup()`, call `soundboard.stopIntroTheme()`.
- [ ] Update `tests/intro.test.js` mocks if necessary to mock `audioService.js`.
- [ ] Run `npm test` to verify all tests pass.

---

### Task 4: Sync to Secondary Repository (`C:\Users\USER\CalMal`), Build, and Commit

- [ ] Sync changes to `C:\Users\USER\CalMal`.
- [ ] Run `npm test` in both repositories (all tests pass).
- [ ] Run `npm run build` in both repositories (Vite build succeeds).
- [ ] Commit and push to GitHub.
