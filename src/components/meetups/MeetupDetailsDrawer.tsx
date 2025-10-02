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
  const [showLocalTime, setShowLocalTime] = useState(true);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

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
      <ScrollArea className="flex-1 pb-20">
        <div className="relative">
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
                isImageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setIsImageLoaded(true)}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            
            {/* Floating Navigation Arrows */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full bg-background/90 backdrop-blur-sm shadow-lg pointer-events-auto",
                  !hasPrev && "opacity-0 pointer-events-none"
                )}
                onClick={onNavigatePrev}
                disabled={!hasPrev}
                aria-label="Previous meetup"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full bg-background/90 backdrop-blur-sm shadow-lg pointer-events-auto",
                  !hasNext && "opacity-0 pointer-events-none"
                )}
                onClick={onNavigateNext}
                disabled={!hasNext}
                aria-label="Next meetup"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg mb-2">
                {event.title}
              </h2>
              
              {/* Host Chip */}
              <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-full px-3 py-2 w-fit shadow-lg">
                <Avatar className="h-8 w-8 border-2 border-primary">
                  <AvatarImage src={event.author?.avatar} />
                  <AvatarFallback>{event.author?.name?.[0] || 'H'}</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{event.author?.name || 'Community Host'}</span>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
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

            {/* Social Proof */}
            {followersGoing.length > 0 && (
              <div className="flex items-center justify-between gap-3 p-4 bg-accent/50 rounded-2xl border">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {followersGoing.map((follower, i) => (
                      <Avatar key={i} className="h-9 w-9 border-2 border-background ring-1 ring-accent">
                        <AvatarImage src={follower.avatar} />
                        <AvatarFallback>{follower.name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <p className="text-sm font-medium">
                    People you follow are going
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  Follow
                </Button>
              </div>
            )}

            {/* When & Where */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">When & Where</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowLocalTime(!showLocalTime)}
                  className="text-xs"
                >
                  {showLocalTime ? 'Show UTC' : 'Show Local'}
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, 'h:mm a')} {endDate && `- ${format(endDate, 'h:mm a')}`}
                      {showLocalTime && ' (Local)'}
                    </p>
                    {showCountdown && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-primary">
                        <Timer className="h-3 w-3" />
                        <span>Starts {formatDistanceToNow(startDate, { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{duration} minutes</p>
                  </div>
                </div>

                {event.virtual_link ? (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Virtual Event</p>
                      <Button variant="link" className="h-auto p-0 text-primary text-sm" asChild>
                        <a href={event.virtual_link} target="_blank" rel="noopener noreferrer">
                          Join link · Opens 5 min before
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : event.location && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{event.location}</p>
                        <Button 
                          variant="link" 
                          className="h-auto p-0 text-primary text-sm gap-1"
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(event.location)}`, '_blank')}
                        >
                          <Navigation className="h-3 w-3" />
                          Get directions
                        </Button>
                      </div>
                    </div>
                    {/* Mini map placeholder */}
                    <div className="w-full h-32 bg-muted rounded-xl flex items-center justify-center">
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
            <div className="space-y-3 pt-2 border-t">
              <h3 className="font-semibold text-lg">About</h3>
              <p className="text-muted-foreground leading-relaxed">
                {event.description || 'No description provided.'}
              </p>
            </div>

            {/* Agenda */}
            {event.agenda && (
              <div className="space-y-3 pt-2 border-t">
                <h3 className="font-semibold text-lg">Agenda</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{event.agenda}</p>
              </div>
            )}

            {/* Host */}
            <div className="space-y-3 pt-2 border-t">
              <h3 className="font-semibold text-lg">Host</h3>
              <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-2xl">
                <Avatar className="h-14 w-14 border-2 border-primary">
                  <AvatarImage src={event.author?.avatar} />
                  <AvatarFallback>{event.author?.name?.[0] || 'H'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold">{event.author?.name || 'Community Host'}</p>
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground">Organizer</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Button>
              </div>
            </div>

            {/* Attendees */}
            {attendees.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <h3 className="font-semibold text-lg">Attendees ({current})</h3>
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
              <div className="space-y-3 pt-2 border-t">
                <h3 className="font-semibold text-lg">Policies</h3>
                {event.requirements && (
                  <div>
                    <h4 className="font-medium mb-1.5 text-sm">Requirements</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{event.requirements}</p>
                  </div>
                )}
                {event.cancellation_policy && (
                  <div>
                    <h4 className="font-medium mb-1.5 text-sm">Cancellation</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{event.cancellation_policy}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Sticky Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t shadow-lg p-4">
        <div className="flex items-center gap-2">
          <Button
            className="flex-1 h-11 font-semibold"
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
              'Join'
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
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
              <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
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
            className={cn("h-11 w-11 shrink-0", isSaved && "bg-accent")}
            onClick={handleSave}
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
