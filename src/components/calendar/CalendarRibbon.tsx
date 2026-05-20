import { useState } from "react";
import { addDays } from 'date-fns';
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { EnhancedCalendarPopup } from "./EnhancedCalendarPopup";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
const getTypeColor = (type: string) => {
  switch (type) {
    case 'personal': return 'bg-blue-500';
    case 'community': return 'bg-purple-500';
    case 'professional': return 'bg-green-500';
    case 'health': return 'bg-red-500';
    case 'workout': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

export function CalendarRibbon() {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedView, setSelectedView] = useState<'today' | 'week' | 'month'>('week');
  const { getUpcomingEvents } = useCalendarEvents();
  
  const upcomingEvents = getUpcomingEvents(3);
  const today = new Date();

  const handleEventClick = (date: Date) => {
    setSelectedDate(date);
    setCalendarOpen(true);
  };

  const handleQuickAdd = () => {
    setSelectedDate(new Date());
    setCalendarOpen(true);
  };

  return (
    <>
      <div className="h-12 border-b bg-card/50 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-40">
        {/* Today's Date */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">{formatDate(today, 'MMM d, yyyy')}</span>
          <span className="sm:hidden">{formatDate(today, 'MMM d')}</span>
        </div>

        {/* Upcoming Events */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <TooltipProvider key={event.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleEventClick(new Date(event.start_time))}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors text-xs whitespace-nowrap"
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full", getTypeColor(event.event_type))} />
                      <span className="truncate max-w-[100px]">{event.title}</span>
                      <span className="text-muted-foreground">
                        {formatDate(new Date(event.start_time), 'HH:mm')}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-muted-foreground">
                        {formatDate(new Date(event.start_time), 'MMM d, HH:mm')}
                      </p>
                      {event.location && <p>{event.location}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">{t('screens.calendar.noUpcomingEvents')}</span>
          )}
        </div>

        {/* View Toggles */}
        <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
          {(['today', 'week', 'month'] as const).map((view) => (
            <Button
              key={view}
              variant={selectedView === view ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedView(view)}
            >
              {view.charAt(0).toUpperCase()}
            </Button>
          ))}
        </div>

        {/* Quick Add Button */}
        <Button
          size="sm"
          onClick={handleQuickAdd}
          className="h-8 gap-1"
        >
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">{t('screens.calendar.add')}</span>
        </Button>
      </div>

      <EnhancedCalendarPopup 
        open={calendarOpen} 
        onOpenChange={setCalendarOpen}
        initialDate={selectedDate}
        initialView={selectedView}
      />
    </>
  );
}
