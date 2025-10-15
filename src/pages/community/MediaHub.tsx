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
import { LanguageFlag } from "@/components/ui/language-flag";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Pause, Heart, Share2, MessageCircle, Volume2, Eye, Clock, TrendingUp, Bookmark, Search, Upload, Plane, Music, Video, Podcast, Trash2 } from "lucide-react";
import { PodcastCard } from "@/components/crossover/PodcastCard";
import { MediaUploadPopup } from "@/components/MediaUploadPopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { communityNavigation } from "@/config/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { KebabMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu-kebab";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
export default function MediaHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playMedia, currentMedia, isPlaying, togglePlay } = useAudioPlayer();
  const queryClient = useQueryClient();
  const {
    pendingCount,
    getLatestActions
  } = useAutopilot();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState("shorts");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [podcastToDelete, setPodcastToDelete] = useState<string | null>(null);
  const latestActions = getLatestActions(2);

  // Delete podcast mutation
  const deletePodcastMutation = useMutation({
    mutationFn: async (podcastId: string) => {
      const { error } = await supabase
        .from('media_uploads')
        .delete()
        .eq('id', podcastId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-podcasts'] });
      toast({
        title: "Podcast deleted",
        description: "Your podcast has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
      setPodcastToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete podcast. Please try again.",
        variant: "destructive",
      });
      console.error('Delete error:', error);
    },
  });

  // Fetch approved music from database
  const { data: approvedMusic = [] } = useQuery({
    queryKey: ['community-music'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_uploads')
        .select(`
          id,
          title,
          description,
          tags,
          file_url,
          duration,
          plays_count,
          created_at,
          music_metadata (
            genre,
            mood,
            artist_name
          )
        `)
        .eq('media_type', 'music')
        .eq('status', 'approved')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    }
  });
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
  // Fetch approved podcasts from database
  const { data: approvedPodcasts = [] } = useQuery({
    queryKey: ['community-podcasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_uploads')
        .select('*, podcast_metadata(*)')
        .eq('media_type', 'podcast')
        .eq('status', 'approved')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    }
  });
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
            <ExpandableSearchButton 
              placeholder="Search Media…"
              onSearch={(query) => console.log('Search Media:', query)}
            />
            <UniversalCalendarButton />
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
                      {approvedMusic.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No music uploaded yet. Be the first to share!</p>
                        </div>
                      ) : (
                        approvedMusic.map((track) => {
                          const formatDuration = (seconds: number | null) => {
                            if (!seconds) return '0:00';
                            const mins = Math.floor(seconds / 60);
                            const secs = Math.floor(seconds % 60);
                            return `${mins}:${secs.toString().padStart(2, '0')}`;
                          };

                          return (
                            <div 
                              key={track.id} 
                              className="group flex items-center gap-4 p-4 bg-gradient-to-br from-white/60 to-purple-50/30 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 ease-out"
                            >
                              {/* Enhanced Album Art / Icon */}
                              <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-purple-400/20 via-pink-400/15 to-blue-400/20 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0 group-hover:shadow-md transition-shadow duration-300">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-300/10 to-transparent" />
                                <Music className="w-7 h-7 text-purple-600/80 relative z-10" />
                              </div>

                              {/* Content Area */}
                              <div className="flex-1 min-w-0 space-y-1.5">
                                {/* Title - larger and bolder */}
                                <h3 className="font-bold text-base text-foreground truncate leading-tight">
                                  {track.title}
                                </h3>
                                
                                {/* Metadata - smaller and lighter */}
                                <p className="text-xs text-muted-foreground/80 leading-snug">
                                  {track.music_metadata?.[0]?.artist_name || 'Unknown Artist'} • {formatDuration(track.duration)}
                                </p>
                                
                                {/* Description - compact and limited */}
                                {track.description && (
                                  <p className="text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
                                    {track.description}
                                  </p>
                                )}
                                
                                {/* Enhanced Tags with icons */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {track.music_metadata?.[0]?.genre && (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-100/60 text-purple-700 border-0 font-medium"
                                    >
                                      🎹 {track.music_metadata[0].genre}
                                    </Badge>
                                  )}
                                  {track.tags?.slice(0, 2).map((tag) => {
                                    // Add personality icons based on tag keywords
                                    const getTagIcon = (tagText: string) => {
                                      const lower = tagText.toLowerCase();
                                      if (lower.includes('rain') || lower.includes('water')) return '🌧';
                                      if (lower.includes('meditat') || lower.includes('calm')) return '🧘';
                                      if (lower.includes('ambient') || lower.includes('chill')) return '✨';
                                      if (lower.includes('sleep') || lower.includes('night')) return '🌙';
                                      if (lower.includes('energy') || lower.includes('focus')) return '⚡';
                                      if (lower.includes('nature')) return '🌿';
                                      return '🎵';
                                    };
                                    
                                    return (
                                      <Badge 
                                        key={tag} 
                                        variant="outline" 
                                        className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/50 border-purple-200/50 text-purple-600/80 font-medium"
                                      >
                                        {getTagIcon(tag)} {tag}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Enhanced Play Button */}
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  playMedia({
                                    id: track.id,
                                    title: track.title,
                                    creator: track.music_metadata?.[0]?.artist_name || 'Unknown Artist',
                                    audioUrl: track.file_url,
                                    duration: track.duration || 0,
                                    mediaType: 'music'
                                  });
                                }}
                                className="shrink-0 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-sm hover:shadow-md transition-all duration-300 border border-purple-200/50 group-hover:scale-110 group-hover:border-purple-300"
                              >
                                {currentMedia?.id === track.id && isPlaying ? (
                                  <Pause className="w-4 h-4 text-purple-600" />
                                ) : (
                                  <Play className="w-4 h-4 text-purple-600 ml-0.5" />
                                )}
                              </Button>
                            </div>
                          );
                        })
                      )}
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
                    <div className="flex flex-col gap-4">
                      {approvedPodcasts.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          <Podcast className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No podcasts uploaded yet. Be the first to share!</p>
                        </div>
                      ) : (
                        approvedPodcasts.map((podcast: any) => {
                          const metadata = Array.isArray(podcast.podcast_metadata) 
                            ? podcast.podcast_metadata[0] 
                            : podcast.podcast_metadata;
                          const isCreator = user?.id === podcast.user_id;
                          
                          return (
                          <PodcastCard
                            key={podcast.id}
                            id={podcast.id}
                            title={podcast.title}
                            creator={metadata?.host_name || 'Unknown Host'}
                            duration={podcast.duration}
                            uploadedAt={podcast.created_at}
                            description={podcast.description}
                            language={metadata?.language || null}
                            audioUrl={podcast.file_url}
                            imageUrl={podcast.thumbnail_url}
                            isCreator={isCreator}
                            onDelete={() => {
                              setPodcastToDelete(podcast.id);
                              setDeleteDialogOpen(true);
                            }}
                          />
                          );
                        })
                      )}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Podcast</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this podcast? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (podcastToDelete) {
                  deletePodcastMutation.mutate(podcastToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>;
}