import assert from 'node:assert/strict';
import { test } from 'node:test';

class MockAudioParam {
  constructor(val = 0) {
    this.value = val;
    this.events = [];
  }
  setValueAtTime(val, time) {
    this.value = val;
    this.events.push({ type: 'set', val, time });
  }
  exponentialRampToValueAtTime(val, time) {
    this.value = val;
    this.events.push({ type: 'expRamp', val, time });
  }
  linearRampToValueAtTime(val, time) {
    this.value = val;
    this.events.push({ type: 'linRamp', val, time });
  }
  cancelScheduledValues(time) {
    this.events.push({ type: 'cancel', time });
  }
}

class MockGainNode {
  constructor() {
    this.gain = new MockAudioParam(1);
    this.connectedTo = null;
  }
  connect(dest) {
    this.connectedTo = dest;
  }
  disconnect() {}
}

class MockOscillatorNode {
  constructor() {
    this.frequency = new MockAudioParam(440);
    this.type = 'sine';
    this.startedAt = null;
    this.stoppedAt = null;
  }
  connect(dest) {
    this.connectedTo = dest;
  }
  disconnect() {}
  start(time) {
    this.startedAt = time;
  }
  stop(time) {
    this.stoppedAt = time;
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
  }
  createGain() {
    return new MockGainNode();
  }
  createOscillator() {
    return new MockOscillatorNode();
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
}

const mockWindow = new EventTarget();
mockWindow.AudioContext = MockAudioContext;
mockWindow.speechSynthesis = { getVoices: () => [], onvoiceschanged: null };
globalThis.window = mockWindow;

const mockDocument = new EventTarget();
mockDocument.visibilityState = 'visible';
globalThis.document = mockDocument;

test('playIntroTheme creates nodes and schedules notes when sound is enabled', async () => {
  const { soundboard } = await import('../src/services/audioService.js');
  soundboard.isMuted = false;
  soundboard.init();

  soundboard.playIntroTheme();
  assert.ok(soundboard.introGainNode, 'introGainNode should be created');
  assert.ok(soundboard.introActiveNodes && soundboard.introActiveNodes.length > 0, 'active intro nodes should be tracked');

  soundboard.stopIntroTheme();
  assert.equal(soundboard.introActiveNodes.length, 0, 'introActiveNodes should be cleared after stop');
});

test('playIntroTheme respects muted state and does not create nodes', async () => {
  const { soundboard } = await import('../src/services/audioService.js');
  soundboard.isMuted = true;
  soundboard.playIntroTheme();
  assert.equal(soundboard.introActiveNodes?.length || 0, 0);
  soundboard.isMuted = false;
});

test('playIntroTheme schedules notes accurately aligned with kickoff visual milestones', async () => {
  const { soundboard } = await import('../src/services/audioService.js');
  soundboard.isMuted = false;
  soundboard.init();

  soundboard.playIntroTheme(true);
  assert.ok(soundboard.introActiveNodes && soundboard.introActiveNodes.length > 0);

  const startTimes = soundboard.introActiveNodes.map((n) => Math.round(n.osc.startedAt * 100) / 100);
  // Arpeggio starts at 0.0s (immediate startup without lag)
  assert.ok(startTimes.includes(0), 'starts arpeggio immediately at 0.0s');
  // Milestone 1 at 0.8s: coaches land and scan/route begins
  assert.ok(startTimes.includes(0.8), 'schedules chord at 0.8s milestone (coaches land & scan begins)');
  // Milestone 2 at 1.8s: scan completes and finish ring reveals
  assert.ok(startTimes.includes(1.8), 'schedules chord at 1.8s milestone (scan finish & goal ring)');
  // Milestone 3 at 2.1s: CalMal title slams in
  assert.ok(startTimes.includes(2.1), 'schedules power chord at 2.1s milestone (title impact)');

  // Milestone 4 at 3.4s: master gain starts exit fadeout
  const gainEvents = soundboard.introGainNode.gain.events;
  const hasExitFadeStart = gainEvents.some((e) => e.type === 'set' && Math.round(e.time * 10) / 10 === 3.4);
  const hasExitFadeRamp = gainEvents.some((e) => e.type === 'expRamp' && Math.round(e.time * 10) / 10 === 4.0);
  assert.ok(hasExitFadeStart, 'master gain holds until stage exit milestone at 3.4s');
  assert.ok(hasExitFadeRamp, 'master gain fades out smoothly across 3.4s - 4.0s exit');

  // Verify climax chord sustains through stage exit
  const stopTimes = soundboard.introActiveNodes.map((n) => Math.round(n.osc.stoppedAt * 10) / 10);
  assert.ok(stopTimes.includes(4.0), 'sustains climax chord notes to align with 4.0s exit');

  soundboard.stopIntroTheme();
  assert.equal(soundboard.introActiveNodes.length, 0);
});

test('stopIntroTheme retains introThemePlayed state and cancels pending playback', async () => {
  const { soundboard } = await import('../src/services/audioService.js');
  soundboard.isMuted = false;
  soundboard.playIntroTheme(true);
  assert.equal(soundboard.introThemePlayed, true);
  soundboard.stopIntroTheme();
  assert.equal(soundboard.introThemePlayed, true, 'introThemePlayed should remain true after stop');
  assert.equal(soundboard._introPending, false, '_introPending should be cleared');
  assert.equal(soundboard.introGainNode, null);
});

test('gesture unlock cancels pending intro theme when targeting skip button', async () => {
  const { soundboard } = await import('../src/services/audioService.js');
  soundboard.isMuted = false;
  soundboard.introThemePlayed = false;
  soundboard.introGainNode = null;
  soundboard._introPending = true;
  soundboard.setupUIListeners();

  const skipBtn = new EventTarget();
  skipBtn.closest = (sel) => (sel === '[data-intro-skip]' ? skipBtn : null);
  const ev = new Event('pointerdown');
  Object.defineProperty(ev, 'target', { value: skipBtn });

  globalThis.window.dispatchEvent(ev);

  assert.equal(soundboard._introPending, false, '_introPending should be cancelled on skip pointerdown');
  assert.equal(soundboard.introGainNode, null, 'intro theme should not start on skip gesture');
});

test('gesture unlock cancels pending intro theme on Escape key', async () => {
  const { soundboard } = await import('../src/services/audioService.js');
  soundboard.isMuted = false;
  soundboard.introThemePlayed = false;
  soundboard.introGainNode = null;
  soundboard._introPending = true;
  soundboard.setupUIListeners();

  const ev = new Event('keydown');
  ev.key = 'Escape';

  globalThis.window.dispatchEvent(ev);

  assert.equal(soundboard._introPending, false, '_introPending should be cancelled on Escape key');
  assert.equal(soundboard.introGainNode, null, 'intro theme should not start on Escape key');
});

test('playIntroTheme does not attach duplicate pending handlers when already pending', async () => {
  const { soundboard } = await import('../src/services/audioService.js');
  soundboard.isMuted = false;
  soundboard.introThemePlayed = false;
  soundboard.introGainNode = null;
  soundboard.audioContext.state = 'suspended';
  soundboard._introPending = true;

  // Subsequent unforced call while pending should return early
  soundboard.playIntroTheme(false);
  assert.equal(soundboard._introPending, true);
  soundboard.stopIntroTheme();
});


