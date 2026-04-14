import React, { useState } from "react";
import { Map, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { JourneyProgress } from "@/hooks/useJourneyProgress";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface JourneyProgressStripProps {
  progress: JourneyProgress;
  milestoneEvents: CalendarEvent[];
}

export function JourneyProgressStrip({ progress, milestoneEvents }: JourneyProgressStripProps) {
  const { translate } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const nextMilestone = milestoneEvents
    .filter(e => new Date(e.start_time) > new Date() && e.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

  const dayLabel = translate('calendar.journey.dayOf', 'Day {day} of {total}')
    .replace('{day}', String(progress.dayNumber))
    .replace('{total}', '90');

  const waveName = translate(progress.wave.nameKey, progress.wave.name);

  return (
    <button
      className="w-full bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-800/30 rounded-xl px-3 py-2.5 mb-4 text-left transition-colors hover:bg-amber-50/80 dark:hover:bg-amber-950/30"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Collapsed state */}
      <div className="flex items-center gap-2.5">
        <Map className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{dayLabel}</span>
            <span className="text-xs text-muted-foreground">· {waveName}</span>
          </div>
          <Progress value={progress.totalProgress} className="h-1.5 mt-1.5" />
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200",
          expanded && "rotate-180"
        )} />
      </div>

      {/* Expanded state */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-amber-200/30 dark:border-amber-800/30">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">{waveName}</p>
          <p className="text-xs text-muted-foreground mb-2">{progress.wave.description}</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-muted-foreground">
              {translate('calendar.journey.yourJourney', 'Your journey')}: {progress.waveProgress}%
            </span>
          </div>
          <Progress value={progress.waveProgress} className="h-1 mb-2" />

          {nextMilestone && (
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-medium">{translate('calendar.journey.nextMilestone', 'Next milestone')}:</span>{' '}
              {nextMilestone.title}
            </p>
          )}
        </div>
      )}
    </button>
  );
}
