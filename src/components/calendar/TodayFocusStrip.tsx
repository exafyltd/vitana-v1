import React from "react";
import { Zap, ChevronRight, Coffee } from "lucide-react";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { useTranslation } from "@/hooks/useTranslation";
import { determineFocusItem } from "./calendarSmartUtils";

interface TodayFocusStripProps {
  todayEvents: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function TodayFocusStrip({ todayEvents, onEventClick }: TodayFocusStripProps) {
  const { translate } = useTranslation();
  const focus = determineFocusItem(todayEvents, translate);

  if (focus.type === 'empty') {
    return (
      <div className="flex items-center gap-2.5 bg-muted/30 rounded-lg px-3 py-2.5 mb-4">
        <Coffee className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground flex-1">{focus.label}</p>
      </div>
    );
  }

  return (
    <button
      className="w-full flex items-center gap-2.5 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2.5 mb-4 text-left hover:bg-primary/10 transition-colors"
      onClick={() => focus.event && onEventClick(focus.event)}
    >
      <Zap className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">
          {translate('calendar.focus.todaysFocus', "Today's focus")}
        </p>
        <p className="text-sm font-semibold truncate">{focus.label}</p>
        {focus.sublabel && (
          <p className="text-xs text-muted-foreground">{focus.sublabel}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
