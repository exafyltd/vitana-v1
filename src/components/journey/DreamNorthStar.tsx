import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, Compass, Sparkles, CalendarClock, Check, Medal, Loader2 } from "lucide-react";
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

// Stepper geometry. Every disc is vertically centred inside a fixed-height
// "zone" so the dashed connectors line up through their centres even though the
// middle (current) disc is larger than the two flanking ones.
const STEP_ZONE = 56; // shared circle-area height → common centreline at STEP_ZONE/2
const STEP_SIZE_MAIN = 56; // "Jetzt" — the current step, largest
const STEP_SIZE_SIDE = 40; // flanking discs — smaller, symmetrical

// A single node on the Guided-Journey "next step" stepper — a pastel disc with
// the milestone number (or a medal icon), an optional done-check badge, and a
// caption beneath. The disc sits inside a fixed-height zone so discs of
// different sizes still share one centreline for the connectors.
function JourneyStep({
  value,
  icon,
  label,
  ring,
  fill,
  text,
  size = STEP_SIZE_SIDE,
  emphasized = false,
  done = false,
}: {
  value?: number | string;
  /** Renders inside the disc instead of `value` — used for the daily-goal medal. */
  icon?: React.ReactNode;
  label: string;
  ring: string;
  fill: string;
  text: string;
  /** Disc diameter in px (defaults to the smaller flanking size). */
  size?: number;
  emphasized?: boolean;
  done?: boolean;
}) {
  const badge = Math.round(size * 0.4);
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: STEP_SIZE_MAIN + 4 }}>
      <div className="flex items-center justify-center" style={{ height: STEP_ZONE }}>
        <div className="relative">
          <div
            className="rounded-full flex items-center justify-center font-bold leading-none"
            style={{
              width: size,
              height: size,
              background: fill,
              color: text,
              border: `2px solid ${ring}`,
              fontSize: Math.round(size * 0.42),
              boxShadow: emphasized
                ? `0 6px 16px ${ring}66, 0 0 0 4px ${ring}26`
                : "0 2px 6px rgba(15,23,42,0.06)",
            }}
          >
            {icon ?? value}
          </div>
          {done && (
            <span
              className="absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center"
              style={{
                width: badge,
                height: badge,
                background: "#10b981",
                boxShadow: "0 2px 5px rgba(16,185,129,0.5)",
              }}
              aria-hidden
            >
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
      <span
        className="text-[11px] font-semibold leading-tight text-center"
        style={{ color: text }}
      >
        {label}
      </span>
    </div>
  );
}

