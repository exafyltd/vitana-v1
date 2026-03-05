import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { CreateEventPopup } from '@/components/CreateEventPopup';
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { communityNavigation } from "@/config/navigation";
import { NewsCard } from '@/components/crossover/NewsCard';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MeetupDetailsDrawer } from "@/components/meetups/MeetupDetailsDrawer";
import { useEventSelection } from "@/context/EventSelectionContext";
import { cn } from "@/lib/utils";
import { Plus, Apple, Dumbbell, Droplets, Moon, Brain } from 'lucide-react';
import SocialShareButton from "@/components/sharing/SocialShareButton";

// Mock data for events with unique IDs
const todayEvents = [
  {
    id: "today-1",
    title: "Morning Yoga Flow",
    description: "Start your day with energizing yoga poses and breathwork",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Exercise",
    author: { name: "Sarah Johnson", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100" },
    location: "Wellness Studio",
    participant_count: 18,
    max_participants: 25,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    price: 0,
    capacity: 25,
    registered: 18,
  },
  {
    id: "today-2",
    title: "Healthy Cooking Demo",
    description: "Learn to prepare nutritious meals with seasonal ingredients",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Nutrition",
    author: { name: "Emma Wilson", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100" },
    location: "Community Garden",
    participant_count: 25,
    max_participants: 30,
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    price: 0,
    capacity: 30,
    registered: 25,
  },
  {
    id: "today-3",
    title: "HIIT Training Session",
    description: "High-intensity workout designed for maximum results in minimum time",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Exercise",
    author: { name: "Mike Thompson", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100" },
    location: "Fitness Center",
    participant_count: 15,
    max_participants: 20,
    start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    price: 25,
    capacity: 20,
    registered: 15,
  },
  {
    id: "today-4",
    title: "Hydration Workshop",
    description: "Learn optimal hydration strategies for peak performance and health",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Hydration",
    author: { name: "Dr. Roberts", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100" },
    location: "Health Center",
    participant_count: 12,
    max_participants: 15,
    start_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    price: 0,
    capacity: 15,
    registered: 12,
  },
  {
    id: "today-5",
    title: "Sleep Optimization Seminar",
    description: "Evidence-based strategies for improving sleep quality and duration",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Sleep",
    author: { name: "Lisa Chen", avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=100" },
    location: "Sleep Lab",
    participant_count: 20,
    max_participants: 25,
    start_time: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
    price: 45,
    capacity: 25,
    registered: 20,
  },
  {
    id: "today-6",
    title: "Mindful Cooking Class",
    description: "Learn to prepare nutritious meals with mindfulness and intention",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Nutrition",
    author: { name: "Chef Tae", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100" },
    location: "Culinary Studio",
    participant_count: 16,
    max_participants: 20,
    start_time: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 11 * 60 * 60 * 1000).toISOString(),
    price: 55,
    capacity: 20,
    registered: 16,
  }
];

const upcomingEvents = [
  {
    id: "upcoming-1",
    title: "Weekend Wellness Retreat",
    description: "Complete wellness experience with yoga, meditation, and healthy meals",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Mental",
    author: { name: "Wellness Team", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" },
    location: "Retreat Center",
    participant_count: 30,
    max_participants: 50,
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
    price: 150,
    capacity: 50,
    registered: 30,
  },
  {
    id: "upcoming-2",
    title: "Free Fitness Assessment",
    description: "Comprehensive fitness evaluation and personalized recommendations",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Exercise",
    author: { name: "Fitness Team", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100" },
    location: "Gym",
    participant_count: 8,
    max_participants: 15,
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    price: 0,
    capacity: 15,
    registered: 8,
  },
  {
    id: "upcoming-3",
    title: "Nutrition Masterclass",
    description: "Advanced nutrition principles for optimal health and performance",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Nutrition",
    author: { name: "Nutritionist Se Hun", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100" },
    location: "Learning Center",
    participant_count: 22,
    max_participants: 30,
    start_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    price: 65,
    capacity: 30,
    registered: 22,
  },
  {
    id: "upcoming-4",
    title: "Community Water Challenge",
    description: "30-day hydration challenge with daily tracking and prizes",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Hydration",
    author: { name: "Health Coach Murphy", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100" },
    location: "Online & In-Person",
    participant_count: 75,
    max_participants: 100,
    start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    price: 0,
    capacity: 100,
    registered: 75,
  },
  {
    id: "upcoming-5",
    title: "Sleep Therapy Workshop",
    description: "Professional sleep therapy techniques and personalized plans",
    imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Sleep",
    author: { name: "Sleep Therapist James", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100" },
    location: "Therapy Center",
    participant_count: 10,
    max_participants: 12,
    start_time: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    price: 85,
    capacity: 12,
    registered: 10,
  },
  {
    id: "upcoming-6",
    title: "Mental Resilience Training",
    description: "Build psychological strength and emotional intelligence",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Mental",
    author: { name: "Dr. Sarah", avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=100" },
    location: "Psychology Center",
    participant_count: 14,
    max_participants: 18,
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
    price: 75,
    capacity: 18,
    registered: 14,
  }
];

const formatEventTime = (dateString: string) => {
  const date = new Date(dateString);
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${time}`;
};

const transformEventToNewsCard = (event: any, onClick?: (event: any) => void) => {
  // Check if event has ticket sales enabled
  const hasTickets = event.metadata?.has_tickets === true;
  const isPaidEvent = event.metadata?.is_paid === true;
  
  return {
    title: event.title,
    description: event.description,
    imageUrl: event.imageUrl,
    category: event.category,
    pillar: event.pillar,
    author: event.author,
    location: event.location,
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
    actionButton: (
      <SocialShareButton
        type="event"
        data={{
          title: event.title,
          description: event.description,
          link: `${window.location.origin}/community/events?event=${encodeURIComponent(event.id)}`
        }}
        variant="icon"
        size="sm"
      />
    ),
  };
};

const renderEventGrid = (events: any[], onClick?: (event: any) => void) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No events scheduled</h3>
        <p className="text-muted-foreground">Check back soon for upcoming community events!</p>
      </div>
    );
  }

  const rows = [];
  
  for (let i = 0; i < events.length; i += 3) {
    const rowEvents = events.slice(i, i + 3);
    const isEvenRow = Math.floor(i / 3) % 2 === 0;
    
    rows.push(
      <div key={i} className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
        {isEvenRow ? (
          <>
            <div className="col-span-6">
              <NewsCard
                key={`${i}-0`}
                {...transformEventToNewsCard(rowEvents[0], onClick)}
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
                  {...transformEventToNewsCard(rowEvents[1], onClick)}
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
                  {...transformEventToNewsCard(rowEvents[2], onClick)}
                  className={cn(
                    "h-full min-h-[280px] transition-all duration-200 cursor-pointer",
                    onClick && "hover:ring-2 hover:ring-primary"
                  )}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {rowEvents[0] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-0`}
                  {...transformEventToNewsCard(rowEvents[0], onClick)}
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
                  {...transformEventToNewsCard(rowEvents[1], onClick)}
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
                  {...transformEventToNewsCard(rowEvents[2], onClick)}
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

const Events = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedEventId, selectEvent, clearSelection } = useEventSelection();
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [isMobile, setIsMobile] = useState(false);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get all events from current tab
  const currentEvents = activeTab === "today" ? todayEvents : upcomingEvents;
  const visibleEventIds = useMemo(() => currentEvents.map(e => e.id), [currentEvents, activeTab]);

  // Handle deep linking - read ?event= from URL on mount
  useEffect(() => {
    const eventParam = searchParams.get('event');
    if (eventParam) {
      selectEvent(eventParam);
      // Scroll card into view after a small delay
      setTimeout(() => {
        const card = document.querySelector(`[data-event-id="${eventParam}"]`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, []); // Only run on mount

  // Handle card click
  const handleCardClick = (event: any) => {
    setFocusedCardId(event.id);
    selectEvent(event.id);
    setSearchParams({ event: event.id });
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    clearSelection();
    setSearchParams({});
    
    // Restore focus to originating card
    if (focusedCardId) {
      setTimeout(() => {
        const card = document.querySelector(`[data-event-id="${focusedCardId}"]`);
        if (card instanceof HTMLElement) {
          card.focus();
        }
      }, 100);
    }
  };

  // Navigation handlers
  const handleNavigatePrev = () => {
    if (!selectedEventId) return;
    const currentIndex = visibleEventIds.indexOf(selectedEventId);
    if (currentIndex > 0) {
      const prevId = visibleEventIds[currentIndex - 1];
      selectEvent(prevId);
      setSearchParams({ event: prevId });
      setFocusedCardId(prevId);
    }
  };

  const handleNavigateNext = () => {
    if (!selectedEventId) return;
    const currentIndex = visibleEventIds.indexOf(selectedEventId);
    if (currentIndex < visibleEventIds.length - 1) {
      const nextId = visibleEventIds[currentIndex + 1];
      selectEvent(nextId);
      setSearchParams({ event: nextId });
      setFocusedCardId(nextId);
    }
  };

  // Get current event and navigation state
  const selectedEvent = currentEvents.find(e => e.id === selectedEventId);
  const currentIndex = selectedEventId ? visibleEventIds.indexOf(selectedEventId) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < visibleEventIds.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-x-hidden">
      <SEO 
        title="Community Events" 
        description="Discover and join wellness events, workshops, and activities in your community"
      />
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 lg:space-y-8">
            <SubNavigation items={communityNavigation} />
            
            <StandardHeader 
              title="Events"
              description="Discover wellness events, workshops, and activities"
              emoji="📅"
            />

            <div className="flex items-center gap-3 flex-wrap">
              <ExpandableSearchButton />
              <UniversalCalendarButton 
                variant="outline" 
                size="sm" 
                showEventCount={true} 
                showConflictIndicator={true} 
              />
              <Button size="sm" onClick={() => setCreateEventOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>

            <SplitBar defaultValue="today" onValueChange={setActiveTab}>
              <SplitBarList>
                <SplitBarTrigger value="today">☀️ Today</SplitBarTrigger>
                <SplitBarTrigger value="upcoming">📅 Upcoming</SplitBarTrigger>
              </SplitBarList>

              <SplitBarContent value="today">
                {renderEventGrid(todayEvents, handleCardClick)}
              </SplitBarContent>

              <SplitBarContent value="upcoming">
                {renderEventGrid(upcomingEvents, handleCardClick)}
              </SplitBarContent>
            </SplitBar>
          </div>
        </div>
      </AppLayout>

      {/* Event Details Drawer */}
      {selectedEvent && (
        <MeetupDetailsDrawer
          event={selectedEvent}
          open={!!selectedEventId}
          onOpenChange={(open) => {
            if (!open) {
              handleDrawerClose();
            }
          }}
          onNavigatePrev={handleNavigatePrev}
          onNavigateNext={handleNavigateNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          isMobile={isMobile}
        />
      )}

      {/* Create Event Popup */}
      <CreateEventPopup
        isOpen={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
      />
    </div>
  );
};

export default Events;
