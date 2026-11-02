/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — the Supabase reads
 * and writes My Journey makes, through the app's one Supabase client
 * (`auth/client.ts`). Native twins of class-B web hooks (they import the web
 * Supabase client), with the same tables, filters, query keys and RPCs:
 *
 *  - `useRealMatches.ts` + `useMarkMatchesViewed.ts` (MatchesPreview)
 *  - `useCommunityEvents.ts` fetchCommunityEventsQueryFn + fetchParticipantCounts (EventsPreview)
 *  - `useLifeCompass.ts` query + updateCompass (GoalSetupDialog)
 *  - `useVitanaIndex.ts` + `useVitanaIndexHistory.ts` (Index cards, popup lift strip)
 *  - `useUserPreferences.ts` (the AI-data consent flag behind the Autopilot popup)
 *
 * The member id comes from the native auth context (`useAuth`) instead of
 * `supabase.auth.getUser()`; the rows read are the same.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';
import { notify, notifyError, getVitanaIndexTier, type VitanaIndexTier } from '../../../ports/journey';

const db = () => getSupabase() as any;

// ── matches ──────────────────────────────────────────────────────────────
/** A reason as stored in `daily_matches.match_reasons` (string = legacy). */
export type MatchReason = string | { code: string; params?: Record<string, string | number> };

export interface RealMatch {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  match_reason: MatchReason | null;
  compatibility_score: number;
}

interface DailyMatchRow {
  matched_user_id: string;
  match_score: number;
  match_reasons: unknown;
}

/** web useRealMatches(limit): live matches → generate when empty → visible profiles only. */
export function useRealMatches(limit = 3) {
  const { user } = useAuth();
  return useQuery<RealMatch[]>({
    queryKey: ['real-matches', limit],
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const fetchMatches = async (): Promise<{ rows: DailyMatchRow[]; hadError: boolean }> => {
        const { data, error } = await db()
          .from('daily_matches')
          .select('matched_user_id, match_score, match_reasons')
          .eq('user_id', user.id)
          .gt('expires_at', new Date().toISOString())
          .is('action', null)
          .order('match_score', { ascending: false })
          .limit(limit);
        return { rows: (data as DailyMatchRow[] | null) ?? [], hadError: !!error };
      };
      let { rows: matches, hadError } = await fetchMatches();
      if (matches.length === 0 && !hadError) {
        try {
          await db().functions.invoke('generate-daily-matches');
        } catch {
          // ignore — no matches below
        }
        ({ rows: matches, hadError } = await fetchMatches());
      }
      if (matches.length === 0) return [];
      const profiles = await Promise.all(
        matches.map(async (m) => {
          const { data } = await db().rpc('get_user_profile_by_identifier', { identifier: m.matched_user_id });
          return Array.isArray(data) ? data[0] : undefined;
        }),
      );
      return matches
        .map((m, idx) => ({ m, profile: profiles[idx] }))
        .filter(({ profile }) => Boolean(profile))
        .map(({ m, profile }) => {
          const reasons: MatchReason[] = Array.isArray(m.match_reasons)
            ? (m.match_reasons as unknown[]).filter((r): r is MatchReason => typeof r === 'string' || (typeof r === 'object' && r !== null && 'code' in r))
            : [];
          return {
            user_id: m.matched_user_id,
            display_name: profile?.display_name || profile?.full_name || null,
            avatar_url: profile?.avatar_url ?? null,
            match_reason: reasons[0] ?? null,
            compatibility_score: Math.round(Number(m.match_score) || 0),
          };
        });
    },
  });
}

/** VTID-04827: the member saw these match cards — stamp `viewed_at` once per id per mount. */
export function useMarkMatchesViewed(matchedUserIds: string[]): void {
  const { user } = useAuth();
  const sent = useRef(new Set<string>());
  const key = matchedUserIds.join(',');
  useEffect(() => {
    if (!user) return;
    const fresh = matchedUserIds.filter((id) => !sent.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => sent.current.add(id));
    const now = new Date().toISOString();
    void Promise.resolve(
      db().from('daily_matches').update({ viewed_at: now }).eq('user_id', user.id).in('matched_user_id', fresh).is('viewed_at', null).gt('expires_at', now),
    ).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id]);
}

