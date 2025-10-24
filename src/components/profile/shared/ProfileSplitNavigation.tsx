import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
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
import { shouldShowField } from "@/lib/profileScope";

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

  // Determine which tabs to show
  const showHealthTab = profile.visibility.healthShareConsent && 
    shouldShowField('public', scope);
  
  const showServicesTab = profile.offerings && 
    profile.offerings.some(offering => offering.status === 'published');

  const tabs = [
    { id: 'posts', name: 'Posts' },
    { id: 'media', name: 'Media' },
    { id: 'groups', name: 'Groups' },
    { id: 'events', name: 'Events' },
  ];

  if (showHealthTab) {
    tabs.push({ id: 'health', name: 'Health' });
  }
  
  if (showServicesTab) {
    tabs.push({ id: 'services', name: 'Services' });
  }

  return (
    <SplitBar defaultValue="posts" className="w-full">
      <SplitBarList className={`grid w-full grid-cols-${tabs.length}`}>
        {tabs.map(tab => (
          <SplitBarTrigger key={tab.id} value={tab.id}>
            {tab.name}
          </SplitBarTrigger>
        ))}
      </SplitBarList>

      {/* Posts Tab */}
      <SplitBarContent value="posts">
        <div className="mt-6">
          <div className="grid grid-cols-12 gap-x-10 gap-y-8">
            <div className="col-span-8">
              <ProfilePostsTab profile={profile} scope={scope} editMode={editMode} onEditAbout={onEditAbout} />
            </div>
            <div className="col-span-4 space-y-6">
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
                  <CompatibilityIndicator 
                    isOwnProfile={isOwnProfile}
                    mutualConnections={5}
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
          </div>
        </div>
      </SplitBarContent>

      {/* Media Tab */}
      <SplitBarContent value="media">
        <div className="mt-6">
          <div className="grid grid-cols-12 gap-x-10 gap-y-8">
            <div className="col-span-8">
              <ProfileMediaTab profile={profile} scope={scope} editMode={editMode} />
            </div>
            <div className="col-span-4 space-y-6">
              <ProfessionalCredentialsStrip 
                credentials={profile.professionalCredentials}
                isOwnProfile={isOwnProfile}
                onUploadCredentials={onUploadCredentials}
              />
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
          </div>
        </div>
      </SplitBarContent>

      {/* Groups Tab */}
      <SplitBarContent value="groups">
        <div className="mt-6">
          <div className="grid grid-cols-12 gap-x-10 gap-y-6">
            <div className="col-span-8">
              <ProfileGroupsTab profile={profile} scope={scope} />
            </div>
            <div className="col-span-4 space-y-6">
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
                  <CommunityImpactWidget 
                    vitanaIndex={profile.vitanaIndex ?? 0}
                    communityStats={{
                      posts: profile.stats.posts,
                      helpedUsers: 12,
                      featuredStories: 3,
                      influenceScore: 85
                    }}
                  />
                  <CompatibilityIndicator 
                    isOwnProfile={isOwnProfile}
                    mutualConnections={5}
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
          </div>
        </div>
      </SplitBarContent>

      {/* Events Tab */}
      <SplitBarContent value="events">
        <div className="mt-6">
          <div className="grid grid-cols-12 gap-x-10 gap-y-8">
            <div className="col-span-8">
              <ProfileEventsTab profile={profile} scope={scope} editMode={editMode} isOwnProfile={isOwnProfile} />
            </div>
            <div className="col-span-4 space-y-6">
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
          </div>
        </div>
      </SplitBarContent>

      {/* Health Tab */}
      {showHealthTab && (
        <SplitBarContent value="health">
          <div className="mt-6">
            <div className="grid grid-cols-12 gap-x-10 gap-y-8">
              <div className="col-span-8">
                <ProfileHealthTab profile={profile} scope={scope} editMode={editMode} onEditVisibility={onEditVisibility} />
              </div>
              <div className="col-span-4 space-y-6">
                <ProfessionalCredentialsStrip 
                  credentials={profile.professionalCredentials}
                  isOwnProfile={isOwnProfile}
                  onUploadCredentials={onUploadCredentials}
                />
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
            </div>
          </div>
        </SplitBarContent>
      )}

      {/* Services Tab */}
      {showServicesTab && (
        <SplitBarContent value="services">
          <div className="mt-6">
            <div className="grid grid-cols-12 gap-x-10 gap-y-8">
              <div className="col-span-8">
                <ProfileServicesTab profile={profile} scope={scope} editMode={editMode} onEditServices={onEditServices} onEditCompliance={onEditCompliance} />
              </div>
              <div className="col-span-4 space-y-6">
                <ProfessionalCredentialsStrip 
                  credentials={profile.professionalCredentials}
                  isOwnProfile={isOwnProfile}
                  onUploadCredentials={onUploadCredentials}
                />
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
                    <ProfessionalCTAs 
                      credentials={profile.professionalCredentials}
                      isOwnProfile={isOwnProfile}
                      onGoLive={onGoLive || (() => {})}
                      onJoinLive={() => console.log('Joining live session')}
                      onBookSession={() => console.log('Booking session')}
                      onMessage={() => console.log('Sending message')}
                    />
                    <CompatibilityIndicator 
                      isOwnProfile={isOwnProfile}
                      mutualConnections={5}
                    />
                    <SuccessStoryCarousel />
                  </>
                )}
              </div>
            </div>
          </div>
        </SplitBarContent>
      )}
    </SplitBar>
  );
}
