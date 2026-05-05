import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Loader2, X } from "lucide-react";
import { UserProfile } from "@/types/profile";
import { ProfileIdCardFront } from "@/components/profile/shared/ProfileIdCardFront";
import { ProfileIdCardBack } from "@/components/profile/shared/ProfileIdCardBack";
import { ProfileStats } from "@/components/profile/shared/ProfileStats";
import { useProfileTheme } from "@/hooks/useProfileTheme";
import { getVitanaIndexPercentage } from "@/lib/vitanaIndex";
import { useProfilePreview } from "@/hooks/useProfilePreview";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVitanaIndexForUser } from "@/hooks/useVitanaIndexForUser";
import { t } from '@/lib/i18n-toast';

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
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
}

export function ProfilePreviewDialog() {
  const { userId, isOpen, closePreview } = useProfilePreview();
  const navigate = useNavigate();
  const { themeConfig } = useProfileTheme(userId);
  const isMobile = useIsMobile();

  const { data: dbProfile, isLoading, error } = useQuery({
    queryKey: ['profile-preview', userId],
    enabled: !!userId && isOpen,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .rpc('get_user_profile_by_identifier', { identifier: userId });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0] as DatabaseProfile;
    },
    staleTime: 60_000,
  });

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

  const { data: liveIndex } = useVitanaIndexForUser(dbProfile?.user_id);

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
    linkedin_url: dbProfile.linkedin_url || undefined,
    instagram_url: dbProfile.instagram_url || undefined,
    facebook_url: dbProfile.facebook_url || undefined,
    x_url: dbProfile.x_url || undefined,
    youtube_url: dbProfile.youtube_url || undefined,
    tiktok_url: dbProfile.tiktok_url || undefined,
    stats,
    vitanaIndex: liveIndex?.score,
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

  if (profile && profile.vitanaIndex) {
    profile.vitanaPercentile = 100 - getVitanaIndexPercentage(profile.vitanaIndex);
  }

  const handleViewFullProfile = () => {
    if (!profile) return;
    const identifier = dbProfile?.handle || profile.id;
    navigate(`/u/${identifier}`);
    closePreview();
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={closePreview}>
      <ResponsiveDialogContent
        overlayClassName="z-[60]"
        fullscreenOnMobile
        hideCloseButton={isMobile}
        className={isMobile 
          ? "z-[60] bg-[hsl(222,47%,11%)]" 
          : "z-[60] max-w-6xl p-0 gap-0 overflow-hidden"}
      >
        {isMobile && (
          <button
            onClick={closePreview}
            className="absolute right-3 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <ResponsiveDialogBody>
          {isLoading ? (
            <div className="flex items-center justify-center h-[300px] sm:h-[500px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error || !profile ? (
            <div className="flex flex-col items-center justify-center h-[300px] sm:h-[400px] gap-3 px-6">
              <p className="text-muted-foreground">{t('screens.profile.unableLoadProfile')}</p>
              <Button variant="outline" onClick={closePreview}>
                {t('screens.profile.close')}
              </Button>
            </div>
          ) : (
            <div className={isMobile ? "px-4 pt-14 pb-6 space-y-4 overflow-y-auto" : "p-0"}>
              {/* ID Cards */}
              <div className={isMobile
                ? "flex flex-col gap-4"
                : "grid grid-cols-2 gap-6 p-6"
              }>
                <div className="w-full">
                  <ProfileIdCardFront
                    profile={profile}
                    scope="public"
                    editMode={false}
                    themeConfig={themeConfig}
                    cycleTheme={() => {}}
                  />
                </div>
                <div className="w-full">
                  <ProfileIdCardBack
                    profile={profile}
                    themeConfig={themeConfig}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className={isMobile ? "" : "px-6 pb-4"}>
                <ProfileStats profile={profile} />
              </div>

              {/* View Full Profile */}
              <div className={isMobile ? "pt-2" : "px-6 pb-6"}>
                <Button
                  onClick={handleViewFullProfile}
                  variant="default"
                  className="w-full gap-2 h-12 font-semibold rounded-full shadow-lg hover:shadow-xl transition-all text-base"
                  size="lg"
                >
                  <ExternalLink className="h-5 w-5" />
                  {t('screens.profile.viewFullProfile')}
                </Button>
              </div>
            </div>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
