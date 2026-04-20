import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { UserProfile, ViewAsMode } from "@/types/profile";
import { ProfileLayout } from "@/components/profile/shared/ProfileLayout";
import { EditToolbar } from "@/components/profile/EditToolbar";
import { IdentityDrawer } from "@/components/profile/drawers/IdentityDrawer";
import { AboutDrawer } from "@/components/profile/drawers/AboutDrawer";
import { ServicesDrawer } from "@/components/profile/drawers/ServicesDrawer";
import { ComplianceDrawer } from "@/components/profile/drawers/ComplianceDrawer";
import { ShowcaseDrawer } from "@/components/profile/drawers/ShowcaseDrawer";
import { VisibilityDrawer } from "@/components/profile/drawers/VisibilityDrawer";
import { getScope } from "@/lib/profileScope";
import { useProfile } from "@/context/ProfileProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";
import { useAutopilotComplete } from "@/hooks/useAutopilotComplete";
import { MobileIdCardSwitcher } from "@/components/profile/mobile/MobileIdCardSwitcher";
import { MobileProfileStats } from "@/components/profile/mobile/MobileProfileStats";
import { MobileProfileTabs, MobileProfileTab } from "@/components/profile/mobile/MobileProfileTabs";
import { MobileAutopilotBanner } from "@/components/profile/mobile/MobileAutopilotBanner";
import { MobileShowcaseHeader } from "@/components/profile/mobile/MobileShowcaseHeader";
import { MobileMediaTabContent } from "@/components/profile/mobile/MobileMediaTabContent";
import { MobileGroupsTabContent } from "@/components/profile/mobile/MobileGroupsTabContent";
import { AutopilotProfilePopup } from "@/components/profile/AutopilotProfilePopup";
import { MobileCreatePostSheet } from "@/components/profile/mobile/MobileCreatePostSheet";
import { ProfilePostsTab } from "@/components/profile/shared/tabs/ProfilePostsTab";
import { MilestoneTimeline } from "@/components/profile/milestones/MilestoneTimeline";
import { useProfileMilestones } from "@/hooks/useProfileMilestones";
import { PhotoGallery } from "@/components/profile/gallery/PhotoGallery";
import { VideoGallery } from "@/components/profile/gallery/VideoGallery";
import { MusicGallery } from "@/components/profile/gallery/MusicGallery";
import { useProfileGallery } from "@/hooks/useProfileGallery";
import { ShareProfileModal } from "@/components/profile/shared/ShareProfileModal";
import { MobileQRShareScreen } from "@/components/profile/mobile/MobileQRShareScreen";
import { useProfileShare } from "@/hooks/useProfileShare";

