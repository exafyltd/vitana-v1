import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Compass, CalendarClock } from "lucide-react";
import { t } from "@/lib/i18n-toast";
import { localizeGoal } from "@/lib/goalLabel";
import { fmtDate } from "@/lib/locale-format";
import type { MyJourneyGoal, MyJourneyJourney } from "@/hooks/useMyJourney";
import { useGoalPlan } from "@/hooks/useGoalPlan";
import { GoalProgressRing } from "@/components/journey/GoalProgressRing";
import { GoalTrendBadge } from "@/components/journey/GoalTrendBadge";
import { buildPhases } from "@/lib/goalPhases";
import { buildJourneyRing } from "@/lib/journeyRing";
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
  journey,
  loading,
  error,
  onSetGoal,
  onRetry,
  onOpenPlan,
  guided = false,
  guidedProgress,
  guidedNextSession,
  onStartSession,
}: {
  goal: MyJourneyGoal | null;
  journey?: MyJourneyJourney | null;
  loading: boolean;
  error?: boolean;
  onSetGoal: () => void;
  onRetry?: () => void;
  onOpenPlan?: () => void;
  guided?: boolean; // VTID-03287: Guided Mode → bright Maxina-header blue card
  /**
   * Guided Journey learning progress. When present (Guided Mode), the ring
   * reflects steps (topics) learned instead of the goal-deadline countdown.
   * The ring fills by `pct` (topics completed); the headline number is steps.
   */
  guidedProgress?: {
    completedSessions: number;
    totalSessions: number;
    completedTopics: number;
    totalTopics: number;
    pct: number;
  };
  /**
   * The next session to start (first incomplete). When present the ring centre
   * becomes the "Start your session N" call to action — the big number is the
   * NEXT session, the caption is its title, and tapping starts it (Vitana speaks).
   */
  guidedNextSession?: { session: number; title: string } | null;
  onStartSession?: () => void;
}) {
  // VTID-03287: bright Maxina-header blue (same gradient as .maxina-topbar),
  // applied as the Guided-Mode visual signal. Overrides the Tailwind gradient.
  const guidedCardStyle = guided
    ? { backgroundImage: "linear-gradient(180deg, hsl(201 90% 78%) 0%, hsl(201 75% 70%) 100%)" }
    : undefined;
  // Plan milestones power the phase-colored ring (hook must run before any early return).
  const { data: planData } = useGoalPlan();

  // Guided Mode shows learning progress (sessions/topics learned) and a fixed
  // learning goal — independent of the user's Life Compass goal, so it skips the
  // no-goal / journey-error early returns below and always renders the card.
  const showGuided = guided && !!guidedProgress;

  // Couldn't load the journey — show a retry, not a misleading "no goal" state.
  if (!showGuided && !loading && error && !goal) {
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
  if (!showGuided && !loading && !goal) {
    return (
      <Card className={`rounded-3xl border shadow-sm ${guided ? "border-sky-300/60" : "border-amber-200/60 bg-gradient-to-br from-amber-50 via-rose-50 to-fuchsia-50 dark:from-amber-950/20 dark:via-rose-950/20 dark:to-fuchsia-950/20"}`} style={guidedCardStyle}>
        <CardContent className="p-8 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400/40 via-rose-400/40 to-fuchsia-500/40 flex items-center justify-center shadow-sm">
            <Compass className="w-8 h-8 text-rose-600 dark:text-rose-300" />
          </div>
          <h2 className="text-lg font-semibold">{t("screens.autopilotdashboard.setGoalTitle")}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("screens.autopilotdashboard.setGoalSubtitle")}
          </p>
          <Button
            onClick={onSetGoal}
            className="mt-1 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white border-0 hover:opacity-90"
          >
            {t("screens.autopilotdashboard.setGoalCta")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasDeadline = !!goal?.has_deadline;
  // The ring is always a countdown: to the goal deadline when set, otherwise
  // to the 90-day onboarding plan (so it counts DOWN instead of up).
  const ring = buildJourneyRing(goal, journey ?? null);
  const total = ring.total;
  // Onboarding fallback reads "… in your 90-day plan"; the goal countdown keeps
  // the default "… to your goal" caption inside the ring.
  const ringCaption =
    ring.source === "onboarding"
      ? t("screens.autopilotdashboard.onboardingDaysLeftCount", { days: ring.daysLeft })
      : undefined;

  // Phase coloring only applies to a real goal plan; the onboarding fallback
  // uses the single gradient. Each plan milestone bounds a phase.
  const phases =
    hasDeadline && total != null
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
    <Card className={`rounded-3xl border shadow-sm relative overflow-hidden ${guided ? "border-sky-300/60" : "border-emerald-200/50 bg-gradient-to-br from-emerald-50 via-sky-50 to-pink-50 dark:from-emerald-950/20 dark:via-sky-950/20 dark:to-pink-950/20"}`} style={guidedCardStyle}>
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl ${guided ? "hidden" : "bg-gradient-to-br from-emerald-300/30 via-sky-300/20 to-fuchsia-300/30"}`}
      />
      <CardContent className="p-5 flex flex-col items-center text-center gap-3 relative">

        {showGuided && (
          <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-900/80">
            {t("screens.autopilotdashboard.myGuidedJourney")}
          </h2>
        )}

        {showGuided ? (
          // Guided Mode — the ring fills by steps (topics) learned; the centre
          // is the next-session CTA: big number = NEXT session, caption = its
          // title, tap = start it (Vitana speaks). Falls back to the steps
          // readout while the next session resolves or once all are complete.
          guidedNextSession ? (
            <button
              type="button"
              onClick={onStartSession}
              aria-label={t("screens.autopilotdashboard.startSessionAria", {
                n: guidedNextSession.session,
              })}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-transform hover:scale-[1.02]"
            >
              <GoalProgressRing
                pct={guidedProgress!.pct}
                day={guidedNextSession.session}
                daysLeft={0}
                daysLeftLabel={t("screens.autopilotdashboard.sessionNumber", {
                  n: guidedNextSession.session,
                })}
                topLabel={t("screens.autopilotdashboard.clickHere")}
                size={RING_SIZE}
                glow
              />
            </button>
          ) : (
            <GoalProgressRing
              pct={guidedProgress!.pct}
              day={guidedProgress!.completedTopics}
              daysLeft={0}
              daysLeftLabel={t("screens.autopilotdashboard.stepsCompletedOf", {
                total: guidedProgress!.totalTopics,
              })}
              topLabel={t("screens.autopilotdashboard.stepsLabel")}
              size={RING_SIZE}
            />
          )
        ) : ring.hasCountdown ? (
          // Tapping the ring opens the day-by-day plan once a deadline exists;
          // without one it routes to the goal/deadline setup flow.
          <button
            type="button"
            onClick={hasDeadline ? onOpenPlan : onSetGoal}
            aria-label={t(
              hasDeadline
                ? "screens.autopilotdashboard.openPlan"
                : "screens.autopilotdashboard.setDeadlineCta",
            )}
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-transform hover:scale-[1.02]"
          >
            <GoalProgressRing
              pct={ring.pct}
              day={ring.day}
              daysLeft={ring.daysLeft}
              daysLeftLabel={ringCaption}
              size={RING_SIZE}
              phases={phases}
              currentDay={goal?.goal_day ?? 0}
              totalDays={hasDeadline ? total ?? undefined : undefined}
            />
          </button>
        ) : (
          // No countdown available at all → encourage adding a target date.
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

        {!showGuided && hasDeadline && trend && <GoalTrendBadge trend={trend} />}

        {showGuided ? (
          // Guided Mode goal — fixed: learn the app / pass the sessions.
          <>
            <h2 className="text-lg font-semibold leading-snug max-w-sm">
              {t("screens.autopilotdashboard.guidedGoalTitle")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("screens.autopilotdashboard.guidedGoalSubtitle", {
                total: guidedProgress!.totalSessions,
              })}
            </p>
          </>
        ) : (
          <>
            {goal && (
              <h2 className="text-lg font-semibold leading-snug max-w-sm">{localizeGoal(goal.active_goal_text)}</h2>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default GoalNorthStar;
