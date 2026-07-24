import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { ProfileStats } from "./ProfileStats";
import { DesktopIdCardSwitcher } from "../desktop/DesktopIdCardSwitcher";
import { ProfessionalCredentialsStrip } from "./ProfessionalCredentialsStrip";
import { ProfessionalCTAs } from "./ProfessionalCTAs";
import { CredentialUploadPopup } from "./CredentialUploadPopup";
import { GoLivePopup } from "@/components/GoLivePopup";
import { SplitBar } from "@/components/ui/split-bar";
import {
  ProfileSplitNavigationTriggers,
  ProfileSplitNavigationContent,
} from "./ProfileSplitNavigation";
import PageHeader from "@/components/PageHeader";
import { AutopilotSuggestions } from "../AutopilotSuggestions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star } from "lucide-react";
import { CommunityImpactWidget } from "../community/CommunityImpactWidget";
import { SuccessStoryCarousel } from "../community/SuccessStoryCarousel";
import { CompatibilityIndicator } from "../engagement/CompatibilityIndicator";
import { ContextualCTAs } from "../engagement/ContextualCTAs";
import { ProfileProgressCard } from "../editor/ProfileProgressCard";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useState, useCallback } from "react";
import { shouldShowField } from "@/lib/profileScope";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileIdCardSwitcher, getActiveCardSide } from "../mobile/MobileIdCardSwitcher";
import { DesktopCardSide } from "../desktop/DesktopIdCardSwitcher";
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
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from "react-router-dom";
import { MessageComposeModal } from "./MessageComposeModal";
import { useCommunityLogger } from "@/hooks/useCommunityLogger";
import { notify, notifyError, t } from '@/lib/i18n-toast';

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
  // Popup states
  const [showCredentialUpload, setShowCredentialUpload] = useState(false);
  const [showGoLive, setShowGoLive] = useState(false);

  // Auto-save functionality (silent — saves in the background, no toolbar UI)
  const handleSaveProfile = useCallback(async (updatedProfile: UserProfile) => {
    // TODO: Implement actual profile saving logic
    console.log('Saving profile:', updatedProfile);
    // This would typically call a Supabase update function
  }, []);

  useAutoSave({
    data: profile,
    onSave: handleSaveProfile,
    enabled: editMode,
  });

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

  const effectiveEditMode = editMode;

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
  const [qrInitialMode, setQrInitialMode] = useState<"profile" | "invite">("profile");

  // Follow & Message hooks for mobile visitor view
  const isOwner = scope === 'owner' || isOwnProfile;
  const { isFollowing, loading: followLoading, followUser, unfollowUser, followersCount, followingCount } = useFollow(profileUserId);
  const { createThread, sendMessage } = useHybridMessages('global');
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logFollow, logUnfollow, logMessageSend } = useCommunityLogger();
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  // VTID-02950 round 2: gate the Posts/About/Media/Groups tab system off of
  // which ID-card segment is active, so it disappears under Business.
  const [searchParams] = useSearchParams();
  const isBusinessTab = getActiveCardSide(searchParams) === "business";
  const [activeDesktopSide, setActiveDesktopSide] = useState<DesktopCardSide>("identity");
  const isDesktopBusinessTab = activeDesktopSide === "business";

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
      notifyError('toasts.profile.authenticationRequired', 'toasts.profile.pleaseSignSendMessages');
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
      notify('toasts.profile.messageSent', 'toasts.profile.yourMessageHasSentSuccessfully');
      navigate('/inbox', { state: { selectedThreadId: thread.id } });
    } catch (error) {
      notifyError('toasts.profile.error', 'toasts.profile.failedSendMessagePleaseTryAgain');
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
          onGetMaxina={isOwner ? () => {
            setQrInitialMode("invite");
            setShowQRScreen(true);
          } : undefined}
          onFollow={!isOwner ? handleFollowClick : undefined}
          onMessage={!isOwner ? handleMessageClick : undefined}
          isFollowing={isFollowing}
          followLoading={followLoading}
          followersCount={followersCount}
          followingCount={followingCount}
        />

        {/* Compact Stats Strip + Posts/About/Media/Groups tab system —
            hidden on the Business segment (VTID-02950 round 2), which
            shows only its own recommendations list via MobileIdCardSwitcher
            above. */}
        {!isBusinessTab && (
        <>
        <MobileProfileStats
          userId={profileUserId}
          profileId={profile.id}
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
                {t('screens.profile.selectPostsContentFeature')}
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
                <h3 className="text-sm font-semibold mb-2">{t('screens.profile.about')}</h3>
                <p className="text-sm text-muted-foreground">{profile.bio || "No bio yet"}</p>
                {effectiveEditMode && <p className="text-xs text-primary mt-2">{t('screens.profile.tapEdit')}</p>}
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
        </>
        )}

        {/* Share sheet — native share + QR, mirroring event-share pattern */}
        <ShareProfileSheet
          isOpen={shareHook.isShareOpen}
          onOpenChange={shareHook.setIsShareOpen}
          profile={profile}
          shareUrl={shareHook.getShareUrl()}
          onShowQR={() => {
            setQrInitialMode("profile");
            setShowQRScreen(true);
          }}
        />

        {/* QR Share Screen */}
        <MobileQRShareScreen
          isOpen={showQRScreen}
          onClose={() => setShowQRScreen(false)}
          initialMode={qrInitialMode}
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

  // Desktop layout
  return (
    <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <SplitBar defaultValue="posts" className="w-full">
        {/* Hero area: fills the viewport height so the tab triggers land at the bottom */}
        <div className="min-h-screen flex flex-col">
          <div className="max-w-7xl mx-auto w-full">
            <DesktopIdCardSwitcher
              profile={profile}
              scope={scope}
              editMode={effectiveEditMode}
              isOwner={isOwner}
              onEditIdentity={onEditIdentity}
              onEditSocial={onEditAbout}
              onEditAccount={onEditAccount}
              activeSide={activeDesktopSide}
              onActiveSideChange={setActiveDesktopSide}
            />
          </div>

          {/* Stats + tab triggers — hidden on the Business segment
              (VTID-02950 round 2), which shows only its own recommendations
              list below instead of the Posts/About/Media/Groups system. */}
          {!isDesktopBusinessTab && (
          <>
          <div>
            <ProfileStats profile={profile} profileUserId={profileUserId} followersCount={followersCount} followingCount={followingCount} />
          </div>

          {/* Spacer — pushes the tab triggers to the bottom of the viewport */}
          <div className="flex-1" />

          {/* Tab triggers (bottom of the first viewport) */}
          <div className="px-6 pb-3">
            <div className="max-w-7xl mx-auto">
              <ProfileSplitNavigationTriggers profile={profile} scope={scope} />
            </div>
          </div>
          </>
          )}
        </div>

        {/* Tab content — below the fold */}
        <div className="px-6 pt-3">
          <div className="max-w-7xl mx-auto flex flex-col gap-y-3">
            {isDesktopBusinessTab ? (
              <DesktopBusinessCard />
            ) : (
            <>
            <ProfileSplitNavigationContent
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
                  <h3 className="text-lg font-semibold">{t('screens.profile.showcase')}</h3>
                  <Button variant="outline" size="sm" onClick={onEditShowcase}>
                    <Star className="h-4 w-4 mr-2" />
                    {t('screens.profile.manageFeaturedContent')}
                  </Button>
                </div>
                <p className="text-muted-foreground">
                  {t('screens.profile.selectPostsContentFeatureAtTop')}
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
            </>
            )}
          </div>
        </div>
      </SplitBar>

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
  );
}