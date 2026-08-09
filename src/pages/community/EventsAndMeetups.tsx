import SEO from "@/components/SEO";
import VitanaIndexValue from "@/components/health/VitanaIndexValue";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { communityNavigation } from "@/config/navigation";
import { MotivationalBanner } from '@/components/MotivationalBanner';
import { NewsCard } from '@/components/crossover/NewsCard';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { MeetupDetailsDrawer } from "@/components/meetups/MeetupDetailsDrawer";
import { useEventSelection } from "@/context/EventSelectionContext";
import { useCommunityEvents } from '@/hooks/useCommunityEvents';
import { useFollowingFeed } from '@/hooks/useFollowingFeed';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";
import { Plus, Calendar as CalendarIcon, Brain, Users, Megaphone, Plane } from 'lucide-react';
import { EventKebabMenu } from '@/components/events/EventKebabMenu';
import SocialShareButton from "@/components/sharing/SocialShareButton";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { generateEventCampaignData } from "@/lib/eventPromotion";
import { getShareUrl } from "@/lib/shareUrl";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileEventCarousel } from "@/components/community/MobileEventCarousel";
import { EventCardSkeleton } from "@/components/events/EventCardSkeleton";
import { useAutopilot } from "@/hooks/use-autopilot";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { ProfilePreviewDialog } from "@/components/profile/ProfilePreviewDialog";
import { notifyError, t } from '@/lib/i18n-toast';
import { resolveEventCover, generateCoverUrl } from '@/lib/eventCoverImage';

import { fmtDate, fmtTime } from '@/lib/locale-format';

// Interaction-only surfaces (create/edit/share/promote dialogs) are code-split
// out of the route chunk: they only matter after a user action, yet statically
// importing them made the Events screen download + parse all of them before
// the list could paint. Mount conditions are unchanged — only the code loads
// lazily (each render site is wrapped in <Suspense fallback={null}>).
const CreateEventPopup = lazy(() =>
  import('@/components/CreateEventPopup').then((m) => ({ default: m.CreateEventPopup })));
const CreateMeetupPopup = lazy(() =>
  import('@/components/CreateMeetupPopup').then((m) => ({ default: m.CreateMeetupPopup })));
const CreateSelectionDialog = lazy(() =>
  import('@/components/CreateSelectionDialog').then((m) => ({ default: m.CreateSelectionDialog })));
const EditMeetupPopup = lazy(() =>
  import('@/components/EditMeetupPopup').then((m) => ({ default: m.EditMeetupPopup })));
const CampaignDialog = lazy(() =>
  import('@/components/sharing/CampaignDialog').then((m) => ({ default: m.CampaignDialog })));
const UniversalShareDialog = lazy(() =>
  import('@/components/sharing/UniversalShareDialog').then((m) => ({ default: m.UniversalShareDialog })));
const AutopilotPopup = lazy(() =>
  import('@/components/AutopilotPopup').then((m) => ({ default: m.AutopilotPopup })));

