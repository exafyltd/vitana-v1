import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { ProfilePostsTab } from "./tabs/ProfilePostsTab";
import { ProfileMediaTab } from "./tabs/ProfileMediaTab"; // kept for potential future use
import { ProfileGroupsTab } from "./tabs/ProfileGroupsTab";
import { ProfileEventsTab } from "./tabs/ProfileEventsTab";
import { ProfileHealthTab } from "./tabs/ProfileHealthTab";
import { ProfileServicesTab } from "./tabs/ProfileServicesTab";
import { ProfileInsightTab } from "./tabs/ProfileInsightTab";
import { CommunityImpactWidget } from "../community/CommunityImpactWidget";
import { SuccessStoryCarousel } from "../community/SuccessStoryCarousel";
import { CompatibilityIndicator } from "../engagement/CompatibilityIndicator";
import { ProfessionalCTAs } from "./ProfessionalCTAs";
import { ProfileProgressCard } from "../editor/ProfileProgressCard";
import { shouldShowField } from "@/lib/profileScope";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, MessageSquare, Video, Users, Calendar, Heart, Briefcase, Lightbulb, Trophy, ImageIcon } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { MilestoneTimeline } from "../milestones/MilestoneTimeline";
import { PhotoGallery } from "../gallery/PhotoGallery";
import { VideoGallery } from "../gallery/VideoGallery";
import { MusicGallery } from "../gallery/MusicGallery";
import { useProfileMilestones } from "@/hooks/useProfileMilestones";
import { useProfileGallery } from "@/hooks/useProfileGallery";
import { useAuth } from "@/context/AuthProvider";
import { resolveProfileUserId } from "@/lib/resolveProfileUserId";

interface ProfileSplitNavigationProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  isOwnProfile?: boolean;
  onEditAbout?: () => void;
  onEditServices?: () => void;
  onEditCompliance?: () => void;
  onEditVisibility?: () => void;
  onSectionClick?: (sectionId: string) => void;
  onGoLive?: () => void;
  onUploadCredentials?: () => void;
}

export function ProfileSplitNavigation({
  profile,
  scope,
  editMode,
  isOwnProfile = false,
  onEditAbout,
  onEditServices,
  onEditCompliance,
  onEditVisibility,
  onSectionClick,
  onGoLive,
  onUploadCredentials,
}: ProfileSplitNavigationProps) {
  const { translate } = useTranslation();
  const { user } = useAuth();

  // Resolve the correct user_id for DB queries (profile.id can be "current-user")
  const profileUserId = resolveProfileUserId(profile.user_id, profile.id, user?.id);

  // Milestones & Gallery hooks
  const { milestones, isOwner: isMilestoneOwner, addMilestone, updateMilestone, deleteMilestone } = useProfileMilestones(profileUserId);
  const { photos, isOwner: isGalleryOwner, uploadPhoto, deletePhoto } = useProfileGallery(profileUserId);

  // Determine which tabs to show
  const showHealthTab = profile.visibility.healthShareConsent && 
    shouldShowField('public', scope);
  
  const showServicesTab = profile.offerings && 
    profile.offerings.some(offering => offering.status === 'published');

  const tabs = [
    { id: 'posts', name: translate('profileTabs.posts', 'Posts') },
    { id: 'media', name: translate('profileTabs.media', 'Media') },
    { id: 'milestones', name: translate('profileTabs.milestones', 'Milestones') },
    { id: 'groups', name: translate('profileTabs.groups', 'Groups') },
    { id: 'events', name: translate('profileTabs.events', 'Events') },
  ];

  if (showHealthTab) {
    tabs.push({ id: 'health', name: translate('profileTabs.health', 'Health') });
  }
  
  if (showServicesTab) {
    tabs.push({ id: 'services', name: translate('profileTabs.services', 'Services') });
  }

  // Always add Insight as the FINAL tab
  tabs.push({ id: 'insight', name: translate('profileTabs.insight', 'Insight') });

  // Icon mapping for tabs
  const getTabIcon = (tabId: string) => {
    switch (tabId) {
      case 'posts': return <MessageSquare className="h-4 w-4" />;
      case 'media': return <Video className="h-4 w-4" />;
      case 'groups': return <Users className="h-4 w-4" />;
      case 'events': return <Calendar className="h-4 w-4" />;
      case 'milestones': return <Trophy className="h-4 w-4" />;
      case 'health': return <Heart className="h-4 w-4" />;
      case 'services': return <Briefcase className="h-4 w-4" />;
      case 'insight': return <Lightbulb className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <SplitBar defaultValue="posts" className="w-full">
      <SplitBarList className="w-full">
        {tabs.map(tab => (
          <SplitBarTrigger key={tab.id} value={tab.id}>
            <span className="flex items-center gap-2">
              {getTabIcon(tab.id)}
              {tab.name}
            </span>
          </SplitBarTrigger>
        ))}
      </SplitBarList>

      {/* Posts Tab */}
      <SplitBarContent value="posts">
        <div className="mt-6">
          <ProfilePostsTab profile={profile} scope={scope} editMode={editMode} onEditAbout={onEditAbout} />
        </div>
      </SplitBarContent>

      {/* Media Tab - with Photo & Video Gallery */}
      <SplitBarContent value="media">
        <div className="mt-6 space-y-8">
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
      </SplitBarContent>

      {/* Milestones Tab */}
      <SplitBarContent value="milestones">
        <div className="mt-6">
          <MilestoneTimeline
            milestones={milestones}
            isOwner={isMilestoneOwner}
            onAdd={(input) => addMilestone.mutate(input)}
            onUpdate={(input) => updateMilestone.mutate(input)}
            onDelete={(id) => deleteMilestone.mutate(id)}
            isAdding={addMilestone.isPending}
          />
        </div>
      </SplitBarContent>

      {/* Groups Tab */}
      <SplitBarContent value="groups">
        <div className="mt-6">
          <ProfileGroupsTab profile={profile} scope={scope} />
        </div>
      </SplitBarContent>

      {/* Events Tab */}
      <SplitBarContent value="events">
        <div className="mt-6">
          <ProfileEventsTab profile={profile} scope={scope} editMode={editMode} isOwnProfile={isOwnProfile} />
        </div>
      </SplitBarContent>

      {/* Health Tab */}
      {showHealthTab && (
        <SplitBarContent value="health">
          <div className="mt-6">
            <ProfileHealthTab profile={profile} scope={scope} editMode={editMode} onEditVisibility={onEditVisibility} />
          </div>
        </SplitBarContent>
      )}

      {/* Services Tab */}
      {showServicesTab && (
        <SplitBarContent value="services">
          <div className="mt-6">
            <ProfileServicesTab profile={profile} scope={scope} editMode={editMode} onEditServices={onEditServices} onEditCompliance={onEditCompliance} />
          </div>
        </SplitBarContent>
      )}

      {/* Insight Tab - Final Tab with all profile info and widgets */}
      <SplitBarContent value="insight">
        <div className="mt-6">
          <ProfileInsightTab 
            profile={profile}
            scope={scope}
            editMode={editMode}
            isOwnProfile={isOwnProfile}
            onSectionClick={onSectionClick}
          />
        </div>
      </SplitBarContent>
    </SplitBar>
  );
}
