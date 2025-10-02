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
  const [showLocalTime, setShowLocalTime] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

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

  const content = (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pb-24">
        <div className={cn(
          "relative transition-opacity duration-300",
          prefersReducedMotion ? "duration-0" : "duration-300"
        )}>
          {/* Hero Image - Edge to edge 16:9 */}
          <div className="relative w-full aspect-video bg-muted overflow-hidden">
            {!isImageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}
            <img
              src={event.imageUrl || event.image_url || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200'}
              alt={event.title}
              className={cn(
                "w-full h-full object-cover transition-opacity",
                prefersReducedMotion ? "duration-0" : "duration-300",
                isImageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setIsImageLoaded(true)}
              loading="lazy"
            />
            {/* Bottom gradient for title legibility - darker in dark mode */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent dark:from-black/95 dark:via-black/50" />
            
            {/* Floating Navigation Arrows - Glassy circular buttons */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 shadow-lg pointer-events-auto transition-all",
                  "hover:bg-white/20 dark:hover:bg-white/10 hover:scale-105",
                  "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50",
                  !hasPrev && "opacity-0 pointer-events-none",
                  hasPrev && "opacity-60 hover:opacity-100"
                )}
                onClick={onNavigatePrev}
                disabled={!hasPrev}
                aria-label="Previous meetup"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 shadow-lg pointer-events-auto transition-all",
                  "hover:bg-white/20 dark:hover:bg-white/10 hover:scale-105",
                  "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50",
                  !hasNext && "opacity-0 pointer-events-none",
                  hasNext && "opacity-60 hover:opacity-100"
                )}
                onClick={onNavigateNext}
                disabled={!hasNext}
                aria-label="Next meetup"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </Button>
            </div>

            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="text-[28px] md:text-[32px] font-bold tracking-tight text-white max-w-[85%] leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {event.title}
              </h2>
              
              {/* Host Chip with Follow Button */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
                  <Avatar className="h-7 w-7 border-2 border-primary">
                    <AvatarImage src={event.author?.avatar} />
                    <AvatarFallback>{event.author?.name?.[0] || 'H'}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{event.author?.name || 'Community Host'}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 gap-1.5 bg-background/95 backdrop-blur-sm rounded-full px-3 shadow-lg hover:bg-background"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Follow
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
                className="flex items-center justify-between gap-3 px-3 py-2.5 bg-accent/30 dark:bg-accent/20 rounded-2xl border border-accent/30 w-full hover:bg-accent/40 dark:hover:bg-accent/25 transition-colors group"
                onClick={() => {
                  // Open attendee list (placeholder)
                  toast({
                    title: "Attendee list",
                    description: "Opening attendee list...",
                  });
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex -space-x-2">
                    {followersGoing.map((follower, i) => (
                      <Avatar key={i} className="h-6 w-6 border-2 border-background ring-1 ring-accent">
                        <AvatarImage src={follower.avatar} />
                        <AvatarFallback className="text-[10px]">{follower.name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                    <div className="flex items-center justify-center h-6 px-2 rounded-full bg-accent text-accent-foreground border-2 border-background text-[11px] font-semibold">
                      +{current - followersGoing.length}
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    People you follow are going
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}

            {/* When & Where */}
            <div className="space-y-4 p-4 md:p-5 bg-muted/30 rounded-2xl">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-base md:text-lg">When & Where</h3>
                </div>
                <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                  <Button 
                    variant={showLocalTime ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowLocalTime(true)}
                    className="h-7 px-3 text-xs rounded-md"
                  >
                    Local
                  </Button>
                  <Button 
                    variant={!showLocalTime ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setShowLocalTime(false)}
                    className="h-7 px-3 text-xs rounded-md"
                  >
                    UTC
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px]">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-[13px] text-muted-foreground leading-snug">
                      {format(startDate, 'h:mm a')} {endDate && `- ${format(endDate, 'h:mm a')}`}
                      <span className="text-[12px]"> ({showLocalTime ? 'Local' : 'UTC'})</span>
                    </p>
                    {showCountdown && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-primary font-medium">
                        <Timer className="h-3.5 w-3.5" />
                        <span>Starts {formatDistanceToNow(startDate, { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Timer className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[15px]">{duration} minutes</p>
                  </div>
                </div>

                {event.virtual_link ? (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[15px]">Virtual Event</p>
                      <a 
                        href={event.virtual_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary text-[14px] hover:underline inline-flex items-center gap-1"
                      >
                        <Link2 className="h-3 w-3" />
                        Join link <span className="text-[12px] text-muted-foreground">· Opens 5 min before</span>
                      </a>
                    </div>
                  </div>
                ) : event.location && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[15px]">{event.location}</p>
                        <a 
                          href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-[14px] hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <Navigation className="h-3 w-3" />
                          Get directions
                        </a>
                      </div>
                    </div>
                    {/* Mini map placeholder */}
                    <div className="w-full h-32 bg-muted/50 rounded-xl flex items-center justify-center border border-border/50 hover:border-border transition-colors cursor-pointer">
                      <MapPinned className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Capacity & Alert */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {current} / {capacity} attending
                  </span>
                </div>
                {isLowCapacity && (
                  <div className="flex items-center gap-1 text-destructive font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span className="text-[12px]">Only {spotsLeft} left!</span>
                  </div>
                )}
              </div>
              <Progress value={capacityPercent} className="h-1.5" />
            </div>

            {/* Autopilot Suggestions */}
            <div className="space-y-3 p-4 md:p-5 bg-sys-autopilot-tint/20 border border-sys-autopilot-accent/30 rounded-2xl">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-sys-autopilot-accent" />
                <span className="text-[14px] font-semibold">Autopilot Suggestions</span>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-auto py-2.5 text-[14px]">
                  <Target className="h-4 w-4 shrink-0" />
                  <span className="text-left">Fit into my week</span>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-auto py-2.5 text-[14px]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-left">Resolve schedule conflict</span>
                </Button>
                {!event.virtual_link && event.location && (
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-auto py-2.5 text-[14px]">
                    <Car className="h-4 w-4 shrink-0" />
                    <span className="text-left">Plan commute</span>
                  </Button>
                )}
              </div>
            </div>

            {/* About */}
            <div className="space-y-3 p-4 md:p-5 bg-card rounded-2xl border">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-base md:text-lg">About</h3>
              </div>
              <p className="text-[14px] md:text-[15px] text-muted-foreground leading-relaxed">
                {event.description || 'No description provided.'}
              </p>
            </div>

            {/* Agenda */}
            {event.agenda && (
              <div className="space-y-3 p-4 md:p-5 bg-card rounded-2xl border">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-base md:text-lg">Agenda</h3>
                </div>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{event.agenda}</p>
              </div>
            )}

            {/* Host */}
            <div className="space-y-3 p-4 md:p-5 bg-card rounded-2xl border">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-base md:text-lg">Host</h3>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-2xl">
                <Avatar className="h-12 w-12 border-2 border-primary">
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
                <Button variant="outline" size="sm" className="gap-1.5 text-[13px]">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Message
                </Button>
              </div>
            </div>

            {/* Attendees */}
            {attendees.length > 0 && (
              <div className="space-y-3 p-4 md:p-5 bg-card rounded-2xl border">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-base md:text-lg">Attendees ({current})</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {attendees.map((attendee, i) => (
                    <Avatar key={i} className="h-10 w-10 border-2 border-background ring-1 ring-muted hover:ring-primary transition-all cursor-pointer">
                      <AvatarImage src={attendee.avatar} />
                      <AvatarFallback className="text-xs">{attendee.name[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                  {current > 10 && (
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted border-2 border-background text-[11px] font-semibold">
                      +{current - 10}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Policies */}
            {(event.requirements || event.cancellation_policy) && (
              <div className="space-y-3 p-4 md:p-5 bg-card rounded-2xl border">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-base md:text-lg">Policies</h3>
                </div>
                <div className="space-y-3">
                  {event.requirements && (
                    <div>
                      <h4 className="font-medium mb-1.5 text-[14px]">Requirements</h4>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{event.requirements}</p>
                    </div>
                  )}
                  {event.cancellation_policy && (
                    <div>
                      <h4 className="font-medium mb-1.5 text-[14px]">Cancellation</h4>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{event.cancellation_policy}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Sticky Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/98 dark:bg-background/95 backdrop-blur-md border-t dark:border-t-border/50 shadow-2xl p-4 pb-safe">
        <TooltipProvider>
          <div className="flex items-center gap-2.5">
            <Button
              className="flex-1 h-12 text-[15px] font-semibold shadow-sm"
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-12 w-12 shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Calendar className="h-4.5 w-4.5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Add to calendar</p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-12 w-12 shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Share2 className="h-4.5 w-4.5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Share meetup</p>
                </TooltipContent>
              </Tooltip>
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-12 w-12 shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", 
                    isSaved && "bg-accent"
                  )}
                  onClick={handleSave}
                  aria-label={isSaved ? "Remove from saved" : "Save meetup"}
                >
                  <Bookmark className={cn("h-4.5 w-4.5", isSaved && "fill-current")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isSaved ? "Remove from saved" : "Save for later"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
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
