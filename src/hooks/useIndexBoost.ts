/**
 * VTID-04489 — what drove a member's Vitana Index, in activity terms, from
 * the get_index_boost RPC (exafyltd/vitana-platform, migration
 * 20260924170000). Feeds the profile card's "Biggest boost" line and the
 * "About your VITANA INDEX" drawer.
 *
 * Visible to every signed-in member with numbers (owner decision); the RPC
 * returns `hidden` when the member switched it off.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BoostActivity =
  | "running" | "cycling" | "strength" | "racket" | "yoga_pilates"
  | "swimming" | "walking" | "workout";

export type BoostDriverType = "workout" | "nutrition" | "hydration" | "sleep" | "mindfulness" | "journey";

export interface BoostDriver {
  type: BoostDriverType;
  /** Set for workouts only. */
  activity: BoostActivity | null;
  count: number;
  /** Minutes (workout, mindfulness, sleep avg), ml (hydration avg), points (journey). */
  total: number | null;
}

export interface IndexBoost {
  hidden: boolean;
  /** 7 = "this week", 30 = "the last 30 days". */
  windowDays: 7 | 30;
  /** "boost" when the Index rose over the window, otherwise "active". */
  kind: "boost" | "active";
  drivers: BoostDriver[];
}

const TYPES: BoostDriverType[] = ["workout", "nutrition", "hydration", "sleep", "mindfulness", "journey"];
const ACTIVITIES: BoostActivity[] = ["running", "cycling", "strength", "racket", "yoga_pilates", "swimming", "walking", "workout"];

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Pure: RPC jsonb → typed boost. Exported for tests. */
export function normalizeIndexBoost(raw: unknown): IndexBoost | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, any>;
  if (r.hidden === true) return { hidden: true, windowDays: 30, kind: "active", drivers: [] };
  const drivers: BoostDriver[] = Array.isArray(r.drivers)
    ? r.drivers.flatMap((d: any): BoostDriver[] => {
        if (!TYPES.includes(d?.type)) return [];
        const count = num(d.count);
        if (count === null || count < 1) return [];
        const activity = d.type === "workout" ? (ACTIVITIES.includes(d.activity) ? d.activity : "workout") : null;
        return [{ type: d.type, activity, count, total: num(d.total) }];
      })
    : [];
  return {
    hidden: false,
    windowDays: r.window_days === 7 ? 7 : 30,
    kind: r.kind === "boost" ? "boost" : "active",
    drivers: drivers.slice(0, 3),
  };
}

export interface BoostSentence {
  key: string;
  params: Record<string, string | number>;
}

/**
 * Pure: the translated sentence for one driver, e.g.
 * { key: "profile.indexBoost.workout7", params: { activity, count } }.
 * Returns null when a driver lacks the number its sentence needs, so the UI
 * never renders "NaN h".
 */
export function describeBoostDriver(
  d: BoostDriver,
  windowDays: 7 | 30,
  label: (key: string) => string,
  formatNumber: (n: number, maxFractionDigits?: number) => string,
): BoostSentence | null {
  const w = windowDays === 7 ? "7" : "30";
  switch (d.type) {
    case "workout":
      return { key: `profile.indexBoost.workout${w}`, params: { activity: label(`profile.indexBoost.activity.${d.activity ?? "workout"}`), count: d.count } };
    case "nutrition":
      return { key: `profile.indexBoost.nutrition${w}`, params: { count: d.count } };
    case "hydration":
      return { key: `profile.indexBoost.hydration${w}`, params: { count: d.count } };
    case "sleep":
      if (d.total === null) return null;
      return { key: `profile.indexBoost.sleep${w}`, params: { hours: formatNumber(d.total / 60, 1) } };
    case "mindfulness":
      if (d.total === null) return null;
      return { key: `profile.indexBoost.mindfulness${w}`, params: { minutes: formatNumber(d.total) } };
    case "journey":
      return { key: `profile.indexBoost.journey${w}`, params: { count: d.count } };
  }
}

/** Short chip label for "What helped most". */
export function boostDriverLabelKey(d: BoostDriver): string {
  return d.type === "workout"
    ? `profile.indexBoost.activity.${d.activity ?? "workout"}`
    : `profile.indexBoost.type.${d.type}`;
}

export function useIndexBoost(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["index_boost", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_index_boost", { p_user_id: userId });
      if (error) throw error;
      return normalizeIndexBoost(data);
    },
  });
}
