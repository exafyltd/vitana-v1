/**
 * VTID-05510 — native twin of the part of src/hooks/useLifeCompass.ts the
 * Life Compass popup uses (class B: the web Supabase client). Same rows:
 *
 *   life_compass  select * where user_id = me and is_active order by created_at desc limit 1 (["life-compass"])
 *   life_compass_subgoals  the active subgoals of that compass (["life-compass-subgoals", id])
 *   update: the previous compass → is_active false, then insert
 *           { user_id, primary_goal, category, is_active: true, version: n + 1 }
 *           → invalidate ["life-compass"] + ["my-journey"], the updated / failed toast.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';
import { notify, notifyError } from '../../../ports/discover';

export interface LifeCompass {
  id: string;
  user_id: string;
  primary_goal: string;
  category: string;
  alignment_score: number;
  confidence_score: number;
  is_active: boolean;
  version: number;
}

const db = () => getSupabase() as any;

export function useLifeCompass(enabled = true) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: compass } = useQuery({
    queryKey: ['life-compass'],
    enabled: enabled && !!user,
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await db().from('life_compass').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return (data ?? null) as LifeCompass | null;
    },
  });
  useQuery({
    queryKey: ['life-compass-subgoals', compass?.id],
    enabled: enabled && !!compass?.id,
    queryFn: async () => {
      const { data, error } = await db().from('life_compass_subgoals').select('*').eq('compass_id', compass?.id).eq('status', 'active').order('priority', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const update = useMutation({
    mutationFn: async (goal: { primary_goal: string; category: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (compass) await db().from('life_compass').update({ is_active: false }).eq('id', compass.id);
      const { data, error } = await db()
        .from('life_compass')
        .insert({ user_id: user.id, primary_goal: goal.primary_goal, category: goal.category, is_active: true, version: compass ? compass.version + 1 : 1 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['life-compass'] });
      void qc.invalidateQueries({ queryKey: ['my-journey'] });
      notify('toasts.hooks.lifeCompassUpdated', 'toasts.hooks.yourAiGuidanceHasUpdatedAlign');
    },
    onError: () => notifyError('toasts.hooks.failedUpdate'),
  });
  return { compass: compass ?? null, updateCompass: update.mutate, isUpdating: update.isPending };
}
