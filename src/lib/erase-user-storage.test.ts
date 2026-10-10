/**
 * VTID-05053 (Health Hub D5): account deletion removes every member file at
 * every folder depth. Lives under src/ because supabase/functions/_shared has
 * no Deno test harness (same arrangement as erase-user-data.test.ts).
 */

import { describe, it, expect } from 'vitest';
import {
  deletePrefix,
  eraseUserStorage,
  storageFullyErased,
  USER_STORAGE_BUCKETS,
  LIST_LIMIT,
  type StorageAdapter,
  type StorageEntry,
} from '../../supabase/functions/_shared/erase-user-storage';

/** In-memory Storage with Supabase list() semantics: one level, folders have no id, never offset. */
function fakeStorage(files: Record<string, string[]>, opts: { hasIds?: boolean; stuck?: string[] } = {}) {
  const hasIds = opts.hasIds ?? true;
  const stuck = new Set(opts.stuck ?? []);
  const store: Record<string, Set<string>> = {};
  for (const [b, paths] of Object.entries(files)) store[b] = new Set(paths);
  const calls = { list: 0, remove: 0, removedPaths: [] as string[] };
  const adapter: StorageAdapter = {
    hasIds,
    async list(bucket, prefix, limit) {
      calls.list++;
      const seen = new Map<string, StorageEntry>();
      for (const p of [...(store[bucket] ?? [])].sort()) {
        if (!p.startsWith(`${prefix}/`)) continue;
        const rest = p.slice(prefix.length + 1);
        const [head, ...tail] = rest.split('/');
        if (!seen.has(head)) seen.set(head, tail.length ? { name: head, id: null } : { name: head, id: `id-${p}` });
      }
      const entries = [...seen.values()].slice(0, limit);
      return hasIds ? entries : entries.map(({ name }) => ({ name }));
    },
    async remove(bucket, paths) {
      calls.remove++;
      expect(paths.length).toBeLessThanOrEqual(LIST_LIMIT);
      for (const p of paths) {
        if (stuck.has(p)) continue;
        store[bucket]?.delete(p);
        calls.removedPaths.push(p);
      }
    },
  };
  return { adapter, store, calls };
}

const U = 'user-1';
const NESTED = [
  `${U}/avatar.png`,
  `${U}/posts/a.jpg`,
  `${U}/posts/2026/10/b.jpg`,
  `${U}/posts/2026/10/c.mp4`,
  `${U}/reels/x/y/z/deep.mov`,
  'someone-else/posts/keep.jpg',
];

describe('VTID-05053 erase-user-storage', () => {
  for (const hasIds of [true, false]) {
    const path = hasIds ? 'direct Supabase path' : 'storage-bridge path (no ids)';

    it(`deletes every file at every depth (${path})`, async () => {
      const { adapter, store } = fakeStorage({ 'media-uploads': NESTED }, { hasIds });
      const deleted = await deletePrefix(adapter, 'media-uploads', U);
      expect(deleted).toBe(5);
      expect([...store['media-uploads']]).toEqual(['someone-else/posts/keep.jpg']);
    });

    it(`deletes more than ${LIST_LIMIT} files in one folder by repeated passes (${path})`, async () => {
      const many = Array.from({ length: 2500 }, (_, i) => `${U}/chat/${String(i).padStart(5, '0')}.jpg`);
      const { adapter, store, calls } = fakeStorage({ 'chat-attachments': many }, { hasIds });
      const deleted = await deletePrefix(adapter, 'chat-attachments', U);
      expect(deleted).toBe(2500);
      expect(store['chat-attachments'].size).toBe(0);
      expect(calls.remove).toBe(3);
    });
  }

  it('never passes an offset (the bridge contract is { bucket, prefix, limit })', async () => {
    const { adapter } = fakeStorage({ avatars: NESTED });
    const seen: unknown[][] = [];
    const spy: StorageAdapter = { ...adapter, list: (...a) => { seen.push(a); return adapter.list(...a); } };
    await deletePrefix(spy, 'avatars', U);
    for (const args of seen) expect(args).toHaveLength(3);
  });

  it('stops when a remove makes no progress, and reports the residual', async () => {
    const { adapter, calls } = fakeStorage({ 'health-reports': [`${U}/r/lab.pdf`] }, { stuck: [`${U}/r/lab.pdf`] });
    const [r] = await eraseUserStorage(adapter, U, ['health-reports']);
    expect(calls.remove).toBe(1);
    expect(r).toEqual({ bucket: 'health-reports', deleted: 1, residual: 1 });
    expect(storageFullyErased([r])).toBe(false);
  });

  it('a list error counts as not verified, so the account is kept', async () => {
    const { adapter } = fakeStorage({});
    const failing: StorageAdapter = { ...adapter, list: async () => { throw new Error('list avatars/user-1: boom'); } };
    const [r] = await eraseUserStorage(failing, U, ['avatars']);
    expect(r.residual).toBe(-1);
    expect(r.error).toContain('boom');
    expect(storageFullyErased([r])).toBe(false);
  });

  it('every bucket verified empty → fully erased', async () => {
    const { adapter } = fakeStorage({ 'media-uploads': NESTED, 'health-reports': [`${U}/2026/lab.pdf`] });
    const results = await eraseUserStorage(adapter, U);
    expect(results.map((r) => r.bucket)).toEqual(USER_STORAGE_BUCKETS);
    expect(storageFullyErased(results)).toBe(true);
    expect(results.find((r) => r.bucket === 'health-reports')?.deleted).toBe(1);
  });

  it('covers health reports and support attachments; covers stays out (event-ownership decision)', () => {
    expect(USER_STORAGE_BUCKETS).toEqual(expect.arrayContaining(['health-reports', 'feedback-attachments', 'media-uploads', 'chat-attachments']));
    expect(USER_STORAGE_BUCKETS).not.toContain('covers');
  });

  it('the edge function keeps the account while files remain', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('supabase/functions/request-account-deletion/index.ts', 'utf8');
    const gate = src.indexOf('storageFullyErased(storageResults)');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(src.indexOf('auth.admin.deleteUser'));
    expect(src).toContain('status: "storage_incomplete"');
  });
});
