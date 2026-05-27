import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, CalendarClock } from "lucide-react";
import { t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";
import type { MyJourneyGoal } from "@/hooks/useMyJourney";
import { useGoalPlan } from "@/hooks/useGoalPlan";
import { GoalProgressRing } from "@/components/journey/GoalProgressRing";
import { GoalTrendBadge } from "@/components/journey/GoalTrendBadge";
import { buildPhases } from "@/lib/goalPhases";
import { computeGoalTrend } from "@/lib/goalTrend";

const RING_SIZE = 164;

/**
 * The North Star hero for My Journey. The ring fills by time-to-deadline
 * (days elapsed since the goal was set vs. days until the deadline) and the
 * center shows the motivating "days left" number. Falls back to warm CTAs
 * when there is no goal yet, or a goal without a deadline.
 */
export function GoalNorthStar({
  goal,
  loading,
  error,
  onSetGoal,
  onRetry,
  onOpenPlan,
}: {
  goal: MyJourneyGoal | null;
  loading: boolean;
  error?: boolean;
  onSetGoal: () => void;
  onRetry?: () => void;
  onOpenPlan?: () => void;
}) {
  // Plan milestones power the phase-colored ring (hook must run before any early return).
  const { data: planData } = useGoalPlan();

  // Couldn't load the journey — show a retry, not a misleading "no goal" state.
  if (!loading && error && !goal) {
    return (
      <Card className="rounded-3xl border ring-1 ring-border/60 shadow-sm bg-card/80">
        <CardContent className="p-8 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center">
            <Compass className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">{t("screens.autopilotdashboard.journeyLoadErrorTitle")}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("screens.autopilotdashboard.journeyLoadErrorBody")}
          </p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="mt-1">
              {t("screens.autopilotdashboard.retry")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // No goal at all → invite the user to set their Life Compass goal.
  if (!loading && !goal) {
    return (
      <Card className="rounded-3xl border ring-1 ring-border/60 shadow-sm bg-card/80">
        <CardContent className="p-8 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400/30 to-indigo-500/30 flex items-center justify-center">
            <Compass className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{t("screens.autopilotdashboard.setGoalTitle")}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("screens.autopilotdashboard.setGoalSubtitle")}
          </p>
          <Button onClick={onSetGoal} className="mt-1">
            {t("screens.autopilotdashboard.setGoalCta")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasDeadline = !!goal?.has_deadline;
  const daysLeft = goal?.days_to_deadline ?? 0;
  const total = goal?.goal_total_days ?? null;
  // 1-based day: the first day is Day 1, never Day 0; clamped to the total.
  const goalDay = Math.min((goal?.goal_day ?? 0) + 1, total ?? (goal?.goal_day ?? 0) + 1);
  const pct = goal?.goal_progress_pct ?? 0;

  // Color the ring by phase using the active plan's milestones (each milestone
  // bounds a phase). Falls back to the single gradient when no plan/milestones.
  const phases =
    total != null
      ? buildPhases(
          (planData?.plan?.milestones ?? [])
            .map((m) => m.day_offset ?? 0)
            .filter((d) => d > 0),
          total,
        )
      : [];

  // Schedule-adherence trend (↑ on track / → stagnating / ↓ falling behind).
  const trend = computeGoalTrend(planData?.plan ?? null, new Date().toISOString().slice(0, 10));

  return (
    <Card className="rounded-3xl border ring-1 ring-border/60 shadow-sm bg-card/80">
      <CardContent className="p-5 flex flex-col items-center text-center gap-3">

        {hasDeadline ? (
          <button
            type="button"
            onClick={onOpenPlan}
            aria-label={t("screens.autopilotdashboard.openPlan")}
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-transform hover:scale-[1.02]"
          >
            <GoalProgressRing
              pct={pct}
              day={goalDay}
              daysLeft={daysLeft}
              size={RING_SIZE}
              phases={phases}
              currentDay={goal?.goal_day ?? 0}
              totalDays={total ?? undefined}
            />
          </button>
        ) : (
          // Goal exists but no deadline → encourage adding a target date.
          <div
            className="flex flex-col items-center justify-center gap-2"
            style={{ width: RING_SIZE, height: RING_SIZE }}
          >
            <CalendarClock className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-[12rem]">
              {t("screens.autopilotdashboard.noDeadlineHint")}
            </p>
          </div>
        )}

        {hasDeadline && trend && <GoalTrendBadge trend={trend} />}

        {goal && (
          <h2 className="text-lg font-semibold leading-snug max-w-sm">{goal.active_goal_text}</h2>
        )}

        {hasDeadline && goal?.target_date ? (
          <p className="text-xs text-muted-foreground">
            {t("screens.autopilotdashboard.goalDateOn", {
              date: fmtDate(new Date(goal.target_date), { day: "numeric", month: "long", year: "numeric" }),
            })}
          </p>
        ) : null}

        {hasDeadline && (
          <button type="button" onClick={onOpenPlan} className="text-xs text-primary font-medium hover:underline">
            {t("screens.autopilotdashboard.tapForPlan")}
          </button>
        )}

        <Button variant="outline" size="sm" onClick={onSetGoal} className="mt-1">
          {hasDeadline
            ? t("screens.autopilotdashboard.adjustGoalCta")
            : t("screens.autopilotdashboard.setDeadlineCta")}
        </Button>
      </CardContent>
    </Card>
  );
}

export default GoalNorthStar;
