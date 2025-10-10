import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { CreateEventPopup } from '@/components/CreateEventPopup';
import { CreateMeetupPopup } from '@/components/CreateMeetupPopup';
import { EditMeetupPopup } from '@/components/EditMeetupPopup';
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { communityNavigation } from "@/config/navigation";
import { NewsCard } from '@/components/crossover/NewsCard';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MeetupDetailsDrawer } from "@/components/meetups/MeetupDetailsDrawer";
import { useEventSelection } from "@/context/EventSelectionContext";
import { useCommunityEvents } from '@/hooks/useCommunityEvents';
import { useAuth } from "@/context/AuthProvider";
import { cn } from "@/lib/utils";
import { Plus, Calendar as CalendarIcon, Brain, Users } from 'lucide-react';
import SocialShareButton from "@/components/sharing/SocialShareButton";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

// Helper functions
const formatEventTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
};

const transformEventToNewsCard = (event: any, onClick?: (event: any) => void, canEdit = false, onEdit?: () => void) => {
  return {
    title: event.title,
    description: event.description,
    imageUrl: event.image_url || event.imageUrl,
    category: event.event_type === 'event' ? 'event' as const : 'community' as const,
    pillar: event.pillar || (event.event_type === 'event' ? 'Event' : 'MeetUp'),
    author: event.author || { name: 'Community', avatar: '' },
    location: event.location,
    attendees: event.participant_count || 0,
    timestamp: formatEventTime(event.start_time),
    showSmartAction: true,
    onClick: onClick ? () => onClick(event) : undefined,
    'data-event-id': event.id,
    isEditable: canEdit,
    onEdit: canEdit ? onEdit : undefined,
    actionButton: (
      <SocialShareButton
        type="event"
        data={{
          title: event.title,
          description: event.description,
          link: `${window.location.origin}/comm/events-meetups?event=${encodeURIComponent(event.id)}`
        }}
        variant="icon"
        size="sm"
      />
    ),
  };
};

