import React, { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
} from "@/components/ui/responsive-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Share2,
  Bookmark,
  Bell,
  Calendar,
  Link2,
  UserPlus,
  Globe,
  Download,
  CheckCircle2,
  Mic,
  MicOff,
  Hand,
  MessageCircle,
  X,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInMinutes } from 'date-fns';
import type { LiveRoom } from "./LiveRoomCard";
import { notify, t } from '@/lib/i18n-toast';

import { formatDate, formatDistanceToNow } from '@/lib/locale-format';
interface LiveRoomDrawerProps {
  room: LiveRoom | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  isMobile?: boolean;
  onJoin?: (roomId: string) => void;
  isCreator?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function LiveRoomDrawer({
  room,
  open,
  onOpenChange,
  onNavigatePrev,
  onNavigateNext,
  hasPrev,
  hasNext,
  isMobile = false,
  onJoin,
  isCreator = false,
  onEdit,
  onDelete,
}: LiveRoomDrawerProps) {
  const [isNotifying, setIsNotifying] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showLocalTime, setShowLocalTime] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  if (!room) return null;

  const isScheduled = !room.isLive && room.scheduledTime;
  const minutesUntil = room.scheduledTime ? differenceInMinutes(new Date(room.scheduledTime), new Date()) : 0;
  const showCountdown = isScheduled && minutesUntil > 0 && minutesUntil < 120;

