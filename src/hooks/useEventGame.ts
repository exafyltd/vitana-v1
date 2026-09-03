// Maxina Longevity Game — data access hooks.
//
// Everything here is Supabase-direct, matching the existing profile_posts/
// profile_post_likes architecture (no gateway route exists for those either).
// Scoring itself is never computed client-side — every read here reflects
// the server-authoritative event_game_points ledger via RPC or RLS-gated
// SELECT; the client never sets score/rank/points.

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { useTenant } from '@/hooks/useTenant';
import { useNativeShare } from '@/hooks/useNativeShare';
import { t } from '@/lib/i18n-toast';

export interface EventGame {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rules_text: string | null;
  status: 'draft' | 'scheduled' | 'live' | 'ended' | 'archived';
  starts_at: string;
  ends_at: string;
  points_registration: number;
  points_event_post: number;
  points_longevity_post: number;
  points_like_received: number;
  points_like_received_cap: number;
  max_posts_per_user: number;
  hero_image_url: string | null;
  winner_reward_text: string | null;
  winner_reward_description: string | null;
}

export type EventGamePhase = 'pre' | 'live' | 'ended';

/** Client-side phase derivation from timestamps — mirrors the DB triggers'
 * own authority exactly (starts_at <= now < ends_at), never derived from
 * `status`, so the UI can never disagree with what actually scored. */
export function useEventGamePhase(game: EventGame | null | undefined): EventGamePhase | null {
  // Re-derive on a slow tick so a session left open across starts_at/ends_at
  // transitions naturally without a reload. Per-second precision belongs to
  // the countdown display itself, not this coarse phase gate.
  const now = useTickingClock(30_000);
  return useMemo(() => {
    if (!game) return null;
    const nowMs = now;
    const starts = new Date(game.starts_at).getTime();
    const ends = new Date(game.ends_at).getTime();
    if (nowMs < starts) return 'pre';
    if (nowMs < ends) return 'live';
    return 'ended';
  }, [game, now]);
}

function useTickingClock(intervalMs: number): number {
  const [nowState, setNowState] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowState(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return nowState;
}

/** Resolves the event game either by public slug (QR/public landing) or,
 * with no slug, the tenant's current scheduled/live game (in-app entry). */
export function useEventGame(slug?: string) {
  return useQuery({
    queryKey: ['event-game', slug ?? 'current'],
    queryFn: async () => {
      let query = supabase.from('event_games' as never).select('*');
      if (slug) {
        query = (query as any).eq('slug', slug);
      } else {
        query = (query as any)
          .in('status', ['scheduled', 'live'])
          .order('starts_at', { ascending: true })
          .limit(1);
      }
      const { data, error } = await (query as any).maybeSingle();
      if (error) throw error;
      return (data as unknown as EventGame) ?? null;
    },
  });
}

export function useEventGameJoin(eventGameId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const standingQueryKey = ['event-game-standing', eventGameId, user?.id];

  const isParticipantQuery = useQuery({
    queryKey: ['event-game-participant', eventGameId, user?.id],
    queryFn: async () => {
      if (!eventGameId || !user?.id) return false;
      const { data, error } = await supabase
        .from('event_game_participants' as never)
        .select('id')
        .eq('event_game_id', eventGameId as never)
        .eq('user_id', user.id as never)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!eventGameId && !!user?.id,
  });

  const join = useMutation({
    mutationFn: async () => {
      if (!eventGameId || !user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('event_game_participants' as never)
        .insert({ event_game_id: eventGameId, user_id: user.id } as never);
      if (error) {
        // A repeat "Join" tap hits the unique(event_game_id,user_id)
        // constraint — treat as already-joined, same reconciliation idiom
        // useProfilePosts.createPost uses for transport-drop retries.
        if ((error as { code?: string }).code !== '23505') throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-game-participant', eventGameId, user?.id] });
      queryClient.invalidateQueries({ queryKey: standingQueryKey });
      queryClient.invalidateQueries({ queryKey: ['event-game-leaderboard', eventGameId] });
    },
  });

  return {
    isParticipant: !!isParticipantQuery.data,
    isLoading: isParticipantQuery.isLoading,
    join,
  };
}

export interface EventGameLeaderboardRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  post_count: number;
  rank: number;
  achieved_at: string;
}

export function useEventGameLeaderboard(eventGameId: string | undefined, opts: { live: boolean; limit?: number }) {
  const queryClient = useQueryClient();
  const queryKey = ['event-game-leaderboard', eventGameId, opts.limit ?? 100];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_event_game_leaderboard' as never, {
        p_event_game_id: eventGameId,
        p_limit: opts.limit ?? 100,
      } as never);
      if (error) throw error;
      return (data as unknown as EventGameLeaderboardRow[]) ?? [];
    },
    enabled: !!eventGameId,
    refetchInterval: opts.live ? 8000 : false,
  });

  // Realtime nudge: an immediate refetch on any new ledger row for this game,
  // on top of the polling baseline — same pattern already proven in
  // useGroupPosts.ts / ReportedContentNew.tsx.
  useEffect(() => {
    if (!eventGameId || !opts.live) return;
    const channel = supabase
      .channel(`event-game-points-${eventGameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'event_game_points', filter: `event_game_id=eq.${eventGameId}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventGameId, opts.live]);

  return query;
}

