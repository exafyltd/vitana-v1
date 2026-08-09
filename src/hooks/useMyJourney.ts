import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { communityFetch } from "@/lib/community-gateway";

/**
 * Goal-centric block for the My Journey North Star. Progress is time-based
 * (days elapsed vs. days until the deadline), so all the goal-progress fields
 * are null until the user's goal has a `target_date`.
 */
export interface MyJourneyGoal {
  active_goal_text: string;
  pillar_focus: string;
  confidence_score: number | null;
  target_date: string | null;
  target_value: number | null;
  target_unit: string | null;
  set_at: string | null;
  has_deadline: boolean;
  days_to_deadline: number | null;
  goal_total_days: number | null;
  goal_day: number | null;
  goal_progress_pct: number | null;
}

export interface MyJourneyPhase {
  id: string;
  name: string;
  description: string;
  day_range: [number, number];
  day_in_phase: number;
  days_to_next_milestone: number;
}

export interface MyJourneyJourney {
  day_in_journey: number;
  total_days: number;
  days_left: number;
  plan_type: "default" | "personalized";
  plan_summary: string | null;
  status: "active" | "paused" | "complete" | "restarted";
  is_first_session: boolean;
  last_session_date: string | null;
  is_past_total_days: boolean;
  current_phase: MyJourneyPhase | null;
  fallback_used: boolean;
}

export interface MyJourneyIndex {
  today: number;
  tier: string;
  tier_framing: string;
  trend_7d: number;
  weakest_pillar: string;
  balance_label: string;
}

export interface MyJourneyResponse {
  ok: boolean;
  vtid: string;
  journey: MyJourneyJourney | null;
  life_compass: MyJourneyGoal | null;
  vitana_index: MyJourneyIndex | null;
}

/**
 * Single source of truth for the My Journey screen: one call to the unified
 * gateway endpoint returns the user's goal (with time-to-deadline progress),
 * the journey phase, and a Vitana Index summary.
 */
export function useMyJourney() {
  const { user } = useAuth();
  return useQuery({
    // User-scoped so a different account can't read the previous user's journey
    // from cache/persistence. Prefix-invalidations (["my-journey"]) still match.
    queryKey: ["my-journey", user?.id],
    queryFn: async () => {
      const res = await communityFetch("/api/v1/my-journey");
      if (!res.ok) throw new Error("Failed to fetch my-journey");
      return res.json() as Promise<MyJourneyResponse>;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });
}
