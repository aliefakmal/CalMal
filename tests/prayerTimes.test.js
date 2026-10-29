import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHHMM, fetchFastingTimes, nextFastingEvent } from '../src/services/prayerTimes.js';

const ok = (imsak, maghrib) => async () => ({
  ok: true,
  status: 200,
  json: async () => ({ code: 200, data: { timings: { Imsak: imsak, Maghrib: maghrib } } }),
});

test('parseHHMM strips the timezone suffix', () => {
  assert.equal(parseHHMM('05:28 (+08)'), '05:28');
  assert.equal(parseHHMM('18:57'), '18:57');
});

test('fetch success returns exact times', async () => {
  const r = await fetchFastingTimes('Kuala Lumpur', '2026-10-29', null, ok('05:28 (+08)', '18:57'));
  assert.deepEqual(r, { date: '2026-10-29', city: 'Kuala Lumpur', imsak: '05:28', maghrib: '18:57', approx: false });
});

test('cache hit for same day and city makes no request', async () => {
  let calls = 0;
  const cache = { date: '2026-10-29', city: 'kuala lumpur', imsak: '05:28', maghrib: '18:57', approx: false };
  const r = await fetchFastingTimes('Kuala Lumpur', '2026-10-29', cache, async () => { calls++; });
  assert.equal(calls, 0);
  assert.equal(r.imsak, '05:28');
});

test('unknown city falls back to defaults marked approximate', async () => {
  const bad = async () => ({ ok: false, status: 400, json: async () => ({ code: 400 }) });
  const r = await fetchFastingTimes('Atlantis', '2026-10-29', null, bad);
  assert.equal(r.error, 'city');
  assert.equal(r.approx, true);
  assert.equal(r.imsak, '05:40');
  assert.equal(r.maghrib, '19:15');
});

test('network failure reuses an older cache for the same city', async () => {
  const cache = { date: '2026-10-28', city: 'Ipoh', imsak: '05:35', maghrib: '19:02', approx: false };
  const r = await fetchFastingTimes('Ipoh', '2026-10-29', cache, async () => { throw new TypeError('offline'); });
  assert.equal(r.error, 'network');
  assert.equal(r.approx, true);
  assert.equal(r.imsak, '05:35');
  assert.equal(r.date, '2026-10-29');
});

test('nextFastingEvent picks sahur, iftar, then next sahur', () => {
  const times = { imsak: '05:28', maghrib: '18:57' };
  const a = nextFastingEvent(times, new Date(2026, 9, 29, 4, 0));
  assert.equal(a.kind, 'sahur');
  assert.equal(a.minsLeft, 88);
  const b = nextFastingEvent(times, new Date(2026, 9, 29, 12, 0));
  assert.equal(b.kind, 'iftar');
  assert.equal(b.minsLeft, 417);
  const c = nextFastingEvent(times, new Date(2026, 9, 29, 21, 0));
  assert.equal(c.kind, 'sahur');
  assert.equal(c.at.getDate(), 30);
});
