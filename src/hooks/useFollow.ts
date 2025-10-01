import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";

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

  // Fetch initial follow status and counts
  useEffect(() => {
    if (!user || !targetUserId) return;

    const fetchFollowData = async () => {
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
    };

    fetchFollowData();
  }, [user, targetUserId]);

  // Real-time subscription for follow changes
  useEffect(() => {
    if (!user || !targetUserId) return;

    const channel = supabase
      .channel(`follow-changes-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_follows',
          filter: `following_id=eq.${targetUserId}`,
        },
        async (payload) => {
          // Refresh follow status and counts
          const { data: statusData } = await supabase
            .rpc('get_follow_status', { target_user_id: targetUserId });
          setIsFollowing(statusData || false);

          const { data: countsData } = await supabase
            .rpc('get_user_follow_counts', { user_id_param: targetUserId });
          if (countsData && typeof countsData === 'object' && countsData !== null) {
            const counts = countsData as { followers_count: number; following_count: number };
            setFollowersCount(counts.followers_count || 0);
            setFollowingCount(counts.following_count || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, targetUserId]);

  const followUser = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    if (user.id === targetUserId) {
      toast({
        title: "Invalid action",
        description: "You cannot follow yourself",
        variant: "destructive",
      });
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
    } catch (error: any) {
      // Rollback optimistic update
      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
      
      toast({
        title: "Error",
        description: error.message || "Failed to follow user",
        variant: "destructive",
      });
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
