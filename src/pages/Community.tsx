import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "sonner";
import { useAutopilotComplete } from "@/hooks/useAutopilotComplete";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from '@/components/ui/utility-action-button';
import { ExpandableSearchButton } from '@/components/ui/expandable-search-button';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';
import AutopilotWidget from "@/components/health/AutopilotWidget";
import { AutopilotPopup } from '@/components/AutopilotPopup';
import { CommunityFiltersPopup } from '@/components/CommunityFiltersPopup';
import { NewsCard } from '@/components/crossover/NewsCard';
import { MotivationalBanner } from '@/components/MotivationalBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAutopilot } from '@/hooks/use-autopilot';
import { withScreenId, SCREEN_IDS } from '@/lib/screen-id';
import { Users, Calendar, Award, TrendingUp, Star, Trophy, Crown, Medal, Sparkles, Heart, MapPin, Clock, UserPlus, Search, Plus, Radio, Play, Music, Target, Brain, Apple, Droplets, Moon, Dumbbell, RefreshCw } from 'lucide-react';
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import { communityNavigation } from "@/config/navigation";
import { MusicListCard } from '@/components/home/MusicListCard';
import { PodcastListCard } from '@/components/home/PodcastListCard';
import { usePersonalizedMedia } from '@/hooks/usePersonalizedMedia';
import { MeetupDetailsDrawer } from '@/components/meetups/MeetupDetailsDrawer';
import { useEventSelection } from '@/context/EventSelectionContext';
import { useCommunityMembers } from '@/hooks/useCommunityMembers';
import { useEventRecommendations } from '@/hooks/useEventRecommendations';
import { HorizontalCardList } from '@/components/ui/horizontal-card-list';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileCommunityNav } from '@/components/community/MobileCommunityNav';
import { MobileEntryCard } from '@/components/community/MobileEntryCard';
import { 
  transformMemberRankingToCard,
  transformGroupRankingToCard,
  transformEventRankingToCard,
  transformCreatorRankingToCard
} from '@/lib/rankingsCardTransformers';
import { notifyError, notifyInfo, t } from '@/lib/i18n-toast';

