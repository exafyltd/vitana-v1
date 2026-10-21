/**
 * VTID-05322 (messenger-ux-v2/ui-viewing-presence) — viewing heartbeats.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
vi.mock('@/lib/gateway-base', () => ({ GATEWAY_API_URL: 'https://gw.test/api/v1' }));
let appShell = false;
vi.mock('@/lib/appilix', () => ({ isAppilix: () => appShell }));

import { useChatViewingPresence, chatDeviceId, VIEWING_HEARTBEAT_MS } from './useChatViewingPresence';

const fetchMock = vi.fn(async () => ({ ok: true }));
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
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
const bodies = () => fetchMock.mock.calls.map((c) => JSON.parse((c[1] as { body: string }).body));
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

  it('pagehide uses fetch keepalive with the header', async () => {
    renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    await flush();
    await act(async () => { window.dispatchEvent(new Event('pagehide')); });
    await flush();
    const last = calls().at(-1)!;
    expect(last[1].keepalive).toBe(true);
    expect((last[1].headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('in the app shell focus is not required; nothing is sent without a conversation; one device id per tab', async () => {
    appShell = true;
    focused = false;
    renderHook(() => useChatViewingPresence('dm:22222222-2222-4222-8222-222222222222'));
    await flush();
    expect(bodies()[0].active).toBe(true);
    fetchMock.mockClear();
    renderHook(() => useChatViewingPresence(null));
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(chatDeviceId()).toBe(chatDeviceId());
    expect(chatDeviceId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });
});
