import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Zap, Sparkles } from "lucide-react";
import { useVitanaIndexCache } from "./VitanaIndexProvider";
import { pillarKeys, pillarLabel, type VitanaPillarKey } from "@/hooks/useVitanaIndex";
import { LIFE_COMPASS_OPEN_EVENT } from "@/context/LifeCompassPopupContext";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useVitanaStreaks } from "@/hooks/useVitanaStreaks";
import { PillarDeltaBadges } from "./PillarDeltaBadges";
import { EMPTY_COPY } from "@/lib/celebrate";
import type { ContributionVector } from "@/types/autopilot";

export const VITANA_INDEX_OPEN_EVENT = "vitana:open-index";

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

interface ProjectedPoint {
  day: number;
  score: number;
  isProjection: boolean;
}

const HORIZON_DAYS = 30;

function buildHorizonPoints(
  history: Array<{ date: string; score: number }>,
): ProjectedPoint[] {
  if (history.length < 7) return [];

  // Map history to days-from-today (negative for past, 0 for today)
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const points = history.map((h) => {
    const day = Math.floor((new Date(h.date).getTime() - todayMs) / 86400000);
    return { day, score: h.score, isProjection: false };
  });

  const last = points[points.length - 1];
  const tail = points.slice(-7);
  const first = tail[0];
  const slope =
    tail.length > 1 && last.day !== first.day
      ? (last.score - first.score) / (last.day - first.day)
      : 0;
  const projectedScore = Math.max(0, Math.min(999, Math.round(last.score + slope * HORIZON_DAYS)));

  return [...points, { day: last.day + HORIZON_DAYS, score: projectedScore, isProjection: true }];
}

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
            Open your Life Compass →
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default VitanaIndexSheet;