export interface MyEventGameStanding {
  score: number;
  rank: number;
  post_count: number;
  achieved_at: string | null;
  breakdown: Record<string, number> | null;
}

export function useMyEventGameStanding(eventGameId: string | undefined, opts: { live: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['event-game-standing', eventGameId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_event_game_rank' as never, {
        p_event_game_id: eventGameId,
      } as never);
      if (error) throw error;
      const rows = (data as unknown as MyEventGameStanding[]) ?? [];
      return rows[0] ?? { score: 0, rank: 0, post_count: 0, achieved_at: null, breakdown: null };
    },
    enabled: !!eventGameId && !!user?.id,
    refetchInterval: opts.live ? 8000 : false,
  });
}

/** Thin wrapper over the existing useNativeShare() hook — reused unchanged,
 * only the payload is event-game-specific. Deliberately exposes only rank/
 * score/game name: never health data, VITANA Index, or private profile
 * fields (per the spec's explicit sharing-safety requirement). */
export function useNativeShareResult(game: EventGame, rank: number | undefined, score: number | undefined) {
  const { isAvailable, share: shareRaw } = useNativeShare({ contentId: game.id, contentType: 'event_game_result' });
  const share = () =>
    shareRaw({
      title: t('eventGame.results.share'),
      text: t('eventGame.results.yourResultTitle') + ' ' + t('eventGame.results.yourRank', { rank: rank ?? '—' }) + ' — ' + game.name,
      url: `${window.location.origin}/e/game/${game.slug}`,
    });
  return { isAvailable, share };
}

/** Direct Supabase read of tenant_settings.feature_flags.enable_event_game —
 * deliberately NOT useTenantSettings() (that hook calls an admin-gated
 * gateway route, unusable by ordinary participants). tenant_settings' own
 * `tenant_read` RLS policy already lets any authenticated tenant member
 * SELECT the row directly, confirmed against the real migration. */
export function useEventGameFeatureFlag() {
  const { activeTenantId } = useTenant();
  return useQuery({
    queryKey: ['event-game-feature-flag', activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return false;
      const { data, error } = await supabase
        .from('tenant_settings' as never)
        .select('feature_flags')
        .eq('tenant_id', activeTenantId as never)
        .maybeSingle();
      if (error) throw error;
      const flags = (data as unknown as { feature_flags?: Record<string, unknown> } | null)?.feature_flags;
      return flags?.enable_event_game === true;
    },
    enabled: !!activeTenantId,
    staleTime: 60_000,
  });
}
