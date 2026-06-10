import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, Compass, Sparkles, CalendarClock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { t } from "@/lib/i18n-toast";
import { localizeGoal } from "@/lib/goalLabel";
import { fmtDate } from "@/lib/locale-format";
import type { MyJourneyGoal, MyJourneyJourney } from "@/hooks/useMyJourney";
import { useGoalPlan } from "@/hooks/useGoalPlan";
import { buildPhases } from "@/lib/goalPhases";
import { buildJourneyRing } from "@/lib/journeyRing";

// The painted-illustration slot was wired through here, but the team
// landed on the pure pastel gradient as the default — calmer, lighter,
// less visually busy than any painted scene we tried. The asset path
// is kept in `public/illustrations/journey-coast.webp` (and the slot
// stays reserved) so a future pillar-aware illustration set can be
// re-enabled by adding `url(${HERO_BG})` back into the backgroundImage
// stack below. Until then, gradient only.
// const HERO_BG = "/illustrations/journey-coast.webp";

// The ring is sized relative to the card's measured width so it never
// dwarfs a small phone. RING_MAX keeps the original look on roomy widths;
// RING_MIN stops it collapsing on very narrow devices. Stroke and the big
// day-number scale off whatever ring size we land on.
const RING_MAX = 220;
const RING_MIN = 150;
const STROKE_RATIO = 14 / RING_MAX; // ≈ original 14px stroke at 220px ring
const NUMBER_RATIO = 88 / RING_MAX; // ≈ original 88px number at 220px ring

const SERIF: React.CSSProperties = { fontFamily: "Cormorant, Georgia, serif" };

function HeartDivider({
  width = 32,
  className = "",
}: { width?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      <span style={{ width, height: 1, background: "rgba(76, 29, 149, 0.32)" }} />
      <span style={{ color: "#f472b6", fontSize: 11, lineHeight: 1 }}>♡</span>
      <span style={{ width, height: 1, background: "rgba(76, 29, 149, 0.32)" }} />
    </div>
  );
}

function TodayDot({
  pct,
  ringSize,
  stroke,
}: { pct: number; ringSize: number; stroke: number }) {
  const r = (ringSize - stroke) / 2;
  const angleRad = (Math.min(100, Math.max(0, pct)) / 100) * 2 * Math.PI - Math.PI / 2;
  const cx = ringSize / 2 + r * Math.cos(angleRad);
  const cy = ringSize / 2 + r * Math.sin(angleRad);
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: cx,
        top: cy,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "white",
        border: "3px solid #7c3aed",
        transform: "translate(-50%, -50%)",
        boxShadow:
          "0 0 0 6px rgba(124,58,237,0.18), 0 4px 10px rgba(124,58,237,0.3)",
      }}
      aria-hidden
    />
  );
}

/**
 * Mobile-only painted "dream-board" hero for My Journey. Carries the same
 * data as GoalNorthStar (goal_day, days_to_deadline, goal_progress_pct,
 * active_goal_text, target_date) but framed as an aspirational vision-board
 * — illustrated backdrop, editorial typography, gradient progress ring,
 * goal pill peeking up from the bottom, motivational serif tagline.
 */
