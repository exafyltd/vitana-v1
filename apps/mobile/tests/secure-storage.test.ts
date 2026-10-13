/** VTID-05186 (N3, plan change 8) — chunked SecureStore session storage, incl. the race cases. */
import './helpers/no-network';
import { chunkUtf8, createSecureStorage, CHUNK_BYTES, MAX_READ_RETRIES, type SecureStoreLike } from '../src/auth/secure-storage';

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const KEY = 'sb-g1test-auth-token';
const tick = () => new Promise((r) => setTimeout(r, 0));

/** In-memory SecureStore; `yieldOnWrite` lets other work run between chunk writes. */
function fakeStore({ yieldOnWrite = false } = {}) {
  const map = new Map<string, string>();
  const store: SecureStoreLike & { map: Map<string, string>; options: unknown[] } = {
    map,
    options: [],
    async getItemAsync(k, o) {
      store.options.push(o);
      return map.has(k) ? (map.get(k) as string) : null;
    },
    async setItemAsync(k, v, o) {
      store.options.push(o);
      if (Buffer.byteLength(v, 'utf8') > 2048) throw new Error('value over 2048 bytes');
      if (yieldOnWrite) await tick();
      map.set(k, v);
    },
    async deleteItemAsync(k, o) {
      store.options.push(o);
      if (yieldOnWrite) await tick();
      map.delete(k);
    },
  };
  return store;
}

const ascii = (n: number) => 'x'.repeat(n);

describe('chunking', () => {
  it.each([1, CHUNK_BYTES, CHUNK_BYTES + 1, 10_000])('round-trips %i bytes', async (n) => {
    const store = fakeStore();
    const storage = createSecureStorage(store);
    const value = ascii(n);
    await storage.setItem(KEY, value);
    expect(await storage.getItem(KEY)).toBe(value);
    expect(Number(store.map.get(`${KEY}.count`))).toBe(Math.ceil(n / CHUNK_BYTES));
    for (const [k, v] of store.map) if (/\.\d+$/.test(k)) expect(Buffer.byteLength(v, 'utf8')).toBeLessThanOrEqual(CHUNK_BYTES);
  });

  it('never splits a multi-byte character', () => {
    const value = 'ü€😀'.repeat(700);
    const chunks = chunkUtf8(value);
    expect(chunks.join('')).toBe(value);
    for (const c of chunks) expect(Buffer.byteLength(c, 'utf8')).toBeLessThanOrEqual(CHUNK_BYTES);
  });

  it('uses AFTER_FIRST_UNLOCK on every call', async () => {
    const store = fakeStore();
    await createSecureStorage(store).setItem(KEY, 'v');
    expect(store.options.every((o) => (o as { keychainAccessible: string }).keychainAccessible === 'AFTER_FIRST_UNLOCK')).toBe(true);
  });

  it('removal deletes every chunk and the count', async () => {
    const store = fakeStore();
    const storage = createSecureStorage(store);
    await storage.setItem(KEY, ascii(10_000));
    await storage.removeItem(KEY);
    expect([...store.map.keys()].filter((k) => k !== `${KEY}.version`)).toEqual([]);
    expect(await storage.getItem(KEY)).toBeNull();
  });

  it('a throwing SecureStore reads as signed out, never a crash', async () => {
    const boom = async () => {
      throw new Error('keychain locked');
    };
    const storage = createSecureStorage({ getItemAsync: boom, setItemAsync: boom, deleteItemAsync: boom });
    await expect(storage.setItem(KEY, 'v')).resolves.toBeUndefined();
    await expect(storage.getItem(KEY)).resolves.toBeNull();
    await expect(storage.removeItem(KEY)).resolves.toBeUndefined();
  });
});

describe('race cases', () => {
  it('a getItem interleaved with a setItem returns the old or the new value, never a mix', async () => {
    const store = fakeStore({ yieldOnWrite: true });
    const storage = createSecureStorage(store);
    const oldValue = 'a'.repeat(5_000);
    const newValue = 'b'.repeat(5_000);
    await storage.setItem(KEY, oldValue);
    const write = storage.setItem(KEY, newValue);
    const reads = await Promise.all([storage.getItem(KEY), tick().then(() => storage.getItem(KEY)), storage.getItem(KEY)]);
    await write;
    for (const r of reads) expect([oldValue, newValue]).toContain(r);
    expect(await storage.getItem(KEY)).toBe(newValue);
  });

  it('a version that changes mid-read retries, then gives up as null', async () => {
    const store = fakeStore();
    const storage = createSecureStorage(store);
    await storage.setItem(KEY, 'value');
    // Another writer (e.g. a second JS context) bumps the version on every read of it.
    let versionReads = 0;
    const inner = store.getItemAsync.bind(store);
    store.getItemAsync = async (k, o) => {
      if (k === `${KEY}.version`) {
        versionReads += 1;
        return String(versionReads);
      }
      return inner(k, o);
    };
    expect(await storage.getItem(KEY)).toBeNull();
    expect(versionReads).toBe(2 * (MAX_READ_RETRIES + 1));
  });

  it('a missing chunk retries, then reads as signed out', async () => {
    const store = fakeStore();
    const storage = createSecureStorage(store);
    await storage.setItem(KEY, ascii(4_000));
    store.map.delete(`${KEY}.1`);
    expect(await storage.getItem(KEY)).toBeNull();
  });

  it('concurrent setItem calls are serialised: the last write wins', async () => {
    const store = fakeStore({ yieldOnWrite: true });
    const storage = createSecureStorage(store);
    await Promise.all([storage.setItem(KEY, 'a'.repeat(6_000)), storage.setItem(KEY, 'b'.repeat(2_000)), storage.setItem(KEY, 'c'.repeat(4_000))]);
    expect(await storage.getItem(KEY)).toBe('c'.repeat(4_000));
  });

  it('a shorter write leaves no stale chunk', async () => {
    const store = fakeStore();
    const storage = createSecureStorage(store);
    await storage.setItem(KEY, ascii(10_000));
    await storage.setItem(KEY, ascii(10));
    const chunkKeys = [...store.map.keys()].filter((k) => /\.\d+$/.test(k));
    expect(chunkKeys).toEqual([`${KEY}.0`]);
    expect(await storage.getItem(KEY)).toBe(ascii(10));
  });
});
