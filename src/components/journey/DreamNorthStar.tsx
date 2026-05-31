import { useLayoutEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plane, Compass, Sparkles, CalendarClock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { t } from "@/lib/i18n-toast";
import { fmtDate } from "@/lib/locale-format";
import type { MyJourneyGoal } from "@/hooks/useMyJourney";

// Production asset slot — drop the curated AI-painted illustration here:
//   public/illustrations/journey-coast.webp
//
// Until it's in place, the soft pastel-sunrise CSS gradient behind it
// shows through. We tried an Unsplash photo stand-in but the available
// IDs returned dark/cold scenes — Unsplash is photos, and the
// fairy-tale painted feel needs a generated illustration. See
// public/illustrations/README.md for the recommended prompt + style.
const HERO_BG = "/illustrations/journey-coast.webp";

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
  const reduce = useReducedMotion();

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
  const daysLeft = goal?.days_to_deadline ?? 0;
  const total = goal?.goal_total_days ?? null;
  const goalDay = Math.min((goal?.goal_day ?? 0) + 1, total ?? (goal?.goal_day ?? 0) + 1);
  const pct = goal?.goal_progress_pct ?? 0;

  const stroke = Math.round(ringSize * STROKE_RATIO);
  const numberFont = Math.round(ringSize * NUMBER_RATIO);
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <Card
      ref={cardRef}
      className="rounded-[28px] border border-violet-200/50 shadow-2xl overflow-hidden relative"
      style={{
        // Painted illustration on top, soft pastel-sunrise fallback gradient
        // underneath so the card never looks broken if the asset isn't shipped.
        backgroundImage: `
          linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(196,181,253,0.18) 60%, rgba(244,114,182,0.22) 100%),
          url(${HERO_BG}),
          linear-gradient(180deg, #fde2ec 0%, #fbcfe8 22%, #fed7aa 42%, #fef3c7 60%, #bfdbfe 80%, #93c5fd 100%)
        `,
        backgroundSize: "cover, cover, cover",
        backgroundPosition: "center, center 40%, center",
        backgroundRepeat: "no-repeat",
      }}
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
          {t("screens.autopilotdashboard.myJourney").toUpperCase()}
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
            className="-rotate-90"
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
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#ede9fe"
              strokeWidth={stroke}
            />
            {hasDeadline && (
              <motion.circle
                cx={ringSize / 2}
                cy={ringSize / 2}
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
            )}
          </svg>

          {/* Plane badge */}
          <button
            type="button"
            onClick={onOpenPlan}
            className="absolute left-1/2 z-10 -translate-x-1/2 w-11 h-11 rounded-full bg-white/95 border border-violet-200/50 shadow-md flex items-center justify-center text-violet-700 hover:scale-[1.04] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            style={{ top: -6 }}
            aria-label={t("screens.autopilotdashboard.openPlan")}
          >
            <Plane className="w-5 h-5 -rotate-12" />
          </button>

          {hasDeadline && <TodayDot pct={pct} ringSize={ringSize} stroke={stroke} />}

          {/* Inner white circle — the big day number is anchored to the exact
              centre of the circle; the "TAG" label and the days-left caption are
              positioned above and below it so the number always reads centred. */}
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
              {goal ? goalDay : "—"}
            </div>
            <div
              className="absolute left-0 right-0 px-5 text-center text-xs text-muted-foreground leading-tight"
              style={{ bottom: "15%" }}
            >
              {hasDeadline
                ? t("screens.autopilotdashboard.daysToGoalShort", { count: daysLeft })
                : !goal
                ? t("screens.autopilotdashboard.setGoalSubtitle")
                : t("screens.autopilotdashboard.noDeadlineHint")}
            </div>
          </div>
        </div>

        {/* Flex spacer pushes the goal card to the bottom of the hero */}
        <div className="flex-1" />

        {/* Goal pill (or CTA when no goal) */}
        {goal ? (
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
                {goal.active_goal_text}
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
