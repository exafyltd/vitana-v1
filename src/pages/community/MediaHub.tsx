import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Heart, Share2, MessageCircle, Volume2, Eye, Clock, TrendingUp, Bookmark, Search, Upload, Plane, Music, Video, Podcast } from "lucide-react";
import { MediaUploadPopup } from "@/components/MediaUploadPopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { communityNavigation } from "@/config/navigation";
export default function MediaHub() {
  const navigate = useNavigate();
  const {
    pendingCount,
    getLatestActions
  } = useAutopilot();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState("shorts");
  const latestActions = getLatestActions(2);
  const videoShorts = [{
    title: "5 Min Morning Stretch",
    creator: "FitnessPro",
    duration: "0:45",
    views: "2.3k",
    likes: 234,
    thumbnail: "MS",
    isLive: false
  }, {
    title: "Quick Healthy Breakfast",
    creator: "NutriChef",
    duration: "1:20",
    views: "1.8k",
    likes: 189,
    thumbnail: "QH",
    isLive: false
  }, {
    title: "Breathing Exercise",
    creator: "MindfulMoments",
    duration: "2:15",
    views: "3.1k",
    likes: 412,
    thumbnail: "BE",
    isLive: true
  }];
  const podcastEpisodes = [{
    title: "The Science of Sleep",
    creator: "Dr. Sarah Wilson",
    duration: "45:30",
    category: "Health",
    plays: "12k",
    isNew: true
  }, {
    title: "Mindful Eating Habits",
    creator: "Nutrition Network",
    duration: "32:15",
    category: "Nutrition",
    plays: "8.5k",
    isNew: false
  }];
  const liveReplays = [{
    title: "Community Yoga Session",
    date: "Yesterday",
    duration: "60:00",
    viewers: "156",
    host: "Yoga Masters"
  }, {
    title: "Q&A with Dr. Martinez",
    date: "3 days ago",
    duration: "45:30",
    viewers: "203",
    host: "Health Hub"
  }];
  const playlists = [{
    title: "Morning Motivation",
    count: 12,
    category: "Curated",
    thumbnail: "MM"
  }, {
    title: "Healthy Recipes",
    count: 8,
    category: "User Created",
    thumbnail: "HR"
  }];
  const creators = [{
    name: "FitnessPro",
    followers: "12.3k",
    videos: 45,
    category: "Fitness",
    avatar: "FP"
  }, {
    name: "NutriChef",
    followers: "8.9k",
    videos: 32,
    category: "Nutrition",
    avatar: "NC"
  }];
  return <AppLayout>
      <SEO title="Media Hub | Community" description="Discover videos, podcasts, and community content" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header Section with Perfect Symmetry - Three Cards Layout */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Shortened Header Bar - Welcome Message */}
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Media Hub ✨</h1>
                <p className="text-muted-foreground">Discover and share inspiring wellness content with your community.</p>
              </div>
            </div>
            
            {/* Autopilot Card with Live Badge Counter */}
            <div className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl relative" onClick={() => setAutopilotOpen(true)} onMouseEnter={() => setShowPreview(true)} onMouseLeave={() => setShowPreview(false)}>
              {pendingCount > 0 && <Badge variant="destructive" className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs animate-pulse z-10">
                  {pendingCount}
                </Badge>}
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div>
                  <Plane className="w-10 h-10 text-red-400 transform rotate-0" />
                </div>
                <span className="text-sm font-medium text-red-400">Autopilot</span>
              </div>
              
              {/* Hover Preview */}
              {showPreview && pendingCount > 0 && <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Latest Actions:</div>
                  {latestActions.map((action, index) => <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                      <span>{action.icon}</span>
                      <span className="truncate">{action.title}</span>
                    </div>)}
                  {pendingCount > 2 && <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                      +{pendingCount - 2} more actions
                    </div>}
                </div>}
            </div>
            
            {/* Vitana Index Card - Circle with 742 */}
            <div className="w-32 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 cursor-pointer group transition-all duration-300 hover:shadow-xl" onClick={() => navigate('/health/my-health-tracker')}>
              <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
                  <span className="text-xl font-bold text-green-600">742</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Utility Bar */}
          <UtilityActionButton>
            <UniversalCalendarButton />
            <ExpandableSearchButton 
              placeholder="Search Media…"
              onSearch={(query) => console.log('Search Media:', query)}
            />
            <Button size="sm" onClick={() => setIsUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </UtilityActionButton>

          {/* Media Hub Subtabs */}
          <SplitBar value={activeMediaTab} onValueChange={setActiveMediaTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="shorts" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Shorts
              </SplitBarTrigger>
              <SplitBarTrigger value="music" className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                Music
              </SplitBarTrigger>
              <SplitBarTrigger value="podcasts" className="flex items-center gap-2">
                <Podcast className="w-4 h-4" />
                Podcasts
              </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="shorts">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Shorts Content */}
                <div className="lg:col-span-3">
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Play className="w-5 h-5" />
                        Trending Shorts
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {videoShorts.map((video, index) => <div key={index} className="relative group cursor-pointer">
                            <div className="relative aspect-[9/16] bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg overflow-hidden">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Avatar className="w-16 h-16">
                                  <AvatarFallback className="text-lg">{video.thumbnail}</AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="absolute top-2 left-2">
                                {video.isLive && <Badge variant="destructive" className="text-xs">
                                    • LIVE
                                  </Badge>}
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
                            </div>
                          </div>)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="music">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      Trending Music
                    </h2>
                    <div className="space-y-4">
                      {[{
                      title: "Morning Flow Beats",
                      artist: "Wellness Sounds",
                      duration: "3:45",
                      genre: "Ambient"
                    }, {
                      title: "Focus & Flow",
                      artist: "Study Vibes",
                      duration: "4:20",
                      genre: "Lo-Fi"
                    }, {
                      title: "Workout Energy",
                      artist: "Fitness Mix",
                      duration: "2:58",
                      genre: "Electronic"
                    }].map((track, index) => <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                            <Music className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">{track.title}</h3>
                            <p className="text-xs text-muted-foreground">{track.artist} • {track.duration}</p>
                            <Badge variant="outline" className="text-xs mt-1">{track.genre}</Badge>
                          </div>
                          <Button size="sm" variant="outline">
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Music Playlists</h3>
                    <div className="space-y-3">
                      {playlists.map((playlist, index) => <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                              <Music className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{playlist.title}</h4>
                              <p className="text-xs text-muted-foreground">{playlist.count} tracks</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="w-full mt-3">
                            Play Playlist
                          </Button>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>

            <SplitBarContent value="podcasts">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Volume2 className="w-5 h-5" />
                      Latest Episodes
                    </h2>
                    <div className="space-y-4">
                      {podcastEpisodes.map((episode, index) => <div key={index} className="p-4 border rounded-lg">
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
                        </div>)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Popular Shows</h3>
                    <div className="space-y-4">
                      {[{
                      title: "Wellness Today",
                      host: "Dr. Sarah Wilson",
                      episodes: 45,
                      category: "Health"
                    }, {
                      title: "Mindful Living",
                      host: "Alex Chen",
                      episodes: 32,
                      category: "Lifestyle"
                    }, {
                      title: "Fitness Forward",
                      host: "Mike Johnson",
                      episodes: 28,
                      category: "Fitness"
                    }].map((show, index) => <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback>{show.host.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{show.title}</h4>
                              <p className="text-xs text-muted-foreground">by {show.host}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="outline" className="text-xs">{show.category}</Badge>
                            <span className="text-xs text-muted-foreground">{show.episodes} episodes</span>
                          </div>
                          <Button size="sm" variant="outline" className="w-full">
                            Subscribe
                          </Button>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <MediaUploadPopup open={isUploadOpen} onOpenChange={setIsUploadOpen} />
      
      {/* Autopilot Popup */}
      <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
    </AppLayout>;
}