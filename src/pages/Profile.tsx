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
import { ProfileStats } from "@/components/profile/shared/ProfileStats";
import { VitanaImpactPanel } from "@/components/profile/VitanaImpactPanel";
import { AchievementsBanner } from "@/components/profile/AchievementsBanner";
import { SuccessStoryCarousel } from "@/components/profile/community/SuccessStoryCarousel";
import { Share2, QrCode, Copy, Edit3, Star, TrendingUp } from "lucide-react";

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
  const location = useLocation();

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
    id: "1",
    name: profile.displayName,
    handle: profile.handle || "@user",
    avatarUrl: profile.avatar,
    coverUrl: profile.coverUrl,
    roles: ["community" as const],
    membershipTier: null,
    bio: profile.bio,
    links: [],
    languages: [],
    location: "",
    stats: dummyProfileStats,
    vitanaIndex: 750,
    vitanaPercentile: 85,
    longevityArchetype: "The Mindful Mover",
    offerings: [],
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

            {/* Premium Vitana ID Card Header */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))]/10 via-transparent to-[hsl(var(--pill-mental-accent))]/10 rounded-3xl blur-3xl" />
              
              <div className="relative rounded-3xl bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-900/90 dark:via-gray-900/70 dark:to-gray-900/50 backdrop-blur-2xl border border-white/40 dark:border-gray-800/40 p-10 shadow-[0_20px_60px_rgba(0,0,0,0.08),0_8px_20px_rgba(0,0,0,0.04)]">
                {/* Decorative corner accents */}
                <div className="absolute top-0 left-0 w-20 h-20 rounded-tl-3xl border-t-2 border-l-2 border-[hsl(var(--sys-vitana-accent))]/30" />
                <div className="absolute top-0 right-0 w-20 h-20 rounded-tr-3xl border-t-2 border-r-2 border-[hsl(var(--pill-mental-accent))]/30" />
                <div className="absolute bottom-0 left-0 w-20 h-20 rounded-bl-3xl border-b-2 border-l-2 border-[hsl(var(--pill-nutrition-accent))]/30" />
                <div className="absolute bottom-0 right-0 w-20 h-20 rounded-br-3xl border-b-2 border-r-2 border-[hsl(var(--pill-hydration-accent))]/30" />

                <div className="flex flex-col lg:flex-row items-center gap-8">
                  {/* Avatar Section with Glowing Ring */}
                  <div className="relative flex-shrink-0">
                    {/* Multi-layer glow */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/30 to-[hsl(var(--pill-nutrition-accent))]/30 blur-3xl animate-pulse" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[hsl(var(--pill-mental-accent))]/20 to-[hsl(var(--pill-hydration-accent))]/20 blur-2xl" />
                    
                    <div className="relative">
                      <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))] via-[hsl(var(--pill-mental-accent))] to-[hsl(var(--pill-nutrition-accent))] opacity-20 blur-xl" />
                      <div className="relative rounded-full p-1 bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))] via-[hsl(var(--pill-mental-accent))] to-[hsl(var(--pill-nutrition-accent))] shadow-2xl">
                        <Avatar className="relative h-40 w-40 border-4 border-white dark:border-gray-900 shadow-2xl">
                          <AvatarImage src={profile.avatar || "/placeholder.svg"} alt="User avatar" loading="lazy" />
                          <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-secondary text-white">
                            {profile.initials}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full p-0 bg-white dark:bg-gray-900 shadow-xl border-2 hover:scale-110 transition-transform"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Identity Section */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                          <h1 className="text-4xl font-bold text-foreground tracking-tight">{profile.displayName}</h1>
                          <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                        </div>
                        
                        <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                          <p className="text-lg text-muted-foreground">@{profile.handle || `@${profile.displayName.toLowerCase().replace(/\s+/g, '_')}`}</p>
                          {mockUserProfile.longevityArchetype && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">{mockUserProfile.longevityArchetype}</span>
                            </>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground max-w-xl mb-4">
                          {profile.bio || "Building a balanced life through connection, health, and purpose."}
                        </p>

                        {/* Role Badges */}
                        <div className="flex items-center justify-center lg:justify-start gap-2 flex-wrap mb-4">
                          {mockUserProfile.roles.map((role) => (
                            <Badge key={role} variant="secondary" className="capitalize rounded-full px-3 py-1">
                              {role}
                            </Badge>
                          ))}
                          {mockUserProfile.membershipTier && (
                            <Badge variant="outline" className="capitalize text-primary rounded-full px-3 py-1 border-2">
                              {mockUserProfile.membershipTier}
                            </Badge>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-center lg:justify-start gap-3">
                          <Button variant="outline" className="rounded-full gap-2 shadow-sm">
                            <Share2 className="h-4 w-4" />
                            Share Profile
                          </Button>
                          <Button variant="outline" className="rounded-full gap-2 shadow-sm">
                            <QrCode className="h-4 w-4" />
                            QR Code
                          </Button>
                          <Button variant="outline" className="rounded-full gap-2 shadow-sm">
                            <Copy className="h-4 w-4" />
                            Copy Link
                          </Button>
                        </div>
                      </div>

                      {/* Animated Vitana Index Orb */}
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/20 to-[hsl(var(--pill-nutrition-accent))]/20 blur-2xl animate-pulse" />
                        
                        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))]/10 to-[hsl(var(--pill-nutrition-accent))]/10 backdrop-blur-xl border border-[hsl(var(--sys-vitana-accent))]/30 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center group hover:scale-105 transition-all duration-300">
                          <TrendingUp className="w-6 h-6 text-[hsl(var(--sys-vitana-accent))] mb-1 group-hover:scale-110 transition-transform" />
                          <div className="text-3xl font-bold bg-gradient-to-br from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] bg-clip-text text-transparent">
                            {mockUserProfile.vitanaIndex}
                          </div>
                          <div className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                            VITANA INDEX
                          </div>
                          {mockUserProfile.vitanaPercentile && (
                            <Badge 
                              variant="outline" 
                              className="mt-1 text-[10px] px-2 py-0 border-[hsl(var(--sys-vitana-accent))]/30 bg-[hsl(var(--sys-vitana-accent))]/10 text-[hsl(var(--sys-vitana-accent))]"
                            >
                              TOP {100 - mockUserProfile.vitanaPercentile}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ID Card Footer */}
                <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between text-xs text-muted-foreground">
                  <div>Member since {new Date().getFullYear()}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">ID: {mockUserProfile.id.slice(0, 8)}</span>
                    <div className="w-2 h-2 rounded-full bg-[hsl(var(--sys-vitana-accent))] animate-pulse" />
                  </div>
                </div>
              </div>
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
