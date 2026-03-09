import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

export function useGroupMembership(groupId?: string) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { translate } = useTranslation();
  const userId = user?.id;

  const membershipQuery = useQuery({
    queryKey: ['group-membership', groupId, userId],
    queryFn: async () => {
      if (!groupId || !userId) return false;

      const { data: groupMeta, error: groupMetaError } = await supabase
        .from('global_community_groups')
        .select('created_by')
        .eq('id', groupId)
        .maybeSingle();

      if (!groupMetaError && groupMeta?.created_by === userId) {
        return true;
      }

      const { count, error } = await supabase
        .from('global_community_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        console.error('[useGroupMembership] check error:', error);
        return false;
      }

      return (count ?? 0) > 0;
    },
    enabled: !!groupId && !!userId && !authLoading,
    staleTime: 30_000,
  });

  const isMember = membershipQuery.data ?? false;
  const checkingMembership = authLoading || membershipQuery.isLoading;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['group-membership', groupId] });
    queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    queryClient.invalidateQueries({ queryKey: ['group-directory'] });
    queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    queryClient.invalidateQueries({ queryKey: ['profile-stats-count'] });
    // Also refresh inbox threads so group chat appears/disappears
    queryClient.invalidateQueries({ queryKey: ['global-threads'] });
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
      toast({
        title: translate('groupMembership.joined', 'Joined! 🎉'),
        description: translate('groupMembership.joinedDesc', "You're now a member of this group."),
      });
    },
    onError: (err: any) => {
      console.error('[joinGroup] error:', err);
      toast({
        title: translate('groupFeed.error', 'Error'),
        description: translate('groupMembership.errorJoin', 'Could not join group. Please try again.'),
        variant: "destructive",
      });
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
      toast({
        title: translate('groupMembership.left', 'Left group'),
        description: translate('groupMembership.leftDesc', "You've left this group."),
      });
    },
    onError: (err: any) => {
      console.error('[leaveGroup] error:', err);
      toast({
        title: translate('groupFeed.error', 'Error'),
        description: translate('groupMembership.errorLeave', 'Could not leave group. Please try again.'),
        variant: "destructive",
      });
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
