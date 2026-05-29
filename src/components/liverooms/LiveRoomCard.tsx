import { Badge } from "@/components/ui/badge";
import { ClickableAvatar } from "@/components/ui/clickable-avatar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Clock, Bell, Share2, MapPin, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInMinutes } from 'date-fns';
import { useState } from "react";
import { KebabMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu-kebab";
import { t } from '@/lib/i18n-toast';

import { formatDate, formatDistanceToNow } from '@/lib/locale-format';
export interface LiveRoom {
  id: string;
  title: string;
  description?: string;
  host: {
    id: string;
    name: string;
    avatar?: string;
  };
  isLive: boolean;
  scheduledTime?: string;
  participants: number;
  maxParticipants?: number;
  tags: string[];
  type: 'audio' | 'video';
  imageUrl?: string;
  isPremium?: boolean;
  category?: string;
  location?: string;
  status?: 'scheduled' | 'live' | 'ended' | 'cancelled';
}

interface LiveRoomCardProps {
  room: LiveRoom;
  onClick?: () => void;
  onNotifyClick?: (e: React.MouseEvent) => void;
  onShareClick?: (e: React.MouseEvent) => void;
  onJoinClick?: (e: React.MouseEvent) => void;
  isNotifying?: boolean;
  className?: string;
  isFeatured?: boolean;
  shareButton?: React.ReactNode;
  isCreator?: boolean;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

// Category-based fallback gradients
const categoryGradients: Record<string, string> = {
  wellness: "from-pill-mental-accent/20 via-pill-mental-accent/10 to-background",
  fitness: "from-pill-exercise-accent/20 via-pill-exercise-accent/10 to-background",
  meditation: "from-pill-sleep-accent/20 via-pill-sleep-accent/10 to-background",
  health: "from-pill-nutrition-accent/20 via-pill-nutrition-accent/10 to-background",
  community: "from-domain-community-accent/20 via-domain-community-accent/10 to-background",
  default: "from-primary/10 via-primary/5 to-background",
};

export function LiveRoomCard({
  room,
  onClick,
  onNotifyClick,
  onShareClick,
  onJoinClick,
  isNotifying = false,
  className,
  isFeatured = false,
  shareButton,
  isCreator = false,
  onEdit,
  onDelete,
}: LiveRoomCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const isScheduled = !room.isLive && room.scheduledTime;
  const minutesUntil = room.scheduledTime
    ? differenceInMinutes(new Date(room.scheduledTime), new Date())
    : 0;
  const showCountdown = isScheduled && minutesUntil > 0 && minutesUntil < 120;

  const gradientClass = categoryGradients[room.category || ""] || categoryGradients.default;

  // Determine aspect ratio based on featured status
  const aspectRatio = isFeatured ? "aspect-[16/9]" : "aspect-[4/5]";

  return (
    <Card
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      tabIndex={0}
      className={cn(
        "group relative overflow-hidden cursor-pointer rounded-2xl border shadow-sm h-full",
        "hover:shadow-lg hover:border-primary/30 transition-all duration-200 motion-reduce:transform-none motion-reduce:hover:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      data-room-id={room.id}
      role="button"
      aria-label={`${room.title} - ${room.isLive ? "Live now" : "Scheduled"}`}
    >
      {/* Hero Image or Gradient Background - Full bleed media container */}
      <div className="relative h-full">
        {/* Intrinsic sizer to establish minimum height via aspect ratio */}
        <div
          className={cn("w-full opacity-0 pointer-events-none select-none", aspectRatio)}
          aria-hidden="true"
        />
        {/* Absolute media layer fills the card height */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full overflow-hidden bg-gradient-to-br",
            gradientClass
          )}
        >
          {/* Skeleton loader */}
          {!imageLoaded && room.imageUrl && !imageError && (
            <div className="absolute inset-0 bg-muted/50 animate-pulse" />
          )}

          {/* Image - absolute positioned for true full-bleed */}
          {room.imageUrl && !imageError ? (
            <img
              src={room.imageUrl}
              alt={room.title}
              loading="lazy"
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            /* Fallback gradient with icon */
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl opacity-10">🎙️</div>
            </div>
          )}

          {/* Stronger gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* Top-left badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
            {room.isLive ? (
              <Badge className="bg-red-500 text-white border-0 gap-1.5 px-2.5 py-1 shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {t('screens.liverooms.live')}
              </Badge>
            ) : isScheduled ? (
              <Badge
                variant="secondary"
                className="gap-1.5 px-2.5 py-1 bg-background/95 backdrop-blur-sm shadow-lg"
              >
                <Clock className="w-3 h-3" />
                {formatDate(new Date(room.scheduledTime!), "HH:mm")}
              </Badge>
            ) : null}
            {room.isPremium && (
              <Badge
                variant="outline"
                className="bg-yellow-500/20 border-yellow-500/50 text-yellow-100 backdrop-blur-sm shadow-lg"
              >
                {t('screens.liverooms.premium')}
              </Badge>
            )}
          </div>

          {/* Top-right: Viewer count or countdown + Kebab menu */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {room.isLive && room.participants > 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/95 backdrop-blur-sm text-xs font-medium shadow-lg">
                <Users className="w-3 h-3" />
                <span>{room.participants}</span>
              </div>
            ) : showCountdown ? (
              <div className="px-2.5 py-1 rounded-lg bg-background/95 backdrop-blur-sm text-xs font-medium shadow-lg">{t('screens.liverooms.startsValue0', { value0: formatDistanceToNow(new Date(room.scheduledTime!)) })}</div>
            ) : null}
            
            {/* Kebab menu - only show for creator */}
            {isCreator && (
              <div className="pointer-events-auto">
                <KebabMenu className="bg-background/95 backdrop-blur-sm hover:bg-background/80">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(e);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    {t('screens.liverooms.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(e);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('screens.liverooms.delete')}
                  </DropdownMenuItem>
                </KebabMenu>
              </div>
            )}
          </div>

          {/* Bottom overlay content - Grid structure for perfect baseline alignment */}
          <div 
            className={cn(
              "absolute left-0 right-0 bottom-0 z-10",
              "grid gap-2 p-4",
              isFeatured ? "min-h-[184px]" : "min-h-[160px]"
            )}
            style={{
              gridTemplateRows: '1fr auto auto auto auto'
            }}
          >
            {/* Spacer row - absorbs height variation */}
            <div />
            
            {/* Title - Fixed height for 2 lines */}
            <h3 className="font-bold text-white text-base line-clamp-2 h-10 drop-shadow-lg pointer-events-none">
              {room.title}
            </h3>

            {/* Short blurb - Fixed height for 1 line */}
            {room.description ? (
              <p className="text-white/90 text-xs line-clamp-1 h-5 drop-shadow pointer-events-none">
                {room.description}
              </p>
            ) : (
              <div className="h-5" />
            )}

            {/* Meta row: avatars + location - Fixed height */}
            <div className="flex items-center justify-between gap-2 h-6 pointer-events-none">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2 pointer-events-auto">
                  <ClickableAvatar
                    userId={room.host.id}
                    src={room.host.avatar}
                    fallback={room.host.name[0]}
                    alt={room.host.name}
                    className="h-6 w-6 ring-2 ring-white/50"
                    disabled={room.host.id.startsWith('demo-')}
                  />
                  {room.participants > 1 &&
                    Array.from({ length: Math.min(room.participants - 1, 2) }).map((_, i) => (
                      <Avatar key={i} className="h-6 w-6 ring-2 ring-white/50">
                        <AvatarFallback className="text-xs">U{i + 1}</AvatarFallback>
                      </Avatar>
                    ))}
                </div>
                {room.participants > 3 && (
                  <span className="text-xs text-white/90 font-medium drop-shadow">
                    +{room.participants - 3}
                  </span>
                )}
              </div>

              {/* Location/Virtual chip */}
              {room.location && (
                <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm text-white border-0">
                  <MapPin className="w-3 h-3 mr-1" />
                  {t('screens.liverooms.virtual')}
                </Badge>
              )}
            </div>

            {/* CTA row - right-aligned - Fixed height 40px */}
            <div className="flex items-center justify-end gap-3 pr-4 h-10 pointer-events-auto">
              {room.isLive ? (
                <>
                  {shareButton || (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10 w-10 rounded-full text-white hover:bg-white/20 hover:text-white p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareClick?.(e);
                      }}
                      aria-label={t('screens.liverooms.shareRoom')}
                      title={t('screens.liverooms.share')}
                    >
                      <Share2 className="w-[18px] h-[18px]" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-10 min-w-[88px] rounded-full bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] text-white border-0 hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      onJoinClick?.(e);
                    }}
                    aria-label={isCreator ? "Manage your live room" : "Join live room"}
                  >
                    {isCreator ? "Manage" : "Join"}
                  </Button>
                </>
              ) : isScheduled ? (
                <>
                  {shareButton || (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10 w-10 rounded-full text-white hover:bg-white/20 hover:text-white p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareClick?.(e);
                      }}
                      aria-label={t('screens.liverooms.shareRoom')}
                      title={t('screens.liverooms.share')}
                    >
                      <Share2 className="w-[18px] h-[18px]" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={isNotifying ? "secondary" : "ghost"}
                    className={cn(
                      "h-10 min-w-[88px] gap-1.5 rounded-full",
                      !isNotifying && "text-white hover:bg-white/20 hover:text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNotifyClick?.(e);
                    }}
                    aria-label={isNotifying ? "Turn off notifications" : "Get notified when room starts"}
                  >
                    <Bell className={cn("w-[18px] h-[18px]", isNotifying && "fill-current")} />
                    {isNotifying ? "Notifying" : "Notify me"}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
