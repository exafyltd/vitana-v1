/**
 * VTID-05183 — the key/value storage shape supabase-js accepts for its auth
 * session (sync or async). The app supplies the implementation (N3: a
 * SecureStore-backed one); core never reaches for a browser storage.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/** An in-memory storage, for tests. */
export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { readonly data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? (data.get(key) as string) : null),
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}
