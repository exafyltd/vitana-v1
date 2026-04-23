import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { ProfileStats } from "./ProfileStats";
import { DesktopIdCardSwitcher } from "../desktop/DesktopIdCardSwitcher";
import { ProfessionalCredentialsStrip } from "./ProfessionalCredentialsStrip";
import { ProfessionalCTAs } from "./ProfessionalCTAs";
import { CredentialUploadPopup } from "./CredentialUploadPopup";
import { GoLivePopup } from "@/components/GoLivePopup";
import { ProfileSplitNavigation } from "./ProfileSplitNavigation";
import PageHeader from "@/components/PageHeader";
import { AutopilotSuggestions } from "../AutopilotSuggestions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star } from "lucide-react";
import { CommunityImpactWidget } from "../community/CommunityImpactWidget";
import { SuccessStoryCarousel } from "../community/SuccessStoryCarousel";
import { CompatibilityIndicator } from "../engagement/CompatibilityIndicator";
import { ContextualCTAs } from "../engagement/ContextualCTAs";
import { SmartEditingToolbar } from "../editor/SmartEditingToolbar";
import { ProfileProgressCard } from "../editor/ProfileProgressCard";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useState, useCallback } from "react";
import { shouldShowField } from "@/lib/profileScope";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileIdCardSwitcher } from "../mobile/MobileIdCardSwitcher";
import { MobileProfileStats } from "../mobile/MobileProfileStats";
import { MobileProfileTabs, MobileProfileTab } from "../mobile/MobileProfileTabs";
import { MobileAutopilotBanner } from "../mobile/MobileAutopilotBanner";
import { MobileShowcaseHeader } from "../mobile/MobileShowcaseHeader";
import { MobileMediaTabContent } from "../mobile/MobileMediaTabContent";
import { ProfilePostsTab } from "./tabs/ProfilePostsTab";
import { MobileGroupsTabContent } from "../mobile/MobileGroupsTabContent";
import { MilestoneTimeline } from "../milestones/MilestoneTimeline";
import { useProfileMilestones } from "@/hooks/useProfileMilestones";
import { PhotoGallery } from "../gallery/PhotoGallery";
import { VideoGallery } from "../gallery/VideoGallery";
import { MusicGallery } from "../gallery/MusicGallery";
import { useProfileGallery } from "@/hooks/useProfileGallery";
import { ShareProfileSheet } from "./ShareProfileSheet";
import { useProfileShare } from "@/hooks/useProfileShare";
import { MobileQRShareScreen } from "../mobile/MobileQRShareScreen";
import { useFollow } from "@/hooks/useFollow";
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useAuth } from "@/context/AuthProvider";
import { resolveProfileUserId } from "@/lib/resolveProfileUserId";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { MessageComposeModal } from "./MessageComposeModal";
import { useCommunityLogger } from "@/hooks/useCommunityLogger";

interface ProfileLayoutProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  isOwnProfile?: boolean;
  onEditIdentity?: () => void;
  onEditAbout?: () => void;
  onEditServices?: () => void;
  onEditCompliance?: () => void;
  onEditShowcase?: () => void;
  onEditVisibility?: () => void;
  onEditAccount?: () => void;
  onRefreshProfile?: () => void;
}

