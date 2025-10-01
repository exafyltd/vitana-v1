import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { EnhancedCalendarPopup } from "@/components/calendar/EnhancedCalendarPopup";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useSidebar } from "@/components/ui/sidebar";

interface UniversalCalendarButtonProps {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  showEventCount?: boolean;
  showConflictIndicator?: boolean;
  showText?: boolean;
}

export function UniversalCalendarButton({
  variant = "outline",
  size = "sm",
  className = "",
  showEventCount = true,
  showConflictIndicator = true,
  showText = true
}: UniversalCalendarButtonProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { events, getUpcomingEvents } = useCalendarEvents();
  const { open } = useSidebar();
  
  const upcomingEvents = getUpcomingEvents(10);
  const conflictCount = events.filter(e => e.status === 'conflict').length;
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start_time);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  return (
    <>
      <div className="relative h-10 w-10 flex items-center justify-center">
        <Button 
          size={size} 
          variant={variant}
          onClick={() => setCalendarOpen(true)} 
          className={className}
          aria-label={`Calendar: ${upcomingEvents.length} upcoming events`}
        >
          <Calendar className={`w-4 h-4 ${showText ? 'mr-2' : ''}`} />
          {showText && 'Calendar'}
        </Button>
        
        {/* Event count badge */}
        {showEventCount && upcomingEvents.length > 0 && (
          <NotificationBadge 
            count={upcomingEvents.length}
            collapsed={!open}
            label="Calendar"
          />
        )}
        
        {/* Conflict indicator */}
        {showConflictIndicator && conflictCount > 0 && (
          <div className="absolute top-[2px] left-[2px] h-3 w-3 bg-amber-500 rounded-full border-2 border-sidebar animate-pulse z-20" />
        )}
      </div>

      <EnhancedCalendarPopup 
        open={calendarOpen} 
        onOpenChange={setCalendarOpen} 
      />
    </>
  );
}