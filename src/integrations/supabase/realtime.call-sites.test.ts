/**
 * VTID-05023 part 7a — with VITE_REALTIME_URL set, real call sites open their
 * channels on the self-hosted Realtime client and never reach
 * supabase.channel / supabase.removeChannel / supabase.realtime.setAuth.
 * Auth stays on the supabase-js client (getSession / onAuthStateChange).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const h = vi.hoisted(() => {
  const created: { endpoint: string; options: Record<string, unknown> }[] = [];
  const opened: string[] = [];
  const removed: string[] = [];
  const setAuthCalls: unknown[] = [];
  const makeChannel = (name: string) => {
    const ch: Record<string, unknown> = { topic: `realtime:${name}` };
    ch.on = () => ch;
    ch.subscribe = () => ch;
    ch.send = async () => 'ok';
    ch.track = async () => 'ok';
    ch.untrack = async () => 'ok';
    ch.presenceState = () => ({});
    ch.unsubscribe = async () => 'ok';
    return ch;
  };
  const supabaseSpies = {
    channel: vi.fn(() => {
      throw new Error('supabase.channel must not be called when VITE_REALTIME_URL is set');
    }),
    removeChannel: vi.fn(),
    removeAllChannels: vi.fn(),
    getChannels: vi.fn(() => []),
    realtimeSetAuth: vi.fn(),
    getSession: vi.fn(async () => ({ data: { session: { access_token: 'member-jwt' } } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  };
  return { created, opened, removed, setAuthCalls, makeChannel, supabaseSpies };
});

vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@supabase/supabase-js')>();
  class FakeRealtimeClient {
    private chans: Record<string, unknown>[] = [];
    constructor(endpoint: string, options: Record<string, unknown>) {
      h.created.push({ endpoint, options });
    }
    channel(name: string) {
      h.opened.push(name);
      const ch = h.makeChannel(name);
      this.chans.push(ch);
      return ch;
    }
    getChannels() {
      return this.chans;
    }
    async removeChannel(ch: { topic: string }) {
      h.removed.push(ch.topic);
      this.chans = this.chans.filter((c) => c !== ch);
      return 'ok';
    }
    async removeAllChannels() {
      this.chans = [];
      return [];
    }
    async setAuth(token?: string) {
      h.setAuthCalls.push(token);
    }
  }
  return { ...actual, RealtimeClient: FakeRealtimeClient };
});

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_PUBLISHABLE_KEY: 'anon-test-key',
  supabase: {
    channel: h.supabaseSpies.channel,
    removeChannel: h.supabaseSpies.removeChannel,
    removeAllChannels: h.supabaseSpies.removeAllChannels,
    getChannels: h.supabaseSpies.getChannels,
    realtime: { setAuth: h.supabaseSpies.realtimeSetAuth },
    auth: {
      getSession: h.supabaseSpies.getSession,
      onAuthStateChange: h.supabaseSpies.onAuthStateChange,
    },
  },
}));

vi.mock('@/context/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

describe('call sites with VITE_REALTIME_URL set', () => {
  beforeAll(async () => {
    vi.stubEnv('VITE_REALTIME_URL', 'wss://realtime.vitanaland.com/socket');
    const { __resetRealtimeRouterForTests } = await import('./realtime');
    __resetRealtimeRouterForTests();
  });
  afterAll(async () => {
    const { __resetRealtimeRouterForTests } = await import('./realtime');
    __resetRealtimeRouterForTests();
    vi.unstubAllEnvs();
  });
  beforeEach(() => {
    h.opened.length = 0;
    h.removed.length = 0;
  });

  it('useRealtimeConnection subscribes and unsubscribes on the routed client', async () => {
    const { useRealtimeConnection } = await import('@/hooks/useRealtimeConnection');
    const { unmount } = renderHook(() => useRealtimeConnection());
    expect(h.opened).toEqual(['connection-monitor']);
    unmount();
    expect(h.removed).toEqual(['realtime:connection-monitor']);
  });

  it('useWalletRealtime (postgres_changes) uses the routed client', async () => {
    const { useWalletRealtime } = await import('@/hooks/useWalletRealtime');
    const { unmount } = renderHook(() =>
      useWalletRealtime({ onBalanceUpdate: () => {}, onTransactionUpdate: () => {} }),
    );
    expect(h.opened).toEqual(['wallet-balances', 'wallet-transactions']);
    unmount();
    expect(h.removed).toEqual(['realtime:wallet-balances', 'realtime:wallet-transactions']);
  });

  it('useUnreadSync (broadcast) uses the routed client', async () => {
    const { useUnreadSync } = await import('@/hooks/useUnreadSync');
    const { result, unmount } = renderHook(() => useUnreadSync(() => {}, () => {}));
    expect(h.opened).toEqual(['unread_sync', 'participant_changes']);
    expect(result.current).toBeDefined();
    unmount();
    expect(h.removed).toHaveLength(2);
  });

  it('created exactly one RealtimeClient on the configured host with the anon key', () => {
    expect(h.created).toHaveLength(1);
    expect(h.created[0].endpoint).toBe('wss://realtime.vitanaland.com/socket');
    expect(h.created[0].options.params).toEqual({ apikey: 'anon-test-key', eventsPerSecond: 10 });
  });

  it('authorised the routed client with the member token from the supabase-js session', async () => {
    await new Promise((r) => setTimeout(r, 0));
    expect(h.supabaseSpies.getSession).toHaveBeenCalled();
    expect(h.supabaseSpies.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(h.setAuthCalls).toContain('member-jwt');
  });

  it('setRealtimeAuth (AuthProvider) goes to the routed client', async () => {
    const { setRealtimeAuth } = await import('./realtime');
    await setRealtimeAuth('fresh-jwt');
    expect(h.setAuthCalls.at(-1)).toBe('fresh-jwt');
  });

  it('never reached supabase-js realtime', () => {
    expect(h.supabaseSpies.channel).not.toHaveBeenCalled();
    expect(h.supabaseSpies.removeChannel).not.toHaveBeenCalled();
    expect(h.supabaseSpies.removeAllChannels).not.toHaveBeenCalled();
    expect(h.supabaseSpies.realtimeSetAuth).not.toHaveBeenCalled();
  });
});
