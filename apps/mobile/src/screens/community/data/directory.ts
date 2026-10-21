/**
 * VTID-05296 (N-W2 community-hub) — native twin of the gateway-backed
 * directory reads the web community screens use: the members directory
 * (`/community/members`, web `Members.tsx`), the open-asks feed
 * (`/community/open-asks`, web `OpenAsks.tsx`) and the global member search
 * (`global_community_profiles`, web `useCommunityMembers.ts`). Reads only;
 * the member-listing queries are reused unchanged, so the test/service
 * allowlist exclusion (program NEVER rule 45) is inherited, not re-added.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGateway } from '../../../auth/gateway';
import { gatewayJson } from '../../../ports/core';
import { getSupabase } from '../../../auth/client';

// ── Members directory (gateway cursor feed) ────────────────────────────────

export interface DancePreview {
  variety: string | null;
  level: string | null;
  role: string | null;
}

export interface MemberRow {
  vitana_id: string | null;
  registration_seq: number | null;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  member_since: string | null;
  dance_preview: DancePreview | null;
}

export type MemberSort = 'newest' | 'oldest' | 'name';

interface MembersPage {
  members: MemberRow[];
  next_cursor: string | null;
}

/** Mirrors the `Members.tsx` cursor pager over `/api/v1/community/members`. */
export function useMembersDirectory(sort: MemberSort, danceFilter: string | null) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (loadingRef.current) return;
      if (!reset && !hasMore) return;
      loadingRef.current = true;
      setLoading(true);
      if (reset) setError(false);
      try {
        const params = new URLSearchParams();
        params.set('limit', '20');
        params.set('sort', sort);
        if (!reset && cursor) params.set('cursor', cursor);
        if (danceFilter) params.set('dance', danceFilter);
        const data = await gatewayJson<MembersPage>(getGateway(), `/community/members?${params.toString()}`);
        const rows = Array.isArray(data.members) ? data.members : [];
        setMembers((prev) => (reset ? rows : [...prev, ...rows]));
        setCursor(data.next_cursor ?? null);
        setHasMore(Boolean(data.next_cursor));
      } catch {
        setError(true);
        setHasMore(false);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [sort, danceFilter, cursor, hasMore],
  );

  // Reset + reload when sort or filter changes (web Members.tsx effect).
  useEffect(() => {
    setMembers([]);
    setCursor(null);
    setHasMore(true);
    void fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, danceFilter]);

  return {
    members,
    loading,
    error,
    hasMore,
    loadMore: () => fetchPage(false),
    retry: () => fetchPage(true),
  };
}

// ── Open asks feed (gateway cursor feed) ───────────────────────────────────

export interface AskRow {
  intent_id: string;
  requester_vitana_id: string | null;
  intent_kind: string;
  category: string | null;
  title: string;
  scope_excerpt: string;
  kind_payload: Record<string, unknown> | null;
  created_at: string;
}

interface AsksPage {
  asks: AskRow[];
  next_cursor: string | null;
}

/** Mirrors the `OpenAsks.tsx` cursor pager over `/api/v1/community/open-asks`. */
export function useOpenAsks(kindFilter: string | null, danceOnly: boolean) {
  const [asks, setAsks] = useState<AskRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(
    async (reset: boolean) => {
      if (loadingRef.current) return;
      if (!reset && !hasMore) return;
      loadingRef.current = true;
      setLoading(true);
      if (reset) setError(false);
      try {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (!reset && cursor) params.set('cursor', cursor);
        if (kindFilter) params.set('kind', kindFilter);
        if (danceOnly) params.set('category_prefix', 'dance.');
        const data = await gatewayJson<AsksPage>(getGateway(), `/community/open-asks?${params.toString()}`);
        const rows = Array.isArray(data.asks) ? data.asks : [];
        setAsks((prev) => (reset ? rows : [...prev, ...rows]));
        setCursor(data.next_cursor ?? null);
        setHasMore(Boolean(data.next_cursor));
      } catch {
        setError(true);
        setHasMore(false);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [kindFilter, danceOnly, cursor, hasMore],
  );

  useEffect(() => {
    setAsks([]);
    setCursor(null);
    setHasMore(true);
    void fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindFilter, danceOnly]);

  return {
    asks,
    loading,
    error,
    hasMore,
    loadMore: () => fetchPage(false),
    retry: () => fetchPage(true),
  };
}

// ── Global member search (Supabase, web useCommunityMembers.ts) ────────────

export interface SearchMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** Mirrors `useCommunityMembers` — visible global community profiles, name search. */
export function useMemberSearch(query: string) {
  const term = query.trim();
  return useQuery({
    queryKey: ['community-member-search', term],
    enabled: term.length >= 2 || term.length === 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SearchMember[]> => {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let q = supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .eq('is_visible', true)
        .order('display_name', { ascending: true })
        .limit(20);
      if (term) q = q.ilike('display_name', `%${term}%`);
      const { data, error } = await q;
      if (error) throw error;
      return ((data as SearchMember[] | null) ?? []).filter((p) => !user || p.user_id !== user.id);
    },
  });
}
