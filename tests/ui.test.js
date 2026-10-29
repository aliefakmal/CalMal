import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toast, setLoading, segmentedRingSVG } from '../src/components/ui.js';

test('toast disappears even when animationend never fires', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let removed = false;
  const el = { classList: { add() {} }, addEventListener() {}, remove() { removed = true; } };
  globalThis.document = { createElement: () => el, getElementById: () => ({ appendChild() {} }) };
  toast('Saved', 'success', 100);
  t.mock.timers.tick(100);
  t.mock.timers.tick(300);
  assert.equal(removed, true);
});

test('repeated loading calls preserve original label and disabled state', () => {
  const btn = { innerHTML: 'Save meal', disabled: false, dataset: {}, setAttribute() {}, removeAttribute() {} };
  setLoading(btn, true, 'Saving');
  setLoading(btn, true, 'Still saving');
  setLoading(btn, false);
  assert.equal(btn.innerHTML, 'Save meal');
  assert.equal(btn.disabled, false);
  btn.disabled = true;
  setLoading(btn, true);
  setLoading(btn, false);
  assert.equal(btn.disabled, true);
});

test('earned band omitted without activity', () => {
  const svg = segmentedRingSVG({ size: 100, stroke: 10, segments: { eaten: 0.5, left: 0.5, earnedFrom: 1, earnedTo: 1, over: false }, state: 'deficit' });
  assert.ok(!svg.includes('seg-earned'));
  assert.ok(svg.includes('seg-eaten'));
});

test('surplus ring is red', () => {
  const svg = segmentedRingSVG({ size: 100, stroke: 10, segments: { eaten: 1, left: 0, earnedFrom: 0.8, earnedTo: 1, over: true }, state: 'surplus' });
  assert.ok(svg.includes('seg-surplus'));
  assert.ok(svg.includes('seg-earned'));
});
