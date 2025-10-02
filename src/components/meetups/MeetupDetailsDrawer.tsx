import React, { useEffect, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  Link2,
  Twitter,
  Linkedin,
  Mail,
  Download,
  UserPlus,
  Timer,
  MapPinned,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";

interface MeetupDetailsDrawerProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  isMobile?: boolean;
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
    // Simulate join action
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsJoined(true);
    setIsJoining(false);
    
    toast({
      title: "✓ Added to Smart Calendar",
      description: `You're all set for ${event.title}`,
      action: (
        <Button variant="ghost" size="sm" onClick={() => setIsJoined(false)}>
          Undo
        </Button>
      ),
    });
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Removed from saved" : "Saved",
      description: isSaved ? "Meetup removed from your saved list" : "Meetup saved for later",
    });
  };

  const handleShare = (platform?: string) => {
    const url = `${window.location.origin}/comm/meetups?meetup=${event.id}`;
    const text = `Check out this meetup: ${event.title}`;
    
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(text + '\n\n' + url)}`;
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Meetup link copied to clipboard",
      });
    }
  };

  const handleAddToCalendar = (type: string) => {
    const startDate = new Date(event.start_time);
    const endDate = event.end_time ? new Date(event.end_time) : new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    if (type === 'google') {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || event.virtual_link || '')}`;
      window.open(url, '_blank');
    } else if (type === 'outlook') {
      const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || event.virtual_link || '')}`;
      window.open(url, '_blank');
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

  const content = (
    <div 
      className="flex flex-col h-full"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <ScrollArea className="flex-1 pb-20">
        <div 
          className={cn(
            "transition-opacity duration-300",
            isTransitioning && !prefersReducedMotion && "opacity-40"
          )}
        >
          {/* Hero Image - Edge to edge 16:9 */}
          <div className="relative w-full aspect-video bg-muted overflow-hidden">
            {!isImageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
            <img
              src={event.imageUrl || event.image_url || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200'}
              alt={event.title}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                "saturate-110 contrast-105 brightness-105",
                isImageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setIsImageLoaded(true)}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/85 dark:from-background/90 via-background/40 dark:via-background/50 to-transparent" />
            
            {/* Floating Navigation Arrows */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full bg-background/70 dark:bg-background/80 backdrop-blur-md shadow-md pointer-events-auto",
                  "border-border/40 hover:bg-background/90 hover:scale-110 active:scale-95",
                  "transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  "opacity-20 hover:opacity-100 focus-visible:opacity-100",
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
                  "opacity-20 hover:opacity-100 focus-visible:opacity-100",
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

            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="text-[28px] md:text-[32px] font-bold tracking-tight text-white max-w-[85%]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)' }}>
                {event.title}
              </h2>
              
              {/* Unified Host Bar */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mt-3">
                {/* Identity Chip - Clickable to profile */}
                <button
                  onClick={() => {
                    toast({
                      title: "Opening profile",
                      description: `Viewing ${event.author?.name || 'host'}'s profile`,
                    });
                  }}
                  aria-label={`${event.author?.name || 'Community Host'}, Host — open profile`}
                  className={cn(
                    "group flex items-center gap-2 h-11 sm:h-11 px-2 rounded-full",
                    "bg-background/95 backdrop-blur-sm shadow-lg",
                    "hover:bg-background/100 hover:scale-[1.02] active:scale-[0.98]",
                    "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    prefersReducedMotion && "transition-none hover:scale-100 active:scale-100"
                  )}
                >
                  <Avatar className="h-7 w-7 ring-1 ring-white/50">
                    <AvatarImage src={event.author?.avatar} />
                    <AvatarFallback className="text-xs">{event.author?.name?.[0] || 'H'}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 pr-2">
                    <span className="text-sm font-semibold max-w-[120px] sm:max-w-[160px] truncate">
                      {event.author?.name || 'Community Host'}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-medium">
                      Host
                    </span>
                  </div>
                </button>

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
                        ? `You unfollowed ${event.author?.name || 'the host'}` 
                        : `You're now following ${event.author?.name || 'the host'}`,
                    });
                  }}
                  disabled={isFollowLoading}
                  aria-label={`Follow ${event.author?.name || 'host'}`}
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

          <div className="p-6 space-y-6">
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
                className="flex items-center gap-3 p-3 bg-accent/30 hover:bg-accent/40 rounded-2xl border-0 transition-colors w-full text-left cursor-pointer"
                onClick={() => {
                  const attendeesSection = document.querySelector('[data-section="attendees"]');
                  attendeesSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className="flex -space-x-2">
                  {followersGoing.slice(0, 4).map((follower, i) => (
                    <Avatar key={i} className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={follower.avatar} />
                      <AvatarFallback className="text-xs">{follower.name[0]}</AvatarFallback>
                    </Avatar>
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
                <div className="flex items-center gap-1 p-1 bg-background/50 rounded-full">
                  <button
                    onClick={() => setShowLocalTime(true)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      showLocalTime ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Local
                  </button>
                  <button
                    onClick={() => setShowLocalTime(false)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
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
                      {format(startDate, 'h:mm a')} {endDate && `- ${format(endDate, 'h:mm a')}`}
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
                <Avatar className="h-14 w-14 border-2 border-primary">
                  <AvatarImage src={event.author?.avatar} />
                  <AvatarFallback>{event.author?.name?.[0] || 'H'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold text-[15px]">{event.author?.name || 'Community Host'}</p>
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">Organizer</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  Message
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
      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <Button
            className="flex-1 h-12 font-semibold text-[15px]"
            onClick={handleJoin}
            disabled={isJoining || isJoined}
          >
            {isJoining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : isJoined ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Joined
              </>
            ) : (
              'Join Meetup'
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 shrink-0"
                title="Add to calendar"
                aria-label="Add to calendar"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleAddToCalendar('google')}>
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddToCalendar('outlook')}>
                Outlook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddToCalendar('apple')}>
                Apple Calendar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAddToCalendar('ics')}>
                <Download className="h-4 w-4 mr-2" />
                Download ICS
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 shrink-0"
                title="Share meetup"
                aria-label="Share meetup"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleShare()}>
                <Link2 className="h-4 w-4 mr-2" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleShare('twitter')}>
                <Twitter className="h-4 w-4 mr-2" />
                X (Twitter)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('linkedin')}>
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('email')}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            className={cn("h-12 w-12 shrink-0", isSaved && "bg-accent")}
            onClick={handleSave}
            title={isSaved ? "Remove from saved" : "Save for later"}
            aria-label={isSaved ? "Remove from saved" : "Save for later"}
          >
            <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
          </Button>
        </div>
      </div>
    </div>
  );

  // Use Drawer for desktop, Sheet for mobile
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] p-0">
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
