import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarPositionStyle } from "@/lib/avatarPosition";
import { 
  MapPin, 
  Calendar, 
  Globe, 
  Heart, 
  Users, 
  FileText,
  CheckCircle2,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Facebook,
  Music2,
  Activity,
  TrendingUp
} from "lucide-react";
import { UserProfile } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { ProfileBadgesGrid } from "@/components/profile/insight/ProfileBadgesGrid";
import { ProfileInterestTags } from "@/components/profile/insight/ProfileInterestTags";
import { ProfileTimeline } from "@/components/profile/insight/ProfileTimeline";
import { SharedConnectionsCard } from "@/components/profile/insight/SharedConnectionsCard";
import { FeaturedContentCarousel } from "@/components/profile/insight/FeaturedContentCarousel";
import { ContextualCTAs } from "@/components/profile/engagement/ContextualCTAs";
import { ViewModeIntelligence } from "@/components/profile/engagement/ViewModeIntelligence";
import { AutopilotSuggestions } from "@/components/profile/AutopilotSuggestions";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface ProfileInsightTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  isOwnProfile?: boolean;
  
  // For ContextualCTAs
  compatibilityScore?: number;
  hasActiveChallenge?: boolean;
  
  // For ViewModeIntelligence
  viewerCompatibility?: number;
  similarProfiles?: Array<{
    id: string;
    name: string;
    avatar: string;
    commonInterests: string[];
    compatibility: number;
  }>;
  profileInsights?: {
    viewsThisWeek: number;
    profileCompleteness: number;
    engagementRate: number;
  };
  
  // For new sections
  badges?: Array<{id: string; name: string; icon: string; description: string; color: string}>;
  interests?: string[];
  milestones?: Array<{date: string; type: 'joined' | 'post' | 'group' | 'event' | 'achievement' | 'live'; description: string}>;
  mutualConnections?: number;
  sharedGroups?: string[];
  featuredContent?: Array<any>;
  
  // Callbacks
  onSectionClick?: (sectionId: string) => void;
}

