import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
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

/** Read the user's active Vitana-prescribed goal plan (null until generated). */
export function useGoalPlan() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goal-plan"],
    queryFn: async () => {
      const res = await communityFetch("/api/v1/goal-plan");
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
  return useMutation({
    mutationFn: async (vars?: { answers?: ClarificationAnswer[] }) => {
      const res = await communityFetch("/api/v1/goal-plan/generate", {
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