export function DreamNorthStar({
  goal,
  journey,
  loading,
  error,
  onSetGoal,
  onRetry,
  onOpenPlan,
  guided = false,
  guidedProgress,
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
}) {
  const reduce = useReducedMotion();

  // Plan milestones drive the phase-colored ring — each milestone bounds a
  // phase, elapsed segments render at full opacity, upcoming at 0.55. When
  // no plan exists yet the ring falls back to the single pink→violet→amber
  // gradient stroke.
  const { data: planData } = useGoalPlan();

  // Phase segments — computed up front so the hook ordering stays stable
  // across the error / no-goal / happy-path branches below.
  const phaseTotalDays = goal?.goal_total_days ?? null;
  const phases = useMemo(() => {
    if (!phaseTotalDays || phaseTotalDays <= 0) return [];
    return buildPhases(
      (planData?.plan?.milestones ?? [])
        .map((m) => m.day_offset ?? 0)
        .filter((d) => d > 0),
      phaseTotalDays,
    );
  }, [planData, phaseTotalDays]);

  // Responsive sizing — measure the card and derive the ring + a minimum
  // (rather than fixed) height. Using minHeight instead of a rigid
  // aspectRatio lets the card GROW to fit its content on narrow phones, so
  // the goal pill + tagline are never clipped by `overflow-hidden`.
  const cardRef = useRef<HTMLDivElement>(null);
  const [ringSize, setRingSize] = useState(RING_MAX);
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (!w) return;
      // Leave breathing room around the ring; cap to the original size.
      const ring = Math.max(RING_MIN, Math.min(RING_MAX, Math.round((w - 40) * 0.62)));
      setRingSize(ring);
      // Keep the tall, portrait painted feel as a floor — but only a floor.
      setMinHeight(Math.round(w * 1.25));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Error: don't pretend "no goal", offer a retry.
  if (!loading && error && !goal) {
    return (
      <Card className="rounded-[28px] border border-violet-200/50 shadow-lg bg-white/80">
        <div className="p-8 flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center">
            <Compass className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">
            {t("screens.autopilotdashboard.journeyLoadErrorTitle")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t("screens.autopilotdashboard.journeyLoadErrorBody")}
          </p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="mt-1">
              {t("screens.autopilotdashboard.retry")}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const hasDeadline = !!goal?.has_deadline;
  // Guided Mode shows learning progress (sessions/topics learned), not the
  // goal-deadline countdown. The ring fills smoothly by topics completed.
  const showGuided = guided && !!guidedProgress;
  // The ring is always a countdown: to the goal deadline when set, otherwise
  // to the 90-day onboarding plan (so it counts DOWN instead of up).
  const ring = buildJourneyRing(goal, journey ?? null);
  const total = ring.total;
  const goalDay = ring.day;
  const daysLeft = ring.daysLeft;

  const stroke = Math.round(ringSize * STROKE_RATIO);
  const numberFont = Math.round(ringSize * NUMBER_RATIO);
  const radius = (ringSize - stroke) / 2;
  const cx = ringSize / 2;
  const cy = ringSize / 2;
  const circumference = 2 * Math.PI * radius;
  const ringPct = showGuided ? guidedProgress!.pct : ring.pct;
  const clamped = Math.min(100, Math.max(0, ringPct));
  const offset = circumference - (clamped / 100) * circumference;

  // Phase coloring only applies to a real goal plan; the onboarding fallback
  // uses the single gradient stroke. Guided Mode always uses the single gradient.
  const hasPhases = !showGuided && hasDeadline && phases.length > 1 && total !== null && total > 0;
  const curFrac =
    hasPhases && goal?.goal_day != null && total
      ? Math.max(0, Math.min(1, goal.goal_day / total))
      : clamped / 100;

  // Perimeter point at a fraction (0 = top, going clockwise) — matches the
  // shared GoalProgressRing convention so phase math is identical.
  const ptAt = (frac: number): [number, number] => {
    const a = frac * 2 * Math.PI;
    return [cx + radius * Math.sin(a), cy - radius * Math.cos(a)];
  };
  const phaseArc = (
    fA: number,
    fB: number,
    color: string,
    opacity: number,
    key: string,
  ) => {
    if (fB - fA <= 0.002) return null;
    const [x1, y1] = ptAt(fA);
    const [x2, y2] = ptAt(fB);
    const large = fB - fA > 0.5 ? 1 : 0;
    return (
      <path
        key={key}
        d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="butt"
        opacity={opacity}
      />
    );
  };
  const PHASE_GAP = 0.008;

  return (
    <Card
      ref={cardRef}
      className={`rounded-[28px] border shadow-2xl overflow-hidden relative ${guided ? "border-sky-300/60" : "border-violet-200/50"}`}
      style={
        guided
          ? {
              // VTID-03287: Guided Mode signal — the bright Maxina-header blue
              // (same gradient as .maxina-topbar). Full App keeps the pastel
              // sunrise below (unchanged).
              backgroundImage:
                "linear-gradient(180deg, hsl(201 90% 78%) 0%, hsl(201 75% 70%) 100%)",
              backgroundRepeat: "no-repeat",
            }
          : {
              // Pure pastel-sunrise gradient. The painted-illustration layer was
              // intentionally removed — the gradient reads calmer and lighter
              // than any painted scene we tried. To re-enable a future
              // pillar-aware illustration, uncomment the HERO_BG const at the
              // top of this file and add `url(${HERO_BG}),` between the two
              // gradients below, restoring the matching backgroundSize /
              // backgroundPosition entries.
              backgroundImage: `
          linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(196,181,253,0.18) 60%, rgba(244,114,182,0.22) 100%),
          linear-gradient(180deg, #fde2ec 0%, #fbcfe8 22%, #fed7aa 42%, #fef3c7 60%, #bfdbfe 80%, #93c5fd 100%)
        `,
              backgroundSize: "cover, cover",
              backgroundPosition: "center, center",
              backgroundRepeat: "no-repeat",
            }
      }
    >
      <div
        className="relative z-10 flex flex-col px-5 pt-7 pb-3"
        style={{ minHeight }}
      >
        {/* Header */}
        <div
          className="text-center font-semibold"
          style={{
            color: "#4c1d95",
            fontSize: 14,
            letterSpacing: "0.32em",
            textShadow: "0 1px 3px rgba(255,255,255,0.6)",
          }}
        >
          {t(
            showGuided
              ? "screens.autopilotdashboard.myGuidedJourney"
              : "screens.autopilotdashboard.myJourney",
          ).toUpperCase()}
        </div>
        <HeartDivider className="mt-1.5" />

        {/* Ring */}
        <div
          className="relative mx-auto mt-5"
          style={{ width: ringSize, height: ringSize }}
        >
          <svg
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            width={ringSize}
            height={ringSize}
            style={{ filter: "drop-shadow(0 12px 24px rgba(196,181,253,0.4))" }}
            aria-hidden
          >
            <defs>
              <linearGradient id="dreamRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fda4af" />
                <stop offset="50%" stopColor="#c4b5fd" />
                <stop offset="100%" stopColor="#fcd34d" />
              </linearGradient>
            </defs>
            {/* track */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#ede9fe"
              strokeWidth={stroke}
            />
            {hasPhases ? (
              phases.flatMap((p, i) => {
                const t = total as number;
                const sF = Math.min(1, p.start / t + (i > 0 ? PHASE_GAP : 0));
                const eF = Math.max(
                  sF,
                  p.end / t - (i < phases.length - 1 ? PHASE_GAP : 0),
                );
                const nodes: Array<JSX.Element | null> = [];
                if (curFrac > sF)
                  nodes.push(phaseArc(sF, Math.min(eF, curFrac), p.color, 1, `e${i}`));
                if (curFrac < eF)
                  nodes.push(
                    phaseArc(Math.max(sF, curFrac), eF, p.color, 0.55, `u${i}`),
                  );
                return nodes;
              })
            ) : showGuided || ring.hasCountdown ? (
              // Single gradient fallback when there's no phase plan — used for a
              // deadline-without-plan goal, the 90-day onboarding countdown, and
              // Guided Mode's learning progress. Keeps the animated dashoffset
              // look. Rotated so the fill starts from the top of the ring and
              // proceeds clockwise.
              <g transform={`rotate(-90 ${cx} ${cy})`}>
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke="url(#dreamRingGrad)"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: reduce ? offset : circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: reduce ? 0 : 1.4, ease: "easeOut" }}
                />
              </g>
            ) : null}
          </svg>

          {/* Plane badge — only shown when there's an actual plan to open
              (i.e. a deadline exists). Without a deadline, GoalPlanSheet
              auto-fires plan generation and lands the user on an empty
              drawer instead of the deadline-setup flow. */}
          {!showGuided && hasDeadline && (
            <button
              type="button"
              onClick={onOpenPlan}
              className="absolute left-1/2 z-10 -translate-x-1/2 w-11 h-11 rounded-full bg-white/95 border border-violet-200/50 shadow-md flex items-center justify-center text-violet-700 hover:scale-[1.04] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              style={{ top: -6 }}
              aria-label={t("screens.autopilotdashboard.openPlan")}
            >
              <Plane className="w-5 h-5 -rotate-12" />
            </button>
          )}

          {!showGuided && ring.hasCountdown && (
            <TodayDot pct={curFrac * 100} ringSize={ringSize} stroke={stroke} />
          )}

          {/* Inner white circle — the big number is anchored to the exact
              centre of the circle; the label and caption are positioned above
              and below it so the number always reads centred. In Guided Mode it
              shows sessions learned (non-interactive); otherwise it's a button —
              tapping anywhere on the day number opens the day-by-day plan sheet. */}
          {showGuided ? (
            <div
              className="absolute rounded-full bg-white/92"
              style={{
                inset: stroke + 4,
                backdropFilter: "blur(8px)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.5) inset",
              }}
            >
              <div
                className="absolute left-0 right-0 text-center font-semibold"
                style={{ top: "19%", color: "#6d28d9", fontSize: 13, letterSpacing: "0.32em" }}
              >
                {t("screens.autopilotdashboard.stepsLabel").toUpperCase()}
              </div>
              <div
                className="absolute left-1/2 top-1/2 font-bold leading-none"
                style={{
                  transform: "translate(-50%, -50%)",
                  color: "#7c3aed",
                  fontSize: numberFont,
                }}
              >
                {guidedProgress!.completedTopics}
              </div>
              <div
                className="absolute left-0 right-0 px-5 text-center text-xs text-muted-foreground leading-tight"
                style={{ bottom: "15%" }}
              >
                {t("screens.autopilotdashboard.stepsCompletedOf", {
                  total: guidedProgress!.totalTopics,
                })}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={hasDeadline ? onOpenPlan : onSetGoal}
              aria-label={t(
                hasDeadline
                  ? "screens.autopilotdashboard.openPlan"
                  : !goal
                  ? "screens.autopilotdashboard.setGoalCta"
                  : "screens.autopilotdashboard.setDeadlineCta",
              )}
              className="absolute rounded-full bg-white/92 hover:scale-[1.02] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-left"
              style={{
                inset: stroke + 4,
                backdropFilter: "blur(8px)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.5) inset",
              }}
            >
              <div
                className="absolute left-0 right-0 text-center font-semibold"
                style={{ top: "19%", color: "#6d28d9", fontSize: 13, letterSpacing: "0.32em" }}
              >
                {t("screens.autopilotdashboard.dayLabel").toUpperCase()}
              </div>
              <div
                className="absolute left-1/2 top-1/2 font-bold leading-none"
                style={{
                  transform: "translate(-50%, -50%)",
                  color: "#7c3aed",
                  fontSize: numberFont,
                }}
              >
                {ring.hasCountdown ? goalDay : "—"}
              </div>
              <div
                className="absolute left-0 right-0 px-5 text-center text-xs text-muted-foreground leading-tight"
                style={{ bottom: "15%" }}
              >
                {hasDeadline
                  ? t("screens.autopilotdashboard.daysToGoalShort", { count: daysLeft })
                  : ring.source === "onboarding"
                  ? t("screens.autopilotdashboard.onboardingDaysLeftShort", { count: daysLeft })
                  : !goal
                  ? t("screens.autopilotdashboard.setGoalSubtitle")
                  : t("screens.autopilotdashboard.noDeadlineHint")}
              </div>
            </button>
          )}
        </div>

        {/* Flex spacer pushes the goal card to the bottom of the hero */}
        <div className="flex-1" />

        {/* Goal pill — Guided Mode shows the fixed learning goal (learn the app
            / pass the sessions); Full App shows the user's life-compass goal. */}
        {showGuided ? (
          <div
            className="text-left rounded-2xl border border-white/60 px-4 py-3.5 flex items-center gap-3 mt-4"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 8px 20px rgba(124,58,237,0.12)",
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #c4b5fd 0%, #f9a8d4 100%)",
                boxShadow: "0 4px 10px rgba(196,181,253,0.4)",
              }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold leading-tight text-slate-900">
                {t("screens.autopilotdashboard.guidedGoalTitle")}
              </div>
              <HeartDivider width={20} className="my-1.5" />
              <div className="text-[12px] text-slate-500">
                {t("screens.autopilotdashboard.guidedGoalSubtitle", {
                  total: guidedProgress!.totalSessions,
                })}
              </div>
            </div>
          </div>
        ) : goal ? (
          <button
            type="button"
            onClick={onSetGoal}
            aria-label={t("screens.autopilotdashboard.adjustGoalCta")}
            className="text-left rounded-2xl border border-white/60 px-4 py-3.5 flex items-center gap-3 mt-4 hover:scale-[1.01] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 8px 20px rgba(124,58,237,0.12)",
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0"
              style={{
                background: "linear-gradient(135deg, #c4b5fd 0%, #f9a8d4 100%)",
                boxShadow: "0 4px 10px rgba(196,181,253,0.4)",
              }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold leading-tight text-slate-900">
                {localizeGoal(goal.active_goal_text)}
              </div>
              {goal.target_date ? (
                <>
                  <HeartDivider width={20} className="my-1.5" />
                  <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-violet-400" />
                    {fmtDate(new Date(goal.target_date), {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </>
              ) : (
                <>
                  <HeartDivider width={20} className="my-1.5" />
                  <div className="text-[12px] text-violet-700 font-medium">
                    {t("screens.autopilotdashboard.setDeadlineCta")}
                  </div>
                </>
              )}
            </div>
          </button>
        ) : (
          <Button
            onClick={onSetGoal}
            className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 text-white border-0 mt-4 rounded-full h-12 text-sm font-semibold shadow-lg"
          >
            {t("screens.autopilotdashboard.setGoalCta")}
          </Button>
        )}

        {/* Bottom tagline strip */}
        <div
          className="text-center -mx-5 -mb-3 mt-3 py-3 px-5"
          style={{
            background:
              "linear-gradient(180deg, rgba(196,181,253,0.22) 0%, rgba(196,181,253,0.4) 100%)",
          }}
        >
          <span
            className="italic font-semibold"
            style={{ ...SERIF, fontSize: 18, color: "#6d28d9", letterSpacing: "0.02em" }}
          >
            {t("screens.autopilotdashboard.dreamTagline")}
          </span>
          <span className="text-amber-400 ml-1">✨</span>
        </div>
      </div>
    </Card>
  );
}

export default DreamNorthStar;