const renderEventGrid = (events: any[], onClick?: (event: any) => void, canEdit = false, onEdit?: (event: any) => void) => {
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
                {...transformEventToNewsCard(rowEvents[0], onClick, canEdit, () => onEdit?.(rowEvents[0]))}
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
                  {...transformEventToNewsCard(rowEvents[1], onClick, canEdit, () => onEdit?.(rowEvents[1]))}
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
                  {...transformEventToNewsCard(rowEvents[2], onClick, canEdit, () => onEdit?.(rowEvents[2]))}
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
                  {...transformEventToNewsCard(rowEvents[0], onClick, canEdit, () => onEdit?.(rowEvents[0]))}
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
                  {...transformEventToNewsCard(rowEvents[1], onClick, canEdit, () => onEdit?.(rowEvents[1]))}
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
                  {...transformEventToNewsCard(rowEvents[2], onClick, canEdit, () => onEdit?.(rowEvents[2]))}
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

const EventsAndMeetups = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedEventId, selectEvent, clearSelection } = useEventSelection();
  const { events: dbEvents, loading } = useCommunityEvents();
  const { user } = useAuth();
  
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const [editMeetupOpen, setEditMeetupOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
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

  // Filter events by time
  const todayEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return dbEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= today && eventDate < tomorrow;
    });
  }, [dbEvents]);

  const upcomingEvents = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return dbEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= tomorrow;
    });
  }, [dbEvents]);

  // Get all events from current tab
  const currentEvents = activeTab === "today" ? todayEvents : 
                        activeTab === "upcoming" ? upcomingEvents : [];
  const visibleEventIds = useMemo(() => currentEvents.map(e => e.id), [currentEvents, activeTab]);

  // Handle deep linking - read ?event= from URL on mount
  useEffect(() => {
    const eventParam = searchParams.get('event');
    if (eventParam) {
      selectEvent(eventParam);
      setTimeout(() => {
        const card = document.querySelector(`[data-event-id="${eventParam}"]`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, []);

  // Handle card click
  const handleCardClick = (event: any) => {
    setFocusedCardId(event.id);
    selectEvent(event.id);
    setSearchParams({ event: event.id, tab: activeTab });
  };

  // Handle edit
  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setEditMeetupOpen(true);
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    clearSelection();
    const params = new URLSearchParams(searchParams);
    params.delete('event');
    setSearchParams(params);
    
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
      setSearchParams({ event: prevId, tab: activeTab });
      setFocusedCardId(prevId);
    }
  };

  const handleNavigateNext = () => {
    if (!selectedEventId) return;
    const currentIndex = visibleEventIds.indexOf(selectedEventId);
    if (currentIndex < visibleEventIds.length - 1) {
      const nextId = visibleEventIds[currentIndex + 1];
      selectEvent(nextId);
      setSearchParams({ event: nextId, tab: activeTab });
      setFocusedCardId(nextId);
    }
  };

  // Get current event and navigation state
  const selectedEventData = currentEvents.find(e => e.id === selectedEventId);
  const currentIndex = selectedEventId ? visibleEventIds.indexOf(selectedEventId) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < visibleEventIds.length - 1;
  const canEdit = selectedEventData && user && selectedEventData.created_by === user.id;

  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
      <SEO 
        title="Events & MeetUps" 
        description="Discover and join community events and casual meetups"
      />
      <AppLayout>
        <SubNavigation items={communityNavigation} />
        <div className="flex-1 overflow-hidden">
          <StandardHeader
            title="Events & MeetUps"
            description="Discover formal events and casual meetups in your community"
          />
          
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search events and meetups..." />
            <UniversalCalendarButton />
            <Button 
              onClick={() => setCreateEventOpen(true)}
              size="sm"
              className="gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Create Event</span>
            </Button>
            <Button 
              onClick={() => setCreateMeetupOpen(true)}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Create MeetUp</span>
            </Button>
          </UtilityActionButton>

          <div className="flex-1 overflow-y-auto">
            <SplitBar defaultValue="today" value={activeTab} onValueChange={setActiveTab}>
              <SplitBarList>
                <SplitBarTrigger value="today">
                  ☀️ Today
                </SplitBarTrigger>
                <SplitBarTrigger value="upcoming">
                  📅 Upcoming
                </SplitBarTrigger>
                <SplitBarTrigger value="following">
                  👥 Following
                </SplitBarTrigger>
                <SplitBarTrigger value="recommended">
                  ✨ Recommended
                </SplitBarTrigger>
              </SplitBarList>

              <SplitBarContent value="today" className="mt-6">
                {loading ? (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
                    <p className="text-muted-foreground">Loading today's events...</p>
                  </div>
                ) : (
                  renderEventGrid(todayEvents, handleCardClick, true, handleEditEvent)
                )}
              </SplitBarContent>

              <SplitBarContent value="upcoming" className="mt-6">
                {loading ? (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
                    <p className="text-muted-foreground">Loading upcoming events...</p>
                  </div>
                ) : (
                  renderEventGrid(upcomingEvents, handleCardClick, true, handleEditEvent)
                )}
              </SplitBarContent>

              <SplitBarContent value="following" className="mt-6">
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Posts from People You Follow</h3>
                  <p className="text-muted-foreground mb-4">
                    Content from people and groups you follow will appear here
                  </p>
                  <Button variant="outline">Find People to Follow</Button>
                </div>
              </SplitBarContent>

              <SplitBarContent value="recommended" className="mt-6">
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">AI-Recommended Content</h3>
                  <p className="text-muted-foreground mb-4">
                    Personalized recommendations based on your interests will appear here
                  </p>
                  <Button variant="outline">Update Preferences</Button>
                </div>
              </SplitBarContent>
            </SplitBar>
          </div>
        </div>
      </AppLayout>

      {/* Create Event Popup */}
      <CreateEventPopup
        isOpen={createEventOpen}
        onClose={() => setCreateEventOpen(false)}
      />

      {/* Create MeetUp Popup */}
      <CreateMeetupPopup
        isOpen={createMeetupOpen}
        onClose={() => setCreateMeetupOpen(false)}
      />

      {/* Edit MeetUp Popup */}
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

      {/* Event/MeetUp Details Drawer */}
      {selectedEventData && (
        <MeetupDetailsDrawer
          event={selectedEventData}
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
    </div>
  );
};

export default withScreenId(EventsAndMeetups, SCREEN_IDS.COMMUNITY_MEETUPS);
