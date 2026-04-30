import { useAuth } from "@/context/AuthProvider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { useVitanaIndexCache } from "./VitanaIndexProvider";

const JOURNEY_TOTAL_DAYS = 90;

function dayNumberFromCreated(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const ms = Date.now() - new Date(createdAt).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.floor(ms / 86400000));
}

/**
 * Page-level "Day {N} of 90" strip for My Journey. Reads the registration
 * date directly so it can render the post-90-day fallback ("Day 90+ —
 * sustained practice") without depending on the wave-aware
 * `getJourneyStage()` (which returns null past Day 90). When inside the
 * 90-day arc, also surfaces the current wave name + day range.
 */
export function JourneyDayBadge() {
  const { user } = useAuth();
  const stage = useJourneyProgress();
  const { index } = useVitanaIndexCache();

  const dayNumber = dayNumberFromCreated(user?.created_at);
  const inArc = dayNumber >= 0 && dayNumber <= JOURNEY_TOTAL_DAYS;
  const totalProgress = stage?.totalProgress ?? Math.min(100, Math.round((dayNumber / JOURNEY_TOTAL_DAYS) * 100));
  const tierFraming = index?.tier?.framing ?? null;

  const dayLabel = inArc ? `Day ${dayNumber}` : "Day 90+";
  const subLabel = inArc
    ? tierFraming ?? "Of your first 90 days."
    : "Sustained practice — you're past the 90-day arc.";

  return (
    <div className="mb-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
      <div className="flex items-baseline gap-3 shrink-0">
        <span className="text-3xl font-bold tracking-tight">{dayLabel}</span>
        <span className="text-sm text-muted-foreground hidden md:inline">{subLabel}</span>
      </div>

      <div className="flex-1 min-w-0">
        <Progress
          value={inArc ? totalProgress : 100}
          className="h-1.5"
          aria-label={`Day ${dayNumber} of ${JOURNEY_TOTAL_DAYS}`}
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Day 0</span>
          <span>30</span>
          <span>60</span>
          <span>90</span>
        </div>
      </div>

      {inArc && stage?.wave && (
        <Badge
          variant="outline"
          className="shrink-0 bg-primary/10 text-primary border-primary/20 text-xs"
          title={stage.wave.description}
        >
          {stage.wave.name} · Day {stage.wave.timeline.start_day}–{stage.wave.timeline.end_day}
        </Badge>
      )}

      <span className="text-sm text-muted-foreground md:hidden">{subLabel}</span>
    </div>
  );
}

export default JourneyDayBadge;
