/**
 * VTID-05023 part 7a — realtime routing helper.
 * Unset VITE_REALTIME_URL → exactly today's supabase-js behaviour.
 * Set → one separate RealtimeClient on that host, apikey = anon key, member
 * token via setAuth (initial session, sign-in, refresh, sign-out).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RealtimeChannel, RealtimeClientOptions } from '@supabase/supabase-js';

const ANON = 'anon-key-123';

type AuthCb = (event: string, session: { access_token?: string } | null) => void;

function makeSupabase(initialToken: string | null = null) {
  let authCb: AuthCb | null = null;
  const sbChannels: RealtimeChannel[] = [];
  const sb = {
    channel: vi.fn((name: string) => {
      const ch = { topic: `realtime:${name}`, owner: 'supabase' } as unknown as RealtimeChannel;
      sbChannels.push(ch);
      return ch;
    }),
    removeChannel: vi.fn(async () => 'ok' as const),
    removeAllChannels: vi.fn(async () => ['ok' as const]),
    getChannels: vi.fn(() => sbChannels),
    realtime: { setAuth: vi.fn(async () => {}) },
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: initialToken ? { access_token: initialToken } : null },
      })),
      onAuthStateChange: vi.fn((cb: AuthCb) => {
        authCb = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  };
  return { sb, emit: (e: string, s: { access_token?: string } | null) => authCb?.(e, s) };
}

function makeFakeClient() {
  const channels: RealtimeChannel[] = [];
  const created: { endpoint: string; options: RealtimeClientOptions }[] = [];
  const client = {
    channel: vi.fn((name: string) => {
      const ch = { topic: `realtime:${name}`, owner: 'routed' } as unknown as RealtimeChannel;
      channels.push(ch);
      return ch;
    }),
    removeChannel: vi.fn(async (ch: RealtimeChannel) => {
      channels.splice(channels.indexOf(ch), 1);
      return 'ok' as const;
    }),
    removeAllChannels: vi.fn(async () => ['ok' as const]),
    getChannels: vi.fn(() => channels),
    setAuth: vi.fn(async (_t?: string | null) => {}),
  };
  const factory = vi.fn((endpoint: string, options: RealtimeClientOptions) => {
    created.push({ endpoint, options });
    return client;
  });
  return { client, factory, created };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createRealtimeRouter — VITE_REALTIME_URL unset (today)', () => {
  it('delegates every call to the supabase-js client', async () => {
    const { createRealtimeRouter } = await import('./realtime');
    const { sb } = makeSupabase('tok');
    const { factory } = makeFakeClient();
    const r = createRealtimeRouter({ supabase: sb, realtimeUrl: undefined, anonKey: ANON, createClient: factory });

    expect(r.mode).toBe('supabase');
    const opts = { config: { presence: { key: 'u1' } } };
    const ch = r.channel('room-1', opts);
    expect(sb.channel).toHaveBeenCalledWith('room-1', opts);
    await r.removeChannel(ch);
    expect(sb.removeChannel).toHaveBeenCalledWith(ch);
    await r.removeAllChannels();
    expect(sb.removeAllChannels).toHaveBeenCalled();
    expect(r.getChannels()).toEqual([ch]);
    await r.setAuth('tok-2');
    expect(sb.realtime.setAuth).toHaveBeenCalledWith('tok-2');
    await r.setAuth(undefined);
    expect(sb.realtime.setAuth).toHaveBeenLastCalledWith(undefined);

    expect(factory).not.toHaveBeenCalled();
    expect(sb.auth.onAuthStateChange).not.toHaveBeenCalled();
  });

  it('treats an empty/whitespace URL as unset', async () => {
    const { createRealtimeRouter } = await import('./realtime');
    const { sb } = makeSupabase();
    expect(createRealtimeRouter({ supabase: sb, realtimeUrl: '  ', anonKey: ANON }).mode).toBe('supabase');
  });
});

describe('createRealtimeRouter — VITE_REALTIME_URL set', () => {
  it('creates one RealtimeClient on the configured host with the anon key as apikey', async () => {
    const { createRealtimeRouter } = await import('./realtime');
    const { sb } = makeSupabase();
    const { factory, created } = makeFakeClient();
    const r = createRealtimeRouter({
      supabase: sb,
      realtimeUrl: 'wss://realtime.vitanaland.com/socket/',
      anonKey: ANON,
      createClient: factory,
      params: { eventsPerSecond: 10 },
    });
    expect(r.mode).toBe('routed');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(created[0].endpoint).toBe('wss://realtime.vitanaland.com/socket');
    expect(created[0].options.params).toEqual({ apikey: ANON, eventsPerSecond: 10 });
  });

  it('converts an https URL to wss', async () => {
    const { normalizeRealtimeUrl } = await import('./realtime');
    expect(normalizeRealtimeUrl('https://realtime.vitanaland.com/socket')).toBe('wss://realtime.vitanaland.com/socket');
    expect(normalizeRealtimeUrl('http://localhost:4000/socket')).toBe('ws://localhost:4000/socket');
    expect(() => normalizeRealtimeUrl('ftp://x')).toThrow(/ws\(s\)/);
  });

  it('opens and removes channels on the routed client, never on supabase-js', async () => {
    const { createRealtimeRouter } = await import('./realtime');
    const { sb } = makeSupabase();
    const { client, factory } = makeFakeClient();
    const r = createRealtimeRouter({ supabase: sb, realtimeUrl: 'wss://rt.example/socket', anonKey: ANON, createClient: factory });

    const opts = { config: { broadcast: { self: true } } };
    const ch = r.channel('user:1:calls', opts);
    expect(client.channel).toHaveBeenCalledWith('user:1:calls', opts);
    expect(r.getChannels()).toEqual([ch]);
    await r.removeChannel(ch);
    expect(client.removeChannel).toHaveBeenCalledWith(ch);
    await r.removeAllChannels();
    expect(client.removeAllChannels).toHaveBeenCalled();

    expect(sb.channel).not.toHaveBeenCalled();
    expect(sb.removeChannel).not.toHaveBeenCalled();
    expect(sb.removeAllChannels).not.toHaveBeenCalled();
  });

  it('routes removeChannel of a foreign (supabase-js) channel back to supabase-js', async () => {
    const { createRealtimeRouter } = await import('./realtime');
    const { sb } = makeSupabase();
    const { client, factory } = makeFakeClient();
    const r = createRealtimeRouter({ supabase: sb, realtimeUrl: 'wss://rt.example/socket', anonKey: ANON, createClient: factory });
    const foreign = { topic: 'realtime:legacy' } as unknown as RealtimeChannel;
    await r.removeChannel(foreign);
    expect(sb.removeChannel).toHaveBeenCalledWith(foreign);
    expect(client.removeChannel).not.toHaveBeenCalled();
  });

  it('authorises with the initial session, then re-calls setAuth on sign-in, refresh and sign-out', async () => {
    const { createRealtimeRouter } = await import('./realtime');
    const { sb, emit } = makeSupabase('initial-token');
    const { client, factory } = makeFakeClient();
    createRealtimeRouter({ supabase: sb, realtimeUrl: 'wss://rt.example/socket', anonKey: ANON, createClient: factory });

    await flush();
    expect(client.setAuth).toHaveBeenLastCalledWith('initial-token');
    expect(sb.auth.onAuthStateChange).toHaveBeenCalledTimes(1);

    emit('SIGNED_IN', { access_token: 'signed-in-token' });
    expect(client.setAuth).toHaveBeenLastCalledWith('signed-in-token');
    emit('TOKEN_REFRESHED', { access_token: 'refreshed-token' });
    expect(client.setAuth).toHaveBeenLastCalledWith('refreshed-token');
    emit('SIGNED_OUT', null);
    expect(client.setAuth).toHaveBeenLastCalledWith(ANON);
    expect(sb.realtime.setAuth).not.toHaveBeenCalled();
  });

  it('uses the anon key when there is no initial session', async () => {
    const { createRealtimeRouter } = await import('./realtime');
    const { sb } = makeSupabase(null);
    const { client, factory } = makeFakeClient();
    createRealtimeRouter({ supabase: sb, realtimeUrl: 'wss://rt.example/socket', anonKey: ANON, createClient: factory });
    await flush();
    expect(client.setAuth).toHaveBeenLastCalledWith(ANON);
  });

  it('passes an accessToken callback that returns the current member token (anon key when signed out)', async () => {
    const { createRealtimeRouter } = await import('./realtime');
    const { sb } = makeSupabase('cb-token');
    const { factory, created } = makeFakeClient();
    createRealtimeRouter({ supabase: sb, realtimeUrl: 'wss://rt.example/socket', anonKey: ANON, createClient: factory });
    const accessToken = created[0].options.accessToken!;
    await expect(accessToken()).resolves.toBe('cb-token');
    sb.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    await expect(accessToken()).resolves.toBe(ANON);
  });

  it('setAuth (AuthProvider path) goes to the routed client only', async () => {
    const { createRealtimeRouter } = await import('./realtime');
    const { sb } = makeSupabase();
    const { client, factory } = makeFakeClient();
    const r = createRealtimeRouter({ supabase: sb, realtimeUrl: 'wss://rt.example/socket', anonKey: ANON, createClient: factory });
    await r.setAuth('explicit');
    await flush(); // the (older) initial session read must not overwrite it
    expect(client.setAuth).toHaveBeenLastCalledWith('explicit');
    expect(sb.realtime.setAuth).not.toHaveBeenCalled();
  });
});

describe('createRealtimeRouter — set but unusable (no silent fallback)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it('logs loudly, never falls back to supabase-js, and returns inert channels that report CHANNEL_ERROR', async () => {
    const { createRealtimeRouter, REALTIME_LOG_TAG } = await import('./realtime');
    const { sb } = makeSupabase();
    const factory = vi.fn(() => {
      throw new Error('boom');
    });
    const r = createRealtimeRouter({ supabase: sb, realtimeUrl: 'wss://rt.example/socket', anonKey: ANON, createClient: factory });

    expect(r.mode).toBe('broken');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(REALTIME_LOG_TAG));
    expect(errorSpy.mock.calls[0][0]).toContain('boom');

    const status = vi.fn();
    const ch = r.channel('x').on('broadcast', { event: 'e' }, () => {}).subscribe(status);
    await flush();
    expect(status).toHaveBeenCalledWith('CHANNEL_ERROR', expect.any(Error));
    await expect(ch.send({ type: 'broadcast', event: 'e', payload: {} })).resolves.toBe('error');
    await expect(r.removeChannel(ch)).resolves.toBe('ok');
    expect(r.getChannels()).toEqual([]);

    expect(sb.channel).not.toHaveBeenCalled();
    expect(sb.removeChannel).not.toHaveBeenCalled();
  });

  it('an invalid URL is treated the same way', async () => {
    const { createRealtimeRouter } = await import('./realtime');
    const { sb } = makeSupabase();
    const r = createRealtimeRouter({ supabase: sb, realtimeUrl: 'not a url', anonKey: ANON });
    expect(r.mode).toBe('broken');
    expect(errorSpy).toHaveBeenCalled();
    expect(sb.channel).not.toHaveBeenCalled();
  });
});
