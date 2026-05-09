import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { JOURNEY_WAVES, type JourneyWave } from "@/config/journeyWaves";
import { t } from '@/lib/i18n-toast';

interface JourneyWaveMapProps {
  /** Day number relative to registration. Pass `dayNumber` from the page; the
   *  component figures out which wave is active without re-reading user.created_at. */
  dayNumber: number;
}

function activeWaveId(dayNumber: number): string | null {
  if (dayNumber < 0) return null;
  // Match the same "most advanced active wave wins" rule as getJourneyStage().
  let active: JourneyWave | null = null;
  for (const w of JOURNEY_WAVES) {
    if (dayNumber >= w.timeline.start_day && dayNumber <= w.timeline.end_day) {
      active = w;
    }
  }
  return active?.id ?? null;
}

/**
 * Light footer strip on My Journey: 6 wave-pills in document order with the
 * user's current wave highlighted. Restores the wave-context continuity from
 * the old timeline UI without the rainbow bars. Hover/tap the pill to read
 * the wave's description; clicking is a no-op for now (filtering by wave is
 * a follow-up — TODO surfaced in the plan).
 */
export function JourneyWaveMap({ dayNumber }: JourneyWaveMapProps) {
  const currentId = activeWaveId(dayNumber);

  return (
    <TooltipProvider>
      <div className="rounded-2xl border ring-1 ring-border/60 shadow-sm bg-card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('screens.health.text90dayArc')}
          </span>
          {currentId && (
            <span className="text-[10px] text-muted-foreground">{t('screens.health.youHere')}
            </span>
          )}
        </div>
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
          role="list"
          aria-label={t('screens.health.text90dayJourneyWaves')}
        >
          {JOURNEY_WAVES.map((w) => {
            const isCurrent = w.id === currentId;
            const className = isCurrent
              ? "shrink-0 rounded-full px-3 py-1 text-xs border bg-primary/10 text-primary border-primary/20 ring-1 ring-primary/30 font-semibold"
              : "shrink-0 rounded-full px-3 py-1 text-xs border bg-muted/30 text-muted-foreground border-border";
            return (
              <Tooltip key={w.id}>
                <TooltipTrigger asChild>
                  <span className={className} role="listitem">
                    {w.name}{" "}
                    <span className="opacity-70">{t('screens.health.dayStart_dayEnd_day', { start_day: w.timeline.start_day, end_day: w.timeline.end_day })}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{w.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default JourneyWaveMap;
