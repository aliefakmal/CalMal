export function normalizeBarcode(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.replace(/^0+(?=\d)/, '');
}

export function imageFingerprint(dataUrl) {
  const input = String(dataUrl ?? '');
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `img-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function createScanGuard({ cooldownMs = 1500, now = () => Date.now() } = {}) {
  let active = false;
  const lastStarted = new Map();

  return {
    begin(key) {
      const identity = String(key ?? '');
      if (!identity || active) return false;
      const previous = lastStarted.get(identity);
      if (previous != null && now() - previous < cooldownMs) return false;
      lastStarted.set(identity, now());
      active = true;
      return true;
    },
    invalidate() {
      active = false;
    },
    isLocked() {
      return active;
    },
  };
}
