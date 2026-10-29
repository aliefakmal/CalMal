import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

mock.module('../src/components/companion.js', { namedExports: { avatar: () => '<svg></svg>' } });
mock.module('../src/utils/i18n.js', { namedExports: { getLang: () => 'en' } });
const { renderIntro } = await import('../src/components/intro.js');

function setup(reduced = false) {
  const button = new EventTarget();
  button.focus = () => {};
  const root = { innerHTML: '', querySelector: () => button };
  const media = new EventTarget();
  media.matches = reduced;
  globalThis.window = { matchMedia: () => media };
  globalThis.document = new EventTarget();
  return { root, button, media };
}

test('Skip and timeout complete only once, without waiting for animation events', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { root, button } = setup();
  let calls = 0;
  renderIntro(root, () => calls++);
  button.dispatchEvent(new Event('click'));
  t.mock.timers.tick(4000);
  assert.equal(calls, 1);
});

test('normal launch completes at four seconds', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { root } = setup();
  let calls = 0;
  renderIntro(root, () => calls++);
  t.mock.timers.tick(3999);
  assert.equal(calls, 0);
  t.mock.timers.tick(1);
  assert.equal(calls, 1);
});

test('reduced motion waits for Continue and cleanup prevents completion', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { root, button } = setup(true);
  let calls = 0;
  const dispose = renderIntro(root, () => calls++);
  assert.match(root.innerHTML, /Continue/);
  t.mock.timers.tick(10000);
  assert.equal(calls, 0);
  dispose();
  button.dispatchEvent(new Event('click'));
  assert.equal(calls, 0);
});

test('Escape finishes and removes its listener', () => {
  const { root } = setup(true);
  let calls = 0;
  renderIntro(root, () => calls++);
  const event = new Event('keydown');
  event.key = 'Escape';
  document.dispatchEvent(event);
  document.dispatchEvent(event);
  assert.equal(calls, 1);
});

test('enabling reduced motion mid-intro cancels the countdown', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { root, button, media } = setup();
  let calls = 0;
  renderIntro(root, () => calls++);
  media.matches = true;
  media.dispatchEvent(new Event('change'));
  t.mock.timers.tick(4000);
  assert.equal(calls, 0);
  assert.equal(button.textContent, 'Continue');
  button.dispatchEvent(new Event('click'));
  assert.equal(calls, 1);
});

test('returning to full motion restarts a bounded completion timer', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { root, media } = setup(true);
  let calls = 0;
  renderIntro(root, () => calls++);
  media.matches = false;
  media.dispatchEvent(new Event('change'));
  t.mock.timers.tick(4000);
  assert.equal(calls, 1);
});
