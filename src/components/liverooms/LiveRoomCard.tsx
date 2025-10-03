import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, Clock, Bell, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";

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
}

interface LiveRoomCardProps {
  room: LiveRoom;
  onClick?: () => void;
  onNotifyClick?: (e: React.MouseEvent) => void;
  onShareClick?: (e: React.MouseEvent) => void;
  onJoinClick?: (e: React.MouseEvent) => void;
  isNotifying?: boolean;
  className?: string;
}

export function LiveRoomCard({
  room,
  onClick,
  onNotifyClick,
  onShareClick,
  onJoinClick,
  isNotifying = false,
  className,
}: LiveRoomCardProps) {
  const isScheduled = !room.isLive && room.scheduledTime;
  const minutesUntil = room.scheduledTime ? differenceInMinutes(new Date(room.scheduledTime), new Date()) : 0;
  const showCountdown = isScheduled && minutesUntil > 0 && minutesUntil < 120;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm",
        "hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer",
        "flex flex-col h-full",
        className
      )}
      data-room-id={room.id}
    >
      {/* Hero Image or Gradient Background */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
        {room.imageUrl ? (
          <img src={room.imageUrl} alt={room.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl opacity-10">🎙️</div>
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {room.isLive ? (
            <Badge className="bg-red-500 text-white border-0 gap-1.5 px-2.5 py-1">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </Badge>
          ) : isScheduled && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 bg-background/95 backdrop-blur-sm">
              <Clock className="w-3 h-3" />
              {format(new Date(room.scheduledTime!), 'h:mm a')}
            </Badge>
          )}
          {room.isPremium && (
            <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30 text-yellow-600">
              Premium
            </Badge>
          )}
        </div>

        {/* Countdown */}
        {showCountdown && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-background/95 backdrop-blur-sm text-xs font-medium">
            Starts in {formatDistanceToNow(new Date(room.scheduledTime!))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Title */}
        <h3 className="font-semibold text-base line-clamp-2 min-h-[2.5rem]">
          {room.title}
        </h3>

        {/* Host */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={room.host.avatar} />
            <AvatarFallback className="text-xs">{room.host.name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground truncate">{room.host.name}</span>
        </div>

        {/* Tags */}
        {room.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {room.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Audience Count */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{room.participants}</span>
          {room.maxParticipants && (
            <span className="text-xs">/ {room.maxParticipants}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-2">
          {room.isLive ? (
            <>
              <Button
                size="sm"
                className="flex-1"
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
                className="flex-1 gap-1.5"
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
      </div>
    </div>
  );
}
