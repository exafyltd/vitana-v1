import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ClickableAvatar } from "@/components/ui/clickable-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { MessageComposeModal } from "@/components/profile/shared/MessageComposeModal";
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useProfilePreview } from "@/hooks/useProfilePreview";
import { ProfilePreviewDialog } from "@/components/profile/ProfilePreviewDialog";
import { getShareUrl } from "@/lib/shareUrl";
import { UniversalShareDialog } from "@/components/sharing/UniversalShareDialog";
import { EventTicketSelector } from "@/components/tickets/EventTicketSelector";
import { EventSalesDashboard } from "@/components/tickets/EventSalesDashboard";
import { useEventTicketTypes } from "@/hooks/useEventTickets";
import { useIsEventOrganizer } from "@/hooks/useEventSales";
import {
  getLocalizedEventCta,
  isTicketedEvent,
  isPaidEvent,
  isEventSoldOut,
  getLowestAvailableTicketPrice,
  formatTicketPrice,
} from "@/lib/eventsCtaUtils";
import { useTranslation } from "@/hooks/useTranslation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  X,
  Calendar,
  MapPin,
  Clock,
  Users,
  Share2,
  MessageCircle,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Check,
  Loader2,
  Globe,
  Languages,
  Accessibility,
  Plane,
  Target,
  CheckCircle2,
  AlertCircle,
  Car,
  Download,
  UserPlus,
  UserMinus,
  Timer,
  MapPinned,
  Megaphone,
  Ticket,
  BarChart3,
  Eye,
} from "lucide-react";
import { cn, getAbsoluteImageUrl } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import SEO from "@/components/SEO";

// Sanitize URL for security - only allow trusted sources
function sanitizeUrl(url?: string): string | null {
  if (!url) return null;
  
  const trimmed = url.trim();
  
  // Reject obvious bad/placeholder schemes
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('about:') ||
    trimmed.includes('undefined') ||
    trimmed.includes('/api/placeholder')
  ) {
    console.log('[DRAWER-IMG] Rejected URL (bad scheme):', trimmed);
    return null;
  }
  
  // Allow http(s) URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Allow Supabase storage URLs
    if (trimmed.includes('.supabase.co/storage/')) {
      console.log('[DRAWER-IMG] Accepted URL (Supabase Storage):', trimmed);
      return trimmed;
    }
    console.log('[DRAWER-IMG] Accepted URL (http/https):', trimmed);
    return trimmed;
  }
  
  // Allow /assets/ paths
  if (trimmed.startsWith('/assets/')) {
    console.log('[DRAWER-IMG] Accepted URL (assets path):', trimmed);
    return trimmed;
  }
  
  // Allow data:image/* URIs
  if (trimmed.startsWith('data:image/')) {
    console.log('[DRAWER-IMG] Accepted URL (data URI):', trimmed.substring(0, 50) + '...');
    return trimmed;
  }
  
  // Allow blob: URIs
  if (trimmed.startsWith('blob:')) {
    console.log('[DRAWER-IMG] Accepted URL (blob):', trimmed);
    return trimmed;
  }
  
  console.log('[DRAWER-IMG] Rejected URL (unknown scheme):', trimmed);
  return null;
}

// Generate a fallback image based on event details
function generateImageUrl(title?: string, description?: string): string {
  const images = [
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200',
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200'
  ];
  
  const text = (title || '') + (description || '');
  const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return images[hash % images.length];
}

interface MeetupDetailsDrawerProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  isMobile?: boolean;
  onPromoteEvent?: (event: any) => void;
}

