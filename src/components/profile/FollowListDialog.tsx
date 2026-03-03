import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface FollowUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  handle: string | null;
}

interface FollowListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  type: "followers" | "following";
  onCountChange?: () => void;
}

export function FollowListDialog({
  open,
  onOpenChange,
  userId,
  type,
  onCountChange,
}: FollowListDialogProps) {
  const { user } = useAuth();
  const { translate } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    if (!userId || !open) return;
    setLoading(true);

    try {
      if (type === "followers") {
        // Get users who follow this userId
        const { data, error } = await supabase
          .from("user_follows")
          .select("follower_id")
          .eq("following_id", userId);

        if (error) throw error;

        const followerIds = (data || []).map((r) => r.follower_id);
        if (followerIds.length === 0) {
          setUsers([]);
          return;
        }

        const { data: profiles, error: pErr } = await supabase
          .from("global_community_profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", followerIds);

        if (pErr) throw pErr;
        setUsers((profiles || []).map((p) => ({ ...p, handle: null })));
      } else {
        // Get users this userId is following
        const { data, error } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", userId);

        if (error) throw error;

        const followingIds = (data || []).map((r) => r.following_id);
        if (followingIds.length === 0) {
          setUsers([]);
          return;
        }

        const { data: profiles, error: pErr } = await supabase
          .from("global_community_profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", followingIds);

        if (pErr) throw pErr;
        setUsers((profiles || []).map((p) => ({ ...p, handle: null })));
      }
    } catch (error) {
      console.error("Error fetching follow list:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, type, open]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  const handleUnfollow = async (targetId: string) => {
    if (!user) return;
    setUnfollowingId(targetId);

    try {
      const { data, error } = await supabase.rpc("unfollow_user", {
        target_user_id: targetId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string } | null;
      if (!result?.success) throw new Error(result?.error || "Failed to unfollow");

      setUsers((prev) => prev.filter((u) => u.user_id !== targetId));
      onCountChange?.();

      toast({
        title: translate("common.success", "Success"),
        description: translate("follow.unfollowed", "You have unfollowed this user"),
      });
    } catch (error: any) {
      toast({
        title: translate("common.error", "Error"),
        description: error.message || "Failed to unfollow",
        variant: "destructive",
      });
    } finally {
      setUnfollowingId(null);
    }
  };

  const handleRemoveFollower = async (followerId: string) => {
    if (!user) return;
    setUnfollowingId(followerId);

    try {
      // Remove follower by deleting their follow record
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", userId);

      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.user_id !== followerId));
      onCountChange?.();

      toast({
        title: translate("common.success", "Success"),
        description: translate("follow.removed", "Follower removed"),
      });
    } catch (error: any) {
      toast({
        title: translate("common.error", "Error"),
        description: error.message || "Failed to remove follower",
        variant: "destructive",
      });
    } finally {
      setUnfollowingId(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isOwnProfile = user?.id === userId;

  const title =
    type === "followers"
      ? translate("profileStats.followers", "Followers")
      : translate("profileStats.following", "Following");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl px-0">
        <SheetHeader className="px-4 pb-3 border-b border-border">
          <SheetTitle className="text-center">{title}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(70vh-80px)]">
          <div className="px-4 py-2">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {type === "followers"
                  ? translate("follow.noFollowers", "No followers yet")
                  : translate("follow.noFollowing", "Not following anyone yet")}
              </p>
            ) : (
              <div className="space-y-1">
                {users.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar
                      className="h-10 w-10 cursor-pointer"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/profile/${u.handle || u.user_id}`);
                      }}
                    >
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(u.display_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/profile/${u.handle || u.user_id}`);
                      }}
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.display_name || "Unknown User"}
                      </p>
                      {u.handle && (
                        <p className="text-xs text-muted-foreground truncate">
                          @{u.handle}
                        </p>
                      )}
                    </div>

                    {isOwnProfile && u.user_id !== user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={unfollowingId === u.user_id}
                        onClick={() =>
                          type === "following"
                            ? handleUnfollow(u.user_id)
                            : handleRemoveFollower(u.user_id)
                        }
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        {type === "following"
                          ? translate("follow.unfollow", "Unfollow")
                          : translate("follow.remove", "Remove")}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
