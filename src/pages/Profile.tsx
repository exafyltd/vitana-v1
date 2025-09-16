import React from "react";
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
import { CommunityImpactWidget } from "@/components/profile/community/CommunityImpactWidget";
import { SuccessStoryCarousel } from "@/components/profile/community/SuccessStoryCarousel";

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

      <section className="mx-auto max-w-6xl px-4 py-6 flex justify-center">
        <div className="w-full max-w-6xl">
          <h1 className="sr-only">User Profile</h1>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6 rounded-xl shadow-sm">
              <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="highlights" className="rounded-lg">Highlights</TabsTrigger>
              <TabsTrigger value="connections" className="rounded-lg">Connections</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-lg">Activity</TabsTrigger>
              <TabsTrigger value="health" className="rounded-lg">Health Snapshot</TabsTrigger>
              <TabsTrigger value="privacy" className="rounded-lg">Privacy View</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left column: Core identity */}
                <div className="space-y-6 lg:col-span-1">
                  <Card className="rounded-xl shadow-sm">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="relative mb-4">
                          <Avatar className="h-28 w-28 ring-2 ring-border">
                            <AvatarImage src={profile.avatar || "/placeholder.svg"} alt="User avatar" loading="lazy" />
                            <AvatarFallback>{profile.initials}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="space-y-1">
                          <div className="text-2xl font-semibold leading-none tracking-tight">{profile.displayName}</div>
                          <div className="text-sm text-muted-foreground">{profile.handle || `@${profile.displayName.toLowerCase().replace(/\s+/g, '_')}`}</div>
                          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            {profile.bio || "Building a balanced life through connection, health, and purpose."}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Button size="sm" className="rounded-lg shadow-sm">
                            Message
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg shadow-sm">
                            Edit Profile
                          </Button>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-1 gap-4">
                        <div className="rounded-xl border bg-muted/20 p-4 shadow-sm">
                          <dl className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <dt className="text-muted-foreground">Email</dt>
                              <dd className="font-medium">{profile.email || "Not provided"}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Phone</dt>
                              <dd className="font-medium">{profile.phone || "Not provided"}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Location</dt>
                              <dd className="font-medium">Brooklyn</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Archetype</dt>
                              <dd className="font-medium">Frequent Flyer</dd>
                            </div>
                          </dl>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {[
                            'Organized',
                            'Practical',
                            'Passionate',
                            'Protective',
                            'Hardworking',
                            'Punctual',
                          ].map((t) => (
                            <Badge key={t} variant="secondary">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right column: Cards */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="rounded-xl shadow-sm">
                      <CardHeader>
                        <CardTitle>Bio</CardTitle>
                        <CardDescription>Short story and context</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          {profile.bio || "I travel often for work and love optimizing every day for energy and focus. I keep my routines simple and my social life meaningful."}
                        </p>
                      </CardContent>
                    </Card>

                    <CommunityImpactWidget 
                      vitanaIndex={mockUserProfile.vitanaIndex}
                      communityStats={{
                        posts: dummyProfileStats.posts,
                        helpedUsers: 12,
                        featuredStories: 3,
                        influenceScore: 85
                      }}
                    />

                    <Card className="rounded-xl shadow-sm">
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
                  </div>

                  {/* Success Story Carousel */}
                  <div className="lg:col-span-2">
                    <SuccessStoryCarousel />
                  </div>
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
    </AppLayout>
  );
}
