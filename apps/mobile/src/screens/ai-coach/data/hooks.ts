/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — the data hooks the AI coach
 * pages read, re-implemented natively (plan decision 2: the web hooks import
 * the web Supabase client or the community gateway, class B). Same tables,
 * columns, filters, query keys and fallbacks as the web hook named on each;
 * Supabase through the shell's injected client (`getSupabase()`), the gateway
 * through `./gateway`.
 */
import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';
import { deviceStorage } from '../../../identity/device-storage';
import { notifyError } from '../../../ports/ui';
import { DAILY_LEARNINGS_KEY, fetchDailyLearnings } from './gateway';

/* eslint-disable @typescript-eslint/no-explicit-any -- the generated Database type has no vitana_index_* tables (the web casts too) */
const db = () => getSupabase() as any;

export type PillarKey = 'nutrition' | 'hydration' | 'exercise' | 'sleep' | 'mental';
export type Pillars = Record<PillarKey, number>;

// ── Vitana Index tiers (src/lib/vitanaIndex.ts VITANA_INDEX_TIERS) ───────
/**
 * The six tier bounds and their catalog keys, as the web `getVitanaIndexTier`
 * reads them. Mirrored here because the health lane adds the core re-export
 * of `src/lib/vitanaIndex.ts` (VTID-05455) in parallel; only the label lookup
 * is needed on these pages.
 */
const TIERS: ReadonlyArray<{ min: number; max: number; labelKey: string }> = [
  { min: 0, max: 99, labelKey: 'vitanaIndex.tiers.starting' },
  { min: 100, max: 299, labelKey: 'vitanaIndex.tiers.early' },
  { min: 300, max: 499, labelKey: 'vitanaIndex.tiers.building' },
  { min: 500, max: 599, labelKey: 'vitanaIndex.tiers.strong' },
  { min: 600, max: 799, labelKey: 'vitanaIndex.tiers.reallyGood' },
  { min: 800, max: 999, labelKey: 'vitanaIndex.tiers.elite' },
];

export function tierLabelKey(score: number): string {
  return (TIERS.find((t) => score >= t.min && score <= t.max) ?? TIERS[0]).labelKey;
}

// ── useVitanaIndex (src/hooks/useVitanaIndex.ts) ─────────────────────────

export type VitanaIndexState = { total: number; pillars: Pillars; trend: 'up' | 'down' | 'stable'; history: Array<{ date: string; score: number }> };

type ScoreRow = {
  date: string;
  score_total: number;
  score_nutrition: number | null;
  score_hydration: number | null;
  score_exercise: number | null;
  score_sleep: number | null;
  score_mental: number | null;
};

const INDEX_SELECT_COLUMNS = 'date, score_total, score_nutrition, score_hydration, score_exercise, score_sleep, score_mental, confidence, model_version, feature_inputs';
const DEFAULT_PILLAR = 10;

function deriveTrend(history: Array<{ score: number }>): 'up' | 'down' | 'stable' {
  if (history.length < 2) return 'stable';
  const first = history[0].score;
  const last = history[history.length - 1].score;
  if (last > first + 5) return 'up';
  if (last < first - 5) return 'down';
  return 'stable';
}

