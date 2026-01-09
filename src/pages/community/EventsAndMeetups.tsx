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
import { CampaignDialog } from '@/components/sharing/CampaignDialog';
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Plus, Calendar as CalendarIcon, Brain, Users, Edit, Megaphone, Plane } from 'lucide-react';
import SocialShareButton from "@/components/sharing/SocialShareButton";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { generateEventCampaignData } from "@/lib/eventPromotion";
import { getShareUrl } from "@/lib/shareUrl";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileEventCarousel } from "@/components/community/MobileEventCarousel";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

// Helper functions
const formatEventTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
};

// Sanitize and validate image URLs
const sanitizeUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  const s = String(url).trim();
  if (!s) return undefined;
  const lower = s.toLowerCase();
  
  // Reject unsafe schemes and known bad placeholders
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('about:') ||
    lower.includes('undefined') ||
    s.startsWith('/api/placeholder')
  ) {
    console.log('[MEETUP-IMG] Rejected URL (dangerous/invalid):', s);
    return undefined;
  }
  
  const isHttp = /^https?:\/\//i.test(s);
  const isAsset = s.startsWith('/assets/');
  const isSupabaseStorage = lower.includes('.supabase.co/storage/');
  const isDataImage = lower.startsWith('data:image/');
  const isBlob = lower.startsWith('blob:');
  
  if (isHttp || isAsset || isSupabaseStorage || isDataImage || isBlob) {
    console.log('[MEETUP-IMG] Accepted URL:', s);
    return s;
  }
  
  console.log('[MEETUP-IMG] Rejected URL (invalid format):', s);
  return undefined;
};

// Generate fallback image URL based on event details
const generateImageUrl = (title: string, description?: string): string => {
  const images = [
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop',
  ];
  const hash = (title + (description || '')).split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  return images[Math.abs(hash) % images.length];
};

