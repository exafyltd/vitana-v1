import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, MessageSquare, TrendingUp, Lightbulb, Plus, Heart, Share2, Clock } from "lucide-react";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "my-groups", name: "My Groups & Feed", path: "/community/my-groups" },
  { id: "events", name: "Events & Meetups", path: "/community/events" },
  { id: "my-business", name: "My Business", path: "/community/my-business" },
  { id: "media-hub", name: "Media Hub", path: "/community/media-hub" },
  { id: "live-interaction", name: "LIVE Hub", path: "/community/live-interaction" },
  { id: "ai-insights", name: "AI Insights", path: "/community/ai-insights" },
];

export default function MyGroups() {
  const myGroups = [
    { name: "Morning Movers", unread: 3, members: 245, avatar: "MM" },
    { name: "Mindful Nutrition", unread: 0, members: 128, avatar: "MN" },
    { name: "Local Hikers", unread: 7, members: 89, avatar: "LH" },
  ];

  const groupUpdates = [
    { group: "Morning Movers", author: "Sarah K.", content: "Just finished an amazing 5k run! Who's joining tomorrow?", time: "2h ago", likes: 12 },
    { group: "Mindful Nutrition", author: "Alex R.", content: "Recipe share: Green smoothie bowl with chia seeds 🥬", time: "4h ago", likes: 8 },
  ];

  const recommendedGroups = [
    { name: "Yoga Beginners", match: 95, members: 156, description: "Perfect for your fitness goals" },
    { name: "Meal Prep Masters", match: 88, members: 203, description: "Based on your nutrition interests" },
  ];

  return (
    <AppLayout>
      <SEO title="My Groups & Feed | Community" description="Your personalized community feed and group updates" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Connect with your tribe! 👥"
            description="Your personalized community feed and group updates to stay connected with like-minded wellness enthusiasts."
            icon={Users}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - My Groups */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    My Groups
                  </h2>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Join
                  </Button>
                </div>
                <div className="space-y-3">
                  {myGroups.map((group, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{group.avatar}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-sm text-muted-foreground">{group.members} members</p>
                        </div>
                      </div>
                      {group.unread > 0 && (
                        <Badge variant="secondary">{group.unread}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Recommended Groups
                </h3>
                <div className="space-y-3">
                  {recommendedGroups.map((group, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{group.name}</h4>
                        <Badge variant="secondary">{group.match}% match</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{group.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{group.members} members</span>
                        <Button size="sm">Join Group</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Group Updates */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Recent Updates
                </h2>
                <div className="space-y-4">
                  {groupUpdates.map((update, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{update.group}</Badge>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm font-medium">{update.author}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {update.time}
                        </span>
                      </div>
                      <p className="text-sm mb-3">{update.content}</p>
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="ghost" className="h-8 px-2">
                          <Heart className="w-4 h-4 mr-1" />
                          {update.likes}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Reply
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 px-2">
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trending & Suggestions */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Trending Discussions
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium text-sm">#MorningMotivation</p>
                    <p className="text-xs text-muted-foreground">143 posts today</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium text-sm">#HealthyMealPrep</p>
                    <p className="text-xs text-muted-foreground">89 posts today</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium text-sm">#WeekendWorkouts</p>
                    <p className="text-xs text-muted-foreground">67 posts today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Suggested Post</h3>
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                  <p className="text-sm font-medium mb-2">💧 Share your hydration tip today!</p>
                  <p className="text-xs text-muted-foreground mb-3">Help your community stay healthy and motivated</p>
                  <Button size="sm" className="w-full">Create Post</Button>
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}