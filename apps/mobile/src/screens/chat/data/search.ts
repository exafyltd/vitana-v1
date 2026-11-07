/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — search in
 * one conversation (VTID-05317), native twin of web `src/hooks/useMessageSearch.ts`
 * (class B: Supabase session + fetch): `GET /api/v1/chat/search` with the same
 * query string (q, limit, scope `dm:<peer>` / `group:<id>`, type, from/to as
 * the member's local day bounds, cursor), at least 3 characters, 300 ms
 * debounce, up to 5 empty pages followed, pages appended without duplicates.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getGateway } from '../../../auth/gateway';

export const SEARCH_MIN_CHARS = 3;
export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MAX_EMPTY_PAGES = 5;
export const SEARCH_TYPES = ['any', 'image', 'video', 'file', 'voice', 'link'] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export interface MessageSearchFilters {
  scope?: string;
  type?: SearchType;
  from?: string | null;
  to?: string | null;
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

export function localDayBound(day: string, edge: 'start' | 'end'): string {
  return new Date(`${day}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}`).toISOString();
}

export function buildSearchQuery(q: string, f: MessageSearchFilters, cursor?: string | null, limit = 20): string {
  const p = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  if (f.scope && f.scope !== 'all') p.set('scope', f.scope);
  if (f.type && f.type !== 'any') p.set('type', f.type);
  if (f.from) p.set('from', DAY.test(f.from) ? localDayBound(f.from, 'start') : f.from);
  if (f.to) p.set('to', DAY.test(f.to) ? localDayBound(f.to, 'end') : f.to);
  if (cursor) p.set('cursor', cursor);
  return p.toString();
}

async function fetchPage(qs: string): Promise<{ results: MessageSearchResult[]; next_cursor: string | null }> {
  const res = await getGateway()(`/chat/search?${qs}`, {});
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; results?: MessageSearchResult[]; next_cursor?: string | null };
  if (!res.ok || body?.ok === false) throw new Error(body?.error || `search_failed_${res.status}`);
  return { results: Array.isArray(body.results) ? body.results : [], next_cursor: body.next_cursor ?? null };
}

async function fetchFilled(q: string, f: MessageSearchFilters, cursor: string | null) {
  let page = await fetchPage(buildSearchQuery(q, f, cursor));
  for (let i = 1; page.results.length === 0 && page.next_cursor && i < SEARCH_MAX_EMPTY_PAGES; i++) {
    page = await fetchPage(buildSearchQuery(q, f, page.next_cursor));
  }
  return page;
}

export function useMessageSearch(query: string, filters: MessageSearchFilters, enabled = true) {
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [cursor, setCursor] = useState<string | null>(null);
  const keyRef = useRef('');
  const q = query.trim();
  const filterKey = JSON.stringify([filters.scope ?? 'all', filters.type ?? 'any', filters.from ?? '', filters.to ?? '']);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    if (!enabled || q.length < SEARCH_MIN_CHARS) {
      keyRef.current = '';
      setResults([]);
      setCursor(null);
      setStatus('idle');
      return undefined;
    }
    setStatus('loading');
    const key = `${q}|${filterKey}`;
    keyRef.current = key;
    const timer = setTimeout(() => {
      fetchFilled(q, filtersRef.current, null)
        .then((page) => {
          if (keyRef.current !== key) return;
          setResults(page.results);
          setCursor(page.next_cursor);
          setStatus('done');
        })
        .catch(() => {
          if (keyRef.current !== key) return;
          setResults([]);
          setCursor(null);
          setStatus('error');
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q, filterKey, enabled]);

  const loadMore = useCallback(async () => {
    if (!cursor || status === 'loading') return;
    const key = keyRef.current;
    setStatus('loading');
    try {
      const page = await fetchFilled(q, filtersRef.current, cursor);
      if (keyRef.current !== key) return;
      setResults((prev) => {
        const seen = new Set(prev.map((r) => r.message_id));
        return [...prev, ...page.results.filter((r) => !seen.has(r.message_id))];
      });
      setCursor(page.next_cursor);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }, [cursor, status, q]);

  return { results, status, hasMore: !!cursor, loadMore, tooShort: q.length > 0 && q.length < SEARCH_MIN_CHARS };
}

/** The snippet split around the query (case-insensitive, literal) — odd parts are the matches. */
export function highlightParts(snippet: string, query: string): string[] {
  const q = query.trim();
  if (!q) return [snippet];
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'giu');
  return snippet.split(re);
}