export function ProfileLayout({ 
  profile, 
  scope, 
  editMode,
  isOwnProfile = false,
  onEditIdentity,
  onEditAbout,
  onEditServices,
  onEditCompliance,
  onEditShowcase,
  onEditVisibility,
  onEditAccount,
  onRefreshProfile
}: ProfileLayoutProps) {
  // Smart editing state
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editHistory, setEditHistory] = useState<UserProfile[]>([profile]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Popup states
  const [showCredentialUpload, setShowCredentialUpload] = useState(false);
  const [showGoLive, setShowGoLive] = useState(false);

  // Auto-save functionality
  const handleSaveProfile = useCallback(async (updatedProfile: UserProfile) => {
    // TODO: Implement actual profile saving logic
    console.log('Saving profile:', updatedProfile);
    // This would typically call a Supabase update function
  }, []);

  const { forceSave, hasUnsavedChanges, isSaving } = useAutoSave({
    data: profile,
    onSave: handleSaveProfile,
    enabled: editMode
  });

  // History management
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < editHistory.length - 1;

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(prev => prev - 1);
    }
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(prev => prev + 1);
    }
  }, [canRedo]);

  // Section navigation
  const handleSectionClick = useCallback((sectionId: string) => {
    switch (sectionId) {
      case 'identity':
        onEditIdentity?.();
        break;
      case 'about':
        onEditAbout?.();
        break;
      case 'avatar':
      case 'cover':
        onEditShowcase?.();
        break;
      case 'location':
      case 'links':
      case 'languages':
        onEditAbout?.();
        break;
      case 'services':
        onEditServices?.();
        break;
      default:
        console.log('Unknown section:', sectionId);
    }
  }, [onEditIdentity, onEditAbout, onEditShowcase, onEditServices]);

  const effectiveEditMode = editMode && !isPreviewMode;

  const isMobile = useIsMobile();
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileProfileTab>("posts");
  const { user } = useAuth();

  // Mobile-specific hooks — resolve real user_id (profile.id can be "current-user")
  const profileUserId = resolveProfileUserId(profile.user_id, profile.id, user?.id);
  const { milestones, isOwner: isMilestoneOwner, addMilestone, updateMilestone, deleteMilestone } = useProfileMilestones(profileUserId);
  const { photos, isOwner: isGalleryOwner, uploadPhoto, deletePhoto } = useProfileGallery(profileUserId);
  const shareHook = useProfileShare({
    handle: profile.handle,
    name: profile.name,
    profileId: profile.id,
    isPublic: profile.visibility?.indexPublic !== false,
  });
  const [showQRScreen, setShowQRScreen] = useState(false);

  // Follow & Message hooks for mobile visitor view
  const isOwner = scope === 'owner' || isOwnProfile;
  const { isFollowing, loading: followLoading, followUser, unfollowUser, followersCount, followingCount } = useFollow(profileUserId);
  const { createThread, sendMessage } = useHybridMessages('global');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logFollow, logUnfollow, logMessageSend } = useCommunityLogger();
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  const handleFollowClick = async () => {
    if (isFollowing) {
      await unfollowUser();
      logUnfollow(profile.id, profile.name);
    } else {
      await followUser();
      logFollow(profile.id, profile.name);
    }
  };

  const handleMessageClick = () => {
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to send messages", variant: "destructive" });
      return;
    }
    setMessageModalOpen(true);
  };

  const handleSendMessage = async (message: string) => {
    setIsCreatingThread(true);
    try {
      const thread = await createThread([profile.id]);
      if (!thread?.id) throw new Error('Failed to create thread');
      await sendMessage({ context: 'global', threadId: thread.id, content: message, type: 'text' });
      logMessageSend(thread.id, 'text', 'global');
      toast({ title: "Message sent", description: "Your message has been sent successfully" });
      navigate('/inbox', { state: { selectedThreadId: thread.id } });
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
      throw error;
    } finally {
      setIsCreatingThread(false);
    }
  };

  // Mobile-specific layout for public profile view
  if (isMobile) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-primary/5 to-background pb-32">
        {/* ID Card Switcher - Front/Back with segmented control */}
        <MobileIdCardSwitcher
          profile={profile}
          editMode={effectiveEditMode}
          isOwner={isOwner}
          onEditIdentity={onEditIdentity}
          onEditSocial={onEditAbout}
          onEditAccount={onEditAccount}
          onRefreshProfile={onRefreshProfile}
          onShare={shareHook.openShare}
          onFollow={!isOwner ? handleFollowClick : undefined}
          onMessage={!isOwner ? handleMessageClick : undefined}
          isFollowing={isFollowing}
          followLoading={followLoading}
        />
        
        {/* Compact Stats Strip */}
        <MobileProfileStats
          userId={profileUserId}
          profileId={profile.id}
          followersCount={followersCount}
          followingCount={followingCount}
        />
        
        {/* Sticky Tab Bar for content below ID card */}
        <MobileProfileTabs
          activeTab={mobileActiveTab}
          onTabChange={setMobileActiveTab}
        />
        
        {/* Tab Content */}
        <div className="flex-1">
          {mobileActiveTab === "posts" && effectiveEditMode && (
            <div className="p-4">
              <MobileShowcaseHeader onManage={onEditShowcase} />
              <div className="px-4 py-2 text-sm text-muted-foreground">
                Select posts and content to feature
              </div>
              <MobileAutopilotBanner onTry={() => {
                const autopilotElement = document.querySelector('[data-autopilot-trigger]') as HTMLElement;
                if (autopilotElement) {
                  autopilotElement.click();
                }
              }} />
            </div>
          )}
          {mobileActiveTab === "posts" && !effectiveEditMode && (
            <ProfilePostsTab
              profile={profile}
              scope={scope}
              editMode={false}
            />
          )}
          
          {mobileActiveTab === "about" && (
            <div className="p-4 space-y-4">
              <button 
                onClick={onEditAbout}
                className="w-full text-left p-4 rounded-xl border bg-card/50 hover:bg-card/80 transition-colors"
              >
                <h3 className="text-sm font-semibold mb-2">About</h3>
                <p className="text-sm text-muted-foreground">{profile.bio || "No bio yet"}</p>
                {effectiveEditMode && <p className="text-xs text-primary mt-2">Tap to edit</p>}
              </button>

              {/* Life Milestones */}
              <MilestoneTimeline
                milestones={milestones}
                isOwner={isMilestoneOwner}
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
                isOwner={isGalleryOwner}
                onUpload={(data) => uploadPhoto.mutate(data)}
                onDelete={(id) => deletePhoto.mutate(id)}
                isUploading={uploadPhoto.isPending}
              />
              <VideoGallery userId={profileUserId} />
              <MusicGallery userId={profileUserId} />
            </div>
          )}

          {mobileActiveTab === "groups" && (
            <MobileGroupsTabContent userId={profileUserId} />
          )}
        </div>

        {/* Share sheet — native share + QR, mirroring event-share pattern */}
        <ShareProfileSheet
          isOpen={shareHook.isShareOpen}
          onOpenChange={shareHook.setIsShareOpen}
          profile={profile}
          shareUrl={shareHook.getShareUrl()}
          onShowQR={() => setShowQRScreen(true)}
        />

        {/* QR Share Screen */}
        <MobileQRShareScreen
          isOpen={showQRScreen}
          onClose={() => setShowQRScreen(false)}
          profileUrl={shareHook.getShareUrl()}
          profileName={profile.name}
          profileHandle={profile.handle}
          avatarUrl={profile.avatarUrl}
          avatarOffsetX={profile.avatarOffsetX}
          avatarOffsetY={profile.avatarOffsetY}
        />

        {/* Message Compose Modal for visitor view */}
        {!isOwner && (
          <MessageComposeModal
            isOpen={messageModalOpen}
            onOpenChange={setMessageModalOpen}
            recipient={profile}
            onSend={handleSendMessage}
          />
        )}

        {/* Popups still work on mobile */}
        <CredentialUploadPopup
          open={showCredentialUpload}
          onOpenChange={setShowCredentialUpload}
          existingCredentials={profile.professionalCredentials?.coachingSpecialties}
          onSave={(credentials) => {
            console.log('Saving credentials:', credentials);
          }}
        />

        <GoLivePopup
          open={showGoLive}
          onOpenChange={setShowGoLive}
        />
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Smart Editing Toolbar */}
      {editMode && (
        <SmartEditingToolbar
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          isPreviewMode={isPreviewMode}
          canUndo={canUndo}
          canRedo={canRedo}
          onSave={forceSave}
          onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onAutopilot={() => {
            const autopilotElement = document.querySelector('[data-autopilot-trigger]') as HTMLElement;
            if (autopilotElement) {
              autopilotElement.click();
            }
          }}
        />
      )}

      <div className="space-y-0">
        <div className="max-w-7xl mx-auto">
          <DesktopIdCardSwitcher
            profile={profile}
            scope={scope}
            editMode={effectiveEditMode}
            isOwner={isOwner}
            onEditIdentity={onEditIdentity}
            onEditSocial={onEditAbout}
            onEditAccount={onEditAccount}
          />
        </div>

        <div className="mt-2">
          <ProfileStats profile={profile} profileUserId={profileUserId} followersCount={followersCount} followingCount={followingCount} />
        </div>
        
        {/* Main Profile Content - Unified spacing container */}
        <div className="px-6 mt-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-y-3">
            {/* Split Screen Content */}
            <ProfileSplitNavigation
              profile={profile}
              scope={scope}
              editMode={effectiveEditMode}
              isOwnProfile={isOwnProfile}
              onEditAbout={onEditAbout}
              onEditServices={onEditServices}
              onEditCompliance={onEditCompliance}
              onEditVisibility={onEditVisibility}
              onSectionClick={handleSectionClick}
              onGoLive={() => setShowGoLive(true)}
              onUploadCredentials={() => setShowCredentialUpload(true)}
            />
            
            {/* Showcase Section - Single unified location */}
            {effectiveEditMode && onEditShowcase && (
              <div className="bg-background rounded-lg border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Showcase</h3>
                  <Button variant="outline" size="sm" onClick={onEditShowcase}>
                    <Star className="h-4 w-4 mr-2" />
                    Manage Featured Content
                  </Button>
                </div>
                <p className="text-muted-foreground">
                  Select posts and content to feature at the top of your profile
                </p>
              </div>
            )}
            
            {/* Autopilot Suggestions - Positioned after Showcase */}
            {effectiveEditMode && (
              <AutopilotSuggestions
                type="profile-section"
                onSuggestionClick={(suggestion) => {
                  console.log('Autopilot suggestion clicked:', suggestion);
                }}
              />
            )}
          </div>
        </div>

        {/* Credential Upload Popup */}
        <CredentialUploadPopup
          open={showCredentialUpload}
          onOpenChange={setShowCredentialUpload}
          existingCredentials={profile.professionalCredentials?.coachingSpecialties}
          onSave={(credentials) => {
            // Handle saving credentials
            console.log('Saving credentials:', credentials);
          }}
        />

        {/* Go Live Popup */}
        <GoLivePopup
          open={showGoLive}
          onOpenChange={setShowGoLive}
        />
      </div>
    </div>
  );
}