// Default bio constants for language sync - OUTSIDE component for stability
const DEFAULT_BIO_EN = 'Wellness enthusiast passionate about holistic health and community building. 🌱';
const DEFAULT_BIO_DE = 'Wellness-Enthusiast mit Leidenschaft für ganzheitliche Gesundheit und Gemeinschaftsaufbau. 🌱';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile: contextProfile } = useProfile();
  const { user } = useAuth();
  const [viewAs, setViewAs] = useState<ViewAsMode>("me");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const { translate } = useTranslation();
  const { completeBySourceRef } = useAutopilotComplete();
  const [identityDrawerOpen, setIdentityDrawerOpen] = useState(false);
  const [aboutDrawerOpen, setAboutDrawerOpen] = useState(false);
  const [servicesDrawerOpen, setServicesDrawerOpen] = useState(false);
  const [complianceDrawerOpen, setComplianceDrawerOpen] = useState(false);
  const [showcaseDrawerOpen, setShowcaseDrawerOpen] = useState(false);
  const [visibilityDrawerOpen, setVisibilityDrawerOpen] = useState(false);

  // Get localized default bio
  const localizedDefaultBio = translate('profile.defaultBio', DEFAULT_BIO_EN);
  
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '',
    user_id: user?.id || '',
    name: contextProfile.displayName,
    handle: contextProfile.handle || user?.id || 'user',
    avatarUrl: contextProfile.avatar,
    roles: ['community'],
    bio: contextProfile.bio || localizedDefaultBio,
    location: contextProfile.location || '',
    links: contextProfile.links || [],
    languages: contextProfile.languages || [],
    stats: {
      posts: 124,
      followers: 1205,
      following: 487,
      mediaUploads: 89,
      groupsJoined: 12
    },
    vitanaIndex: 742,
    vitanaPercentile: 85,
    longevityArchetype: contextProfile.longevityArchetype || '',
    // Social URLs from context for immediate display
    linkedin_url: contextProfile.linkedin_url,
    instagram_url: contextProfile.instagram_url,
    facebook_url: contextProfile.facebook_url,
    x_url: contextProfile.x_url,
    youtube_url: contextProfile.youtube_url,
    tiktok_url: contextProfile.tiktok_url,
    visibility: {
      about: 'public',
      links: 'public',
      location: 'public',
      showcase: 'public',
      indexPublic: true,
      healthShareConsent: true
    }
  });

  // Sync default bio when language changes (only if bio is a default placeholder)
  useEffect(() => {
    setProfile(prev => {
      const isDefaultBio = prev.bio === DEFAULT_BIO_EN || prev.bio === DEFAULT_BIO_DE;
      if (isDefaultBio && prev.bio !== localizedDefaultBio) {
        return { ...prev, bio: localizedDefaultBio };
      }
      return prev;
    });
  }, [localizedDefaultBio]);

  // Sync identity fields when contextProfile updates (after IdentityDrawer save)
  useEffect(() => {
    setProfile(prev => ({
      ...prev,
      avatarUrl: contextProfile.avatar || prev.avatarUrl,
      name: contextProfile.displayName || prev.name,
      handle: contextProfile.handle || prev.handle,
      longevityArchetype: contextProfile.longevityArchetype || prev.longevityArchetype,
    }));
  }, [contextProfile.avatar, contextProfile.displayName, contextProfile.handle, contextProfile.longevityArchetype]);

  // Sync social URLs when contextProfile updates (realtime subscription)
  useEffect(() => {
    setProfile(prev => ({
      ...prev,
      linkedin_url: contextProfile.linkedin_url,
      instagram_url: contextProfile.instagram_url,
      facebook_url: contextProfile.facebook_url,
      x_url: contextProfile.x_url,
      youtube_url: contextProfile.youtube_url,
      tiktok_url: contextProfile.tiktok_url,
    }));
  }, [
    contextProfile.linkedin_url,
    contextProfile.instagram_url,
    contextProfile.facebook_url,
    contextProfile.x_url,
    contextProfile.youtube_url,
    contextProfile.tiktok_url
  ]);

  // Refetch profile data - extracted for reuse after social import success
  const refetchProfile = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    if (data) {
      setProfile(prev => ({
        ...prev,
        user_id: user.id,
        name: data.display_name || contextProfile.displayName,
        handle: data.handle || contextProfile.handle || user?.id || 'user',
        avatarUrl: data.avatar_url || contextProfile.avatar,
        // Localize bio if it's a default placeholder from database
        bio: (() => {
          const fetchedBio = data.bio || prev.bio;
          if (fetchedBio === DEFAULT_BIO_EN || fetchedBio === DEFAULT_BIO_DE) {
            return localizedDefaultBio;
          }
          return fetchedBio;
        })(),
        // Social media fields
        linkedin_url: data.linkedin_url,
        linkedin_synced_at: data.linkedin_synced_at,
        linkedin_headline: data.linkedin_headline,
        linkedin_summary: data.linkedin_summary,
        linkedin_skills: data.professional_skills,
        instagram_url: data.instagram_url,
        instagram_synced_at: data.instagram_synced_at,
        instagram_bio: data.instagram_bio,
        instagram_followers_count: data.instagram_followers_count,
        instagram_interests: data.instagram_interests,
        tiktok_url: data.tiktok_url,
        tiktok_synced_at: data.tiktok_synced_at,
        tiktok_bio: data.tiktok_bio,
        tiktok_followers_count: data.tiktok_followers_count,
        tiktok_content_themes: data.tiktok_content_themes,
        youtube_url: data.youtube_url,
        youtube_synced_at: data.youtube_synced_at,
        youtube_description: data.youtube_description,
        youtube_subscribers_count: data.youtube_subscribers_count,
        youtube_content_categories: data.youtube_content_categories,
        facebook_url: data.facebook_url,
        facebook_synced_at: data.facebook_synced_at,
        facebook_bio: data.facebook_bio,
        facebook_interests: data.facebook_interests,
        x_url: data.x_url,
        x_synced_at: data.x_synced_at,
        x_bio: data.x_bio,
        x_followers_count: data.x_followers_count,
        x_topics: data.x_topics,
        // About fields
        location: data.location || '',
        links: (data.links as any) || [],
        languages: (data.languages as any) || [],
      }));
    }
  }, [user?.id, contextProfile, localizedDefaultBio]);

  // Fetch full profile data including social media fields from Supabase
  useEffect(() => {
    refetchProfile();
  }, [refetchProfile]);

  const scopeContext = {
    isOwner: true,
    isFollower: false,
    editMode: true,
    viewAs
  };

  const scope = getScope(scopeContext);

  const handleSave = async () => {
    try {
      console.log('[EditProfilePage] Main save triggered - refreshing profile data');
      
      // Refresh profile data to ensure everything is up to date
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: translate('editProfile.notAuthenticated', 'Not authenticated'),
          description: translate('editProfile.notAuthenticatedDesc', 'Please log in to save your profile.'),
          variant: "destructive"
        });
        return;
      }

      // Fetch latest profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setHasUnsavedChanges(false);
      toast({
        title: translate('editProfile.profileUpdated', 'Profile updated successfully!'),
        description: translate('editProfile.profileUpdatedDesc', 'Your changes are now live. Your VITANA profile looks amazing.')
      });

      // BOOTSTRAP-HISTORY-AWARE-TIMELINE: record profile update on timeline.
      supabase.from('user_activity_log').insert({
        user_id: user.id,
        activity_type: 'profile.update',
        activity_data: { handle: data?.handle },
        context_data: { surface: 'vitanaland' },
        session_id: sessionStorage.getItem('vitana_session_id') || null,
      }).then(({ error: logErr }) => {
        if (logErr) console.warn('[EditProfile] timeline log failed:', logErr.message);
      });

      console.log('[EditProfilePage] Profile data refreshed:', data);
    } catch (error: any) {
      console.error('[EditProfilePage] Save error:', error);
      toast({
        title: translate('editProfile.error', 'Error'),
        description: error.message || translate('editProfile.refreshFailed', 'Failed to refresh profile data.'),
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(translate('editProfile.unsavedChanges', 'You have unsaved changes. Are you sure you want to leave?'));
      if (!confirmed) return;
    }
    navigate(`/u/${profile.handle}`);
  };

  const handleEditIdentity = () => {
    setIdentityDrawerOpen(true);
  };

  const handleEditAbout = () => {
    setAboutDrawerOpen(true);
  };

  const handleEditServices = () => {
    setServicesDrawerOpen(true);
  };

  const handleEditCompliance = () => {
    setComplianceDrawerOpen(true);
  };

  const handleEditShowcase = () => {
    setShowcaseDrawerOpen(true);
  };

  const handleEditVisibility = () => {
    setVisibilityDrawerOpen(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
        if (e.shiftKey && e.key === 'P') {
          e.preventDefault();
          const modes: ViewAsMode[] = ["me", "public", "follower"];
          const currentIndex = modes.indexOf(viewAs);
          const nextIndex = (currentIndex + 1) % modes.length;
          setViewAs(modes[nextIndex]);
        }
      }
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewAs, hasUnsavedChanges]);

  const isMobile = useIsMobile();
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileProfileTab>("posts");
  const [showAutopilotPopup, setShowAutopilotPopup] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showQRScreen, setShowQRScreen] = useState(false);

  // Milestones hook
  const { milestones, isOwner: milestoneIsOwner, addMilestone, updateMilestone, deleteMilestone, isLoading: milestonesLoading } = useProfileMilestones(user?.id);

  // Gallery hook
  const { photos, isOwner: galleryIsOwner, uploadPhoto, deletePhoto } = useProfileGallery(user?.id);

  // Share hook
  const shareHook = useProfileShare({
    handle: profile.handle,
    name: profile.name,
    profileId: profile.id,
    isPublic: true,
  });

  // Mobile-specific layout - early return pattern
  if (isMobile) {
    return (
      <AppLayout>
        <SEO 
          title="Edit Profile – VITANA" 
          description="Edit your VITANA profile and customize your public presence" 
        />
        
        {/* NO EditToolbar on mobile! */}
        
        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background pb-32">
          {/* ID Card Switcher - Front/Back with segmented control */}
          <MobileIdCardSwitcher
            profile={profile}
            editMode={true}
            onEditIdentity={handleEditIdentity}
            onEditSocial={handleEditAbout}
            onRefreshProfile={refetchProfile}
            onShare={shareHook.openShare}
          />
          
          {/* Compact Stats Strip */}
          <MobileProfileStats
            userId={user?.id}
          />
          
          {/* Sticky Tab Bar for content below ID card */}
          <MobileProfileTabs
            activeTab={mobileActiveTab}
            onTabChange={setMobileActiveTab}
          />
          
          {/* Tab Content */}
          <div className="flex-1">
            {mobileActiveTab === "posts" && (
              <div className="p-4 space-y-4">
                {/* Showcase Section */}
                <MobileShowcaseHeader onManage={handleEditShowcase} />
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  {translate('editProfile.showcaseHint', 'Select posts and content to feature at the top of your profile')}
                </div>
                
                {/* Autopilot Banner */}
                <MobileAutopilotBanner onTry={() => setShowAutopilotPopup(true)} />

                {/* Real Posts */}
                <ProfilePostsTab
                  profile={profile}
                  scope={getScope({ isOwner: true, isFollower: false, editMode: true, viewAs: "me" })}
                  editMode={true}
                  onEditAbout={handleEditAbout}
                  onCreatePost={() => setShowCreatePost(true)}
                />
              </div>
            )}
            
            {mobileActiveTab === "about" && (
              <div className="p-4 space-y-4">
                {/* About content - tap to edit */}
                <button 
                  onClick={handleEditAbout}
                  className="w-full text-left p-4 rounded-xl border bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <h3 className="text-sm font-semibold mb-2">{translate('editProfile.about', 'About')}</h3>
                  <p className="text-sm text-muted-foreground">{profile.bio || translate('editProfile.addBio', 'Add a bio...')}</p>
                  <p className="text-xs text-primary mt-2">{translate('editProfile.tapToEdit', 'Tap to edit')}</p>
                </button>

                {/* Life Milestones */}
                <MilestoneTimeline
                  milestones={milestones}
                  isOwner={true}
                  onAdd={(input) => addMilestone.mutate(input)}
                  onUpdate={(input) => updateMilestone.mutate(input)}
                  onDelete={(id) => deleteMilestone.mutate(id)}
                  isAdding={addMilestone.isPending}
                />
              </div>
            )}
            
            {mobileActiveTab === "media" && (
              <div className="p-4 space-y-6">
                <PhotoGallery
                  photos={photos}
                  isOwner={true}
                  onUpload={(data) => uploadPhoto.mutate(data)}
                  onDelete={(id) => deletePhoto.mutate(id)}
                  isUploading={uploadPhoto.isPending}
                />
                <VideoGallery userId={user?.id} />
                <MusicGallery userId={user?.id} />
              </div>
            )}
            
            {mobileActiveTab === "groups" && (
              <MobileGroupsTabContent userId={user?.id} />
            )}
          </div>
        </div>

        {/* Drawers - same on mobile */}
        <IdentityDrawer
          open={identityDrawerOpen}
          onOpenChange={(open) => {
            setIdentityDrawerOpen(open);
            if (!open) {
              refetchProfile();
              completeBySourceRef('onboarding_profile');
              completeBySourceRef('onboarding_avatar');
            }
          }}
        />

        <AboutDrawer
          open={aboutDrawerOpen}
          onOpenChange={(open) => {
            setAboutDrawerOpen(open);
            if (!open) refetchProfile();
          }}
        />

        <ServicesDrawer
          open={servicesDrawerOpen}
          onOpenChange={setServicesDrawerOpen}
        />

        <ComplianceDrawer
          open={complianceDrawerOpen}
          onOpenChange={setComplianceDrawerOpen}
        />

        <ShowcaseDrawer
          open={showcaseDrawerOpen}
          onOpenChange={setShowcaseDrawerOpen}
        />

        <VisibilityDrawer
          open={visibilityDrawerOpen}
          onOpenChange={setVisibilityDrawerOpen}
        />

        {/* Autopilot Popup */}
        <AutopilotProfilePopup
          open={showAutopilotPopup}
          onOpenChange={setShowAutopilotPopup}
          currentBio={profile.bio}
          currentArchetype={profile.longevityArchetype}
          refreshProfile={refetchProfile}
        />

        {/* Create Post Sheet */}
        <MobileCreatePostSheet
          open={showCreatePost}
          onOpenChange={setShowCreatePost}
        />

        {/* Share Profile Modal */}
        <ShareProfileModal
          isOpen={shareHook.isShareOpen}
          onOpenChange={shareHook.setIsShareOpen}
          profile={profile}
          onCopyLink={shareHook.copyLink}
          onShareToX={shareHook.shareToX}
          onShareToLinkedIn={shareHook.shareToLinkedIn}
          onShareToFacebook={shareHook.shareToFacebook}
          onShareToInstagram={shareHook.shareToInstagram}
          onShareToTikTok={shareHook.shareToTikTok}
          onShareToYouTube={shareHook.shareToYouTube}
          onViewPublicProfile={() => navigate(`/u/${profile.handle}`)}
          connectedPlatforms={{
            linkedin: !!profile.linkedin_url,
            instagram: !!profile.instagram_url,
            facebook: !!profile.facebook_url,
            x: !!profile.x_url,
            youtube: !!profile.youtube_url,
            tiktok: !!profile.tiktok_url,
          }}
        />

        {/* Instagram-style QR Share Screen */}
        <MobileQRShareScreen
          isOpen={showQRScreen}
          onClose={() => setShowQRScreen(false)}
          profileUrl={shareHook.getShareUrl()}
          profileName={profile.name}
          profileHandle={profile.handle}
          avatarUrl={profile.avatarUrl}
        />
      </AppLayout>
    );
  }

  // Desktop layout (unchanged)
  return (
    <AppLayout>
      <SEO 
        title="Edit Profile – VITANA" 
        description="Edit your VITANA profile and customize your public presence" 
      />
      
      <EditToolbar
        viewAs={viewAs}
        onViewAsChange={setViewAs}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      
      <ProfileLayout 
        profile={profile}
        scope={scope}
        editMode={true}
        isOwnProfile={viewAs === "me"}
        onEditIdentity={handleEditIdentity}
        onEditAbout={handleEditAbout}
        onEditServices={handleEditServices}
        onEditCompliance={handleEditCompliance}
        onEditShowcase={handleEditShowcase}
        onEditVisibility={handleEditVisibility}
      />

      <IdentityDrawer
        open={identityDrawerOpen}
        onOpenChange={setIdentityDrawerOpen}
      />

      <AboutDrawer
        open={aboutDrawerOpen}
        onOpenChange={(open) => {
          setAboutDrawerOpen(open);
          if (!open) refetchProfile();
        }}
      />

      <ServicesDrawer
        open={servicesDrawerOpen}
        onOpenChange={setServicesDrawerOpen}
      />

      <ComplianceDrawer
        open={complianceDrawerOpen}
        onOpenChange={setComplianceDrawerOpen}
      />

      <ShowcaseDrawer
        open={showcaseDrawerOpen}
        onOpenChange={setShowcaseDrawerOpen}
      />

      <VisibilityDrawer
        open={visibilityDrawerOpen}
        onOpenChange={setVisibilityDrawerOpen}
      />
    </AppLayout>
  );
}