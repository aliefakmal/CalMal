export class MockStorage {
  #values = new Map();

  constructor(entries = {}) {
    for (const [key, value] of Object.entries(entries)) {
      this.#values.set(key, String(value));
    }
  }

  get length() {
    return this.#values.size;
  }

  key(index) {
    return [...this.#values.keys()][index] ?? null;
  }

  getItem(key) {
    return this.#values.has(String(key)) ? this.#values.get(String(key)) : null;
  }

  setItem(key, value) {
    this.#values.set(String(key), String(value));
  }

  removeItem(key) {
    this.#values.delete(String(key));
  }

  clear() {
    this.#values.clear();
  }

  entries() {
    return Object.fromEntries(this.#values);
  }
}

export function installMockStorage(entries = {}) {
  const storage = new MockStorage(entries);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  return storage;
}
