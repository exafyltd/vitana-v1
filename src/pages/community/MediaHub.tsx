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
import { Play, Pause, Heart, Share2, MessageCircle, Volume2, Eye, Clock, TrendingUp, Bookmark, Search, Upload, Plane, Music, Video, Podcast, Trash2, Loader2 } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { extractStoragePath } from "@/lib/utils";
import { PodcastCard } from "@/components/crossover/PodcastCard";
import { MediaUploadPopup } from "@/components/MediaUploadPopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { communityNavigation } from "@/config/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { KebabMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu-kebab";
import { toast } from "@/hooks/use-toast";
import { usePopularPodcastShows, PopularShow } from "@/hooks/usePopularPodcastShows";
import { usePodcastShowSubscription } from "@/hooks/usePodcastShowSubscription";
import { useShorts, useTrackMediaEvent } from "@/hooks/useShorts";
import { UnifiedUploadModal } from '@/components/community/UnifiedUploadModal';
import { VideoPlayerModal } from '@/components/community/VideoPlayerModal';
import shortsMorningStretch from "@/assets/shorts-morning-stretch.jpg";
import shortsHealthyBreakfast from "@/assets/shorts-healthy-breakfast.jpg";
import shortsBreathingExercise from "@/assets/shorts-breathing-exercise.jpg";
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
// SubscribeButton component
  function SubscribeButton({ show }: { show: PopularShow }) {
    const { user } = useAuth();
    const { isSubscribed, toggleSubscription, isToggling } = usePodcastShowSubscription(
      { show_name: show.show_name, host_name: show.host_name },
      user?.id
    );

    return (
      <button 
        onClick={() => toggleSubscription()}
        disabled={!user || isToggling}
        className={`
          group/sub relative w-full py-2.5 px-5 rounded-2xl font-semibold text-sm
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
          ${isSubscribed 
            ? 'bg-emerald-100/30 border-2 border-emerald-500 text-emerald-600 hover:animate-[pulse_2s_ease-in-out_infinite]' 
            : 'bg-transparent border-2 border-violet-500 text-violet-500 hover:bg-gradient-to-r hover:from-violet-500 hover:to-fuchsia-400 hover:text-white hover:shadow-md hover:scale-[1.02]'
          }
        `}
      >
        <span className="relative flex items-center justify-center gap-2">
          {isToggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Heart className={`w-4 h-4 transition-all ${
                isSubscribed 
                  ? 'fill-current text-emerald-600' 
                  : 'fill-none group-hover/sub:fill-current group-hover/sub:text-white'
              }`} />
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </>
          )}
        </span>
      </button>
    );
  }

// PopularShowsList component
function PopularShowsList() {
  const { data: popularShows = [], isLoading: isLoadingShows } = usePopularPodcastShows();
  
  // Fallback shows if database is empty
  const fallbackShows: PopularShow[] = [
    {
      show_name: "Wellness Today",
      host_name: "Dr. Sarah Wilson",
      episode_count: 45,
      category: "Health",
      subscriber_count: 0,
      latest_episode_date: new Date().toISOString()
    },
    {
      show_name: "Mindful Living",
      host_name: "Alex Chen",
      episode_count: 32,
      category: "Lifestyle",
      subscriber_count: 0,
      latest_episode_date: new Date().toISOString()
    },
    {
      show_name: "Fitness Forward",
      host_name: "Mike Johnson",
      episode_count: 28,
      category: "Fitness",
      subscriber_count: 0,
      latest_episode_date: new Date().toISOString()
    }
  ];
  
  const displayShows = popularShows.length > 0 ? popularShows : fallbackShows;
  
  if (isLoadingShows) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {displayShows.slice(0, 3).map((show, index) => (
        <div 
          key={`${show.show_name}-${show.host_name}`}
          style={{
            animation: `fadeSlideIn 0.4s ease-out ${index * 0.15}s backwards`
          }}
          className="group relative p-5 rounded-2xl border-2 border-white/40 bg-white/70 shadow-md hover:shadow-xl hover:shadow-purple-100/40 hover:-translate-y-1 hover:border-purple-200/60 transition-all duration-300 backdrop-blur-sm"
        >
          {/* Avatar with Gradient */}
          <div className="flex items-start gap-4 mb-4">
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-purple-500 shadow-md flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">
                {show.host_name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base text-foreground leading-tight mb-1">
                {show.show_name}
              </h4>
              <p className="text-xs text-muted-foreground/75 font-medium mb-2">
                by {show.host_name}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {show.episode_count} episodes
                {show.subscriber_count > 0 && ` • ${show.subscriber_count} subscribers`}
              </p>
            </div>
          </div>

          {/* Category Chip */}
          {show.category && (
            <div className="mb-4">
              <Badge 
                variant="outline" 
                className="text-xs border-purple-300/60 bg-purple-50/80 text-purple-700 font-medium"
              >
                {show.category}
              </Badge>
            </div>
          )}

          {/* Subscribe Button */}
          <SubscribeButton show={show} />
        </div>
      ))}
    </div>
  );
}

