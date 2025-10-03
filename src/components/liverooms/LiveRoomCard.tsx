import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Clock, Bell, Share2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";
import { useState } from "react";

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
      className={cn(
        "group relative overflow-hidden cursor-pointer",
        "hover:shadow-lg hover:border-primary/30 transition-all duration-200",
        "flex flex-col h-full",
        className
      )}
      data-room-id={room.id}
    >
      {/* Hero Image or Gradient Background */}
      <div
        className={cn(
          "relative w-full overflow-hidden bg-gradient-to-br",
          aspectRatio,
          gradientClass
        )}
      >
        {/* Skeleton loader */}
        {!imageLoaded && room.imageUrl && !imageError && (
          <div className="absolute inset-0 bg-muted/50 animate-pulse" />
        )}

        {/* Image */}
        {room.imageUrl && !imageError ? (
          <img
            src={room.imageUrl}
            alt={room.title}
            loading="lazy"
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
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

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          {room.isLive ? (
            <Badge className="bg-red-500 text-white border-0 gap-1.5 px-2.5 py-1 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </Badge>
          ) : isScheduled ? (
            <Badge
              variant="secondary"
              className="gap-1.5 px-2.5 py-1 bg-background/95 backdrop-blur-sm shadow-lg"
            >
              <Clock className="w-3 h-3" />
              {format(new Date(room.scheduledTime!), "h:mm a")}
            </Badge>
          ) : null}
          {room.isPremium && (
            <Badge
              variant="outline"
              className="bg-yellow-500/20 border-yellow-500/50 text-yellow-100 backdrop-blur-sm shadow-lg"
            >
              Premium
            </Badge>
          )}
        </div>

        {/* Top-right: Viewer count or countdown */}
        <div className="absolute top-3 right-3 z-10">
          {room.isLive && room.participants > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/95 backdrop-blur-sm text-xs font-medium shadow-lg">
              <Users className="w-3 h-3" />
              <span>{room.participants}</span>
            </div>
          ) : showCountdown ? (
            <div className="px-2.5 py-1 rounded-lg bg-background/95 backdrop-blur-sm text-xs font-medium shadow-lg">
              Starts in {formatDistanceToNow(new Date(room.scheduledTime!))}
            </div>
          ) : null}
        </div>

        {/* Bottom overlay content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10 pointer-events-none">
          {/* Title */}
          <h3 className="font-bold text-white text-base line-clamp-2 mb-2 drop-shadow-lg">
            {room.title}
          </h3>

          {/* Short blurb */}
          {room.description && (
            <p className="text-white/90 text-xs line-clamp-1 mb-2 drop-shadow">
              {room.description}
            </p>
          )}

          {/* Host avatars and info */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <Avatar className="h-6 w-6 ring-2 ring-white/50">
                  <AvatarImage src={room.host.avatar} />
                  <AvatarFallback className="text-xs">{room.host.name[0]}</AvatarFallback>
                </Avatar>
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
                Virtual
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* CTA Row - positioned at card bottom with pointer-events */}
      <div className="flex items-center gap-2 p-3 bg-card border-t pointer-events-auto">
        {room.isLive ? (
          <>
            <Button
              size="sm"
              className="flex-1 rounded-full bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] text-white border-0 hover:shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                onJoinClick?.(e);
              }}
            >
              Join
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onShareClick?.(e);
              }}
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </>
        ) : isScheduled ? (
          <>
            <Button
              size="sm"
              variant={isNotifying ? "secondary" : "outline"}
              className="flex-1 gap-1.5 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onNotifyClick?.(e);
              }}
            >
              <Bell className={cn("w-4 h-4", isNotifying && "fill-current")} />
              {isNotifying ? "Notifying" : "Notify me"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onShareClick?.(e);
              }}
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </>
        ) : null}
      </div>
    </Card>
  );
}
