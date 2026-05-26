import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, CalendarClock } from "lucide-react";
import { t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";
import type { MyJourneyGoal } from "@/hooks/useMyJourney";

const RING_SIZE = 164;
const STROKE = 12;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ProgressRing({ pct, children }: { pct: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-muted/30"
        />
        <defs>
          <linearGradient id="northstar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="url(#northstar-gradient)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: reduce ? offset : CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        {children}
      </div>
    </div>
  );
}

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
  const goalDay = goal?.goal_day ?? 0;
  const pct = goal?.goal_progress_pct ?? 0;

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
            <ProgressRing pct={pct}>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("screens.autopilotdashboard.dayLabel")}
              </span>
              <span className="text-4xl font-bold leading-none tracking-tight">{goalDay}</span>
              <span className="text-[11px] text-muted-foreground mt-2">
                {t("screens.autopilotdashboard.daysLeftCount", { days: daysLeft })}
              </span>
            </ProgressRing>
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

        {goal && (
          <h2 className="text-lg font-semibold leading-snug max-w-sm">{goal.active_goal_text}</h2>
        )}

        {hasDeadline && goal?.target_date ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5" />
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
