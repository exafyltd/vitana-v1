import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { toast } from "@/components/ui/use-toast";
import {
  X,
  Calendar,
  MapPin,
  Clock,
  Users,
  Heart,
  Share2,
  MessageCircle,
  Bell,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Check,
  Loader2,
  Globe,
  CreditCard,
  Languages,
  Accessibility,
  Plane,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  const navigate = useNavigate();
  const location = useLocation();
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Update URL when drawer opens/closes
  useEffect(() => {
    if (open && event) {
      const newPath = `/comm/meetups/${event.id}`;
      if (location.pathname !== newPath) {
        navigate(newPath, { replace: true });
      }
    } else if (!open && location.pathname.includes('/comm/meetups/')) {
      navigate('/comm/meetups', { replace: true });
    }
  }, [open, event, navigate, location.pathname]);

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

  const handleShare = () => {
    const url = `${window.location.origin}/comm/meetups/${event.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Meetup link copied to clipboard",
    });
  };

  const handleAddToCalendar = () => {
    toast({
      title: "Calendar export",
      description: "iCal file downloaded",
    });
  };

  const capacity = event.max_participants || 30;
  const current = event.participant_count || 0;
  const capacityPercent = (current / capacity) * 100;

  const startDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;
  const duration = endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
    : 60;

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
      {/* Navigation arrows */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "rounded-full bg-background/80 backdrop-blur pointer-events-auto",
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
            "rounded-full bg-background/80 backdrop-blur pointer-events-auto",
            !hasNext && "opacity-0 pointer-events-none"
          )}
          onClick={onNavigateNext}
          disabled={!hasNext}
          aria-label="Next meetup"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-0">
          {/* Hero Image */}
          <div className="relative w-full h-48 md:h-64 bg-muted overflow-hidden">
            <img
              src={event.imageUrl || event.image_url || 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800'}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>

          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary">
                  <AvatarImage src={event.author?.avatar} />
                  <AvatarFallback>{event.author?.name?.[0] || 'H'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold tracking-tight line-clamp-2">{event.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Hosted by {event.author?.name || 'Community Host'}
                  </p>
                </div>
              </div>
              
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
            </div>

            {/* Social Proof */}
            {followersGoing.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex -space-x-2">
                  {followersGoing.map((follower, i) => (
                    <Avatar key={i} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={follower.avatar} />
                      <AvatarFallback>{follower.name[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  People you follow are going
                </p>
              </div>
            )}

            {/* When & Where */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">When & Where</h3>
              
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, 'h:mm a')} {endDate && `- ${format(endDate, 'h:mm a')}`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddToCalendar}>
                    <Calendar className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{duration} minutes</p>
                  </div>
                </div>

                {event.virtual_link ? (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">Virtual Event</p>
                      <Button variant="link" className="h-auto p-0 text-primary" asChild>
                        <a href={event.virtual_link} target="_blank" rel="noopener noreferrer">
                          Join link
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{event.location || 'TBA'}</p>
                      {event.location && (
                        <Button variant="link" className="h-auto p-0 text-primary">
                          <Navigation className="h-3 w-3 mr-1" />
                          Get directions
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2">
              <Button
                className="w-full"
                size="lg"
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

              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className={cn(isSaved && "bg-accent")}
                >
                  <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Capacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {current} / {capacity} spots
                  </span>
                </div>
                <span className="text-muted-foreground">{capacityPercent.toFixed(0)}% full</span>
              </div>
              <Progress value={capacityPercent} className="h-2" />
            </div>

            {/* Meta Info */}
            {(event.credits || event.cost) && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {event.cost ? `$${event.cost}` : `${event.credits} credits`}
                </span>
              </div>
            )}

            {/* Autopilot Block */}
            <div className="space-y-2 p-4 bg-sys-autopilot-tint/20 border border-sys-autopilot-accent/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Plane className="h-4 w-4 text-sys-autopilot-accent" />
                <span className="text-sm font-semibold">Autopilot Suggestions</span>
              </div>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Target className="h-4 w-4" />
                Fit into my week
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Target className="h-4 w-4" />
                Resolve conflict
              </Button>
            </div>

            {/* About */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">About</h3>
              <p className="text-muted-foreground leading-relaxed">
                {event.description || 'No description provided.'}
              </p>
              
              {event.agenda && (
                <div>
                  <h4 className="font-medium mb-2">Agenda</h4>
                  <p className="text-sm text-muted-foreground">{event.agenda}</p>
                </div>
              )}
              
              {event.requirements && (
                <div>
                  <h4 className="font-medium mb-2">Requirements</h4>
                  <p className="text-sm text-muted-foreground">{event.requirements}</p>
                </div>
              )}
              
              {event.cancellation_policy && (
                <div>
                  <h4 className="font-medium mb-2">Cancellation Policy</h4>
                  <p className="text-sm text-muted-foreground">{event.cancellation_policy}</p>
                </div>
              )}
            </div>

            {/* People */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">People</h3>
              
              {/* Host */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={event.author?.avatar} />
                  <AvatarFallback>{event.author?.name?.[0] || 'H'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{event.author?.name || 'Community Host'}</p>
                  <p className="text-sm text-muted-foreground">Host</p>
                </div>
                <Button variant="outline" size="sm">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Message
                </Button>
              </div>

              {/* Attendees */}
              {attendees.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {current} people going
                  </p>
                  <div className="flex -space-x-2">
                    {attendees.map((attendee, i) => (
                      <Avatar key={i} className="h-10 w-10 border-2 border-background">
                        <AvatarImage src={attendee.avatar} />
                        <AvatarFallback>{attendee.name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                    {current > 10 && (
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted border-2 border-background text-xs font-medium">
                        +{current - 10}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
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
