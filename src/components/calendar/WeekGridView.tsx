import React, { useState, useRef, useEffect } from "react";
import { format, addMinutes, startOfDay, differenceInMinutes, isSameDay, isToday } from "date-fns";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Edit, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeekGridViewProps {
  weekDays: Date[];
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onCreateEvent: (date: Date, startHour: number) => void;
  getCategoryColor: (type: CalendarEvent['event_type']) => string;
  activeFilters: CalendarEvent['event_type'][];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const PIXELS_PER_HOUR = 60; // 60px per hour = 15 min grid (4 segments)
const MIN_EVENT_HEIGHT = 30;

export function WeekGridView({ 
  weekDays, 
  events, 
  onEventClick, 
  onCreateEvent,
  getCategoryColor,
  activeFilters 
}: WeekGridViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showJumpToNow, setShowJumpToNow] = useState(false);
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const nowPosition = (currentHour * 60 + currentMinute) / 60 * PIXELS_PER_HOUR;

  // Auto-scroll to current hour on mount
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      const scrollTo = Math.max(0, (currentHour - 1) * PIXELS_PER_HOUR);
      scrollContainer.scrollTop = scrollTo;
    }
  }, [currentHour]);

  // Track scroll position for "Jump to now" button
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      const nowScrollPosition = (currentHour - 0.5) * PIXELS_PER_HOUR;
      setShowJumpToNow(Math.abs(scrollTop - nowScrollPosition) > 200);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [currentHour]);

  const handleJumpToNow = () => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      const scrollTo = Math.max(0, (currentHour - 1) * PIXELS_PER_HOUR);
      scrollContainer.scrollTo({ top: scrollTo, behavior: 'smooth' });
    }
  };

  const getEventsForDay = (day: Date) => {
    return events
      .filter(event => isSameDay(new Date(event.start_time), day))
      .filter(event => activeFilters.length === 0 || activeFilters.includes(event.event_type));
  };

  const calculateEventPosition = (event: CalendarEvent) => {
    const start = new Date(event.start_time);
    const end = event.end_time ? new Date(event.end_time) : addMinutes(start, 60);
    const startOfDayDate = startOfDay(start);
    
    const top = differenceInMinutes(start, startOfDayDate) / 60 * PIXELS_PER_HOUR;
    const height = Math.max(MIN_EVENT_HEIGHT, differenceInMinutes(end, start) / 60 * PIXELS_PER_HOUR);
    
    return { top, height };
  };

  const handleGridClick = (day: Date, hour: number) => {
    onCreateEvent(day, hour);
  };

  return (
    <div className="relative">
      {/* Jump to Now Button */}
      {showJumpToNow && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleJumpToNow}
            className="gap-1.5 shadow-lg border h-8 text-xs"
          >
            <Clock className="h-3.5 w-3.5" />
            Jump to now
          </Button>
        </div>
      )}

      <ScrollArea ref={scrollAreaRef} className="h-[calc(80vh-340px)]">
        <div className="relative" style={{ minHeight: `${24 * PIXELS_PER_HOUR}px` }}>
          {/* Time Labels */}
          <div className="absolute left-0 top-0 w-14 h-full border-r bg-background z-10">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="text-[10px] text-muted-foreground text-right pr-2"
                style={{ 
                  height: `${PIXELS_PER_HOUR}px`,
                  lineHeight: `${PIXELS_PER_HOUR}px`,
                }}
              >
                {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="ml-14 relative">
            {/* Hour Grid Lines */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-b border-border/30"
                style={{ top: `${hour * PIXELS_PER_HOUR}px` }}
              />
            ))}

            {/* 15-min Grid Lines */}
            {HOURS.flatMap(hour => [1, 2, 3].map(quarter => (
              <div
                key={`${hour}-${quarter}`}
                className="absolute w-full border-b border-dashed border-border/10"
                style={{ top: `${hour * PIXELS_PER_HOUR + quarter * (PIXELS_PER_HOUR / 4)}px` }}
              />
            )))}

            {/* Now Line */}
            {isToday(weekDays.find(d => isToday(d)) || new Date()) && (
              <div
                className="absolute w-full z-20 pointer-events-none"
                style={{ top: `${nowPosition}px` }}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-sys-ai-accent animate-pulse" />
                  <div className="flex-1 h-[2px] bg-sys-ai-accent" />
                </div>
              </div>
            )}

            {/* Day Columns */}
            <div className="grid grid-cols-7 gap-px" style={{ minHeight: `${24 * PIXELS_PER_HOUR}px` }}>
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={format(day, 'yyyy-MM-dd')}
                    className={cn(
                      "relative border-r border-border/20",
                      isTodayDate && "bg-primary/5"
                    )}
                  >
                    {/* Clickable Hour Slots */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute w-full hover:bg-muted/30 transition-colors cursor-pointer group"
                        style={{ 
                          top: `${hour * PIXELS_PER_HOUR}px`,
                          height: `${PIXELS_PER_HOUR}px`
                        }}
                        onClick={() => handleGridClick(day, hour)}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs text-primary">+</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const { top, height } = calculateEventPosition(event);
                      
                      return (
                        <div
                          key={event.id}
                          className="absolute left-0 right-0 mx-0.5 px-2 py-1 rounded group cursor-pointer hover:shadow-md transition-all animate-scale-in overflow-hidden"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: `${getCategoryColor(event.event_type)}20`,
                            borderLeft: `3px solid ${getCategoryColor(event.event_type)}`,
                          }}
                          onClick={() => onEventClick(event)}
                        >
                          <div className="flex flex-col h-full">
                            <p className="text-xs font-semibold truncate mb-0.5">
                              {event.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(event.start_time), 'h:mm a')}
                            </p>
                            
                            {/* Hover Actions */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                              {event.attendees_count && event.attendees_count > 0 && (
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 bg-background/80">
                                  <MessageCircle className="h-3 w-3" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 bg-background/80">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
