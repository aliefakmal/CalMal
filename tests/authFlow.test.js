import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { installMockStorage } from './helpers/mockStorage.js';

class MiniElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.attributes = {};
    this.dataset = {};
    this.style = { setProperty() {} };
    this.listeners = new Map();
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this._text = '';
  }

  set innerHTML(html) {
    this.children = [];
    this._text = '';
    parseHTML(String(html), this);
  }

  get innerHTML() { return this.children.map((child) => child.outerHTML).join(''); }
  get outerHTML() { return `<${this.tagName.toLowerCase()}>${this.textContent}</${this.tagName.toLowerCase()}>`; }
  get textContent() { return this._text + this.children.map((child) => child.textContent).join(''); }
  set textContent(value) { this.children = []; this._text = String(value); }
  get id() { return this.attributes.id || ''; }
  get className() { return this.attributes.class || ''; }
  set className(value) { this.attributes.class = String(value); }
  get classList() {
    return {
      contains: (name) => this.className.split(/\s+/).includes(name),
      add: (name) => this.classList.toggle(name, true),
      toggle: (name, force) => {
        const names = new Set(this.className.split(/\s+/).filter(Boolean));
        if (force) names.add(name); else names.delete(name);
        this.attributes.class = [...names].join(' ');
      },
    };
  }

  append(child) { child.parentElement = this; this.children.push(child); }
  appendChild(child) { this.append(child); return child; }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'value') this.value = String(value);
    if (name === 'checked') this.checked = true;
    if (name === 'disabled') this.disabled = true;
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatchEvent(event) {
    event.target ||= this;
    event.currentTarget = this;
    event.preventDefault ||= () => {};
    const results = [...(this.listeners.get(event.type) || [])].map((listener) => listener(event));
    if (event.bubbles && this.parentElement) results.push(this.parentElement.dispatchEvent(event));
    return Promise.all(results);
  }
  click() { return this.dispatchEvent({ type: 'click', bubbles: true }); }

  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/);
    let current = [this];
    for (const part of parts) {
      const found = [];
      for (const root of current) walk(root, (element) => {
        if (element !== root && matches(element, part) && !found.includes(element)) found.push(element);
      });
      current = found;
    }
    return current;
  }
}

function walk(root, visit) {
  visit(root);
  root.children.forEach((child) => walk(child, visit));
}

function matches(element, selector) {
  const attr = selector.match(/\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\]/);
  if (attr) {
    const actual = element.attributes[attr[1]];
    if (actual === undefined || (attr[2] !== undefined && actual !== attr[2])) return false;
  }
  const id = selector.match(/#([\w-]+)/);
  if (id && element.id !== id[1]) return false;
  const classes = [...selector.matchAll(/\.([\w-]+)/g)];
  if (classes.some((match) => !element.classList.contains(match[1]))) return false;
  const tag = selector.match(/^[a-z]+/i);
  return !tag || element.tagName === tag[0].toUpperCase();
}