  const handleNotifyMe = () => {
    setIsNotifying(!isNotifying);
    toast({
      title: isNotifying ? "Notifications off" : "You'll be notified!",
      description: isNotifying
        ? "You won't receive notifications for this room"
        : "We'll notify you when the room goes live",
    });
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Removed from saved" : "Saved!",
      description: isSaved ? "Room removed from your saved list" : "Room saved for later",
    });
  };

  const handleShare = (platform?: string) => {
    const url = `${window.location.origin}/comm/live-rooms?live=${room.id}`;
    const text = `Check out this live room: ${room.title}`;

    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      notify('toasts.liverooms.linkCopied', 'toasts.liverooms.roomLinkCopiedClipboard');
    } else {
      notify('toasts.liverooms.share');
    }
  };

  const handleAddToCalendar = (type: string) => {
    if (!room.scheduledTime) return;

    const startDate = new Date(room.scheduledTime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    if (type === "google") {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(room.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(room.description || "")}&location=Virtual`;
      window.open(url, "_blank");
    } else if (type === "outlook") {
      const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(room.title)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(room.description || "")}&location=Virtual`;
      window.open(url, "_blank");
    } else if (type === "apple" || type === "ics") {
      notify('toasts.liverooms.calendarExport', 'toasts.liverooms.icsFileWillDownloaded');
    }

    notify('toasts.liverooms.openingCalendar');
  };

  const handleJoin = () => {
    if (onJoin) {
      onJoin(room.id);
      onOpenChange(false);
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    toast({
      title: isFollowing ? "Unfollowed" : "Following!",
      description: isFollowing
        ? `You unfollowed ${room.host.name}`
        : `You're now following ${room.host.name}`,
    });
  };

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
      <ScrollArea className="flex-1 pb-24">
        {/* Hero Cover */}
        <div className="relative w-full aspect-video bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
          {room.imageUrl ? (
            <img src={room.imageUrl} alt={room.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-8xl opacity-10">🎙️</div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />

          {/* Navigation Arrows & Creator Menu */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "rounded-full bg-background/70 backdrop-blur-md shadow-md pointer-events-auto",
                "opacity-75 hover:opacity-100",
                !hasPrev && "pointer-events-none"
              )}
              onClick={onNavigatePrev}
              disabled={!hasPrev}
              aria-label={t('screens.liverooms.previousRoom')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Creator Menu */}
            {isCreator && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full bg-background/70 backdrop-blur-md shadow-md pointer-events-auto opacity-75 hover:opacity-100"
                    aria-label={t('screens.liverooms.streamOptions')}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('screens.liverooms.editStream')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('screens.liverooms.deleteStream')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              size="icon"
              className={cn(
                "rounded-full bg-background/70 backdrop-blur-md shadow-md pointer-events-auto",
                "opacity-75 hover:opacity-100",
                !hasNext && "pointer-events-none"
              )}
              onClick={onNavigateNext}
              disabled={!hasNext}
              aria-label={t('screens.liverooms.nextRoom')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-[28px] md:text-[32px] font-bold tracking-tight text-white max-w-[22ch]">
              {room.title}
            </h2>

            {/* Host Bar */}
            {!isCreator ? (
              <div className="flex items-center gap-2 mt-3 min-w-0">
                <button
                  onClick={handleFollow}
                  className={cn(
                    "group flex items-center gap-2 h-11 px-2 rounded-full min-w-0",
                    "bg-background/95 backdrop-blur-sm shadow-lg",
                    "hover:bg-background/100 hover:scale-[1.02] active:scale-[0.98]",
                    "transition-all duration-200"
                  )}
                >
                  <Avatar className="h-7 w-7 ring-1 ring-white/50 flex-shrink-0">
                    <AvatarImage src={room.host.avatar} />
                    <AvatarFallback className="text-xs">{room.host.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 pr-2 min-w-0">
                    <span className="text-sm font-semibold truncate">{room.host.name}</span>
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-medium flex-shrink-0">
                      {t('screens.liverooms.host')}
                    </span>
                  </div>
                </button>

                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? "secondary" : "outline"}
                  className="h-11 rounded-full px-4 bg-background/95 backdrop-blur-sm shadow-lg flex-shrink-0"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-3 min-w-0">
                <div className="flex items-center gap-2 h-11 px-3 rounded-full bg-background/95 backdrop-blur-sm shadow-lg min-w-0">
                  <Avatar className="h-7 w-7 ring-1 ring-white/50 flex-shrink-0">
                    <AvatarImage src={room.host.avatar} />
                    <AvatarFallback className="text-xs">{room.host.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-semibold truncate">{room.host.name}</span>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">{t('screens.liverooms.yourRoom')}</Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tags */}
          {room.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {room.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* People Listening */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{t('screens.liverooms.peopleListening')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {Array.from({ length: Math.min(room.participants, 5) }).map((_, i) => (
                  <Avatar key={i} className="h-6 w-6 ring-2 ring-background">
                    <AvatarFallback className="text-xs">U{i + 1}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {room.participants > 5 && (
                <span className="text-sm text-muted-foreground">{t('screens.liverooms.value0More', { value0: room.participants - 5 })}</span>
              )}
            </div>
          </div>

          {/* When */}
          {(room.isLive || isScheduled) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{t('screens.liverooms.when')}</span>
                </div>
                {isScheduled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLocalTime(!showLocalTime)}
                    className="text-xs"
                  >
                    {showLocalTime ? "Show UTC" : "Show Local"}
                  </Button>
                )}
              </div>
              {room.isLive ? (
                <Badge className="bg-red-500 text-white border-0 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {t('screens.liverooms.liveNow')}
                </Badge>
              ) : isScheduled ? (
                <div>
                  <p className="text-sm">
                    {showLocalTime
                      ? formatDate(new Date(room.scheduledTime!), "EEEE, MMMM d 'at' HH:mm")
                      : formatDate(new Date(room.scheduledTime!), "EEEE, MMMM d 'at' HH:mm 'UTC'")}
                  </p>
                  {showCountdown && (
                    <p className="text-sm text-muted-foreground mt-1">{t('screens.liverooms.startsValue0', { value0: formatDistanceToNow(new Date(room.scheduledTime!)) })}</p>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Description */}
          {room.description && (
            <div className="space-y-2">
              <h3 className="font-semibold">{t('screens.liverooms.aboutThisRoom')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{room.description}</p>
            </div>
          )}

          {/* Room Rules */}
          <div className="space-y-2">
            <h3 className="font-semibold">{t('screens.liverooms.roomRules')}</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>{t('screens.liverooms.respectfulAllParticipants')}</li>
              <li>{t('screens.liverooms.raiseYourHandSpeak')}</li>
              <li>{t('screens.liverooms.muteWhenNotSpeaking')}</li>
            </ul>
          </div>
        </div>
      </ScrollArea>

      {/* Sticky Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-sm border-t">
        {room.isLive ? (
          isCreator ? (
            <div className="flex items-center gap-2">
              <Button size="lg" variant="destructive" className="flex-1 min-w-0" onClick={handleJoin}>
                {t('screens.liverooms.endRoom')}
              </Button>
              <Button size="lg" variant="outline" className="shrink-0 w-11 px-0" onClick={() => handleShare()}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="lg" className="flex-1 min-w-0" onClick={handleJoin}>
                {t('screens.liverooms.joinRoom')}
              </Button>
              <Button size="lg" variant="outline" className="shrink-0 w-11 px-0" onClick={() => handleShare()}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="shrink-0 w-11 px-0" onClick={handleSave}>
                <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
              </Button>
            </div>
          )
        ) : isScheduled ? (
          isCreator ? (
            <div className="flex items-center gap-2">
              <Button size="lg" className="flex-1 min-w-0" onClick={handleJoin}>
                {t('screens.liverooms.goLiveNow')}
              </Button>
              <Button size="lg" variant="outline" className="shrink-0 w-11 px-0" onClick={onEdit}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="shrink-0 w-11 px-0" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button size="lg" variant="outline" className="flex-1 min-w-0" onClick={handleNotifyMe}>
                  <Bell className={cn("w-4 h-4 mr-2 shrink-0", isNotifying && "fill-current")} />
                  <span className="truncate">{isNotifying ? "Notifying" : "Notify me"}</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="outline" className="shrink-0 w-11 px-0">
                      <Calendar className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAddToCalendar("google")}>
                      {t('screens.liverooms.googleCalendar')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddToCalendar("outlook")}>
                      {t('screens.liverooms.outlook')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddToCalendar("apple")}>
                      {t('screens.liverooms.appleCalendar')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddToCalendar("ics")}>
                      <Download className="w-4 h-4 mr-2" />
                      {t('screens.liverooms.downloadIcs')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="lg" variant="outline" className="shrink-0 w-11 px-0" onClick={() => handleShare()}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="h-[90vh]">{content}</DrawerContent>
        </Drawer>
        
        {/* Delete Confirmation Dialog */}
        <ResponsiveConfirmDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <ResponsiveConfirmDialogContent>
            <ResponsiveConfirmDialogHeader>
              <ResponsiveConfirmDialogTitle>{t('screens.liverooms.deleteLiveStream')}</ResponsiveConfirmDialogTitle>
              <ResponsiveConfirmDialogDescription>{t('screens.liverooms.thisWillPermanentlyDeleteTitleThis', { title: room?.title })}
              </ResponsiveConfirmDialogDescription>
            </ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogFooter>
              <ResponsiveConfirmDialogCancel>{t('screens.liverooms.cancel')}</ResponsiveConfirmDialogCancel>
              <ResponsiveConfirmDialogAction
                onClick={() => {
                  setShowDeleteDialog(false);
                  onDelete?.();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >{t('screens.liverooms.delete')}
              </ResponsiveConfirmDialogAction>
            </ResponsiveConfirmDialogFooter>
          </ResponsiveConfirmDialogContent>
        </ResponsiveConfirmDialog>
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          {content}
        </SheetContent>
      </Sheet>
      
      {/* Delete Confirmation Dialog */}
      <ResponsiveConfirmDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ResponsiveConfirmDialogContent>
          <ResponsiveConfirmDialogHeader>
            <ResponsiveConfirmDialogTitle>{t('screens.liverooms.deleteLiveStream')}</ResponsiveConfirmDialogTitle>
            <ResponsiveConfirmDialogDescription>{t('screens.liverooms.thisWillPermanentlyDeleteTitleThis', { title: room?.title })}
            </ResponsiveConfirmDialogDescription>
          </ResponsiveConfirmDialogHeader>
          <ResponsiveConfirmDialogFooter>
            <ResponsiveConfirmDialogCancel>{t('screens.liverooms.cancel')}</ResponsiveConfirmDialogCancel>
            <ResponsiveConfirmDialogAction
              onClick={() => {
                setShowDeleteDialog(false);
                onDelete?.();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >{t('screens.liverooms.delete')}
            </ResponsiveConfirmDialogAction>
          </ResponsiveConfirmDialogFooter>
        </ResponsiveConfirmDialogContent>
      </ResponsiveConfirmDialog>
    </>
  );
}