// Helper functions
const formatEventTime = (dateString: string) => {
  const date = new Date(dateString);
  const time = fmtTime(date, { hour: '2-digit', minute: '2-digit', hour12: false });
  const day = fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${time}`;
};

const transformEventToNewsCard = (event: any, onClick?: (event: any) => void, canEdit = false, onEdit?: () => void, currentUserId?: string, onDeleteEvent?: (eventId: string) => void, onShareEvent?: (event: any) => void, imagePriority = false) => {
  // Construct author object with proper fallback chain
  const authorName = event.creator_display_name || event.author?.name || 'Community Host';
  const authorAvatar = event.creator_avatar_url || event.author?.avatar || '';

  // CDN-resized cover with the untransformed URL as onError fallback
  const cover = resolveEventCover(event);

  // Check if event has ticket sales enabled
  const hasTickets = event.metadata?.has_tickets === true;
  const isPaidEvent = event.metadata?.is_paid === true;
  
  return {
    title: event.title,
    subtitle: event.metadata?.subtitle,
    description: event.description,
    imageUrl: cover.src,
    fallbackImageUrl: cover.fallbackSrc,
    imagePriority,
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
    currency: event.metadata?.display_currency || 'USD',
    eventId: event.id,
    eventType: event.event_type,
    showSmartAction: true,
    hasTickets,
    isPaidEvent,
    onBuyTicket: (hasTickets || isPaidEvent) ? () => onClick?.(event) : undefined,
    onClick: onClick ? () => onClick(event) : undefined,
    'data-event-id': event.id,
    utilityTopRight: (
      <EventKebabMenu
        event={event}
        currentUserId={currentUserId}
        onEdit={onEdit ? () => onEdit() : undefined}
        onDelete={onDeleteEvent}
        onShare={onShareEvent}
        className="text-white hover:bg-white/20"
      />
    ),
    actionButton: (
      <SocialShareButton
        type="event"
        data={{
          id: event.id,
          title: event.title,
          description: event.description,
          image_url: cover.originalSrc,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location,
          link: getShareUrl('event', event.id, { slug: event.slug })
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
  },
  onDeleteEvent?: (eventId: string) => void,
  onShareEvent?: (event: any) => void,
  // How many leading cards should eager-load their cover (above-the-fold row)
  priorityCount = 0,
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
    
    const mkProps = (ev: any, cardIdx: number) => transformEventToNewsCard(ev, onClick, false, () => onEdit?.(ev), currentUserId, onDeleteEvent, onShareEvent, i + cardIdx < priorityCount);

    rows.push(
      <div key={i} className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
        {isEvenRow ? (
          <>
            <div className="col-span-6">
              <NewsCard
                key={`${i}-0`}
                {...mkProps(rowEvents[0], 0)}
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
                  {...mkProps(rowEvents[1], 1)}
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
                  {...mkProps(rowEvents[2], 2)}
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
                  {...mkProps(rowEvents[0], 0)}
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
                  {...mkProps(rowEvents[1], 1)}
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
                  {...mkProps(rowEvents[2], 2)}
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
  const { events: dbEvents, loading, isFetching, fetchEvents } = useCommunityEvents();
  const {
    followingIds,
    profiles: followedProfiles,
    loading: followingLoading,
    isAuthenticated,
  } = useFollowingFeed();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pendingCount } = useAutopilot();
  const { translate } = useTranslation();
  
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createMeetupOpen, setCreateMeetupOpen] = useState(false);
  const [createSelectionOpen, setCreateSelectionOpen] = useState(false);
  const [editMeetupOpen, setEditMeetupOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  // Use the mobile hook
  const isMobile = useIsMobile();
  
  // Mobile defaults to "upcoming" since Today is often empty
  const initialTab = searchParams.get('tab') || 'hot';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [promoteCampaignOpen, setPromoteCampaignOpen] = useState(false);
  const [eventToPromote, setEventToPromote] = useState<any>(null);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [eventToShare, setEventToShare] = useState<any>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const mobileContainerRef = useRef<HTMLDivElement>(null);

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

  // Search dropdown results - filter ALL events regardless of tab
  const searchDropdownItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return dbEvents
      .filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      )
      .slice(0, 6)
      .map(event => ({
        id: event.id,
        title: event.title,
        subtitle: event.location || formatEventTime(event.start_time),
      }));
  }, [dbEvents, searchQuery]);


  const MAXINA_CREATOR_ID = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b';
  const HOT_EVENT_IDS = new Set([
    '6bb46db6-a3ba-42b6-8a50-2be8658e436f', // Dancing Filmevent
  ]);

  const maxinaEvents = useMemo(() => {
    return dbEvents
      .filter(event => event.created_by === MAXINA_CREATOR_ID || HOT_EVENT_IDS.has(event.id))
      .map(event => ({ ...event, event_type: 'event' }));
  }, [dbEvents]);

  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);

  const followedEvents = useMemo(() => {
    if (followingSet.size === 0) return [];
    const list = dbEvents.filter(event => followingSet.has(event.created_by));
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(event =>
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  }, [dbEvents, followingSet, searchQuery]);

  // Get all events from current tab
  const currentEvents = activeTab === "today" ? filteredTodayEvents : 
                        activeTab === "upcoming" ? filteredUpcomingEvents :
                        activeTab === "hot" ? maxinaEvents : [];
  const visibleEventIds = useMemo(() => currentEvents.map(e => e.id), [currentEvents, activeTab]);

  // Track if we've initialized the tab from URL (prevents resetting on data refresh)
  const hasInitializedTab = useRef(false);

  // Handle initial tab setup on mount only
  useEffect(() => {
    if (hasInitializedTab.current) return;
    hasInitializedTab.current = true;
    
    const eventParam = searchParams.get('event');
    const tabParam = searchParams.get('tab');
    const isMobileView = window.innerWidth < 768;
    const validTabs = ['hot', 'upcoming', 'today', 'following'];
    
    // On mobile, if no tab specified, set to upcoming
    if (isMobileView && !tabParam && !eventParam) {
      setActiveTab('hot');
      return;
    }
    
    // Respect tab param if valid
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Respect external ?tab changes AFTER mount (e.g. the Orb navigating to
  // /comm/events-meetups?tab=upcoming while the user is already on this page).
  // The mount-only initializer above won't catch it, and the activeTab→URL sync
  // below would otherwise revert the Orb's change back to the current tab.
  // Read-only (no setSearchParams), so it can't loop with the sync effect.
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const validTabs = ['hot', 'upcoming', 'today', 'following'];
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync activeTab to URL when user switches tabs
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (activeTab && activeTab !== currentTab) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('tab', activeTab);
        return newParams;
      }, { replace: true });
    }
  }, [activeTab, setSearchParams]);

  // Handle event deep linking when dbEvents loads
  useEffect(() => {
    const eventParam = searchParams.get('event');
    if (!eventParam || dbEvents.length === 0) return;
    
    // If event param exists, find and scroll to it
    const event = dbEvents.find(e => e.id === eventParam);
    if (event && !selectedEventId) {
      // Auto-detect tab if not already set correctly
      const eventDate = new Date(event.start_time);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const detectedTab = (eventDate >= today && eventDate < tomorrow) ? 'today' : 'upcoming';
      setActiveTab(detectedTab);
      
      selectEvent(eventParam);
      setTimeout(() => {
        const card = document.querySelector(`[data-event-id="${eventParam}"]`);
        card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [dbEvents]);

  // Handle card click
  const handleCardClick = useCallback((event: any) => {
    setFocusedCardId(event.id);
    selectEvent(event.id);
    setSearchParams({ event: event.id, tab: activeTab });
  }, [activeTab, selectEvent, setSearchParams]);

  const handleSearchItemClick = useCallback((id: string) => {
    const event = dbEvents.find(e => e.id === id);
    if (event) handleCardClick(event);
  }, [dbEvents, handleCardClick]);

  // Handle edit
  const handleEditEvent = useCallback((event: any) => {
    setSelectedEvent(event);
    setEditMeetupOpen(true);
  }, []);

  // Handle promote event
  const handlePromoteEvent = useCallback((event: any) => {
    setEventToPromote(event);
    setPromoteCampaignOpen(true);
  }, []);

  // Handle share event - native share first, dialog fallback
  const handleShareEvent = useCallback(async (event: any) => {
    const shareUrl = getShareUrl('event', event.id, { slug: event.slug });

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        // Share the URL only — no `text`. The rich preview (image, title,
        // description) is generated by the event page's Open Graph tags
        // (og-event edge function), so messaging apps unfurl a clean card on
        // both Android and iOS. Passing `text` made iOS/WebKit concatenate the
        // description + raw URL into a separate visible message bubble, which
        // Android does not do — producing the cluttered iPhone share.
        await navigator.share({
          title: event.title,
          url: shareUrl,
        });
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    }

    setEventToShare(event);
    setShareDialogOpen(true);
  }, []);

  // Handle delete event - remove from list and refresh
  const handleDeleteEvent = useCallback((eventId: string) => {
    fetchEvents();
    // Close the drawer if the deleted event was selected
    if (selectedEventId === eventId) {
      handleDrawerClose();
    }
  }, [fetchEvents, selectedEventId]);

  // Handle event creation - show the newly created event
  const handleEventCreated = async (eventId: string) => {
    // Wait a bit for the database to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Refresh events - refetch returns QueryObserverResult, use refetch().then() pattern
    const result = await fetchEvents();
    const freshEvents = result.data || [];
    
    // Find the event in the fresh data to determine which tab it belongs to
    const event = freshEvents.find(e => e.id === eventId);
    
    if (!event) {
      notifyError('toasts.community.eventCreated', 'toasts.community.yourEventCreatedButCouldnT');
      return;
    }
    
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
    
    setActiveTab(targetTab);
    
    // Open the detail drawer for the newly created event with correct tab
    selectEvent(eventId);
    setSearchParams({ event: eventId, tab: targetTab });
    
    // Scroll to the card after a short delay to ensure rendering
    setTimeout(() => {
      const card = document.querySelector(`[data-event-id="${eventId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    clearSelection();
    const params = new URLSearchParams(searchParams);
    params.delete('event');
    setSearchParams(params);
    
    // On mobile, normalize scroll to top so sticky header is always visible
    if (isMobile) {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 350);
    }
    
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
    description: selectedEventData.description || `Join us ${selectedEventData.start_time ? `on ${fmtDate(new Date(selectedEventData.start_time))}` : ''} ${selectedEventData.location ? `at ${selectedEventData.location}` : ''}`,
    image: selectedEventData.image_url || generateCoverUrl(selectedEventData.title, selectedEventData.description),
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
        {/* Hide SubNavigation on mobile for this specific route - users navigate via /comm */}
        {!isMobile && <SubNavigation items={communityNavigation} />}
        <div 
          ref={mobileContainerRef}
          className={cn(
            "bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background",
            isMobile ? "px-4 pt-2 pb-0 h-[100dvh] flex flex-col overflow-hidden" : "p-6 min-h-screen"
          )}
        >
          <SplitBar defaultValue="hot" value={activeTab} onValueChange={setActiveTab} className={isMobile ? "flex flex-col flex-1 overflow-hidden" : ""}>
            {/* Sticky header block on mobile: title + actions + tabs */}
            <div className={cn(
              isMobile && "sticky top-0 z-30 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background pb-0"
            )}>
              <StandardHeader
                title={isMobile ? translate('events.titleShort', 'Events & MeetUps') : translate('events.title', 'Events & MeetUps')}
                description={translate('events.description', 'Discover formal events and casual meetups in your community')}
              />
              
              <UtilityActionButton 
                className="min-w-0"
                compact={isMobile}
                afterGiftVoucherChildren={isMobile && (
                  <>
                    {/* Vitana Index - pill style on mobile */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate('/health')}
                      className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
                    >
                      <span className="text-xs opacity-60">🧬</span>
                      <span className="text-sm font-medium text-primary"><VitanaIndexValue /></span>
                    </Button>
                    
                    {/* Autopilot - pill style with label on mobile */}
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
                )}
              >
                <div className="flex items-center gap-1.5 min-w-max">
                  <ExpandableSearchButton
                    placeholder={translate('events.searchPlaceholder', 'Search events and meetups...')} 
                    onSearch={(query) => setSearchQuery(query)}
                    dropdownItems={searchDropdownItems}
                    onItemClick={handleSearchItemClick}
                    filterLabel={isMobile ? (() => {
                      const filters = [
                        { value: 'hot', label: translate('events.tabs.hot', 'Hot'), icon: '🔥' },
                        { value: 'upcoming', label: translate('events.tabs.upcoming', 'Upcoming'), icon: '📅' },
                        { value: 'today', label: translate('events.tabs.today', 'Today'), icon: '☀️' },
                        { value: 'following', label: translate('events.tabs.following', 'Following'), icon: '👥' },
                      ];
                      const active = filters.find(f => f.value === activeTab) || filters[0];
                      return `${active.icon} ${active.label}`;
                    })() : undefined}
                    onFilterClick={isMobile ? () => setFilterSheetOpen(true) : undefined}
                  />
                  <UniversalCalendarButton />

                  {/* Create button - matches pill style */}
                  <Button 
                    onClick={() => setCreateSelectionOpen(true)}
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">{translate('buttons.create', 'Create')}</span>
                  </Button>
                  
                </div>
              </UtilityActionButton>

              {/* Desktop only: show full tab bar */}
              {!isMobile && (
                <SplitBarList>
                  <SplitBarTrigger value="hot">
                    🔥 {translate('events.tabs.hot', 'Hot')}
                  </SplitBarTrigger>
                  <SplitBarTrigger value="upcoming">
                    📅 {translate('events.tabs.upcoming', 'Upcoming')}
                  </SplitBarTrigger>
                  <SplitBarTrigger value="today">
                    ☀️ {translate('events.tabs.today', 'Today')}
                  </SplitBarTrigger>
                  <SplitBarTrigger value="following">
                    👥 {translate('events.tabs.following', 'Following')}
                  </SplitBarTrigger>
                </SplitBarList>
              )}
            </div>

            {/* Scrollable content area */}
            <div className={cn(isMobile ? "flex-1 overflow-y-auto" : "")}>

              <SplitBarContent value="today" className={isMobile ? "mt-1" : "mt-6"}>
                {loading && filteredTodayEvents.length === 0 ? (
                  <EventCardSkeleton count={4} className="px-2" />
                ) : isMobile ? (
                  <MobileEventCarousel
                    events={filteredTodayEvents}
                    onCardClick={handleCardClick}
                    currentUserId={user?.id}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    onShare={handleShareEvent}
                    initialEventId={selectedEventId || undefined}
                    onRefresh={fetchEvents}
                    onSlideChange={(eventId) => {
                      setFocusedCardId(eventId);
                    }}
                    emptyState={
                      <div className="text-center py-12">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">{translate('events.emptyStates.noEventsToday')}</h3>
                        <p className="text-muted-foreground mb-4">
                          {translate('events.emptyStates.noEventsTodayDesc')}
                        </p>
                        <div className="flex flex-col gap-3">
                          <Button onClick={() => setCreateSelectionOpen(true)}>
                            {translate('events.emptyStates.createEvent')}
                          </Button>
                          <Button variant="outline" onClick={() => setActiveTab('upcoming')}>
                            {translate('events.emptyStates.viewUpcoming')}
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
                          title: translate('events.emptyStates.noEventsToday'),
                          description: translate('events.emptyStates.noEventsTodayDesc'),
                          primaryAction: {
                            label: translate('events.emptyStates.createEvent'),
                            onClick: () => setCreateSelectionOpen(true)
                          },
                          secondaryAction: {
                            label: translate('events.emptyStates.viewUpcoming'),
                            onClick: () => setActiveTab('upcoming')
                          }
                        },
                        handleDeleteEvent,
                        handleShareEvent,
                      )
                    ) : (
                      <>
                        {chunkEvents(filteredTodayEvents).map((chunk, chunkIndex) => (
                          <div key={`today-chunk-${chunkIndex}`}>
                            {renderEventGrid(chunk, handleCardClick, user?.id, handleEditEvent, undefined, handleDeleteEvent, handleShareEvent, chunkIndex === 0 ? 3 : 0)}
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

              <SplitBarContent value="upcoming" className={isMobile ? "mt-1" : "mt-6"}>
                {loading && filteredUpcomingEvents.length === 0 ? (
                  <EventCardSkeleton count={4} className="px-2" />
                ) : isMobile ? (
                  <MobileEventCarousel
                    events={filteredUpcomingEvents}
                    onCardClick={handleCardClick}
                    currentUserId={user?.id}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    onShare={handleShareEvent}
                    initialEventId={selectedEventId || undefined}
                    onRefresh={fetchEvents}
                    onSlideChange={(eventId) => {
                      setFocusedCardId(eventId);
                    }}
                    emptyState={
                      <div className="text-center py-12">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">{t('screens.community.noUpcomingEvents')}</h3>
                        <p className="text-muted-foreground mb-4">
                          {t('screens.community.thereNoEventsScheduledFirstCreate')}
                        </p>
                        <Button onClick={() => setCreateSelectionOpen(true)}>
                          {t('screens.community.createEvent')}
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
                        },
                        handleDeleteEvent,
                        handleShareEvent,
                      )
                    ) : (
                      <>
                        {chunkEvents(filteredUpcomingEvents).map((chunk, chunkIndex) => (
                          <div key={`upcoming-chunk-${chunkIndex}`}>
                            {renderEventGrid(chunk, handleCardClick, user?.id, handleEditEvent, undefined, handleDeleteEvent, handleShareEvent, chunkIndex === 0 ? 3 : 0)}
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

              <SplitBarContent value="following" className={isMobile ? "mt-1" : "mt-6"}>
                {followingLoading || (loading && followingIds.length > 0 && followedEvents.length === 0) ? (
                  <EventCardSkeleton count={4} className="px-2" />
                ) : !isAuthenticated || followingIds.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">{translate('events.emptyStates.followingTitle')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {translate('events.emptyStates.followingDesc')}
                    </p>
                    <Button variant="outline" onClick={() => navigate('/comm/members')}>
                      {translate('events.emptyStates.findPeople')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="px-4 sm:px-6 mb-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        {translate('events.emptyStates.youFollow')}
                      </p>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {followedProfiles.map((p) => (
                          <button
                            key={p.user_id}
                            type="button"
                            onClick={() => navigate(`/profile/${p.user_id}`)}
                            className="flex flex-col items-center gap-1 flex-shrink-0 w-16 focus:outline-none"
                            aria-label={p.display_name || 'Member'}
                          >
                            <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                              {p.avatar_url ? (
                                <AvatarImage src={p.avatar_url} alt={p.display_name || ''} />
                              ) : null}
                              <AvatarFallback>
                                {(p.display_name || '?')
                                  .split(/\s+/)
                                  .filter(Boolean)
                                  .map((s) => s[0]?.toUpperCase())
                                  .join('')
                                  .slice(0, 2) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] truncate w-full text-center text-muted-foreground">
                              {p.display_name || 'Member'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {followedEvents.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">{translate('events.emptyStates.noPostsFromFollowing')}</h3>
                        <p className="text-muted-foreground mb-4">
                          {translate('events.emptyStates.noPostsFromFollowingDesc')}
                        </p>
                        <Button variant="outline" onClick={() => navigate('/comm/members')}>
                          {translate('events.emptyStates.findPeople')}
                        </Button>
                      </div>
                    ) : isMobile ? (
                      <MobileEventCarousel
                        events={followedEvents}
                        onCardClick={handleCardClick}
                        currentUserId={user?.id}
                        onEdit={handleEditEvent}
                        onDelete={handleDeleteEvent}
                        onShare={handleShareEvent}
                        initialEventId={selectedEventId || undefined}
                        onRefresh={fetchEvents}
                        onSlideChange={(eventId) => {
                          setFocusedCardId(eventId);
                        }}
                      />
                    ) : (
                      <>
                        {chunkEvents(followedEvents).map((chunk, chunkIndex) => (
                          <div key={`following-chunk-${chunkIndex}`}>
                            {renderEventGrid(chunk, handleCardClick, user?.id, handleEditEvent, undefined, handleDeleteEvent, handleShareEvent, chunkIndex === 0 ? 3 : 0)}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </SplitBarContent>

              <SplitBarContent value="hot" className={isMobile ? "mt-1" : "mt-6"}>
                {loading && maxinaEvents.length === 0 ? (
                  <EventCardSkeleton count={4} className="px-2" />
                ) : isMobile ? (
                  <MobileEventCarousel
                    events={maxinaEvents}
                    onCardClick={handleCardClick}
                    currentUserId={user?.id}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                    onShare={handleShareEvent}
                    initialEventId={selectedEventId || undefined}
                    onRefresh={fetchEvents}
                    onSlideChange={(eventId) => {
                      setFocusedCardId(eventId);
                    }}
                    emptyState={
                      <div className="text-center py-12">
                        <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">{t('screens.community.noRecommendedEvents')}</h3>
                        <p className="text-muted-foreground mb-4">
                          {t('screens.community.checkBackSoonForCuratedEvents')}
                        </p>
                      </div>
                    }
                  />
                ) : (
                  <>
                    {maxinaEvents.length === 0 ? (
                      renderEventGrid(
                        [],
                        handleCardClick,
                        user?.id,
                        handleEditEvent,
                        {
                          icon: <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />,
                          title: "No Recommended Events",
                          description: "Check back soon for curated events.",
                        },
                        handleDeleteEvent,
                        handleShareEvent,
                      )
                    ) : (
                      <>
                        {chunkEvents(maxinaEvents).map((chunk, chunkIndex) => (
                          <div key={`recommended-chunk-${chunkIndex}`}>
                            {renderEventGrid(chunk, handleCardClick, user?.id, handleEditEvent, undefined, handleDeleteEvent, handleShareEvent, chunkIndex === 0 ? 3 : 0)}
                            {chunkIndex < chunkEvents(maxinaEvents).length - 1 && (
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
            </div>
            </SplitBar>
        </div>
      </AppLayout>

      {/* Create Selection Dialog */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* Create Event Popup */}
      <Suspense fallback={null}>
        <CreateEventPopup
          isOpen={createEventOpen}
          onClose={() => setCreateEventOpen(false)}
          eventContext="community"
          onEventCreated={handleEventCreated}
        />
      </Suspense>

      {/* Create MeetUp Popup */}
      <Suspense fallback={null}>
        <CreateMeetupPopup
          isOpen={createMeetupOpen}
          onClose={() => setCreateMeetupOpen(false)}
          onEventCreated={handleEventCreated}
        />
      </Suspense>

      {/* Edit MeetUp Popup */}
      {selectedEvent && (
        <Suspense fallback={null}>
          <EditMeetupPopup
            isOpen={editMeetupOpen}
            onClose={() => {
              setEditMeetupOpen(false);
              setSelectedEvent(null);
            }}
            event={selectedEvent}
            onUpdated={fetchEvents}
          />
        </Suspense>
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
          onShareEvent={handleShareEvent}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          restoreWindowScrollOnClose={false}
        />
      )}

      {/* Share Dialog - Rendered at root level to avoid z-index conflicts */}
      {eventToShare && (
        <Suspense fallback={null}>
        <UniversalShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          content={{
            type: "event",
            id: eventToShare.id,
            title: eventToShare.title,
            description: eventToShare.description,
            image_url: eventToShare.image_url || eventToShare.cover_image_url,
            url: getShareUrl('event', eventToShare.id, { slug: eventToShare.slug })
          }}
        />
        </Suspense>
      )}

      {/* Promote Campaign Dialog */}
      {eventToPromote && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Profile Preview Dialog - Rendered at root level to avoid focus-trap conflicts with Sheet */}
      <ProfilePreviewDialog />

      {/* Autopilot Popup (mobile) */}
      <Suspense fallback={null}>
        <AutopilotPopup
          open={autopilotOpen}
          onOpenChange={setAutopilotOpen}
        />
      </Suspense>

      {/* Mobile filter bottom sheet — triggered from search button filter chip */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-base">{translate('events.filterTitle', 'Filter Events')}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            {[
              { value: 'hot', label: translate('events.tabs.hot', 'Hot'), icon: '🔥' },
              { value: 'upcoming', label: translate('events.tabs.upcoming', 'Upcoming'), icon: '📅' },
              { value: 'today', label: translate('events.tabs.today', 'Today'), icon: '☀️' },
              { value: 'following', label: translate('events.tabs.following', 'Following'), icon: '👥' },
            ].map(filter => (
              <Button
                key={filter.value}
                variant={activeTab === filter.value ? "default" : "ghost"}
                className={cn(
                  "justify-start h-12 text-base rounded-xl gap-3",
                  activeTab === filter.value && "bg-primary text-primary-foreground"
                )}
                onClick={() => {
                  setActiveTab(filter.value);
                  setFilterSheetOpen(false);
                }}
              >
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

    </>
  );
};

export default withScreenId(EventsAndMeetups, SCREEN_IDS.COMMUNITY_MEETUPS);
