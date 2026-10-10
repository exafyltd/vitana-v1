/**
 * VTID-05023: supabase-js derives its session key from the URL's first host
 * label. Repointing VITE_SUPABASE_URL at the Aurora proxy (data.vitanaland.com)
 * must not move sessions to sb-data-auth-token -- that would sign every member
 * out at the cutover. The client pins the key existing sessions live under.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const KEY = 'sb-inmkhvwdcuyhnxkgfvsb-auth-token';

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('supabase client session storage key', () => {
  it('reads an existing session under the pinned key when pointed at the proxy', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://data.vitanaland.com');
    const { supabase } = await import('./client');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((supabase.auth as any).storageKey).toBe(KEY);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((supabase as any).supabaseUrl).toBe('https://data.vitanaland.com');
  });

  it('uses the same key on today\'s supabase.co URL', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://inmkhvwdcuyhnxkgfvsb.supabase.co');
    const { supabase } = await import('./client');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((supabase.auth as any).storageKey).toBe(KEY);
  });
});
