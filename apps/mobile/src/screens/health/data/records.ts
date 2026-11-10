/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the member's
 * health records, read natively (class-B web hooks, plan decision 2):
 *
 *  - lab reports: `MobileHealthMedicalTab.tsx:34-49` (`lab_reports`, newest
 *    first, query key `['lab-reports']`);
 *  - supplements: `useUserSupplements.ts:28-50` (`user_supplements`,
 *    `user_id = auth.uid()`, newest first; a failed read raises the same
 *    `toasts.hooks.failedLoadSupplements` toast);
 *  - profile health summary: `useProfileHealthSummary.ts` (the
 *    `get_profile_health_summary` RPC; the server decides what the caller may
 *    see) — called as a read-only GET (`{ get: true }`, like
 *    src/identity/tenant-registry.ts), normalised by the same pure rules.
 *
 * Every read is scoped to the signed-in member (`user_id = auth.uid()`, the
 * RLS rule). The web lab-report query relies on RLS alone; the native read
 * adds the explicit `user_id` filter so only the member's OWN reports are
 * requested. READS ONLY: the web supplement create / update / delete and the
 * report upload (storage + `lab_reports` insert) are not wired natively.
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';
import { notifyError } from '../../../ports/ui';
import type { VitanaPillarKey } from './vitana-index';
import { PILLAR_KEYS } from '../text';

// ── lab reports ─────────────────────────────────────────────────────────
export interface LabReport {
  id: string;
  title?: string | null;
  raw_file_ref?: string | null;
  report_type?: string | null;
  provider_name?: string | null;
  source?: string | null;
  report_date?: string | null;
  processing_status?: string | null;
  file_path?: string | null;
  created_at?: string;
}

export const LAB_REPORTS_TABLE = 'lab_reports';

export function useLabReports() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['lab-reports', userId ?? null],
    queryFn: async (): Promise<LabReport[]> => {
      if (!userId) return [];
      const { data, error } = await getSupabase().from(LAB_REPORTS_TABLE).select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LabReport[];
    },
  });
}

// ── supplements ─────────────────────────────────────────────────────────
export interface UserSupplement {
  id: string;
  user_id: string;
  name: string;
  category: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  start_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const SUPPLEMENTS_TABLE = 'user_supplements';

export function useUserSupplements(): { supplements: UserSupplement[]; isLoading: boolean } {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const query = useQuery({
    queryKey: ['user-supplements', userId ?? null],
    enabled: !!userId,
    queryFn: async (): Promise<UserSupplement[]> => {
      const { data, error } = await getSupabase().from(SUPPLEMENTS_TABLE).select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) {
        notifyError('toasts.hooks.error', 'toasts.hooks.failedLoadSupplements');
        return [];
      }
      return (data ?? []) as UserSupplement[];
    },
  });
  return { supplements: query.data ?? [], isLoading: loading || (!!userId && query.isLoading) };
}

// ── profile health summary (community standing) ─────────────────────────
export interface HealthPillar {
  score: number;
  delta7d: number | null;
}

export type HealthAchievement = { type: 'personal_best'; score: number } | { type: 'rising_week'; delta: number } | { type: 'logging_streak'; days: number };

export interface HealthStanding {
  available: boolean;
  topPercent: number | null;
  communityAverage: number | null;
  cohortSize: number;
}

export interface HealthActivity {
  daysLogged7d: number;
  sleepAvgMinutes7d: number | null;
  sleepNights7d: number;
  waterAvgMl7d: number | null;
  workoutMinutes7d: number | null;
  stepsAvg7d: number | null;
  meditationMinutes7d: number | null;
  loggingStreakDays: number;
}

export interface ProfileHealthSummary {
  hasIndex: boolean;
  isOwner: boolean;
  shared: boolean;
  score: number | null;
  weekDelta: number | null;
  isBaseline: boolean;
  standing: HealthStanding | null;
  pillars: Record<VitanaPillarKey, HealthPillar> | null;
  achievements: HealthAchievement[];
  activity: HealthActivity | null;
  minCohort: number;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** RPC jsonb → typed summary (web normalizeHealthSummary, useProfileHealthSummary.ts:69-130). */
export function normalizeHealthSummary(raw: unknown): ProfileHealthSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const r = raw as Record<string, any>;
  const st = r.standing as Record<string, unknown> | null | undefined;
  const standing: HealthStanding | null = st
    ? {
        available: st.available === true && num(st.top_percent) !== null,
        topPercent: st.available === true ? num(st.top_percent) : null,
        communityAverage: st.available === true ? num(st.community_average) : null,
        cohortSize: num(st.cohort_size) ?? 0,
      }
    : null;
  let pillars: ProfileHealthSummary['pillars'] = null;
  if (r.pillars && typeof r.pillars === 'object') {
    const out = {} as Record<VitanaPillarKey, HealthPillar>;
    let complete = true;
    for (const k of PILLAR_KEYS) {
      const score = num(r.pillars[k]?.score);
      if (score === null) complete = false;
      out[k] = { score: score ?? 0, delta7d: num(r.pillars[k]?.delta_7d) };
    }
    pillars = complete ? out : null;
  }
  const achievements: HealthAchievement[] = Array.isArray(r.achievements)
    ? r.achievements.flatMap((a: any): HealthAchievement[] => {
        if (a?.type === 'personal_best' && num(a.score) !== null) return [{ type: a.type, score: a.score }];
        if (a?.type === 'rising_week' && num(a.delta) !== null) return [{ type: a.type, delta: a.delta }];
        if (a?.type === 'logging_streak' && num(a.days) !== null) return [{ type: a.type, days: a.days }];
        return [];
      })
    : [];
  const a = r.activity as Record<string, unknown> | null | undefined;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const activity: HealthActivity | null = a
    ? {
        daysLogged7d: num(a.days_logged_7d) ?? 0,
        sleepAvgMinutes7d: num(a.sleep_avg_minutes_7d),
        sleepNights7d: num(a.sleep_nights_7d) ?? 0,
        waterAvgMl7d: num(a.water_avg_ml_7d),
        workoutMinutes7d: num(a.workout_minutes_7d),
        stepsAvg7d: num(a.steps_avg_7d),
        meditationMinutes7d: num(a.meditation_minutes_7d),
        loggingStreakDays: num(a.logging_streak_days) ?? 0,
      }
    : null;
  return {
    hasIndex: r.has_index === true,
    isOwner: r.is_owner === true,
    shared: r.shared === true,
    score: num(r.score),
    weekDelta: num(r.week_delta),
    isBaseline: r.is_baseline === true,
    standing,
    pillars,
    achievements,
    activity,
    minCohort: num(r.thresholds?.min_cohort) ?? 20,
  };
}

export const HEALTH_SUMMARY_RPC = 'get_profile_health_summary';

export function useProfileHealthSummary(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['profile_health_summary', userId ?? null],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc(HEALTH_SUMMARY_RPC, { p_user_id: userId }, { get: true });
      if (error) throw error;
      return normalizeHealthSummary(data);
    },
  });
}

// ── life compass (the Index sheet's last row) ───────────────────────────
export interface LifeCompass {
  id: string;
  primary_goal: string;
}

export function useLifeCompass() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ['life-compass', userId ?? null],
    enabled: !!userId,
    queryFn: async (): Promise<LifeCompass | null> => {
      const { data, error } = await getSupabase()
        .from('life_compass')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as LifeCompass | null;
    },
  });
}