/** Trailing 7 days; if empty, the per-user compute RPC then a re-query; then the latest-ever row. */
export async function fetchVitanaIndex(userId: string | undefined): Promise<VitanaIndexState | null> {
  if (!userId) return null;
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const fromDate = since.toISOString().slice(0, 10);
  const trailing = async (): Promise<ScoreRow[]> => {
    const { data, error } = await db().from('vitana_index_scores').select(INDEX_SELECT_COLUMNS).eq('user_id', userId).gte('date', fromDate).order('date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ScoreRow[];
  };
  let rows = await trailing();
  if (rows.length === 0) {
    try {
      await db().rpc('health_compute_vitana_index', { p_date: new Date().toISOString().slice(0, 10), p_model_version: 'v3-5pillar' });
      rows = await trailing();
    } catch {
      /* best effort, as on the web */
    }
  }
  if (rows.length === 0) {
    const { data, error } = await db().from('vitana_index_scores').select(INDEX_SELECT_COLUMNS).eq('user_id', userId).order('date', { ascending: false }).limit(1);
    if (error) throw error;
    rows = (data ?? []) as ScoreRow[];
  }
  if (rows.length === 0) return null;
  const today = rows[rows.length - 1];
  const history = rows.map((r) => ({ date: r.date, score: r.score_total }));
  return {
    total: today.score_total,
    pillars: {
      nutrition: today.score_nutrition ?? DEFAULT_PILLAR,
      hydration: today.score_hydration ?? DEFAULT_PILLAR,
      exercise: today.score_exercise ?? DEFAULT_PILLAR,
      sleep: today.score_sleep ?? DEFAULT_PILLAR,
      mental: today.score_mental ?? DEFAULT_PILLAR,
    },
    trend: deriveTrend(history),
    history,
  };
}

/** The signed-in member's id, read at fetch time like the web `supabase.auth.getUser()`. */
async function currentUserId(): Promise<string | undefined> {
  const { data } = await getSupabase().auth.getUser();
  return data.user?.id ?? undefined;
}

export function useVitanaIndex() {
  const query = useQuery({
    queryKey: ['vitana_index', 'current'],
    queryFn: async () => fetchVitanaIndex(await currentUserId()),
    staleTime: 60_000,
  });
  return { index: query.data ?? null, isLoading: query.isLoading };
}

// ── useVitanaIndexHistory (src/hooks/useVitanaIndexHistory.ts) ───────────

export function useVitanaIndexHistory(days = 90) {
  const query = useQuery({
    queryKey: ['vitana_index', 'history', days],
    queryFn: async (): Promise<Array<{ date: string; score: number }>> => {
      if (!(await currentUserId())) return [];
      const from = new Date();
      from.setDate(from.getDate() - days);
      const { data, error } = await db().from('vitana_index_scores').select('date, score_total').gte('date', from.toISOString().slice(0, 10)).order('date', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as Array<{ date: string; score_total: number }>).map((r) => ({ date: r.date, score: Number(r.score_total ?? 0) }));
    },
    staleTime: 5 * 60_000,
  });
  return { history: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
}

// ── useVitanaIndexConfig (src/hooks/useVitanaIndexConfig.ts) ─────────────

export type ScoringTier = { min: number; max: number; label: string; color?: string };

export function useVitanaIndexConfig() {
  const query = useQuery({
    queryKey: ['vitana_index_config'],
    queryFn: async (): Promise<{ scoring_tiers?: ScoringTier[] | null } | null> => {
      const { data, error } = await db().from('vitana_index_config').select('*').eq('is_active', true).order('version', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
  return { config: query.data ?? null };
}

// ── daily learnings (DailySummary.tsx useQuery) ──────────────────────────

export function useDailyLearnings() {
  return useQuery({ queryKey: DAILY_LEARNINGS_KEY, queryFn: () => fetchDailyLearnings(14), staleTime: 5 * 60_000 });
}

// ── upcoming calendar events (src/hooks/useCalendarEvents.ts) ────────────

export type CalendarEventRow = { id: string; title: string; start_time: string; event_type: string };

/** The member's events, oldest first (web fetchEvents); the card shows the next `limit` after now (getUpcomingEvents). */
export function useUpcomingEvents(limit = 3) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['calendar_events', user?.id ?? null],
    enabled: !!user?.id,
    queryFn: async (): Promise<CalendarEventRow[]> => {
      const { data, error } = await db().from('calendar_events').select('*').eq('user_id', user?.id).order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEventRow[];
    },
  });
  const now = Date.now();
  return (query.data ?? []).filter((e) => new Date(e.start_time).getTime() > now).slice(0, limit);
}

// ── user preferences (src/hooks/useUserPreferences.ts) ───────────────────

export type CoachPreferences = { autopilot_enabled?: boolean | null; ai_data_consent_given?: boolean | null };

/** `select *` for the member; when there is no row the web inserts the defaults and reads them back. */
export function useUserPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['user_preferences'],
    enabled: !!user?.id,
    queryFn: async (): Promise<CoachPreferences> => {
      const { data, error } = await db().from('user_preferences').select('*').eq('user_id', user?.id).maybeSingle();
      if (error) throw error;
      if (!data) {
        const created = await db().from('user_preferences').insert({ user_id: user?.id }).select().single();
        if (created.error) throw created.error;
        return created.data as CoachPreferences;
      }
      return data as CoachPreferences;
    },
  });
  const update = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await db().from('user_preferences').update(updates).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['user_preferences'] }),
    onError: () => notifyError('toasts.hooks.errorUpdatingPreferences'),
  });
  return { preferences: query.data, updatePreferences: update.mutate };
}

// ── AI data consent (src/hooks/useAIConsent.ts) ──────────────────────────

/** The web's localStorage key, kept per device. */
export const AI_CONSENT_KEY = 'vitana_ai_consent_given';

export function useAIConsent() {
  const { preferences, updatePreferences } = useUserPreferences();
  const [localConsent, setLocalConsent] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.resolve(deviceStorage.getItem(AI_CONSENT_KEY)).then((v) => {
      if (active && v === 'true') setLocalConsent(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const server = preferences?.ai_data_consent_given;
  useEffect(() => {
    if (server === true) {
      void deviceStorage.setItem(AI_CONSENT_KEY, 'true');
      setLocalConsent(true);
    } else if (server === false) {
      void deviceStorage.removeItem(AI_CONSENT_KEY);
      setLocalConsent(false);
    }
  }, [server]);
  const grantConsent = useCallback(() => {
    void deviceStorage.setItem(AI_CONSENT_KEY, 'true');
    setLocalConsent(true);
    setDialogOpen(false);
    updatePreferences({ ai_data_consent_given: true, ai_data_consent_date: new Date().toISOString() });
  }, [updatePreferences]);
  return { hasConsent: localConsent || server === true, dialogOpen, setDialogOpen, grantConsent };
}
