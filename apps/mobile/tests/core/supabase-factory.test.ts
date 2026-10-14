/** VTID-05183 — the injected-config Supabase client: no default, no network at construction, injected storage. */
import { createSupabaseClient } from '@vitana/core/supabase';
import { createMemoryStorage } from '@vitana/core/storage';

const URL_G1 = 'https://g1-test.example.org';
const DATA_API = 'https://g1-data.example.org';
const KEY = 'sb_publishable_g1testkey';

type Call = { url: string; method: string };

function fakeFetch(calls: Call[]) {
  return jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    calls.push({ url, method });
    if (url.includes('/auth/v1/token')) {
      return new Response(
        JSON.stringify({
          access_token: 'header.eyJzdWIiOiJ1MSIsImV4cCI6NDEwMjQ0NDgwMH0.sig',
          refresh_token: 'refresh-1',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: 4102444800,
          user: { id: 'u1', aud: 'authenticated', email: 'g1@example.org', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  });
}

describe('createSupabaseClient', () => {
  it('refuses a missing url, publishable key or storage', () => {
    const storage = createMemoryStorage();
    expect(() => createSupabaseClient({ url: '', publishableKey: KEY, storage })).toThrow(/needs url/);
    expect(() => createSupabaseClient({ url: '  ', publishableKey: KEY, storage })).toThrow(/needs url/);
    expect(() => createSupabaseClient({ url: URL_G1, publishableKey: '', storage })).toThrow(/publishableKey/);
    // @ts-expect-error — storage is required
    expect(() => createSupabaseClient({ url: URL_G1, publishableKey: KEY })).toThrow(/storage/);
  });

  it('makes no network call at construction and keeps detectSessionInUrl off', async () => {
    const calls: Call[] = [];
    const fetchImpl = fakeFetch(calls);
    const client = createSupabaseClient({ url: URL_G1, publishableKey: KEY, storage: createMemoryStorage(), fetchImpl });
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect((client.auth as unknown as { detectSessionInUrl: boolean }).detectSessionInUrl).toBe(false);
    await client.auth.stopAutoRefresh();
  });

  it('writes the session to the injected storage and routes PostgREST to the data API', async () => {
    const calls: Call[] = [];
    const fetchImpl = fakeFetch(calls);
    const storage = createMemoryStorage();
    const client = createSupabaseClient({ url: URL_G1, publishableKey: KEY, dataApiUrl: DATA_API, storage, fetchImpl });
    const { error } = await client.auth.signInWithPassword({ email: 'g1@example.org', password: 'not-a-real-password' });
    expect(error).toBeNull();
    const saved = [...storage.data.entries()].find(([k]) => k.endsWith('-auth-token'));
    expect(saved).toBeDefined();
    expect(JSON.parse(saved![1]).refresh_token).toBe('refresh-1');

    await client.from('profiles').select('id').limit(1);
    const auth = calls.filter((c) => c.url.includes('/auth/v1/'));
    const rest = calls.filter((c) => c.url.includes('/rest/v1/'));
    expect(auth.length).toBeGreaterThan(0);
    expect(auth.every((c) => c.url.startsWith(`${URL_G1}/auth/v1/`))).toBe(true);
    expect(rest.length).toBe(1);
    expect(rest[0].url.startsWith(`${DATA_API}/rest/v1/profiles`)).toBe(true);
    expect(calls.every((c) => c.url.startsWith(URL_G1) || c.url.startsWith(DATA_API))).toBe(true);
    await client.auth.stopAutoRefresh();
  });

  it('without dataApiUrl PostgREST stays on the project url', async () => {
    const calls: Call[] = [];
    const client = createSupabaseClient({ url: URL_G1, publishableKey: KEY, storage: createMemoryStorage(), fetchImpl: fakeFetch(calls) });
    await client.from('profiles').select('id').limit(1);
    expect(calls.map((c) => c.url.split('?')[0])).toEqual([`${URL_G1}/rest/v1/profiles`]);
    await client.auth.stopAutoRefresh();
  });
});
