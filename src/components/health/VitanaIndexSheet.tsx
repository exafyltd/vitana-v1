import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Zap, Sparkles, PartyPopper } from "lucide-react";
import { useVitanaIndexCache } from "./VitanaIndexProvider";
import { pillarKeys, pillarLabel, type VitanaPillarKey } from "@/hooks/useVitanaIndex";
import { LIFE_COMPASS_OPEN_EVENT } from "@/context/LifeCompassPopupContext";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useVitanaStreaks } from "@/hooks/useVitanaStreaks";
import { useLifeCompass } from "@/hooks/useLifeCompass";
import { PillarDeltaBadges } from "./PillarDeltaBadges";
import { EMPTY_COPY } from "@/lib/celebrate";
import { confettiManager } from "@/lib/confetti";
import { buildHorizonPoints, type ProjectedPoint } from "@/lib/vitana-projection";
import type { ContributionVector } from "@/types/autopilot";

export const VITANA_INDEX_OPEN_EVENT = "vitana:open-index";

const GROWTH_CONFETTI_DAY_KEY = "vitana:index-drawer:celebrated";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pickKeepGoingMessage(delta: number, streak: number): string {
  if (delta >= 20) return `Huge week — your Index is up ${delta}. Keep going!`;
  if (delta >= 10) return `You're on a roll — Index up ${delta} this week.`;
  if (delta > 0 && streak >= 7) return `${streak}-day streak and Index +${delta}. Momentum is real.`;
  if (delta > 0 && streak >= 3) return `${streak} days in a row, Index +${delta}. Beautiful — keep stacking wins.`;
  if (delta > 0) return `Index +${delta} this week. Every action counts — keep going!`;
  if (streak >= 7) return `${streak}-day streak. Habits are forming — keep going!`;
  return `${streak} days in a row. The streak is real — keep going!`;
}

const DAILY_ENCOURAGEMENT_MESSAGES = [
  "Fresh day, fresh chance — let's grow your Index together.",
  "You're here, that's the first move. Let's nudge your Index up today.",
  "One small action and your Index starts climbing. Let's go.",
  "Today is a great day to improve. I've got your back — let's grow it.",
  "Let's make today count. Pick one thing and watch your Index lift.",
];

function pickDailyEncouragement(): string {
  const idx = Math.floor(Math.random() * DAILY_ENCOURAGEMENT_MESSAGES.length);
  return DAILY_ENCOURAGEMENT_MESSAGES[idx];
}

const PILLAR_EMOJI: Record<VitanaPillarKey, string> = {
  nutrition: "🥗",
  hydration: "💧",
  exercise: "💪",
  sleep: "😴",
  mental: "🧠",
};

function pillarSevenDayDelta(
  history: Array<{ date: string; score: number }>,
): number | null {
  if (history.length < 2) return null;
  const first = history[0].score;
  const last = history[history.length - 1].score;
  return last - first;
}

function sumVectors(actions: Array<{ contributionVector?: ContributionVector }>): {
  vector: ContributionVector;
  total: number;
} {
  const vector: ContributionVector = {};
  let total = 0;
  for (const a of actions) {
    if (!a.contributionVector) continue;
    for (const [k, v] of Object.entries(a.contributionVector) as Array<[VitanaPillarKey, number | undefined]>) {
      if (typeof v === "number" && v > 0) {
        vector[k] = (vector[k] ?? 0) + v;
        total += v;
      }
    }
  }
  return { vector, total };
}

// Horizon-projection helpers live in `@/lib/vitana-projection` so the Index
// Sheet, the My Journey trajectory card, and the gateway voice tool all
// share the same slope math.

