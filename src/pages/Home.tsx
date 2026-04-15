import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Search, Plus, Calendar, RefreshCw } from "lucide-react";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { eventTypeToPillar } from "@/lib/eventTransformers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { MasterActionPopup } from "@/components/MasterActionPopup";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";


import { MotivationalBanner } from "@/components/MotivationalBanner";
import { NewsCard } from "@/components/crossover/NewsCard";
import SubNavigation from "@/components/SubNavigation";
import { useProfile } from "@/context/ProfileProvider";
import { useEnhancedMotivationalMessage } from "@/hooks/useEnhancedMotivationalMessage";
import { homeNavigation } from "@/config/navigation";
import { CommunityEventsCard } from "@/components/home/CommunityEventsCard";
import { PriorityOfDayBanner } from "@/components/PriorityOfDayBanner";
import { ScrollingRail } from "@/components/home/ScrollingRail";
import { PulsingHighlightCard } from "@/components/home/PulsingHighlightCard";
import { MusicListCard } from "@/components/home/MusicListCard";
import { PodcastListCard } from "@/components/home/PodcastListCard";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { usePersonalizedMedia } from "@/hooks/usePersonalizedMedia";
import { MeetupDetailsDrawer } from "@/components/meetups/MeetupDetailsDrawer";
import { useEventSelection } from "@/context/EventSelectionContext";
import { PeopleDiscoveryHero } from "@/components/discovery/PeopleDiscoveryHero";
import { ProfilePreviewProvider } from "@/hooks/useProfilePreview";
import { ProfilePreviewDialog } from "@/components/profile/ProfilePreviewDialog";
import { stopAllLoopingSoundsForPath } from "@/lib/playLoopingSound";

// Mock data for Today and Guide screens - Fallback data
const todayScheduledEvents = [
  {
    id: 'scheduled-1',
    title: "Morning Yoga with Lisa Chen",
    description: "Start your day with energy and mindfulness",
    event_type: "yoga",
    location: "Studio A",
    virtual_link: null,
    start_time: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    max_participants: 20,
    participant_count: 15,
    created_by: "lisa-chen",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    creator_display_name: "Lisa Chen",
    creator_avatar_url: "/lovable-uploads/lisa-chen-avatar.jpg",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    attendees: 15,
    timestamp: "08:00"
  },
  {
    id: 'scheduled-2',
    title: "Nutrition Workshop Today",
    description: "Learn meal prep strategies for busy professionals",
    event_type: "nutrition",
    location: "Kitchen Lab",
    virtual_link: null,
    start_time: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(15, 30, 0, 0)).toISOString(),
    max_participants: 15,
    participant_count: 12,
    created_by: "mike-thompson",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    image_url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    creator_display_name: "Mike Thompson",
    creator_avatar_url: "/lovable-uploads/mike-thompson-avatar.jpg",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    author: { name: "Mike Thompson", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    attendees: 12,
    timestamp: "14:00"
  },
  {
    id: 'scheduled-3',
    title: "Community Fitness Challenge",
    description: "Join the weekly group fitness challenge",
    event_type: "fitness",
    location: "Fitness Center",
    virtual_link: null,
    start_time: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(19, 30, 0, 0)).toISOString(),
    max_participants: 30,
    participant_count: 25,
    created_by: "james-davis",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    image_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    creator_display_name: "James Davis",
    creator_avatar_url: "/lovable-uploads/james-davis-avatar.jpg",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    pillar: "Exercise",
    author: { name: "James Davis", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    attendees: 25,
    timestamp: "18:00"
  }
];

