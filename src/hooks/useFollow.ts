import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeConnection } from "./useRealtimeConnection";
import { measurePerformance } from "@/utils/performanceLogger";

interface UseFollowReturn {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  loading: boolean;
  followUser: () => Promise<void>;
  unfollowUser: () => Promise<void>;
}

export function useFollow(targetUserId: string): UseFollowReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch follow status and counts - extracted as reusable function
  const fetchFollowData = useCallback(async () => {
    if (!user || !targetUserId) return;
    
    try {
      // Get follow status
      const { data: statusData, error: statusError } = await supabase
        .rpc('get_follow_status', { target_user_id: targetUserId });

      if (statusError) throw statusError;
      setIsFollowing(statusData || false);

      // Get follow counts
      const { data: countsData, error: countsError } = await supabase
        .rpc('get_user_follow_counts', { user_id_param: targetUserId });

      if (countsError) throw countsError;
      if (countsData && typeof countsData === 'object' && countsData !== null) {
        const counts = countsData as { followers_count: number; following_count: number };
        setFollowersCount(counts.followers_count || 0);
        setFollowingCount(counts.following_count || 0);
      }
    } catch (error) {
      console.error('Error fetching follow data:', error);
    }
  }, [user, targetUserId]);

  // Fetch initial follow status and counts
  useEffect(() => {
    fetchFollowData();
  }, [fetchFollowData]);

  // Real-time subscriptions for follow changes
  useEffect(() => {
    if (!user || !targetUserId) return;

    // SUBSCRIPTION 1: Watch target user's followers (when OTHERS follow them)
    const targetFollowersChannel = supabase
      .channel(`target-followers-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `following_id=eq.${targetUserId}`,
        },
        async (payload) => {
          console.log('🔔 Target user follower change:', payload);
          // Refresh follow counts for target user
          const { data: countsData } = await supabase
            .rpc('get_user_follow_counts', { user_id_param: targetUserId });
          if (countsData && typeof countsData === 'object' && countsData !== null) {
            const counts = countsData as { followers_count: number; following_count: number };
            setFollowersCount(counts.followers_count || 0);
            setFollowingCount(counts.following_count || 0);
          }
          
          // Also refresh follow status if current user was involved
          const newFollowerId = (payload.new as any)?.follower_id;
          const oldFollowerId = (payload.old as any)?.follower_id;
          if (newFollowerId === user.id || oldFollowerId === user.id) {
            const { data: statusData } = await supabase
              .rpc('get_follow_status', { target_user_id: targetUserId });
            setIsFollowing(statusData || false);
          }
        }
      )
      .subscribe();

    // SUBSCRIPTION 2: Watch current user's following list (when YOU follow someone)
    const currentUserFollowingChannel = supabase
      .channel(`current-user-following-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `follower_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('🔔 You followed/unfollowed someone:', payload);
          
          // Only update if this change is relevant to the current target user
          const newFollowingId = (payload.new as any)?.following_id;
          const oldFollowingId = (payload.old as any)?.following_id;
          const isRelevant = 
            newFollowingId === targetUserId || 
            oldFollowingId === targetUserId;
          
          if (isRelevant) {
            // Refresh follow status immediately
            const { data: statusData } = await supabase
              .rpc('get_follow_status', { target_user_id: targetUserId });
            setIsFollowing(statusData || false);
            
            // Refresh counts
            const { data: countsData } = await supabase
              .rpc('get_user_follow_counts', { user_id_param: targetUserId });
            if (countsData && typeof countsData === 'object' && countsData !== null) {
              const counts = countsData as { followers_count: number; following_count: number };
              setFollowersCount(counts.followers_count || 0);
              setFollowingCount(counts.following_count || 0);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(targetFollowersChannel);
      supabase.removeChannel(currentUserFollowingChannel);
    };
  }, [user, targetUserId]);

  // Smart fallback polling when real-time is disconnected
  const { isConnected } = useRealtimeConnection();

  useEffect(() => {
    if (isConnected || !user || !targetUserId) return; // Real-time working, no polling needed

    console.warn('⚠️ Real-time disconnected, activating follow fallback polling');

    // Poll every 10 seconds when disconnected
    const interval = setInterval(() => {
      console.log('🔄 Polling follow data (fallback mode)');
      fetchFollowData();
    }, 10000);

    return () => clearInterval(interval);
  }, [isConnected, user, targetUserId, fetchFollowData]);

  const followUser = async () => {
    const perf = measurePerformance('followUser');
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      perf.end({ success: false, reason: 'not_authenticated' });
      return;
    }

    if (user.id === targetUserId) {
      toast({
        title: "Invalid action",
        description: "You cannot follow yourself",
        variant: "destructive",
      });
      perf.end({ success: false, reason: 'self_follow' });
      return;
    }

    setLoading(true);
    // Optimistic update
    setIsFollowing(true);
    setFollowersCount(prev => prev + 1);

    try {
      const { data, error } = await supabase
        .rpc('follow_user', { target_user_id: targetUserId });

      if (error) throw error;

      const result = data as { success: boolean; error?: string } | null;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to follow user');
      }

      toast({
        title: "Success",
        description: "You are now following this user",
      });
      
      perf.end({ success: true, targetUserId });
    } catch (error: any) {
      // Rollback optimistic update
      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
      
      toast({
        title: "Error",
        description: error.message || "Failed to follow user",
        variant: "destructive",
      });
      
      perf.end({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const unfollowUser = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to unfollow users",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    // Optimistic update
    setIsFollowing(false);
    setFollowersCount(prev => Math.max(0, prev - 1));

    try {
      const { data, error } = await supabase
        .rpc('unfollow_user', { target_user_id: targetUserId });

      if (error) throw error;

      const result = data as { success: boolean; error?: string } | null;
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to unfollow user');
      }

      toast({
        title: "Success",
        description: "You have unfollowed this user",
      });
    } catch (error: any) {
      // Rollback optimistic update
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      
      toast({
        title: "Error",
        description: error.message || "Failed to unfollow user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    isFollowing,
    followersCount,
    followingCount,
    loading,
    followUser,
    unfollowUser,
  };
}
