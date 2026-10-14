/**
 * VTID-05186 (N3, plan change 8) — N1's `KeyValueStorage` over expo-secure-store
 * (Keychain on iOS, Keystore-backed on Android).
 *
 * A Supabase session JSON exceeds SecureStore's 2,048-byte guidance, so a
 * value is split into chunks of at most 1,800 UTF-8 bytes:
 *   <key>.0 … <key>.n-1   the chunks
 *   <key>.count           how many chunks (written LAST)
 *   <key>.version         bumped after every completed write or removal
 *
 * Writes are safe against auto-refresh racing a read:
 *   - one in-process async mutex serialises every setItem / removeItem and the
 *     multi-key part of getItem;
 *   - setItem writes the chunks n-1 … 0 first, then `.count`, then bumps
 *     `.version`, then deletes chunks beyond the new count;
 *   - removeItem bumps `.version`, deletes `.count`, then the chunks;
 *   - getItem reads `.version`, `.count`, the chunks, then `.version` again and
 *     retries (at most 3 times, then `null` = signed out) when the version moved
 *     or a chunk is missing — it never returns a value assembled from two writes.
 *
 * Every SecureStore call is try/catch: a failed read is "signed out", never a
 * crash. No session ever touches AsyncStorage.
 */
import * as SecureStore from 'expo-secure-store';
import type { KeyValueStorage } from '../ports/core';

export const CHUNK_BYTES = 1800;
export const MAX_READ_RETRIES = 3;

/** The subset of expo-secure-store this adapter uses (injectable for tests). */
export interface SecureStoreLike {
  getItemAsync(key: string, options?: SecureStore.SecureStoreOptions): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<void>;
  deleteItemAsync(key: string, options?: SecureStore.SecureStoreOptions): Promise<void>;
}

/** Splits `value` into pieces of at most `maxBytes` UTF-8 bytes, never inside a code point. */
export function chunkUtf8(value: string, maxBytes = CHUNK_BYTES): string[] {
  const chunks: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of value) {
    const cp = ch.codePointAt(0) as number;
    const size = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (bytes + size > maxBytes && current) {
      chunks.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  if (current || chunks.length === 0) chunks.push(current);
  return chunks;
}

/** SecureStore keys allow [A-Za-z0-9._-] only. */
export function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

function createMutex() {
  let tail: Promise<unknown> = Promise.resolve();
  return function run<T>(fn: () => Promise<T>): Promise<T> {
    const result = tail.then(fn, fn);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

export function createSecureStorage(store: SecureStoreLike = SecureStore): KeyValueStorage {
  const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
  const locked = createMutex();

  const get = async (k: string): Promise<string | null> => {
    try {
      return await store.getItemAsync(k, options);
    } catch {
      return null;
    }
  };
  const set = async (k: string, v: string): Promise<boolean> => {
    try {
      await store.setItemAsync(k, v, options);
      return true;
    } catch {
      return false;
    }
  };
  const del = async (k: string): Promise<void> => {
    try {
      await store.deleteItemAsync(k, options);
    } catch {
      /* a leftover chunk is harmless: `.count` decides what is read */
    }
  };
  const count = (raw: string | null): number => {
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const bumpVersion = async (base: string) => {
    const v = Number.parseInt((await get(`${base}.version`)) ?? '0', 10);
    await set(`${base}.version`, String((Number.isFinite(v) ? v : 0) + 1));
  };

  async function readOnce(base: string): Promise<{ value: string | null; consistent: boolean }> {
    const before = await get(`${base}.version`);
    const n = count(await get(`${base}.count`));
    if (n === 0) {
      const after = await get(`${base}.version`);
      return { value: null, consistent: before === after };
    }
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const part = await get(`${base}.${i}`);
      if (part === null) return { value: null, consistent: false };
      parts.push(part);
    }
    const after = await get(`${base}.version`);
    return { value: parts.join(''), consistent: before === after };
  }

  return {
    getItem(key) {
      const base = safeKey(key);
      return locked(async () => {
        for (let attempt = 0; attempt <= MAX_READ_RETRIES; attempt++) {
          const { value, consistent } = await readOnce(base);
          if (consistent) return value;
        }
        return null;
      });
    },
    setItem(key, value) {
      const base = safeKey(key);
      return locked(async () => {
        const chunks = chunkUtf8(value);
        const oldCount = count(await get(`${base}.count`));
        for (let i = chunks.length - 1; i >= 0; i--) {
          if (!(await set(`${base}.${i}`, chunks[i]))) return;
        }
        if (!(await set(`${base}.count`, String(chunks.length)))) return;
        await bumpVersion(base);
        for (let i = chunks.length; i < oldCount; i++) await del(`${base}.${i}`);
      });
    },
    removeItem(key) {
      const base = safeKey(key);
      return locked(async () => {
        await bumpVersion(base);
        const n = count(await get(`${base}.count`));
        await del(`${base}.count`);
        for (let i = 0; i < n; i++) await del(`${base}.${i}`);
      });
    },
  };
}

/** The app's session storage (Keychain / Keystore). */
export const secureStorage: KeyValueStorage = createSecureStorage();
