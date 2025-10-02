import { format } from "date-fns";
import { Clock, MapPin, Users, Video, MessageSquare, UserPlus, Edit, Trash2, X, Share2, Zap } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";

interface EventDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  onInvite?: (event: CalendarEvent) => void;
  onShare?: (event: CalendarEvent) => void;
}

const getTypeColor = (type: CalendarEvent['event_type']) => {
  switch (type) {
    case 'personal': return 'bg-blue-500/20 text-blue-600 border-blue-200';
    case 'community': return 'bg-purple-500/20 text-purple-600 border-purple-200';
    case 'professional': return 'bg-green-500/20 text-green-600 border-green-200';
    case 'health': return 'bg-red-500/20 text-red-600 border-red-200';
    case 'workout': return 'bg-orange-500/20 text-orange-600 border-orange-200';
    default: return 'bg-gray-500/20 text-gray-600 border-gray-200';
  }
};

export function EventDetailsPanel({
  open,
  onOpenChange,
  event,
  onEdit,
  onDelete,
  onInvite,
  onShare
}: EventDetailsPanelProps) {
  if (!event) return null;

  const formatEventTime = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-start justify-between gap-2">
            <span className="flex-1">{event.title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
          <SheetDescription>
            <Badge className={cn("text-xs", getTypeColor(event.event_type))}>
              {event.event_type}
            </Badge>
            {event.has_rewards && (
              <Badge variant="outline" className="ml-2 text-xs border-yellow-300 text-yellow-600">
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                +10 Credits
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {format(new Date(event.start_time), 'EEEE, MMMM d')}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatEventTime(event.start_time, event.end_time)}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{event.location}</p>
              </div>
            </div>
          )}

          {/* Attendees */}
          {event.attendees_count && event.attendees_count > 0 && (
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm">{event.attendees_count} attendees</p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => onInvite?.(event)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Followers
            </Button>

            <Button className="w-full justify-start" variant="outline" onClick={() => onShare?.(event)}>
              <Share2 className="h-4 w-4 mr-2" />
              Share to Group
            </Button>

            <Button className="w-full justify-start" variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Attendees
            </Button>

            <Separator className="my-2" />

            {onEdit && (
              <Button className="w-full justify-start" variant="outline" onClick={() => onEdit(event)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            )}

            {onDelete && (
              <Button 
                className="w-full justify-start text-red-600 hover:text-red-700" 
                variant="outline"
                onClick={() => {
                  onDelete(event.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
