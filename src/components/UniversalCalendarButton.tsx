import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnhancedCalendarPopup } from "@/components/calendar/EnhancedCalendarPopup";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";

interface UniversalCalendarButtonProps {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
  showEventCount?: boolean;
  showConflictIndicator?: boolean;
}

export function UniversalCalendarButton({
  variant = "outline",
  size = "sm",
  className = "",
  showEventCount = true,
  showConflictIndicator = true
}: UniversalCalendarButtonProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { events, getUpcomingEvents } = useCalendarEvents();
  
  const upcomingEvents = getUpcomingEvents(10);
  const conflictCount = events.filter(e => e.status === 'conflict').length;
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start_time);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  return (
    <>
      <div className="relative">
        <Button 
          size={size} 
          variant={variant}
          onClick={() => setCalendarOpen(true)} 
          className={className}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Calendar
        </Button>
        
        {/* Event count badge */}
        {showEventCount && upcomingEvents.length > 0 && (
          <Badge 
            variant="secondary" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-500 text-white hover:bg-blue-600"
          >
            {upcomingEvents.length > 9 ? '9+' : upcomingEvents.length}
          </Badge>
        )}
        
        {/* Conflict indicator */}
        {showConflictIndicator && conflictCount > 0 && (
          <div className="absolute -top-1 -left-1 h-3 w-3 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </div>

      <EnhancedCalendarPopup 
        open={calendarOpen} 
        onOpenChange={setCalendarOpen} 
      />
    </>
  );
}