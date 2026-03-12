import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useFollow } from "@/hooks/useFollow";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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
  CalendarPlus,
  BarChart3,
  Eye,
} from "lucide-react";
import { cn, getAbsoluteImageUrl } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { de as deLocale } from "date-fns/locale";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import SEO from "@/components/SEO";
import { EventKebabMenu } from "@/components/events/EventKebabMenu";

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
  onShareEvent?: (event: any) => void;
  onEditEvent?: (event: any) => void;
  onDeleteEvent?: (eventId: string) => void;
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
  onShareEvent,
  onEditEvent,
  onDeleteEvent,
}: MeetupDetailsDrawerProps) {
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isCheckingParticipation, setIsCheckingParticipation] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const { isFollowing, loading: isFollowLoading, followUser, unfollowUser } = useFollow(event.created_by);
  const [showLocalTime, setShowLocalTime] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [previousEventId, setPreviousEventId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [userHasTicket, setUserHasTicket] = useState(false);
  const [isTicketSectionVisible, setIsTicketSectionVisible] = useState(false);
  const [liveParticipantCount, setLiveParticipantCount] = useState<number | null>(null);
  const [hasTicketSelection, setHasTicketSelection] = useState(false);
  
  const { userId: previewUserId, isOpen: isPreviewOpen, openPreview, closePreview } = useProfilePreview();
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  // Share dialog state now managed by parent via onShareEvent callback
  
  const { addEvent, removeEvent } = useCalendarEvents();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { translate, isGerman } = useTranslation();
  const queryClient = useQueryClient();

  // Save/restore scroll position to prevent page shift on mobile when Sheet closes
  const scrollYRef = useRef(0);
  useEffect(() => {
    if (!isMobile) return;
    if (open) {
      scrollYRef.current = window.scrollY;
    } else {
      const savedY = scrollYRef.current;
      requestAnimationFrame(() => {
        window.scrollTo(0, savedY);
      });
    }
  }, [open, isMobile]);

  // Invalidate events cache so list cards update immediately
  const invalidateEventsCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['global-community-events'] });
  }, [queryClient]);

  // Sync participant count back to global_community_events table
  const syncEventParticipantCount = useCallback(async (eventId: string, count: number) => {
    try {
      await supabase
        .from('global_community_events')
        .update({ participant_count: count })
        .eq('id', eventId);
    } catch (err) {
      console.error('[MeetupDrawer] Failed to sync participant count:', err);
    }
  }, []);
  
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

  // Check participation status when drawer opens
  useEffect(() => {
    const checkParticipation = async () => {
      if (!open || !event?.id || !user) {
        return;
      }
      
      setIsCheckingParticipation(true);
      try {
        const { data, error } = await supabase
          .from('global_event_participants')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .eq('status', 'attending')
          .maybeSingle();
        
        if (!error) {
          setIsJoined(!!data);
        }
      } catch (err) {
        console.error('Error checking participation:', err);
      } finally {
        setIsCheckingParticipation(false);
      }
    };

    checkParticipation();
  }, [open, event?.id, user]);

  // Realtime subscription for live participant count
  useEffect(() => {
    if (!open || !event?.id) return;

    // Initialize from event prop
    setLiveParticipantCount(event.participant_count || 0);

    const channel = supabase
      .channel(`drawer-participants-${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_event_participants',
          filter: `event_id=eq.${event.id}`
        },
        async () => {
          // Refetch actual count
          const { data, error } = await supabase
            .from('global_event_participants')
            .select('id', { count: 'exact' })
            .eq('event_id', event.id)
            .eq('status', 'attending');

          if (!error && data !== null) {
            setLiveParticipantCount(data.length);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, event?.id]);

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
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to join events",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }

      // Insert into global_event_participants
      const { error: participateError } = await supabase
        .from('global_event_participants')
        .insert({
          event_id: event.id,
          user_id: user.id,
          status: 'attending'
        });

      if (participateError) throw participateError;

      // Add to VITANA Smart Calendar
      const calendarEvent = {
        user_id: '',
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
      
      const addedEvent = await addEvent(calendarEvent, { showToast: false });
      
      setIsJoined(true);
      setLiveParticipantCount(prev => (prev ?? 0) + 1);
      setIsJoining(false);
      // Sync count to DB and invalidate cache
      const newCount = (liveParticipantCount ?? (event.participant_count || 0)) + 1;
      syncEventParticipantCount(event.id, newCount);
      invalidateEventsCache();
      
      toast({
        title: "Added to Smart Calendar ✓",
        description: "Event saved. We'll remind you before it starts.",
        duration: 5000,
        action: addedEvent ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              // Undo: remove from both tables
              await supabase
                .from('global_event_participants')
                .delete()
                .eq('event_id', event.id)
                .eq('user_id', user.id);
              await removeEvent(addedEvent.id);
              setIsJoined(false);
              setLiveParticipantCount(prev => Math.max(0, (prev ?? 1) - 1));
              invalidateEventsCache();
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
  const shareUrl = getShareUrl('event', event.id, { slug: event.slug });

  // Add to VITANA Smart Calendar (primary action)
  const handleAddToVitanaCalendar = async () => {
    if (!user) {
      toast({
        title: translate('auth.signInRequired', 'Sign in required'),
        description: translate('calendar.signInToAdd', 'Please sign in to add to your calendar'),
        variant: "destructive"
      });
      return;
    }
    
    try {
      const calendarEvent = {
        user_id: '',
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
      
      await addEvent(calendarEvent);
      
      toast({
        title: translate('calendar.addedToSmart', 'Added to Smart Calendar ✓'),
        description: translate('calendar.eventSaved', "Event saved. We'll remind you before it starts."),
      });
    } catch (error) {
      console.error('Failed to add to VITANA calendar:', error);
      toast({
        title: translate('errors.failedToAdd', 'Failed to add event'),
        description: translate('errors.tryAgain', 'Please try again.'),
        variant: "destructive",
      });
    }
  };

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
  const current = liveParticipantCount ?? (event.participant_count || 0);
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
        title: translate('eventDrawer.authRequired', 'Authentication required'),
        description: translate('eventDrawer.signInToMessage', 'Please sign in to message the host'),
        variant: "destructive"
      });
      return;
    }

    // Get host ID from event creator
    const hostId = event.created_by;
    
    if (!hostId) {
      toast({
        title: translate('eventDrawer.cannotMessageHost', 'Cannot message host'),
        description: translate('eventDrawer.hostNotAvailable', 'Host information not available'),
        variant: "destructive"
      });
      return;
    }

    if (hostId === user.id) {
      toast({
        title: translate('eventDrawer.cannotMessageSelf', 'Cannot message yourself'),
        description: translate('eventDrawer.youAreHost', 'You are the host of this event'),
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
        title: translate('eventDrawer.messageSent', 'Message sent! 📨'),
        description: translate('eventDrawer.messageSentDesc', 'Your message has been sent to {name}').replace('{name}', event.creator_display_name || event.author?.name || translate('eventDrawer.host', 'the host')),
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
      {isMobile && (
        <>
          <div
            className="fixed top-4 left-4 z-[60]"
            style={{ top: 'calc(env(safe-area-inset-top) + 4px)' }}
          >
            <EventKebabMenu
              event={event}
              currentUserId={user?.id}
              onEdit={onEditEvent ? (ev) => { onOpenChange(false); onEditEvent(ev); } : undefined}
              onDelete={onDeleteEvent ? (id) => { onOpenChange(false); onDeleteEvent(id); } : undefined}
              onShare={onShareEvent}
              className="text-white bg-background/80 backdrop-blur-md rounded-full shadow-md border border-border/40 h-10 w-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-4 right-4 z-[60] rounded-full bg-background/80 backdrop-blur-md shadow-md border-border/40 hover:bg-background/90 h-10 w-10"
            onClick={() => onOpenChange(false)}
            aria-label="Close event details"
            style={{ top: 'calc(env(safe-area-inset-top) + 4px)' }}
          >
            <X className="h-5 w-5" />
          </Button>
        </>
      )}
      {!isMobile && (
        <div className="absolute top-4 right-4 z-[60]">
          <EventKebabMenu
            event={event}
            currentUserId={user?.id}
            onEdit={onEditEvent ? (ev) => { onOpenChange(false); onEditEvent(ev); } : undefined}
            onDelete={onDeleteEvent ? (id) => { onOpenChange(false); onDeleteEvent(id); } : undefined}
            onShare={onShareEvent}
            className="text-white bg-black/40 hover:bg-black/60 rounded-full h-9 w-9"
          />
        </div>
      )}
      <ScrollArea className={cn("flex-1", isMobile ? "pb-[120px]" : "pb-20")}>
        <div 
          className={cn(
            "transition-opacity duration-300",
            isTransitioning && !prefersReducedMotion && "opacity-40"
          )}
        >
          {/* Hero Image - Edge to edge */}
          <div className={cn(
            "relative w-full bg-muted overflow-hidden",
            isMobile ? "min-h-[50vh]" : "aspect-video"
          )}>
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
            
            {/* Mobile Close Button moved outside ScrollArea for sticky behavior */}
            

            {/* Title Overlay */}
            <div 
              className={cn(
                "absolute left-0 right-0 p-6",
                "bottom-0"
              )}
              style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 18px)' } : undefined}
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
                      {event.creator_display_name || event.author?.name || translate('eventDrawer.communityHost', 'Community Host')}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-medium">
                       {translate('eventDrawer.host', 'Host')}
                     </span>
                  </div>
                </div>

                {/* Follow Button - Same height as chip */}
                <Button
                  onClick={async () => {
                    if (isFollowing) {
                      await unfollowUser();
                    } else {
                      await followUser();
                    }
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
                      <span className="text-sm">{translate('eventDrawer.followingLoading', 'Following…')}</span>
                    </>
                  ) : isFollowing ? (
                    <>
                      <Check className="h-[18px] w-[18px]" />
                      <span className="text-sm">{translate('eventDrawer.following', 'Following')}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-[18px] w-[18px]" />
                      <span className="text-sm">{translate('eventDrawer.follow', 'Follow')}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{event.pillar || translate('eventDrawer.community', 'Community')}</Badge>
              <Badge variant="outline">{event.event_type || translate('eventDrawer.meetup', 'Meetup')}</Badge>
              {event.language && (
                <Badge variant="outline" className="gap-1">
                  <Languages className="h-3 w-3" />
                  {event.language}
                </Badge>
              )}
              {event.accessible && (
                <Badge variant="outline" className="gap-1">
                  <Accessibility className="h-3 w-3" />
                  {translate('eventDrawer.accessible', 'Accessible')}
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
                             {translate('eventDrawer.followBack', 'Follow back')}
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
                   {translate('eventDrawer.followersGoing', 'People you follow are going')}
                 </p>
              </button>
            )}

            {/* When & Where */}
            <div className="space-y-4 p-5 bg-muted/30 rounded-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-[17px]">{translate('eventDrawer.whenWhere', 'When & Where')}</h3>
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
                     {translate('eventDrawer.local', 'Local')}
                  </button>
                  <button
                    onClick={() => setShowLocalTime(false)}
                    aria-pressed={!showLocalTime}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                      !showLocalTime ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                     {translate('eventDrawer.utc', 'UTC')}
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px]">{format(startDate, 'EEEE, MMMM d, yyyy', { locale: isGerman ? deLocale : undefined })}</p>
                    <p className="text-[14px] text-muted-foreground">
                      {format(startDate, 'HH:mm')} {endDate && `- ${format(endDate, 'HH:mm')}`}
                      {!showLocalTime && ' UTC'}
                    </p>
                    {showCountdown && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-primary/10 rounded-full w-fit">
                        <Timer className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">{translate('eventDrawer.startsIn', 'Starts {time}').replace('{time}', formatDistanceToNow(startDate, { addSuffix: true, locale: isGerman ? deLocale : undefined }))}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[15px]">{translate('eventDrawer.durationMinutes', '{duration} minutes').replace('{duration}', String(duration))}</p>
                  </div>
                </div>

                {event.virtual_link ? (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                       <p className="font-medium text-[15px]">{translate('eventDrawer.virtualEvent', 'Virtual Event')}</p>
                       <Button variant="link" className="h-auto p-0 text-primary text-[13px]" asChild>
                         <a href={event.virtual_link} target="_blank" rel="noopener noreferrer">
                           {translate('eventDrawer.joinLinkOpens', 'Join link · Opens 5 min before')}
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
                          {translate('eventDrawer.getDirections', 'Get directions')}
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
                     {translate('eventDrawer.attending', '{current} / {capacity} attending').replace('{current}', String(current)).replace('{capacity}', String(capacity))}
                   </span>
                </div>
                {isLowCapacity && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">{translate('eventDrawer.spotsLeft', 'Only {count} left!').replace('{count}', String(spotsLeft))}</span>
                  </div>
                )}
              </div>
              <Progress value={capacityPercent} className="h-2" />
            </div>

            {/* Autopilot Suggestions */}
            <div className="space-y-3 p-4 bg-sys-autopilot-tint/20 border border-sys-autopilot-accent/30 rounded-2xl">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-sys-autopilot-accent" />
                <span className="text-sm font-semibold">{translate('eventDrawer.autopilotSuggestions', 'Autopilot Suggestions')}</span>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-auto py-2.5">
                  <Target className="h-4 w-4 shrink-0" />
                  <span className="text-left">{translate('eventDrawer.fitIntoWeek', 'Fit into my week')}</span>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-auto py-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-left">{translate('eventDrawer.resolveConflict', 'Resolve schedule conflict')}</span>
                </Button>
                {!event.virtual_link && event.location && (
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-auto py-2.5">
                    <Car className="h-4 w-4 shrink-0" />
                    <span className="text-left">{translate('eventDrawer.planCommute', 'Plan commute')}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* About */}
            <div className="space-y-3 pt-5 border-t border-border/50">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-[17px]">{translate('eventDrawer.about', 'About')}</h3>
              </div>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                {event.description || translate('eventDrawer.noDescription', 'No description provided.')}
              </p>
            </div>

            {/* Detailed Description / Program */}
            {event.metadata?.detailed_description && (
              <div className="space-y-3 pt-5 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-[17px]">Details & Program</h3>
                </div>
                <p className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-line">{event.metadata.detailed_description}</p>
              </div>
            )}

            {/* Agenda */}
            {event.agenda && (
              <div className="space-y-3 pt-5 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-[17px]">{translate('eventDrawer.agenda', 'Agenda')}</h3>
                </div>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{event.agenda}</p>
              </div>
            )}

            {/* Host */}
            <div className="space-y-4 pt-5 border-t border-border/50">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-[17px]">{translate('eventDrawer.host', 'Host')}</h3>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-2xl">
                <ClickableAvatar
                  userId={event.created_by}
                  src={event.creator_avatar_url || event.author?.avatar}
                  fallback={(event.creator_display_name || event.author?.name)?.[0] || 'H'}
                   alt={event.creator_display_name || event.author?.name || translate('eventDrawer.communityHost', 'Community Host')}
                  className="h-14 w-14 border-2 border-primary"
                  onPreview={(uid, e) => {
                    e.stopPropagation();
                    openPreview(uid);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold text-[15px]">{event.creator_display_name || event.author?.name || translate('eventDrawer.communityHost', 'Community Host')}</p>
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">{translate('eventDrawer.organizer', 'Organizer')}</p>
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
                      {translate('eventDrawer.sending', 'Sending...')}
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4" />
                       {translate('eventDrawer.message', 'Message')}
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
                  <h3 className="font-semibold text-[17px]">{translate('eventDrawer.attendees', 'Attendees ({count})').replace('{count}', String(current))}</h3>
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
                    <h3 className="font-semibold text-[17px]">{translate('eventDrawer.tickets', 'Tickets')}</h3>
                    {isSoldOut && (
                      <Badge variant="secondary" className="ml-2">{translate('eventCta.soldOut', 'Sold Out')}</Badge>
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
                      {showSalesDashboard ? translate('eventDrawer.hideSales', 'Hide Sales') : translate('eventDrawer.viewSales', 'View Sales')}
                    </Button>
                  )}
                </div>
                
                {/* Price preview */}
                {!isSoldOut && lowestPrice !== null && (
                  <div className="text-sm text-muted-foreground">
                    {isPaid ? translate('eventDrawer.fromPrice', 'From {price}').replace('{price}', formatTicketPrice(lowestPrice, ticketCurrency)) : translate('eventDrawer.freeTickets', 'Free tickets available')}
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
                      onSelectionChange={setHasTicketSelection}
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
                  <h3 className="font-semibold text-[17px]">{translate('eventDrawer.policies', 'Policies')}</h3>
                </div>
                {event.requirements && (
                  <div className="p-4 bg-muted/30 rounded-2xl">
                    <h4 className="font-medium mb-1.5 text-[14px]">{translate('eventDrawer.requirements', 'Requirements')}</h4>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{event.requirements}</p>
                  </div>
                )}
                {event.cancellation_policy && (
                  <div className="p-4 bg-muted/30 rounded-2xl">
                    <h4 className="font-medium mb-1.5 text-[14px]">{translate('eventDrawer.cancellation', 'Cancellation')}</h4>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{event.cancellation_policy}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Sticky Action Bar - Premium Glassy Design */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 flex items-center",
          isMobile 
            ? "backdrop-blur-xl" 
            : "bg-background/95 backdrop-blur-sm border-t shadow-lg"
        )}
        style={isMobile ? {
          minHeight: '72px',
          paddingTop: '10px',
          paddingLeft: '12px',
          paddingRight: '12px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.86)',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.08)'
        } : {
          padding: '16px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
        }}
      >
        <div className="flex items-center gap-2.5 w-full">
          {/* Use unified CTA logic */}
          {(() => {
            // Premium CTA button styles for mobile
            const getMobilePrimaryCtaStyle = (): React.CSSProperties => ({
              height: '48px',
              borderRadius: '14px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0b1220',
              color: 'white',
              border: 'none'
            });

            const getCtaButtonClasses = () => {
              const baseClasses = "flex-1 font-semibold text-[15px] flex items-center justify-center";
              
              if (isMobile) {
                // Mobile uses inline styles for premium look
                switch (ctaConfig.variant) {
                  case 'ticket':
                    return cn(baseClasses, "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-[14px] h-12");
                  case 'view-ticket':
                    return cn(baseClasses, "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-[14px] h-12");
                  case 'disabled':
                    return cn(baseClasses, "bg-muted text-muted-foreground cursor-not-allowed rounded-[14px] h-12");
                  case 'join':
                  default:
                    return cn(baseClasses, "rounded-[14px] h-12");
                }
              }
              
              // Desktop styles
              switch (ctaConfig.variant) {
                case 'ticket':
                  return cn(baseClasses, "h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white");
                case 'view-ticket':
                  return cn(baseClasses, "h-12 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white");
                case 'disabled':
                  return cn(baseClasses, "h-12 bg-muted text-muted-foreground cursor-not-allowed");
                case 'join':
                default:
                  return cn(baseClasses, "h-12");
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
                  // Handle leave/cancel - actually delete from DB
                  setIsJoining(true);
                  try {
                    if (!user) throw new Error('Not authenticated');
                    
                    // Delete from global_event_participants
                    const { error: deleteError } = await supabase
                      .from('global_event_participants')
                      .delete()
                      .eq('event_id', event.id)
                      .eq('user_id', user.id);
                    
                    if (deleteError) throw deleteError;
                    
                    // Remove matching calendar event
                    try {
                      const { data: calendarEvents } = await supabase
                        .from('calendar_events')
                        .select('id, metadata')
                        .eq('user_id', user.id);
                      
                      if (calendarEvents) {
                        const matchingEvent = calendarEvents.find((ce: any) => {
                          const meta = ce.metadata;
                          return meta && typeof meta === 'object' && (meta as any).meetup_id === event.id;
                        });
                        if (matchingEvent) {
                          await removeEvent(matchingEvent.id);
                        }
                      }
                    } catch (calError) {
                      console.error('Error removing calendar event:', calError);
                    }
                    
                    setIsJoined(false);
                    setLiveParticipantCount(prev => Math.max(0, (prev ?? 1) - 1));
                    // Sync count to DB and invalidate cache
                    const newCancelCount = Math.max(0, (liveParticipantCount ?? (event.participant_count || 0)) - 1);
                    syncEventParticipantCount(event.id, newCancelCount);
                    invalidateEventsCache();
                     toast({
                       title: ctaConfig.action === 'leave' ? translate('eventDrawer.leftMeetup', 'Left MeetUp') : translate('eventDrawer.reservationCancelled', 'Reservation Cancelled'),
                       description: translate('eventDrawer.removedFromEvent', "You've been removed from this event."),
                     });
                   } catch (error) {
                     console.error('Failed to leave event:', error);
                     toast({
                       title: translate('eventDrawer.error', 'Error'),
                       description: translate('eventDrawer.leaveError', 'Failed to leave the event. Please try again.'),
                       variant: "destructive",
                     });
                  } finally {
                    setIsJoining(false);
                  }
                  break;
              }
            };

            const isTicketCta = ctaConfig.action === 'buy-ticket' || ctaConfig.action === 'get-free-ticket';
            const shouldFade = isTicketCta && hasTicketSelection;
            return (
              <Button
                className={cn(
                  getCtaButtonClasses(),
                  "transition-opacity duration-300",
                  shouldFade && "opacity-0 pointer-events-none"
                )}
                style={isMobile && ctaConfig.variant === 'join' ? getMobilePrimaryCtaStyle() : undefined}
                onClick={handleCtaClick}
                disabled={ctaConfig.disabled || isJoining || (!isTicketCta && isCheckingParticipation) || shouldFade}
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

          {/* Icon Rail - Premium glassy buttons */}
          {/* Promote Button (only for event creators) - Close drawer first */}
          {user && event.created_by === user.id && onPromoteEvent && (
            isMobile ? (
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 flex items-center justify-center h-12 w-12 rounded-[14px] border-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(0, 0, 0, 0.08)'
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onPromoteEvent(event);
                }}
                aria-label={translate('eventCta.promoteEvent', 'Promote event')}
              >
                <Megaphone className="h-4 w-4" />
              </Button>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 flex items-center justify-center h-12 w-12"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
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
            )
          )}

          {/* Calendar Dropdown - Full mobile touch handling with VITANA Calendar as primary */}
          <DropdownMenu modal={!isMobile}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className={cn(
                  "shrink-0 flex items-center justify-center",
                  isMobile ? "h-12 w-12 rounded-[14px] border-0" : "h-12 w-12"
                )}
                style={isMobile ? {
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(0, 0, 0, 0.08)'
                } : undefined}
                onPointerDown={(e) => isMobile && e.stopPropagation()}
                onTouchEnd={(e) => isMobile && e.stopPropagation()}
                aria-label={translate('eventDrawer.addToCalendar', 'Add to calendar')}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 z-[100] pointer-events-auto"
              onCloseAutoFocus={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Primary action - VITANA Smart Calendar */}
              <DropdownMenuItem onSelect={handleAddToVitanaCalendar}>
                <CalendarPlus className="h-4 w-4 mr-2" />
                {translate('calendar.addToVitana', 'Add to VITANA Calendar')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* External calendars */}
              <DropdownMenuItem onSelect={() => handleExportToCalendar('google')}>
                 {translate('eventDrawer.googleCal', 'Google Calendar')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExportToCalendar('outlook')}>
                 {translate('eventDrawer.outlook', 'Outlook')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExportToCalendar('apple')}>
                {translate('eventDrawer.appleCal', 'Apple Calendar')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleExportToCalendar('ics')}>
                <Download className="h-4 w-4 mr-2" />
                {translate('eventDrawer.downloadIcs', 'Download ICS')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share Button - Close drawer first, then parent opens dialog */}
          <Button 
            variant="outline" 
            size="icon" 
            className={cn(
              "shrink-0 flex items-center justify-center",
              isMobile ? "h-12 w-12 rounded-[14px] border-0" : "h-12 w-12"
            )}
            style={isMobile ? {
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(0, 0, 0, 0.08)'
            } : undefined}
            onPointerDown={(e) => isMobile && e.stopPropagation()}
            onTouchEnd={(e) => isMobile && e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onShareEvent?.(event);
            }}
            aria-label="Share meetup"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          {/* Save Button - Mobile touch handling */}
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "shrink-0 flex items-center justify-center",
              isMobile ? "h-12 w-12 rounded-[14px] border-0" : "h-12 w-12",
              isSaved && !isMobile && "bg-accent"
            )}
            style={isMobile ? {
              background: isSaved ? 'rgba(var(--accent), 0.9)' : 'rgba(255, 255, 255, 0.9)',
              border: '1px solid rgba(0, 0, 0, 0.08)'
            } : undefined}
            onPointerDown={(e) => isMobile && e.stopPropagation()}
            onTouchEnd={(e) => isMobile && e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleSave();
            }}
            aria-label={isSaved ? "Remove from saved" : "Save for later"}
          >
            <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
          </Button>
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

      {/* Share Dialog is now managed by parent component via onShareEvent callback */}
      
      {/* Profile Preview Dialog is now managed at page level to avoid focus-trap conflicts */}
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
