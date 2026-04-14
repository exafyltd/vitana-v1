import React from "react";
import { Zap } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { useTranslation } from "@/hooks/useTranslation";
import { AutopilotGroup, EventActionType } from "./calendarSmartUtils";
import { SmartEventCard } from "./SmartEventCard";

interface AutopilotTaskGroupProps {
  group: AutopilotGroup;
  onEventClick: (event: CalendarEvent) => void;
  onAction: (event: CalendarEvent, action: EventActionType) => void;
}

export function AutopilotTaskGroup({ group, onEventClick, onAction }: AutopilotTaskGroupProps) {
  const { translate } = useTranslation();

  if (group.events.length === 0) return null;

  // If only one event, just render a SmartEventCard directly
  if (group.events.length === 1) {
    return <SmartEventCard event={group.events[0]} onEventClick={onEventClick} onAction={onAction} />;
  }

  return (
    <Accordion type="single" collapsible className="mb-1">
      <AccordionItem value={group.id} className="border-0">
        <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/30 dark:border-purple-800/30 rounded-xl overflow-hidden">
          <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Zap className="w-4 h-4 text-purple-500 shrink-0" />
              <span className="text-sm font-medium truncate">{group.label}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                · {group.remainingCount} {translate('calendar.group.stepsRemaining', 'steps remaining')} · {group.estimatedMinutes} {translate('calendar.group.min', 'min')}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2">
            {group.events.map(event => (
              <SmartEventCard
                key={event.id}
                event={event}
                onEventClick={onEventClick}
                onAction={onAction}
              />
            ))}
          </AccordionContent>
        </div>
      </AccordionItem>
    </Accordion>
  );
}
