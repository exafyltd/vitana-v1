import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Loader2 } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { ProfileIdCardFront } from "@/components/profile/shared/ProfileIdCardFront";
import { useProfileTheme } from "@/hooks/useProfileTheme";
import { getVitanaIndexPercentage } from "@/lib/vitanaIndex";
import { useProfilePreview } from "@/hooks/useProfilePreview";

interface DatabaseProfile {
  user_id: string;
  display_name: string;
  full_name: string;
  handle: string;
  avatar_url: string;
  cover_url: string;
  bio: string;
  location: string;
  linkedin_headline: string;
}

export function ProfilePreviewDialog() {
  const { userId, isOpen, closePreview } = useProfilePreview();
  const navigate = useNavigate();
  const { themeConfig } = useProfileTheme(userId);

  const { data: dbProfile, isLoading, error } = useQuery({
    queryKey: ['profile-preview', userId],
    enabled: !!userId && isOpen,
    queryFn: async () => {
      if (!userId) return null;

      // Use RPC function to bypass RLS and get public profile data
      const { data, error } = await supabase
        .rpc('get_user_profile_by_identifier', { identifier: userId });

      if (error) throw error;
      if (!data || data.length === 0) return null;
      
      return data[0] as DatabaseProfile;
    },
    staleTime: 60_000,
  });

  // Fetch stats for UserProfile interface
  const { data: stats } = useQuery({
    queryKey: ['profile-preview-stats', userId],
    enabled: !!userId && isOpen,
    queryFn: async () => {
      if (!userId) return { posts: 0, followers: 0, following: 0, mediaUploads: 0, groupsJoined: 0 };

      const [followersResult, followingResult] = await Promise.all([
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
      ]);

      return {
        posts: 0,
        followers: followersResult.count || 0,
        following: followingResult.count || 0,
        mediaUploads: 0,
        groupsJoined: 0,
      };
    },
    staleTime: 60_000,
  });

  // Transform database profile to UserProfile interface
  const profile: UserProfile | null = dbProfile && stats ? {
    id: dbProfile.user_id,
    user_id: dbProfile.user_id,
    name: dbProfile.display_name || dbProfile.full_name || 'Unknown User',
    handle: dbProfile.handle || dbProfile.user_id.slice(0, 8),
    avatarUrl: dbProfile.avatar_url || undefined,
    coverUrl: dbProfile.cover_url || undefined,
    roles: ['community'],
    membershipTier: null,
    bio: dbProfile.bio || undefined,
    location: dbProfile.location || undefined,
    linkedin_headline: dbProfile.linkedin_headline || undefined,
    stats,
    vitanaIndex: (() => {
      const userIdHash = dbProfile.user_id.split('-')[0];
      const hashValue = parseInt(userIdHash.substring(0, 8), 16);
      return 500 + (hashValue % 400);
    })(),
    vitanaPercentile: undefined,
    visibility: {
      about: 'public',
      links: 'public',
      location: 'public',
      showcase: 'public',
      indexPublic: true,
      healthShareConsent: true,
    },
  } : null;

  // Calculate percentile after profile is created
  if (profile && profile.vitanaIndex) {
    profile.vitanaPercentile = 100 - getVitanaIndexPercentage(profile.vitanaIndex);
  }

  const handleViewFullProfile = () => {
    if (!profile) return;
    navigate(`/u/${profile.handle}`);
    closePreview();
  };

  return (
    <Dialog open={isOpen} onOpenChange={closePreview}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-[500px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error || !profile ? (
          <div className="flex flex-col items-center justify-center h-[400px] gap-3 px-6">
            <p className="text-muted-foreground">Unable to load profile</p>
            <Button variant="outline" onClick={closePreview}>
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Profile ID Card - matches actual profile design */}
            <div className="scale-[0.92] origin-top">
              <ProfileIdCardFront
                profile={profile}
                scope="public"
                editMode={false}
                themeConfig={themeConfig}
                cycleTheme={() => {}}
              />
            </div>

            {/* View Full Profile Button */}
            <div className="px-8 pb-6 pt-2">
              <Button
                onClick={handleViewFullProfile}
                variant="default"
                className="w-full gap-2 h-11 font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                <ExternalLink className="h-4 w-4" />
                View Full Profile
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