const transformEventToNewsCard = (event: any, onClick?: (event: any) => void, canEdit = false, onEdit?: () => void) => {
  // Construct author object with proper fallback chain
  const authorName = event.creator_display_name || event.author?.name || 'Community Host';
  const authorAvatar = event.creator_avatar_url || event.author?.avatar || '';
  
  // Handle image URL with sanitization and fallback
  const rawImage = event.image_url || event.imageUrl || event.metadata?.image_url || event.metadata?.cover_image_url;
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
  
  // Check if event has ticket sales enabled
  const hasTickets = event.metadata?.has_tickets === true;
  const isPaidEvent = event.metadata?.is_paid === true;
  
  return {
    title: event.title,
    description: event.description,
    imageUrl: imageUrl,
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
    hasTickets,
    isPaidEvent,
    onBuyTicket: (hasTickets || isPaidEvent) ? () => onClick?.(event) : undefined,
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
          id: event.id,
          title: event.title,
          description: event.description,
          image_url: imageUrl,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location,
          link: getShareUrl('event', event.id, { 
            utm_source: 'event_card', 
            utm_medium: 'social',
            utm_campaign: 'events_meetups_v2',
            slug: event.slug
          })
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

const renderEventGrid = (
  events: any[], 
  onClick?: (event: any) => void, 
  currentUserId?: string, 
  onEdit?: (event: any) => void,
  emptyStateConfig?: {
    icon?: React.ReactNode;
    title: string;
    description: string;
    primaryAction?: {
      label: string;
      onClick: () => void;
    };
    secondaryAction?: {
      label: string;
      onClick: () => void;
    };
  }
) => {
  if (events.length === 0) {
    const defaultConfig: {
      icon?: React.ReactNode;
      title: string;
      description: string;
      primaryAction?: {
        label: string;
        onClick: () => void;
      };
      secondaryAction?: {
        label: string;
        onClick: () => void;
      };
    } = {
      icon: <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />,
      title: "No events scheduled",
      description: "Check back soon for upcoming community events!",
    };
    
    const config = emptyStateConfig || defaultConfig;
    
    return (
      <div className="text-center py-12">
        {config.icon}
        <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
        <p className="text-muted-foreground mb-6">{config.description}</p>
        {(config.primaryAction || config.secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {config.primaryAction && (
              <Button onClick={config.primaryAction.onClick}>
                {config.primaryAction.label}
              </Button>
            )}
            {config.secondaryAction && (
              <Button 
                variant="outline" 
                onClick={config.secondaryAction.onClick}
              >
                {config.secondaryAction.label}
              </Button>
            )}
          </div>
        )}
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
                  "h-full transition-all duration-200 cursor-pointer min-h-[320px] md:min-h-[360px]",
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
                    "h-full transition-all duration-200 cursor-pointer min-h-[280px]",
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
                    "h-full transition-all duration-200 cursor-pointer min-h-[280px]",
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
                    "h-full transition-all duration-200 cursor-pointer min-h-[280px]",
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
                    "h-full transition-all duration-200 cursor-pointer min-h-[280px]",
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
                    "h-full transition-all duration-200 cursor-pointer min-h-[320px] md:min-h-[360px]",
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pendingCount } = useAutopilot();
  
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const [createSelectionOpen, setCreateSelectionOpen] = useState(false);
  const [editMeetupOpen, setEditMeetupOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("today");
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [promoteCampaignOpen, setPromoteCampaignOpen] = useState(false);
  const [eventToPromote, setEventToPromote] = useState<any>(null);
  const [autopilotOpen, setAutopilotOpen] = useState(false);

  // Use the mobile hook
  const isMobile = useIsMobile();

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

  // Filter events by search query
  const filteredTodayEvents = useMemo(() => {
    if (!searchQuery.trim()) return todayEvents;
    const query = searchQuery.toLowerCase();
    return todayEvents.filter(event =>
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  }, [todayEvents, searchQuery]);

  const filteredUpcomingEvents = useMemo(() => {
    if (!searchQuery.trim()) return upcomingEvents;
    const query = searchQuery.toLowerCase();
    return upcomingEvents.filter(event =>
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  }, [upcomingEvents, searchQuery]);

  // Get all events from current tab
  const currentEvents = activeTab === "today" ? filteredTodayEvents : 
                        activeTab === "upcoming" ? filteredUpcomingEvents : [];
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

  // Handle promote event
  const handlePromoteEvent = (event: any) => {
    setEventToPromote(event);
    setPromoteCampaignOpen(true);
  };

  // Handle event creation - show the newly created event
  const handleEventCreated = async (eventId: string) => {
    console.log('🎯 Event created, handling:', eventId);
    
    // Wait a bit for the database to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Refresh events and get fresh data
    const freshEvents = await fetchEvents();
    console.log('✅ Fresh events fetched:', freshEvents.length);
    
    // Find the event in the fresh data to determine which tab it belongs to
    const event = freshEvents.find(e => e.id === eventId);
    
    if (!event) {
      console.error('❌ Event not found in fresh data:', eventId);
      toast({
        title: "Event Created",
        description: "Your event was created but couldn't be displayed. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('📅 Event found:', event.title, 'Start time:', event.start_time);
    
    const eventDate = new Date(event.start_time);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Determine correct tab
    let targetTab = 'upcoming';
    if (eventDate >= today && eventDate < tomorrow) {
      targetTab = 'today';
    } else if (eventDate >= tomorrow) {
      targetTab = 'upcoming';
    }
    
    console.log('🔄 Switching to tab:', targetTab);
    setActiveTab(targetTab);
    
    // Open the detail drawer for the newly created event with correct tab
    selectEvent(eventId);
    setSearchParams({ event: eventId, tab: targetTab });
    
    // Scroll to the card after a short delay to ensure rendering
    setTimeout(() => {
      const card = document.querySelector(`[data-event-id="${eventId}"]`);
      if (card) {
        console.log('📍 Scrolling to card');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.warn('⚠️ Card not found in DOM');
      }
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

  // Dynamic OG meta tags for selected event
  const eventSEO = selectedEventData ? {
    title: selectedEventData.title,
    description: selectedEventData.description || `Join us ${selectedEventData.start_time ? `on ${new Date(selectedEventData.start_time).toLocaleDateString()}` : ''} ${selectedEventData.location ? `at ${selectedEventData.location}` : ''}`,
    image: selectedEventData.image_url || generateImageUrl(selectedEventData.title, selectedEventData.description),
    url: `${window.location.origin}/comm/events-meetups?event=${selectedEventData.id}`,
    type: 'event' as const,
  } : null;

  return (
    <>
      <SEO 
        title={eventSEO ? eventSEO.title : "Events & MeetUps"}
        description={eventSEO ? eventSEO.description : "Discover and join community events and casual meetups"}
        image={eventSEO?.image}
        url={eventSEO?.url}
        type={eventSEO?.type || 'website'}
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
            <ExpandableSearchButton 
              placeholder="Search events and meetups..." 
              onSearch={(query) => setSearchQuery(query)}
            />
            <UniversalCalendarButton />
            
            {/* Vitana Index - compact on mobile */}
            {isMobile && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/health')}
                className="relative p-1"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">742</span>
                </div>
              </Button>
            )}
            
            {/* Autopilot - compact on mobile */}
            {isMobile && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAutopilotOpen(true)}
                className="relative p-1"
              >
                <Plane className="h-5 w-5 text-destructive" />
                {pendingCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full p-0 flex items-center justify-center text-[10px]"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            )}
            
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
                ) : isMobile ? (
                  <MobileEventCarousel
                    events={filteredTodayEvents}
                    onCardClick={handleCardClick}
                    currentUserId={user?.id}
                    onEdit={handleEditEvent}
                    initialEventId={selectedEventId || undefined}
                    onSlideChange={(eventId) => {
                      setFocusedCardId(eventId);
                    }}
                    emptyState={
                      <div className="text-center py-12">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Events Today</h3>
                        <p className="text-muted-foreground mb-4">
                          There are no events scheduled for today. Check upcoming events or create your own!
                        </p>
                        <div className="flex flex-col gap-3">
                          <Button onClick={() => setCreateSelectionOpen(true)}>
                            Create Event
                          </Button>
                          <Button variant="outline" onClick={() => setActiveTab('upcoming')}>
                            View Upcoming Events
                          </Button>
                        </div>
                      </div>
                    }
                  />
                ) : (
                  <>
                    {filteredTodayEvents.length === 0 ? (
                      renderEventGrid(
                        [], 
                        handleCardClick, 
                        user?.id, 
                        handleEditEvent,
                        {
                          icon: <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />,
                          title: "No Events Today",
                          description: "There are no events scheduled for today. Check upcoming events or create your own!",
                          primaryAction: {
                            label: "Create Event",
                            onClick: () => setCreateSelectionOpen(true)
                          },
                          secondaryAction: {
                            label: "View Upcoming Events",
                            onClick: () => setActiveTab('upcoming')
                          }
                        }
                      )
                    ) : (
                      <>
                        {chunkEvents(filteredTodayEvents).map((chunk, chunkIndex) => (
                          <div key={`today-chunk-${chunkIndex}`}>
                            {renderEventGrid(chunk, handleCardClick, user?.id, handleEditEvent)}
                            {chunkIndex < chunkEvents(filteredTodayEvents).length - 1 && (
                              <div className="px-6 mb-8 mt-8">
                                <MotivationalBanner variant="encouragement" />
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="px-6 mb-8 mt-8">
                          <MotivationalBanner variant="partnership" />
                        </div>
                      </>
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
                ) : isMobile ? (
                  <MobileEventCarousel
                    events={filteredUpcomingEvents}
                    onCardClick={handleCardClick}
                    currentUserId={user?.id}
                    onEdit={handleEditEvent}
                    initialEventId={selectedEventId || undefined}
                    onSlideChange={(eventId) => {
                      setFocusedCardId(eventId);
                    }}
                    emptyState={
                      <div className="text-center py-12">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                        <p className="text-muted-foreground mb-4">
                          There are no events scheduled. Be the first to create one!
                        </p>
                        <Button onClick={() => setCreateSelectionOpen(true)}>
                          Create Event
                        </Button>
                      </div>
                    }
                  />
                ) : (
                  <>
                    {filteredUpcomingEvents.length === 0 ? (
                      renderEventGrid(
                        [], 
                        handleCardClick, 
                        user?.id, 
                        handleEditEvent,
                        {
                          icon: <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />,
                          title: "No Upcoming Events",
                          description: "There are no events scheduled. Be the first to create one!",
                          primaryAction: {
                            label: "Create Event",
                            onClick: () => setCreateSelectionOpen(true)
                          }
                        }
                      )
                    ) : (
                      <>
                        {chunkEvents(filteredUpcomingEvents).map((chunk, chunkIndex) => (
                          <div key={`upcoming-chunk-${chunkIndex}`}>
                            {renderEventGrid(chunk, handleCardClick, user?.id, handleEditEvent)}
                            {chunkIndex < chunkEvents(filteredUpcomingEvents).length - 1 && (
                              <div className="px-6 mb-8 mt-8">
                                <MotivationalBanner variant="achievement" />
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="px-6 mb-8 mt-8">
                          <MotivationalBanner variant="guidance" />
                        </div>
                      </>
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
          onPromoteEvent={handlePromoteEvent}
        />
      )}

      {/* Promote Campaign Dialog */}
      {eventToPromote && (
        <CampaignDialog
          open={promoteCampaignOpen}
          onOpenChange={setPromoteCampaignOpen}
          prefillData={{
            name: eventToPromote.title,
            description: eventToPromote.description || "",
            goal: "event_promotion",
            coverImage: eventToPromote.image_url || eventToPromote.imageUrl || eventToPromote.metadata?.image_url,
            selectedChannels: { email: true, sms: true, whatsapp: true },
            audienceData: {
              eventAttendees: {
                enabled: true,
                eventIds: [eventToPromote.id],
              },
            },
            eventContext: {
              eventId: eventToPromote.id,
              creatorId: eventToPromote.created_by,
              location: eventToPromote.location,
              eventType: eventToPromote.event_type,
            },
          }}
        />
      )}

      {/* Autopilot Popup (mobile) */}
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen}
      />
    </>
  );
};

export default withScreenId(EventsAndMeetups, SCREEN_IDS.COMMUNITY_MEETUPS);