const VOID_TAGS = new Set(['input', 'img', 'br', 'hr', 'meta', 'link', 'path', 'circle', 'line', 'polyline']);
function parseHTML(html, root) {
  const stack = [root];
  for (const token of html.split(/(<[^>]+>)/g)) {
    if (!token || token.startsWith('<!--')) continue;
    if (!token.startsWith('<')) {
      stack.at(-1)._text += token.replace(/<[^>]*>/g, '');
      continue;
    }
    if (token.startsWith('</')) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const match = token.match(/^<([\w-]+)([^>]*)>$/);
    if (!match) continue;
    const element = new MiniElement(match[1]);
    for (const attr of match[2].matchAll(/([:\w-]+)(?:="([^"]*)")?/g)) element.setAttribute(attr[1], attr[2] ?? '');
    stack.at(-1).append(element);
    if (!VOID_TAGS.has(match[1].toLowerCase()) && !token.endsWith('/>')) stack.push(element);
  }
}

class MiniFormData {
  constructor(form) {
    this.values = new Map();
    walk(form, (element) => {
      if (element.attributes.name) this.values.set(element.attributes.name, element.value);
    });
  }
  get(name) { return this.values.get(name) ?? null; }
}

function installDOM() {
  const body = new MiniElement('body');
  const toastRoot = new MiniElement();
  toastRoot.setAttribute('id', 'toast-root');
  globalThis.document = {
    body,
    documentElement: new MiniElement('html'),
    addEventListener() {},
    createElement: (tag) => new MiniElement(tag),
    getElementById: (id) => id === 'toast-root' ? toastRoot : null,
  };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.FormData = MiniFormData;
  return body;
}

function submit(form) {
  return form.dispatchEvent({ type: 'submit' });
}

let storage;
let auth;
let store;
let renderAuth;
let renderOnboarding;
let renderProfile;

beforeEach(async () => {
  storage = installMockStorage();
  installDOM();
  auth = await import('../src/services/authService.js');
  ({ store } = await import('../src/services/store.js'));
  ({ renderAuth } = await import('../src/screens/auth.js'));
  ({ renderOnboarding } = await import('../src/screens/onboarding.js'));
  ({ renderProfile } = await import('../src/screens/profile.js'));
  if (auth.getActiveUsername()) await store.clearActiveAccount();
});

test('first run renders Create Account and activates a valid account before onboarding', async () => {
  const container = new MiniElement();
  let completed;
  renderAuth(container, { onSuccess: (account) => { completed = account; } });

  assert.match(container.textContent, /Create Account/);
  assert.equal(container.querySelectorAll('[data-account]').length, 0);
  container.querySelector('[name=username]').value = 'New_User';
  container.querySelector('[name=password]').value = 'Password1';
  await submit(container.querySelector('#local-auth-form'));

  assert.deepEqual(completed, { username: 'new_user' });
  assert.equal(auth.getActiveUsername(), 'new_user');
  assert.equal(store.getStorageKey(), 'calmal.user.new_user');
});

test('saved usernames are escaped native buttons and resume without credentials', async () => {
  auth.createLocalAccount('Saved_User', 'Password1');
  auth.createLocalAccount('other_user', 'Password1');
  const container = new MiniElement();
  let resumed;
  renderAuth(container, { onSuccess: (account) => { resumed = account; } });

  const buttons = container.querySelectorAll('[data-account]');
  assert.equal(buttons.length, 2);
  assert.ok(buttons.every((button) => button.tagName === 'BUTTON'));
  assert.match(container.innerHTML, /other_user/);
  buttons.find((button) => button.dataset.account === 'saved_user').click();
  await Promise.resolve();

  assert.deepEqual(resumed, { username: 'saved_user' });
  assert.equal(auth.getActiveUsername(), 'saved_user');
});

test('invalid and duplicate submissions preserve accessible feedback and saved data', async () => {
  auth.createLocalAccount('existing', 'Password1');
  storage.setItem('calmal.user.existing', '{"profile":{"name":"Kept"}}');
  const container = new MiniElement();
  renderAuth(container);

  container.querySelector('[name=username]').value = 'x';
  container.querySelector('[name=password]').value = 'bad';
  await submit(container.querySelector('#local-auth-form'));
  assert.equal(container.querySelector('[role=status]').textContent.length > 0, true);

  container.querySelector('[name=username]').value = 'Existing';
  container.querySelector('[name=password]').value = 'Password2';
  await submit(container.querySelector('#local-auth-form'));
  assert.match(container.querySelector('[role=status]').textContent, /already exists.*saved account/i);
  assert.equal(storage.getItem('calmal.user.existing'), '{"profile":{"name":"Kept"}}');
});

test('submission disables the busy control during account creation and restores it afterward', async () => {
  const container = new MiniElement();
  let finishWrite;
  storage.setItem = () => new Promise((resolve) => { finishWrite = resolve; });
  renderAuth(container);
  const button = container.querySelector('[data-submit]');
  container.querySelector('[name=username]').value = 'valid_user';
  container.querySelector('[name=password]').value = 'Password1';
  const pending = submit(container.querySelector('#local-auth-form'));
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, 'Creating account…');
  await Promise.resolve();
  await Promise.resolve();
  finishWrite();
  await pending;
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Create Account');
});

test('onboarding stores the active username in its profile', async () => {
  auth.createLocalAccount('profile_user', 'Password1');
  store.activateAccount('profile_user');
  const container = new MiniElement();
  renderOnboarding(container, () => {}, { username: 'profile_user' });
  await submit(container.querySelector('#onboard-form'));
  assert.equal(store.profile.username, 'profile_user');
});

test('profile sign out only clears the session and retains selectable account data', async () => {
  auth.createLocalAccount('signed_out', 'Password1');
  store.activateAccount('signed_out');
  store.saveProfile({ name: 'Kept' });
  const savedState = storage.getItem('calmal.user.signed_out');
  const container = new MiniElement();
  let resetCalls = 0;
  let clearCalls = 0;
  const originalReset = store.reset;
  const originalClear = storage.clear;
  store.reset = () => { resetCalls += 1; };
  storage.clear = () => { clearCalls += 1; };
  globalThis.location = { hash: '#/profile', reload() {} };
  try {
    renderProfile(container);
    const button = container.querySelector('#btn-sign-out');
    assert.equal(button.tagName, 'BUTTON');
    await button.click();
    assert.equal(auth.getActiveUsername(), null);
    assert.equal(storage.getItem('calmal.user.signed_out'), savedState);
    assert.equal(resetCalls, 0);
    assert.equal(clearCalls, 0);
  } finally {
    store.reset = originalReset;
    storage.clear = originalClear;
  }
});
