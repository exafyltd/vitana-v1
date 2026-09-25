import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { EnhancedCalendarPopup } from "@/components/calendar/EnhancedCalendarPopup";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useSidebarSafe } from "@/components/ui/sidebar";
import { useTranslation } from "@/hooks/useTranslation";
import { useWindowOverlay } from '@/navigation/overlay-bus';
import { useNavigate } from "react-router-dom";
import { CALENDAR_ROUTE, opensRemindersPopup, type CalendarOpenTab } from "@/components/calendar/calendar-entry";

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
  const [requestedMobileTab, setRequestedMobileTab] = useState<'agenda' | 'month' | 'reminders' | undefined>(undefined);

  const navigate = useNavigate();

  // Global calendar:open events (ORB voice navigation, deep links) go to the
  // calendar screen; only the reminder push deep link, which asks for the
  // 'reminders' tab, still opens the popup (VTID-04528).
  useWindowOverlay<{ tab?: CalendarOpenTab }>('calendar:open', (detail) => {
    if (opensRemindersPopup(detail?.tab)) {
      setRequestedMobileTab(detail?.tab);
      setCalendarOpen(true);
      return;
    }
    navigate(CALENDAR_ROUTE);
  });

  const calendarHook = useCalendarEvents();
  const { events, getUpcomingEvents } = calendarHook;
  const { open } = useSidebarSafe();
  const { translate } = useTranslation();
  
  const upcomingEvents = getUpcomingEvents(10);
  const conflictCount = events.filter(e => e.status === 'conflict').length;
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start_time);
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  });

  return (
    <>
      {/* Wrapper with overflow-visible to prevent badge clipping */}
      <div className="relative overflow-visible shrink-0">
        {/* Pill button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(CALENDAR_ROUTE)}
          aria-label={translate('actionBar.calendar', 'Calendar')}
          className={`h-9 px-2.5 rounded-full bg-muted/60 hover:bg-muted text-foreground gap-1 ${className}`}
        >
          <Calendar className="w-4 h-4" />
          {showText && <span className="text-sm">{translate('actionBar.calendar', 'Calendar')}</span>}
        </Button>
        
        {/* Event count badge - positioned outside pill, z-index above */}
        {showEventCount && upcomingEvents.length > 0 && (
          <NotificationBadge
            count={upcomingEvents.length}
            collapsed={!open}
            className="z-10"
            ariaLabel={`${upcomingEvents.length} upcoming event${upcomingEvents.length !== 1 ? 's' : ''}`}
          />
        )}
        
        {/* Conflict indicator */}
        {showConflictIndicator && conflictCount > 0 && (
          <div className="absolute -top-1.5 -left-1.5 h-3 w-3 bg-amber-500 rounded-full border-2 border-background animate-pulse z-10" />
        )}
      </div>

      <EnhancedCalendarPopup
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        calendarHook={calendarHook}
        initialMobileTab={requestedMobileTab}
      />
    </>
  );
}
