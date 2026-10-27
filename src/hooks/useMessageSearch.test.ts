/**
 * VTID-05317 (messenger-ux-v2/ui-message-search, R12) — the search hook.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let session: { access_token: string } | null = { access_token: 'tok' };
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session } }) } },
}));
vi.mock('@/lib/gateway-base', () => ({ GATEWAY_API_URL: 'https://gw.test/api/v1' }));

import {
  buildSearchQuery,
  localDayBound,
  SEARCH_MAX_EMPTY_PAGES,
  parseConversationKey,
  searchResultPath,
  useMessageSearch,
  SEARCH_DEBOUNCE_MS,
  type MessageSearchFilters,
} from './useMessageSearch';

const row = (id: string, at = '2026-10-20T10:00:00.000Z') => ({
  message_id: id, conversation_key: 'dm:peer-1', sender_id: 'peer-1', created_at: at, snippet: `hello ${id}`, message_type: 'text',
});

type Reply = { status?: number; body: unknown } | Promise<{ status?: number; body: unknown }>;
let replies: Reply[] = [];
const fetchMock = vi.fn(async (_url: string, init?: { signal?: AbortSignal }) => {
  const next = await (replies.shift() ?? { body: { ok: true, results: [], next_cursor: null } });
  if (init?.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
  const status = next.status ?? 200;
  return { ok: status < 400, status, json: async () => next.body };
});
const urlOf = (call: number) => new URL(fetchMock.mock.calls[call][0] as string);

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockClear();
  replies = [];
  session = { access_token: 'tok' };
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('buildSearchQuery', () => {
  it('maps every filter to the I5 query and leaves out the defaults', () => {
    const p = new URLSearchParams(buildSearchQuery('  hello ', { scope: 'all', type: 'any' }));
    expect(Object.fromEntries(p)).toEqual({ q: 'hello', limit: '20' });

    const f: MessageSearchFilters = { scope: 'group:g1', type: 'image', from: '2026-10-01', to: '2026-10-05', sender: 'u2' };
    const q = new URLSearchParams(buildSearchQuery('cat', f, '2026-10-04T09:00:00.000Z', 10));
    expect(Object.fromEntries(q)).toEqual({
      q: 'cat', limit: '10', scope: 'group:g1', type: 'image',
      from: localDayBound('2026-10-01', 'start'), to: localDayBound('2026-10-05', 'end'), sender: 'u2', cursor: '2026-10-04T09:00:00.000Z',
    });
  });

  it('a date is the member\'s local day, not the UTC one', () => {
    const tz = process.env.TZ;
    process.env.TZ = 'Europe/Berlin';
    try {
      const q = new URLSearchParams(buildSearchQuery('cat', { from: '2026-10-01', to: '2026-10-01' }));
      expect(q.get('from')).toBe('2026-09-30T22:00:00.000Z');
      expect(q.get('to')).toBe('2026-10-01T21:59:59.999Z');
    } finally {
      process.env.TZ = tz;
    }
  });

  it('keeps full timestamps as given', () => {
    const q = new URLSearchParams(buildSearchQuery('cat', { from: '2026-10-01T08:00:00.000Z' }));
    expect(q.get('from')).toBe('2026-10-01T08:00:00.000Z');
  });
});

describe('result routing', () => {
  it('opens a DM hit at /inbox/u/<peer>/msg/<id> and a group hit at /inbox/g/<group>/msg/<id>', () => {
    expect(searchResultPath({ conversation_key: 'dm:peer-1', message_id: 'm1' })).toBe('/inbox/u/peer-1/msg/m1');
    expect(searchResultPath({ conversation_key: 'group:g-9', message_id: 'm2' })).toBe('/inbox/g/g-9/msg/m2');
    expect(searchResultPath({ conversation_key: 'weird', message_id: 'm3' })).toBeNull();
    expect(parseConversationKey('dm:')).toBeNull();
  });
});

describe('useMessageSearch', () => {
  it('waits for the debounce and sends one request for the last query, with the session token', async () => {
    replies = [{ body: { ok: true, results: [row('a')], next_cursor: null } }];
    const { result, rerender } = renderHook(({ q }) => useMessageSearch(q, { scope: 'dm:peer-1' }), { initialProps: { q: 'hel' } });
    rerender({ q: 'hell' });
    rerender({ q: 'hello' });
    expect(result.current.status).toBe('loading');
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1); });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(urlOf(0).origin + urlOf(0).pathname).toBe('https://gw.test/api/v1/chat/search');
    expect(urlOf(0).searchParams.get('q')).toBe('hello');
    expect(urlOf(0).searchParams.get('scope')).toBe('dm:peer-1');
    expect((fetchMock.mock.calls[0][1] as { headers: Record<string, string> }).headers.Authorization).toBe('Bearer tok');
    expect(result.current.status).toBe('done');
    expect(result.current.results.map((r) => r.message_id)).toEqual(['a']);
  });

  it('does not search below 3 characters and says so', async () => {
    const { result } = renderHook(() => useMessageSearch('hi', {}));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.tooShort).toBe(true);
    expect(result.current.status).toBe('idle');
  });

  it('a newer query wins: the answer to the old one never replaces it', async () => {
    let releaseOld!: (v: { body: unknown }) => void;
    replies = [
      new Promise((r) => { releaseOld = r; }),
      { body: { ok: true, results: [row('new')], next_cursor: null } },
    ];
    const { result, rerender } = renderHook(({ q }) => useMessageSearch(q, {}), { initialProps: { q: 'old query' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    rerender({ q: 'new query' });
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });
    expect(result.current.results.map((r) => r.message_id)).toEqual(['new']);
    await act(async () => { releaseOld({ body: { ok: true, results: [row('old')], next_cursor: null } }); await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.results.map((r) => r.message_id)).toEqual(['new']);
    expect((fetchMock.mock.calls[0][1] as { signal: AbortSignal }).signal.aborted).toBe(true);
  });

  it('changing a filter searches again', async () => {
    const { rerender } = renderHook(({ type }) => useMessageSearch('hello', { type }), { initialProps: { type: 'any' as const } as { type: 'any' | 'file' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });
    rerender({ type: 'file' });
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urlOf(1).searchParams.get('type')).toBe('file');
  });

  it('reports a failed search as an error', async () => {
    replies = [{ status: 429, body: { ok: false, error: 'rate_limited' } }];
    const { result } = renderHook(() => useMessageSearch('hello', {}));
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('rate_limited');
    expect(result.current.results).toEqual([]);
  });

  it('loadMore pages with the cursor and skips rows it already has', async () => {
    replies = [
      { body: { ok: true, results: [row('a'), row('b')], next_cursor: '2026-10-20T09:00:00.000Z' } },
      { body: { ok: true, results: [row('b'), row('c')], next_cursor: null } },
    ];
    const { result } = renderHook(() => useMessageSearch('hello', {}));
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });
    expect(result.current.hasMore).toBe(true);
    await act(async () => { await result.current.loadMore(); });
    expect(urlOf(1).searchParams.get('cursor')).toBe('2026-10-20T09:00:00.000Z');
    expect(result.current.results.map((r) => r.message_id)).toEqual(['a', 'b', 'c']);
    expect(result.current.hasMore).toBe(false);
  });

  it('skips empty pages that still have a cursor (bounded), so "no results" is not shown too early', async () => {
    replies = [
      { body: { ok: true, results: [], next_cursor: 'c1' } },
      { body: { ok: true, results: [], next_cursor: 'c2' } },
      { body: { ok: true, results: [row('x')], next_cursor: 'c3' } },
    ];
    const { result } = renderHook(() => useMessageSearch('hello', { type: 'link' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(urlOf(2).searchParams.get('cursor')).toBe('c2');
    expect(result.current.results.map((r) => r.message_id)).toEqual(['x']);
    expect(result.current.hasMore).toBe(true);
  });

  it('stops skipping after the bound and keeps "more" available', async () => {
    replies = Array.from({ length: 10 }, (_, i) => ({ body: { ok: true, results: [], next_cursor: `c${i}` } }));
    const { result } = renderHook(() => useMessageSearch('hello', {}));
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });
    expect(fetchMock).toHaveBeenCalledTimes(SEARCH_MAX_EMPTY_PAGES);
    expect(result.current.results).toEqual([]);
    expect(result.current.hasMore).toBe(true);
  });

  it('a "more" request still running when the query changes never lands in the new results', async () => {
    let releaseMore!: (v: { body: unknown }) => void;
    replies = [
      { body: { ok: true, results: [row('a')], next_cursor: 'c1' } },
      new Promise((r) => { releaseMore = r; }),
      { body: { ok: true, results: [row('new')], next_cursor: null } },
    ];
    const { result, rerender } = renderHook(({ q }) => useMessageSearch(q, {}), { initialProps: { q: 'first' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });
    let more!: Promise<void>;
    act(() => { more = result.current.loadMore(); });
    rerender({ q: 'second' });
    await act(async () => { await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS); });
    await act(async () => { releaseMore({ body: { ok: true, results: [row('stale')], next_cursor: null } }); await more; });
    expect(result.current.results.map((r) => r.message_id)).toEqual(['new']);
  });

  it('does nothing while disabled (panel closed)', async () => {
    renderHook(() => useMessageSearch('hello', {}, false));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
