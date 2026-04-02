import { cn } from "@/lib/utils";
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
import { Play, Pause, Heart, Share2, MessageCircle, Volume2, Eye, Clock, TrendingUp, Bookmark, Search, Upload, Plane, Music, Video, Podcast, Trash2, Loader2, ChevronDown, Mic, Plus } from "lucide-react";
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
import { KebabMenu, DropdownMenuItem as KebabDropdownMenuItem } from "@/components/ui/dropdown-menu-kebab";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { usePopularPodcastShows, PopularShow } from "@/hooks/usePopularPodcastShows";
import { usePodcastShowSubscription } from "@/hooks/usePodcastShowSubscription";
import { useShorts, useTrackMediaEvent } from "@/hooks/useShorts";
import { ShortPreviewCard } from "@/components/community/ShortPreviewCard";
import { useUserInterestsStore } from "@/stores/userInterestsStore";
import { UnifiedUploadModal } from '@/components/community/UnifiedUploadModal';
import { VideoPlayerModal } from '@/components/community/VideoPlayerModal';
import { BulkVideoUploadModal } from '@/components/community/BulkVideoUploadModal';
import { EditShortVideoModal } from '@/components/community/EditShortVideoModal';
import { useShortsDensity } from '@/hooks/useShortsDensity';
import { DensityControl } from '@/components/community/DensityControl';
import { MobileShortsFeed } from '@/components/community/MobileShortsFeed';
import { MobileShortsCarousel } from '@/components/community/MobileShortsCarousel';
import { MobileMusicList } from '@/components/community/MobileMusicList';
import { MobilePodcastList } from '@/components/community/MobilePodcastList';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@/hooks/useTranslation';
import shortsMorningStretch from "@/assets/shorts-morning-stretch.jpg";
import shortsHealthyBreakfast from "@/assets/shorts-healthy-breakfast.jpg";
import shortsBreathingExercise from "@/assets/shorts-breathing-exercise.jpg";
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from "@/components/ui/responsive-confirm-dialog";
// SubscribeButton component
  function SubscribeButton({ show }: { show: PopularShow }) {
    const { user } = useAuth();
    const { translate } = useTranslation();
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
              {isSubscribed ? translate('mediaHub.subscribed') : translate('mediaHub.subscribe')}
            </>
          )}
        </span>
      </button>
    );
  }