export default function MediaHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playMedia, currentMedia, isPlaying, togglePlay, pause } = useAudioPlayer();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const queryClient = useQueryClient();
  const {
    pendingCount,
    getLatestActions
  } = useAutopilot();
  const [isUnifiedUploadOpen, setIsUnifiedUploadOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Read tab parameter from URL and set initial active tab
  const [searchParams] = useSearchParams();
  const [activeMediaTab, setActiveMediaTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    // Validate tab parameter against allowed values
    if (tabParam === 'music' || tabParam === 'podcasts' || tabParam === 'shorts') {
      return tabParam;
    }
    return 'shorts'; // default fallback
  });
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [podcastToDelete, setPodcastToDelete] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<{ id: string; src_url: string; thumbnail_url?: string } | null>(null);
  const [deleteVideoDialogOpen, setDeleteVideoDialogOpen] = useState(false);
  const latestActions = getLatestActions(2);

  // Sync activeMediaTab with URL parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'music' || tabParam === 'podcasts' || tabParam === 'shorts') {
      setActiveMediaTab(tabParam);
    }
  }, [searchParams]);

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

  // Delete video short mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (video: { id: string; src_url: string; thumbnail_url?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('media_videos')
        .delete()
        .eq('id', video.id)
        .eq('user_id', user.id);
      
      if (dbError) throw dbError;
      
      // Delete files from storage
      const filesToRemove: string[] = [];
      
      const videoPath = extractStoragePath(video.src_url, 'media');
      if (videoPath) filesToRemove.push(videoPath);
      
      if (video.thumbnail_url) {
        const thumbPath = extractStoragePath(video.thumbnail_url, 'media');
        if (thumbPath) filesToRemove.push(thumbPath);
      }
      
      if (filesToRemove.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('media')
          .remove(filesToRemove);
        
        if (storageError) console.error('Storage cleanup error:', storageError);
      }
    },
    onSuccess: () => {
      refetchShorts();
      toast({
        title: "Video deleted",
        description: "Your video has been successfully deleted.",
      });
      setDeleteVideoDialogOpen(false);
      setVideoToDelete(null);
      setIsVideoPlayerOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete video. Please try again.",
        variant: "destructive",
      });
      console.error('Delete video error:', error);
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
  // Fetch real video shorts from database
  const { data: realShorts = [], isLoading: isShortsLoading, refetch: refetchShorts } = useShorts({ limit: 20 });
  const trackMediaEvent = useTrackMediaEvent();

  // Fallback mock data for when database is empty
  const fallbackShorts = [{
    title: "5 Min Morning Stretch",
    creator: "FitnessPro",
    duration: "0:45",
    views: "2.3k",
    likes: 234,
    thumbnail: "MS",
    thumbnailImage: shortsMorningStretch,
    isLive: false,
    tags: ["Fitness", "Yoga"]
  }, {
    title: "Quick Healthy Breakfast",
    creator: "NutriChef",
    duration: "1:20",
    views: "1.8k",
    likes: 189,
    thumbnail: "QH",
    thumbnailImage: shortsHealthyBreakfast,
    isLive: false,
    tags: ["Nutrition", "Recipes"]
  }, {
    title: "Breathing Exercise",
    creator: "MindfulMoments",
    duration: "2:15",
    views: "3.1k",
    likes: 412,
    thumbnail: "BE",
    thumbnailImage: shortsBreathingExercise,
    isLive: true,
    tags: ["Mindfulness", "Wellness"]
  }];

  // Use real data if available, otherwise fallback
  const videoShorts = realShorts.length > 0 ? realShorts.map(short => ({
    id: short.id,
    user_id: short.user_id,
    title: short.title,
    creator: "Community Member",
    duration: short.duration_sec ? `${Math.floor(short.duration_sec / 60)}:${(short.duration_sec % 60).toString().padStart(2, '0')}` : '0:00',
    views: short.views_count.toString(),
    likes: short.likes_count,
    thumbnailImage: short.thumbnail_url || fallbackShorts[0].thumbnailImage,
    src_url: short.src_url,
    thumbnail_url: short.thumbnail_url,
    isLive: false,
    tags: short.tags
  })) : fallbackShorts;

  const handleVideoClick = (video: any) => {
    setSelectedVideo({
      id: video.id,
      title: video.title,
      src_url: video.src_url,
      thumbnail_url: video.thumbnail_url || video.thumbnailImage
    });
    setIsVideoPlayerOpen(true);
  };

  const handleVideoUploadComplete = () => {
    refetchShorts();
    toast({
      title: 'Success!',
      description: 'Your video is now live in the community.',
    });
  };
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
  
  return (
    <AppLayout>
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
            <Button 
              size="sm" 
              onClick={() => setIsUnifiedUploadOpen(true)}
            >
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
              <div className="space-y-6">
                {/* Trending Shorts Section */}
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold mb-1 flex items-center gap-2 text-foreground">
                      <Video className="w-6 h-6 text-violet-600" />
                      Trending Shorts
                    </h2>
                    <div className="h-0.5 w-32 bg-gradient-to-r from-pink-500 via-violet-500 to-transparent rounded-full mt-2"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videoShorts.map((video, index) => (
                      <div 
                        key={video.id || index}
                        style={{
                          animation: `fadeSlideIn 0.4s ease-out ${index * 0.1}s backwards`
                        }}
                        className="group relative"
                      >
                        {/* Delete Menu (only for video owner) */}
                        {user?.id && video.user_id === user.id && (
                          <div className="absolute top-3 right-3 z-20" onClick={(e) => e.stopPropagation()}>
                            <KebabMenu>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVideoToDelete({
                                    id: video.id,
                                    src_url: video.src_url,
                                    thumbnail_url: video.thumbnail_url
                                  });
                                  setDeleteVideoDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </KebabMenu>
                          </div>
                        )}
                        
                        <div
                          className="cursor-pointer"
                          onClick={() => handleVideoClick(video)}
                        >
                          {/* Thumbnail Container */}
                          <div className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                            {/* Thumbnail Image */}
                            <img 
                              src={video.thumbnailImage} 
                              alt={video.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                            
                            {/* Live Badge - Top Left */}
                            {video.isLive && (
                              <div className="absolute top-3 left-3 z-10">
                                <Badge className="bg-red-500 text-white text-xs px-2.5 py-1 rounded-full border-0 animate-pulse">
                                  • LIVE
                                </Badge>
                              </div>
                            )}
                            
                            {/* Duration Badge - Bottom Right */}
                            <div className="absolute bottom-3 right-3 z-10">
                              <span className="bg-black/40 text-white text-xs px-2 py-1 rounded-md font-medium backdrop-blur-sm">
                                {video.duration}
                              </span>
                            </div>
                            
                            {/* Hover Play Button - Centered */}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                                <Play className="w-8 h-8 text-violet-600 fill-violet-600 ml-1" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Content Below Thumbnail */}
                          <div className="mt-3 space-y-2">
                            <h3 className="font-semibold text-sm text-foreground leading-snug">
                              {video.title}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {video.creator}
                            </p>
                            
                            {/* Tag Pills */}
                            <div className="flex flex-wrap gap-1.5">
                              {video.tags?.map((tag, tagIndex) => (
                                <span 
                                  key={tagIndex}
                                  className="bg-violet-500/10 text-violet-600 text-xs px-2.5 py-0.5 rounded-full font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="music">
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                {/* Trending Music - Left Column (~62%) */}
                <Card className="rounded-2xl shadow-lg border-white/20 bg-white/60 backdrop-blur-md overflow-hidden">
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold mb-1 flex items-center gap-2 text-foreground">
                        <Music className="w-6 h-6 text-purple-600" />
                        Trending Music
                      </h2>
                      <div className="h-0.5 w-32 bg-gradient-to-r from-purple-500 via-pink-500 to-transparent rounded-full mt-2"></div>
                    </div>
                    
                    <div className="space-y-4">
                      {approvedMusic.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Music className="w-16 h-16 mx-auto mb-4 opacity-30" />
                          <p className="text-base">No music uploaded yet. Be the first to share!</p>
                        </div>
                      ) : (
                        approvedMusic.map((track, index) => {
                          const formatDuration = (seconds: number | null) => {
                            if (!seconds) return '0:00';
                            const mins = Math.floor(seconds / 60);
                            const secs = Math.floor(seconds % 60);
                            return `${mins}:${secs.toString().padStart(2, '0')}`;
                          };

                          const isCurrentlyPlaying = currentMedia?.id === track.id && isPlaying;

                          return (
                            <div 
                              key={track.id} 
                              style={{
                                animation: `fadeSlideIn 0.4s ease-out ${index * 0.1}s backwards`
                              }}
                              className={`group relative flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ease-out ${
                                isCurrentlyPlaying
                                  ? 'bg-gradient-to-br from-purple-50/95 via-pink-50/80 to-white/90 border-purple-300/70 shadow-xl shadow-purple-200/50'
                                  : 'bg-white/70 border-white/40 shadow-md hover:shadow-xl hover:shadow-purple-100/40 hover:border-purple-200/60'
                              } hover:-translate-y-1 backdrop-blur-sm overflow-hidden`}
                            >
                              {/* Now Playing Accent Bar */}
                              {isCurrentlyPlaying && (
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-pink-500 to-purple-500 animate-pulse"></div>
                              )}

                              {/* Square Album Cover */}
                              <div className={`relative w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-300 ${
                                isCurrentlyPlaying
                                  ? 'bg-gradient-to-br from-purple-400/40 via-pink-400/35 to-blue-400/40 shadow-lg shadow-purple-400/50 ring-2 ring-purple-300/60'
                                  : 'bg-gradient-to-br from-purple-400/25 via-pink-400/20 to-blue-400/25 shadow-md shadow-purple-300/20 group-hover:shadow-lg group-hover:shadow-purple-300/40'
                              }`}>
                                <Music className="w-7 h-7 text-purple-600/90 relative z-10" />
                                {isCurrentlyPlaying && (
                                  <div className="absolute inset-0 bg-gradient-to-br from-purple-300/20 to-transparent animate-pulse"></div>
                                )}
                              </div>

                              {/* Content Stack */}
                              <div className="flex-1 min-w-0 space-y-2">
                                {/* Title Row with Animated Equalizer */}
                                <div className="flex items-center gap-2.5">
                                  <h3 className="font-bold text-lg text-foreground truncate leading-tight">
                                    {track.title}
                                  </h3>
                                  {isCurrentlyPlaying && (
                                    <div className="flex gap-0.5 items-end h-4 ml-1">
                                      {[1, 2, 3].map((i) => (
                                        <div
                                          key={i}
                                          className="w-0.5 bg-purple-600 rounded-full"
                                          style={{
                                            height: `${40 + Math.sin(Date.now() / 200 + i) * 30}%`,
                                            animation: `equalizer 0.8s ease-in-out ${i * 0.15}s infinite`,
                                          }}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Artist & Duration - 75% opacity */}
                                <p className="text-sm text-muted-foreground/75 leading-none font-medium">
                                  {track.music_metadata?.[0]?.artist_name || 'Unknown Artist'} • {formatDuration(track.duration)}
                                </p>
                                
                                {/* One-line Description */}
                                {track.description && (
                                  <p className="text-xs text-muted-foreground/75 line-clamp-1 leading-relaxed">
                                    {track.description}
                                  </p>
                                )}
                                
                                {/* Tag Chips */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {track.music_metadata?.[0]?.genre && (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-100/70 text-purple-700 border-0 font-medium hover:bg-purple-100 transition-colors"
                                    >
                                      🎹 {track.music_metadata[0].genre}
                                    </Badge>
                                  )}
                                  {track.tags?.slice(0, 2).map((tag) => {
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
                                        className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/80 border-purple-200/60 text-purple-600/90 font-medium hover:bg-white hover:border-purple-300 transition-colors"
                                      >
                                        {getTagIcon(tag)} {tag}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Right Actions - Play + Icons with Divider */}
                              <div className="flex items-center gap-3 shrink-0">
                                {/* Action Icons */}
                                <div className="flex items-center gap-1.5">
                                  {/* Heart */}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await toggleBookmark({
                                        item_type: 'music',
                                        item_id: track.id,
                                        item_name: track.title,
                                        item_metadata: {
                                          artist: track.music_metadata?.[0]?.artist_name || 'Unknown Artist',
                                          duration: track.duration,
                                          genre: track.music_metadata?.[0]?.genre,
                                          file_url: track.file_url,
                                          tags: track.tags || []
                                        }
                                      });
                                    }}
                                    className="h-9 w-9 rounded-full hover:bg-purple-50"
                                  >
                                    <Heart
                                      className={`h-4 w-4 transition-all ${
                                        isBookmarked('music', track.id)
                                          ? "fill-purple-500 text-purple-500"
                                          : "text-muted-foreground/60 hover:text-purple-500"
                                      }`}
                                    />
                                  </Button>

                                  {/* Share */}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const shareData = {
                                        title: track.title,
                                        text: `Check out "${track.title}" by ${track.music_metadata?.[0]?.artist_name || 'Unknown Artist'} on Vitana`,
                                        url: `${window.location.origin}/comm/media-hub?music=${track.id}`,
                                      };

                                      if (navigator.share) {
                                        try {
                                          await navigator.share(shareData);
                                        } catch (err) {
                                          // User cancelled
                                        }
                                      } else {
                                        await navigator.clipboard.writeText(shareData.url);
                                        toast({
                                          title: "Link copied",
                                          description: "Music link copied to clipboard",
                                          duration: 2000,
                                        });
                                      }
                                    }}
                                    className="h-9 w-9 rounded-full hover:bg-purple-50"
                                  >
                                    <Share2 className="h-4 w-4 text-muted-foreground/60 hover:text-purple-500" />
                                  </Button>

                                  {/* More Options */}
                                  <KebabMenu className="h-9 w-9 rounded-full hover:bg-purple-50">
                                    <DropdownMenuItem>Add to Playlist</DropdownMenuItem>
                                    <DropdownMenuItem>View Artist</DropdownMenuItem>
                                  </KebabMenu>
                                </div>

                                {/* Vertical Divider */}
                                <div className="h-10 w-px bg-gradient-to-b from-transparent via-purple-200/50 to-transparent"></div>

                                {/* Circular Play Button with Ripple Effect */}
                                <Button 
                                  size="sm" 
                                  onClick={(e) => {
                                    // Ripple effect
                                    const btn = e.currentTarget;
                                    const ripple = document.createElement('span');
                                    ripple.className = 'absolute inset-0 rounded-full bg-purple-400/30 animate-ping';
                                    btn.appendChild(ripple);
                                    setTimeout(() => ripple.remove(), 600);
                                    
                                    if (currentMedia?.id === track.id && isPlaying) {
                                      pause();
                                    } else {
                                      playMedia({
                                        id: track.id,
                                        title: track.title,
                                        creator: track.music_metadata?.[0]?.artist_name || 'Unknown Artist',
                                        audioUrl: track.file_url,
                                        duration: track.duration || 0,
                                        mediaType: 'music'
                                      });
                                    }
                                  }}
                                  className={`relative shrink-0 w-14 h-14 rounded-full transition-all duration-300 ease-out overflow-hidden ${
                                    isCurrentlyPlaying
                                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-400/60 hover:shadow-xl hover:shadow-purple-400/70 hover:scale-105'
                                      : 'bg-gradient-to-br from-white to-purple-50 shadow-lg hover:shadow-xl hover:shadow-purple-300/60 border-2 border-purple-200/60 hover:border-purple-300 hover:scale-110'
                                  } group-hover:animate-pulse-subtle`}
                                >
                                  {isCurrentlyPlaying ? (
                                    <Pause className="w-6 h-6 text-white relative z-10" />
                                  ) : (
                                    <Play className="w-6 h-6 text-purple-600 ml-0.5 relative z-10" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Music Playlists - Right Column (~38%) */}
                <Card className="rounded-2xl shadow-lg border-white/20 bg-white/60 backdrop-blur-md overflow-hidden">
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <h3 className="text-2xl font-semibold mb-1 text-foreground">Music Playlists</h3>
                      <div className="h-0.5 w-28 bg-gradient-to-r from-pink-500 via-purple-500 to-transparent rounded-full mt-2"></div>
                    </div>
                    
                    <div className="space-y-4">
                      {playlists.map((playlist, index) => (
                        <div 
                          key={index} 
                          style={{
                            animation: `fadeSlideIn 0.4s ease-out ${index * 0.15}s backwards`
                          }}
                          className="group relative p-5 rounded-2xl border-2 border-white/40 bg-white/70 shadow-md hover:shadow-xl hover:shadow-purple-100/40 hover:-translate-y-1 hover:border-purple-200/60 transition-all duration-300 backdrop-blur-sm overflow-hidden"
                        >
                          {/* Heart Icon - Top Right */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Heart className="h-4 w-4 text-muted-foreground/60 hover:text-pink-500 hover:fill-pink-500" />
                          </Button>

                          {/* Cover Collage / Gradient Swatch */}
                          <div className="mb-4">
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md">
                              {/* Gradient collage effect */}
                              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 bg-white/20 p-0.5">
                                <div className="bg-gradient-to-br from-purple-400 to-pink-400 rounded-tl-lg flex items-center justify-center">
                                  <Music className="w-6 h-6 text-white/80" />
                                </div>
                                <div className="bg-gradient-to-br from-pink-400 to-purple-500 rounded-tr-lg flex items-center justify-center">
                                  <Music className="w-5 h-5 text-white/70" />
                                </div>
                                <div className="bg-gradient-to-br from-purple-500 to-blue-400 rounded-bl-lg flex items-center justify-center">
                                  <Music className="w-5 h-5 text-white/70" />
                                </div>
                                <div className="bg-gradient-to-br from-blue-400 to-purple-400 rounded-br-lg flex items-center justify-center">
                                  <Music className="w-6 h-6 text-white/80" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Playlist Info */}
                          <div className="space-y-2 mb-4">
                            <h4 className="font-bold text-base text-foreground leading-tight">{playlist.title}</h4>
                            <p className="text-xs text-muted-foreground/75 font-medium">
                              {playlist.count} tracks • ~{Math.floor(playlist.count * 3.5)} min • by Vitana
                            </p>
                          </div>

                          {/* Full-width Elevated Play Bar */}
                          <button 
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-purple-400/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group/play"
                          >
                            <Play className="w-4 h-4 group-hover/play:scale-110 transition-transform" />
                            Play Playlist
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Custom Animations */}
              <style>{`
                @keyframes fadeSlideIn {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                
                @keyframes equalizer {
                  0%, 100% { height: 40%; }
                  50% { height: 80%; }
                }
                
                @keyframes pulse-subtle {
                  0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
                  50% { box-shadow: 0 0 0 8px rgba(168, 85, 247, 0); }
                }
                
                .animate-pulse-subtle {
                  animation: pulse-subtle 2s ease-in-out infinite;
                }
              `}</style>
            </SplitBarContent>

            <SplitBarContent value="podcasts">
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                {/* Latest Episodes - Left Column (~60%) */}
                <Card className="rounded-2xl shadow-lg border-white/20 bg-white/60 backdrop-blur-md overflow-hidden">
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold mb-1 text-foreground">Latest Episodes</h2>
                      <div className="h-0.5 w-32 bg-gradient-to-r from-pink-500 via-purple-500 to-transparent rounded-full mt-2"></div>
                    </div>
                    <div className="flex flex-col gap-4">
                      {approvedPodcasts.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          <Podcast className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>No podcasts uploaded yet. Be the first to share!</p>
                        </div>
                      ) : (
                        approvedPodcasts.map((podcast: any, index: number) => {
                          const metadata = Array.isArray(podcast.podcast_metadata) 
                            ? podcast.podcast_metadata[0] 
                            : podcast.podcast_metadata;
                          const isCreator = user?.id === podcast.user_id;
                          
                          return (
                          <div
                            key={podcast.id}
                            style={{
                              animation: `fadeSlideIn 0.4s ease-out ${index * 0.1}s backwards`
                            }}
                          >
                            <PodcastCard
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
                          </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Popular Shows - Right Column (~40%) */}
                <Card className="rounded-2xl shadow-lg border-white/20 bg-white/60 backdrop-blur-md overflow-hidden">
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <h3 className="text-2xl font-semibold mb-1 text-foreground">Popular Shows</h3>
                      <div className="h-0.5 w-28 bg-gradient-to-r from-pink-500 via-purple-500 to-transparent rounded-full mt-2"></div>
                    </div>
                    <PopularShowsList />
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <UnifiedUploadModal 
        open={isUnifiedUploadOpen} 
        onOpenChange={setIsUnifiedUploadOpen}
        onUploadComplete={(mediaType) => {
          if (mediaType === 'video') {
            refetchShorts();
            toast({
              title: 'Success!',
              description: 'Your video is now live in the community.',
            });
          }
        }}
      />

      <VideoPlayerModal
        isOpen={isVideoPlayerOpen}
        onClose={() => {
          setIsVideoPlayerOpen(false);
          setSelectedVideo(null);
        }}
        video={selectedVideo}
        onDelete={
          selectedVideo && user?.id && selectedVideo.user_id === user.id
            ? () => {
                setVideoToDelete({
                  id: selectedVideo.id,
                  src_url: selectedVideo.src_url,
                  thumbnail_url: selectedVideo.thumbnail_url
                });
                setDeleteVideoDialogOpen(true);
              }
            : undefined
        }
      />
      
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

      {/* Delete Video Confirmation Dialog */}
      <AlertDialog open={deleteVideoDialogOpen} onOpenChange={setDeleteVideoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone and will remove the video from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (videoToDelete) {
                  deleteVideoMutation.mutate(videoToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}