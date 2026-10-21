/**
 * VTID-05322 (messenger-ux-v2/ui-viewing-presence) — viewing heartbeats.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let session: { access_token: string } | null = { access_token: 'tok' };
let sessionGate: Promise<void> | null = null;
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: async () => {
        if (sessionGate) await sessionGate;
        return { data: { session } };
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  },
}));
vi.mock('@/lib/gateway-base', () => ({ GATEWAY_API_URL: 'https://gw.test/api/v1' }));
let appShell = false;
vi.mock('@/lib/appilix', () => ({ isAppilix: () => appShell }));

import { useChatViewingPresence, chatDeviceId, gatewayConfigured, VIEWING_HEARTBEAT_MS } from './useChatViewingPresence';

const fetchMock = vi.fn(async (..._a: unknown[]) => ({ ok: true }) as { ok: boolean });
let visibility: 'visible' | 'hidden' = 'visible';
let focused = true;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  visibility = 'visible';
  focused = true;
  appShell = false;
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  vi.spyOn(document, 'hasFocus').mockImplementation(() => focused);
  sessionStorage.clear();
  session = { access_token: 'tok' };
  sessionGate = null;
  vi.stubEnv('VITE_GATEWAY_BASE', 'https://gw.test');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  delete (document as unknown as Record<string, unknown>).visibilityState;
});

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
const bodies = () => (fetchMock.mock.calls as unknown as Array<[string, { body: string }]>).map((c) => JSON.parse(c[1].body));
const calls = () => fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;

describe('useChatViewingPresence', () => {
  it('heartbeats at once and every 20 s while visible and focused, with the auth header', async () => {
    renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    await flush();
    expect(bodies()).toEqual([{ device_id: chatDeviceId(), conversation_key: 'dm:22222222-2222-4222-8222-222222222222', active: true }]);
    expect(calls()[0][0]).toBe('https://gw.test/api/v1/chat/viewing');
    expect((calls()[0][1].headers as Record<string, string>).Authorization).toBe('Bearer tok');
    await act(async () => { vi.advanceTimersByTime(VIEWING_HEARTBEAT_MS); });
    await flush();
    await act(async () => { vi.advanceTimersByTime(VIEWING_HEARTBEAT_MS); });
    await flush();
    expect(bodies().filter((b) => b.active === true)).toHaveLength(3);
  });

  it('blur and hidden send active:false and stop the heartbeat; focus again restarts', async () => {
    renderHook(() => useChatViewingPresence('group:44444444-4444-4444-8444-444444444444'));
    await flush();
    focused = false;
    await act(async () => { window.dispatchEvent(new Event('blur')); });
    await flush();
    expect(bodies().at(-1)).toEqual({ device_id: chatDeviceId(), active: false });
    const n = fetchMock.mock.calls.length;
    await act(async () => { vi.advanceTimersByTime(VIEWING_HEARTBEAT_MS * 3); });
    await flush();
    expect(fetchMock.mock.calls.length).toBe(n);
    focused = true;
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await flush();
    expect(bodies().at(-1)?.active).toBe(true);
    visibility = 'hidden';
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    await flush();
    expect(bodies().at(-1)?.active).toBe(false);
  });

  it('leaving the conversation or switching to another sends active:false first', async () => {
    const { rerender, unmount } = renderHook(({ k }) => useChatViewingPresence(k), { initialProps: { k: 'dm:22222222-2222-4222-8222-222222222222' as string | null } });
    await flush();
    rerender({ k: 'dm:33333333-3333-4333-8333-333333333333' });
    await flush();
    expect(bodies().map((b) => `${b.active}:${b.conversation_key ?? ''}`)).toEqual([
      'true:dm:22222222-2222-4222-8222-222222222222',
      'false:',
      'true:dm:33333333-3333-4333-8333-333333333333',
    ]);
    unmount();
    await flush();
    expect(bodies().at(-1)?.active).toBe(false);
  });

  it('closing / leaving the page (hidden, then pagehide — the browser order) sends active:false once, keepalive, with the header', async () => {
    renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    await flush();
    const n = fetchMock.mock.calls.length;
    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    // Sent synchronously (no await before fetch), so unload can't cancel it first.
    expect(fetchMock.mock.calls.length).toBe(n + 1);
    window.dispatchEvent(new Event('pagehide'));
    await flush();
    const offs = calls().slice(n);
    expect(offs).toHaveLength(1);
    expect(offs[0][1].keepalive).toBe(true);
    expect((offs[0][1].headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(offs[0][1].body as string)).toEqual({ device_id: chatDeviceId(), active: false });
  });

  it('a pagehide on a still-visible page also sends the keepalive active:false', async () => {
    renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    await flush();
    await act(async () => { window.dispatchEvent(new Event('pagehide')); });
    const last = calls().at(-1)!;
    expect(last[1].keepalive).toBe(true);
    expect(JSON.parse(last[1].body as string).active).toBe(false);
  });

  it('an active:true still waiting for the session is dropped when viewing ends: it never lands after the active:false', async () => {
    let open!: () => void;
    sessionGate = new Promise<void>((r) => { open = r; });
    renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    focused = false;
    window.dispatchEvent(new Event('blur'));
    sessionGate = null;
    await act(async () => { open(); });
    await flush();
    await flush();
    expect(bodies()).toEqual([]); // the true was dropped; nothing was ever "on", so no false either
  });

  it('posts go out one after another in the order made (switching conversations)', async () => {
    let open!: () => void;
    sessionGate = new Promise<void>((r) => { open = r; });
    const { rerender } = renderHook(({ k }) => useChatViewingPresence(k), { initialProps: { k: 'dm:22222222-2222-4222-8222-222222222222' } });
    rerender({ k: 'dm:33333333-3333-4333-8333-333333333333' });
    sessionGate = null;
    await act(async () => { open(); });
    for (let i = 0; i < 4; i++) await flush();
    // The first true was dropped (left before it went out); the new one is sent.
    expect(bodies().map((b) => `${b.active}:${b.conversation_key ?? ''}`)).toEqual(['true:dm:33333333-3333-4333-8333-333333333333']);
  });

  it('signed out: no request and no heartbeat timer', async () => {
    session = null;
    renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(VIEWING_HEARTBEAT_MS - 1); });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a failed first post (offline, or 4xx/5xx) arms no heartbeat; it is retried after 20 s and then heartbeats', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(VIEWING_HEARTBEAT_MS); });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2); // the retry
    await act(async () => { vi.advanceTimersByTime(VIEWING_HEARTBEAT_MS); });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(3); // now the heartbeat runs
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { vi.advanceTimersByTime(VIEWING_HEARTBEAT_MS); });
    await flush();
    expect(bodies().filter((b) => b.active === true).length).toBeGreaterThanOrEqual(3);
  });

  it('no gateway configured: no request at all', async () => {
    vi.stubEnv('VITE_GATEWAY_BASE', '');
    vi.stubEnv('VITE_GATEWAY_URL', '');
    expect(gatewayConfigured()).toBe(false);
    renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    await flush();
    await act(async () => { vi.advanceTimersByTime(VIEWING_HEARTBEAT_MS * 2); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(gatewayConfigured({ VITE_GATEWAY_URL: 'https://gw/api/v1' })).toBe(true);
  });

  it('in the app shell focus is not required', async () => {
    appShell = true;
    focused = false;
    renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    await flush();
    expect(bodies()[0].active).toBe(true);
  });

  it('nothing is sent without a conversation', async () => {
    renderHook(() => useChatViewingPresence(null));
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('one device id per tab, reused across mounts, valid for the gateway; kept in memory when sessionStorage throws', async () => {
    const { unmount } = renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    await flush();
    unmount();
    await flush();
    renderHook(() => useChatViewingPresence('dm:33333333-3333-4333-8333-333333333333'));
    await flush();
    const ids = new Set(bodies().map((b) => b.device_id));
    expect(ids.size).toBe(1);
    const [id] = [...ids];
    expect(id).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    const a = chatDeviceId();
    expect(chatDeviceId()).toBe(a);
    expect(a).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });
});
