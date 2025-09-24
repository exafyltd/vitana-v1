import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { CreateMeetupPopup } from '@/components/CreateMeetupPopup';
import { EditMeetupPopup } from '@/components/EditMeetupPopup';
import { useCommunityEvents } from '@/hooks/useCommunityEvents';
import { supabase } from "@/integrations/supabase/client";
import { communityNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { NewsCard } from '@/components/crossover/NewsCard';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';
import { useState, useEffect } from "react";
import happyCoffeeGroup from '@/assets/happy-coffee-group.jpg';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  Users, 
  Search, 
  Calendar,
  Plus,
  Heart,
  Activity,
  BookOpen,
  Edit
} from 'lucide-react';

// Featured dummy events for hybrid display
const featuredTodayEvents = [
  {
    id: "dummy-today-1",
    title: "Coffee & Community Connections",
    description: "Join fellow community members for morning coffee, meaningful conversations, and new friendships",
    start_time: new Date().toISOString(),
    location: "Downtown Café Hub",
    participant_count: 18,
    max_participants: 25,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Social",
    imageUrl: happyCoffeeGroup,
    author: { name: "Community Connect", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" },
    category: "community"
  },
  {
    id: "dummy-today-2", 
    title: "Healthy Cooking Workshop",
    description: "Learn to prepare nutritious meals with local organic ingredients",
    start_time: new Date().toISOString(),
    location: "Community Kitchen",
    participant_count: 12,
    max_participants: 15,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Nutrition",
    // imageUrl omitted to use curated fallback
    author: { name: "Chef Maria", avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=64&h=64&fit=crop&crop=faces" },
    category: "wellness"
  },
  {
    id: "dummy-today-3",
    title: "HIIT Fitness Bootcamp", 
    description: "High-intensity interval training session for all fitness levels",
    start_time: new Date().toISOString(),
    location: "Fitness Studio",
    participant_count: 20,
    max_participants: 25,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Exercise",
    // imageUrl omitted to use curated fallback
    author: { name: "FitLife Trainers", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&crop=faces" },
    category: "fitness"
  },
  {
    id: "dummy-today-4",
    title: "Lunchtime Stretch & Mobility", 
    description: "Quick full-body mobility routine to boost your afternoon energy",
    start_time: new Date().toISOString(),
    location: "Wellness Studio",
    participant_count: 10,
    max_participants: 20,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Exercise",
    author: { name: "FitLife Trainers", avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=64&h=64&fit=crop&crop=faces" },
    category: "fitness"
  },
  {
    id: "dummy-today-5",
    title: "Mindful Nature Walk", 
    description: "Slow paced mindful walk focusing on breath and senses",
    start_time: new Date().toISOString(),
    location: "Riverside Park",
    participant_count: 18,
    max_participants: 25,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Mental",
    author: { name: "Nature Explorers", avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=64&h=64&fit=crop&crop=faces" },
    category: "wellness"
  },
  {
    id: "dummy-today-6",
    title: "Evening Community Run", 
    description: "5K community run for all levels with pacers",
    start_time: new Date().toISOString(),
    location: "City Track",
    participant_count: 22,
    max_participants: 40,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Exercise",
    author: { name: "Run Together", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=64&h=64&fit=crop&crop=faces" },
    category: "fitness"
  }
];

const featuredUpcomingEvents = [
  {
    id: "dummy-upcoming-1",
    title: "Weekend Hiking Adventure",
    description: "Explore local trails and connect with nature while getting great exercise",
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    location: "Mountain Trail",
    participant_count: 25,
    max_participants: 30,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Exercise",
    // imageUrl omitted to use curated fallback
    author: { name: "Nature Explorers", avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=64&h=64&fit=crop&crop=faces" },
    category: "outdoor"
  },
  {
    id: "dummy-upcoming-2",
    title: "Stress Management Seminar",
    description: "Learn practical techniques for managing daily stress and anxiety",
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Therapy Center", 
    participant_count: 12,
    max_participants: 18,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Mental",
    // imageUrl omitted to use curated fallback
    author: { name: "Dr. Sarah Wilson", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=64&h=64&fit=crop&crop=faces" },
    category: "wellness"
  },
  {
    id: "dummy-upcoming-3",
    title: "Plant-Based Cooking Class",
    description: "Master the art of delicious and nutritious plant-based meals",
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Culinary School",
    participant_count: 16, 
    max_participants: 20,
    created_by: "dummy",
    event_type: "meetup",
    pillar: "Nutrition",
    // imageUrl omitted to use curated fallback
    author: { name: "Green Kitchen Academy", avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=64&h=64&fit=crop&crop=faces" },
    category: "wellness"
  },
  {
    id: "dummy-upcoming-4",
    title: "Sleep Hygiene Bootcamp",
    description: "Transform your sleep routine with evidence-based techniques",
    start_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Sleep Lab",
    participant_count: 15,
    max_participants: 18,
    created_by: "dummy", 
    event_type: "meetup",
    pillar: "Sleep",
    // imageUrl omitted to use curated fallback
    author: { name: "Sleep Wellness Center", avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=64&h=64&fit=crop&crop=faces" },
    category: "wellness"
  }
];

// URL sanitizer to avoid broken placeholders
const sanitizeUrl = (url?: string) => {
  if (!url) return undefined;
  const s = String(url).trim();
  if (!s) return undefined;
  const lower = s.toLowerCase();
  // Reject unsafe or temporary schemes and known bad placeholders
  if (
    lower.startsWith('blob:') ||
    lower.startsWith('data:') ||
    lower.startsWith('javascript:') ||
    lower.startsWith('about:') ||
    s.includes('undefined') ||
    s.startsWith('/api/placeholder')
  ) {
    return undefined;
  }
  const isHttp = /^https?:\/\//i.test(s);
  const isAsset = s.startsWith('/assets/');
  return (isHttp || isAsset) ? s : undefined;
};

// Transform event data to NewsCard format
const transformEventToNewsCard = (event: any, currentUserId?: string, onEdit?: (event: any) => void) => {
  const rawImage = event.image_url || event.imageUrl;
  const safeImage = sanitizeUrl(rawImage);
  const imageUrl = safeImage ?? generateImageUrl(event.title, event.description);

  const baseAuthor = event.author || { name: event.organizer_name || 'Community', avatar: undefined };
  const authorAvatar = sanitizeUrl(baseAuthor.avatar) ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop&crop=faces';

  const canEdit = currentUserId && event.created_by === currentUserId && !event.id?.startsWith('dummy');

  return {
    title: event.title,
    description: event.description,
    imageUrl,
    category: event.category || 'community',
    pillar: event.category || 'community',
    author: { name: baseAuthor.name, avatar: authorAvatar },
    location: event.location || 'TBA',
    attendees: event.participant_count || 0,
    timestamp: formatEventTime(event.start_time),
    ...(canEdit && onEdit && {
      actions: (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(event);
          }}
          className="ml-2"
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
      )
    })
  };
};

// Generate contextual image based on meetup content
const generateImageUrl = (title: string, description: string) => {
  const text = `${title} ${description || ''}`.toLowerCase();

  const urls = {
    yoga: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&auto=format&q=80',
    cooking: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=1200&auto=format&q=80',
    hiking: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&q=80',
    fitness: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&auto=format&q=80',
    mental: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&q=80',
    sleep: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=1200&auto=format&q=80',
    community: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&q=80',
  } as const;

  if (text.match(/yoga|meditation|mindfulness/)) return urls.yoga;
  if (text.match(/cooking|nutrition|food|recipe/)) return urls.cooking;
  if (text.match(/hiking|outdoor|nature|trail/)) return urls.hiking;
  if (text.match(/fitness|workout|exercise|hiit/)) return urls.fitness;
  if (text.match(/stress|mental|therapy|wellness/)) return urls.mental;
  if (text.match(/sleep|rest|recovery/)) return urls.sleep;
  if (text.match(/social|networking|community/)) return urls.community;

  return urls.community;
};

const formatEventTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
};

const renderEventGrid = (events: any[], currentUserId?: string, onEdit?: (event: any) => void) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No meetups scheduled</h3>
        <p className="text-muted-foreground">Create your first meetup to bring the community together!</p>
      </div>
    );
  }

  const rows = [];
  
  // Group events into rows of 3 using CTO-approved patterns
  for (let i = 0; i < events.length; i += 3) {
    const rowEvents = events.slice(i, i + 3);
    const isEvenRow = Math.floor(i / 3) % 2 === 0;
    
    rows.push(
      <div key={i} className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
        {isEvenRow ? (
          // Row pattern: big + small + small
          <>
            <div className="col-span-6">
              <NewsCard
                key={`${i}-0`}
                {...transformEventToNewsCard(rowEvents[0], currentUserId, onEdit)}
                className="h-full min-h-[320px] md:min-h-[360px]"
              />
            </div>
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  {...transformEventToNewsCard(rowEvents[1], currentUserId, onEdit)}
                  className="h-full min-h-[280px]"
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-2`}
                  {...transformEventToNewsCard(rowEvents[2], currentUserId, onEdit)}
                  className="h-full min-h-[280px]"
                />
              </div>
            )}
          </>
        ) : (
          // Row pattern: small + small + big
          <>
            {rowEvents[0] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-0`}
                  {...transformEventToNewsCard(rowEvents[0], currentUserId, onEdit)}
                  className="h-full min-h-[280px]"
                />
              </div>
            )}
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  {...transformEventToNewsCard(rowEvents[1], currentUserId, onEdit)}
                  className="h-full min-h-[280px]"
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-6">
              <NewsCard
                key={`${i}-2`}
                {...transformEventToNewsCard(rowEvents[2], currentUserId, onEdit)}
                className="h-full min-h-[320px] md:min-h-[360px]"
              />
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  
  return <div className="px-6">{rows}</div>;
};

const Meetups = () => {
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const [editMeetupOpen, setEditMeetupOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const { 
    events,
    todayEvents,
    upcomingEvents,
    loading,
    searchQuery,
    searchEvents
  } = useCommunityEvents();

  // Get current user ID for edit permissions
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setEditMeetupOpen(true);
  };

  // Build a list with at least 12 items prioritizing primary, then secondary, then featured
  const buildPaddedList = (primary: any[], secondary: any[], featured: any[]) => {
    const byId = new Set<string>();
    const result: any[] = [];

    const pushUnique = (arr: any[]) => {
      for (const e of arr) {
        const id = e.id || `${e.title}-${e.start_time}`;
        if (!byId.has(id)) {
          byId.add(id);
          result.push(e);
        }
        if (result.length >= 12) break;
      }
    };

    pushUnique(primary);
    if (result.length < 12) pushUnique(secondary);
    if (result.length < 12) pushUnique(featured);

    return result;
  };

  const todayList = buildPaddedList(todayEvents, upcomingEvents, featuredTodayEvents);
  const upcomingList = buildPaddedList(upcomingEvents, todayEvents, featuredUpcomingEvents);

  return (
    <AppLayout>
      <SEO title="Meetups | Community" description="Discover and join local meetups and events" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Meetups"
          description="Find and attend local wellness meetups and community events."
          emoji="🤝"
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <ExpandableSearchButton 
            placeholder="Search Meetups…"
            onSearch={searchEvents}
          />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setCreateMeetupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            MeetUp
          </Button>
        </UtilityActionButton>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading meetups...</p>
          </div>
        ) : (
          <SplitBar defaultValue="today" className="mt-6">
            <SplitBarList className="grid w-full grid-cols-2">
              <SplitBarTrigger value="today">Today</SplitBarTrigger>
              <SplitBarTrigger value="upcoming">Upcoming</SplitBarTrigger>
            </SplitBarList>
            <SplitBarContent value="today" className="mt-6">
              {renderEventGrid(todayList, currentUserId, handleEditEvent)}
            </SplitBarContent>
            <SplitBarContent value="upcoming" className="mt-6">
              {renderEventGrid(upcomingList, currentUserId, handleEditEvent)}
            </SplitBarContent>
          </SplitBar>
        )}
      </div>

      {/* Create Meetup Popup */}
      <CreateMeetupPopup 
        isOpen={createMeetupOpen} 
        onClose={() => setCreateMeetupOpen(false)}
      />

      {/* Edit Meetup Popup */}
      {selectedEvent && (
        <EditMeetupPopup 
          isOpen={editMeetupOpen} 
          onClose={() => {
            setEditMeetupOpen(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
        />
      )}
    </AppLayout>
  );
};

export default withScreenId(Meetups, SCREEN_IDS.COMMUNITY_MEETUPS);