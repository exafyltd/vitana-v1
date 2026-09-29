/**
 * VTID-04483 — real data for the profile Health tab and the Health page's
 * community standing, from the get_profile_health_summary RPC
 * (exafyltd/vitana-platform, migration 20260924150000).
 *
 * The RPC decides what the caller may see (standing for everyone signed in,
 * categories + achievements with consent, activity for the owner only).
 * This hook only normalises the payload so the UI never renders NaN,
 * undefined or a comparison the server did not vouch for.
 *
 * Only queried while `enabled` (the VITE_HEALTH_REAL_DATA flag) is on.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VitanaPillarKey } from "@/hooks/useVitanaIndex";

export interface HealthPillar {
  score: number;
  /** Change over the trailing 7 days; null without a week of history. */
  delta7d: number | null;
}

export type HealthAchievement =
  | { type: "personal_best"; score: number }
  | { type: "rising_week"; delta: number }
  | { type: "logging_streak"; days: number };

export interface HealthStanding {
  available: boolean;
  /** "Top X%" — rank as a share of the cohort. Only when available. */
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
  /** Owner, or the subject shares their Health tab with this viewer. */
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

const PILLARS: VitanaPillarKey[] = ["nutrition", "hydration", "exercise", "sleep", "mental"];

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Pure: RPC jsonb → typed summary. Exported for tests. */
export function normalizeHealthSummary(raw: unknown): ProfileHealthSummary | null {
  if (!raw || typeof raw !== "object") return null;
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

  let pillars: ProfileHealthSummary["pillars"] = null;
  if (r.pillars && typeof r.pillars === "object") {
    const out = {} as Record<VitanaPillarKey, HealthPillar>;
    let complete = true;
    for (const k of PILLARS) {
      const score = num(r.pillars[k]?.score);
      if (score === null) complete = false;
      out[k] = { score: score ?? 0, delta7d: num(r.pillars[k]?.delta_7d) };
    }
    pillars = complete ? out : null;
  }

  const achievements: HealthAchievement[] = Array.isArray(r.achievements)
    ? r.achievements.flatMap((a: any): HealthAchievement[] => {
        if (a?.type === "personal_best" && num(a.score) !== null) return [{ type: a.type, score: a.score }];
        if (a?.type === "rising_week" && num(a.delta) !== null) return [{ type: a.type, delta: a.delta }];
        if (a?.type === "logging_streak" && num(a.days) !== null) return [{ type: a.type, days: a.days }];
        return [];
      })
    : [];

  const a = r.activity as Record<string, unknown> | null | undefined;
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

export function useProfileHealthSummary(userId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["profile_health_summary", userId],
    enabled: enabled && !!userId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_profile_health_summary", {
        p_user_id: userId,
      });
      if (error) throw error;
      return normalizeHealthSummary(data);
    },
  });
}
