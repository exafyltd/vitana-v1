import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";

export function useGroupMembership(groupId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const userId = user?.id;

  const { data: isMember = false, isLoading: checkingMembership } = useQuery({
    queryKey: ['group-membership', groupId, userId],
    queryFn: async () => {
      if (!groupId || !userId) return false;
      const { data, error } = await supabase
        .from('global_community_group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.error('[useGroupMembership] check error:', error);
        return false;
      }
      return !!data;
    },
    enabled: !!groupId && !!userId,
    staleTime: 30_000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['group-membership', groupId] });
    queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    queryClient.invalidateQueries({ queryKey: ['group-directory'] });
    queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    queryClient.invalidateQueries({ queryKey: ['profile-stats-count'] });
  };

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !userId) throw new Error('Missing groupId or userId');
      const { error } = await supabase
        .from('global_community_group_members')
        .insert({ group_id: groupId, user_id: userId, role: 'member' });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Joined! 🎉", description: "You're now a member of this group." });
    },
    onError: (err: any) => {
      console.error('[joinGroup] error:', err);
      toast({ title: "Error", description: "Could not join group. Please try again.", variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !userId) throw new Error('Missing groupId or userId');
      const { error } = await supabase
        .from('global_community_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Left group", description: "You've left this group." });
    },
    onError: (err: any) => {
      console.error('[leaveGroup] error:', err);
      toast({ title: "Error", description: "Could not leave group. Please try again.", variant: "destructive" });
    },
  });

  return {
    isMember,
    checkingMembership,
    joinGroup: () => joinMutation.mutate(),
    leaveGroup: () => leaveMutation.mutate(),
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,
  };
}
