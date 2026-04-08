import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    vitanaIndex: 750,
    vitanaPercentile: 85,
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
          title="My Profile"
          description="View and manage your personal profile"
        />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading profile...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO
        title="My Profile"
        description="View and manage your personal profile"
      />

      {/* Premium gradient background */}
      <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-blue-50/20 to-pink-50/30 dark:from-purple-950/10 dark:via-blue-950/10 dark:to-pink-950/10">
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="w-full max-w-6xl">
            <h1 className="sr-only">User Profile - Vitana ID Card</h1>

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
              <TabsList className="mb-8 rounded-full bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/40 dark:border-gray-800/40 p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(var(--sys-vitana-accent))] data-[state=active]:to-[hsl(var(--pill-nutrition-accent))] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  Posts
                </TabsTrigger>
                <TabsTrigger 
                  value="highlights" 
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(var(--pill-mental-accent))] data-[state=active]:to-[hsl(var(--pill-sleep-accent))] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  Media
                </TabsTrigger>
                <TabsTrigger 
                  value="connections" 
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(var(--domain-community-accent))] data-[state=active]:to-[hsl(var(--pill-mental-accent))] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  Groups
                </TabsTrigger>
                <TabsTrigger 
                  value="activity" 
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(var(--pill-hydration-accent))] data-[state=active]:to-[hsl(var(--pill-exercise-accent))] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  Events
                </TabsTrigger>
                <TabsTrigger 
                  value="health" 
                  className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-[hsl(var(--pill-nutrition-accent))] data-[state=active]:to-[hsl(var(--pill-hydration-accent))] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  Health
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 gap-6">
                  {/* Vitana Impact Panel */}
                  <VitanaImpactPanel 
                    vitanaIndex={mockUserProfile.vitanaIndex || 750}
                    communityStats={{
                      posts: dummyProfileStats.posts,
                      helpedUsers: 12,
                      featuredStories: 3,
                      influenceScore: 85
                    }}
                  />

                  <Card className="rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                    <CardHeader>
                      <CardTitle>Motivations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl shadow-sm">
                    <CardHeader>
                      <CardTitle>Personality</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl shadow-sm">
                    <CardHeader>
                      <CardTitle>Frustrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                        <li>Too much time spent planning when busy</li>
                        <li>Too many apps for one purpose</li>
                        <li>Prefers simple flows over complex settings</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl shadow-sm">
                    <CardHeader>
                      <CardTitle>Goals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                        <li>Spend less time booking and organizing</li>
                        <li>Keep healthy habits while traveling</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl shadow-sm">
                    <CardHeader>
                      <CardTitle>Favourite Brands</CardTitle>
                      <CardDescription>Sample interests</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {['adidas', 'nike', 'netflix', 'airbnb', 'zara'].map((b) => (
                        <Badge key={b} variant="outline" className="capitalize">{b}</Badge>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Success Story Carousel */}
                  <div>
                    <SuccessStoryCarousel />
                  </div>
                </div>
              </TabsContent>

            <TabsContent value="highlights">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle>Highlights</CardTitle>
                  <CardDescription>Achievements, featured content, spotlight stories</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Coming soon: badges, featured photos/videos, and spotlight stories curated by the user.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="connections">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle>Connections</CardTitle>
                  <CardDescription>Friends, followers, and requests</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Mutual connections: 12 • Featured connections shown on Overview.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Posts, comments, events</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Recent community actions will appear here.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle>Health Snapshot</CardTitle>
                  <CardDescription>Mini dashboard of Health Index + pillars</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['Nutrition','Hydration','Sleep','Exercise','Mental Health'].map((p) => (
                      <div key={p} className="rounded-xl border p-4 shadow-sm">
                        <div className="text-sm font-medium">{p}</div>
                        <Progress value={Math.floor(50 + Math.random() * 40)} className="mt-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle>Privacy View</CardTitle>
                  <CardDescription>See how others view your profile</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  This preview mode will reflect your current privacy settings.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>
      </div>
    </AppLayout>
  );
}