// PopularShowsList component
function PopularShowsList() {
  const { translate } = useTranslation();
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
                {translate('mediaHub.by')} {show.host_name}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {show.episode_count} {translate('mediaHub.episodes')}
                {show.subscriber_count > 0 && ` • ${show.subscriber_count} ${translate('mediaHub.subscribers')}`}
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
  const isMobile = useIsMobile();
  const {
    pendingCount,
    getLatestActions
  } = useAutopilot();
  const { translate } = useTranslation();
  const [isUnifiedUploadOpen, setIsUnifiedUploadOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [initialMediaType, setInitialMediaType] = useState<'music' | 'podcast' | 'video' | undefined>();
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number>(-1);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [mobileShortsFeedOpen, setMobileShortsFeedOpen] = useState(false);
  
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
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const latestActions = getLatestActions(2);
  
  // Shorts density control
  const { density, setDensity, cardWidth, gap, fontScale } = useShortsDensity();
  
  // Get user interests for filtering
  const { getActiveTags, filteringEnabled } = useUserInterestsStore();
  const activeTags = getActiveTags();

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
        title: translate('mediaHub.toast.podcastDeleted'),
        description: translate('mediaHub.toast.podcastDeletedDesc'),
      });
      setDeleteDialogOpen(false);
      setPodcastToDelete(null);
    },
    onError: (error) => {
      toast({
        title: translate('mediaHub.toast.deleteError'),
        description: translate('mediaHub.toast.deleteErrorDesc'),
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
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
      toast({
        title: translate('mediaHub.toast.videoDeleted'),
        description: translate('mediaHub.toast.videoDeletedDesc'),
      });
      setDeleteVideoDialogOpen(false);
      setVideoToDelete(null);
      setIsVideoPlayerOpen(false);
    },
    onError: (error) => {
      toast({
        title: translate('mediaHub.toast.deleteError'),
        description: translate('mediaHub.toast.deleteErrorDesc'),
        variant: "destructive",
      });
      console.error('Delete video error:', error);
    },
  });

  // Fetch approved music from database
  const { data: approvedMusic = [], refetch: refetchMusic } = useQuery({
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
  // Fetch real video shorts from database with filtering
  const { data: realShorts = [], isLoading: isShortsLoading, refetch: refetchShorts } = useShorts({ 
    limit: 100,
    tags: activeTags.length > 0 && filteringEnabled ? activeTags : undefined
  });
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
  const videoShorts = realShorts.length > 0 ? realShorts.map(short => {
    const creatorNameRaw = short?.profiles?.display_name ?? short?.profiles?.full_name ?? 'Community Member';
    const creatorName = (typeof creatorNameRaw === 'string' && creatorNameRaw.trim().length > 0)
      ? creatorNameRaw
      : 'Community Member';

    const rawTags: any = (short as any).tags ?? [];
    const normalizedTags: string[] = Array.isArray(rawTags)
      ? rawTags
      : (typeof rawTags === 'string'
          ? rawTags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : []);

    return ({
      id: short.id,
      user_id: short.user_id,
      title: short.title,
      description: short.description,
      creator: creatorName,
      creatorAvatar: short.profiles?.avatar_url || null,
      creatorDisplayName: short.profiles?.display_name || short.profiles?.full_name || null,
      duration: short.duration_sec ? `${Math.floor(short.duration_sec / 60)}:${(short.duration_sec % 60).toString().padStart(2, '0')}` : '0:00',
      views: short.views_count.toString(),
      likes: short.likes_count,
      thumbnailImage: short.thumbnail_url || fallbackShorts[0].thumbnailImage,
      src_url: short.src_url,
      thumbnail_url: short.thumbnail_url,
      isLive: false,
      tags: normalizedTags
    })
  }) : fallbackShorts;

  const handleVideoClick = (video: any, index: number) => {
    setSelectedVideo({
      id: video.id,
      user_id: video.user_id,
      title: video.title,
      src_url: video.src_url,
      thumbnail_url: video.thumbnail_url || video.thumbnailImage
    });
    setSelectedVideoIndex(index);
    setIsVideoPlayerOpen(true);
  };

  const handleNextVideo = () => {
    if (selectedVideoIndex < videoShorts.length - 1) {
      const nextIndex = selectedVideoIndex + 1;
      const nextVideo = videoShorts[nextIndex];
      if (nextVideo && 'src_url' in nextVideo) {
        setSelectedVideo({
          id: nextVideo.id,
          user_id: nextVideo.user_id,
          title: nextVideo.title,
          src_url: nextVideo.src_url,
          thumbnail_url: nextVideo.thumbnail_url || nextVideo.thumbnailImage
        });
        setSelectedVideoIndex(nextIndex);
      }
    }
  };

  const handlePreviousVideo = () => {
    if (selectedVideoIndex > 0) {
      const prevIndex = selectedVideoIndex - 1;
      const prevVideo = videoShorts[prevIndex];
      if (prevVideo && 'src_url' in prevVideo) {
        setSelectedVideo({
          id: prevVideo.id,
          user_id: prevVideo.user_id,
          title: prevVideo.title,
          src_url: prevVideo.src_url,
          thumbnail_url: prevVideo.thumbnail_url || prevVideo.thumbnailImage
        });
        setSelectedVideoIndex(prevIndex);
      }
    }
  };

  const handleVideoUploadComplete = () => {
    refetchShorts();
    toast({
      title: translate('mediaHub.toast.uploadSuccess'),
      description: translate('mediaHub.toast.uploadSuccessDesc').replace('{type}', 'video'),
    });
  };
  // Fetch approved podcasts from database
  const { data: approvedPodcasts = [], refetch: refetchPodcasts } = useQuery({
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
      {!isMobile && <SubNavigation items={communityNavigation} />}
      <div className={cn(isMobile ? "px-4 pt-1 pb-0" : "p-6", "bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen")}>
        <div className="max-w-7xl mx-auto">
          
          {/* Mobile Header */}
          {isMobile ? (
            <>
              <StandardHeader
                title={translate('mediaHub.title')}
                description={translate('mediaHub.discoverContent')}
              />
              
              {/* Compact Mobile Action Rail */}
              <UtilityActionButton compact
                className="min-w-0"
                afterGiftVoucherChildren={
                  <>
                    {/* Vitana Index - pill with emoji + text */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate('/health')}
                      className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
                    >
                      <span className="text-xs opacity-60">🧬</span>
                      <span className="text-sm font-medium text-primary">742</span>
                    </Button>
                    
                    {/* Autopilot - pill with icon + text */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setAutopilotOpen(true)}
                      className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 relative shrink-0"
                    >
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{translate('actionBar.autopilot', 'Autopilot')}</span>
                      {pendingCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full p-0 flex items-center justify-center text-[10px] animate-pulse"
                        >
                          {pendingCount}
                        </Badge>
                      )}
                    </Button>
                  </>
                }
              >
                <div className="flex items-center gap-2 min-w-max">
                <ExpandableSearchButton 
                    placeholder={translate('mediaHub.searchPlaceholder')}
                    onSearch={(query) => console.log('Search Media:', query)}
                  />
                  
                  {/* Mode pill - replaces SplitBarList on mobile */}
                  <MobileModePill
                    modes={[
                      { value: "shorts", label: translate('mediaHub.tabs.shorts', 'Shorts'), icon: "📹" },
                      { value: "music", label: translate('mediaHub.tabs.music', 'Music'), icon: "🎵" },
                      { value: "podcasts", label: translate('mediaHub.tabs.podcasts', 'Podcasts'), icon: "🎙️" },
                    ]}
                    activeMode={activeMediaTab}
                    onModeChange={setActiveMediaTab}
                  />
                  
                  {/* Calendar - default styling */}
                  <UniversalCalendarButton />
                  
                  {/* Upload - PRIMARY ACTION */}
                  <Button 
                    onClick={() => setIsUnifiedUploadOpen(true)}
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">{translate('mediaHub.actions.upload')}</span>
                  </Button>
                </div>
              </UtilityActionButton>
            </>
          ) : (
            <>
              {/* Desktop Header Section with Perfect Symmetry - Three Cards Layout */}
              <div className="flex flex-col lg:flex-row gap-4 mb-8">
                {/* Shortened Header Bar - Welcome Message */}
                <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">{translate('mediaHub.title')} ✨</h1>
                    <p className="text-muted-foreground">{translate('mediaHub.discoverContent')}</p>
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
                    <span className="text-sm font-medium text-red-400">{translate('actionBar.autopilot', 'Autopilot')}</span>
                  </div>
                  
                  {/* Hover Preview */}
                  {showPreview && pendingCount > 0 && <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl p-3 z-10">
                      <div className="text-xs font-medium text-muted-foreground mb-2">{translate('mediaHub.latestActions')}</div>
                      {latestActions.map((action, index) => <div key={action.id} className="flex items-center space-x-2 text-xs py-1">
                          <span>{action.icon}</span>
                          <span className="truncate">{action.title}</span>
                        </div>)}
                      {pendingCount > 2 && <div className="text-xs text-muted-foreground pt-1 border-t mt-1">
                          {translate('mediaHub.moreActions').replace('{count}', String(pendingCount - 2))}
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

              {/* Desktop Action Buttons Utility Bar */}
              <UtilityActionButton>
                <ExpandableSearchButton 
                  placeholder={translate('mediaHub.searchPlaceholder')}
                  onSearch={(query) => console.log('Search Media:', query)}
                />
                <UniversalCalendarButton />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      {translate('mediaHub.actions.upload')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover z-50 border border-border shadow-md">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Video className="w-4 h-4 mr-2" />
                        {translate('mediaHub.menu.video')}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-popover z-50 border border-border shadow-md">
                        <DropdownMenuItem onClick={() => {
                          setInitialMediaType('video');
                          setIsUnifiedUploadOpen(true);
                        }}>
                          {translate('mediaHub.menu.singleUpload')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsBulkUploadOpen(true)}>
                          {translate('mediaHub.menu.bulkUpload')}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={() => {
                      setInitialMediaType('music');
                      setIsUnifiedUploadOpen(true);
                    }}>
                      <Music className="w-4 h-4 mr-2" />
                      {translate('mediaHub.menu.music')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setInitialMediaType('podcast');
                      setIsUnifiedUploadOpen(true);
                    }}>
                      <Mic className="w-4 h-4 mr-2" />
                      {translate('mediaHub.menu.podcast')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </UtilityActionButton>
            </>
          )}

          {/* Media Hub Subtabs */}
          <SplitBar value={activeMediaTab} onValueChange={setActiveMediaTab} className={cn("w-full", isMobile && "mt-1")}>
            {!isMobile && (
              <SplitBarList>
                <SplitBarTrigger value="shorts">
                  📹 {translate('mediaHub.tabs.shorts')}
                </SplitBarTrigger>
                <SplitBarTrigger value="music">
                  🎵 {translate('mediaHub.tabs.music')}
                </SplitBarTrigger>
                <SplitBarTrigger value="podcasts">
                  🎙️ {translate('mediaHub.tabs.podcasts')}
                </SplitBarTrigger>
              </SplitBarList>
            )}

            <SplitBarContent value="shorts">
              {/* Mobile TikTok-style immersive feed */}
              {isMobile ? (
                <MobileShortsCarousel
                  shorts={videoShorts}
                  onShortClick={(index) => {
                    setSelectedVideoIndex(index);
                    setMobileShortsFeedOpen(true);
                  }}
                />
              ) : (
              /* Desktop Grid Layout */
              <div className="space-y-6">
                {/* Trending Shorts Section */}
                <div className="bg-gradient-to-b from-white/0 to-white/5 rounded-t-3xl p-6 -mx-6 -mt-6">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold mb-1 flex items-center gap-2 text-foreground">
                        <Video className="w-6 h-6 text-violet-600" />
                        {translate('mediaHub.sections.trendingShorts')}
                      </h2>
                      <div className="h-0.5 w-32 bg-gradient-to-r from-pink-500 via-violet-500 to-transparent rounded-full mt-2"></div>
                    </div>
                    
                    {/* Density Control - Hidden on mobile */}
                    <div className="hidden sm:block">
                      <DensityControl value={density} onChange={setDensity} />
                    </div>
                  </div>
                  
                  {/* Filter Indicator */}
                  {activeTags.length > 0 && filteringEnabled && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">{translate('mediaHub.filteredBy')}</span>
                      {activeTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                        </Badge>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          useUserInterestsStore.getState().setFilteringEnabled(false);
                          toast({
                            title: translate('mediaHub.toast.filtersCleared'),
                            description: translate('mediaHub.toast.filtersClearedDesc'),
                          });
                        }}
                        className="text-xs h-6"
                      >
                        {translate('mediaHub.actions.clearFilters')}
                      </Button>
                    </div>
                  )}
                  
                  {/* Empty State */}
                  {videoShorts.length === 0 && !isShortsLoading && activeTags.length > 0 && filteringEnabled && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground mb-2">{translate('mediaHub.noMatchingShorts')}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          useUserInterestsStore.getState().setFilteringEnabled(false);
                        }}
                      >
                        {translate('mediaHub.viewAllShorts')}
                      </Button>
                    </div>
                  )}
                  
                  <div 
                    className="grid"
                    style={{
                      '--card-w': cardWidth,
                      '--gap': gap,
                      '--font-scale': fontScale,
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      justifyItems: 'center',
                      gap: '16px',
                    } as React.CSSProperties & { '--card-w': string; '--gap': string; '--font-scale': number }}
                  >
                    <style>{`
                      @media (min-width: 640px) {
                        .grid[style*="--card-w"] {
                          grid-template-columns: repeat(auto-fill, var(--card-w)) !important;
                          gap: var(--gap) !important;
                        }
                      }
                    `}</style>
                    {videoShorts.map((video, index) => (
                      <ShortPreviewCard
                        key={video.id || index}
                        video={video}
                        index={index}
                        currentUserId={user?.id}
                        onClick={() => handleVideoClick(video, index)}
                        onEdit={() => setEditingVideo(video)}
                        onDelete={() => {
                          setVideoToDelete({
                            id: video.id,
                            src_url: video.src_url,
                            thumbnail_url: video.thumbnail_url
                          });
                          setDeleteVideoDialogOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              )}
            </SplitBarContent>

            <SplitBarContent value="music">
              {isMobile ? (
                <MobileMusicList tracks={approvedMusic} />
              ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                {/* Trending Music - Left Column (~62%) */}
                <Card className="rounded-2xl shadow-lg border-white/20 bg-white/60 backdrop-blur-md overflow-hidden">
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold mb-1 flex items-center gap-2 text-foreground">
                        <Music className="w-6 h-6 text-purple-600" />
                        {translate('mediaHub.sections.trendingMusic')}
                      </h2>
                      <div className="h-0.5 w-32 bg-gradient-to-r from-purple-500 via-pink-500 to-transparent rounded-full mt-2"></div>
                    </div>
                    
                    <div className="space-y-4">
                      {approvedMusic.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Music className="w-16 h-16 mx-auto mb-4 opacity-30" />
                          <p className="text-base">{translate('mediaHub.noMusicDesc')}</p>
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
                                  {track.music_metadata?.[0]?.artist_name || translate('mediaHub.unknownArtist')} • {formatDuration(track.duration)}
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
                                        text: `Check out "${track.title}" by ${track.music_metadata?.[0]?.artist_name || translate('mediaHub.unknownArtist')} on Vitana`,
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
                                          title: translate('mediaHub.toast.linkCopied'),
                                          description: translate('mediaHub.toast.linkCopiedDesc'),
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
                                    <KebabDropdownMenuItem>{translate('mediaHub.menu.addToPlaylist')}</KebabDropdownMenuItem>
                                    <KebabDropdownMenuItem>{translate('mediaHub.menu.viewArtist')}</KebabDropdownMenuItem>
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
                      <h3 className="text-2xl font-semibold mb-1 text-foreground">{translate('mediaHub.sections.musicPlaylists')}</h3>
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
                              {playlist.count} {translate('mediaHub.tracks')} • ~{Math.floor(playlist.count * 3.5)} {translate('mediaHub.min')} • {translate('mediaHub.by')} Vitana
                            </p>
                          </div>

                          {/* Full-width Elevated Play Bar */}
                          <button 
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-purple-400/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 group/play"
                          >
                            <Play className="w-4 h-4 group-hover/play:scale-110 transition-transform" />
                            {translate('mediaHub.actions.playPlaylist')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              )}

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
              {isMobile ? (
                <MobilePodcastList podcasts={approvedPodcasts} currentUserId={user?.id} />
              ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                {/* Latest Episodes - Left Column (~60%) */}
                <Card className="rounded-2xl shadow-lg border-white/20 bg-white/60 backdrop-blur-md overflow-hidden">
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold mb-1 text-foreground">{translate('mediaHub.sections.latestEpisodes')}</h2>
                      <div className="h-0.5 w-32 bg-gradient-to-r from-pink-500 via-purple-500 to-transparent rounded-full mt-2"></div>
                    </div>
                    <div className="flex flex-col gap-4">
                      {approvedPodcasts.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-muted-foreground">
                          <Podcast className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>{translate('mediaHub.noPodcastsDesc')}</p>
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
                              creator={metadata?.host_name || translate('mediaHub.unknownHost')}
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
                      <h3 className="text-2xl font-semibold mb-1 text-foreground">{translate('mediaHub.sections.popularShows')}</h3>
                      <div className="h-0.5 w-28 bg-gradient-to-r from-pink-500 via-purple-500 to-transparent rounded-full mt-2"></div>
                    </div>
                    <PopularShowsList />
                  </CardContent>
                </Card>
              </div>
              )}
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>


      {/* Mobile TikTok-style Shorts Feed */}
      {mobileShortsFeedOpen && isMobile && (
        <MobileShortsFeed
          shorts={videoShorts}
          currentUserId={user?.id}
          onClose={() => setMobileShortsFeedOpen(false)}
          initialIndex={selectedVideoIndex >= 0 ? selectedVideoIndex : 0}
        />
      )}

      <VideoPlayerModal
        isOpen={isVideoPlayerOpen}
        onClose={() => {
          setIsVideoPlayerOpen(false);
          setSelectedVideo(null);
          setSelectedVideoIndex(-1);
        }}
        video={selectedVideo}
        onNext={handleNextVideo}
        onPrevious={handlePreviousVideo}
        hasNext={selectedVideoIndex < videoShorts.length - 1}
        hasPrevious={selectedVideoIndex > 0}
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
      <ResponsiveConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ResponsiveConfirmDialogContent>
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>{translate('mediaHub.deletePodcast.title')}</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>
              {translate('mediaHub.deletePodcast.description')}
            </ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel>{translate('mediaHub.deletePodcast.cancel')}</ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction
              onClick={() => {
                if (podcastToDelete) {
                  deletePodcastMutation.mutate(podcastToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {translate('mediaHub.deletePodcast.confirm')}
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>

      {/* Delete Video Confirmation Dialog */}
      <ResponsiveConfirmDialog open={deleteVideoDialogOpen} onOpenChange={setDeleteVideoDialogOpen}>
        <ResponsiveConfirmDialogContent>
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>{translate('mediaHub.deleteVideo.title')}</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>
              {translate('mediaHub.deleteVideo.description')}
            </ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel>{translate('mediaHub.deleteVideo.cancel')}</ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction
              onClick={() => {
                if (videoToDelete) {
                  deleteVideoMutation.mutate(videoToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {translate('mediaHub.deleteVideo.confirm')}
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>

      {/* Edit Video Modal */}
      {editingVideo && (
        <EditShortVideoModal
          isOpen={!!editingVideo}
          onClose={() => setEditingVideo(null)}
          video={{
            id: editingVideo.id,
            user_id: editingVideo.user_id,
            title: editingVideo.title,
            description: editingVideo.description,
            tags: editingVideo.tags,
            src_url: editingVideo.src_url,
            thumbnail_url: editingVideo.thumbnail_url
          }}
          onSave={() => {
            refetchShorts();
            toast({
              title: translate('mediaHub.toast.videoUpdated'),
              description: translate('mediaHub.toast.videoUpdatedDesc'),
            });
          }}
        />
      )}

      {/* Upload Modals */}
      <UnifiedUploadModal
        key={initialMediaType || 'none'}
        open={isUnifiedUploadOpen}
        onOpenChange={(open) => {
          setIsUnifiedUploadOpen(open);
          if (!open) setInitialMediaType(undefined);
        }}
        onUploadComplete={(mediaType) => {
          // Refresh the appropriate list based on what was uploaded
          if (mediaType === 'video') {
            refetchShorts();
          } else if (mediaType === 'music') {
            refetchMusic();
          } else if (mediaType === 'podcast') {
            refetchPodcasts();
          }
          
          toast({
            title: translate('mediaHub.toast.uploadSuccess'),
            description: translate('mediaHub.toast.uploadSuccessDesc').replace('{type}', mediaType),
          });
          
          setIsUnifiedUploadOpen(false);
          setInitialMediaType(undefined);
        }}
        initialMediaType={initialMediaType}
      />
      
      <BulkVideoUploadModal
        open={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onUploadComplete={() => {
          refetchShorts();
          setIsBulkUploadOpen(false);
        }}
      />
    </AppLayout>
  );
}