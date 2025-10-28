import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { ProfilePostsTab } from "./tabs/ProfilePostsTab";
import { ProfileMediaTab } from "./tabs/ProfileMediaTab";
import { ProfileGroupsTab } from "./tabs/ProfileGroupsTab";
import { ProfileEventsTab } from "./tabs/ProfileEventsTab";
import { ProfileHealthTab } from "./tabs/ProfileHealthTab";
import { ProfileServicesTab } from "./tabs/ProfileServicesTab";
import { CommunityImpactWidget } from "../community/CommunityImpactWidget";
import { SuccessStoryCarousel } from "../community/SuccessStoryCarousel";
import { CompatibilityIndicator } from "../engagement/CompatibilityIndicator";
import { ProfessionalCTAs } from "./ProfessionalCTAs";
import { ProfileProgressCard } from "../editor/ProfileProgressCard";
import { shouldShowField } from "@/lib/profileScope";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity } from "lucide-react";

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

  // Always add Insight as the FINAL tab
  tabs.push({ id: 'insight', name: 'Insight' });

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
          <ProfilePostsTab profile={profile} scope={scope} editMode={editMode} onEditAbout={onEditAbout} />
        </div>
      </SplitBarContent>

      {/* Media Tab */}
      <SplitBarContent value="media">
        <div className="mt-6">
          <ProfileMediaTab profile={profile} scope={scope} editMode={editMode} />
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Information (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Identity Card */}
              <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-xl border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="relative">
                    <img 
                      src={profile.avatarUrl} 
                      alt={profile.name}
                      className="w-24 h-24 rounded-2xl object-cover ring-2 ring-white/50 shadow-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1">{profile.name}</h2>
                    <p className="text-muted-foreground mb-2">@{profile.handle}</p>
                    {profile.roles && profile.roles.length > 0 && (
                      <Badge variant="secondary" className="mb-3">
                        {profile.roles[0]}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {profile.bio && (
                  <p className="text-gray-800 dark:text-gray-100 mb-4 leading-[1.75]">{profile.bio}</p>
                )}
              </Card>

              {/* Quick Stats */}
              <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-xl border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-6">
                <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-600">{profile.stats.posts}</div>
                    <div className="text-sm text-muted-foreground">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{profile.stats.followers}</div>
                    <div className="text-sm text-muted-foreground">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{profile.stats.following}</div>
                    <div className="text-sm text-muted-foreground">Following</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{profile.stats.groupsJoined || 0}</div>
                    <div className="text-sm text-muted-foreground">Groups</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Widgets (1/3 width) */}
            <div className="lg:col-span-1 space-y-6">
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
                  
                  {/* Health Snapshot Mini Widget */}
                  {profile.vitanaIndex && (
                    <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-xl border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.05)] p-5">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-600" />
                        Health Snapshot
                      </h4>
                      <div className="text-center mb-3">
                        <div className="text-4xl font-bold bg-gradient-to-br from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                          {profile.vitanaIndex}
                        </div>
                        {profile.vitanaPercentile && (
                          <Badge className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
                            Top {100 - profile.vitanaPercentile}%
                          </Badge>
                        )}
                      </div>
                      <Progress value={profile.vitanaIndex / 10} className="h-2 mb-2" />
                    </Card>
                  )}
                  
                  <SuccessStoryCarousel />
                </>
              )}
            </div>
          </div>
        </div>
      </SplitBarContent>
    </SplitBar>
  );
}
