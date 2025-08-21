import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Heart, Share2, MessageCircle, Volume2, Eye, Clock, TrendingUp, Bookmark, Search } from "lucide-react";

const communitySubItems = [
  { id: "overview", name: "Overview", path: "/community" },
  { id: "my-groups", name: "My Groups & Feed", path: "/community/my-groups" },
  { id: "events", name: "Events & Meetups", path: "/community/events" },
  { id: "media-hub", name: "Media Hub", path: "/community/media-hub" },
  { id: "live-interaction", name: "Live Interaction", path: "/community/live-interaction" },
  { id: "ai-insights", name: "AI Insights", path: "/community/ai-insights" },
];

export default function MediaHub() {
  const videoShorts = [
    {
      title: "5 Min Morning Stretch",
      creator: "FitnessPro",
      duration: "0:45",
      views: "2.3k",
      likes: 234,
      thumbnail: "MS",
      isLive: false
    },
    {
      title: "Quick Healthy Breakfast",
      creator: "NutriChef",
      duration: "1:20",
      views: "1.8k",
      likes: 189,
      thumbnail: "QH",
      isLive: false
    },
    {
      title: "Breathing Exercise",
      creator: "MindfulMoments",
      duration: "2:15",
      views: "3.1k",
      likes: 412,
      thumbnail: "BE",
      isLive: true
    }
  ];

  const podcastEpisodes = [
    {
      title: "The Science of Sleep",
      creator: "Dr. Sarah Wilson",
      duration: "45:30",
      category: "Health",
      plays: "12k",
      isNew: true
    },
    {
      title: "Mindful Eating Habits",
      creator: "Nutrition Network",
      duration: "32:15",
      category: "Nutrition",
      plays: "8.5k",
      isNew: false
    }
  ];

  const liveReplays = [
    {
      title: "Community Yoga Session",
      date: "Yesterday",
      duration: "60:00",
      viewers: "156",
      host: "Yoga Masters"
    },
    {
      title: "Q&A with Dr. Martinez",
      date: "3 days ago",
      duration: "45:30",
      viewers: "203",
      host: "Health Hub"
    }
  ];

  const playlists = [
    {
      title: "Morning Motivation",
      count: 12,
      category: "Curated",
      thumbnail: "MM"
    },
    {
      title: "Healthy Recipes",
      count: 8,
      category: "User Created",
      thumbnail: "HR"
    }
  ];

  const creators = [
    {
      name: "FitnessPro",
      followers: "12.3k",
      videos: 45,
      category: "Fitness",
      avatar: "FP"
    },
    {
      name: "NutriChef",
      followers: "8.9k",
      videos: 32,
      category: "Nutrition",
      avatar: "NC"
    }
  ];

  return (
    <AppLayout>
      <SEO title="Media Hub | Community" description="Discover videos, podcasts, and community content" canonical={window.location.href} />
      <SubNavigation items={communitySubItems} />
      <div className="p-6 space-y-6">
        <PageHeader 
          title="Inspire and be inspired! 🎬"
          description="Discover videos, podcasts, and community content"
          icon={Play}
        />
        
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">Media Hub</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button size="sm">
              <Play className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Video Shorts */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Trending Shorts
                </h2>
                <div className="space-y-4">
                  {videoShorts.map((video, index) => (
                    <div key={index} className="relative group cursor-pointer">
                      <div className="relative aspect-[9/16] bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Avatar className="w-16 h-16">
                            <AvatarFallback className="text-lg">{video.thumbnail}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="absolute top-2 left-2">
                          {video.isLive && (
                            <Badge variant="destructive" className="text-xs">
                              • LIVE
                            </Badge>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            {video.duration}
                          </Badge>
                        </div>
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button size="sm" className="rounded-full w-12 h-12">
                            <Play className="w-6 h-6" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <h3 className="font-semibold text-sm">{video.title}</h3>
                        <p className="text-xs text-muted-foreground">{video.creator}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {video.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {video.likes}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button size="sm" variant="ghost" className="h-8 px-2 flex-1">
                            <Heart className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 flex-1">
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2 flex-1">
                            <Share2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Podcasts & Replays */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Podcast Episodes
                </h2>
                <div className="space-y-4">
                  {podcastEpisodes.map((episode, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
                          <Volume2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{episode.title}</h3>
                            {episode.isNew && <Badge variant="secondary" className="text-xs">New</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{episode.creator}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{episode.duration}</span>
                            <span>•</span>
                            <span>{episode.plays} plays</span>
                            <Badge variant="outline" className="text-xs">{episode.category}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Play className="w-4 h-4 mr-1" />
                          Play
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Bookmark className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Live Session Replays</h3>
                <div className="space-y-3">
                  {liveReplays.map((replay, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{replay.title}</h4>
                        <Badge variant="outline">{replay.date}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">by {replay.host}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {replay.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {replay.viewers}
                          </span>
                        </div>
                        <Button size="sm">Watch Again</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Playlists & Creators */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Curated Playlists</h3>
                <div className="space-y-3">
                  {playlists.map((playlist, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">{playlist.thumbnail}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{playlist.title}</h4>
                          <p className="text-xs text-muted-foreground">{playlist.count} videos</p>
                          <Badge variant="outline" className="text-xs mt-1">{playlist.category}</Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-3">
                        View Playlist
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Creator Spotlight
                </h3>
                <div className="space-y-4">
                  {creators.map((creator, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{creator.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{creator.name}</h4>
                          <p className="text-xs text-muted-foreground">{creator.followers} followers</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-xs">{creator.category}</Badge>
                        <span className="text-xs text-muted-foreground">{creator.videos} videos</span>
                      </div>
                      <Button size="sm" variant="outline" className="w-full">
                        Follow
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}