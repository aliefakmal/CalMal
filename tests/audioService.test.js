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