// Mock fallback data for Today Highlights
const todayHighlights = [
  {
    id: "today-1",
    title: "Morning Run Club 🏃‍♀️",
    description: "Start your day with energy and community spirit at sunrise",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Exercise",
    author: { name: "Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    authorId: "8b2d3e4f-5678-9abc-def0-123456789abc",
    location: "City Park",
    attendees: 32,
    timestamp: "07:00",
    start_time: new Date(new Date().setHours(7, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
    rewardPoints: 8,
    rewardDescription: "Join the run for fitness credits"
  },
  {
    id: "today-2",
    title: "Mindful Break Podcast",
    description: "\"Breathing for Focus\" - A guided meditation session",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop",
    category: "media" as const,
    pillar: "Mental",
    author: { name: "Dr. Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    authorId: "8a3c1f2e-4567-89ab-cdef-234567890abc",
    authorHandle: "lisachen",
    location: "Podcast Studio",
    timestamp: "New Episode",
    start_time: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(12, 30, 0, 0)).toISOString(),
    rewardPoints: 4,
    rewardDescription: "Listen and share for wellness credits"
  },
  {
    id: "today-3",
    title: "Community Hydration Challenge 💪",
    description: "Join 85 participants in our daily water tracking challenge",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "challenge" as const,
    pillar: "Hydration",
    author: { name: "Dr. Roberts", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
    authorId: "c5a4daf9-190a-4a9e-9638-d6b32f85244a",
    location: "Virtual",
    attendees: 85,
    timestamp: "10:00",
    start_time: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    end_time: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
    rewardPoints: 12,
    rewardDescription: "Complete hydration goals for bonus credits"
  }
];

// Mock fallback for weekly events
const weeklyEvents = [
  {
    id: "weekly-1",
    title: "Longevity Dance Night 💃",
    description: "Express yourself through movement and colorful lights",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Exercise",
    author: { name: "Dance Team", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Community Center",
    attendees: 45,
    timestamp: "Friday 20:00",
    start_time: new Date(new Date().setDate(new Date().getDate() + ((5 - new Date().getDay() + 7) % 7))).setHours(20, 0, 0, 0),
    end_time: new Date(new Date().setDate(new Date().getDate() + ((5 - new Date().getDay() + 7) % 7))).setHours(22, 0, 0, 0),
    rewardPoints: 10,
    rewardDescription: "Dance for fitness and social credits"
  },
  {
    id: "weekly-2",
    title: "Nutrition Workshop 🍎",
    description: "Learn to prep fresh, healthy meals in your kitchen",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    category: "workshop" as const,
    pillar: "Nutrition",
    author: { name: "Chef Emma", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Community Kitchen",
    attendees: 18,
    timestamp: "Sunday 11:00",
    start_time: new Date(new Date().setDate(new Date().getDate() + ((7 - new Date().getDay()) % 7))).setHours(11, 0, 0, 0),
    end_time: new Date(new Date().setDate(new Date().getDate() + ((7 - new Date().getDay()) % 7))).setHours(13, 0, 0, 0),
    rewardPoints: 6,
    rewardDescription: "Learn nutrition skills for wellness credits"
  },
  {
    id: "weekly-3",
    title: "AI Spotlight: Sleep & Recovery Circle ✨",
    description: "Discover personalized sleep optimization in cozy evening sessions",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "ai-spotlight" as const,
    pillar: "Sleep",
    author: { name: "Sleep Expert James", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Wellness Center",
    attendees: 12,
    timestamp: "Every Wednesday",
    start_time: new Date(new Date().setDate(new Date().getDate() + ((3 - new Date().getDay() + 7) % 7))).setHours(19, 0, 0, 0),
    end_time: new Date(new Date().setDate(new Date().getDate() + ((3 - new Date().getDay() + 7) % 7))).setHours(20, 30, 0, 0),
    rewardPoints: 15,
    rewardDescription: "AI-powered sleep improvement rewards"
  }
].map(e => ({
  ...e,
  start_time: new Date(e.start_time).toISOString(),
  end_time: new Date(e.end_time).toISOString()
}));

// Discover People
const communityPeople = [
  {
    id: "people-1",
    title: "Connect with Jovana T. 👩‍💻",
    description: "Tech wellness enthusiast with 12 mutual groups",
    imageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=800&h=600&fit=crop",
    category: "profile" as const,
    pillar: "Mental",
    author: { name: "Jovana T.", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    authorId: "demo-jovana",
    authorHandle: "jovanat",
    location: "Digital Nomad",
    timestamp: "Online Now",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    rewardPoints: 5,
    rewardDescription: "Connect with new people for social credits"
  },
  {
    id: "people-2",
    title: "Dr. Roberts - Hydration Expert 🩺",
    description: "Leading wellness doctor and Hydration Challenge host",
    imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=600&fit=crop",
    category: "profile" as const,
    pillar: "Hydration",
    author: { name: "Dr. Roberts", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
    authorId: "demo-dr-roberts",
    authorHandle: "drroberts",
    location: "Medical Center",
    timestamp: "Available for consult",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    rewardPoints: 8,
    rewardDescription: "Book consultation for wellness credits"
  },
  {
    id: "people-3",
    title: "Mariia - Wellness Ambassador 🌸",
    description: "Inspiring wellness influencer and community leader",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop",
    category: "profile" as const,
    pillar: "Mental",
    author: { name: "Mariia", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    authorId: "demo-mariia",
    authorHandle: "mariia",
    location: "Wellness Studio",
    timestamp: "Active in community",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    rewardPoints: 6,
    rewardDescription: "Follow wellness ambassador for inspiration credits"
  }
];

// Community Media
const communityMedia = [
  {
    id: "media-1",
    title: "Evening Yoga Flow Replay 🎥",
    description: "Relaxing sunset yoga session for stress relief",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "video" as const,
    pillar: "Mental",
    author: { name: "Yoga Instructor Lisa", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Yoga Studio",
    timestamp: "45 min video",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 2700000).toISOString(),
    rewardPoints: 7,
    rewardDescription: "Watch wellness videos for mindfulness credits"
  },
  {
    id: "media-2",
    title: "3 Easy Morning Stretches 🎬",
    description: "Quick balcony wellness routine to energize your day",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "shorts" as const,
    pillar: "Exercise",
    author: { name: "Fitness Coach Mike", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Home Studio",
    timestamp: "5 min routine",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 300000).toISOString(),
    rewardPoints: 3,
    rewardDescription: "Try quick routines for exercise credits"
  },
  {
    id: "media-3",
    title: "Focus Beats for Study Playlist 🎵",
    description: "Curated music to enhance concentration and productivity",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    category: "music" as const,
    pillar: "Mental",
    author: { name: "VITANA Music", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Music Studio",
    timestamp: "2h playlist",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
    rewardPoints: 2,
    rewardDescription: "Listen to wellness music for mental health credits"
  }
];

// Rankings Data - Top Groups
const topGroups = [
  {
    id: "group-1",
    title: "Sleep & Recovery Circle",
    description: "The ultimate bedtime relaxation community with 1,240 members",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "group" as const,
    pillar: "Sleep",
    author: { name: "Sleep Community", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Virtual Rooms",
    members: 1240,
    activeMembers: 856,
    growthRate: 15,
    engagementScore: 92,
    postsThisWeek: 124,
    organizer: {
      name: "Sleep Community Team",
      id: "org-sleep-123",
      avatar: "/lovable-uploads/james-davis-avatar.jpg"
    },
    trend: "up" as const,
    attendees: 1240,
    timestamp: "Most Active",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString()
  },
  {
    id: "group-2",
    title: "Longevity Dance Club",
    description: "Neon dance floor energy with 980 passionate dancers",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    category: "group" as const,
    pillar: "Exercise",
    author: { name: "Dance Community", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Dance Studios",
    members: 980,
    activeMembers: 672,
    growthRate: 12,
    engagementScore: 88,
    postsThisWeek: 98,
    organizer: {
      name: "Dance Team Lead",
      id: "org-dance-456",
      avatar: "/lovable-uploads/emma-wilson-avatar.jpg"
    },
    trend: "up" as const,
    attendees: 980,
    timestamp: "2nd Place",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString()
  },
  {
    id: "group-3",
    title: "Plant-Based Nutritionists",
    description: "Fresh vegan cuisine experts with 860 food lovers",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "group" as const,
    pillar: "Nutrition",
    author: { name: "Nutrition Community", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Community Kitchens",
    members: 860,
    activeMembers: 594,
    growthRate: 18,
    engagementScore: 85,
    postsThisWeek: 87,
    organizer: {
      name: "Chef Tae Min",
      id: "org-nutrition-789",
      avatar: "/lovable-uploads/tae-min-avatar.jpg"
    },
    trend: "up" as const,
    attendees: 860,
    timestamp: "3rd Place",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString()
  }
];

// Top Events (This Week)
const topEvents = [
  {
    id: "event-1",
    title: "Hydration Challenge Kickoff",
    description: "45 participants joining the community water tracking event",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "challenge" as const,
    pillar: "Hydration",
    author: { name: "Dr. Roberts", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
    location: "Virtual & Local",
    attendees: 45,
    registrations: 67,
    completionRate: 87,
    averageRating: 4.8,
    repeatAttendees: 23,
    organizer: {
      name: "Dr. Roberts",
      id: "user-roberts-456",
      avatar: "/lovable-uploads/dr-roberts-avatar.jpg"
    },
    timestamp: "This Week",
    start_time: new Date(Date.now() + 86400000).toISOString(),
    end_time: new Date(Date.now() + 90000000).toISOString()
  },
  {
    id: "event-2",
    title: "Mindful Eating Circle",
    description: "30 participants sharing healthy recipes and mindful techniques",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "circle" as const,
    pillar: "Nutrition",
    author: { name: "Nutritionist Tae", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Community Center",
    attendees: 30,
    registrations: 42,
    completionRate: 92,
    averageRating: 4.7,
    repeatAttendees: 18,
    organizer: {
      name: "Nutritionist Tae Min",
      id: "user-tae-789",
      avatar: "/lovable-uploads/tae-min-avatar.jpg"
    },
    timestamp: "Weekly",
    start_time: new Date(Date.now() + 172800000).toISOString(),
    end_time: new Date(Date.now() + 176400000).toISOString()
  },
  {
    id: "event-3",
    title: "Evening Sleep Workshop",
    description: "25 participants learning better sleep quality techniques",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "workshop" as const,
    pillar: "Sleep",
    author: { name: "Sleep Expert Lisa", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Wellness Center",
    attendees: 25,
    registrations: 35,
    completionRate: 85,
    averageRating: 4.9,
    repeatAttendees: 15,
    organizer: {
      name: "Lisa Chen",
      id: "user-lisa-321",
      avatar: "/lovable-uploads/lisa-chen-avatar.jpg"
    },
    timestamp: "Every Thursday",
    start_time: new Date(Date.now() + 259200000).toISOString(),
    end_time: new Date(Date.now() + 262800000).toISOString()
  }
];

// Top Creators
const topCreators = [
  {
    id: "8a3c1f2e-4567-89ab-cdef-234567890abc",
    handle: "lisachen",
    title: "Lisa Chen - Wellness Guru",
    description: "Hosted 12 amazing events this month in yoga and mindfulness",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "creator" as const,
    pillar: "Mental",
    author: { name: "Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Yoga Studio",
    eventsHosted: 12,
    totalAttendees: 342,
    averageRating: 4.9,
    impactScore: 95,
    repeatRate: 78,
    specialization: "Mental",
    timestamp: "12 Events Hosted",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString()
  },
  {
    id: "7b2d3e4f-5678-9abc-def0-345678901bcd",
    handle: "trainermike",
    title: "Trainer Mike - Fitness Pro",
    description: "Led 9 high-energy fitness bootcamps with incredible results",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "creator" as const,
    pillar: "Exercise",
    author: { name: "Trainer Mike", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Fitness Studio",
    eventsHosted: 9,
    totalAttendees: 287,
    averageRating: 4.7,
    impactScore: 89,
    repeatRate: 72,
    specialization: "Exercise",
    timestamp: "9 Bootcamps Led",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString()
  },
  {
    id: "6c1e2f3a-6789-abcd-ef01-456789012cde",
    handle: "chefemma",
    title: "Chef Emma - Culinary Expert",
    description: "Created 6 inspiring cooking workshops with healthy recipes",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    category: "creator" as const,
    pillar: "Nutrition",
    author: { name: "Chef Emma", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Community Kitchen",
    eventsHosted: 6,
    totalAttendees: 198,
    averageRating: 4.8,
    impactScore: 87,
    repeatRate: 85,
    specialization: "Nutrition",
    timestamp: "6 Workshops Created",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString()
  }
];

// Top VITANA Members
const topVitanaMembers = [
  {
    user_id: 'c5a4daf9-190a-4a9e-9638-d6b32f85244a',
    handle: 'dragan',
    display_name: 'Dragan Stevanovic',
    avatar_url: 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/avatars/c5a4daf9-190a-4a9e-9638-d6b32f85244a/avatar-1756882693975.png',
    vitana_score: 894,
    vitana_tier: 'Elite',
    score_trend: 'up' as const,
    pillar_scores: {
      sleep: 182,
      exercise: 190,
      nutrition: 185,
      hydration: 178,
      mental: 159
    },
    wellness_streak_days: 56,
    score_30d_change: 72,
    total_activities: 267,
    rank_change: 1,
    percentile: 99,
    monthly_leader: true,
    achievements: [
      { title: '🏆 50-Day Streak', description: 'Completed goals for 50 days straight', earned_at: '2024-01-20' }
    ]
  },
  {
    user_id: '8f3b2c1d-4567-89ab-cdef-123456789abc',
    handle: 'sarahmitchell',
    display_name: 'Sarah Mitchell',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    vitana_score: 892,
    vitana_tier: 'Excellent',
    score_trend: 'up' as const,
    pillar_scores: {
      sleep: 178,
      exercise: 185,
      nutrition: 182,
      hydration: 175,
      mental: 172
    },
    wellness_streak_days: 47,
    score_30d_change: 65,
    total_activities: 234,
    rank_change: 2,
    percentile: 98,
    monthly_leader: true,
    achievements: [
      { title: '🏆 30-Day Streak', description: 'Completed goals for 30 days straight', earned_at: '2024-01-15' }
    ]
  },
  {
    user_id: '7a2b1c3d-5678-9abc-def0-234567890bcd',
    handle: 'marcusjohnson',
    display_name: 'Marcus Johnson',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    vitana_score: 875,
    vitana_tier: 'Excellent',
    score_trend: 'stable' as const,
    pillar_scores: {
      sleep: 180,
      exercise: 190,
      nutrition: 175,
      hydration: 170,
      mental: 160
    },
    wellness_streak_days: 32,
    score_30d_change: 12,
    total_activities: 189,
    rank_change: 0,
    percentile: 97,
    monthly_leader: false
  },
  {
    user_id: '6b1c2d3e-6789-abcd-ef01-345678901cde',
    handle: 'emilyrodriguez',
    display_name: 'Emily Rodriguez',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    vitana_score: 831,
    vitana_tier: 'Good',
    score_trend: 'up' as const,
    pillar_scores: {
      sleep: 165,
      exercise: 172,
      nutrition: 168,
      hydration: 162,
      mental: 164
    },
    wellness_streak_days: 21,
    score_30d_change: 48,
    total_activities: 156
  }
];

// Spotlight Data
const spotlightFeatures = [
  {
    id: "spotlight-1",
    title: "Featured Group: Sleep & Recovery Circle",
    description: "Join our most popular night-time community for better rest",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "featured-group" as const,
    pillar: "Sleep",
    author: { name: "Sleep Community", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Virtual Rooms",
    attendees: 1240,
    timestamp: "Join Now",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString()
  },
  {
    id: "spotlight-2",
    title: "Featured Event: Mindful Eating Circle",
    description: "Experience mindful nutrition with our colorful shared meal community",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "featured-event" as const,
    pillar: "Nutrition",
    author: { name: "Nutritionist Tae", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Community Center",
    attendees: 30,
    timestamp: "Next Session",
    start_time: new Date(Date.now() + 86400000).toISOString(),
    end_time: new Date(Date.now() + 90000000).toISOString()
  },
  {
    id: "spotlight-3",
    title: "Featured Creator: Lisa Chen - Longevity Ambassador",
    description: "Meet our inspiring yoga studio leader transforming lives daily",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "featured-creator" as const,
    pillar: "Mental",
    author: { name: "Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Yoga Studio",
    timestamp: "Follow Her Journey",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString()
  },
  {
    id: "spotlight-4",
    title: "AI Spotlight Suggestion 🤖",
    description: "Based on your wellness goals, join this Hydration Challenge 💧",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "ai-suggestion" as const,
    pillar: "Hydration",
    author: { name: "VITANA AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Personalized for You",
    timestamp: "Start Today",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 86400000).toISOString()
  }
];

// Community Highlights
const highlightsData = [
  {
    id: "highlight-1",
    title: "🏆 Mindful Morning Warriors",
    description: "Top community group this week with 247 active members crushing their daily meditation goals!",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop",
    category: "group" as const,
    pillar: "Mental",
    author: { name: "Community Ranking", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Featured Group",
    attendees: 247,
    timestamp: "Top Performer",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    className: "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-yellow-500/10 before:to-orange-500/10 before:pointer-events-none border border-yellow-500/20"
  },
  {
    id: "highlight-2",
    title: "Featured Creator: Sarah Miller",
    description: "This week's most inspiring community leader with 89 wellness posts",
    imageUrl: "/lovable-uploads/sarah-miller-avatar.jpg",
    category: "person" as const,
    pillar: "Exercise",
    author: { name: "Community Spotlight", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Top Creator",
    timestamp: "Week Champion",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    className: "border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-purple-500/5"
  },
  {
    id: "highlight-3",
    title: "Rising Star Group",
    description: "Urban Hiking Club - fastest growing community this month!",
    imageUrl: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=300&fit=crop",
    category: "group" as const,
    pillar: "Exercise",
    author: { name: "Community Growth", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Trending",
    attendees: 156,
    timestamp: "2x Growth",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    className: "border border-green-500/20 bg-gradient-to-r from-green-500/5 to-emerald-500/5"
  }
];

// Enhanced render grid function with interactive action buttons and global row counter
const renderEventGrid = (
  events: any[], 
  section?: string, 
  startingRowIndex: number = 0, 
  onEventClick?: (eventId: string) => void,
  followContext?: {
    user: any;
    followStatus: Map<string, boolean>;
    setFollowStatus: React.Dispatch<React.SetStateAction<Map<string, boolean>>>;
    setFollowLoading: React.Dispatch<React.SetStateAction<Set<string>>>;
    followLoading: Set<string>;
  }
) => {
  const rows = [];
  let currentRowIndex = startingRowIndex;
  
  // Helper function to get category based on event data
  const getCategory = (event: any) => {
    if (section === "Discover People" || event.category === "people") return "people";
    if (event.category === "group" || event.members !== undefined) return "group";
    if (event.category === "video" || event.category === "music" || event.category === "shorts" || event.mediaType) return "media";
    if (event.category === "event" || event.category === "challenge") return "event";
    return "community";
  };

  // Helper function to handle action clicks
  const handleActionClick = async (event: any) => {
    const category = getCategory(event);
    switch (category) {
      case "event":
        console.log(`Joining event: ${event.title}`);
        break;
      case "people": {
        if (!followContext) return;
        
        const targetUserId = event.authorId || event.id;
        
        if (targetUserId?.startsWith('demo-')) {
          notifyInfo('toasts.community.thisDemoProfileFollowFunctionalityAvailable');
          return;
        }
        
        if (!followContext.user) {
          notifyError('toasts.community.pleaseSignFollowUsers');
          return;
        }
        
        const isCurrentlyFollowing = followContext.followStatus.get(targetUserId) || false;
        
        followContext.setFollowStatus(prev => new Map(prev).set(targetUserId, !isCurrentlyFollowing));
        followContext.setFollowLoading(prev => new Set(prev).add(targetUserId));
        
        try {
          if (isCurrentlyFollowing) {
            const { error } = await supabase
              .from('user_follows')
              .delete()
              .eq('follower_id', followContext.user.id)
              .eq('following_id', targetUserId);
            
            if (error) throw error;
            
            toast.success(`Unfollowed ${event.author?.name || event.title}`);
          } else {
            const { error } = await supabase
              .from('user_follows')
              .insert({
                follower_id: followContext.user.id,
                following_id: targetUserId
              });
            
            if (error) throw error;
            
            toast.success(`Now following ${event.author?.name || event.title}!`);
          }
        } catch (error) {
          followContext.setFollowStatus(prev => new Map(prev).set(targetUserId, isCurrentlyFollowing));
          console.error('Error toggling follow:', error);
          notifyError('toasts.community.failedUpdateFollowStatusPleaseTry');
        } finally {
          followContext.setFollowLoading(prev => {
            const next = new Set(prev);
            next.delete(targetUserId);
            return next;
          });
        }
        break;
      }
      case "media":
        console.log(`Playing: ${event.title}`);
        break;
      case "group":
        console.log(`Joining group: ${event.title}`);
        break;
      default:
        console.log(`Viewing: ${event.title}`);
    }
  };

  // Helper function to get AI Spotlight styling
  const getAISpotlightStyling = (event: any) => {
    if (event.category === "ai-spotlight" || event.category === "ai-suggestion") {
      return "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/10 before:via-purple-500/10 before:to-pink-500/10 before:pointer-events-none border border-blue-500/30 shadow-lg shadow-blue-500/20 animate-pulse";
    }
    return "";
  };
  
  // Group events into rows of 3 using CTO-approved global alternating patterns
  for (let i = 0; i < events.length; i += 3) {
    const rowEvents = events.slice(i, i + 3);
    const isEvenRow = currentRowIndex % 2 === 0;
    
    rows.push(
      <div key={i} className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
        {isEvenRow ? (
          // Row pattern: big + small + small (1+2)
          <>
          <div className="col-span-6">
              <NewsCard
                key={`${i}-0`}
                title={rowEvents[0]?.title || ""}
                description={rowEvents[0]?.description}
                imageUrl={rowEvents[0]?.imageUrl || ""}
                category={getCategory(rowEvents[0])}
                pillar={rowEvents[0]?.pillar}
                author={rowEvents[0]?.author}
                authorId={rowEvents[0]?.authorId}
                authorHandle={rowEvents[0]?.authorHandle}
                isFollowing={followContext?.followStatus.get(rowEvents[0]?.authorId || '') || false}
                isFollowLoading={followContext?.followLoading.has(rowEvents[0]?.authorId || '')}
                location={rowEvents[0]?.location}
                attendees={rowEvents[0]?.attendees}
                timestamp={rowEvents[0]?.timestamp}
                rewardPoints={rowEvents[0]?.rewardPoints}
                rewardDescription={rowEvents[0]?.rewardDescription}
                className={`h-full min-h-[320px] md:min-h-[360px] ${getAISpotlightStyling(rowEvents[0])}`}
                showSmartAction={true}
                onActionClick={() => handleActionClick(rowEvents[0])}
                eventId={rowEvents[0]?.id}
                onClick={() => onEventClick?.(rowEvents[0]?.id)}
              />
            </div>
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  title={rowEvents[1].title}
                  description={rowEvents[1].description}
                  imageUrl={rowEvents[1].imageUrl}
                  category={getCategory(rowEvents[1])}
                  pillar={rowEvents[1].pillar}
                  author={rowEvents[1].author}
                  authorId={rowEvents[1]?.authorId}
                  authorHandle={rowEvents[1]?.authorHandle}
                  isFollowing={followContext?.followStatus.get(rowEvents[1]?.authorId || '') || false}
                  isFollowLoading={followContext?.followLoading.has(rowEvents[1]?.authorId || '')}
                  location={rowEvents[1].location}
                  attendees={rowEvents[1].attendees}
                  timestamp={rowEvents[1].timestamp}
                  rewardPoints={rowEvents[1]?.rewardPoints}
                  rewardDescription={rowEvents[1]?.rewardDescription}
                  className={`h-full min-h-[280px] ${getAISpotlightStyling(rowEvents[1])}`}
                  showSmartAction={true}
                  onActionClick={() => handleActionClick(rowEvents[1])}
                  eventId={rowEvents[1]?.id}
                  onClick={() => onEventClick?.(rowEvents[1]?.id)}
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-2`}
                  title={rowEvents[2].title}
                  description={rowEvents[2].description}
                  imageUrl={rowEvents[2].imageUrl}
                  category={getCategory(rowEvents[2])}
                  pillar={rowEvents[2].pillar}
                  author={rowEvents[2].author}
                  authorId={rowEvents[2]?.authorId}
                  authorHandle={rowEvents[2]?.authorHandle}
                  isFollowing={followContext?.followStatus.get(rowEvents[2]?.authorId || '') || false}
                  isFollowLoading={followContext?.followLoading.has(rowEvents[2]?.authorId || '')}
                  location={rowEvents[2].location}
                  attendees={rowEvents[2].attendees}
                  timestamp={rowEvents[2].timestamp}
                  rewardPoints={rowEvents[2]?.rewardPoints}
                  rewardDescription={rowEvents[2]?.rewardDescription}
                  className={`h-full min-h-[280px] ${getAISpotlightStyling(rowEvents[2])}`}
                  showSmartAction={true}
                  onActionClick={() => handleActionClick(rowEvents[2])}
                  eventId={rowEvents[2]?.id}
                  onClick={() => onEventClick?.(rowEvents[2]?.id)}
                />
              </div>
            )}
          </>
        ) : (
          // Row pattern: small + small + big (2+1)
          <>
            {rowEvents[0] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-0`}
                  title={rowEvents[0].title}
                  description={rowEvents[0].description}
                  imageUrl={rowEvents[0].imageUrl}
                  category={getCategory(rowEvents[0])}
                  pillar={rowEvents[0].pillar}
                  author={rowEvents[0].author}
                  authorId={rowEvents[0]?.authorId}
                  authorHandle={rowEvents[0]?.authorHandle}
                  isFollowing={followContext?.followStatus.get(rowEvents[0]?.authorId || '') || false}
                  isFollowLoading={followContext?.followLoading.has(rowEvents[0]?.authorId || '')}
                  location={rowEvents[0].location}
                  attendees={rowEvents[0].attendees}
                  timestamp={rowEvents[0].timestamp}
                  rewardPoints={rowEvents[0]?.rewardPoints}
                  rewardDescription={rowEvents[0]?.rewardDescription}
                  className={`h-full min-h-[280px] ${getAISpotlightStyling(rowEvents[0])}`}
                  showSmartAction={true}
                  onActionClick={() => handleActionClick(rowEvents[0])}
                  eventId={rowEvents[0]?.id}
                  onClick={() => onEventClick?.(rowEvents[0]?.id)}
                />
              </div>
            )}
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  title={rowEvents[1].title}
                  description={rowEvents[1].description}
                  imageUrl={rowEvents[1].imageUrl}
                  category={getCategory(rowEvents[1])}
                  pillar={rowEvents[1].pillar}
                  author={rowEvents[1].author}
                  authorId={rowEvents[1]?.authorId}
                  authorHandle={rowEvents[1]?.authorHandle}
                  isFollowing={followContext?.followStatus.get(rowEvents[1]?.authorId || '') || false}
                  isFollowLoading={followContext?.followLoading.has(rowEvents[1]?.authorId || '')}
                  location={rowEvents[1].location}
                  attendees={rowEvents[1].attendees}
                  timestamp={rowEvents[1].timestamp}
                  rewardPoints={rowEvents[1]?.rewardPoints}
                  rewardDescription={rowEvents[1]?.rewardDescription}
                  className={`h-full min-h-[280px] ${getAISpotlightStyling(rowEvents[1])}`}
                  showSmartAction={true}
                  onActionClick={() => handleActionClick(rowEvents[1])}
                  eventId={rowEvents[1]?.id}
                  onClick={() => onEventClick?.(rowEvents[1]?.id)}
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-6">
                <NewsCard
                  key={`${i}-2`}
                  title={rowEvents[2].title}
                  description={rowEvents[2].description}
                  imageUrl={rowEvents[2].imageUrl}
                  category={getCategory(rowEvents[2])}
                  pillar={rowEvents[2].pillar}
                  author={rowEvents[2].author}
                  authorId={rowEvents[2]?.authorId}
                  authorHandle={rowEvents[2]?.authorHandle}
                  isFollowing={followContext?.followStatus.get(rowEvents[2]?.authorId || '') || false}
                  isFollowLoading={followContext?.followLoading.has(rowEvents[2]?.authorId || '')}
                  location={rowEvents[2].location}
                  attendees={rowEvents[2].attendees}
                  timestamp={rowEvents[2].timestamp}
                  rewardPoints={rowEvents[2]?.rewardPoints}
                  rewardDescription={rowEvents[2]?.rewardDescription}
                  className={`h-full min-h-[320px] md:min-h-[360px] ${getAISpotlightStyling(rowEvents[2])}`}
                  showSmartAction={true}
                  onActionClick={() => handleActionClick(rowEvents[2])}
                  eventId={rowEvents[2]?.id}
                  onClick={() => onEventClick?.(rowEvents[2]?.id)}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
    currentRowIndex++;
  }
  
  return { content: <div className="px-6">{rows}</div>, nextRowIndex: currentRowIndex };
};

export default withScreenId(function Community() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { todayEvents, upcomingEvents } = useCommunityEvents();
  const { completeBySourceRef } = useAutopilotComplete();
  useEffect(() => { completeBySourceRef('onboarding_explore'); }, [completeBySourceRef]);
  const { pendingCount, getLatestActions } = useAutopilot();
  const { selectedEventId, selectEvent, clearSelection } = useEventSelection();
  const [selectedEventData, setSelectedEventData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState("7d");
  const [scope, setScope] = useState("global");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [communityFiltersOpen, setCommunityFiltersOpen] = useState(false);
  
  // Follow state management
  const { user } = useAuth();
  const [followStatus, setFollowStatus] = useState<Map<string, boolean>>(new Map());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
  
  // Phase 1: Real Community Members
  const { members, loading: membersLoading, getDisplayName } = useCommunityMembers();
  
  // Phase 2: AI Recommendations
  const { 
    recommendations, 
    loading: recsLoading, 
    generating, 
    generateRecommendations 
  } = useEventRecommendations();
  
  // Phase 3: Real-Time Activity Metrics
  const [activityMetrics, setActivityMetrics] = useState({
    activeToday: 0,
    eventsToday: 0,
    totalMembers: 0
  });
  
  const latestActions = getLatestActions(2);

  // Mobile users should never see /comm - redirect to Events
  useEffect(() => {
    if (isMobile) {
      navigate('/comm/events-meetups?tab=hot', { replace: true });
    }
  }, [isMobile, navigate]);

  // Fetch real activity metrics
  useEffect(() => {
    if (isMobile) return; // Skip for mobile since we redirect
    
    const fetchMetrics = async () => {
      try {
        // Count today's events
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { count: todayEventsCount } = await supabase
          .from('global_community_events')
          .select('*', { count: 'exact', head: true })
          .gte('start_time', today.toISOString())
          .lt('start_time', tomorrow.toISOString());

        // Count visible community members
        const { count: membersCount } = await supabase
          .from('global_community_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_visible', true);

        setActivityMetrics({
          activeToday: membersCount || 0,
          eventsToday: todayEventsCount || 0,
          totalMembers: membersCount || 0
        });
      } catch (error) {
        console.error('Error fetching activity metrics:', error);
      }
    };

    fetchMetrics();
  }, [isMobile]);

  // Fetch follow statuses when people data loads
  useEffect(() => {
    if (isMobile) return; // Skip for mobile since we redirect
    if (!user || members.length === 0) return;
    
    const userIds = members
      .slice(0, 6)
      .map(m => m.user_id)
      .filter(id => id && !id.startsWith('demo-')) as string[];
    
    if (userIds.length > 0) {
      const fetchFollowStatuses = async () => {
        try {
          const { data, error } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', user.id)
            .in('following_id', userIds);
          
          if (error) throw error;
          
          const statusMap = new Map<string, boolean>();
          userIds.forEach(id => statusMap.set(id, false));
          data?.forEach(follow => statusMap.set(follow.following_id, true));
          
          setFollowStatus(statusMap);
        } catch (error) {
          console.error('Error fetching follow statuses:', error);
        }
      };
      fetchFollowStatuses();
    }
  }, [members, user, isMobile]);

  // Prevent flash: return null while redirecting on mobile
  if (isMobile) {
    return null;
  }

  // Event click handler for opening detail drawer
  const handleEventClick = (eventId: string) => {
    // Collect ALL events from all sections into one searchable array
    const allEvents = [
      ...todayHighlights,
      ...weeklyEvents,
      ...communityPeople,
      ...communityMedia,
      ...topGroups,
      ...topEvents,
      ...topCreators,
      ...spotlightFeatures,
      ...highlightsData
    ];
    
    // Find the clicked event by ID
    const event = allEvents.find(e => e.id === eventId);
    if (event) {
      setSelectedEventData(event);
      selectEvent(eventId);
    }
  };

  const handleDrawerClose = () => {
    clearSelection();
    setSelectedEventData(null);
  };

  // Transform real events to UI format
  const realTodayHighlights = todayEvents.slice(0, 2).map(event => ({
    id: event.id,
    title: event.title,
    description: event.description || "Join us for this community event",
    imageUrl: event.image_url || "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: event.event_type === 'fitness' ? 'Exercise' : event.event_type === 'workshop' ? 'Nutrition' : 'Mental',
    author: { 
      name: event.creator_display_name || "Community Member", 
      avatar: event.creator_avatar_url || "/lovable-uploads/design-team-avatar.jpg" 
    },
    location: event.location || "Virtual",
    attendees: event.participant_count,
    timestamp: format(new Date(event.start_time), 'HH:mm'),
    rewardPoints: 8,
    rewardDescription: "Join event for wellness credits"
  }));

  // Hybrid: use real events or fall back to the imported mock data
  const activeHighlights = realTodayHighlights.length > 0 ? realTodayHighlights : todayHighlights;

  // Transform upcoming events for weekly view
  const realWeeklyEvents = upcomingEvents.slice(0, 3).map(event => ({
    id: event.id,
    title: event.title,
    description: event.description || "Join us for this community event",
    imageUrl: event.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: event.event_type === 'fitness' ? 'Exercise' : event.event_type === 'workshop' ? 'Nutrition' : 'Mental',
    author: { 
      name: event.creator_display_name || "Community Member", 
      avatar: event.creator_avatar_url || "/lovable-uploads/design-team-avatar.jpg" 
    },
    location: event.location || "Virtual",
    attendees: event.participant_count,
    timestamp: format(new Date(event.start_time), 'EEE HH:mm'),
    rewardPoints: 10,
    rewardDescription: "Join event for wellness credits"
  }));

  // Hybrid: use real events or fall back to the imported mock data  
  const activeWeeklyEvents = realWeeklyEvents.length > 0 ? realWeeklyEvents : weeklyEvents;

  // Phase 1: Transform real community members with fallback
  const realCommunityPeople = members.slice(0, 6).map(member => ({
    id: member.user_id,
    title: `Connect with ${getDisplayName(member)} 👋`,
    description: "Active community member",
    imageUrl: member.avatar_url || "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=800&h=600&fit=crop",
    category: "profile" as const,
    pillar: "Mental",
    author: { 
      name: getDisplayName(member), 
      avatar: member.avatar_url || "/lovable-uploads/design-team-avatar.jpg" 
    },
    authorId: member.user_id,
    authorHandle: member.handle,
    location: "Community Member",
    timestamp: "Active Now",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    rewardPoints: 5,
    rewardDescription: "Connect for social credits"
  }));

  // Always use mock data until real profiles are populated with rich data
  const displayPeople = communityPeople;

  // Phase 2: Transform AI recommendations with fallback
  const aiSpotlightItems = recommendations.length > 0 
    ? recommendations.slice(0, 3).map(rec => ({
        id: rec.global_community_events.id,
        title: `✨ ${rec.global_community_events.title}`,
        description: `AI Match: ${Math.round(rec.match_score * 100)}% - ${Array.isArray(rec.match_reasons) ? rec.match_reasons[0] : 'Recommended for you'}`,
        imageUrl: rec.global_community_events.image_url || `https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop`,
        category: "ai-spotlight" as const,
        pillar: "Mental",
        author: { name: "AI Recommendation", avatar: "/lovable-uploads/design-team-avatar.jpg" },
        timestamp: format(new Date(rec.global_community_events.start_time), "MMM d, h:mm a"),
        location: rec.global_community_events.location || "Virtual",
        attendees: rec.global_community_events.participant_count || 0,
        start_time: rec.global_community_events.start_time,
        end_time: rec.global_community_events.end_time,
        rewardPoints: 15,
        rewardDescription: "AI-powered personalized recommendation"
      }))
    : spotlightFeatures;

  // Community recommended music query
  const { data: communityMusic } = usePersonalizedMedia({
    limit: 5,
    mediaType: 'Music',
    contextTags: ['Popular', 'Community', 'Trending']
  });

  // Community recommended podcasts query
  const { data: communityPodcasts } = usePersonalizedMedia({
    limit: 5,
    mediaType: 'Podcast',
    contextTags: ['Popular', 'Community', 'Trending']
  });

  // Global row counter for continuous alternating pattern
  let globalRowIndex = 0;

  // Mobile-specific minimal Community dashboard
  if (isMobile) {
    return (
      <AppLayout>
        <SEO title={t('screens.community.community')} description="Connect with the community" canonical={window.location.href} />
        <MobileCommunityNav items={communityNavigation} />
        
        <div className="flex flex-col gap-4 p-4 pb-32 min-h-dvh bg-gradient-to-b from-primary/5 to-background">
          {/* Compact Header */}
          <div className="space-y-1 pt-2">
            <h1 className="text-xl font-bold text-foreground">{t('screens.community.community')}</h1>
            <p className="text-sm text-muted-foreground">{t('screens.community.connectShareGrowTogether')}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                🧬 Vitana {activityMetrics.totalMembers || 742}
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Live
              </span>
            </div>
          </div>
          
          {/* Quick Entry Cards - 3 deep links */}
          <div className="space-y-3 mt-4">
            <MobileEntryCard
              icon={<Calendar className="h-5 w-5" />}
              title="Browse Events & MeetUps"
              subtitle="Discover local wellness gatherings"
              to="/comm/events-meetups"
            />
            <MobileEntryCard
              icon={<Radio className="h-5 w-5" />}
              title="Join Live Rooms"
              subtitle="Drop into real-time conversations"
              to="/comm/live-rooms"
            />
            <MobileEntryCard
              icon={<Play className="h-5 w-5" />}
              title="Watch Shorts"
              subtitle="Quick wellness inspiration"
              to="/comm/media-hub?tab=shorts"
            />
          </div>
        </div>
        
        {/* Popups */}
        {autopilotOpen && (
          <AutopilotPopup 
            open={autopilotOpen} 
            onOpenChange={setAutopilotOpen}
          />
        )}
        
        {communityFiltersOpen && (
          <CommunityFiltersPopup 
            open={communityFiltersOpen} 
            onOpenChange={setCommunityFiltersOpen}
          />
        )}
        
        {/* Event Details Drawer */}
        {selectedEventData && (
          <MeetupDetailsDrawer
            event={selectedEventData}
            open={!!selectedEventId}
            onOpenChange={handleDrawerClose}
          />
        )}
      </AppLayout>
    );
  }

  // Desktop layout
  return (
    <AppLayout>
      <SEO title={t('screens.community.community')} description="Connect with the community through groups, events, and matchmaking" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.community.yourCommunityHub')}
            description="Connect, share, and grow together with your wellness community."
            emoji="✨"
          />

          {/* Action Buttons */}
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
              placeholder={t('screens.community.searchCommunity')}
              onSearch={(query) => console.log('Search Community:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setCommunityFiltersOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('screens.community.hub')}
            </Button>
          </UtilityActionButton>

          <SplitBar
            defaultValue="overview"
            className="w-full"
            onValueChange={(v) => {
              // E6 — find_partner is a route-tab, not a content-tab.
              if (v === 'find_partner') navigate('/comm/find-partner');
            }}
          >
          <SplitBarList>
            <SplitBarTrigger value="overview">{t('screens.community.overview')}</SplitBarTrigger>
            <SplitBarTrigger value="rankings">{t('screens.community.rankings')}</SplitBarTrigger>
            <SplitBarTrigger value="spotlight">{t('screens.community.spotlight')}</SplitBarTrigger>
            <SplitBarTrigger value="find_partner">{t('screens.community.findMatch')}</SplitBarTrigger>
          </SplitBarList>

        <SplitBarContent value="overview">
          {/* Live Activity Metrics */}
          <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-medium">{t('screens.community.totalmembersCommunityMembers', { totalMembers: activityMetrics.totalMembers })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{t('screens.community.eventstodayEventsToday', { eventsToday: activityMetrics.eventsToday })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <span>{todayEvents.length + upcomingEvents.length} upcoming activities</span>
              </div>
            </div>
          </Card>

          {/* Today Highlights */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">{t('screens.community.todayHighlights')}</h3>
                {(() => {
                  const result = renderEventGrid(
                    todayHighlights, 
                    "Today Highlights", 
                    globalRowIndex, 
                    handleEventClick,
                    { user, followStatus, setFollowStatus, setFollowLoading, followLoading }
                  );
                  globalRowIndex = result.nextRowIndex;
                  return result.content;
                })()}
              </div>

              {/* Motivational Banner */}
              <div className="px-6 mb-8">
                <MotivationalBanner variant="encouragement" />
              </div>

              {/* This Week in Community */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">{t('screens.community.thisWeekCommunity')}</h3>
                {(() => {
                  const result = renderEventGrid(
                    weeklyEvents, 
                    "This Week in Community", 
                    globalRowIndex, 
                    handleEventClick,
                    { user, followStatus, setFollowStatus, setFollowLoading, followLoading }
                  );
                  globalRowIndex = result.nextRowIndex;
                  return result.content;
                })()}
              </div>

              {/* Community Power Banner */}
              <div className="px-6 mb-8">
                <MotivationalBanner variant="partnership" />
              </div>

              {/* Community Highlights */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4 px-6">
                  <h3 className="text-xl font-bold">{t('screens.community.communityHighlights')}</h3>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-sm"
                    onClick={() => {
                      // Navigate to Rankings tab
                      const rankingsTab = document.querySelector('[data-value="rankings"]') as HTMLElement;
                      rankingsTab?.click();
                    }}
                  >
                    <Trophy className="w-3 h-3 mr-1" />
                    {t('screens.community.viewAllRankings')}
                  </Button>
                </div>
                {(() => {
                  const result = renderEventGrid(
                    highlightsData, 
                    "Community Highlights", 
                    globalRowIndex, 
                    handleEventClick,
                    { user, followStatus, setFollowStatus, setFollowLoading, followLoading }
                  );
                  globalRowIndex = result.nextRowIndex;
                  return result.content;
                })()}
              </div>

              {/* Discover People - Phase 1: Real Community Members */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4 px-6">
                  <h3 className="text-xl font-bold">{t('screens.community.discoverPeople')}</h3>
                  {membersLoading && (
                    <Badge variant="outline" className="animate-pulse">
                      <Users className="w-3 h-3 mr-1" />
                      {t('screens.community.loading')}
                    </Badge>
                  )}
                  {!membersLoading && realCommunityPeople.length > 0 && (
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {members.length} members
                    </Badge>
                  )}
                </div>
                {(() => {
                  const result = renderEventGrid(
                    displayPeople, 
                    "Discover People", 
                    globalRowIndex, 
                    handleEventClick,
                    { user, followStatus, setFollowStatus, setFollowLoading, followLoading }
                  );
                  globalRowIndex = result.nextRowIndex;
                  return result.content;
                })()}
              </div>

              {/* Energetic Banner */}
              <div className="px-6 mb-8">
                <MotivationalBanner variant="achievement" />
              </div>

              {/* Community Media Hub */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">{t('screens.community.communityMedia')}</h3>
                {(() => {
                  const result = renderEventGrid(
                    communityMedia, 
                    "Community Media", 
                    globalRowIndex, 
                    handleEventClick,
                    { user, followStatus, setFollowStatus, setFollowLoading, followLoading }
                  );
                  globalRowIndex = result.nextRowIndex;
                  return result.content;
                })()}
              </div>

              {/* Community Music */}
              <div className="mb-8 px-6">
                <h3 className="text-xl font-bold mb-4">{t('screens.community.communityMusic')}</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    <MusicListCard 
                      tracks={communityMusic || []}
                      title={t('screens.community.trendingYourCommunity')}
                      className="h-[280px]"
                    />
                  </div>
                </div>
              </div>

              {/* Community Podcasts */}
              <div className="mb-8 px-6">
                <h3 className="text-xl font-bold mb-4">{t('screens.community.communityPodcasts')}</h3>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12">
                    <PodcastListCard 
                      episodes={communityPodcasts || []}
                      title={t('screens.community.trendingPodcastEpisodes')}
                      className="h-[280px]"
                    />
                  </div>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="rankings">
              {/* Rankings Controls */}
              <div className={cn(
                "flex flex-wrap items-center rounded-lg mx-6",
                "gap-4 xl:gap-2 p-4 xl:p-3 mb-6 xl:mb-4",
                "bg-white/50"
              )}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t('screens.community.timeframe')}</span>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger className="w-24 h-10 xl:h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">{t('screens.community.today')}</SelectItem>
                      <SelectItem value="7d">{t('screens.community.text7Days')}</SelectItem>
                      <SelectItem value="30d">{t('screens.community.text30Days')}</SelectItem>
                      <SelectItem value="all">{t('screens.community.alltime')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t('screens.community.scope')}</span>
                  <Select value={scope} onValueChange={setScope}>
                    <SelectTrigger className="w-32 h-10 xl:h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">{t('screens.community.global')}</SelectItem>
                      <SelectItem value="region">{t('screens.community.region')}</SelectItem>
                      <SelectItem value="group">{t('screens.community.myGroups')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t('screens.community.category')}</span>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32 h-10 xl:h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('screens.community.allCategories')}</SelectItem>
                      <SelectItem value="sleep">{t('screens.community.sleep')}</SelectItem>
                      <SelectItem value="exercise">{t('screens.community.exercise')}</SelectItem>
                      <SelectItem value="nutrition">{t('screens.community.nutrition')}</SelectItem>
                      <SelectItem value="hydration">{t('screens.community.hydration')}</SelectItem>
                      <SelectItem value="mental">{t('screens.community.mental')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Top 3 Groups */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">{t('screens.community.top3Groups')}</h3>
                <HorizontalCardList
                  items={topGroups.map((group, idx) => 
                    transformGroupRankingToCard(group, idx + 1)
                  )}
                  variant="visual"
                  screenId="COMMUNITY_RANKINGS_GROUPS"
                  listId="rankings-top-groups"
                  groupBy="none"
                  gap="sm"
                  enableVirtualization={false}
                  allowMultipleExpanded={false}
                  emptyState={
                    <div className="text-center py-8 text-muted-foreground">
                      No group rankings available yet
                    </div>
                  }
                />
              </div>

              {/* Motivational Banner */}
              <div className="px-6 mb-8">
                <MotivationalBanner variant="achievement" />
              </div>

              {/* Top Events This Week */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">{t('screens.community.topEventsThisWeek')}</h3>
                <HorizontalCardList
                  items={topEvents.map((event, idx) => 
                    transformEventRankingToCard(event, idx + 1)
                  )}
                  variant="visual"
                  screenId="COMMUNITY_RANKINGS_EVENTS"
                  listId="rankings-top-events"
                  groupBy="none"
                  gap="sm"
                  enableVirtualization={false}
                  allowMultipleExpanded={false}
                  emptyState={
                    <div className="text-center py-8 text-muted-foreground">
                      No event rankings available yet
                    </div>
                  }
                />
              </div>

              {/* Guidance Banner */}
              <div className="px-6 mb-8">
                <MotivationalBanner variant="guidance" />
              </div>

              {/* Top Creators */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">{t('screens.community.topCreators')}</h3>
                <HorizontalCardList
                  items={topCreators.map((creator, idx) => 
                    transformCreatorRankingToCard(creator, idx + 1)
                  )}
                  variant="visual"
                  screenId="COMMUNITY_RANKINGS_CREATORS"
                  listId="rankings-top-creators"
                  groupBy="none"
                  gap="sm"
                  enableVirtualization={false}
                  allowMultipleExpanded={false}
                  emptyState={
                    <div className="text-center py-8 text-muted-foreground">
                      No creator rankings available yet
                    </div>
                  }
                />
              </div>

              {/* Top VITANA Members */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">{t('screens.community.topVitanaMembers')}</h3>
                <HorizontalCardList
                  items={topVitanaMembers.map((member, idx) => 
                    transformMemberRankingToCard(member, idx + 1, 'vitana_index')
                  )}
                  variant="visual"
                  screenId="COMMUNITY_RANKINGS_MEMBERS"
                  listId="rankings-top-members"
                  groupBy="none"
                  gap="sm"
                  enableVirtualization={false}
                  allowMultipleExpanded={false}
                  emptyState={
                    <div className="text-center py-8 text-muted-foreground">
                      No member rankings available yet
                    </div>
                  }
                />
              </div>

              {/* Badges Section */}
              <div className="px-6 mb-8">
                <h3 className="text-xl font-bold mb-4">{t('screens.community.communityBadges')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 text-center border-2 border-orange-200">
                    <Trophy className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <h4 className="font-bold">{t('screens.community.risingStar')}</h4>
                    <p className="text-sm text-muted-foreground">{t('screens.community.drRoberts')}</p>
                  </Card>
                  <Card className="p-4 text-center border-2 border-yellow-200">
                    <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <h4 className="font-bold">{t('screens.community.topHost')}</h4>
                    <p className="text-sm text-muted-foreground">{t('screens.community.lisaChen')}</p>
                  </Card>
                  <Card className="p-4 text-center border-2 border-purple-200">
                    <Heart className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-bold">{t('screens.community.mostInspiring')}</h4>
                    <p className="text-sm text-muted-foreground">{t('screens.community.sarahMiller')}</p>
                  </Card>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="spotlight">
              {/* Phase 2: AI-Powered Recommendations */}
              {recommendations.length === 0 && !recsLoading && (
                <div className="px-6 mb-8">
                  <Card className="p-6 text-center bg-gradient-to-br from-blue-50 to-purple-50">
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                    <h3 className="text-lg font-semibold mb-2">{t('screens.community.getPersonalizedAiRecommendations')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('screens.community.letAiAnalyzeYourWellnessGoals')}
                    </p>
                    <Button 
                      onClick={() => generateRecommendations('events')} 
                      disabled={generating}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing Your Profile...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          {t('screens.community.generateAiRecommendations')}
                        </>
                      )}
                    </Button>
                  </Card>
                </div>
              )}

              {/* AI-Generated Recommendations */}
              {recommendations.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4 px-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{t('screens.community.aiRecommendedForYou')}</h3>
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-500">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {t('screens.community.aiPowered')}
                      </Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => generateRecommendations('events')}
                      disabled={generating}
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${generating ? 'animate-spin' : ''}`} />
                      {t('screens.community.refresh')}
                    </Button>
                  </div>
                  {(() => {
                    let spotlightRowIndex = 0;
                    const result = renderEventGrid(
                      aiSpotlightItems, 
                      "AI Spotlight", 
                      spotlightRowIndex, 
                      handleEventClick,
                      { user, followStatus, setFollowStatus, setFollowLoading, followLoading }
                    );
                    return result.content;
                  })()}
                </div>
              )}

              {/* Featured Content */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 px-6">{t('screens.community.featuredContent')}</h3>
                {(() => {
                  let spotlightRowIndex = recommendations.length > 0 ? 3 : 0;
                  const result = renderEventGrid(
                    spotlightFeatures, 
                    "Spotlight", 
                    spotlightRowIndex, 
                    handleEventClick,
                    { user, followStatus, setFollowStatus, setFollowLoading, followLoading }
                  );
                  return result.content;
                })()}
              </div>

              {/* Motivational Banner */}
              <div className="px-6 mb-8">
                <MotivationalBanner variant="partnership" />
              </div>
            </SplitBarContent>
          </SplitBar>

          {/* Popups */}
          {autopilotOpen && (
            <AutopilotPopup 
              open={autopilotOpen} 
              onOpenChange={setAutopilotOpen}
            />
          )}
          
          {communityFiltersOpen && (
            <CommunityFiltersPopup 
              open={communityFiltersOpen} 
              onOpenChange={setCommunityFiltersOpen}
            />
          )}

          {/* Event Details Drawer */}
          {selectedEventData && (
            <MeetupDetailsDrawer
              event={selectedEventData}
              open={!!selectedEventId}
              onOpenChange={handleDrawerClose}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.COMMUNITY_OVERVIEW);