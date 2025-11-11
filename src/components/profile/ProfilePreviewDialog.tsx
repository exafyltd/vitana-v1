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
import { ExternalLink, Users, TrendingUp, Loader2, MapPin, MessageCircle, Share2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getVitanaIndexPercentage } from "@/lib/vitanaIndex";
import { toast } from "sonner";

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
  const { data: stats } = useQuery({
    queryKey: ['profile-preview-stats', userId],
    enabled: !!userId && isOpen,
    queryFn: async () => {
      if (!userId) return { followers: 0, following: 0, eventsHosted: 0 };

      const [followersResult, followingResult] = await Promise.all([
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
      ]);

      return {
        followers: followersResult.count || 0,
        following: followingResult.count || 0,
        eventsHosted: 0, // TODO: Add when events table is available
      };
    },
    staleTime: 60_000,
  });

  // Calculate vitana index and percentile
  const vitanaScore = profile ? (() => {
    const userIdHash = profile.user_id.split('-')[0];
    const hashValue = parseInt(userIdHash.substring(0, 8), 16);
    return 500 + (hashValue % 400);
  })() : 0;

  const vitanaPercentile = 100 - getVitanaIndexPercentage(vitanaScore);

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

  const handleMessage = () => {
    toast.info("Messaging feature coming soon!");
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/u/${profile?.handle || profile?.user_id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile?.display_name || 'Profile',
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Profile link copied to clipboard!");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Profile link copied to clipboard!");
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
            <DialogHeader className="relative h-[140px] p-0">
              <div
                className="absolute inset-0 bg-gradient-to-br from-accent/30 via-primary/20 to-accent/10"
                style={
                  profile.cover_url
                    ? {
                        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url(${profile.cover_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              />
              {/* Vitana Percentile Badge */}
              {vitanaScore > 0 && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge 
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold shadow-lg bg-[color-mix(in_oklab,hsl(var(--accent))_14%,transparent)] ring-1 ring-[hsl(var(--accent))/28] text-foreground backdrop-blur-sm"
                  >
                    <span className="before:content-[''] before:inline-block before:h-3 before:w-[2px] before:rounded-full before:bg-[hsl(var(--accent))]" />
                    TOP {vitanaPercentile}%
                  </Badge>
                </div>
              )}
              <div className="absolute -bottom-12 left-6 z-10">
                <Avatar className="h-24 w-24 ring-4 ring-background shadow-2xl transition-transform duration-150 ease-out hover:scale-[1.02]">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-accent/20 to-primary/20">
                    {profile.display_name?.[0] || profile.handle?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </DialogHeader>

            {/* Content */}
            <div className="px-6 pt-16 pb-6 space-y-5">
              {/* Name and handle */}
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {profile.display_name || 'Unknown User'}
                </h2>
                {profile.handle && (
                  <p className="text-sm text-muted-foreground mt-0.5">@{profile.handle}</p>
                )}
              </div>

              {/* Location */}
              {profile.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </p>
              )}

              {/* Bio */}
              <div className="min-h-[3rem]">
                {profile.bio ? (
                  <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic">
                    This user hasn't added a bio yet
                  </p>
                )}
              </div>

              <Separator />

              {/* Stats grid - 3 columns */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-card border border-border/40 shadow-sm transition-all hover:shadow-md hover:border-accent/20">
                  <Users className="h-4 w-4 text-accent" />
                  <p className="text-xl font-bold">{stats?.followers || 0}</p>
                  <p className="text-[10.5px] text-muted-foreground font-medium">Followers</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-card border border-border/40 shadow-sm transition-all hover:shadow-md hover:border-accent/20">
                  <Calendar className="h-4 w-4 text-accent" />
                  <p className="text-xl font-bold">{stats?.eventsHosted || 0}</p>
                  <p className="text-[10.5px] text-muted-foreground font-medium">Events</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-card border border-border/40 shadow-sm transition-all hover:shadow-md hover:border-accent/20">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <p className="text-xl font-bold">{vitanaScore}</p>
                  <p className="text-[10.5px] text-muted-foreground font-medium">Vitana</p>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col gap-2.5">
                {user && user.id !== userId && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleFollow}
                      variant={isFollowing ? "outline" : "default"}
                      className="flex-1 h-10 font-semibold"
                      size="sm"
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button
                      onClick={handleMessage}
                      variant="outline"
                      size="sm"
                      className="h-10 px-4"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      size="sm"
                      className="h-10 px-4"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  onClick={handleViewFullProfile}
                  variant="outline"
                  className="w-full gap-2 h-10 font-medium"
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
