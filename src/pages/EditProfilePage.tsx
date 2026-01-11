import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { MobileProfileHeader } from "@/components/profile/mobile/MobileProfileHeader";
import { MobileProfileStats } from "@/components/profile/mobile/MobileProfileStats";
import { MobileProfileTabs, MobileProfileTab } from "@/components/profile/mobile/MobileProfileTabs";
import { MobileAutopilotBanner } from "@/components/profile/mobile/MobileAutopilotBanner";
import { MobileShowcaseHeader } from "@/components/profile/mobile/MobileShowcaseHeader";
import { MobileSocialGrid } from "@/components/profile/mobile/MobileSocialGrid";
import { AutopilotProfilePopup } from "@/components/profile/AutopilotProfilePopup";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { profile: contextProfile } = useProfile();
  const { user } = useAuth();
  const [viewAs, setViewAs] = useState<ViewAsMode>("me");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const [identityDrawerOpen, setIdentityDrawerOpen] = useState(false);
  const [aboutDrawerOpen, setAboutDrawerOpen] = useState(false);
  const [servicesDrawerOpen, setServicesDrawerOpen] = useState(false);
  const [complianceDrawerOpen, setComplianceDrawerOpen] = useState(false);
  const [showcaseDrawerOpen, setShowcaseDrawerOpen] = useState(false);
  const [visibilityDrawerOpen, setVisibilityDrawerOpen] = useState(false);

  // Profile data from context
  const [profile, setProfile] = useState<UserProfile>({
    id: 'current-user',
    user_id: user?.id,
    name: contextProfile.displayName,
    handle: contextProfile.handle || 'user',
    avatarUrl: contextProfile.avatar,
    roles: ['community'],
    bio: 'Wellness enthusiast passionate about holistic health and community building. 🌱',
    location: 'San Francisco, CA',
    links: [
      { label: 'Website', url: 'https://mariia.com' },
      { label: 'Instagram', url: 'https://instagram.com/mariia' }
    ],
    languages: ['English', 'Ukrainian'],
    stats: {
      posts: 124,
      followers: 1205,
      following: 487,
      mediaUploads: 89,
      groupsJoined: 12
    },
    vitanaIndex: 742,
    vitanaPercentile: 85,
    longevityArchetype: 'The Mindful Mover',
    visibility: {
      about: 'public',
      links: 'public',
      location: 'public',
      showcase: 'public',
      indexPublic: true,
      healthShareConsent: true
    }
  });

  // Fetch full profile data including social media fields from Supabase
  useEffect(() => {
    const fetchProfileData = async () => {
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
          handle: data.handle || contextProfile.handle || 'user',
          avatarUrl: data.avatar_url || contextProfile.avatar,
          bio: data.bio || prev.bio,
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
        }));
      }
    };

    fetchProfileData();
  }, [user, contextProfile]);

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
          title: "Not authenticated",
          description: "Please log in to save your profile.",
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
        title: "Profile updated successfully!",
        description: "Your changes are now live. Your VITANA profile looks amazing."
      });
      
      console.log('[EditProfilePage] Profile data refreshed:', data);
    } catch (error: any) {
      console.error('[EditProfilePage] Save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to refresh profile data.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
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

  // Build social platforms from profile data
  const socialPlatforms = [
    { id: "linkedin", name: "LinkedIn", icon: <span className="text-sm font-bold text-[#0A66C2]">in</span>, connected: !!profile.linkedin_url },
    { id: "instagram", name: "Instagram", icon: <span className="text-sm">📸</span>, connected: !!profile.instagram_url },
    { id: "tiktok", name: "TikTok", icon: <span className="text-sm">🎵</span>, connected: !!profile.tiktok_url },
    { id: "youtube", name: "YouTube", icon: <span className="text-sm text-red-600">▶</span>, connected: !!profile.youtube_url },
    { id: "facebook", name: "Facebook", icon: <span className="text-sm font-bold text-[#1877F2]">f</span>, connected: !!profile.facebook_url },
    { id: "twitter", name: "X", icon: <span className="text-sm font-bold">𝕏</span>, connected: !!profile.x_url },
  ];

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
          {/* Mobile Profile Header (identity block) */}
          <MobileProfileHeader
            avatarUrl={profile.avatarUrl}
            displayName={profile.name}
            handle={profile.handle}
            archetype={profile.longevityArchetype}
            bio={profile.bio}
            vitanaIndex={profile.vitanaIndex}
            editMode={true}
            onEdit={handleEditIdentity}
          />
          
          {/* Compact Stats Strip */}
          <MobileProfileStats
            postsCount={profile.stats?.posts}
            mediaCount={profile.stats?.mediaUploads}
            groupsCount={profile.stats?.groupsJoined}
          />
          
          {/* Sticky Tab Bar */}
          <MobileProfileTabs
            activeTab={mobileActiveTab}
            onTabChange={setMobileActiveTab}
          />
          
          {/* Tab Content */}
          <div className="flex-1">
            {mobileActiveTab === "posts" && (
              <div className="p-4">
                {/* Showcase Section */}
                <MobileShowcaseHeader onManage={handleEditShowcase} />
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  Select posts and content to feature at the top of your profile
                </div>
                
                {/* Autopilot Banner */}
                <MobileAutopilotBanner onTry={() => setShowAutopilotPopup(true)} />
              </div>
            )}
            
            {mobileActiveTab === "about" && (
              <div className="p-4 space-y-4">
                {/* About content - tap to edit */}
                <button 
                  onClick={handleEditAbout}
                  className="w-full text-left p-4 rounded-xl border bg-card/50 hover:bg-card/80 transition-colors"
                >
                  <h3 className="text-sm font-semibold mb-2">About</h3>
                  <p className="text-sm text-muted-foreground">{profile.bio || "Add a bio..."}</p>
                  <p className="text-xs text-primary mt-2">Tap to edit</p>
                </button>
                
                {/* Social Presence Grid */}
                <MobileSocialGrid
                  platforms={socialPlatforms}
                  onConnect={(platformId) => console.log('Connect:', platformId)}
                  onManage={handleEditAbout}
                />
              </div>
            )}
            
            {mobileActiveTab === "media" && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground text-center py-8">
                  {profile.stats?.mediaUploads || 0} media uploads
                </p>
              </div>
            )}
            
            {mobileActiveTab === "groups" && (
              <div className="p-4">
                <p className="text-sm text-muted-foreground text-center py-8">
                  {profile.stats?.groupsJoined || 0} groups joined
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Drawers - same on mobile */}
        <IdentityDrawer
          open={identityDrawerOpen}
          onOpenChange={setIdentityDrawerOpen}
        />

        <AboutDrawer
          open={aboutDrawerOpen}
          onOpenChange={setAboutDrawerOpen}
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
        onOpenChange={setAboutDrawerOpen}
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