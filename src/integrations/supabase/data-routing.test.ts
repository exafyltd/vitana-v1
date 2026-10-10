/**
 * VTID-05023: only PostgREST traffic moves to the Aurora proxy; auth, storage,
 * functions and realtime stay on Supabase, and an unset VITE_DATA_API_URL
 * changes nothing.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataFetch } from './data-routing';

const SB = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const DATA = 'https://data.vitanaland.com';

function harness(dataUrl: string | undefined) {
  const seen: Array<{ url: string; method?: string; body?: string | null; auth?: string | null }> = [];
  const base = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request) {
      seen.push({ url: input.url, method: input.method, body: await input.text(), auth: input.headers.get('authorization') });
    } else {
      seen.push({ url: String(input), method: init?.method, body: (init?.body as string) ?? null });
    }
    return new Response('[]', { status: 200 });
  }) as unknown as typeof fetch;
  return { fetch: createDataFetch(SB, dataUrl, base), seen };
}

describe('createDataFetch', () => {
  it('rewrites PostgREST table and rpc calls, keeping path and query', async () => {
    const h = harness(DATA);
    await h.fetch(`${SB}/rest/v1/profiles?select=*&user_id=eq.1`);
    await h.fetch(new URL(`${SB}/rest/v1/rpc/get_feed`), { method: 'POST', body: '{"a":1}' });
    expect(h.seen[0].url).toBe(`${DATA}/rest/v1/profiles?select=*&user_id=eq.1`);
    expect(h.seen[1]).toMatchObject({ url: `${DATA}/rest/v1/rpc/get_feed`, method: 'POST', body: '{"a":1}' });
  });

  it('rebuilds a Request on the new URL with method, headers and body intact', async () => {
    const h = harness(DATA);
    await h.fetch(new Request(`${SB}/rest/v1/posts`, { method: 'PATCH', body: '{"x":2}', headers: { Authorization: 'Bearer t' } }));
    expect(h.seen[0]).toEqual({ url: `${DATA}/rest/v1/posts`, method: 'PATCH', body: '{"x":2}', auth: 'Bearer t' });
  });

  it.each([
    `${SB}/auth/v1/token?grant_type=refresh_token`,
    `${SB}/storage/v1/object/public/avatars/a.png`,
    `${SB}/functions/v1/ai-chat`,
    `${SB}/realtime/v1/websocket`,
    `${SB}/rest/v1beta/x`,
    'https://gateway.vitanaland.com/api/v1/rest/v1/x',
  ])('leaves %s alone', async (url) => {
    const h = harness(DATA);
    await h.fetch(url);
    expect(h.seen[0].url).toBe(url);
  });

  it.each([undefined, '', '   '])('is a pass-through when the data URL is %j', async (d) => {
    const h = harness(d);
    await h.fetch(`${SB}/rest/v1/profiles`);
    expect(h.seen[0].url).toBe(`${SB}/rest/v1/profiles`);
  });

  it('tolerates a trailing slash on the data URL', async () => {
    const h = harness(`${DATA}/`);
    await h.fetch(`${SB}/rest/v1/profiles`);
    expect(h.seen[0].url).toBe(`${DATA}/rest/v1/profiles`);
  });
});

describe('supabase client wiring', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('sends a real PostgREST query to the data host and auth to Supabase', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_DATA_API_URL', DATA);
    const calls: string[] = [];
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      calls.push(input instanceof Request ? input.url : String(input));
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    try {
      const { supabase } = await import('./client');
      await supabase.from('profiles').select('user_id').limit(1);
      await supabase.auth.getSession();
      expect(calls.some((u) => u.startsWith(`${DATA}/rest/v1/profiles`))).toBe(true);
      expect(calls.some((u) => u.includes('.supabase.co/rest/v1/'))).toBe(false);
      expect((supabase as unknown as { supabaseUrl: string }).supabaseUrl).toBe(SB);
    } finally {
      spy.mockRestore();
    }
  });
});
