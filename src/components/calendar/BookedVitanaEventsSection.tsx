import React from "react";
import { Users, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

import { formatDate } from '@/lib/locale-format';
interface BookedVitanaEventsSectionProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function BookedVitanaEventsSection({ events, onEventClick }: BookedVitanaEventsSectionProps) {
  const { translate } = useTranslation();
  
  // Filter for booked Vitana events (community type with meetup metadata)
  const bookedVitanaEvents = events.filter(event => 
    event.event_type === 'community' && 
    (event.metadata as Record<string, unknown>)?.meetup_id
  );
  
  // Today's booked events
  const today = new Date();
  const todayBookedEvents = bookedVitanaEvents.filter(event => {
    const eventDate = new Date(event.start_time);
    return eventDate.toDateString() === today.toDateString();
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  
  // Next upcoming booked event (after now, excluding today's past events)
  const now = new Date();
  const nextUpcomingBooked = bookedVitanaEvents
    .filter(event => {
      const eventStart = new Date(event.start_time);
      // Must be in the future and not today
      return eventStart > now && eventStart.toDateString() !== today.toDateString();
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    [0] || null;
  
  // Don't render if no booked events at all
  if (todayBookedEvents.length === 0 && !nextUpcomingBooked) {
    return null;
  }
  
  const formatEventTime = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    if (end) {
      return `${formatDate(start, 'HH:mm')}–${formatDate(end, 'HH:mm')}`;
    }
    return formatDate(start, 'HH:mm');
  };
  
  const formatEventDate = (startTime: string) => {
    const date = new Date(startTime);
    return formatDate(date, 'EEE, MMM d');
  };
  
  return (
    <div className="mb-4 rounded-xl border border-domain-community-accent/20 bg-domain-community-tint/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-domain-community-accent/10">
        <div className="w-7 h-7 rounded-lg bg-domain-community-accent/10 flex items-center justify-center">
          <Users className="w-3.5 h-3.5 text-domain-community-accent" />
        </div>
        <h3 className="text-sm font-semibold text-domain-community-accent">
          {translate('calendar.bookedEvents.title', 'Your Booked Events')}
        </h3>
      </div>
      
      <div className="p-2 space-y-1">
        {/* Today's booked events */}
        {todayBookedEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-domain-community-accent/5 transition-colors cursor-pointer"
            onClick={() => onEventClick(event)}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-domain-community-accent mt-2 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-domain-community-accent">
                  {formatEventTime(event.start_time, event.end_time)}
                </span>
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 h-4 bg-domain-community-tint border-domain-community-accent/20 text-domain-community-accent"
                >
                  {translate('calendar.bookedEvents.todayLabel', 'Today')}
                </Badge>
              </div>
              <h4 className="text-sm font-medium truncate">{event.title}</h4>
              {event.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </p>
              )}
            </div>
          </div>
        ))}
        
        {/* Next upcoming event (only show if we have one and it's not duplicated in today) */}
        {nextUpcomingBooked && (
          <div
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-domain-community-accent/5 transition-colors cursor-pointer border-t border-domain-community-accent/10 mt-1 pt-2"
            onClick={() => onEventClick(nextUpcomingBooked)}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-domain-community-accent/50 mt-2 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-muted-foreground">
                  {translate('calendar.bookedEvents.nextUp', 'Next up')}:
                </span>
              </div>
              <div className="flex items-center gap-2 mb-0.5">
                <Calendar className="w-3 h-3 text-domain-community-accent/70" />
                <span className="text-xs font-medium text-domain-community-accent/80">
                  {formatEventDate(nextUpcomingBooked.start_time)}
                </span>
              </div>
              <h4 className="text-sm font-medium truncate">{nextUpcomingBooked.title}</h4>
              {nextUpcomingBooked.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{nextUpcomingBooked.location}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
