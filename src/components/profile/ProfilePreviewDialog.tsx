import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { ExternalLink, Users, TrendingUp, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfilePreviewData {
  user_id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
}

interface ProfilePreviewDialogProps {
  userId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfilePreviewDialog({ userId, isOpen, onOpenChange }: ProfilePreviewDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile-preview', userId],
    enabled: !!userId && isOpen,
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, handle, avatar_url, cover_url, bio, location')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as ProfilePreviewData;
    },
    staleTime: 60_000, // Cache for 1 minute
  });

  // Fetch follower counts
  const { data: followCounts } = useQuery({
    queryKey: ['follow-counts', userId],
    enabled: !!userId && isOpen,
    queryFn: async () => {
      if (!userId) return { followers: 0, following: 0 };

      const [followersResult, followingResult] = await Promise.all([
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
      ]);

      return {
        followers: followersResult.count || 0,
        following: followingResult.count || 0,
      };
    },
    staleTime: 60_000,
  });

  // Calculate vitana index (same logic as PublicProfilePage)
  const vitanaScore = profile ? (() => {
    const userIdHash = profile.user_id.split('-')[0];
    const hashValue = parseInt(userIdHash.substring(0, 8), 16);
    return 500 + (hashValue % 400);
  })() : 0;

  // Check follow status
  useEffect(() => {
    if (!user || !userId || !isOpen) return;

    const checkFollowStatus = async () => {
      const { data } = await supabase
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      setIsFollowing(!!data);
    };

    checkFollowStatus();
  }, [user, userId, isOpen]);

  const handleViewFullProfile = () => {
    if (!profile) return;
    const identifier = profile.handle || profile.user_id;
    navigate(`/u/${identifier}`);
    onOpenChange(false);
  };

  const handleFollow = async () => {
    if (!user || !userId) return;

    try {
      if (isFollowing) {
        await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        setIsFollowing(false);
      } else {
        await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: userId });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error || !profile ? (
          <div className="flex flex-col items-center justify-center h-[300px] gap-3 px-6">
            <p className="text-muted-foreground">Unable to load profile</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Header with cover and avatar */}
            <DialogHeader className="relative h-[120px] p-0">
              <div
                className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background"
                style={
                  profile.cover_url
                    ? {
                        backgroundImage: `url(${profile.cover_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              />
              <div className="absolute -bottom-10 left-6 z-10">
                <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl font-semibold">
                    {profile.display_name?.[0] || profile.handle?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DialogHeader>

            {/* Content */}
            <div className="px-6 pt-14 pb-6 space-y-4">
              {/* Name and handle */}
              <div>
                <h2 className="text-xl font-bold">
                  {profile.display_name || 'Unknown User'}
                </h2>
                {profile.handle && (
                  <p className="text-sm text-muted-foreground">@{profile.handle}</p>
                )}
              </div>

              {/* Location */}
              {profile.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.location}
                </p>
              )}

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {profile.bio}
                </p>
              )}

              <Separator />

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-bold">{followCounts?.followers || 0}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/40">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-bold">{vitanaScore}</p>
                  <p className="text-xs text-muted-foreground">Vitana</p>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                {user && user.id !== userId && (
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    className="flex-1"
                    size="sm"
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                )}
                <Button
                  onClick={handleViewFullProfile}
                  variant="outline"
                  className={cn("gap-2", user && user.id !== userId ? "flex-1" : "w-full")}
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Full Profile
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
