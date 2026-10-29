import { renderIntro } from '../src/components/intro.js';
import { openSheet, toast } from '../src/components/ui.js';
import { createLocalAccount, listLocalAccounts } from '../src/services/authService.js';
import { store } from '../src/services/store.js';

const view = document.getElementById('view');
const results = document.getElementById('results');
const run = document.getElementById('run');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let dispose = () => {};

document.getElementById('preview').onclick = () => {
  dispose();
  document.body.classList.add('static-preview');
  const original = window.matchMedia;
  window.matchMedia = () => Object.assign(new EventTarget(), { matches: true });
  try { dispose = renderIntro(view, () => { view.innerHTML = ''; }); }
  finally { window.matchMedia = original; }
};
document.getElementById('animate').onclick = () => {
  dispose();
  document.body.classList.remove('static-preview');
  dispose = renderIntro(view, () => { view.innerHTML = ''; });
};
document.getElementById('sheet').onclick = () => openSheet('<h2>Keyboard test</h2><button class="btn">First</button><button class="btn" data-close>Close</button>');
document.getElementById('seed').onclick = async () => {
  const username = 'ui_regression_20261029';
  if (!listLocalAccounts().some((account) => account.username === username)) createLocalAccount(username, 'TestOnly123');
  await store.activateAccount(username);
  if (!store.profile) store.saveProfile({ username, name: 'UI test profile', gender: 'male', age: 25, height: 170, weight: 70, targetWeight: 65, activity: 1.375, goal: 'lose' });
  location.assign('/');
};

if (new URLSearchParams(location.search).has('preview')) {
  document.querySelector('.test-controls').hidden = true;
  document.querySelector('.test-controls').style.display = 'none';
  results.hidden = true;
  document.getElementById('preview').click();
}

run.onclick = async () => {
  run.disabled = true;
  dispose();
  const checks = [];
  const assert = (ok, message) => { if (!ok) throw Error(message); checks.push('PASS ' + message); };
  try {
    const app = document.getElementById('app');
    const originalOverflow = document.body.style.overflow;
    run.focus();
    const outer = openSheet('<h2>Outer sheet</h2><button>First</button><button>Last</button>');
    await Promise.resolve();
    const [first, last] = outer.el.querySelectorAll('button');
    assert(document.activeElement === first, 'Sheet receives focus');
    assert(app.inert, 'Background cannot receive focus');
    last.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    assert(document.activeElement === first, 'Tab wraps forward');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true }));
    assert(document.activeElement === last, 'Tab wraps backward');
    const inner = openSheet('<h2>Inner sheet</h2><button>Nested action</button>');
    await Promise.resolve();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    assert(!outer.el.closest('[inert]') && inner.el.closest('[inert]'), 'Escape closes only the top sheet');
    assert(document.body.style.overflow === 'hidden', 'Nested close retains scroll lock');
    assert(document.activeElement === last, 'Nested close restores its opener');
    outer.close();
    assert(!app.inert && document.body.style.overflow === originalOverflow, 'Final close restores background state');
    // The run button is deliberately disabled, so use a connected enabled opener next.
    const opener = document.getElementById('sheet');
    opener.focus();
    const simple = openSheet('<h2>Focus restore</h2><button>Close</button>');
    await Promise.resolve();
    simple.close();
    assert(document.activeElement === opener, 'Final close restores keyboard focus');
    const empty = openSheet('<h2>No controls</h2>');
    await Promise.resolve();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    assert(document.activeElement === empty.el, 'Control-free sheet retains focus');
    empty.close();
    toast('Test toast', 'success', 20);
    document.querySelector('.toast').style.animation = 'none';
    await delay(400);
    assert(!document.querySelector('.toast'), 'Toast cleans up without animationend');
    let completed = 0;
    dispose = renderIntro(view, () => { completed++; view.innerHTML = ''; });
    document.querySelector('[data-intro-skip]').click();
    assert(completed === 1, 'Intro Skip enters app immediately');
    await delay(4100);
    assert(completed === 1, 'Intro timeout cannot enter twice after Skip');
    results.textContent = checks.join('\n') + '\nAll browser checks passed.';
  } catch (error) {
    results.textContent = checks.join('\n') + '\nFAIL ' + error.message;
  } finally { run.disabled = false; }
};