export function MeetupDetailsDrawer({
  event,
  open,
  onOpenChange,
  onNavigatePrev,
  onNavigateNext,
  hasPrev,
  hasNext,
  isMobile = false,
  onPromoteEvent,
}: MeetupDetailsDrawerProps) {
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showLocalTime, setShowLocalTime] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [previousEventId, setPreviousEventId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [userHasTicket, setUserHasTicket] = useState(false);
  const [isTicketSectionVisible, setIsTicketSectionVisible] = useState(false);
  
  const { userId: previewUserId, isOpen: isPreviewOpen, openPreview, closePreview } = useProfilePreview();
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  const { addEvent, removeEvent } = useCalendarEvents();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { translate } = useTranslation();
  
  // Fetch ticket types for the event
  const { ticketTypes, loading: ticketsLoading } = useEventTicketTypes(event?.id || '');
  
  // Use unified CTA logic
  const isTicketed = isTicketedEvent(event);
  const isPaid = isPaidEvent(event, ticketTypes);
  const isSoldOut = isEventSoldOut(ticketTypes);
  const lowestPrice = getLowestAvailableTicketPrice(ticketTypes);
  const ticketCurrency = ticketTypes[0]?.currency || 'USD';
  
  // Check if user has a ticket for this event
  useEffect(() => {
    const checkUserTicket = async () => {
      if (!user || !event?.id) {
        setUserHasTicket(false);
        return;
      }
      
      const { data } = await supabase
        .from("event_ticket_purchases")
        .select("id")
        .eq("event_id", event.id)
        .eq("buyer_id", user.id)
        .eq("status", "completed")
        .limit(1);
      
      setUserHasTicket(!!data && data.length > 0);
    };
    
    checkUserTicket();
  }, [user, event?.id]);
  
  // Get CTA config using unified localized logic
  const ctaConfig = getLocalizedEventCta({
    event: event ? {
      id: event.id,
      event_type: event.event_type,
      metadata: event.metadata,
    } : null,
    ticketTypes,
    userHasTicket,
    isParticipating: isJoined,
    context: 'drawer',
  }, translate);
  
  // Check if current user is the organizer
  const { isOrganizer } = useIsEventOrganizer(event?.id || '');
  const [showSalesDashboard, setShowSalesDashboard] = useState(false);
  
  // Determine context based on event
  const messageContext = event?.tenant_id ? 'tenant' : 'global';
  const { createThread, sendMessage } = useHybridMessages(messageContext);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Track ticket section visibility with Intersection Observer
  useEffect(() => {
    if (!open || !isTicketed) {
      setIsTicketSectionVisible(false);
      return;
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const ticketsSection = document.querySelector('[data-section="tickets"]');
      if (!ticketsSection) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsTicketSectionVisible(entry.isIntersecting);
        },
        { threshold: 0.3 } // Trigger when 30% visible
      );

      observer.observe(ticketsSection);
      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [open, isTicketed]);

  // Track event changes for transitions
  useEffect(() => {
    if (event?.id && event.id !== previousEventId) {
      if (previousEventId) {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
          setIsTransitioning(false);
        }, prefersReducedMotion ? 0 : 300);
        return () => clearTimeout(timer);
      }
      setPreviousEventId(event.id);
    }
  }, [event?.id, previousEventId, prefersReducedMotion]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      } else if (e.key === "ArrowLeft" && hasPrev && onNavigatePrev) {
        e.preventDefault();
        onNavigatePrev();
      } else if (e.key === "ArrowRight" && hasNext && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, hasPrev, hasNext, onNavigatePrev, onNavigateNext, onOpenChange]);


  if (!event) return null;

  const handleJoin = async () => {
    setIsJoining(true);
    
    try {
      const calendarEvent = {
        user_id: '', // Will be set by the hook from auth context
        title: event.title,
        description: event.description || '',
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location || event.virtual_link || '',
        event_type: 'community' as const,
        status: 'confirmed' as const,
        priority: 'medium' as const,
        is_recurring: false,
        source_type: 'manual' as const,
        metadata: {
          meetup_id: event.id,
          meetup_slug: event.slug,
        }
      };
      
      const addedEvent = await addEvent(calendarEvent);
      
      setIsJoined(true);
      setIsJoining(false);
      
      toast({
        title: "Added to Smart Calendar ✓",
        description: "Event saved. We'll remind you before it starts.",
        duration: 5000,
        action: addedEvent ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await removeEvent(addedEvent.id);
              setIsJoined(false);
              toast({
                title: "Removed from calendar",
                description: "You've left this meetup.",
              });
            }}
          >
            Undo
          </Button>
        ) : undefined,
      });
    } catch (error) {
      console.error('Failed to add event to calendar:', error);
      setIsJoining(false);
      toast({
        title: "Failed to add event",
        description: "Please try again or check your calendar permissions.",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Removed from saved" : "Saved",
      description: isSaved ? "Meetup removed from your saved list" : "Meetup saved for later",
    });
  };

  // Share URL for the dialog
  const shareUrl = getShareUrl('event', event.id, {
    utm_source: 'event_details',
    utm_medium: 'share_dialog',
    slug: event.slug
  });

  const handleExportToCalendar = (type: string) => {
    const startDate = new Date(event.start_time);
    const endDate = event.end_time ? new Date(event.end_time) : new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const calendarName = type === 'google' ? 'Google Calendar' : type === 'outlook' ? 'Outlook' : 'your calendar';
    
    if (type === 'google') {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || event.virtual_link || '')}`;
      window.open(url, '_blank');
      toast({
        title: "Opening calendar",
        description: `Add the event to ${calendarName}`,
      });
    } else if (type === 'outlook') {
      const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || event.virtual_link || '')}`;
      window.open(url, '_blank');
      toast({
        title: "Opening calendar",
        description: `Add the event to ${calendarName}`,
      });
    } else if (type === 'apple' || type === 'ics') {
      toast({
        title: "Calendar export",
        description: "iCal file downloaded",
      });
    }
  };

  const capacity = event.max_participants || 30;
  const current = event.participant_count || 0;
  const capacityPercent = (current / capacity) * 100;
  const spotsLeft = capacity - current;
  const isLowCapacity = spotsLeft > 0 && spotsLeft <= capacity * 0.2;

  const startDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;
  const duration = endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
    : 60;
  
  const hoursUntilEvent = differenceInHours(startDate, new Date());
  const showCountdown = hoursUntilEvent > 0 && hoursUntilEvent < 24;

  // Mock data for social proof
  const followersGoing = [
    { name: "Alex", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop" },
    { name: "Sarah", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop" },
    { name: "Mike", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop" },
  ];

  const attendees = Array.from({ length: Math.min(current, 10) }, (_, i) => ({
    name: `User ${i + 1}`,
    avatar: `https://images.unsplash.com/photo-${1500000000000 + i * 1000000}?w=40&h=40&fit=crop`,
  }));

  // Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && hasNext && onNavigateNext) {
      onNavigateNext();
    } else if (isRightSwipe && hasPrev && onNavigatePrev) {
      onNavigatePrev();
    }
  };

  const handleMessageHost = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to message the host",
        variant: "destructive"
      });
      return;
    }

    // Get host ID from event creator
    const hostId = event.created_by;
    
    if (!hostId) {
      toast({
        title: "Cannot message host",
        description: "Host information not available",
        variant: "destructive"
      });
      return;
    }

    if (hostId === user.id) {
      toast({
        title: "Cannot message yourself",
        description: "You are the host of this event",
        variant: "destructive"
      });
      return;
    }

    setMessageModalOpen(true);
  };

  const handleSendMessageToHost = async (message: string) => {
    setIsCreatingThread(true);
    try {
      const hostId = event.created_by;
      
      if (!hostId) {
        throw new Error('Host ID not found');
      }

      // 1. Create or get existing direct message thread
      const thread = await createThread([hostId]);
      if (!thread?.id) {
        throw new Error('Failed to create thread');
      }

      // 2. Send the actual message content
      await sendMessage({
        context: messageContext,
        threadId: thread.id,
        content: message,
        type: 'text'
      });

      // 3. Show success message
      toast({
        title: "Message sent! 📨",
        description: `Your message has been sent to ${event.creator_display_name || event.author?.name || 'the host'}`,
      });

      // 4. Close modal and drawer
      setMessageModalOpen(false);
      onOpenChange(false);

      // 5. Navigate to messages view
      navigate('/messages', { 
        state: { 
          threadId: thread.id,
          highlightThread: true 
        } 
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsCreatingThread(false);
    }
  };

  // Generate SEO data for rich link previews
  const eventUrl = `${window.location.origin}/comm/events-meetups?event=${event.id}`;
  const eventDescription = event.description?.slice(0, 200) || `Join ${event.title} on ${format(startDate, 'MMMM d, yyyy')}`;
  const eventImage = getAbsoluteImageUrl(event.image_url);

  const content = (
    <>
      {open && (
        <SEO
          title={`${event.title} | VITANA Events`}
          description={eventDescription}
          image={eventImage}
          imageAlt={event.title}
          url={eventUrl}
          type="event"
          canonical={eventUrl}
        />
      )}
      <div 
        className="flex flex-col h-full"
        onTouchStart={!isMobile ? onTouchStart : undefined}
        onTouchMove={!isMobile ? onTouchMove : undefined}
        onTouchEnd={!isMobile ? onTouchEnd : undefined}
      >
      <ScrollArea className={cn("flex-1", isMobile ? "pb-24" : "pb-20")}>
        <div 
          className={cn(
            "transition-opacity duration-300",
            isTransitioning && !prefersReducedMotion && "opacity-40"
          )}
        >
          {/* Hero Image - Edge to edge */}
          <div className="relative w-full aspect-video bg-muted overflow-hidden">
            {!isImageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
            <img
              src={(() => {
                const rawImage = event.image_url || event.imageUrl || event.metadata?.image_url || event.metadata?.cover_image_url;
                console.log('[DRAWER-IMG] Transform event:', { eventId: event.id, title: event.title, rawImage });
                const safeImage = sanitizeUrl(rawImage);
                const finalImageUrl = safeImage ?? generateImageUrl(event.title, event.description);
                console.log('[DRAWER-IMG] Final image decision:', { eventId: event.id, safeImage, finalImageUrl, usingFallback: !safeImage });
                return finalImageUrl;
              })()}
              alt={event.title}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                "saturate-110 contrast-105 brightness-105",
                isImageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setIsImageLoaded(true)}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 dark:from-background/95 via-background/50 dark:via-background/60 to-transparent" />
            
            {/* Mobile Close Button - Top Right */}
            {isMobile && (
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "absolute top-4 right-4 z-20 rounded-full",
                  "bg-background/80 backdrop-blur-md shadow-md",
                  "border-border/40 hover:bg-background/90",
                  "h-10 w-10"
                )}
                onClick={() => onOpenChange(false)}
                aria-label="Close event details"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
            
            {/* Floating Navigation Arrows - Desktop only */}
            {!isMobile && (
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "rounded-full bg-background/70 dark:bg-background/80 backdrop-blur-md shadow-md pointer-events-auto",
                    "border-border/40 hover:bg-background/90 hover:scale-110 active:scale-95",
                    "transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    "opacity-75 hover:opacity-100 focus-visible:opacity-100",
                    !hasPrev && "pointer-events-none"
                  )}
                  onClick={onNavigatePrev}
                  disabled={!hasPrev}
                  aria-label="Previous meetup (← key)"
                  title="Previous meetup (← key)"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "rounded-full bg-background/70 dark:bg-background/80 backdrop-blur-md shadow-md pointer-events-auto",
                    "border-border/40 hover:bg-background/90 hover:scale-110 active:scale-95",
                    "transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    "opacity-75 hover:opacity-100 focus-visible:opacity-100",
                    !hasNext && "pointer-events-none"
                  )}
                  onClick={onNavigateNext}
                  disabled={!hasNext}
                  aria-label="Next meetup (→ key)"
                  title="Next meetup (→ key)"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Title Overlay */}
            <div 
              className={cn(
                "absolute left-0 right-0 p-6",
                isMobile ? "bottom-0" : "bottom-0"
              )}
              style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' } : undefined}
            >
              <h2 
                className="text-[28px] md:text-[32px] font-bold tracking-tight text-white max-w-[22ch]"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)' }}
              >
                {event.title}
              </h2>
              
              {/* Unified Host Bar */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mt-3">
                {/* Identity Chip - Clickable to profile */}
                <div
                  className={cn(
                    "group flex items-center gap-2 h-11 sm:h-11 px-2 rounded-full",
                    "bg-background/95 backdrop-blur-sm shadow-lg"
                  )}
                >
                  <ClickableAvatar
                    userId={event.created_by}
                    src={event.creator_avatar_url || event.author?.avatar}
                    fallback={(event.creator_display_name || event.author?.name)?.[0] || 'H'}
                    alt={event.creator_display_name || event.author?.name || 'Community Host'}
                    className="h-7 w-7 ring-1 ring-white/50"
                    onPreview={(uid, e) => {
                      e.stopPropagation();
                      openPreview(uid);
                    }}
                  />
                  <div className="flex items-center gap-1.5 pr-2">
                    <span className="text-sm font-semibold max-w-[120px] sm:max-w-[160px] truncate">
                      {event.creator_display_name || event.author?.name || 'Community Host'}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-medium">
                      Host
                    </span>
                  </div>
                </div>

                {/* Follow Button - Same height as chip */}
                <Button
                  onClick={async () => {
                    setIsFollowLoading(true);
                    await new Promise(resolve => setTimeout(resolve, 800));
                    setIsFollowing(!isFollowing);
                    setIsFollowLoading(false);
                    toast({
                      title: isFollowing ? "Unfollowed" : "Following!",
                      description: isFollowing 
                        ? `You unfollowed ${event.creator_display_name || event.author?.name || 'the host'}` 
                        : `You're now following ${event.creator_display_name || event.author?.name || 'the host'}`,
                    });
                  }}
                  disabled={isFollowLoading}
                  aria-label={`Follow ${event.creator_display_name || event.author?.name || 'host'}`}
                  aria-pressed={isFollowing}
                  variant={isFollowing ? "secondary" : "outline"}
                  className={cn(
                    "h-11 sm:h-11 rounded-full gap-1.5 px-4",
                    "bg-background/95 backdrop-blur-sm shadow-lg",
                    "hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
                    prefersReducedMotion && "transition-none hover:scale-100 active:scale-100",
                    isFollowing && "bg-muted/50"
                  )}
                >
                  {isFollowLoading ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                      <span className="text-sm">Following…</span>
                    </>
                  ) : isFollowing ? (
                    <>
                      <Check className="h-[18px] w-[18px]" />
                      <span className="text-sm">Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-[18px] w-[18px]" />
                      <span className="text-sm">Follow</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{event.pillar || 'Community'}</Badge>
              <Badge variant="outline">{event.event_type || 'Meetup'}</Badge>
              {event.language && (
                <Badge variant="outline" className="gap-1">
                  <Languages className="h-3 w-3" />
                  {event.language}
                </Badge>
              )}
              {event.accessible && (
                <Badge variant="outline" className="gap-1">
                  <Accessibility className="h-3 w-3" />
                  Accessible
                </Badge>
              )}
            </div>

            {/* Social Proof - Compact People Going Banner */}
            {followersGoing.length > 0 && (
              <button 
                className="flex items-center gap-3 p-3 bg-muted/10 hover:bg-muted/20 rounded-2xl border-0 transition-colors w-full text-left cursor-pointer"
                onClick={() => {
                  const attendeesSection = document.querySelector('[data-section="attendees"]');
                  attendeesSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className="flex -space-x-2">
                  {followersGoing.slice(0, 4).map((follower, i) => (
                    <div key={i} className="group relative">
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={follower.avatar} />
                        <AvatarFallback className="text-xs">{follower.name[0]}</AvatarFallback>
                      </Avatar>
                      {/* Follow back pill - shown on hover for first unfollowed user */}
                      {i === 0 && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="px-2 py-1 text-[11px] font-medium bg-primary text-primary-foreground rounded-full whitespace-nowrap shadow-lg">
                            Follow back
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {followersGoing.length > 4 && (
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-accent border-2 border-background text-[10px] font-semibold">
                      +{followersGoing.length - 4}
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium flex-1">
                  People you follow are going
                </p>
              </button>
            )}

            {/* When & Where */}
            <div className="space-y-4 p-5 bg-muted/30 rounded-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-[17px]">When & Where</h3>
                </div>
                <div className="flex items-center gap-0 p-1 bg-background/50 rounded-full">
                  <button
                    onClick={() => setShowLocalTime(true)}
                    aria-pressed={showLocalTime}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                      showLocalTime ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Local
                  </button>
                  <button
                    onClick={() => setShowLocalTime(false)}
                    aria-pressed={!showLocalTime}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                      !showLocalTime ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    UTC
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px]">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-[14px] text-muted-foreground">
                      {format(startDate, 'HH:mm')} {endDate && `- ${format(endDate, 'HH:mm')}`}
                      {!showLocalTime && ' UTC'}
                    </p>
                    {showCountdown && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-primary/10 rounded-full w-fit">
                        <Timer className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">Starts {formatDistanceToNow(startDate, { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[15px]">{duration} minutes</p>
                  </div>
                </div>

                {event.virtual_link ? (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[15px]">Virtual Event</p>
                      <Button variant="link" className="h-auto p-0 text-primary text-[13px]" asChild>
                        <a href={event.virtual_link} target="_blank" rel="noopener noreferrer">
                          Join link · Opens 5 min before
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : event.location && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a 
                          href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[15px] text-primary hover:underline"
                        >
                          {event.location}
                        </a>
                        <Button 
                          variant="link" 
                          className="h-auto p-0 text-muted-foreground text-[13px] gap-1 hover:text-primary"
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(event.location)}`, '_blank')}
                        >
                          <Navigation className="h-3 w-3" />
                          Get directions
                        </Button>
                      </div>
                    </div>
                    {/* Mini map placeholder */}
                    <div className="w-full h-32 bg-muted rounded-xl flex items-center justify-center overflow-hidden">
                      <MapPinned className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Capacity & Alert */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {current} / {capacity} attending
                  </span>
                </div>
                {isLowCapacity && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Only {spotsLeft} left!</span>
                  </div>
                )}
              </div>
              <Progress value={capacityPercent} className="h-2" />
            </div>

            {/* Autopilot Suggestions */}
            <div className="space-y-3 p-4 bg-sys-autopilot-tint/20 border border-sys-autopilot-accent/30 rounded-2xl">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-sys-autopilot-accent" />
                <span className="text-sm font-semibold">Autopilot Suggestions</span>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-auto py-2.5">
                  <Target className="h-4 w-4 shrink-0" />
                  <span className="text-left">Fit into my week</span>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-auto py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-left">Resolve schedule conflict</span>
                </Button>
                {!event.virtual_link && event.location && (
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-auto py-2.5">
                    <Car className="h-4 w-4 shrink-0" />
                    <span className="text-left">Plan commute</span>
                  </Button>
                )}
              </div>
            </div>

            {/* About */}
            <div className="space-y-3 pt-5 border-t border-border/50">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-[17px]">About</h3>
              </div>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                {event.description || 'No description provided.'}
              </p>
            </div>

            {/* Agenda */}
            {event.agenda && (
              <div className="space-y-3 pt-5 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-[17px]">Agenda</h3>
                </div>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{event.agenda}</p>
              </div>
            )}

            {/* Host */}
            <div className="space-y-4 pt-5 border-t border-border/50">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-[17px]">Host</h3>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-2xl">
                <ClickableAvatar
                  userId={event.created_by}
                  src={event.creator_avatar_url || event.author?.avatar}
                  fallback={(event.creator_display_name || event.author?.name)?.[0] || 'H'}
                  alt={event.creator_display_name || event.author?.name || 'Community Host'}
                  className="h-14 w-14 border-2 border-primary"
                  onPreview={(uid, e) => {
                    e.stopPropagation();
                    openPreview(uid);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold text-[15px]">{event.creator_display_name || event.author?.name || 'Community Host'}</p>
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">Organizer</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5"
                  onClick={handleMessageHost}
                  disabled={isCreatingThread}
                >
                  {isCreatingThread ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Attendees */}
            {attendees.length > 0 && (
              <div className="space-y-4 pt-5 border-t border-border/50" data-section="attendees">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-[17px]">Attendees ({current})</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {attendees.map((attendee, i) => (
                    <Avatar key={i} className="h-11 w-11 border-2 border-background ring-1 ring-muted hover:ring-primary transition-all cursor-pointer">
                      <AvatarImage src={attendee.avatar} />
                      <AvatarFallback>{attendee.name[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                  {current > 10 && (
                    <div className="flex items-center justify-center h-11 w-11 rounded-full bg-muted border-2 border-background text-xs font-semibold">
                      +{current - 10}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ticket Sales Section */}
            {isTicketed && (
              <div className="space-y-4 pt-5 border-t border-border/50" data-section="tickets">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-[17px]">Tickets</h3>
                    {isSoldOut && (
                      <Badge variant="secondary" className="ml-2">Sold Out</Badge>
                    )}
                  </div>
                  {isOrganizer && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowSalesDashboard(!showSalesDashboard)}
                      className="gap-1.5"
                    >
                      <BarChart3 className="h-4 w-4" />
                      {showSalesDashboard ? "Hide Sales" : "View Sales"}
                    </Button>
                  )}
                </div>
                
                {/* Price preview */}
                {!isSoldOut && lowestPrice !== null && (
                  <div className="text-sm text-muted-foreground">
                    {isPaid ? `From ${formatTicketPrice(lowestPrice, ticketCurrency)}` : 'Free tickets available'}
                  </div>
                )}
                
                {/* Organizer Sales Dashboard */}
                {isOrganizer && showSalesDashboard && (
                  <EventSalesDashboard 
                    eventId={event.id} 
                    eventTitle={event.title}
                  />
                )}
                
                {/* Ticket Selector for buyers (hide for organizer when dashboard is shown) */}
                {(!isOrganizer || !showSalesDashboard) && (
                  <div data-section="tickets" className="transition-all duration-300">
                    <EventTicketSelector 
                      eventId={event.id} 
                      eventTitle={event.title}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Policies */}
            {(event.requirements || event.cancellation_policy) && (
              <div className="space-y-4 pt-5 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-[17px]">Policies</h3>
                </div>
                {event.requirements && (
                  <div className="p-4 bg-muted/30 rounded-2xl">
                    <h4 className="font-medium mb-1.5 text-[14px]">Requirements</h4>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{event.requirements}</p>
                  </div>
                )}
                {event.cancellation_policy && (
                  <div className="p-4 bg-muted/30 rounded-2xl">
                    <h4 className="font-medium mb-1.5 text-[14px]">Cancellation</h4>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{event.cancellation_policy}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Sticky Action Bar */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-lg",
        isMobile ? "px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" : "p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      )}>
        <div className="flex items-center justify-center gap-2.5">
          {/* Use unified CTA logic */}
          {(() => {
            const getCtaButtonClasses = () => {
              switch (ctaConfig.variant) {
                case 'ticket':
                  return cn("flex-1 font-semibold text-[15px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white", isMobile ? "h-10" : "h-12");
                case 'view-ticket':
                  return cn("flex-1 font-semibold text-[15px] bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white", isMobile ? "h-10" : "h-12");
                case 'disabled':
                  return cn("flex-1 font-semibold text-[15px] bg-muted text-muted-foreground cursor-not-allowed", isMobile ? "h-10" : "h-12");
                case 'join':
                default:
                  return cn("flex-1 font-semibold text-[15px]", isMobile ? "h-10" : "h-12");
              }
            };

            const getCtaIcon = () => {
              switch (ctaConfig.icon) {
                case 'ticket': return <Ticket className="h-4 w-4 mr-2" />;
                case 'eye': return <Eye className="h-4 w-4 mr-2" />;
                case 'user-plus': return <UserPlus className="h-4 w-4 mr-2" />;
                case 'user-minus': return <UserMinus className="h-4 w-4 mr-2" />;
                default: return null;
              }
            };

            const handleCtaClick = async () => {
              switch (ctaConfig.action) {
                case 'buy-ticket':
                case 'get-free-ticket':
                  const ticketsSection = document.querySelector('[data-section="tickets"]');
                  if (ticketsSection) {
                    ticketsSection.scrollIntoView({ behavior: 'smooth' });
                    // Add highlight effect for 500ms
                    ticketsSection.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
                    setTimeout(() => {
                      ticketsSection.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
                    }, 500);
                  }
                  break;
                case 'view-ticket':
                  // Navigate to user's tickets
                  navigate('/discover/orders?tab=active');
                  onOpenChange(false);
                  break;
                case 'join':
                case 'reserve':
                  handleJoin();
                  break;
                case 'leave':
                case 'cancel':
                  // Handle leave/cancel
                  setIsJoining(true);
                  try {
                    setIsJoined(false);
                    toast({
                      title: ctaConfig.action === 'leave' ? "Left MeetUp" : "Reservation Cancelled",
                      description: "You've been removed from this event.",
                    });
                  } catch (error) {
                    console.error('Failed to leave event:', error);
                    toast({
                      title: "Error",
                      description: "Failed to leave the event. Please try again.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsJoining(false);
                  }
                  break;
              }
            };

            const isTicketCta = ctaConfig.action === 'buy-ticket' || ctaConfig.action === 'get-free-ticket';
            const shouldFade = isTicketCta && isTicketSectionVisible;

            return (
              <Button
                className={cn(
                  getCtaButtonClasses(),
                  "transition-opacity duration-300",
                  shouldFade && "opacity-0 pointer-events-none"
                )}
                onClick={handleCtaClick}
                disabled={ctaConfig.disabled || isJoining || shouldFade}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {ctaConfig.action === 'join' || ctaConfig.action === 'reserve' 
                      ? translate('eventCta.joining', 'Joining...') 
                      : translate('eventCta.processing', 'Processing...')}
                  </>
                ) : (
                  <>
                    {getCtaIcon()}
                    {/* For ticketed events, show translated "Buy Ticket" without price in sticky bar */}
                    {isTicketCta ? translate('eventCta.buyTicket', 'Buy Ticket') : ctaConfig.label}
                  </>
                )}
              </Button>
            );
          })()}

          {/* Promote Button (only for event creators) */}
          {user && event.created_by === user.id && onPromoteEvent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("shrink-0", isMobile ? "h-10 w-10" : "h-12 w-12")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPromoteEvent(event);
                    }}
                    aria-label={translate('eventCta.promoteEvent', 'Promote event')}
                  >
                    <Megaphone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{translate('eventCta.promoteEvent', 'Promote event')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className={cn("shrink-0", isMobile ? "h-10 w-10" : "h-12 w-12")}
                      aria-label="Add to calendar"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add to calendar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleExportToCalendar('google')}>
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportToCalendar('outlook')}>
                Outlook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportToCalendar('apple')}>
                Apple Calendar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExportToCalendar('ics')}>
                <Download className="h-4 w-4 mr-2" />
                Download ICS
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={cn("shrink-0", isMobile ? "h-10 w-10" : "h-12 w-12")}
                  onClick={() => setShareDialogOpen(true)}
                  aria-label="Share meetup"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share event</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn("shrink-0", isMobile ? "h-10 w-10" : "h-12 w-12", isSaved && "bg-accent")}
                  onClick={handleSave}
                  aria-label={isSaved ? "Remove from saved" : "Save for later"}
                >
                  <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isSaved ? "Remove from saved" : "Save for later"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Message Compose Modal */}
      {event.created_by && (
        <MessageComposeModal
          isOpen={messageModalOpen}
          onOpenChange={setMessageModalOpen}
          recipient={{
            id: event.created_by,
            name: event.creator_display_name || 'Event Host',
            handle: event.creator_handle || 'host',
            avatarUrl: event.creator_avatar_url || '',
            roles: [],
            stats: { posts: 0, followers: 0, following: 0, mediaUploads: 0, groupsJoined: 0 },
            visibility: {
              about: 'public',
              links: 'public',
              location: 'public',
              showcase: 'public',
              indexPublic: false,
              healthShareConsent: false
            }
          }}
          onSend={handleSendMessageToHost}
        />
      )}

      {/* Share Dialog */}
      <UniversalShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        content={{
          type: "event",
          id: event.id,
          title: event.title,
          description: event.description,
          image_url: event.image_url || event.cover_image_url,
          url: shareUrl
        }}
      />
      
      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog />
    </div>
    </>
  );

  // Use Drawer for desktop, Sheet for mobile
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="!inset-0 !h-full p-0 rounded-none [&>button]:hidden"
        >
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-screen top-0 right-0 left-auto mt-0 w-full md:w-[500px] rounded-none">
        {content}
      </DrawerContent>
    </Drawer>
  );
}
