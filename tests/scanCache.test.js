import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { installMockStorage } from './helpers/mockStorage.js';

let auth;
let store;
let storage;
let seq = 0;

beforeEach(async () => {
  storage = installMockStorage();
  auth = await import(`../src/services/authService.js?cache-test=${++seq}`);
  const module = await import(`../src/services/store.js?cache-test=${++seq}`);
  store = module.store;
  auth.createLocalAccount('alpha', 'Password1');
  auth.createLocalAccount('beta', 'Password1');
  store.activateAccount('alpha');
});

const product = {
  code: '955123456789',
  name: 'Kopi',
  per100: { kcal: 12, protein: 1, carbs: 2, fat: 0 },
  image: 'data:image/png;base64,raw-capture',
  prompt: 'secret prompt',
};

test('scan cache saves, reads, replaces, and strips raw image data', () => {
  const saved = store.saveScanCache('barcode:955123456789', product);
  assert.equal(saved.name, 'Kopi');
  assert.equal(saved.image, undefined);
  assert.equal(saved.prompt, undefined);
  assert.equal(store.getScanCache('barcode:955123456789').name, 'Kopi');

  store.saveScanCache('barcode:955123456789', { ...product, name: 'Kopi O' });
  assert.equal(store.getScanCache('barcode:955123456789').name, 'Kopi O');
});

test('scan cache stays isolated by account and survives reload', async () => {
  store.saveScanCache('barcode:1', product);
  store.activateAccount('beta');
  assert.equal(store.getScanCache('barcode:1'), null);
  store.saveScanCache('barcode:1', { ...product, name: 'Beta Kopi' });
  store.activateAccount('alpha');
  assert.equal(store.getScanCache('barcode:1').name, 'Kopi');

  const reloaded = await import(`../src/services/store.js?cache-test=${++seq}`);
  assert.equal(reloaded.store.getScanCache('barcode:1').name, 'Kopi');
});

test('malformed cache entries are ignored', async () => {
  const key = store.getStorageKey();
  storage.setItem(key, JSON.stringify({ scanCache: { bad: null, wrong: 'value' } }));
  const reloaded = await import(`../src/services/store.js?cache-test=${++seq}`);
  assert.equal(reloaded.store.getScanCache('bad'), null);
  assert.equal(reloaded.store.getScanCache('wrong'), null);
});