export function ProfileInsightTab({ 
  profile, 
  scope, 
  editMode,
  isOwnProfile = false,
  compatibilityScore = 0,
  hasActiveChallenge = false,
  viewerCompatibility = 0,
  similarProfiles = [],
  profileInsights,
  badges,
  interests,
  milestones,
  mutualConnections,
  sharedGroups,
  featuredContent,
  onSectionClick
}: ProfileInsightTabProps) {
  // Mock data for recent activity
  const recentActivity = [
    {
      id: '1',
      type: 'post',
      content: 'Just completed my 30-day wellness challenge! 🎉',
      timestamp: '2 hours ago',
      engagement: { likes: 24, comments: 5 }
    },
    {
      id: '2',
      type: 'media',
      title: 'Morning Yoga Flow',
      thumbnail: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=200',
      timestamp: '1 day ago',
      engagement: { views: 342 }
    },
    {
      id: '3',
      type: 'post',
      content: 'Loving this new meditation technique 🧘‍♀️',
      timestamp: '3 days ago',
      engagement: { likes: 18, comments: 3 }
    }
  ];

  const socialNetworks = [
    { name: 'Instagram', icon: Instagram, url: profile.instagram_url, color: 'from-pink-500 to-purple-500' },
    { name: 'X', icon: Twitter, url: profile.x_url, color: 'from-sky-400 to-blue-500' },
    { name: 'LinkedIn', icon: Linkedin, url: profile.linkedin_url, color: 'from-blue-600 to-blue-700' },
    { name: 'YouTube', icon: Youtube, url: profile.youtube_url, color: 'from-red-500 to-red-600' },
    { name: 'Facebook', icon: Facebook, url: profile.facebook_url, color: 'from-blue-500 to-blue-600' },
    { name: 'TikTok', icon: Music2, url: profile.tiktok_url, color: 'from-pink-600 to-rose-600' }
  ].filter(network => network.url);

  const isServiceProvider = profile.offerings && profile.offerings.length > 0;
  const profileType = profile.professionalCredentials?.isLiveStreamingEnabled ? 'coach' : 'user';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content - Left Side (2/3 width) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Profile Summary Card */}
        <Card className="rounded-2xl shadow-sm border-muted/40 bg-gradient-to-br from-white to-violet-50/30 dark:from-slate-900 dark:to-violet-950/20">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <Avatar className="h-28 w-28 ring-4 ring-white dark:ring-slate-800 shadow-lg">
                <AvatarImage src={profile.avatarUrl} alt={profile.name || 'User'} style={avatarPositionStyle(profile.avatarOffsetX, profile.avatarOffsetY)} />
                <AvatarFallback className="text-3xl font-semibold bg-gradient-to-br from-violet-500 to-sky-500 text-white">
                  {profile.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-foreground">{profile.name || 'Anonymous'}</h2>
                    {profile.professionalCredentials?.isLiveStreamingEnabled && (
                      <Badge className="bg-gradient-to-r from-blue-500 to-sky-500 text-white border-0 rounded-full px-3 py-1">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        {t('screens.profile.pro')}
                      </Badge>
                    )}
                  </div>
                  {profile.handle && (
                    <p className="text-muted-foreground text-sm">@{profile.handle}</p>
                  )}
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-foreground/80 leading-relaxed text-sm">
                    {profile.bio}
                  </p>
                )}

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {profile.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.languages && profile.languages.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-4 w-4" />
                      <span>{profile.languages.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interests & Expertise Tags - Integrated into profile card */}
            <div className="mt-6 pt-6 border-t border-muted/20">
              <ProfileInterestTags interests={interests} />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 border-violet-200/50 dark:border-violet-800/30">
            <CardContent className="p-6 text-center">
              <FileText className="h-8 w-8 mx-auto mb-3 text-violet-600 dark:text-violet-400" />
              <div className="text-3xl font-bold text-foreground mb-1">{profile.stats?.posts || 0}</div>
              <div className="text-xs text-muted-foreground">{t('screens.profile.posts')}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20 border-sky-200/50 dark:border-sky-800/30">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-3 text-sky-600 dark:text-sky-400" />
              <div className="text-3xl font-bold text-foreground mb-1">{profile.stats?.followers || 0}</div>
              <div className="text-xs text-muted-foreground">{t('screens.profile.followers')}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20 border-rose-200/50 dark:border-rose-800/30">
            <CardContent className="p-6 text-center">
              <Heart className="h-8 w-8 mx-auto mb-3 text-rose-600 dark:text-rose-400" />
              <div className="text-3xl font-bold text-foreground mb-1">{profile.stats?.following || 0}</div>
              <div className="text-xs text-muted-foreground">{t('screens.profile.following')}</div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50 dark:border-amber-800/30">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-3 text-amber-600 dark:text-amber-400" />
              <div className="text-3xl font-bold text-foreground mb-1">{profile.stats?.groupsJoined || 0}</div>
              <div className="text-xs text-muted-foreground">{t('screens.profile.groups')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Badges & Achievements */}
        <ProfileBadgesGrid badges={badges} />

        {/* Featured Content Carousel */}
        <FeaturedContentCarousel content={featuredContent} />

        {/* Community Journey Timeline */}
        <ProfileTimeline milestones={milestones} />
      </div>

      {/* Right Sidebar (1/3 width) */}
      <div className="space-y-6">
        {/* Edit Mode: Autopilot Suggestions */}
        {editMode && (
          <AutopilotSuggestions 
            type="profile-section"
            onSuggestionClick={(suggestion) => {
              console.log('Autopilot suggestion clicked:', suggestion);
            }}
          />
        )}

        {/* View Mode (Other's Profile): Contextual CTAs */}
        {!editMode && !isOwnProfile && (
          <>
            <ContextualCTAs
              isOwnProfile={false}
              profileType={profileType}
              hasActiveChallenge={hasActiveChallenge}
              isServiceProvider={isServiceProvider}
              compatibilityScore={compatibilityScore}
            />
            
            {/* Shared Connections Card */}
            {compatibilityScore >= 50 && (
              <SharedConnectionsCard
                mutualConnections={mutualConnections}
                sharedGroups={sharedGroups}
              />
            )}
          </>
        )}

        {/* Health Snapshot */}
        {profile.vitanaIndex && (
          <Card className="rounded-2xl shadow-sm border-muted/40 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t('screens.profile.healthSnapshot')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-br from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent mb-2">
                  {profile.vitanaIndex}
                </div>
                <p className="text-xs text-muted-foreground">{t('screens.profile.vitanaIndex2')}</p>
              </div>
              {profile.vitanaPercentile && (
                <Badge className="w-full justify-center bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 rounded-full py-2">
                  <TrendingUp className="h-3 w-3 mr-1.5" />{t('screens.profile.topValue0Wellness', { value0: 100 - profile.vitanaPercentile })}
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        {/* Networks & Links */}
        {socialNetworks.length > 0 && (
          <Card className="rounded-2xl shadow-sm border-muted/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t('screens.profile.connectedNetworks')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {socialNetworks.map((network) => (
                  <Button
                    key={network.name}
                    variant="outline"
                    size="sm"
                    className="h-auto p-3 flex flex-col items-center gap-2 rounded-xl hover:scale-105 transition-transform"
                    onClick={() => network.url && window.open(network.url, '_blank')}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${network.color}`}>
                      <network.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium">{network.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Highlights */}
        <Card className="rounded-2xl shadow-sm border-muted/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t('screens.profile.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="p-3 rounded-xl bg-gradient-to-br from-white to-violet-50/30 dark:from-slate-800 dark:to-violet-950/20 border border-muted/30 hover:shadow-md transition-shadow cursor-pointer"
              >
                {activity.type === 'post' ? (
                  <div>
                    <p className="text-sm text-foreground/90 line-clamp-2 mb-2">
                      {activity.content}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{activity.timestamp}</span>
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {activity.engagement.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          💬 {activity.engagement.comments}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <img
                      src={activity.thumbnail}
                      alt={activity.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1 mb-1">
                        {activity.title}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{activity.timestamp}</span>
                        <span>{t('screens.profile.viewsViews', { views: activity.engagement.views })}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ViewModeIntelligence - Profile Analytics or Recommendations */}
        <ViewModeIntelligence
          isOwnProfile={isOwnProfile}
          viewerCompatibility={viewerCompatibility}
          similarProfiles={similarProfiles}
          profileInsights={profileInsights}
        />
      </div>
    </div>
  );
}
