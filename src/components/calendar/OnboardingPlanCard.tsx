import React from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { useTranslation } from "@/hooks/useTranslation";
import { EventActionType } from "./calendarSmartUtils";
import { SmartEventCard } from "./SmartEventCard";

interface OnboardingPlanCardProps {
  tasks: CalendarEvent[];
  totalMinutes: number;
  completedCount: number;
  totalCount: number;
  onStartPlan: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onAction: (event: CalendarEvent, action: EventActionType) => void;
}

export function OnboardingPlanCard({
  tasks,
  totalMinutes,
  completedCount,
  totalCount,
  onStartPlan,
  onEventClick,
  onAction,
}: OnboardingPlanCardProps) {
  const { translate } = useTranslation();

  if (tasks.length === 0) return null;

  const taskNames = tasks.slice(0, 3).map(t => t.title).join(', ');
  const moreCount = tasks.length > 3 ? tasks.length - 3 : 0;

  const timeLabel = translate('calendar.journey.estimatedTime', '~{minutes} min')
    .replace('{minutes}', String(totalMinutes));

  const doneLabel = translate('calendar.journey.tasksCompleted', '{completed}/{total} done')
    .replace('{completed}', String(completedCount))
    .replace('{total}', String(totalCount));

  return (
    <Accordion type="single" collapsible className="mb-1">
      <AccordionItem value="onboarding-plan" className="border-0">
        <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/30 dark:border-purple-800/30 rounded-xl overflow-hidden">
          <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-sm font-medium">
                  {translate('calendar.journey.onboardingPlan', "Today's onboarding plan")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate pl-6">
                {taskNames}{moreCount > 0 ? `, +${moreCount}` : ''}
              </p>
              <div className="flex items-center gap-3 mt-1 pl-6">
                <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
                <span className="text-[10px] text-muted-foreground">{doneLabel}</span>
              </div>
            </div>
          </AccordionTrigger>

          {/* Start plan button — subtle, right-aligned */}
          <div className="px-3 pb-2.5 -mt-1 flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 text-xs px-4"
              onClick={(e) => {
                e.stopPropagation();
                onStartPlan();
              }}
            >
              {translate('calendar.journey.startPlan', 'Start plan')}
            </Button>
          </div>

          <AccordionContent className="px-2">
            {tasks.map(event => (
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
