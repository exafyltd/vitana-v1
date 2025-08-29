import { ViewAsMode } from "@/types/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Share2, Users, MapPin, Link as LinkIcon, Activity } from "lucide-react";

interface PreviewPaneProps {
  viewAs: ViewAsMode;
}

export function PreviewPane({ viewAs }: PreviewPaneProps) {
  // Mock profile data for preview
  const mockProfile = {
    name: "Mariia Maxina",
    handle: "maxina",
    avatar: "",
    cover: "",
    bio: "Wellness enthusiast passionate about holistic health and community building. 🌱",
    location: "San Francisco, CA",
    links: [
      { label: "Website", url: "https://mariia.com" },
      { label: "Instagram", url: "https://instagram.com/mariia" }
    ],
    stats: {
      posts: 124,
      followers: 1205,
      following: 487,
      mediaUploads: 89,
      groupsJoined: 12
    },
    vitanaIndex: 742,
    vitanaPercentile: 85,
    offerings: [
      {
        title: "Wellness Consultation",
        duration: "60 min",
        price: "Free",
        nextTime: "Tomorrow 2:00 PM"
      }
    ]
  };

  const getViewModeInfo = () => {
    switch (viewAs) {
      case "me":
        return { showAll: true, badge: "Your View", description: "What you see" };
      case "public":
        return { showAll: true, badge: "Public View", description: "What everyone sees" };
      case "follower":
        return { showAll: true, badge: "Follower View", description: "What your followers see" };
    }
  };

  const viewInfo = getViewModeInfo();

  return (
    <div className="bg-background min-h-full">
      {/* Cover and Avatar */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-purple-100 to-pink-100 rounded-t-lg" />
        <div className="absolute -bottom-12 left-6">
          <Avatar className="w-24 h-24 border-4 border-background">
            <AvatarImage src={mockProfile.avatar} />
            <AvatarFallback className="text-xl">MM</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Profile Header */}
      <div className="pt-16 pb-6 px-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{mockProfile.name}</h1>
            <p className="text-muted-foreground">@{mockProfile.handle}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">community</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {viewAs !== "me" && (
              <>
                <Button size="sm">Follow</Button>
                <Button size="sm" variant="outline">Message</Button>
                <Button size="sm" variant="outline">
                  <Share2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Vitana Index Badge */}
        <div className="mb-4">
          <Button variant="outline" className="gap-2">
            <Activity className="w-4 h-4" />
            Vitana Index: {mockProfile.vitanaIndex}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <div className="text-xl font-bold">{mockProfile.stats.posts}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{mockProfile.stats.followers}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{mockProfile.stats.following}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{mockProfile.stats.mediaUploads}</div>
            <div className="text-sm text-muted-foreground">Media</div>
          </div>
        </div>

        {/* Bio */}
        <p className="text-sm mb-3">{mockProfile.bio}</p>

        {/* Location and Links */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {mockProfile.location}
          </div>
          {mockProfile.links.map((link, index) => (
            <div key={index} className="flex items-center gap-2 text-primary">
              <LinkIcon className="w-4 h-4" />
              <a href={link.url} className="hover:underline">{link.label}</a>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4 mt-4">
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>MM</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">Great workout session today! Feeling energized and ready for the day ahead. 💪</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      24
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      5
                    </span>
                    <span>2h ago</span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="media" className="mt-4">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-muted rounded" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4 mt-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Wellness Warriors</p>
                  <p className="text-sm text-muted-foreground">324 members</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="font-medium mb-3">Health Snapshot</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Sleep Quality</span>
                  <span className="text-sm font-medium">85%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Exercise</span>
                  <span className="text-sm font-medium">92%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Nutrition</span>
                  <span className="text-sm font-medium">78%</span>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}