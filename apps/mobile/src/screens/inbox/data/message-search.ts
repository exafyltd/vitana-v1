/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the inbox's
 * message search (web VTID-05317), re-implemented natively from
 * `src/hooks/useMessageSearch.ts` (class B: web Supabase session + gateway
 * fetch). Same request: `GET /api/v1/chat/search?q=…&limit=20[&scope][&type]
 * [&from][&to][&sender][&cursor]` with the member's Bearer token (N1
 * `createGatewayFetch`):
 *  - debounced 300 ms, at least 3 characters; a newer query aborts the one in
 *    flight so old results never replace newer ones,
 *  - empty pages that still carry a cursor are skipped (up to 5), `loadMore`
 *    keeps paging while there is a cursor,
 *  - yyyy-mm-dd dates are the member's local days.
 * The pure helpers (`buildSearchQuery`, `parseConversationKey`,
 * `searchResultPath`) are mirrored line for line.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getGateway } from '../../../auth/gateway';

export const SEARCH_MIN_CHARS = 3;
export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MAX_EMPTY_PAGES = 5;

export type SearchType = 'any' | 'image' | 'video' | 'file' | 'voice' | 'link';
export const SEARCH_TYPES: readonly SearchType[] = ['any', 'image', 'video', 'file', 'voice', 'link'];

export interface MessageSearchFilters {
  /** 'all' | 'dm:<peerId>' | 'group:<groupId>' */
  scope?: string;
  type?: SearchType;
  from?: string | null;
  to?: string | null;
  sender?: string | null;
}

export interface MessageSearchResult {
  message_id: string;
  conversation_key: string;
  sender_id: string;
  created_at: string;
  snippet: string;
  message_type: string;
}

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A yyyy-mm-dd is the member's local day: its first / last instant, as UTC ISO. */
export function localDayBound(day: string, edge: 'start' | 'end'): string {
  return new Date(`${day}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}`).toISOString();
}

/** Whether `s` is a complete yyyy-mm-dd day (the web date input only yields those). */
export function isSearchDay(s: string): boolean {
  return DAY.test(s) && Number.isFinite(new Date(`${s}T00:00:00`).getTime());
}

export function buildSearchQuery(q: string, f: MessageSearchFilters, cursor?: string | null, limit = 20): string {
  const p = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  if (f.scope && f.scope !== 'all') p.set('scope', f.scope);
  if (f.type && f.type !== 'any') p.set('type', f.type);
  if (f.from) p.set('from', DAY.test(f.from) ? localDayBound(f.from, 'start') : f.from);
  if (f.to) p.set('to', DAY.test(f.to) ? localDayBound(f.to, 'end') : f.to);
  if (f.sender) p.set('sender', f.sender);
  if (cursor) p.set('cursor', cursor);
  return p.toString();
}

export function parseConversationKey(key: string): { kind: 'dm' | 'group'; id: string } | null {
  const at = key.indexOf(':');
  const kind = key.slice(0, at);
  const id = key.slice(at + 1);
  if ((kind !== 'dm' && kind !== 'group') || !id) return null;
  return { kind, id };
}

/** The inbox route that opens a result's conversation at the message (null if the key is unknown). */
export function searchResultPath(r: Pick<MessageSearchResult, 'conversation_key' | 'message_id'>): string | null {
  const c = parseConversationKey(r.conversation_key);
  if (!c) return null;
  const msg = encodeURIComponent(r.message_id);
  return c.kind === 'group' ? `/inbox/g/${encodeURIComponent(c.id)}/msg/${msg}` : `/inbox/u/${encodeURIComponent(c.id)}/msg/${msg}`;
}

type Page = { results: MessageSearchResult[]; next_cursor: string | null };

async function fetchPage(qs: string, signal: AbortSignal): Promise<Page> {
  const res = await getGateway()(`/chat/search?${qs}`, { signal });
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse((await res.text()) || '{}') as Record<string, unknown>;
  } catch {
    body = {};
  }
  if (!res.ok || body.ok === false) throw new Error(typeof body.error === 'string' ? body.error : `search_failed_${res.status}`);
  return { results: Array.isArray(body.results) ? (body.results as MessageSearchResult[]) : [], next_cursor: (body.next_cursor as string | null | undefined) ?? null };
}

async function fetchFilled(q: string, f: MessageSearchFilters, cursor: string | null, signal: AbortSignal): Promise<Page> {
  let page = await fetchPage(buildSearchQuery(q, f, cursor), signal);
  for (let i = 1; page.results.length === 0 && page.next_cursor && i < SEARCH_MAX_EMPTY_PAGES; i++) {
    page = await fetchPage(buildSearchQuery(q, f, page.next_cursor), signal);
  }
  return page;
}

export function useMessageSearch(query: string, filters: MessageSearchFilters, enabled = true) {
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [cursor, setCursor] = useState<string | null>(null);
  const ctlRef = useRef<AbortController | null>(null);
  const keyRef = useRef('');

  const q = query.trim();
  const filterKey = JSON.stringify([filters.scope ?? 'all', filters.type ?? 'any', filters.from ?? '', filters.to ?? '', filters.sender ?? '']);

  useEffect(() => {
    ctlRef.current?.abort();
    if (!enabled || q.length < SEARCH_MIN_CHARS) {
      setResults([]);
      setCursor(null);
      setStatus('idle');
      return undefined;
    }
    setStatus('loading');
    const key = `${q}|${filterKey}`;
    keyRef.current = key;
    const ctl = new AbortController();
    ctlRef.current = ctl;
    const timer = setTimeout(() => {
      fetchFilled(q, filters, null, ctl.signal)
        .then((page) => {
          if (ctl.signal.aborted || keyRef.current !== key) return;
          setResults(page.results);
          setCursor(page.next_cursor);
          setStatus('done');
        })
        .catch((err) => {
          if (ctl.signal.aborted || (err as Error)?.name === 'AbortError') return;
          setResults([]);
          setCursor(null);
          setStatus('error');
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey stands for filters
  }, [q, filterKey, enabled]);

  const loadMore = useCallback(async () => {
    if (!cursor || status === 'loading') return;
    const key = keyRef.current;
    const ctl = new AbortController();
    ctlRef.current = ctl;
    setStatus('loading');
    try {
      const page = await fetchFilled(q, filters, cursor, ctl.signal);
      if (keyRef.current !== key) return;
      setResults((prev) => {
        const seen = new Set(prev.map((r) => r.message_id));
        return [...prev, ...page.results.filter((r) => !seen.has(r.message_id))];
      });
      setCursor(page.next_cursor);
      setStatus('done');
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey stands for filters
  }, [cursor, status, q, filterKey]);

  return { results, status, hasMore: !!cursor, loadMore, tooShort: q.length > 0 && q.length < SEARCH_MIN_CHARS };
}
