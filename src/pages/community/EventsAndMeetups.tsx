import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { CreateEventPopup } from '@/components/CreateEventPopup';
import { CreateMeetupPopup } from '@/components/CreateMeetupPopup';
import { CreateSelectionDialog } from '@/components/CreateSelectionDialog';
import { EditMeetupPopup } from '@/components/EditMeetupPopup';
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { communityNavigation } from "@/config/navigation";
import { MotivationalBanner } from '@/components/MotivationalBanner';
import { NewsCard } from '@/components/crossover/NewsCard';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MeetupDetailsDrawer } from "@/components/meetups/MeetupDetailsDrawer";
import { useEventSelection } from "@/context/EventSelectionContext";
import { useCommunityEvents } from '@/hooks/useCommunityEvents';
import { useAuth } from "@/context/AuthProvider";
import { cn } from "@/lib/utils";
import { Plus, Calendar as CalendarIcon, Brain, Users, Edit } from 'lucide-react';
import SocialShareButton from "@/components/sharing/SocialShareButton";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

// Helper functions
const formatEventTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
};

const transformEventToNewsCard = (event: any, onClick?: (event: any) => void, canEdit = false, onEdit?: () => void) => {
  // Construct author object with proper fallback chain
  const authorName = event.creator_display_name || event.author?.name || 'Community Host';
  const authorAvatar = event.creator_avatar_url || event.author?.avatar || '';
  
  return {
    title: event.title,
    description: event.description,
    imageUrl: event.image_url || event.imageUrl,
    category: 'event' as const,
    pillar: event.event_type === 'event' ? 'EVENT' : 'MEETUP',
    author: { 
      name: authorName, 
      avatar: authorAvatar 
    },
    location: event.location,
    attendees: event.participant_count || 0,
    timestamp: formatEventTime(event.start_time),
    price: event.metadata?.is_paid ? Number(event.metadata?.price || 0) : ('free' as const),
    eventId: event.id,
    showSmartAction: true,
    onClick: onClick ? () => onClick(event) : undefined,
    'data-event-id': event.id,
    utilityTopRight: canEdit && onEdit ? (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        <Edit className="h-4 w-4" />
      </Button>
    ) : undefined,
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

// Helper to chunk events into groups of 6 (2 rows of 3)
const chunkEvents = (events: any[], chunkSize = 6) => {
  const chunks = [];
  for (let i = 0; i < events.length; i += chunkSize) {
    chunks.push(events.slice(i, i + chunkSize));
  }
  return chunks;
};

const renderEventGrid = (events: any[], onClick?: (event: any) => void, currentUserId?: string, onEdit?: (event: any) => void) => {
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
    
    const canEdit0 = !!currentUserId && (rowEvents[0].created_by === currentUserId || rowEvents[0].is_co_creator === true) && new Date(rowEvents[0].start_time) > new Date();
    const canEdit1 = rowEvents[1] && !!currentUserId && (rowEvents[1].created_by === currentUserId || rowEvents[1].is_co_creator === true) && new Date(rowEvents[1].start_time) > new Date();
    const canEdit2 = rowEvents[2] && !!currentUserId && (rowEvents[2].created_by === currentUserId || rowEvents[2].is_co_creator === true) && new Date(rowEvents[2].start_time) > new Date();

    rows.push(
      <div key={i} className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
        {isEvenRow ? (
          <>
            <div className="col-span-6">
              <NewsCard
                key={`${i}-0`}
                {...transformEventToNewsCard(rowEvents[0], onClick, canEdit0, () => onEdit?.(rowEvents[0]))}
                className={cn(
                  "h-full transition-all duration-200 cursor-pointer",
                  onClick && "hover:ring-2 hover:ring-primary"
                )}
              />
            </div>
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  {...transformEventToNewsCard(rowEvents[1], onClick, canEdit1, () => onEdit?.(rowEvents[1]))}
                  className={cn(
                    "h-full transition-all duration-200 cursor-pointer",
                    onClick && "hover:ring-2 hover:ring-primary"
                  )}
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-2`}
                  {...transformEventToNewsCard(rowEvents[2], onClick, canEdit2, () => onEdit?.(rowEvents[2]))}
                  className={cn(
                    "h-full transition-all duration-200 cursor-pointer",
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
                  {...transformEventToNewsCard(rowEvents[0], onClick, canEdit0, () => onEdit?.(rowEvents[0]))}
                  className={cn(
                    "h-full transition-all duration-200 cursor-pointer",
                    onClick && "hover:ring-2 hover:ring-primary"
                  )}
                />
              </div>
            )}
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  {...transformEventToNewsCard(rowEvents[1], onClick, canEdit1, () => onEdit?.(rowEvents[1]))}
                  className={cn(
                    "h-full transition-all duration-200 cursor-pointer",
                    onClick && "hover:ring-2 hover:ring-primary"
                  )}
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-6">
                <NewsCard
                  key={`${i}-2`}
                  {...transformEventToNewsCard(rowEvents[2], onClick, canEdit2, () => onEdit?.(rowEvents[2]))}
                  className={cn(
                    "h-full transition-all duration-200 cursor-pointer",
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
  const { events: dbEvents, loading, fetchEvents } = useCommunityEvents();
  const { user } = useAuth();
  
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const [createSelectionOpen, setCreateSelectionOpen] = useState(false);
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

  // Handle deep linking - read ?event= and ?tab from URL on mount
  useEffect(() => {
    const eventParam = searchParams.get('event');
    const tabParam = searchParams.get('tab');
    
    if (eventParam) {
      // Switch to the correct tab if specified
      if (tabParam && (tabParam === 'today' || tabParam === 'upcoming')) {
        setActiveTab(tabParam);
      } else if (!tabParam && dbEvents.length > 0) {
        // Auto-detect tab if not specified
        const event = dbEvents.find(e => e.id === eventParam);
        if (event) {
          const eventDate = new Date(event.start_time);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const detectedTab = (eventDate >= today && eventDate < tomorrow) ? 'today' : 'upcoming';
          setActiveTab(detectedTab);
        }
      }
      
      // Select event and scroll into view
      selectEvent(eventParam);
      setTimeout(() => {
        const card = document.querySelector(`[data-event-id="${eventParam}"]`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [dbEvents]);

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

  // Handle event creation - show the newly created event
  const handleEventCreated = async (eventId: string) => {
    // Wait a bit for the database to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Refresh events
    await fetchEvents();
    
    // Find the event to determine which tab it belongs to
    const event = dbEvents.find(e => e.id === eventId);
    if (event) {
      const eventDate = new Date(event.start_time);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Switch to appropriate tab
      if (eventDate >= today && eventDate < tomorrow) {
        setActiveTab('today');
      } else if (eventDate >= tomorrow) {
        setActiveTab('upcoming');
      }
    }
    
    // Open the detail drawer for the newly created event
    selectEvent(eventId);
    setSearchParams({ event: eventId, tab: activeTab });
    
    // Scroll to the card after a short delay to ensure rendering
    setTimeout(() => {
      const card = document.querySelector(`[data-event-id="${eventId}"]`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
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
  const canEdit = selectedEventData && user && (selectedEventData.created_by === user.id || selectedEventData.is_co_creator === true);

  return (
    <>
      <SEO 
        title="Events & MeetUps" 
        description="Discover and join community events and casual meetups"
      />
      <AppLayout>
        <SubNavigation items={communityNavigation} />
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="flex-1 overflow-hidden">
          <StandardHeader
            title="Events & MeetUps"
            description="Discover formal events and casual meetups in your community"
          />
          
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search events and meetups..." />
            <UniversalCalendarButton />
            <Button 
              onClick={() => setCreateSelectionOpen(true)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
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
                  <>
                    {chunkEvents(todayEvents).map((chunk, chunkIndex) => (
                      <div key={`today-chunk-${chunkIndex}`}>
                        {renderEventGrid(chunk, handleCardClick, user?.id, handleEditEvent)}
                        {chunkIndex < chunkEvents(todayEvents).length - 1 && (
                          <div className="px-6 mb-8 mt-8">
                            <MotivationalBanner variant="encouragement" />
                          </div>
                        )}
                      </div>
                    ))}
                    {todayEvents.length > 0 && (
                      <div className="px-6 mb-8 mt-8">
                        <MotivationalBanner variant="partnership" />
                      </div>
                    )}
                  </>
                )}
              </SplitBarContent>

              <SplitBarContent value="upcoming" className="mt-6">
                {loading ? (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
                    <p className="text-muted-foreground">Loading upcoming events...</p>
                  </div>
                ) : (
                  <>
                    {chunkEvents(upcomingEvents).map((chunk, chunkIndex) => (
                      <div key={`upcoming-chunk-${chunkIndex}`}>
                        {renderEventGrid(chunk, handleCardClick, user?.id, handleEditEvent)}
                        {chunkIndex < chunkEvents(upcomingEvents).length - 1 && (
                          <div className="px-6 mb-8 mt-8">
                            <MotivationalBanner variant="achievement" />
                          </div>
                        )}
                      </div>
                    ))}
                    {upcomingEvents.length > 0 && (
                      <div className="px-6 mb-8 mt-8">
                        <MotivationalBanner variant="guidance" />
                      </div>
                    )}
                  </>
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
        </div>
      </AppLayout>

      {/* Create Selection Dialog */}
      <CreateSelectionDialog
        open={createSelectionOpen}
        onOpenChange={setCreateSelectionOpen}
        onSelectEvent={() => {
          setCreateSelectionOpen(false);
          setCreateEventOpen(true);
        }}
        onSelectMeetup={() => {
          setCreateSelectionOpen(false);
          setCreateMeetupOpen(true);
        }}
      />

      {/* Create Event Popup */}
      <CreateEventPopup 
        isOpen={createEventOpen} 
        onClose={() => setCreateEventOpen(false)}
        eventContext="community"
        onEventCreated={handleEventCreated}
      />

      {/* Create MeetUp Popup */}
      <CreateMeetupPopup
        isOpen={createMeetupOpen}
        onClose={() => setCreateMeetupOpen(false)}
        onEventCreated={handleEventCreated}
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
          onUpdated={fetchEvents}
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
    </>
  );
};

export default withScreenId(EventsAndMeetups, SCREEN_IDS.COMMUNITY_MEETUPS);
