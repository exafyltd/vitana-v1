/**
 * VTID-05172 — Life Timeline P6: queries + mutations for the learning switches,
 * the usage data and the routines Vitana noticed. A switch flips optimistically
 * and rolls back on error; switching app usage off also drops the app-usage
 * routines server-side, so routines are refetched.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteUsageData,
  fetchLearningPrefs,
  fetchRoutines,
  fetchUsageData,
  forgetRoutine,
  setLearningPref,
  type LearnableCategory,
  type LearningPrefs,
} from "@/lib/memory-learning-api";

export const learningKeys = {
  prefs: ["memory-learning", "prefs"] as const,
  usage: ["memory-learning", "usage"] as const,
  routines: ["memory-learning", "routines"] as const,
};

export function useLearningPrefs() {
  return useQuery({ queryKey: learningKeys.prefs, queryFn: fetchLearningPrefs, staleTime: 60_000 });
}

export function useSetLearningPref() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ category, learn }: { category: LearnableCategory; learn: boolean }) => setLearningPref(category, learn),
    onMutate: async ({ category, learn }) => {
      await qc.cancelQueries({ queryKey: learningKeys.prefs });
      const before = qc.getQueryData<LearningPrefs>(learningKeys.prefs);
      if (before) {
        qc.setQueryData<LearningPrefs>(learningKeys.prefs, {
          ...before,
          prefs: before.prefs.map((p) => (p.category === category ? { ...p, learn } : p)),
        });
      }
      return { before };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.before) qc.setQueryData(learningKeys.prefs, ctx.before);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: learningKeys.prefs });
      void qc.invalidateQueries({ queryKey: learningKeys.routines });
    },
  });
}

export function useUsageData() {
  return useQuery({ queryKey: learningKeys.usage, queryFn: fetchUsageData, staleTime: 60_000 });
}

export function useDeleteUsageData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteUsageData(),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: learningKeys.usage });
      void qc.invalidateQueries({ queryKey: learningKeys.routines });
    },
  });
}

export function useRoutines() {
  return useQuery({ queryKey: learningKeys.routines, queryFn: fetchRoutines, staleTime: 5 * 60_000 });
}

export function useForgetRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => forgetRoutine(id),
    onSettled: () => void qc.invalidateQueries({ queryKey: learningKeys.routines }),
  });
}
