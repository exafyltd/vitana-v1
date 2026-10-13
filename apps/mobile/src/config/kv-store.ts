/**
 * VTID-05178 — key-value store port (Native app Wave 1, N4-APP Change 8,
 * Open question 5).
 *
 * N1 provides the persistent adapter in `packages/core` (MMKV, synchronous).
 * Until it lands, N4 uses this interface with an in-memory implementation: a
 * cached app config is then lost on restart, which is still fail-safe (the
 * built-in defaults have every flag off). Swap the adapter with
 * `setKeyValueStore()` — callers never change.
 */

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

let current: KeyValueStore = createMemoryStore();

export function getKeyValueStore(): KeyValueStore {
  return current;
}

/** N1 calls this once with its MMKV adapter. */
export function setKeyValueStore(store: KeyValueStore): void {
  current = store;
}
