import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from "@/components/layout/spotlight/Panel";
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfile } from "@/context/ProfileProvider";
import { useAuth } from "@/context/AuthProvider";
import { ProfileStats } from "@/components/profile/shared/ProfileStats";
import { VitanaImpactPanel } from "@/components/profile/VitanaImpactPanel";
import { AchievementsBanner } from "@/components/profile/AchievementsBanner";
import { SuccessStoryCarousel } from "@/components/profile/community/SuccessStoryCarousel";
import { ProfileIdCardFront } from "@/components/profile/shared/ProfileIdCardFront";
import { ProfileIdCardBack } from "@/components/profile/shared/ProfileIdCardBack";
import { useProfileTheme } from "@/hooks/useProfileTheme";
import { useVitanaIndex } from "@/hooks/useVitanaIndex";
import { t } from '@/lib/i18n-toast';

// Dummy data for the profile stats
const dummyProfileStats = {
  posts: 42,
  followers: 1234,
  following: 567,
  mediaUploads: 89,
  groupsJoined: 12
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-lg font-semibold text-foreground mb-4">{children}</h3>
  );
}

export default function Profile() {
  const { profile, loading } = useProfile();
  const { user } = useAuth();
  const location = useLocation();
  const { themeConfig, cycleTheme } = useProfileTheme(user?.id);
  const { index: liveVitanaIndex } = useVitanaIndex();
  const liveVitanaScore = liveVitanaIndex?.total ?? 0;
  const spotlight = useSpotlightEnabled();

  // Scroll to social connections section if hash is present
  useEffect(() => {
    if (location.hash === '#social-connections') {
      setTimeout(() => {
        const element = document.getElementById('social-connections-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-300');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 2000);
        }
      }, 100);
    }
  }, [location.hash]);

  // Create a mock UserProfile object that matches ProfileStats component expectations
  const mockUserProfile = {
    id: user?.id || "",
    user_id: user?.id,
    name: profile.displayName,
    handle: profile.handle || "@user",
    avatarUrl: profile.avatar,
    avatarOffsetX: profile.avatarOffsetX,
    avatarOffsetY: profile.avatarOffsetY,
    coverUrl: profile.coverUrl,
    roles: ["community" as const],
    membershipTier: null,
    bio: profile.bio,
    links: profile.links || [],
    languages: profile.languages || [],
    location: profile.location || "",
    stats: dummyProfileStats,
    vitanaIndex: liveVitanaScore,
    // vitanaPercentile stays unset — there is no community ranking for the Index
    // (VTID-04470) — score/999 is not a percentile.
    longevityArchetype: profile.longevityArchetype || "",
    offerings: [],
    // Social URLs from ProfileProvider context
    linkedin_url: profile.linkedin_url,
    instagram_url: profile.instagram_url,
    facebook_url: profile.facebook_url,
    x_url: profile.x_url,
    youtube_url: profile.youtube_url,
    tiktok_url: profile.tiktok_url,
    compliance: {
      isProfessional: false,
      licenseVerified: false
    },
    visibility: {
      about: "public" as const,
      links: "public" as const,
      location: "public" as const,
      showcase: "public" as const,
      indexPublic: true,
      healthShareConsent: true
    }
  };

  const handleEdit = () => {
    // Navigate to profile settings or open edit modal
    console.log("Edit profile");
  };

  if (loading) {
    return (
      <AppLayout>
        <SEO
          title={t('screens.profile.myProfile')}
          description="View and manage your personal profile"
        />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">{t('screens.profile.loadingProfile')}</div>
        </div>
      </AppLayout>
    );
  }

  const content = (
    <>
      {/* Premium gradient background */}
      <div className="min-h-screen bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to">
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="w-full max-w-6xl">
            <h1 className="sr-only">{t('screens.profile.userProfileVitanaIdCard')}</h1>

            {/* Two ID Cards Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Front ID Card - Left */}
              <ProfileIdCardFront 
                profile={mockUserProfile} 
                scope="owner" 
                editMode={true} 
                onEdit={handleEdit}
                themeConfig={themeConfig}
                cycleTheme={cycleTheme}
              />
              
              {/* Back ID Card - Right */}
              <ProfileIdCardBack profile={mockUserProfile} themeConfig={themeConfig} />
            </div>

            {/* Achievements Banner */}
            <div className="mb-8">
              <AchievementsBanner />
            </div>

            {/* Unified Bottom Navigation Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-8 rounded-full bg-card/60 backdrop-blur-xl border border-border/40 p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-sys-vitana-accent data-[state=active]:to-pill-nutrition-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
                >{t('screens.profile.posts')}
                </TabsTrigger>
                <TabsTrigger 
                  value="highlights" 
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-pill-mental-accent data-[state=active]:to-pill-sleep-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
                >{t('screens.profile.media')}
                </TabsTrigger>
                <TabsTrigger 
                  value="connections" 
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-domain-community-accent data-[state=active]:to-pill-mental-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
                >{t('screens.profile.groups')}
                </TabsTrigger>
                <TabsTrigger 
                  value="activity" 
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-pill-hydration-accent data-[state=active]:to-pill-exercise-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
                >{t('screens.profile.events')}
                </TabsTrigger>
                <TabsTrigger 
                  value="health" 
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-pill-nutrition-accent data-[state=active]:to-pill-hydration-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
                >{t('screens.profile.health')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 gap-6">
                  {/* Vitana Impact Panel */}
                  <VitanaImpactPanel
                    vitanaIndex={liveVitanaScore || mockUserProfile.vitanaIndex || 0}
                    communityStats={{
                      posts: dummyProfileStats.posts,
                      helpedUsers: 12,
                      featuredStories: 3,
                      influenceScore: 85
                    }}
                  />

                  <Panel className="rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                    <PanelHeader>
                      <PanelTitle>{t('screens.profile.motivations')}</PanelTitle>
                    </PanelHeader>
                    <PanelContent className="space-y-4">
                      {[
                        { label: 'Price', value: 60 },
                        { label: 'Comfort', value: 72 },
                        { label: 'Convenience', value: 88 },
                        { label: 'Speed', value: 54 },
                        { label: 'Loyalty/Miles', value: 42 },
                      ].map((m) => (
                        <div key={m.label}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{m.label}</span>
                            <span className="font-medium">{m.value}%</span>
                          </div>
                          <Progress value={m.value} />
                        </div>
                      ))}
                    </PanelContent>
                  </Panel>

                  <Panel className="rounded-xl shadow-sm">
                    <PanelHeader>
                      <PanelTitle>{t('screens.profile.personality')}</PanelTitle>
                    </PanelHeader>
                    <PanelContent className="space-y-4">
                      {[
                        { left: 'Introvert', right: 'Extrovert', value: 35 },
                        { left: 'Analytical', right: 'Creative', value: 75 },
                        { left: 'Loyal', right: 'Fickle', value: 20 },
                        { left: 'Passive', right: 'Active', value: 80 },
                      ].map((row, idx) => (
                        <div key={idx}>
                          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>{row.left}</span>
                            <span>{row.right}</span>
                          </div>
                          <Progress value={row.value} />
                        </div>
                      ))}
                    </PanelContent>
                  </Panel>

                  <Panel className="rounded-xl shadow-sm">
                    <PanelHeader>
                      <PanelTitle>{t('screens.profile.frustrations')}</PanelTitle>
                    </PanelHeader>
                    <PanelContent>
                      <ul className="list-disc ps-5 text-sm text-muted-foreground space-y-2">
                        <li>{t('screens.profile.tooMuchTimeSpentPlanningWhen')}</li>
                        <li>{t('screens.profile.tooManyAppsForOnePurpose')}</li>
                        <li>{t('screens.profile.prefersSimpleFlowsOverComplexSettings')}</li>
                      </ul>
                    </PanelContent>
                  </Panel>

                  <Panel className="rounded-xl shadow-sm">
                    <PanelHeader>
                      <PanelTitle>{t('screens.profile.goals')}</PanelTitle>
                    </PanelHeader>
                    <PanelContent>
                      <ul className="list-disc ps-5 text-sm text-muted-foreground space-y-2">
                        <li>{t('screens.profile.spendLessTimeBookingOrganizing')}</li>
                        <li>{t('screens.profile.keepHealthyHabitsWhileTraveling')}</li>
                      </ul>
                    </PanelContent>
                  </Panel>

                  <Panel className="rounded-xl shadow-sm">
                    <PanelHeader>
                      <PanelTitle>{t('screens.profile.favouriteBrands')}</PanelTitle>
                      <PanelDescription>{t('screens.profile.sampleInterests')}</PanelDescription>
                    </PanelHeader>
                    <PanelContent className="flex flex-wrap gap-2">
                      {['adidas', 'nike', 'netflix', 'airbnb', 'zara'].map((b) => (
                        <Badge key={b} variant="outline" className="capitalize">{b}</Badge>
                      ))}
                    </PanelContent>
                  </Panel>

                  {/* Success Story Carousel */}
                  <div>
                    <SuccessStoryCarousel />
                  </div>
                </div>
              </TabsContent>

            <TabsContent value="highlights">
              <Panel className="rounded-xl shadow-sm">
                <PanelHeader>
                  <PanelTitle>{t('screens.profile.highlights')}</PanelTitle>
                  <PanelDescription>{t('screens.profile.achievementsFeaturedContentSpotlightStories')}</PanelDescription>
                </PanelHeader>
                <PanelContent className="text-sm text-muted-foreground">
                  {t('screens.profile.comingSoonBadgesFeaturedPhotosvideosSpotlight')}
                </PanelContent>
              </Panel>
            </TabsContent>

            <TabsContent value="connections">
              <Panel className="rounded-xl shadow-sm">
                <PanelHeader>
                  <PanelTitle>{t('screens.profile.connections')}</PanelTitle>
                  <PanelDescription>{t('screens.profile.friendsFollowersRequests')}</PanelDescription>
                </PanelHeader>
                <PanelContent className="text-sm text-muted-foreground">
                  {t('screens.profile.mutualConnections12FeaturedConnectionsShown')}
                </PanelContent>
              </Panel>
            </TabsContent>

            <TabsContent value="activity">
              <Panel className="rounded-xl shadow-sm">
                <PanelHeader>
                  <PanelTitle>{t('screens.profile.recentActivity')}</PanelTitle>
                  <PanelDescription>{t('screens.profile.postsCommentsEvents')}</PanelDescription>
                </PanelHeader>
                <PanelContent className="text-sm text-muted-foreground">
                  {t('screens.profile.recentCommunityActionsWillAppearHere')}
                </PanelContent>
              </Panel>
            </TabsContent>

            <TabsContent value="health">
              <Panel className="rounded-xl shadow-sm">
                <PanelHeader>
                  <PanelTitle>{t('screens.profile.healthSnapshot')}</PanelTitle>
                  <PanelDescription>{t('screens.profile.miniDashboardHealthIndexPillars')}</PanelDescription>
                </PanelHeader>
                <PanelContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['Nutrition','Hydration','Sleep','Exercise','Mental Health'].map((p) => (
                      <div key={p} className="rounded-xl border p-4 shadow-sm">
                        <div className="text-sm font-medium">{p}</div>
                        <Progress value={Math.floor(50 + Math.random() * 40)} className="mt-2" />
                      </div>
                    ))}
                  </div>
                </PanelContent>
              </Panel>
            </TabsContent>

            <TabsContent value="privacy">
              <Panel className="rounded-xl shadow-sm">
                <PanelHeader>
                  <PanelTitle>{t('screens.profile.privacyView')}</PanelTitle>
                  <PanelDescription>{t('screens.profile.seeHowOthersViewYourProfile')}</PanelDescription>
                </PanelHeader>
                <PanelContent className="text-sm text-muted-foreground">
                  {t('screens.profile.thisPreviewModeWillReflectYour')}
                </PanelContent>
              </Panel>
            </TabsContent>
          </Tabs>
        </div>
      </section>
      </div>
    </>
  );

  return (
    <AppLayout>
      <SEO
        title={t('screens.profile.myProfile')}
        description="View and manage your personal profile"
      />

      {spotlight ? <ScreenFrame archetype="detail">{content}</ScreenFrame> : content}
    </AppLayout>
  );
}
