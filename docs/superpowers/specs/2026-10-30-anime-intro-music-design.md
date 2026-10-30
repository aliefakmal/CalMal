# Design Spec: Anime Intro Music (Kickoff Jingle)

- **Date**: 2026-10-30
- **Status**: Approved (Approach 1: Web Audio API Synthesizer)
- **Scope**: Small change (Intro jingle for CalMal 4s opening screen)

## Intent & The Why
CalMal is an anime-inspired nutrition and fitness companion powered by coaches Deku & Bakugou. Adding a short, catchy, heroic anime opening jingle during the 4-second opening kickoff screen establishes high-energy immersion immediately upon launch.

## Goals, Non-Goals, Anti-Goals
- **Goals**:
  - Play an upbeat, catchy 3.5-second heroic anime opening sting during `renderIntro`.
  - 100% synthesized via Web Audio API (0 KB extra download, zero network latency, 0 external files).
  - Stop/fade out instantly if user clicks "Skip" (`Langkau`) or after 4 seconds.
  - Comply with browser autoplay policies (graceful fallback, unlock on first gesture).
  - Respect user audio preferences (`store.settings.soundEnabled !== false` and `!soundboard.isMuted`).
- **Non-Goals**:
  - Continuous background music throughout the app (only plays during 4s opening kickoff).
  - Heavy MP3/WAV asset downloads.
- **Anti-Goals**:
  - Loud or jarring sounds that clip or play after the intro screen has closed.
  - Audio errors or unhandled promise rejections on strict autoplay browsers.

## Approaches Considered
1. **Web Audio API Synthesizer (Selected)**: Zero asset footprint, 0ms latency, reliable cross-device synthesis, easily cancelable via master gain node.
2. **Static MP3/OGG file**: Richer multi-instrument timbre, but requires asset management (~80KB) and risks stalling on slow mobile connections.
3. **Voice line + fanfare combination**: Voice plus music, but can conflict with initial user companion greetings.

## Technical Design
1. **Audio Service (`src/services/audioService.js`)**:
   - `playIntroTheme()`: Synthesizes a 3-part shonen anime fanfare:
     - *Phase 1 (0.0s - 0.9s)*: Rising arpeggio (C5 -> E5 -> G5 -> C6) with bell/brass harmonics.
     - *Phase 2 (0.9s - 2.5s)*: Triumphant power chords (F -> G -> C) with warm sub-bass and bright overtone.
     - *Phase 3 (2.5s - 3.5s)*: Heroic shimmer exponential fadeout.
   - `stopIntroTheme()`: Ramps master intro gain to 0 in 100ms and cleans up active oscillator nodes.
   - Hooked into `stopAll()` so navigating or switching tabs immediately stops audio.
2. **Intro Component (`src/components/intro.js`)**:
   - On mount, calls `soundboard.playIntroTheme()`.
   - Attached gesture listener (`pointerdown`) to unlock and trigger jingle if initially suspended by browser policy.
   - Calls `soundboard.stopIntroTheme()` in `cleanup()` / `finish()`.