// Dashed link between two stepper discs. Its top margin lands it on the shared
// disc centreline (STEP_ZONE ÷ 2) so the line reads as a continuous path.
function StepConnector() {
  return (
    <div
      className="flex-1 border-t-2 border-dashed"
      style={{ marginTop: STEP_ZONE / 2, borderColor: "rgba(148,163,184,0.5)" }}
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
    /** Contiguous sessions done from the start — the value shown on the
     *  "Erledigt" step so it can't collide with the next-session number. */
    completedInOrder: number;
    totalSessions: number;
    completedTopics: number;
    totalTopics: number;
    pct: number;
    /** Daily motivator: target sessions/day, how many done today, the countdown,
     *  and whether today's goal is already met (medal / 100% state). */
    dailyGoal: number;
    completedToday: number;
    remainingToday: number;
    dailyGoalMet: boolean;
  };
  /**
   * The next session to start (first incomplete). When present the ring centre
   * becomes the "Start your session N" call to action — the big number is the
   * NEXT session, the caption is its title, and tapping starts it (Vitana speaks).
   */
  guidedNextSession?: { session: number; title: string } | null;
  onStartSession?: () => void;
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

  // Loading: never paint the hero with placeholder zeros ("session 0 of 0")
  // while the journey/checklist queries resolve — loading must look like
  // loading. The guided card renders independently of `goal` (a user can have
  // a Life Compass goal AND be in Guided Mode), so guided-not-ready must gate
  // on its own — requiring `!goal` here let any user with an existing goal
  // skip this spinner entirely and fall through to the zero-data render below.
  const guidedNotReady = guided && (!guidedProgress || guidedProgress.totalSessions === 0);
  if (loading && (guidedNotReady || !goal)) {
    return (
      <Card className="rounded-[28px] border border-violet-200/50 shadow-lg bg-white/80">
        <div
          className="p-8 flex min-h-[320px] flex-col items-center justify-center gap-3"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">{t("common.loading")}</span>
        </div>
      </Card>
    );
  }

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
  const guidedInnerInset = stroke + 4;
  const guidedInnerDiameter = Math.max(0, ringSize - guidedInnerInset * 2);
  const guidedNumberFont = Math.min(numberFont, Math.round(guidedInnerDiameter * 0.48));
  // "Hier klicken" must sit clearly INSIDE the inner white circle without its
  // letters kissing the rim. The label lives near the top where the circle's
  // chord is narrowest, so the type is scaled down off the inner diameter and
  // the tracking kept tight — together they keep the word inset from the edge.
  const clickHereFont = Math.max(9, Math.min(11, Math.round(guidedInnerDiameter * 0.06)));
  const clickHereTop = Math.max(14, Math.round(guidedInnerDiameter * 0.14));
  const numberTop = Math.round(guidedInnerDiameter * 0.48);
  const captionTop = Math.round(guidedInnerDiameter * 0.74);
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
        {/* Header — in Guided Mode the card title IS the next-session
            instruction (the screen header already reads "My Longevity Journey",
            so repeating it here is redundant). Readable sentence case, not the
            wide all-caps treatment used for the static label. */}
        {showGuided && guidedNextSession ? (
          <div
            className="text-center font-bold text-balance"
            style={{
              color: "#4c1d95",
              fontSize: 20,
              lineHeight: 1.2,
              letterSpacing: "0.01em",
              textShadow: "0 1px 3px rgba(255,255,255,0.6)",
            }}
          >
            {guidedNextSession.title}
          </div>
        ) : (
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
        )}
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
            // Next-session CTA — the big number is the NEXT session to start,
            // the caption is its title; tapping starts it (Vitana speaks). Falls
            // back to the steps-learned readout while the next session resolves
            // (loading) or when everything is complete.
            <motion.button
              type="button"
              onClick={guidedNextSession ? onStartSession : undefined}
              disabled={!guidedNextSession}
              aria-label={
                guidedNextSession
                  ? t("screens.autopilotdashboard.startSessionAria", {
                      n: guidedNextSession.session,
                    })
                  : undefined
              }
              className="absolute rounded-full flex flex-col items-center justify-center text-center px-4 enabled:hover:scale-[1.03] enabled:active:scale-[0.98] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              style={{
                inset: guidedInnerInset,
                backdropFilter: "blur(8px)",
                // Domed glass surface — a bright highlight near the top fading to
                // a soft violet rim makes the CTA read as a raised, tappable
                // button rather than a flat label.
                background: guidedNextSession
                  ? "radial-gradient(circle at 50% 24%, #ffffff 0%, #fff 30%, #faf5ff 58%, #ddd6fe 100%)"
                  : "rgba(255,255,255,0.92)",
                boxShadow: guidedNextSession
                  ? "inset 0 2px 8px rgba(255,255,255,0.95), inset 0 -14px 22px rgba(124,58,237,0.14), 0 16px 28px rgba(91,33,182,0.32), 0 0 34px rgba(167,139,250,0.72)"
                  : "0 0 0 1px rgba(255,255,255,0.5) inset",
                overflow: "hidden",
              }}
              // Gentle pulsing violet glow draws the eye to the start affordance
              // (disabled once everything's complete or while next session loads).
              animate={
                guidedNextSession && !reduce
                  ? {
                      boxShadow: [
                        "inset 0 2px 8px rgba(255,255,255,0.95), inset 0 -14px 22px rgba(124,58,237,0.14), 0 14px 24px rgba(91,33,182,0.30), 0 0 26px rgba(167,139,250,0.58)",
                        "inset 0 2px 8px rgba(255,255,255,0.95), inset 0 -16px 26px rgba(124,58,237,0.18), 0 18px 32px rgba(91,33,182,0.38), 0 0 44px rgba(167,139,250,0.86)",
                        "inset 0 2px 8px rgba(255,255,255,0.95), inset 0 -14px 22px rgba(124,58,237,0.14), 0 14px 24px rgba(91,33,182,0.30), 0 0 26px rgba(167,139,250,0.58)",
                      ],
                    }
                  : undefined
              }
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Flex-centred stack — never overlaps. The session INSTRUCTION is
                  the card title above; here the ring shows the start affordance:
                  a "click here" prompt, the next-session number, and its label. */}
              <div
                className="absolute left-2 right-2 font-semibold leading-none truncate"
                style={{
                  top: clickHereTop,
                  color: "#6d28d9",
                  fontSize: clickHereFont,
                  letterSpacing: "0.05em",
                }}
              >
                {t(
                  guidedNextSession
                    ? "screens.autopilotdashboard.clickHere"
                    : "screens.autopilotdashboard.stepsLabel",
                ).toUpperCase()}
              </div>
              <div
                className="absolute left-0 right-0 font-bold leading-none"
                style={{
                  top: numberTop,
                  transform: "translateY(-50%)",
                  color: "#7c3aed",
                  fontSize: guidedNumberFont,
                }}
              >
                {guidedNextSession
                  ? guidedNextSession.session
                  : guidedProgress!.completedTopics}
              </div>
              {guidedNextSession ? (
                <div
                  className="absolute left-2 right-2 px-2 text-xs font-medium leading-tight"
                  style={{ top: captionTop, color: "#7c3aed" }}
                >
                  {t("screens.autopilotdashboard.sessionNumber", {
                    n: guidedNextSession.session,
                  })}
                </div>
              ) : (
                <div
                  className="absolute left-2 right-2 px-2 text-xs text-muted-foreground leading-tight"
                  style={{ top: captionTop }}
                >
                  {t("screens.autopilotdashboard.stepsCompletedOf", {
                    total: guidedProgress!.totalTopics,
                  })}
                </div>
              )}
            </motion.button>
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
          guidedNextSession ? (
            // Next-step stepper — a calm pastel progress map (Completed →
            // Up next → Goal) that doubles as the "start session N" CTA. Tapping
            // anywhere on the card starts the next session (same as the ring).
            <button
              type="button"
              onClick={onStartSession}
              aria-label={t("screens.autopilotdashboard.startSessionAria", {
                n: guidedNextSession.session,
              })}
              className="rounded-2xl border border-white/60 px-4 py-2.5 mt-4 hover:scale-[1.01] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 8px 20px rgba(124,58,237,0.12)",
              }}
            >
              <div className="text-[15px] font-bold leading-tight text-slate-900 text-center">
                {t("screens.autopilotdashboard.nextStepLabel")}
              </div>
              <div className="text-[13px] font-medium text-violet-700 text-center mt-0.5">
                {t("screens.autopilotdashboard.startSessionShort", {
                  n: guidedNextSession.session,
                })}
              </div>

              <div className="flex items-start justify-center mt-2">
                <JourneyStep
                  value={guidedProgress!.completedInOrder}
                  label={t("screens.autopilotdashboard.stepDone")}
                  fill="#d1fae5"
                  ring="#6ee7b7"
                  text="#059669"
                  size={STEP_SIZE_SIDE}
                  done={guidedProgress!.completedInOrder > 0}
                />
                <StepConnector />
                <JourneyStep
                  value={guidedNextSession.session}
                  label={t("screens.autopilotdashboard.stepUpNext")}
                  fill="linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)"
                  ring="#a78bfa"
                  text="#7c3aed"
                  size={STEP_SIZE_MAIN}
                  emphasized
                />
                <StepConnector />
                {guidedProgress!.dailyGoalMet ? (
                  // Daily goal smashed — celebrate with a gold medal + "100% done"
                  // instead of a number, so the user sees they're complete today.
                  <JourneyStep
                    icon={<Medal className="w-5 h-5" style={{ color: "#b45309" }} />}
                    label={t("screens.autopilotdashboard.dailyGoalMetLabel")}
                    fill="linear-gradient(135deg, #fde68a 0%, #fcd34d 100%)"
                    ring="#f59e0b"
                    text="#b45309"
                    size={STEP_SIZE_SIDE}
                  />
                ) : (
                  // Daily goal — shown as a "done / goal" ratio (e.g. 0/5) so it
                  // reads as a distinct daily meter, not the next number in the
                  // session sequence (which is what made the row look like it was
                  // counting the same thing three times).
                  <JourneyStep
                    value={`${guidedProgress!.completedToday}/${guidedProgress!.dailyGoal}`}
                    label={t("screens.autopilotdashboard.stepGoalLabel")}
                    fill="#fef3c7"
                    ring="#fcd34d"
                    text="#d97706"
                    size={STEP_SIZE_SIDE}
                  />
                )}
              </div>
            </button>
          ) : (
            // No next session resolved yet (loading) or all sessions done — keep
            // the static learning-goal pill as the calm fallback.
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
          )
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