// ── events ───────────────────────────────────────────────────────────────
export interface CommunityEventPreview {
  id: string;
  title: string;
  start_time: string;
  participant_count: number;
  virtual_link: string | null;
  image_url?: string | null;
}

const RECENT_CREATED_DAYS = 14;

/** web fetchCommunityEventsQueryFn (nearest 100 + recently created 50, merged by id, by start) + attendee counts. */
export async function fetchCommunityEvents(): Promise<CommunityEventPreview[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recentSince = new Date(Date.now() - RECENT_CREATED_DAYS * 24 * 60 * 60 * 1000);
  const [nearest, recent] = await Promise.all([
    db().from('global_community_events').select('*').gte('start_time', today.toISOString()).order('start_time', { ascending: true }).limit(100),
    db()
      .from('global_community_events')
      .select('*')
      .gte('start_time', today.toISOString())
      .gte('created_at', recentSince.toISOString())
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  if (nearest.error) throw new Error(nearest.error.message ?? 'events');
  const byId = new Map<string, any>();
  for (const row of [...(nearest.data || []), ...(recent.data || [])]) if (!byId.has(row.id)) byId.set(row.id, row);
  const rows = [...byId.values()].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const counts = new Map<string, number>();
  if (rows.length > 0) {
    const r = await db().from('global_event_participants').select('event_id').in('event_id', rows.map((e) => e.id)).eq('status', 'attending');
    if (!r.error) for (const p of r.data || []) counts.set(p.event_id, (counts.get(p.event_id) || 0) + 1);
  }
  return rows.map((e) => ({
    id: e.id,
    title: e.title,
    start_time: e.start_time,
    participant_count: counts.get(e.id) || 0,
    virtual_link: e.virtual_link ?? null,
    image_url: e.image_url ?? null,
  }));
}

/** web useCommunityEvents → todayEvents + upcomingEvents (same user-scoped key). */
export function useCommunityEvents() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['global-community-events', user?.id ?? 'anonymous'], queryFn: fetchCommunityEvents, staleTime: 60 * 1000, enabled: !!user });
  const events = query.data ?? [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = (iso: string) => {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  return {
    todayEvents: events.filter((e) => day(e.start_time) === today.getTime()),
    upcomingEvents: events.filter((e) => day(e.start_time) >= tomorrow.getTime()),
    isLoading: query.isLoading,
  };
}

// ── life compass ─────────────────────────────────────────────────────────
export interface LifeCompass {
  id: string;
  primary_goal: string;
  category: string;
  version: number;
  target_date: string | null;
  target_value: number | null;
  target_unit: string | null;
}

export function useLifeCompass() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: compass } = useQuery({
    queryKey: ['life-compass'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db()
        .from('life_compass')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as LifeCompass | null;
    },
  });
  const mutation = useMutation({
    mutationFn: async (goal: { primary_goal: string; category: string; target_date?: string | null; target_value?: number | null; target_unit?: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      if (compass) await db().from('life_compass').update({ is_active: false }).eq('id', compass.id);
      const payload: Record<string, unknown> = {
        user_id: user.id,
        primary_goal: goal.primary_goal,
        category: goal.category,
        is_active: true,
        version: compass ? compass.version + 1 : 1,
      };
      if (goal.target_date != null) payload.target_date = goal.target_date;
      if (goal.target_value != null) payload.target_value = goal.target_value;
      if (goal.target_unit != null) payload.target_unit = goal.target_unit;
      const { data, error } = await db().from('life_compass').insert(payload).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['life-compass'] });
      void queryClient.invalidateQueries({ queryKey: ['my-journey'] });
      notify('toasts.hooks.lifeCompassUpdated', 'toasts.hooks.yourAiGuidanceHasUpdatedAlign');
    },
    onError: () => {
      notifyError('toasts.hooks.failedUpdate');
    },
  });
  return { compass: compass ?? null, updateCompassAsync: mutation.mutateAsync, isUpdating: mutation.isPending };
}

