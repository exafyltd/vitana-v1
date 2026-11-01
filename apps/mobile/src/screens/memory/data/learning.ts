/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — what Vitana learns and
 * the member's controls, re-implemented natively (class-B): the web
 * `src/lib/memory-learning-api.ts` calls and `src/hooks/useMemoryLearning.ts`
 * queries / mutations (same keys, optimistic switch with rollback, routines
 * refetched after a switch or a delete).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { memoryJson } from './client';

export const PILLAR_CATEGORIES = ['nutrition', 'hydration', 'exercise', 'sleep', 'mental'] as const;
export const LIFE_CATEGORIES = ['cross_pillar', 'diary', 'goals', 'journey', 'vitana', 'community', 'events', 'live_media', 'shop', 'wallet', 'account'] as const;
export type LearnableCategory = (typeof PILLAR_CATEGORIES)[number] | (typeof LIFE_CATEGORIES)[number] | 'app_usage';

export interface LearningPrefs {
  available: boolean;
  prefs: Array<{ category: LearnableCategory; learn: boolean }>;
}

export interface UsageData {
  available: boolean;
  count: number | null;
}

export type RoutineKind =
  | 'screen_habit'
  | 'active_hours'
  | 'feature_affinity'
  | 'pillar_rhythm'
  | 'time_of_day_preference'
  | 'day_of_week_rhythm'
  | 'category_affinity'
  | 'wave_velocity'
  | 'completion_streak';

export interface Routine {
  id: string;
  routine_kind: RoutineKind;
  routine_key: string;
  metadata: Record<string, unknown> | null;
  confidence: number;
}

export const fetchLearningPrefs = () => memoryJson<LearningPrefs>('/timeline/learning-prefs');

export const setLearningPref = (category: LearnableCategory, learn: boolean) =>
  memoryJson<{ routines_deleted: number }>('/timeline/learning-prefs', { method: 'PUT', body: JSON.stringify({ category, learn }) });

export const fetchUsageData = () => memoryJson<UsageData>('/timeline/usage-data');

/** The usage-data export as pretty JSON text (the web builds a Blob download from the same body). */
export async function exportUsageData(): Promise<string> {
  const body = await memoryJson<Record<string, unknown>>('/timeline/usage-data/export');
  return JSON.stringify(body, null, 2);
}

export const deleteUsageData = () => memoryJson<{ deleted: number; routines_deleted: number }>('/timeline/usage-data', { method: 'DELETE' });

export async function fetchRoutines(): Promise<Routine[]> {
  return (await memoryJson<{ routines?: Routine[] }>('/timeline/routines')).routines ?? [];
}

export async function forgetRoutine(id: string): Promise<void> {
  await memoryJson(`/timeline/routines/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export const learningKeys = {
  prefs: ['memory-learning', 'prefs'] as const,
  usage: ['memory-learning', 'usage'] as const,
  routines: ['memory-learning', 'routines'] as const,
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