function HorizonChart({ points }: { points: ProjectedPoint[] }) {
  if (points.length === 0) return null;

  const W = 100;
  const H = 28;
  const minDay = points[0].day;
  const maxDay = points[points.length - 1].day;
  const dayRange = Math.max(1, maxDay - minDay);
  const minScore = Math.min(...points.map((p) => p.score));
  const maxScore = Math.max(...points.map((p) => p.score));
  const scoreRange = Math.max(20, maxScore - minScore);

  const toX = (day: number) => ((day - minDay) / dayRange) * W;
  const toY = (score: number) => H - ((score - minScore) / scoreRange) * H;

  const solid = points.filter((p) => !p.isProjection);
  const projection = points.filter((p) => p.isProjection);
  const lastSolid = solid[solid.length - 1];

  const solidPath = solid
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.day).toFixed(2)},${toY(p.score).toFixed(2)}`)
    .join(" ");

  const projectionPath =
    lastSolid && projection.length > 0
      ? `M${toX(lastSolid.day).toFixed(2)},${toY(lastSolid.score).toFixed(2)} ` +
        projection.map((p) => `L${toX(p.day).toFixed(2)},${toY(p.score).toFixed(2)}`).join(" ")
      : null;

  const projectedScore = points[points.length - 1].score;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-20"
        role="img"
        aria-label={`30-day Vitana Index projection — projected ${projectedScore}.`}
      >
        {solidPath && (
          <path
            d={solidPath}
            fill="none"
            className="stroke-foreground"
            strokeWidth={0.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {projectionPath && (
          <path
            d={projectionPath}
            fill="none"
            className="stroke-muted-foreground"
            strokeWidth={0.6}
            strokeDasharray="1 1"
          />
        )}
        {lastSolid && (
          <circle
            cx={toX(lastSolid.day)}
            cy={toY(lastSolid.score)}
            r={1.1}
            className="fill-green-600 stroke-background"
            strokeWidth={0.3}
          />
        )}
      </svg>
      <p className="text-xs text-muted-foreground">
        At this pace you land around <strong>{projectedScore}</strong> in 30 days.
      </p>
    </div>
  );
}

/**
 * Single ambient orientation surface for the Vitana Index. Reachable via the
 * sidebar chip (desktop), the mobile chip, or any code dispatching
 * `vitana:open-index`. Mounted once at the app root — never navigates away;
 * always overlays whatever screen the user is on.
 *
 * Three sections: Today (live total / pillars), Next few days (Autopilot
 * lift forecast), 30-day horizon (slope-projected arc).
 */
export function VitanaIndexSheet() {
  const [open, setOpen] = useState(false);
  const { index, isLoading } = useVitanaIndexCache();
  const { pendingActions } = useAutopilot();
  const { current: streakDays } = useVitanaStreaks();
  const { compass } = useLifeCompass();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(VITANA_INDEX_OPEN_EVENT, handler);
    return () => window.removeEventListener(VITANA_INDEX_OPEN_EVENT, handler);
  }, []);

  const total = index?.total ?? null;
  const tierLabel = index?.tier?.label ?? null;
  const tierFraming = index?.tier?.framing ?? null;
  const balanceFactor = index?.balanceFactor ?? null;
  const pillars = index?.pillars ?? null;
  const sevenDayDelta = index?.history ? pillarSevenDayDelta(index.history) : null;

  const hasGrowth =
    (sevenDayDelta !== null && sevenDayDelta > 0) || streakDays >= 3;

  // Track whether the user has already triggered today's burst so subsequent
  // opens in the same day still render the banner but don't re-fire confetti.
  // Reads localStorage once per drawer-open via state — `useEffect` below is
  // the only place that writes the day-key.
  const [alreadyCelebratedToday, setAlreadyCelebratedToday] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(GROWTH_CONFETTI_DAY_KEY) === todayKey();
    } catch {
      return false;
    }
  });

  // First open of the day always gets a small encouragement burst, even with
  // no growth signal — showing up is the win we're rewarding here.
  const isFirstOpenToday = !alreadyCelebratedToday;
  const shouldShowBanner = hasGrowth || isFirstOpenToday;
  const bannerMessage = useMemo(() => {
    if (!shouldShowBanner) return null;
    if (hasGrowth) return pickKeepGoingMessage(sevenDayDelta ?? 0, streakDays);
    return pickDailyEncouragement();
  }, [shouldShowBanner, hasGrowth, sevenDayDelta, streakDays]);

  // Reset on close so reopening tomorrow can celebrate again. Confetti itself
  // is throttled to once per local day via localStorage so reopening the
  // drawer multiple times in one day shows the banner without re-firing the
  // burst.
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      celebratedRef.current = false;
      return;
    }
    if (celebratedRef.current) return;
    if (typeof window === "undefined") return;
    if (alreadyCelebratedToday) {
      celebratedRef.current = true;
      return;
    }
    if (prefersReducedMotion()) {
      // Mark the day so banner-only days stay consistent — but don't fire
      // confetti.
      try {
        localStorage.setItem(GROWTH_CONFETTI_DAY_KEY, todayKey());
      } catch {
        /* ignore */
      }
      setAlreadyCelebratedToday(true);
      celebratedRef.current = true;
      return;
    }

    // Defer a tick so the sheet's own enter animation isn't competing for
    // paint with the confetti canvas creation.
    const timer = window.setTimeout(() => {
      confettiManager.fire({
        particleCount: hasGrowth ? 120 : 70,
        spread: hasGrowth ? 90 : 70,
        startVelocity: 38,
        colors: ["#10B981", "#22D3EE", "#3B82F6", "#A78BFA", "#F59E0B"],
        shapes: ["circle", "square"],
        scalar: hasGrowth ? 1.1 : 0.9,
      });
    }, 180);

    try {
      localStorage.setItem(GROWTH_CONFETTI_DAY_KEY, todayKey());
    } catch {
      /* ignore */
    }
    setAlreadyCelebratedToday(true);
    celebratedRef.current = true;

    return () => window.clearTimeout(timer);
  }, [open, hasGrowth, alreadyCelebratedToday]);

  const { vector: nextDaysVector, total: nextDaysTotal } = useMemo(
    () => sumVectors(pendingActions),
    [pendingActions],
  );

  const horizonPoints = useMemo(
    () => buildHorizonPoints(index?.history ?? []),
    [index?.history],
  );

  const handleCompassClick = () => {
    window.dispatchEvent(new CustomEvent(LIFE_COMPASS_OPEN_EVENT));
  };

  const handleOpenAutopilot = () => {
    window.dispatchEvent(new CustomEvent("autopilot:open"));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Your Index</SheetTitle>
          {tierLabel && (
            <SheetDescription className="text-sm text-muted-foreground">
              {tierFraming ?? tierLabel}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {bannerMessage && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-xl border p-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500 ${
                hasGrowth
                  ? "border-green-500/30 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10"
                  : "border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full bg-background/60 p-2 motion-safe:animate-bounce ${
                    hasGrowth ? "text-green-600" : "text-blue-600"
                  }`}
                >
                  <PartyPopper className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-foreground leading-snug">
                  {bannerMessage}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Today */}
          <section aria-labelledby="vitana-index-today" className="space-y-4">
            <h3
              id="vitana-index-today"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Today
            </h3>

            <div className="flex items-center justify-center">
              <div
                className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg"
                role="img"
                aria-label={
                  isLoading || total === null
                    ? "Loading Vitana Index"
                    : `Vitana Index ${total} of 999`
                }
              >
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {isLoading || total === null ? "…" : total}
                  </div>
                  <div className="text-xs text-muted-foreground">of 999</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {tierLabel && (
                <Badge variant="secondary" className="text-sm">
                  {tierLabel}
                </Badge>
              )}
              {sevenDayDelta !== null && sevenDayDelta !== 0 && (
                <Badge variant="outline" className="text-xs">
                  {sevenDayDelta > 0 ? "+" : ""}
                  {sevenDayDelta} this week
                </Badge>
              )}
              {balanceFactor !== null && (
                <Badge variant="outline" className="text-xs">
                  Balance {Math.round(balanceFactor * 100)}%
                </Badge>
              )}
              {streakDays > 0 && (
                <Badge variant="outline" className="text-xs gap-1 border-orange-300 text-orange-700 bg-orange-50">
                  🔥 {streakDays}-day streak
                </Badge>
              )}
            </div>

            {pillars && (
              <div className="grid grid-cols-5 gap-1.5">
                {pillarKeys().map((key) => (
                  <div
                    key={key}
                    className={`bg-pill-${key}-tint text-pill-${key}-accent rounded-xl px-1 py-2 flex flex-col items-center gap-0.5`}
                    title={`${pillarLabel(key)}: ${pillars[key]}/200`}
                  >
                    <span className="text-base leading-none">{PILLAR_EMOJI[key]}</span>
                    <span className="text-xs font-semibold">{pillars[key]}</span>
                    <span className="text-[10px] opacity-70">/200</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Section 2: Next few days */}
          <section aria-labelledby="vitana-index-next-days" className="space-y-3">
            <h3
              id="vitana-index-next-days"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Next few days
            </h3>

            {pendingActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{EMPTY_COPY.indexSheetNextDays}</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm">
                  Complete the {pendingActions.length} action{pendingActions.length === 1 ? "" : "s"} Autopilot suggests
                  {nextDaysTotal > 0 ? (
                    <>
                      {" "}→ <strong className="text-green-600">+{nextDaysTotal}</strong>
                    </>
                  ) : null}
                  .
                </p>
                {nextDaysTotal > 0 && (
                  <PillarDeltaBadges vector={nextDaysVector} compact />
                )}
                <Button
                  onClick={handleOpenAutopilot}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Open Autopilot
                </Button>
              </div>
            )}
          </section>

          <Separator />

          {/* Section 3: 30-day horizon */}
          <section aria-labelledby="vitana-index-horizon" className="space-y-3">
            <h3
              id="vitana-index-horizon"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3" />
              30-day horizon
            </h3>

            {horizonPoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">{EMPTY_COPY.indexSheetHorizon}</p>
            ) : (
              <HorizonChart points={horizonPoints} />
            )}
          </section>

          <Separator />

          <button
            type="button"
            onClick={handleCompassClick}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline w-full text-left"
          >
            {compass?.primary_goal
              ? `Compass: ${compass.primary_goal} →`
              : "Set your Life Compass →"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default VitanaIndexSheet;