// ── Vitana Index ─────────────────────────────────────────────────────────
export interface VitanaIndexState {
  total: number;
  tier: VitanaIndexTier;
  pillars: Record<'nutrition' | 'hydration' | 'exercise' | 'sleep' | 'mental', number>;
  history: Array<{ date: string; score: number }>;
}

const INDEX_SELECT_COLUMNS = 'date, score_total, score_nutrition, score_hydration, score_exercise, score_sleep, score_mental, confidence, model_version, feature_inputs';

/** web fetchVitanaIndex: trailing 7 days → self-heal compute → latest-ever fallback. */
export async function fetchVitanaIndex(userId: string | undefined): Promise<VitanaIndexState | null> {
  if (!userId) return null;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const fromDate = sevenDaysAgo.toISOString().slice(0, 10);
  const trailing = async () => {
    const { data, error } = await db().from('vitana_index_scores').select(INDEX_SELECT_COLUMNS).eq('user_id', userId).gte('date', fromDate).order('date', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  };
  let rows = await trailing();
  if (rows.length === 0) {
    try {
      await db().rpc('health_compute_vitana_index', { p_date: new Date().toISOString().slice(0, 10), p_model_version: 'v3-5pillar' });
      rows = await trailing();
    } catch {
      /* best-effort */
    }
  }
  if (rows.length === 0) {
    const { data, error } = await db().from('vitana_index_scores').select(INDEX_SELECT_COLUMNS).eq('user_id', userId).order('date', { ascending: false }).limit(1);
    if (error) throw new Error(error.message);
    rows = (data ?? []) as any[];
  }
  if (rows.length === 0) return null;
  const today = rows[rows.length - 1];
  return {
    total: today.score_total,
    tier: getVitanaIndexTier(today.score_total),
    pillars: {
      nutrition: today.score_nutrition ?? 10,
      hydration: today.score_hydration ?? 10,
      exercise: today.score_exercise ?? 10,
      sleep: today.score_sleep ?? 10,
      mental: today.score_mental ?? 10,
    },
    history: rows.map((r) => ({ date: r.date, score: r.score_total })),
  };
}

/** web useVitanaIndex / useVitanaIndexCache (["vitana_index", "current"]). */
export function useVitanaIndex() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['vitana_index', 'current'], queryFn: () => fetchVitanaIndex(user?.id), staleTime: 60_000, enabled: !!user });
  return { index: query.data ?? null, isLoading: query.isLoading };
}

/** web useVitanaIndexHistory(days). */
export function useVitanaIndexHistory(days: number) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['vitana_index', 'history', days],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const from = new Date();
      from.setDate(from.getDate() - days);
      const { data, error } = await db().from('vitana_index_scores').select('date, score_total').gte('date', from.toISOString().slice(0, 10)).order('date', { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ date: string; score_total: number }>).map((r) => ({ date: r.date, score: Number(r.score_total ?? 0) }));
    },
  });
  return { history: query.data ?? [], isLoading: query.isLoading };
}

// ── user preferences (AI-data consent) ───────────────────────────────────
export interface UserPreferences {
  ai_data_consent_given?: boolean | null;
}

/** web useUserPreferences: read the row, create the default one when missing; update by user. */
export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user_preferences'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db().from('user_preferences').select('*').eq('user_id', user?.id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        const created = await db().from('user_preferences').insert({ user_id: user?.id }).select().single();
        if (created.error) throw new Error(created.error.message);
        return created.data as UserPreferences;
      }
      return data as UserPreferences;
    },
  });
  const update = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await db().from('user_preferences').update(updates).eq('user_id', user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user_preferences'] });
    },
    onError: () => {
      notifyError('toasts.hooks.errorUpdatingPreferences');
    },
  });
  return { preferences: preferences ?? null, isLoading, updatePreferences: update.mutate };
}
