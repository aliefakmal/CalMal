import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createScanGuard, imageFingerprint, normalizeBarcode } from '../src/utils/scanner.js';

test('normalizeBarcode removes separators and leading zeroes', () => {
  assert.equal(normalizeBarcode(' 00 955-123-456-789 '), '955123456789');
  assert.equal(normalizeBarcode('000'), '0');
  assert.equal(normalizeBarcode('no code'), null);
});

test('imageFingerprint is deterministic and distinguishes data', () => {
  assert.equal(imageFingerprint('data:image/png;base64,AAA'), imageFingerprint('data:image/png;base64,AAA'));
  assert.notEqual(imageFingerprint('data:image/png;base64,AAA'), imageFingerprint('data:image/png;base64,AAB'));
});

test('scan guard locks active work and invalidates it', () => {
  const guard = createScanGuard({ cooldownMs: 1000, now: () => 1000 });
  assert.equal(guard.begin('barcode:1'), true);
  assert.equal(guard.isLocked(), true);
  assert.equal(guard.begin('barcode:2'), false);
  guard.invalidate();
  assert.equal(guard.isLocked(), false);
});

test('scan guard rejects same key during cooldown', () => {
  let now = 1000;
  const guard = createScanGuard({ cooldownMs: 1000, now: () => now });
  assert.equal(guard.begin('barcode:1'), true);
  guard.invalidate();
  assert.equal(guard.begin('barcode:1'), false);
  now = 2001;
  assert.equal(guard.begin('barcode:1'), true);
});
