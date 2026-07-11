import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// Node 25's experimental webstorage global shadows jsdom's localStorage with a
// method-less stub; give tests a real in-memory implementation instead.
if (typeof window !== 'undefined' && typeof window.localStorage?.setItem !== 'function') {
  const backing = new Map<string, string>();
  const memoryLocalStorage = {
    getItem: (k: string) => (backing.has(k) ? backing.get(k)! : null),
    setItem: (k: string, v: string) => void backing.set(String(k), String(v)),
    removeItem: (k: string) => void backing.delete(k),
    clear: () => backing.clear(),
    key: (i: number) => [...backing.keys()][i] ?? null,
    get length() {
      return backing.size;
    },
  };
  Object.defineProperty(window, 'localStorage', { value: memoryLocalStorage, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryLocalStorage,
    configurable: true,
  });
}

// jsdom lacks matchMedia; several stores/components consult it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
