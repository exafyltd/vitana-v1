import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { communityFetch } from "@/lib/community-gateway";

/**
 * VTID-03255 — the Journey Foundation snapshot for "Meine Reise".
 *
 * One shared payload (GET /api/v1/journey-foundation) that voice, mobile, and
 * desktop all read. Voice answers write through the gateway; this hook reflects
 * the change on screen via a short poll + a `journey-foundation:changed` window
 * event the voice layer can fire for an instant refresh.
 */

export const JOURNEY_FOUNDATION_REFRESH_EVENT = "journey-foundation:changed";
const JOURNEY_FOUNDATION_KEY = ["journey-foundation"] as const;

export type FoundationStepStatus = "open" | "checking" | "done" | "not_found" | "active";
export type FoundationStrand = "health" | "economy";
export type FoundationStepType = "action" | "teacher";

export interface FoundationStepView {
  key: string;
  title: string;
  strand: FoundationStrand;
  type: FoundationStepType;
  tier: number;
  status: FoundationStepStatus;
  required_for_graduation: boolean;
  navigation_route: string | null;
  benefit: string;
}

export interface JourneyGoalView {
  primary_goal: string | null;
  category: string | null;
  target_value: number | null;
  target_unit: string | null;
  target_date: string | null;
  starting_value: number | null;
}

export interface JourneySessionUpdateView {
  session_id: string | null;
  completed_steps: string[];
  next_step: string | null;
  summary: string | null;
  created_at: string;
}

export interface JourneyFoundationSnapshot {
  journey_started: boolean;
  goal_day: number | null;
  days_left: number | null;
  active_goal: JourneyGoalView | null;
  economic_intent: "build_business" | "passive_income" | "earn_recommendations" | "curious" | null;
  weakest_habit: string | null;
  foundation_steps: FoundationStepView[];
  current_next_step: FoundationStepView | null;
  suggested_navigation: string | null;
  recent_session_updates: JourneySessionUpdateView[];
  north_stars: { health: string | null; economy: string | null };
  graduated: boolean;
}

export interface JourneyFoundationResponse {
  ok: boolean;
  vtid: string;
  snapshot: JourneyFoundationSnapshot;
}

export function useJourneyFoundation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fire an instant refresh when the voice layer reports a journey change.
  useEffect(() => {
    const handler = () => queryClient.invalidateQueries({ queryKey: JOURNEY_FOUNDATION_KEY });
    window.addEventListener(JOURNEY_FOUNDATION_REFRESH_EVENT, handler);
    return () => window.removeEventListener(JOURNEY_FOUNDATION_REFRESH_EVENT, handler);
  }, [queryClient]);

  return useQuery({
    queryKey: JOURNEY_FOUNDATION_KEY,
    queryFn: async () => {
      const res = await communityFetch("/api/v1/journey-foundation");
      if (!res.ok) throw new Error("Failed to fetch journey-foundation");
      return (await res.json()) as JourneyFoundationResponse;
    },
    staleTime: 10 * 1000,
    // Poll while the screen is open so voice answers reflect during a live
    // conversation (the screen stays foregrounded, so focus refetch won't fire).
    refetchInterval: 12 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });
}

export interface JourneyAnswerBody {
  step: string;
  value?: string;
  category?: string | null;
  target_value?: number | null;
  target_unit?: string | null;
  target_date?: string | null;
  starting_value?: number | null;
  acknowledged?: boolean;
}

/** Record an answer from a non-voice surface; invalidates the snapshot on success. */
export function useRecordJourneyAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: JourneyAnswerBody) => {
      const res = await communityFetch("/api/v1/journey-foundation/answer", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to record journey answer");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOURNEY_FOUNDATION_KEY }),
  });
}
