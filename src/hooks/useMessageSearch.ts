/**
 * VTID-05317 (messenger-ux-v2/ui-message-search, R12) — search the member's
 * messages through the gateway (GET /api/v1/chat/search, plan I5).
 *
 * - Debounced 300 ms; a newer query cancels the request still in flight, so
 *   results of an old query never replace newer ones.
 * - At least 3 characters (the gateway refuses shorter ones).
 * - Filters map 1:1 to the I5 query: scope, type, from, to, sender.
 * - The gateway may return a short page with a cursor (rows are re-checked
 *   after the query): `loadMore` keeps paging while `hasMore`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GATEWAY_API_URL } from '@/lib/gateway-base';

export const SEARCH_MIN_CHARS = 3;
export const SEARCH_DEBOUNCE_MS = 300;

export type SearchType = 'any' | 'image' | 'video' | 'file' | 'voice' | 'link';

export interface MessageSearchFilters {
  /** 'all' | 'dm:<peerId>' | 'group:<groupId>' */
  scope?: string;
  type?: SearchType;
  /** ISO date (yyyy-mm-dd) or ISO timestamp, inclusive */
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

/** The I5 query string for a query and filters (exported for tests). */
export function buildSearchQuery(q: string, f: MessageSearchFilters, cursor?: string | null, limit = 20): string {
  const p = new URLSearchParams({ q: q.trim(), limit: String(limit) });
  if (f.scope && f.scope !== 'all') p.set('scope', f.scope);
  if (f.type && f.type !== 'any') p.set('type', f.type);
  if (f.from) p.set('from', /^\d{4}-\d{2}-\d{2}$/.test(f.from) ? `${f.from}T00:00:00.000Z` : f.from);
  if (f.to) p.set('to', /^\d{4}-\d{2}-\d{2}$/.test(f.to) ? `${f.to}T23:59:59.999Z` : f.to);
  if (f.sender) p.set('sender', f.sender);
  if (cursor) p.set('cursor', cursor);
  return p.toString();
}

/** 'dm:<peerId>' / 'group:<groupId>' → its parts (null for anything else). */
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

async function fetchPage(qs: string, signal: AbortSignal): Promise<{ results: MessageSearchResult[]; next_cursor: string | null }> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('not_signed_in');
  const res = await fetch(`${GATEWAY_API_URL}/chat/search?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) throw new Error(body?.error || `search_failed_${res.status}`);
  return { results: Array.isArray(body.results) ? body.results : [], next_cursor: body.next_cursor ?? null };
}

export function useMessageSearch(query: string, filters: MessageSearchFilters, enabled = true) {
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    const key = `${q}|${filterKey}`;
    keyRef.current = key;
    const ctl = new AbortController();
    ctlRef.current = ctl;
    const timer = setTimeout(() => {
      fetchPage(buildSearchQuery(q, filters), ctl.signal)
        .then((page) => {
          if (ctl.signal.aborted || keyRef.current !== key) return;
          setResults(page.results);
          setCursor(page.next_cursor);
          setError(null);
          setStatus('done');
        })
        .catch((err) => {
          if (ctl.signal.aborted || (err as Error)?.name === 'AbortError') return;
          setResults([]);
          setCursor(null);
          setError(String((err as Error)?.message || err));
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
      const page = await fetchPage(buildSearchQuery(q, filters, cursor), ctl.signal);
      if (keyRef.current !== key) return;
      setResults((prev) => {
        const seen = new Set(prev.map((r) => r.message_id));
        return [...prev, ...page.results.filter((r) => !seen.has(r.message_id))];
      });
      setCursor(page.next_cursor);
      setStatus('done');
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setError(String((err as Error)?.message || err));
      setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey stands for filters
  }, [cursor, status, q, filterKey]);

  return { results, status, error, hasMore: !!cursor, loadMore, tooShort: q.length > 0 && q.length < SEARCH_MIN_CHARS };
}
