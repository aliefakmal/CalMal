// Sahur (Imsak) and Iftar (Maghrib) times from Aladhan using the JAKIM method.
export const DEFAULT_TIMES = { imsak: '05:40', maghrib: '19:15' };

export function parseHHMM(s = '') {
  return String(s).trim().slice(0, 5);
}

const sameCity = (a = '', b = '') => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function fetchFastingTimes(city, date, cache = null, fetchFn = fetch) {
  if (cache && cache.date === date && sameCity(cache.city, city) && !cache.approx) return cache;

  const fallback = (error) => {
    const base = cache && sameCity(cache.city, city) ? cache : DEFAULT_TIMES;
    return { date, city, imsak: base.imsak, maghrib: base.maghrib, approx: true, error };
  };

  // Aladhan expects DD-MM-YYYY in the path; pin the date so a late-night fetch is not off by one.
  const [y, m, d] = date.split('-');
  const url = `https://api.aladhan.com/v1/timingsByCity/${d}-${m}-${y}?city=${encodeURIComponent(city)}&country=Malaysia&method=17`;
  try {
    const res = await fetchFn(url);
    if (!res.ok && res.status >= 500) return fallback('network');
    const body = await res.json();
    const t = body?.data?.timings;
    if (body?.code !== 200 || !t?.Imsak || !t?.Maghrib) return fallback('city');
    return { date, city, imsak: parseHHMM(t.Imsak), maghrib: parseHHMM(t.Maghrib), approx: false };
  } catch {
    return fallback('network');
  }
}

function at(base, hhmm, dayOffset = 0) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, h, m);
}

export function nextFastingEvent(times, now = new Date()) {
  const sahur = at(now, times.imsak);
  const iftar = at(now, times.maghrib);
  let kind = 'sahur';
  let when = sahur;
  if (now >= sahur && now < iftar) {
    kind = 'iftar';
    when = iftar;
  } else if (now >= iftar) {
    when = at(now, times.imsak, 1);
  }
  return { kind, at: when, minsLeft: Math.round((when - now) / 60000) };
}