const todayMediaContent = [
  {
    title: "Meditation Podcast: Finding Inner Peace",
    description: "A guided meditation session for stress relief",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop",
    pillar: "Mental",
    mediaType: "podcast" as const,
    author: { name: "Dr. Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    timestamp: "New Episode",
    fileUrl: undefined as string | undefined
  },
  {
    title: "Energizing Music Playlist",
    description: "Upbeat tracks to fuel your workout",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    pillar: "Exercise",
    mediaType: "music" as const,
    author: { name: "VITANA Music", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Updated",
    fileUrl: undefined as string | undefined
  },
  {
    title: "Cooking Video: Healthy Smoothies",
    description: "5 nutritious smoothie recipes in 5 minutes",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    mediaType: "video" as const,
    author: { name: "Chef Tae", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    timestamp: "15 min",
    fileUrl: undefined as string | undefined
  }
];

const todayEventsAndMeetups = [
  {
    id: 'mock-meetup-1',
    title: "Evening Wellness Meetup",
    description: "Connect with like-minded wellness enthusiasts",
    event_type: "meetup",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Dr. Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    location: "Downtown Center",
    attendees: 52,
    timestamp: "19:00",
    start_time: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(20, 30, 0, 0)).toISOString(),
    created_by: "demo-sarah-miller",
    max_participants: 60,
    participant_count: 52,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-meetup-2',
    title: "Hydration Challenge Kickoff",
    description: "Start the 30-day community hydration challenge",
    event_type: "challenge",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    pillar: "Hydration",
    author: { name: "Health Coach Murphy", avatar: "/lovable-uploads/murphy-avatar.jpg" },
    location: "Wellness Center",
    attendees: 75,
    timestamp: "18:00",
    start_time: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
    created_by: "demo-murphy",
    max_participants: 100,
    participant_count: 75,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-meetup-3',
    title: "Sleep Workshop Tonight",
    description: "Learn strategies for better sleep quality",
    event_type: "workshop",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    pillar: "Sleep",
    author: { name: "Sleep Therapist James", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Therapy Center",
    attendees: 18,
    timestamp: "20:00",
    start_time: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(21, 30, 0, 0)).toISOString(),
    created_by: "demo-james-davis",
    max_participants: 20,
    participant_count: 18,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const todayNews = [
  {
    title: "Emma Wilson's Wellness Transformation",
    description: "Inspiring 30-day journey with incredible results",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Emma Wilson", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    timestamp: "2 hours ago"
  },
  {
    title: "Community Health Fair Success",
    description: "200+ members joined this weekend's wellness fair",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    pillar: "Hydration",
    author: { name: "VITANA Community", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Central Park",
    attendees: 200,
    timestamp: "Yesterday"
  },
  {
    title: "New Sleep Tracking Features",
    description: "Enhanced analytics for better sleep insights",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    pillar: "Sleep",
    author: { name: "VITANA Team", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "3 hours ago"
  }
];

const guideInspirationalEvents = [
  {
    id: 'mock-inspire-1',
    title: "Transform Your Life Weekend Retreat",
    description: "3-day intensive wellness transformation program",
    event_type: "retreat",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Wellness Masters", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Mountain Retreat",
    attendees: 50,
    timestamp: "Next Month",
    price: 299,
    start_time: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
    end_time: new Date(new Date().setDate(new Date().getDate() + 33)).toISOString(),
    created_by: "demo-wellness-masters",
    max_participants: 60,
    participant_count: 50,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-inspire-2',
    title: "Elite Fitness Challenge 2024",
    description: "Push your limits with professional athletes",
    event_type: "challenge",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop",
    pillar: "Exercise",
    author: { name: "Elite Trainers", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Olympic Center",
    attendees: 100,
    timestamp: "Registration Open",
    price: 199,
    start_time: new Date(new Date().setDate(new Date().getDate() + 45)).toISOString(),
    end_time: new Date(new Date().setDate(new Date().getDate() + 48)).toISOString(),
    created_by: "demo-elite-trainers",
    max_participants: 120,
    participant_count: 100,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-inspire-3',
    title: "Mindfulness Mastery Workshop",
    description: "Advanced meditation and mindfulness techniques",
    event_type: "workshop",
    imageUrl: "https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Mindfulness Experts", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Zen Center",
    attendees: 30,
    timestamp: "Limited Spots",
    price: 149,
    start_time: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString(),
    end_time: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString(),
    created_by: "demo-mindfulness-experts",
    max_participants: 30,
    participant_count: 30,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-inspire-4',
    title: "Nutrition Certification Program",
    description: "Become a certified wellness nutrition consultant",
    event_type: "program",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    author: { name: "Nutrition Institute", avatar: "/lovable-uploads/se-hun-oh-avatar.jpg" },
    location: "Learning Center",
    attendees: 25,
    timestamp: "6-Week Program",
    price: 599,
    start_time: new Date(new Date().setDate(new Date().getDate() + 21)).toISOString(),
    end_time: new Date(new Date().setDate(new Date().getDate() + 63)).toISOString(),
    created_by: "demo-nutrition-institute",
    max_participants: 30,
    participant_count: 25,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const guideDailyMatches = [
  {
    id: 'mock-match-1',
    title: "Connect with Dr. Sarah Miller",
    description: "Mental health expert - Available for mentorship",
    event_type: "meetup",
    imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=600&fit=crop",
    pillar: "Mental",
    author: { name: "Dr. Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    location: "Virtual",
    timestamp: "Available Now",
    start_time: new Date().toISOString(),
    end_time: new Date(new Date().setHours(new Date().getHours() + 1)).toISOString(),
    created_by: "demo-sarah-miller",
    max_participants: 1,
    participant_count: 0,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-match-2',
    title: "Workout Partner: James Davis",
    description: "Marathon runner seeking training companion",
    event_type: "meetup",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    pillar: "Exercise",
    author: { name: "James Davis", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "City Park",
    timestamp: "Mornings",
    start_time: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(7, 30, 0, 0)).toISOString(),
    created_by: "demo-james-davis",
    max_participants: 2,
    participant_count: 1,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-match-3',
    title: "Cooking Buddy: Chef Tae Min",
    description: "Learn Korean healthy cooking techniques",
    event_type: "meetup",
    imageUrl: "https://images.unsplash.com/photo-1556908114-4bfca461d0c6?w=800&h=600&fit=crop",
    pillar: "Nutrition",
    author: { name: "Tae Min", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Culinary Studio",
    timestamp: "Weekends",
    start_time: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    end_time: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    created_by: "demo-tae-min",
    max_participants: 4,
    participant_count: 2,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-match-4',
    title: "Sleep Support Group",
    description: "Weekly community for better sleep habits",
    event_type: "meetup",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    pillar: "Sleep",
    author: { name: "Sleep Therapist Anna", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Wellness Center",
    timestamp: "Thursdays",
    start_time: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(),
    end_time: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(),
    created_by: "demo-anna",
    max_participants: 10,
    participant_count: 7,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'mock-match-5',
    title: "Hydration Challenge Buddy",
    description: "Join our 30-day hydration accountability partner",
    event_type: "challenge",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    pillar: "Hydration",
    author: { name: "Health Coach Murphy", avatar: "/lovable-uploads/murphy-avatar.jpg" },
    location: "Online",
    timestamp: "Daily Check-ins",
    start_time: new Date().toISOString(),
    end_time: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
    created_by: "demo-murphy",
    max_participants: 50,
    participant_count: 32,
    virtual_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export default function Home() {
  const { todayEvents, upcomingEvents } = useCommunityEvents();
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState("today");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { profile } = useProfile();
  
  const firstName = profile?.displayName?.split(' ')[0] || '';
  const { greeting, emoji } = useEnhancedMotivationalMessage(firstName);

  // Event selection for detail drawer
  const { selectedEventId, selectEvent, clearSelection } = useEventSelection();
  const [selectedEventData, setSelectedEventData] = useState<any>(null);

  // Safety net: Clean up any orphaned audio from playLoopingSound
  useEffect(() => {
    console.log('[Home] Cleanup safety net: stopping all looping sounds');
    stopAllLoopingSoundsForPath('');
  }, []);

  // Fetch real approved media uploads
  const { data: approvedMedia } = useQuery({
    queryKey: ['home-media-content'],
    queryFn: async () => {
      const { data: mediaData } = await supabase
        .from('media_uploads')
        .select('*, music_metadata(*), podcast_metadata(*), video_metadata(*)')
        .eq('status', 'approved')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!mediaData) return [];

      // Fetch profiles for the media creators
      const userIds = mediaData.map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      // Create a map of profiles for quick lookup
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Combine media with profile data
      return mediaData.map(media => ({
        ...media,
        profile: profilesMap.get(media.user_id)
      }));
    }
  });

  // Transform real media data to match NewsCard format
  const realMediaContent = (approvedMedia || []).map(media => ({
    title: media.title,
    description: media.description,
    imageUrl: media.thumbnail_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    pillar: media.music_metadata?.genre === 'Ambient' ? 'Mental' : media.music_metadata?.genre === 'Energetic' ? 'Exercise' : 'Nutrition',
    mediaType: media.media_type as 'music' | 'podcast' | 'video',
    author: { 
      name: media.profile?.display_name || "Community Creator", 
      avatar: media.profile?.avatar_url || "/lovable-uploads/design-team-avatar.jpg" 
    },
    timestamp: formatDistanceToNow(new Date(media.created_at), { addSuffix: true }),
    fileUrl: media.file_url,
    isReal: true
  }));

  // Blend real and mock data - prioritize real content
  const blendedMediaContent = [
    ...realMediaContent,
    ...todayMediaContent.map((item, idx) => ({ ...item, id: `mock-media-${idx}`, isReal: false }))
  ].slice(0, 3);

  // Use global audio player
  const { playMedia } = useAudioPlayer();
  
  // Play media handler
  const handlePlayMedia = (media: any) => {
    if (media.fileUrl) {
      playMedia({
        id: media.id || `media-${Date.now()}`,
        title: media.title,
        creator: media.author?.name || 'Unknown',
        audioUrl: media.fileUrl,
        duration: 0,
        imageUrl: media.imageUrl,
        mediaType: media.mediaType === 'music' ? 'music' : 'podcast'
      });
    }
  };

  // Fetch personalized music for MusicListCard
  const { data: personalizedMusic } = usePersonalizedMedia({
    limit: 5,
    mediaType: 'Music'
  });

  // Fetch personalized podcasts for PodcastListCard
  const { data: personalizedPodcasts } = usePersonalizedMedia({
    limit: 5,
    mediaType: 'Podcast'
  });

  // Transform real community events for display using proper pillar mapping
  const transformedCommunityEvents = [...todayEvents, ...upcomingEvents]
    .slice(0, 7) // Increased to 7 to accommodate new podcast row
    .map(event => ({
      title: event.title,
      description: event.description || "Join us for this community event",
      imageUrl: event.image_url || "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop",
      pillar: eventTypeToPillar(event.event_type),
      author: { 
        name: event.creator_display_name || "Community Member", 
        avatar: event.creator_avatar_url || "/lovable-uploads/design-team-avatar.jpg" 
      },
      location: event.location || (event.virtual_link ? "Virtual" : "TBA"),
      attendees: event.participant_count,
      timestamp: format(new Date(event.start_time), 'MMM dd, HH:mm')
    }));

  // Transform real events for scrolling rail - moved inside component
  const realTodayEvents = todayEvents.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description || "Join us for this community event",
    imageUrl: event.image_url || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    pillar: eventTypeToPillar(event.event_type),
    author: { 
      name: event.creator_display_name || "Community Member", 
      avatar: event.creator_avatar_url || "/lovable-uploads/design-team-avatar.jpg" 
    },
    location: event.location || "Virtual",
    attendees: event.participant_count,
    timestamp: format(new Date(event.start_time), 'HH:mm'),
    start_time: event.start_time,
    end_time: event.end_time
  }));

  // Hybrid: blend real with mock for scrolling rail
  const activeScheduledEvents = realTodayEvents.length > 0 ? realTodayEvents.slice(0, 3) : todayScheduledEvents;

  // Handle event click to open detail drawer
  const handleEventClick = (eventId: string) => {
    // Search in real database events
    const allEvents = [...todayEvents, ...upcomingEvents];
    let event = allEvents.find(e => e.id === eventId);
    
    // If not found in real events, search in mock scheduled events
    if (!event) {
      event = todayScheduledEvents.find(e => e.id === eventId);
    }
    
    // Search in mock meetups
    if (!event) {
      event = todayEventsAndMeetups.find(e => e.id === eventId);
    }
    
    // Search in guide inspirational events
    if (!event) {
      event = guideInspirationalEvents.find(e => e.id === eventId);
    }
    
    // Search in guide daily matches
    if (!event) {
      event = guideDailyMatches.find(e => e.id === eventId);
    }
    
    if (event) {
      setSelectedEventData(event);
      selectEvent(eventId);
    }
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    clearSelection();
    setSelectedEventData(null);
  };

  return (
    <ProfilePreviewProvider>
      <AppLayout>
        <SEO title="Home | VITANA" description="VITANA Home Dashboard - Your wellness journey starts here" canonical={window.location.href} />
        <SubNavigation items={homeNavigation} />
        
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
          <StandardHeader
            title={greeting}
            description="Your wellness journey starts today."
            emoji={emoji}
          />

          {/* Utility Action Button */}
          <UtilityActionButton
            trailingElement={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => window.location.reload()}
                title="Refresh page"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            }
          >
            <ExpandableSearchButton 
              placeholder="Search today's content, events, or media…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setMasterActionOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Action
            </Button>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="today">📅 Today</SplitBarTrigger>
              <SplitBarTrigger value="guide">🧭 Guide</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="today">
              <div className="mt-6">
                {/* HERO: Discover People Section */}
                <div className="mb-8 bg-card rounded-2xl p-6 shadow-lg border border-border/50">
                  <PeopleDiscoveryHero />
                </div>

                {/* Priority of the Day Banner */}
                <div className="my-6">
                  <PriorityOfDayBanner />
                </div>

                {/* Row 1: Scrolling Tracker - Continuous horizontal scroll */}
                <div className="mb-6 overflow-x-hidden w-full min-w-0">
                  <ScrollingRail
                    items={activeScheduledEvents.map((event, index) => ({
                      title: event.title,
                      description: event.description,
                      imageUrl: event.imageUrl,
                      pillar: event.pillar,
                      author: event.author,
                      location: event.location,
                      attendees: event.attendees,
                      timestamp: event.timestamp,
                      showReward: true,
                      rewardPoints: index === 0 ? 5 : index === 1 ? 4 : 8,
                      rewardDescription: index === 0 ? "Earn credits for attending" : index === 1 ? "Earn credits for learning" : "Earn credits for group participation",
                      eventId: event.id,
                      onClick: () => handleEventClick(event.id)
                    }))}
                    speed="medium"
                  />
                </div>

              {/* Row 2: Music List + Two Events (1+2 pattern) */}
              <div className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <MusicListCard 
                    tracks={personalizedMusic || []}
                    title="Recommended for You"
                    className="h-[280px]"
                  />
                </div>
                {transformedCommunityEvents[0] && (
                  <div className="col-span-3">
                    <NewsCard
                      title={transformedCommunityEvents[0].title}
                      description={transformedCommunityEvents[0].description}
                      imageUrl={transformedCommunityEvents[0].imageUrl}
                      pillar={transformedCommunityEvents[0].pillar}
                      author={transformedCommunityEvents[0].author}
                      location={transformedCommunityEvents[0].location}
                      attendees={transformedCommunityEvents[0].attendees}
                      timestamp={transformedCommunityEvents[0].timestamp}
                      showReward={true}
                      rewardPoints={5}
                      rewardDescription="Join this community event"
                      className="h-full min-h-[280px]"
                      eventId={[...todayEvents, ...upcomingEvents][0]?.id}
                      onClick={() => handleEventClick([...todayEvents, ...upcomingEvents][0]?.id)}
                    />
                  </div>
                )}
                {transformedCommunityEvents[1] && (
                  <div className="col-span-3">
                    <NewsCard
                      title={transformedCommunityEvents[1].title}
                      description={transformedCommunityEvents[1].description}
                      imageUrl={transformedCommunityEvents[1].imageUrl}
                      pillar={transformedCommunityEvents[1].pillar}
                      author={transformedCommunityEvents[1].author}
                      location={transformedCommunityEvents[1].location}
                      attendees={transformedCommunityEvents[1].attendees}
                      timestamp={transformedCommunityEvents[1].timestamp}
                      showReward={true}
                      rewardPoints={5}
                      rewardDescription="Join this community event"
                      className="h-full min-h-[280px]"
                      eventId={[...todayEvents, ...upcomingEvents][1]?.id}
                      onClick={() => handleEventClick([...todayEvents, ...upcomingEvents][1]?.id)}
                    />
                  </div>
                )}
              </div>

              <MotivationalBanner variant="partnership" />

              {/* Row 3: Community Events (2+1 pattern) */}
              <div className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
                {transformedCommunityEvents[2] && (
                  <div className="col-span-3">
                    <NewsCard
                      title={transformedCommunityEvents[2].title}
                      description={transformedCommunityEvents[2].description}
                      imageUrl={transformedCommunityEvents[2].imageUrl}
                      pillar={transformedCommunityEvents[2].pillar}
                      author={transformedCommunityEvents[2].author}
                      location={transformedCommunityEvents[2].location}
                      attendees={transformedCommunityEvents[2].attendees}
                      timestamp={transformedCommunityEvents[2].timestamp}
                      showReward={true}
                      rewardPoints={5}
                      rewardDescription="Join this community event"
                      className="h-full min-h-[280px]"
                      eventId={[...todayEvents, ...upcomingEvents][2]?.id}
                      onClick={() => handleEventClick([...todayEvents, ...upcomingEvents][2]?.id)}
                    />
                  </div>
                )}
                {transformedCommunityEvents[3] && (
                  <div className="col-span-3">
                    <NewsCard
                      title={transformedCommunityEvents[3].title}
                      description={transformedCommunityEvents[3].description}
                      imageUrl={transformedCommunityEvents[3].imageUrl}
                      pillar={transformedCommunityEvents[3].pillar}
                      author={transformedCommunityEvents[3].author}
                      location={transformedCommunityEvents[3].location}
                      attendees={transformedCommunityEvents[3].attendees}
                      timestamp={transformedCommunityEvents[3].timestamp}
                      showReward={true}
                      rewardPoints={5}
                      rewardDescription="Join this community event"
                      className="h-full min-h-[280px]"
                      eventId={[...todayEvents, ...upcomingEvents][3]?.id}
                      onClick={() => handleEventClick([...todayEvents, ...upcomingEvents][3]?.id)}
                    />
                  </div>
                )}
                {transformedCommunityEvents[4] && (
                  <div className="col-span-6">
                    <NewsCard
                      title={transformedCommunityEvents[4].title}
                      description={transformedCommunityEvents[4].description}
                      imageUrl={transformedCommunityEvents[4].imageUrl}
                      pillar={transformedCommunityEvents[4].pillar}
                      author={transformedCommunityEvents[4].author}
                      location={transformedCommunityEvents[4].location}
                      attendees={transformedCommunityEvents[4].attendees}
                      timestamp={transformedCommunityEvents[4].timestamp}
                      showReward={true}
                      rewardPoints={5}
                      rewardDescription="Join this community event"
                      className="h-full min-h-[320px] md:min-h-[360px]"
                      eventId={[...todayEvents, ...upcomingEvents][4]?.id}
                      onClick={() => handleEventClick([...todayEvents, ...upcomingEvents][4]?.id)}
                    />
                  </div>
                )}
              </div>

              <MotivationalBanner variant="achievement" />

              {/* Row 4: Podcast List + Two Events (1+2 pattern) */}
              <div className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <PodcastListCard 
                    episodes={personalizedPodcasts || []}
                    title="Recommended Podcasts"
                    className="h-[280px]"
                  />
                </div>
                {transformedCommunityEvents[5] && (
                  <div className="col-span-3">
                    <NewsCard
                      title={transformedCommunityEvents[5].title}
                      description={transformedCommunityEvents[5].description}
                      imageUrl={transformedCommunityEvents[5].imageUrl}
                      pillar={transformedCommunityEvents[5].pillar}
                      author={transformedCommunityEvents[5].author}
                      location={transformedCommunityEvents[5].location}
                      attendees={transformedCommunityEvents[5].attendees}
                      timestamp={transformedCommunityEvents[5].timestamp}
                      showReward={true}
                      rewardPoints={5}
                      rewardDescription="Join this community event"
                      className="h-full min-h-[280px]"
                      eventId={[...todayEvents, ...upcomingEvents][5]?.id}
                      onClick={() => handleEventClick([...todayEvents, ...upcomingEvents][5]?.id)}
                    />
                  </div>
                )}
                {transformedCommunityEvents[6] && (
                  <div className="col-span-3">
                    <NewsCard
                      title={transformedCommunityEvents[6].title}
                      description={transformedCommunityEvents[6].description}
                      imageUrl={transformedCommunityEvents[6].imageUrl}
                      pillar={transformedCommunityEvents[6].pillar}
                      author={transformedCommunityEvents[6].author}
                      location={transformedCommunityEvents[6].location}
                      attendees={transformedCommunityEvents[6].attendees}
                      timestamp={transformedCommunityEvents[6].timestamp}
                      showReward={true}
                      rewardPoints={5}
                      rewardDescription="Join this community event"
                      className="h-full min-h-[280px]"
                      eventId={[...todayEvents, ...upcomingEvents][6]?.id}
                      onClick={() => handleEventClick([...todayEvents, ...upcomingEvents][6]?.id)}
                    />
                  </div>
                )}
              </div>

              <MotivationalBanner variant="partnership" />

              {/* Row 4: More Events & Meetups (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={todayEventsAndMeetups[0]?.title || ""}
                    description={todayEventsAndMeetups[0]?.description}
                    imageUrl={todayEventsAndMeetups[0]?.imageUrl || ""}
                    pillar={todayEventsAndMeetups[0]?.pillar}
                    author={todayEventsAndMeetups[0]?.author}
                    location={todayEventsAndMeetups[0]?.location}
                    attendees={todayEventsAndMeetups[0]?.attendees}
                    timestamp={todayEventsAndMeetups[0]?.timestamp}
                    showReward={true}
                    rewardPoints={8}
                    rewardDescription="Earn credits for joining meetup"
                    eventId={todayEventsAndMeetups[0]?.id}
                    onClick={() => handleEventClick(todayEventsAndMeetups[0]?.id)}
                    className="h-full min-h-[320px] md:min-h-[360px]"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={todayEventsAndMeetups[1]?.title || ""}
                    description={todayEventsAndMeetups[1]?.description}
                    imageUrl={todayEventsAndMeetups[1]?.imageUrl || ""}
                    pillar={todayEventsAndMeetups[1]?.pillar}
                    author={todayEventsAndMeetups[1]?.author}
                    location={todayEventsAndMeetups[1]?.location}
                    attendees={todayEventsAndMeetups[1]?.attendees}
                    timestamp={todayEventsAndMeetups[1]?.timestamp}
                    showReward={true}
                    rewardPoints={6}
                    rewardDescription="Earn credits for hydration challenge"
                    eventId={todayEventsAndMeetups[1]?.id}
                    onClick={() => handleEventClick(todayEventsAndMeetups[1]?.id)}
                    className="h-full min-h-[280px]"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={todayEventsAndMeetups[2]?.title || ""}
                    description={todayEventsAndMeetups[2]?.description}
                    imageUrl={todayEventsAndMeetups[2]?.imageUrl || ""}
                    pillar={todayEventsAndMeetups[2]?.pillar}
                    author={todayEventsAndMeetups[2]?.author}
                    location={todayEventsAndMeetups[2]?.location}
                    attendees={todayEventsAndMeetups[2]?.attendees}
                    timestamp={todayEventsAndMeetups[2]?.timestamp}
                    eventId={todayEventsAndMeetups[2]?.id}
                    onClick={() => handleEventClick(todayEventsAndMeetups[2]?.id)}
                    className="h-full min-h-[280px]"
                  />
                </div>
              </div>

              <MotivationalBanner variant="guidance" />

              {/* Row 4: Latest from Media Hub (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={blendedMediaContent[0]?.title || ""}
                    description={blendedMediaContent[0]?.description}
                    imageUrl={blendedMediaContent[0]?.imageUrl || ""}
                    pillar={blendedMediaContent[0]?.pillar}
                    mediaType={blendedMediaContent[0]?.mediaType}
                    author={blendedMediaContent[0]?.author}
                    timestamp={blendedMediaContent[0]?.timestamp}
                    className="h-full min-h-[280px]"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={blendedMediaContent[1]?.title || ""}
                    description={blendedMediaContent[1]?.description}
                    imageUrl={blendedMediaContent[1]?.imageUrl || ""}
                    pillar={blendedMediaContent[1]?.pillar}
                    mediaType={blendedMediaContent[1]?.mediaType}
                    author={blendedMediaContent[1]?.author}
                    timestamp={blendedMediaContent[1]?.timestamp}
                    className="h-full min-h-[280px]"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={blendedMediaContent[2]?.title || ""}
                    description={blendedMediaContent[2]?.description}
                    imageUrl={blendedMediaContent[2]?.imageUrl || ""}
                    pillar={blendedMediaContent[2]?.pillar}
                    mediaType={blendedMediaContent[2]?.mediaType}
                    author={blendedMediaContent[2]?.author}
                    timestamp={blendedMediaContent[2]?.timestamp}
                    className="h-full min-h-[320px] md:min-h-[360px]"
                  />
                </div>
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="guide">
            <div className="mt-6">
              {/* Row 1: Inspirational Events - first 3 (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={guideInspirationalEvents[0]?.title || ""}
                    description={guideInspirationalEvents[0]?.description}
                    imageUrl={guideInspirationalEvents[0]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[0]?.pillar}
                    author={guideInspirationalEvents[0]?.author}
                    location={guideInspirationalEvents[0]?.location}
                    attendees={guideInspirationalEvents[0]?.attendees}
                    timestamp={guideInspirationalEvents[0]?.timestamp}
                    price={guideInspirationalEvents[0]?.price}
                    eventId={guideInspirationalEvents[0]?.id}
                    onClick={() => handleEventClick(guideInspirationalEvents[0]?.id)}
                    className="h-full min-h-[320px] md:min-h-[360px]"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideInspirationalEvents[1]?.title || ""}
                    description={guideInspirationalEvents[1]?.description}
                    imageUrl={guideInspirationalEvents[1]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[1]?.pillar}
                    author={guideInspirationalEvents[1]?.author}
                    location={guideInspirationalEvents[1]?.location}
                    attendees={guideInspirationalEvents[1]?.attendees}
                    timestamp={guideInspirationalEvents[1]?.timestamp}
                    price={guideInspirationalEvents[1]?.price}
                    eventId={guideInspirationalEvents[1]?.id}
                    onClick={() => handleEventClick(guideInspirationalEvents[1]?.id)}
                    className="h-full min-h-[280px]"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideInspirationalEvents[2]?.title || ""}
                    description={guideInspirationalEvents[2]?.description}
                    imageUrl={guideInspirationalEvents[2]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[2]?.pillar}
                    author={guideInspirationalEvents[2]?.author}
                    location={guideInspirationalEvents[2]?.location}
                    attendees={guideInspirationalEvents[2]?.attendees}
                    timestamp={guideInspirationalEvents[2]?.timestamp}
                    price={guideInspirationalEvents[2]?.price}
                    eventId={guideInspirationalEvents[2]?.id}
                    onClick={() => handleEventClick(guideInspirationalEvents[2]?.id)}
                    className="h-full min-h-[280px]"
                  />
                </div>
              </div>

              <MotivationalBanner variant="achievement" />

              {/* Row 2: Remaining Inspirational Event + first 2 Daily Matches (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={guideInspirationalEvents[3]?.title || ""}
                    description={guideInspirationalEvents[3]?.description}
                    imageUrl={guideInspirationalEvents[3]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[3]?.pillar}
                    author={guideInspirationalEvents[3]?.author}
                    location={guideInspirationalEvents[3]?.location}
                    attendees={guideInspirationalEvents[3]?.attendees}
                    timestamp={guideInspirationalEvents[3]?.timestamp}
                    price={guideInspirationalEvents[3]?.price}
                    eventId={guideInspirationalEvents[3]?.id}
                    onClick={() => handleEventClick(guideInspirationalEvents[3]?.id)}
                    className="h-full min-h-[280px]"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideDailyMatches[0]?.title || ""}
                    description={guideDailyMatches[0]?.description}
                    imageUrl={guideDailyMatches[0]?.imageUrl || ""}
                    pillar={guideDailyMatches[0]?.pillar}
                    author={guideDailyMatches[0]?.author}
                    location={guideDailyMatches[0]?.location}
                    timestamp={guideDailyMatches[0]?.timestamp}
                    eventId={guideDailyMatches[0]?.id}
                    onClick={() => handleEventClick(guideDailyMatches[0]?.id)}
                    className="h-full min-h-[280px]"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={guideDailyMatches[1]?.title || ""}
                    description={guideDailyMatches[1]?.description}
                    imageUrl={guideDailyMatches[1]?.imageUrl || ""}
                    pillar={guideDailyMatches[1]?.pillar}
                    author={guideDailyMatches[1]?.author}
                    location={guideDailyMatches[1]?.location}
                    timestamp={guideDailyMatches[1]?.timestamp}
                    eventId={guideDailyMatches[1]?.id}
                    onClick={() => handleEventClick(guideDailyMatches[1]?.id)}
                    className="h-full min-h-[320px] md:min-h-[360px]"
                  />
                </div>
              </div>

              <MotivationalBanner variant="guidance" />

              {/* Row 3: Remaining Daily Matches (big + small + small) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <NewsCard
                    title={guideDailyMatches[2]?.title || ""}
                    description={guideDailyMatches[2]?.description}
                    imageUrl={guideDailyMatches[2]?.imageUrl || ""}
                    pillar={guideDailyMatches[2]?.pillar}
                    author={guideDailyMatches[2]?.author}
                    location={guideDailyMatches[2]?.location}
                    timestamp={guideDailyMatches[2]?.timestamp}
                    eventId={guideDailyMatches[2]?.id}
                    onClick={() => handleEventClick(guideDailyMatches[2]?.id)}
                    className="h-full min-h-[320px] md:min-h-[360px]"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideDailyMatches[3]?.title || ""}
                    description={guideDailyMatches[3]?.description}
                    imageUrl={guideDailyMatches[3]?.imageUrl || ""}
                    pillar={guideDailyMatches[3]?.pillar}
                    author={guideDailyMatches[3]?.author}
                    location={guideDailyMatches[3]?.location}
                    timestamp={guideDailyMatches[3]?.timestamp}
                    eventId={guideDailyMatches[3]?.id}
                    onClick={() => handleEventClick(guideDailyMatches[3]?.id)}
                    className="h-full min-h-[280px]"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideDailyMatches[4]?.title || ""}
                    description={guideDailyMatches[4]?.description}
                    imageUrl={guideDailyMatches[4]?.imageUrl || ""}
                    pillar={guideDailyMatches[4]?.pillar}
                    author={guideDailyMatches[4]?.author}
                    location={guideDailyMatches[4]?.location}
                    timestamp={guideDailyMatches[4]?.timestamp}
                    eventId={guideDailyMatches[4]?.id}
                    onClick={() => handleEventClick(guideDailyMatches[4]?.id)}
                    className="h-full min-h-[280px]"
                  />
                </div>
              </div>

              <MotivationalBanner variant="partnership" />

              {/* Row 4: Meetup Discovery - reusing inspirational events (small + small + big) */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-3">
                  <NewsCard
                    title={guideInspirationalEvents[0]?.title || ""}
                    description={guideInspirationalEvents[0]?.description}
                    imageUrl={guideInspirationalEvents[0]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[0]?.pillar}
                    author={guideInspirationalEvents[0]?.author}
                    location={guideInspirationalEvents[0]?.location}
                    attendees={guideInspirationalEvents[0]?.attendees}
                    timestamp={guideInspirationalEvents[0]?.timestamp}
                    price={guideInspirationalEvents[0]?.price}
                    eventId={guideInspirationalEvents[0]?.id}
                    onClick={() => handleEventClick(guideInspirationalEvents[0]?.id)}
                    className="h-full min-h-[280px]"
                  />
                </div>
                <div className="col-span-3">
                  <NewsCard
                    title={guideInspirationalEvents[1]?.title || ""}
                    description={guideInspirationalEvents[1]?.description}
                    imageUrl={guideInspirationalEvents[1]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[1]?.pillar}
                    author={guideInspirationalEvents[1]?.author}
                    location={guideInspirationalEvents[1]?.location}
                    attendees={guideInspirationalEvents[1]?.attendees}
                    timestamp={guideInspirationalEvents[1]?.timestamp}
                    price={guideInspirationalEvents[1]?.price}
                    eventId={guideInspirationalEvents[1]?.id}
                    onClick={() => handleEventClick(guideInspirationalEvents[1]?.id)}
                    className="h-full min-h-[280px]"
                  />
                </div>
                <div className="col-span-6">
                  <NewsCard
                    title={guideInspirationalEvents[2]?.title || ""}
                    description={guideInspirationalEvents[2]?.description}
                    imageUrl={guideInspirationalEvents[2]?.imageUrl || ""}
                    pillar={guideInspirationalEvents[2]?.pillar}
                    author={guideInspirationalEvents[2]?.author}
                    location={guideInspirationalEvents[2]?.location}
                    attendees={guideInspirationalEvents[2]?.attendees}
                    timestamp={guideInspirationalEvents[2]?.timestamp}
                    price={guideInspirationalEvents[2]?.price}
                    eventId={guideInspirationalEvents[2]?.id}
                    onClick={() => handleEventClick(guideInspirationalEvents[2]?.id)}
                    className="h-full min-h-[320px] md:min-h-[360px]"
                  />
                </div>
              </div>
            </div>
          </SplitBarContent>
        </SplitBar>
      </div>
      
      {/* Master Action Popup */}
      <MasterActionPopup 
        open={masterActionOpen} 
        onOpenChange={setMasterActionOpen}
      />
      
      
      {/* Event Details Drawer */}
      {selectedEventData && (
        <MeetupDetailsDrawer
          event={selectedEventData}
          open={!!selectedEventId}
          onOpenChange={(open) => {
            if (!open) {
              handleDrawerClose();
            }
          }}
        />
      )}
      </div>
    </AppLayout>
    
    <ProfilePreviewDialog />
  </ProfilePreviewProvider>
  );
}