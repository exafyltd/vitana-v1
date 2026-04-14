import React from "react";
import { format } from "date-fns";
import { Clock, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { isAllDayEvent, getSmartBadge, getEventAction, EventActionType } from "./calendarSmartUtils";

interface SmartEventCardProps {
  event: CalendarEvent;
  onEventClick: (event: CalendarEvent) => void;
  onAction: (event: CalendarEvent, action: EventActionType) => void;
  showDate?: boolean;
}

export function SmartEventCard({ event, onEventClick, onAction, showDate = false }: SmartEventCardProps) {
  const { translate } = useTranslation();
  const badge = getSmartBadge(event, translate);
  const action = getEventAction(event, translate);
  const isCompleted = event.completion_status === 'completed';
  const allDay = isAllDayEvent(event);

  const formatTime = () => {
    if (allDay) {
      return event.event_type === 'journey_milestone'
        ? translate('calendar.badge.milestone', 'Milestone')
        : translate('calendar.allDay', 'All day');
    }
    const start = new Date(event.start_time);
    const end = event.end_time ? new Date(event.end_time) : null;
    const timeStr = end
      ? `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`
      : format(start, 'HH:mm');
    if (showDate) {
      return `${format(start, 'EEE, MMM d')} ${timeStr}`;
    }
    return timeStr;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2.5 px-1 border-b border-border/50 last:border-0 cursor-pointer hover:bg-muted/30 rounded-lg transition-colors",
        isCompleted && "opacity-50"
      )}
      onClick={() => onEventClick(event)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {allDay ? null : <Clock className="w-3 h-3 text-muted-foreground shrink-0" />}
          <span className="text-xs text-muted-foreground">{formatTime()}</span>
        </div>
        <h4 className="text-sm font-medium truncate">{event.title}</h4>
        {event.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", badge.className)}>
          {badge.label}
        </Badge>
        <Button
          size="sm"
          variant={action.variant}
          className="h-7 text-xs px-2.5"
          onClick={(e) => {
            e.stopPropagation();
            onAction(event, action.action);
          }}
        >
          {isCompleted && <Check className="w-3 h-3 mr-1" />}
          {action.label}
        </Button>
      </div>
    </div>
  );
}
