import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { communityFetch } from "@/lib/community-gateway";

export type GoalStepKind = "milestone" | "checkpoint" | "habit";

export interface GoalPlanStep {
  id: string;
  kind: GoalStepKind;
  title: string;
  description: string | null;
  day_offset: number | null;
  scheduled_date: string | null;
  status: string;
  sort_order: number;
}

export interface GoalPlanView {
  id: string;
  goal_text: string;
  plan_summary: string | null;
  start_date: string;
  target_date: string;
  total_days: number;
  day: number;
  days_left: number;
  status: string;
  source_lang?: string | null;
  milestones: GoalPlanStep[];
  checkpoints: GoalPlanStep[];
  habits: GoalPlanStep[];
}

export interface ClarificationAnswer {
  question: string;
  answer: string;
}

interface GoalPlanResponse {
  ok: boolean;
  plan: GoalPlanView | null;
  error?: string;
  needs_clarification?: boolean;
  questions?: string[];
}

/**
 * Read the user's active Vitana-prescribed goal plan (null until generated).
 *
 * The plan text follows the app's active language toggle: we pass the selected
 * locale to the gateway, which translates + caches the plan body on first view
 * of a non-source language. The locale is part of the query key, so flipping
 * the toggle (MAXINA intro page) refetches the plan in the new language.
 */
export function useGoalPlan() {
  const { user } = useAuth();
  const { selectedLanguage } = useLanguage();
  return useQuery({
    queryKey: ["goal-plan", selectedLanguage],
    queryFn: async () => {
      const res = await communityFetch(`/api/v1/goal-plan?locale=${encodeURIComponent(selectedLanguage)}`);
      if (!res.ok) throw new Error("Failed to fetch goal plan");
      return res.json() as Promise<GoalPlanResponse>;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });
}

/** Trigger Vitana to (re)generate the plan for the active goal. */
export function useGenerateGoalPlan() {
  const queryClient = useQueryClient();
  const { selectedLanguage } = useLanguage();
  return useMutation({
    mutationFn: async (vars?: { answers?: ClarificationAnswer[] }) => {
      const res = await communityFetch(`/api/v1/goal-plan/generate?locale=${encodeURIComponent(selectedLanguage)}`, {
        method: "POST",
        body: JSON.stringify({ answers: vars?.answers ?? [] }),
      });
      if (!res.ok) throw new Error("Failed to generate plan");
      return res.json() as Promise<GoalPlanResponse & { plan_id?: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal-plan"] });
    },
  });
}

/** Mark a plan step done (or back to pending). */
export function useCompleteGoalStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ stepId, done = true }: { stepId: string; done?: boolean }) => {
      const res = await communityFetch(`/api/v1/goal-plan/steps/${stepId}/complete`, {
        method: "POST",
        body: JSON.stringify({ done }),
      });
      if (!res.ok) throw new Error("Failed to update step");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal-plan"] });
    },
  });
}
