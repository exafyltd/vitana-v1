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
import { useAuth } from "@/context/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MeetupDetailsDrawer } from "@/components/meetups/MeetupDetailsDrawer";
import { useMeetupSelection } from "@/context/MeetupSelectionContext";
import { cn } from "@/lib/utils";
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
  UserPlus,
  UserMinus,
  Share2
} from 'lucide-react';
import { EventKebabMenu } from '@/components/events/EventKebabMenu';
import SocialShareButton from "@/components/sharing/SocialShareButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { t } from '@/lib/i18n-toast';

import { fmtDate, fmtTime } from '@/lib/locale-format';
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
    console.log('[MEETUP-IMG] Rejected URL (dangerous/invalid):', s);
    return undefined;
  }
  
  const isHttp = /^https?:\/\//i.test(s);
  const isAsset = s.startsWith('/assets/');
  const isSupabaseStorage = lower.includes('.supabase.co/storage/');
  
  if (isHttp || isAsset || isSupabaseStorage) {
    console.log('[MEETUP-IMG] Accepted URL:', s);
    return s;
  }
  
  console.log('[MEETUP-IMG] Rejected URL (invalid format):', s);
  return undefined;
};

// Transform event data to NewsCard format
const transformEventToNewsCard = (event: any, currentUserId?: string, onEdit?: (event: any) => void, onClick?: (event: any) => void, onDelete?: (eventId: string) => void, onShare?: (event: any) => void) => {
  const rawImage = event.image_url || event.imageUrl;
  console.log('[MEETUP-IMG] Transform event:', {
    eventId: event.id,
    eventTitle: event.title,
    rawImage,
    hasRawImage: !!rawImage
  });
  
  const safeImage = sanitizeUrl(rawImage);
  const imageUrl = safeImage ?? generateImageUrl(event.title, event.description);
  
  console.log('[MEETUP-IMG] Final image decision:', {
    eventId: event.id,
    rawImage,
    safeImage,
    finalImageUrl: imageUrl,
    usingFallback: !safeImage
  });

  const baseAuthor = event.author || { name: event.organizer_name || 'Community', avatar: undefined };
  const authorAvatar = sanitizeUrl(baseAuthor.avatar) ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop&crop=faces';

  const canEdit = !!currentUserId && (event.created_by === currentUserId || event.createdBy === currentUserId) && !String(event.id || '').startsWith('dummy');

  // Check if event has ticket sales enabled
  const hasTickets = event.metadata?.has_tickets === true;
  const isPaidEvent = event.metadata?.is_paid === true;

  return {
    title: event.title,
    description: event.description,
    imageUrl,
    category: 'event' as const,
    pillar: event.pillar || 'community',
    author: { name: baseAuthor.name, avatar: authorAvatar },
    location: event.location || 'TBA',
    attendees: event.participant_count || 0,
    timestamp: formatEventTime(event.start_time),
    price: isPaidEvent ? Number(event.metadata?.price || 0) : ('free' as const),
    currency: event.metadata?.display_currency || 'USD',
    showSmartAction: true,
    hasTickets,
    isPaidEvent,
    onBuyTicket: (hasTickets || isPaidEvent) ? () => onClick?.(event) : undefined,
    onClick: onClick ? () => onClick(event) : undefined,
    'data-event-id': event.id,
    ...(String(event.id || '').startsWith('dummy')
      ? {
          onActionClick: () => {
            // Use SPA-safe navigation to avoid full page reload
            window.history.pushState({}, '', '/community/meetups');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      : { eventId: String(event.id) }
    ),
    // Top-right utility kebab menu
    utilityTopRight: (
      <EventKebabMenu
        event={event}
        currentUserId={currentUserId}
        onEdit={onEdit ? () => onEdit(event) : undefined}
        onDelete={onDelete}
        onShare={onShare}
        className="text-white hover:bg-white/20"
      />
    ),
    // Bottom row actions: only Share now
    actionButton: (
      <div className="flex items-center gap-2">
        <SocialShareButton
          type="event"
          data={{
            title: event.title,
            description: event.description,
            link: `${window.location.origin}/community/meetups?event=${encodeURIComponent(event.id)}`
          }}
          variant="icon"
          size="sm"
        />
      </div>
    )
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
  const time = fmtTime(date, { hour: '2-digit', minute: '2-digit', hour12: false });
  const day = fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${time}`;
};

const renderEventGrid = (events: any[], currentUserId?: string, onEdit?: (event: any) => void, onClick?: (event: any) => void, onDelete?: (eventId: string) => void, onShare?: (event: any) => void) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">{t('screens.community.noMeetupsScheduled')}</h3>
        <p className="text-muted-foreground">{t('screens.community.createYourFirstMeetupBringCommunity')}</p>
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
                {...transformEventToNewsCard(rowEvents[0], currentUserId, onEdit, onClick, onDelete, onShare)}
                className={cn(
                  "h-full min-h-[320px] md:min-h-[360px] transition-all duration-200 cursor-pointer",
                  onClick && "hover:ring-2 hover:ring-primary"
                )}
              />
            </div>
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  {...transformEventToNewsCard(rowEvents[1], currentUserId, onEdit, onClick, onDelete, onShare)}
                  className={cn(
                    "h-full min-h-[280px] transition-all duration-200 cursor-pointer",
                    onClick && "hover:ring-2 hover:ring-primary"
                  )}
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-2`}
                  {...transformEventToNewsCard(rowEvents[2], currentUserId, onEdit, onClick, onDelete, onShare)}
                  className={cn(
                    "h-full min-h-[280px] transition-all duration-200 cursor-pointer",
                    onClick && "hover:ring-2 hover:ring-primary"
                  )}
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
                  {...transformEventToNewsCard(rowEvents[0], currentUserId, onEdit, onClick, onDelete, onShare)}
                  className={cn(
                    "h-full min-h-[280px] transition-all duration-200 cursor-pointer",
                    onClick && "hover:ring-2 hover:ring-primary"
                  )}
                />
              </div>
            )}
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  {...transformEventToNewsCard(rowEvents[1], currentUserId, onEdit, onClick, onDelete, onShare)}
                  className={cn(
                    "h-full min-h-[280px] transition-all duration-200 cursor-pointer",
                    onClick && "hover:ring-2 hover:ring-primary"
                  )}
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-6">
              <NewsCard
                key={`${i}-2`}
                {...transformEventToNewsCard(rowEvents[2], currentUserId, onEdit, onClick, onDelete, onShare)}
                className={cn(
                  "h-full min-h-[320px] md:min-h-[360px] transition-all duration-200 cursor-pointer",
                  onClick && "hover:ring-2 hover:ring-primary"
                )}
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedMeetupId, selectMeetup, clearSelection } = useMeetupSelection();
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const [editMeetupOpen, setEditMeetupOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  
  
const {
    events,
    todayEvents,
    upcomingEvents,
    loading,
    searchQuery,
    searchEvents
  } = useCommunityEvents();

  // Use auth context for current user ID
  const { user } = useAuth();
  const currentUserId = user?.id || null;

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

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle deep linking with query params
  useEffect(() => {
    const meetupId = searchParams.get('meetup');
    if (meetupId) {
      selectMeetup(meetupId);
      setFocusedCardId(meetupId);
      // Scroll card into view
      setTimeout(() => {
        const card = document.querySelector(`[data-event-id="${meetupId}"]`) as HTMLElement;
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      // Clear selection if no query param
      if (selectedMeetupId) {
        clearSelection();
      }
    }
  }, [searchParams, selectMeetup, clearSelection, selectedMeetupId]);

  // Restore focus when drawer closes
  useEffect(() => {
    if (!selectedMeetupId && focusedCardId) {
      setTimeout(() => {
        const card = document.querySelector(`[data-event-id="${focusedCardId}"]`) as HTMLElement;
        if (card) {
          card.focus();
        }
        setFocusedCardId(null);
      }, 100);
    }
  }, [selectedMeetupId, focusedCardId]);

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setEditMeetupOpen(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (selectedMeetupId === eventId) {
      handleDrawerClose();
    }
  };

  const handleShareEvent = (event: any) => {
    // Use native share or copy link
    const url = `${window.location.origin}/community/meetups?meetup=${encodeURIComponent(event.id)}`;
    if (navigator.share) {
      navigator.share({ title: event.title, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleCardClick = (event: any) => {
    const eventId = event.id;
    // Toggle selection if clicking the same card
    if (selectedMeetupId === eventId) {
      clearSelection();
      setSearchParams({});
    } else {
      selectMeetup(eventId);
      setFocusedCardId(eventId);
      setSearchParams({ meetup: eventId });
    }
  };

  const handleDrawerClose = () => {
    clearSelection();
    setSearchParams({});
  };

  const handleNavigatePrev = () => {
    const allEvents = [...todayList, ...upcomingList];
    const currentIndex = allEvents.findIndex(e => e.id === selectedMeetupId);
    if (currentIndex > 0) {
      const prevEvent = allEvents[currentIndex - 1];
      selectMeetup(prevEvent.id);
      setFocusedCardId(prevEvent.id);
      setSearchParams({ meetup: prevEvent.id });
    }
  };

  const handleNavigateNext = () => {
    const allEvents = [...todayList, ...upcomingList];
    const currentIndex = allEvents.findIndex(e => e.id === selectedMeetupId);
    if (currentIndex < allEvents.length - 1) {
      const nextEvent = allEvents[currentIndex + 1];
      selectMeetup(nextEvent.id);
      setFocusedCardId(nextEvent.id);
      setSearchParams({ meetup: nextEvent.id });
    }
  };

  const allEvents = [...todayList, ...upcomingList];
  const selectedMeetup = allEvents.find(e => e.id === selectedMeetupId);
  const currentIndex = allEvents.findIndex(e => e.id === selectedMeetupId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allEvents.length - 1;

  return (
    <AppLayout>
      <SEO title={t('screens.community.meetupsCommunity')} description="Discover and join local meetups and events" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title={t('screens.community.meetups')}
          description="Find and attend local wellness meetups and community events."
          emoji="🤝"
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <ExpandableSearchButton 
            placeholder={t('screens.community.searchMeetups')}
            onSearch={searchEvents}
          />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setCreateMeetupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('screens.community.meetup2')}
          </Button>
        </UtilityActionButton>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('screens.community.loadingMeetups')}</p>
          </div>
        ) : (
          <SplitBar defaultValue="today" className="mt-6">
            <SplitBarList className="grid w-full grid-cols-2">
              <SplitBarTrigger value="today">{t('screens.community.today')}</SplitBarTrigger>
              <SplitBarTrigger value="upcoming">{t('screens.community.upcoming')}</SplitBarTrigger>
            </SplitBarList>
            <SplitBarContent value="today" className="mt-6">
              {renderEventGrid(todayList, currentUserId, handleEditEvent, handleCardClick, handleDeleteEvent, handleShareEvent)}
            </SplitBarContent>
            <SplitBarContent value="upcoming" className="mt-6">
              {renderEventGrid(upcomingList, currentUserId, handleEditEvent, handleCardClick, handleDeleteEvent, handleShareEvent)}
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

      {/* Meetup Details Drawer */}
      {selectedMeetup && (
        <MeetupDetailsDrawer
          event={selectedMeetup}
          open={!!selectedMeetupId}
          onOpenChange={(open) => {
            if (!open) {
              handleDrawerClose();
            }
          }}
          onNavigatePrev={hasPrev ? handleNavigatePrev : undefined}
          onNavigateNext={hasNext ? handleNavigateNext : undefined}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isMobile={isMobile}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          onShareEvent={handleShareEvent}
        />
      )}
    </AppLayout>
  );
};

export default withScreenId(Meetups, SCREEN_IDS.COMMUNITY_MEETUPS);