import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { SplitScreen } from "@/components/ui/split-screen";
import { ProfilePostsTab } from "./tabs/ProfilePostsTab";
import { ProfileMediaTab } from "./tabs/ProfileMediaTab";
import { ProfileGroupsTab } from "./tabs/ProfileGroupsTab";
import { ProfileEventsTab } from "./tabs/ProfileEventsTab";
import { ProfileHealthTab } from "./tabs/ProfileHealthTab";
import { ProfileServicesTab } from "./tabs/ProfileServicesTab";
import { ProfessionalCredentialsStrip } from "./ProfessionalCredentialsStrip";
import { CommunityImpactWidget } from "../community/CommunityImpactWidget";
import { SuccessStoryCarousel } from "../community/SuccessStoryCarousel";
import { CompatibilityIndicator } from "../engagement/CompatibilityIndicator";
import { ContextualCTAs } from "../engagement/ContextualCTAs";
import { ProfessionalCTAs } from "./ProfessionalCTAs";
import { ProfileProgressCard } from "../editor/ProfileProgressCard";

interface ProfileSplitNavigationProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  isOwnProfile?: boolean;
  activeTab: string;
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
  activeTab,
  onEditAbout,
  onEditServices,
  onEditCompliance,
  onEditVisibility,
  onSectionClick,
  onGoLive,
  onUploadCredentials,
}: ProfileSplitNavigationProps) {

  const renderLeftPanel = () => {
    switch (activeTab) {
      case 'posts':
        return <ProfilePostsTab profile={profile} scope={scope} editMode={editMode} onEditAbout={onEditAbout} />;
      case 'media':
        return <ProfileMediaTab profile={profile} scope={scope} editMode={editMode} />;
      case 'groups':
        return <ProfileGroupsTab profile={profile} scope={scope} />;
      case 'events':
        return <ProfileEventsTab profile={profile} scope={scope} editMode={editMode} isOwnProfile={isOwnProfile} />;
      case 'health':
        return <ProfileHealthTab profile={profile} scope={scope} editMode={editMode} onEditVisibility={onEditVisibility} />;
      case 'services':
        return <ProfileServicesTab profile={profile} scope={scope} editMode={editMode} onEditServices={onEditServices} onEditCompliance={onEditCompliance} />;
      default:
        return <ProfilePostsTab profile={profile} scope={scope} editMode={editMode} onEditAbout={onEditAbout} />;
    }
  };

  const renderRightPanel = () => {
    return (
      <div className="space-y-6 p-6">
        {/* Professional Credentials */}
        <ProfessionalCredentialsStrip 
          credentials={profile.professionalCredentials}
          isOwnProfile={isOwnProfile}
          onUploadCredentials={onUploadCredentials}
        />

        {/* Community Impact and Success Stories */}
        <div className="space-y-6">
          <CommunityImpactWidget 
            vitanaIndex={profile.vitanaIndex ?? 0}
            communityStats={{
              posts: profile.stats.posts,
              helpedUsers: 12,
              featuredStories: 3,
              influenceScore: 85
            }}
          />
          <SuccessStoryCarousel />
        </div>

        {/* Engagement Section */}
        {editMode ? (
          <>
            <ProfileProgressCard
              profile={profile}
              onSectionClick={onSectionClick || (() => {})}
            />
            <ProfessionalCTAs 
              credentials={profile.professionalCredentials}
              isOwnProfile={true}
              onGoLive={onGoLive || (() => {})}
              onJoinLive={() => console.log('Joining live session')}
              onBookSession={() => console.log('Booking session')}
              onMessage={() => console.log('Sending message')}
            />
          </>
        ) : (
          <>
            <CompatibilityIndicator 
              isOwnProfile={isOwnProfile}
              mutualConnections={5}
            />
            <ProfessionalCTAs 
              credentials={profile.professionalCredentials}
              isOwnProfile={isOwnProfile}
              onGoLive={onGoLive || (() => {})}
              onJoinLive={() => console.log('Joining live session')}
              onBookSession={() => console.log('Booking session')}
              onMessage={() => console.log('Sending message')}
            />
            <ContextualCTAs 
              isOwnProfile={isOwnProfile}
              profileType="coach"
              hasActiveChallenge={true}
              isServiceProvider={true}
              compatibilityScore={92}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <SplitScreen
      leftPanel={renderLeftPanel()}
      rightPanel={renderRightPanel()}
      defaultLeftSize={60}
      className="min-h-[800px]"
    />
  );
}
