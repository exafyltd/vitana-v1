import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthProvider";
import { useVitanaIndex } from "@/hooks/useVitanaIndex";
import { useVitanaIndexHistory } from "@/hooks/useVitanaIndexHistory";
import { VITANA_INDEX_TIERS, getVitanaIndexTier } from "@/lib/vitanaIndex";
import { t } from '@/lib/i18n-toast';

const JOURNEY_TOTAL_DAYS = 90;
const GOAL_SCORE = 600;

const TIER_COLORS: Record<string, string> = {
  Starting:     "fill-slate-200",
  Early:        "fill-amber-100",
  Building:     "fill-amber-200",
  Strong:       "fill-emerald-200",
  "Really good":"fill-emerald-300",
  Elite:        "fill-emerald-400",
};

function daysSince(iso?: string | null): number {
  if (!iso) return 0;
  const reg = new Date(iso).getTime();
  if (Number.isNaN(reg)) return 0;
  return Math.max(0, Math.floor((Date.now() - reg) / 86400000));
}

interface ProjectedPoint {
  day: number;
  score: number;
  isProjection: boolean;
}

export function VitanaIndexTrajectoryCard() {
  const { user } = useAuth();
  const { index, isLoading: indexLoading } = useVitanaIndex();
  const { history, isLoading: historyLoading } = useVitanaIndexHistory(JOURNEY_TOTAL_DAYS);

  const dayNumber = daysSince(user?.created_at);

  const points = useMemo<ProjectedPoint[]>(() => {
    if (history.length === 0) return [];

    const regTime = user?.created_at ? new Date(user.created_at).getTime() : null;
    const historic: ProjectedPoint[] = history
      .map((h) => {
        const day = regTime
          ? Math.floor((new Date(h.date).getTime() - regTime) / 86400000)
          : 0;
        return { day: Math.max(0, Math.min(JOURNEY_TOTAL_DAYS, day)), score: h.score, isProjection: false };
      })
      .filter((p) => p.day >= 0 && p.day <= JOURNEY_TOTAL_DAYS);

    if (historic.length === 0) return [];

    // Simple linear projection from today to Day 90 using slope of last 7 points.
    const last = historic[historic.length - 1];
    if (last.day >= JOURNEY_TOTAL_DAYS) return historic;

    const tail = historic.slice(-7);
    const first = tail[0];
    const slope = tail.length > 1 && last.day !== first.day
      ? (last.score - first.score) / (last.day - first.day)
      : 0;
    const projectedDay = JOURNEY_TOTAL_DAYS;
    const projectedScore = Math.max(0, Math.min(999, Math.round(last.score + slope * (projectedDay - last.day))));

    return [...historic, { day: projectedDay, score: projectedScore, isProjection: true }];
  }, [history, user?.created_at]);

  const projectedEnd = points.length > 0 ? points[points.length - 1] : null;
  const projectedTier = projectedEnd ? t(getVitanaIndexTier(projectedEnd.score).labelKey) : null;

  const isLoading = indexLoading || historyLoading;

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Empty state: no Index yet.
  if (!index || points.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4 text-sm text-muted-foreground">{t('screens.health.yourVitanaIndexTrajectoryWillAppear')}
        </CardContent>
      </Card>
    );
  }

  // SVG layout
  const W = 100;
  const H = 36;
  const MIN_Y = 0;
  const MAX_Y = 999;
  const toX = (day: number) => (day / JOURNEY_TOTAL_DAYS) * W;
  const toY = (score: number) => H - ((score - MIN_Y) / (MAX_Y - MIN_Y)) * H;

  const solidPoints = points.filter((p) => !p.isProjection);
  const projectionPoints = points.filter((p) => p.isProjection);
  const lastSolid = solidPoints[solidPoints.length - 1];

  const solidPath = solidPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.day).toFixed(2)},${toY(p.score).toFixed(2)}`)
    .join(" ");

  const projectionPath = lastSolid && projectionPoints.length > 0
    ? `M${toX(lastSolid.day).toFixed(2)},${toY(lastSolid.score).toFixed(2)} ` +
      projectionPoints.map((p) => `L${toX(p.day).toFixed(2)},${toY(p.score).toFixed(2)}`).join(" ")
    : null;

  const markerX = toX(Math.min(dayNumber, JOURNEY_TOTAL_DAYS));
  const goalY = toY(GOAL_SCORE);

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-calendar-primary" />
            <h3 className="text-sm font-medium">{t('screens.health.vitanaIndexTrajectory')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{t('screens.health.todayTotal', { total: index.total })}</Badge>
            <Badge variant="outline" className="text-xs">{t(index.tier.labelKey)}</Badge>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-24"
          role="img"
          aria-label={`Vitana Index trajectory — today ${index.total}, projected Day 90 ${projectedEnd?.score ?? "?"}.`}
        >
          {/* Tier bands */}
          {VITANA_INDEX_TIERS.map((tier) => {
            const topY = toY(Math.min(tier.max, MAX_Y));
            const bottomY = toY(tier.min);
            const rectHeight = Math.max(0, bottomY - topY);
            return (
              <rect
                key={tier.label}
                x={0}
                y={topY}
                width={W}
                height={rectHeight}
                className={cn(TIER_COLORS[tier.label] ?? "fill-slate-100", "opacity-40")}
              />
            );
          })}

          {/* Goal line @ 600 */}
          <line
            x1={0}
            y1={goalY}
            x2={W}
            y2={goalY}
            className="stroke-calendar-primary"
            strokeWidth={0.3}
            strokeDasharray="1 1"
          />

          {/* Historical line */}
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

          {/* Projection line */}
          {projectionPath && (
            <path
              d={projectionPath}
              fill="none"
              className="stroke-muted-foreground"
              strokeWidth={0.6}
              strokeDasharray="1 1"
            />
          )}

          {/* Today marker */}
          {lastSolid && (
            <circle
              cx={toX(lastSolid.day)}
              cy={toY(lastSolid.score)}
              r={1.1}
              className="fill-calendar-primary stroke-background"
              strokeWidth={0.3}
            />
          )}

          {/* Today vertical guide */}
          <line
            x1={markerX}
            y1={0}
            x2={markerX}
            y2={H}
            className="stroke-calendar-primary"
            strokeWidth={0.2}
            strokeDasharray="0.5 0.5"
          />
        </svg>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[10px] text-muted-foreground">
          <span>{t('screens.health.day0')}</span>
          <span>{t('screens.health.day30')}</span>
          <span>{t('screens.health.day60')}</span>
          <span>{t('screens.health.day90GoalGoal_score', { GOAL_SCORE })}</span>
        </div>

        {projectedEnd && projectedTier && (
          <p className="text-xs text-muted-foreground mt-2">{t('screens.health.atThisPaceYouLandAround')} <strong>{projectedEnd.score}</strong>{t('screens.health.byDayJourney_total_daysValue1', { JOURNEY_TOTAL_DAYS, value1: " " })} <span className="font-medium">{projectedTier}</span>{t('screens.health.tierBalanceAcrossAllFivePillars')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
