// VTID-05063 — task reads carry the signed-in user's bearer token, send nothing
// when signed out, and a 401/403 from the gateway stops the 10 s polling loop.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const h = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: h.getSession } },
}));

import { fetchTasks, pollTasks } from '@/lib/taskApi';
import { useTaskStream } from './useTaskStream';

// The task stream route does not exist on the gateway, so the hook only ever
// polls after the stream errors. This stand-in never opens.
class FakeEventSource {
  static OPEN = 1;
  readyState = 0;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  constructor(public url: string) {
    sources.push(this);
  }
  close() {
    this.readyState = 2;
  }
}
let sources: FakeEventSource[] = [];

const fetchMock = vi.fn();
const reply = (status: number, body: unknown = { items: [] }) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const signedIn = () => h.getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } });

beforeEach(() => {
  sources = [];
  fetchMock.mockReset();
  h.getSession.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('EventSource', FakeEventSource);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('taskApi reads (VTID-05063)', () => {
  it('sends the Supabase access token as a bearer on fetch and poll', async () => {
    signedIn();
    fetchMock.mockResolvedValue(reply(200, { items: [{ id: 't1' }] }));

    expect(await fetchTasks()).toEqual({ ok: true, tasks: [{ id: 't1' }] });
    expect(await pollTasks('2026-10-09T00:00:00Z')).toEqual({ ok: true, tasks: [{ id: 't1' }] });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [listUrl, listInit] = fetchMock.mock.calls[0];
    expect(listUrl).toMatch(/\/api\/v1\/tasks$/);
    expect(listInit.method).toBe('GET');
    expect(listInit.headers.Authorization).toBe('Bearer tok-123');
    const [pollUrl, pollInit] = fetchMock.mock.calls[1];
    expect(pollUrl).toContain('/api/v1/tasks?since=2026-10-09T00%3A00%3A00Z');
    expect(pollInit.headers.Authorization).toBe('Bearer tok-123');
  });

  it('sends no request when signed out', async () => {
    h.getSession.mockResolvedValue({ data: { session: null } });

    expect(await fetchTasks()).toEqual({ ok: false, reason: 'signed_out' });
    expect(await pollTasks('2026-10-09T00:00:00Z')).toEqual({ ok: false, reason: 'signed_out' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403])('reports HTTP %i as access_denied', async (status) => {
    signedIn();
    fetchMock.mockResolvedValue(reply(status, { ok: false }));

    expect(await fetchTasks()).toEqual({ ok: false, reason: 'access_denied' });
    expect(await pollTasks('2026-10-09T00:00:00Z')).toEqual({ ok: false, reason: 'access_denied' });
  });

  it('reports any other failure as a plain error', async () => {
    signedIn();
    fetchMock.mockResolvedValue(reply(500));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(await fetchTasks()).toEqual({ ok: false, reason: 'error' });
  });
});

describe('useTaskStream polling (VTID-05063)', () => {
  it.each([401, 403])('stops polling for good after a %i and reports access denied', async (status) => {
    vi.useFakeTimers();
    signedIn();
    fetchMock.mockResolvedValueOnce(reply(200)).mockResolvedValue(reply(status, { ok: false }));

    const { result } = renderHook(() => useTaskStream());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.accessDenied).toBe(false);

    // Stream fails -> polling starts 10 s later -> first poll 10 s after that.
    act(() => {
      sources[0].onerror?.(new Event('error'));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.accessDenied).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never starts polling when the first read is already denied', async () => {
    vi.useFakeTimers();
    signedIn();
    fetchMock.mockResolvedValue(reply(403, { ok: false }));

    const { result } = renderHook(() => useTaskStream());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.accessDenied).toBe(true);

    act(() => {
      sources[0].onerror?.(new Event('error'));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps polling while access is granted', async () => {
    vi.useFakeTimers();
    signedIn();
    fetchMock.mockResolvedValue(reply(200));

    const { result } = renderHook(() => useTaskStream());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => {
      sources[0].onerror?.(new Event('error'));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(40_000);
    });
    // initial read + polls at 20 s, 30 s and 40 s after the stream error
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.current.accessDenied).toBe(false);
  });
});
