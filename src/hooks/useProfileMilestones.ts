import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

export interface Milestone {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  milestone_date?: string;
  icon: string;
  is_public: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type MilestoneInput = {
  title: string;
  description?: string;
  milestone_date?: string;
  icon?: string;
  is_public?: boolean;
  sort_order?: number;
};

export function useProfileMilestones(userId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;
  const isOwner = user?.id === targetUserId;

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['profile-milestones', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from('profile_milestones')
        .select('*')
        .eq('user_id', targetUserId)
        .order('milestone_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as Milestone[];
    },
    enabled: !!targetUserId,
  });

  const addMilestone = useMutation({
    mutationFn: async (input: MilestoneInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profile_milestones')
        .insert({ ...input, user_id: user.id, icon: input.icon || '⭐' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-milestones', targetUserId] }),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, ...input }: MilestoneInput & { id: string }) => {
      const { data, error } = await supabase
        .from('profile_milestones')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-milestones', targetUserId] }),
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profile_milestones')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile-milestones', targetUserId] }),
  });

  return {
    milestones,
    isLoading,
    isOwner,
    addMilestone,
    updateMilestone,
    deleteMilestone,
  };
}
