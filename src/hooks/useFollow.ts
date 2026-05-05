import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from '@/hooks/use-toast';
import { useRealtimeConnection } from "./useRealtimeConnection";
import { measurePerformance } from "@/utils/performanceLogger";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isValidUUID } from "@/lib/resolveProfileUserId";
import { useEffect } from "react";
import { notify, notifyError } from '@/lib/i18n-toast';

interface FollowCounts {
  followers_count: number;
  following_count: number;
}

interface UseFollowReturn {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  loading: boolean;
  followUser: () => Promise<void>;
  unfollowUser: () => Promise<void>;
}

export function useFollow(targetUserId: string | undefined): UseFollowReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const validTarget = isValidUUID(targetUserId) ? targetUserId : undefined;
  const validViewer = isValidUUID(user?.id) ? user!.id : undefined;

  // ─── Query 1: Follow counts ───
  const countsQuery = useQuery({
    queryKey: ['follow-counts', validTarget],
    queryFn: async (): Promise<FollowCounts> => {
      try {
        const { data, error } = await supabase
          .rpc('get_user_follow_counts', { user_id_param: validTarget! });
        if (error) throw error;
        if (data && typeof data === 'object' && data !== null) {
          const counts = data as unknown as FollowCounts;
          return { followers_count: counts.followers_count || 0, following_count: counts.following_count || 0 };
        }
      } catch {
        // Fallback: direct count queries
        const [followersRes, followingRes] = await Promise.all([
          supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', validTarget!),
          supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', validTarget!),
        ]);
        return {
          followers_count: followersRes.count ?? 0,
          following_count: followingRes.count ?? 0,
        };
      }
      return { followers_count: 0, following_count: 0 };
    },
    enabled: !!validTarget,
    staleTime: 30_000,
  });

  // ─── Query 2: Follow status (does viewer follow target?) ───
  const statusQuery = useQuery({
    queryKey: ['follow-status', validViewer, validTarget],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .rpc('get_follow_status', { target_user_id: validTarget! });
      if (error) throw error;
      return data || false;
    },
    enabled: !!validViewer && !!validTarget && validViewer !== validTarget,
    staleTime: 30_000,
  });

  // ─── Realtime: invalidate on changes ───
  useEffect(() => {
    if (!validTarget) return;

    const channel = supabase
      .channel(`follow-rt-${validTarget}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_follows',
        filter: `following_id=eq.${validTarget}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['follow-counts', validTarget] });
        if (validViewer) {
          queryClient.invalidateQueries({ queryKey: ['follow-status', validViewer, validTarget] });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [validTarget, validViewer, queryClient]);

  // ─── Fallback polling when realtime disconnected ───
  const { isConnected } = useRealtimeConnection();

  useEffect(() => {
    if (isConnected || !validTarget) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['follow-counts', validTarget] });
      if (validViewer) {
        queryClient.invalidateQueries({ queryKey: ['follow-status', validViewer, validTarget] });
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [isConnected, validTarget, validViewer, queryClient]);

  // ─── Mutations with optimistic updates ───
  const followMutation = useMutation({
    mutationFn: async () => {
      const perf = measurePerformance('followUser');
      const { data, error } = await supabase.rpc('follow_user', { target_user_id: validTarget! });
      if (error) { perf.end({ success: false }); throw error; }
      const result = data as { success: boolean; error?: string } | null;
      if (!result?.success) { perf.end({ success: false }); throw new Error(result?.error || 'Failed to follow'); }
      perf.end({ success: true });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['follow-counts', validTarget] });
      await queryClient.cancelQueries({ queryKey: ['follow-status', validViewer, validTarget] });
      const prevCounts = queryClient.getQueryData<FollowCounts>(['follow-counts', validTarget]);
      const prevStatus = queryClient.getQueryData<boolean>(['follow-status', validViewer, validTarget]);
      queryClient.setQueryData(['follow-status', validViewer, validTarget], true);
      queryClient.setQueryData(['follow-counts', validTarget], (old: FollowCounts | undefined) => ({
        followers_count: (old?.followers_count ?? 0) + 1,
        following_count: old?.following_count ?? 0,
      }));
      return { prevCounts, prevStatus };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevCounts) queryClient.setQueryData(['follow-counts', validTarget], context.prevCounts);
      if (context?.prevStatus !== undefined) queryClient.setQueryData(['follow-status', validViewer, validTarget], context.prevStatus);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedFollowUser');
    },
    onSuccess: () => {
      notify('toasts.hooks.success', 'toasts.hooks.youNowFollowingThisUser');
      // Log follow activity
      import('@/hooks/useCommunityLogger').then(({ useCommunityLogger }) => {
        const { logFollow } = useCommunityLogger();
        logFollow(validTarget!, 'User');
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-counts', validTarget] });
      queryClient.invalidateQueries({ queryKey: ['follow-status', validViewer, validTarget] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('unfollow_user', { target_user_id: validTarget! });
      if (error) throw error;
      const result = data as { success: boolean; error?: string } | null;
      if (!result?.success) throw new Error(result?.error || 'Failed to unfollow');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['follow-counts', validTarget] });
      await queryClient.cancelQueries({ queryKey: ['follow-status', validViewer, validTarget] });
      const prevCounts = queryClient.getQueryData<FollowCounts>(['follow-counts', validTarget]);
      const prevStatus = queryClient.getQueryData<boolean>(['follow-status', validViewer, validTarget]);
      queryClient.setQueryData(['follow-status', validViewer, validTarget], false);
      queryClient.setQueryData(['follow-counts', validTarget], (old: FollowCounts | undefined) => ({
        followers_count: Math.max(0, (old?.followers_count ?? 0) - 1),
        following_count: old?.following_count ?? 0,
      }));
      return { prevCounts, prevStatus };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevCounts) queryClient.setQueryData(['follow-counts', validTarget], context.prevCounts);
      if (context?.prevStatus !== undefined) queryClient.setQueryData(['follow-status', validViewer, validTarget], context.prevStatus);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedUnfollowUser');
    },
    onSuccess: () => {
      notify('toasts.hooks.success', 'toasts.hooks.youHaveUnfollowedThisUser');
      import('@/hooks/useCommunityLogger').then(({ useCommunityLogger }) => {
        const { logUnfollow } = useCommunityLogger();
        logUnfollow(validTarget!, 'User');
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-counts', validTarget] });
      queryClient.invalidateQueries({ queryKey: ['follow-status', validViewer, validTarget] });
    },
  });

  const followUser = useCallback(async () => {
    if (!validViewer) {
      notifyError('toasts.hooks.authenticationRequired2', 'toasts.hooks.pleaseSignFollowUsers');
      return;
    }
    if (validViewer === validTarget) {
      notifyError('toasts.hooks.invalidAction', 'toasts.hooks.youCannotFollowYourself');
      return;
    }
    await followMutation.mutateAsync();
  }, [validViewer, validTarget, followMutation, toast]);

  const unfollowUser = useCallback(async () => {
    if (!validViewer) {
      notifyError('toasts.hooks.authenticationRequired2', 'toasts.hooks.pleaseSignUnfollowUsers');
      return;
    }
    await unfollowMutation.mutateAsync();
  }, [validViewer, unfollowMutation, toast]);

  return {
    isFollowing: statusQuery.data ?? false,
    followersCount: countsQuery.data?.followers_count ?? 0,
    followingCount: countsQuery.data?.following_count ?? 0,
    loading: followMutation.isPending || unfollowMutation.isPending,
    followUser,
    unfollowUser,
  };
}
