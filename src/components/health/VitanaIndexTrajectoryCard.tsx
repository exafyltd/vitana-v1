import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthProvider";
import { useVitanaIndex } from "@/hooks/useVitanaIndex";
import { useVitanaIndexHistory } from "@/hooks/useVitanaIndexHistory";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { fmtDate, fmtNumber } from "@/lib/locale-format";
import { VITANA_INDEX_OPEN_EVENT } from "@/components/health/VitanaIndexSheet";
import { t } from "@/lib/i18n-toast";

const JOURNEY_TOTAL_DAYS = 90;
const GOAL_SCORE = 600;

type Range = "7d" | "30d" | "90d";

const RANGES: { key: Range; days: number; labelKey: string }[] = [
  { key: "7d",  days: 7,  labelKey: "screens.health.range7d" },
  { key: "30d", days: 30, labelKey: "screens.health.range30d" },
  { key: "90d", days: 90, labelKey: "screens.health.range90d" },
];

interface Point { day: number; score: number; date: string }

function daysSince(iso?: string | null): number {
  if (!iso) return 0;
  const reg = new Date(iso).getTime();
  if (Number.isNaN(reg)) return 0;
  return Math.max(0, Math.floor((Date.now() - reg) / 86400000));
}

export function VitanaIndexTrajectoryCard() {
  const { user } = useAuth();
  const { index, isLoading: indexLoading } = useVitanaIndex();
  const [range, setRange] = useState<Range>("30d");

  const fetchDays = range === "90d" ? JOURNEY_TOTAL_DAYS : range === "30d" ? 30 : 7;
  const { history, isLoading: historyLoading } = useVitanaIndexHistory(fetchDays);

  const dayNumber = daysSince(user?.created_at);

  // Map history → indexed daily points (oldest first).
  const points = useMemo<Point[]>(() => {
    return history.map((h, i) => ({
      day: i,
      score: h.score,
      date: h.date,
    }));
  }, [history]);

  // Stats: best, worst, avg, last-7d delta.
  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const scores = points.map((p) => p.score);
    const best = points.reduce((a, b) => (b.score > a.score ? b : a));
    const worst = points.reduce((a, b) => (b.score < a.score ? b : a));
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const tail = scores.slice(-7);
    const trend = tail.length > 1 ? tail[tail.length - 1] - tail[0] : 0;
    return { best, worst, avg, trend };
  }, [points]);

  // Simple linear projection (90d view only).
  const projectionEnd = useMemo(() => {
    if (range !== "90d" || points.length < 2) return null;
    const tail = points.slice(-7);
    const first = tail[0];
    const last = tail[tail.length - 1];
    const slope = last.day !== first.day ? (last.score - first.score) / (last.day - first.day) : 0;
    const remainingDays = Math.max(0, JOURNEY_TOTAL_DAYS - dayNumber);
    if (remainingDays <= 0) return null;
    const projected = Math.max(0, Math.min(999, Math.round(last.score + slope * remainingDays)));
    return { day: last.day + remainingDays, score: projected };
  }, [points, range, dayNumber]);

  const isLoading = indexLoading || historyLoading;

  if (isLoading) {
    return (
      <Card className="rounded-2xl border ring-1 ring-border/60 shadow-sm">
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!index || points.length === 0) {
    return (
      <Card className="rounded-2xl border ring-1 ring-border/60 shadow-sm">
        <CardContent className="p-4 text-sm text-muted-foreground">
          {t("screens.health.yourVitanaIndexTrajectoryWillAppear")}
        </CardContent>
      </Card>
    );
  }

  // ── Chart geometry ─────────────────────────────────────────────────────
  const W = 360;
  const H = 180;
  const padX = 4;

  // Dynamic Y range: zoom to where the data lives, but always cap to 0-999
  // and keep at least 100 points of breathing room above + below.
  const rawScores = points.map((p) => p.score);
  if (projectionEnd) rawScores.push(projectionEnd.score);
  const dataMin = Math.min(...rawScores);
  const dataMax = Math.max(...rawScores);
  const pad = Math.max(40, Math.round((dataMax - dataMin) * 0.25));
  const yMin = Math.max(0, Math.floor((dataMin - pad) / 50) * 50);
  let yMax = Math.min(999, Math.ceil((dataMax + pad) / 50) * 50);
  if (yMax - yMin < 100) yMax = Math.min(999, yMin + 100);

  // X range covers history + projection (when present).
  const xMaxDay = projectionEnd ? projectionEnd.day : Math.max(1, points[points.length - 1].day);
  const xMinDay = points[0].day;

  const toX = (d: number) => padX + ((d - xMinDay) / Math.max(1, xMaxDay - xMinDay)) * (W - 2 * padX);
  const toY = (s: number) => H - ((s - yMin) / (yMax - yMin)) * H;

  // Smoothed path through history points (Catmull-Rom-ish: midpoint Béziers).
  const buildPath = (pts: Point[]): string => {
    if (pts.length === 0) return "";
    if (pts.length === 1) {
      const { day, score } = pts[0];
      return `M ${toX(day).toFixed(2)} ${toY(score).toFixed(2)}`;
    }
    let d = `M ${toX(pts[0].day).toFixed(2)} ${toY(pts[0].score).toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const mx = (toX(p0.day) + toX(p1.day)) / 2;
      const my = (toY(p0.score) + toY(p1.score)) / 2;
      d += ` Q ${toX(p0.day).toFixed(2)} ${toY(p0.score).toFixed(2)}, ${mx.toFixed(2)} ${my.toFixed(2)}`;
    }
    const last = pts[pts.length - 1];
    d += ` T ${toX(last.day).toFixed(2)} ${toY(last.score).toFixed(2)}`;
    return d;
  };

  const linePath = buildPath(points);
  const lastPt = points[points.length - 1];
  const areaPath = linePath
    ? `${linePath} L ${toX(lastPt.day).toFixed(2)} ${H} L ${toX(points[0].day).toFixed(2)} ${H} Z`
    : "";

  // Tier bands clipped to visible Y range.
  const tierBands = [
    { min: 0,   max: 99,  fill: "#fee2e2" }, // Starting (red-100)
    { min: 100, max: 299, fill: "#fde68a" }, // Early (amber-200)
    { min: 300, max: 499, fill: "#fef08a" }, // Building (yellow-200)
    { min: 500, max: 599, fill: "#a7f3d0" }, // Strong (emerald-200)
    { min: 600, max: 799, fill: "#6ee7b7" }, // Really good (emerald-300)
    { min: 800, max: 999, fill: "#34d399" }, // Elite (emerald-400)
  ].map((band) => {
    const top = Math.max(yMin, band.min);
    const bot = Math.min(yMax, band.max);
    if (bot <= top) return null;
    return { ...band, yTop: toY(bot), yBot: toY(top) };
  }).filter(Boolean) as { fill: string; yTop: number; yBot: number }[];

  // Markers — only show best/worst pills when they aren't the same point as today.
  const todayPoint = lastPt;
  const showBest = stats && stats.best.day !== todayPoint.day;
  const showWorst = stats && stats.worst.day !== todayPoint.day && stats.worst.day !== stats.best.day;

  // Goal line visibility.
  const goalInRange = GOAL_SCORE >= yMin && GOAL_SCORE <= yMax;

  // X-axis labels: 4 dates evenly across the range.
  const startDateIso = points[0].date;
  const endDateIso = points[points.length - 1].date;
  const xAxisLabels = (() => {
    if (range === "90d") {
      return [
        t("screens.health.dayN", { n: 0 }),
        t("screens.health.dayN", { n: 30 }),
        t("screens.health.todayWithDay", { day: dayNumber }),
        t("screens.health.dayN", { n: 90 }),
      ];
    }
    const start = new Date(startDateIso);
    const end = new Date(endDateIso);
    const mid1 = new Date(start.getTime() + (end.getTime() - start.getTime()) * 0.33);
    const mid2 = new Date(start.getTime() + (end.getTime() - start.getTime()) * 0.66);
    return [
      fmtDate(start, { day: "numeric", month: "short" }),
      fmtDate(mid1, { day: "numeric", month: "short" }),
      fmtDate(mid2, { day: "numeric", month: "short" }),
      t("screens.health.today"),
    ];
  })();

  // Insight footer text.
  const trend = stats?.trend ?? 0;
  const insightKey =
    trend > 3 ? "screens.health.insightUp"
    : trend < -3 ? "screens.health.insightDown"
    : "screens.health.insightFlat";
  const insight = trend > 3
    ? t(insightKey, { delta: Math.abs(trend) })
    : trend < -3
    ? t(insightKey, { delta: Math.abs(trend) })
    : t(insightKey);

  const openDrawer = () => window.dispatchEvent(new CustomEvent(VITANA_INDEX_OPEN_EVENT));

  return (
    <Card className="rounded-2xl border ring-1 ring-border/60 shadow-sm overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 text-violet-500 shrink-0" />
            <h3 className="text-sm font-semibold truncate">
              {t("screens.health.vitanaIndexTrajectory")}
            </h3>
          </div>
          <div className="flex flex-col items-end leading-none">
            <span className="text-xl font-serif font-semibold bg-gradient-to-br from-emerald-500 to-blue-500 bg-clip-text text-transparent">
              {index.total}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-1">
              {t("screens.health.todayDot")} {t(index.tier.labelKey)}
            </span>
          </div>
        </div>

        {/* Range chips */}
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
                range === r.key
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-transparent shadow-sm"
                  : "bg-white text-muted-foreground border-border hover:bg-muted/40",
              )}
            >
              {t(r.labelKey)}
            </button>
          ))}
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-4 gap-1.5">
            <div className="rounded-lg bg-white/70 border border-border/60 px-2 py-1.5 text-center">
              <div className="text-sm font-bold leading-none text-emerald-600">{stats.best.score}</div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-1">
                {t("screens.health.statBest")}
              </div>
            </div>
            <div className="rounded-lg bg-white/70 border border-border/60 px-2 py-1.5 text-center">
              <div className="text-sm font-bold leading-none text-amber-600">{stats.worst.score}</div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-1">
                {t("screens.health.statWorst")}
              </div>
            </div>
            <div className="rounded-lg bg-white/70 border border-border/60 px-2 py-1.5 text-center">
              <div className="text-sm font-bold leading-none">{stats.avg}</div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-1">
                {t("screens.health.statAverage")}
              </div>
            </div>
            <div className="rounded-lg bg-white/70 border border-border/60 px-2 py-1.5 text-center">
              <div className={cn(
                "text-sm font-bold leading-none",
                trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-muted-foreground",
              )}>
                {trend > 0 ? "↑ +" : trend < 0 ? "↓ " : "→ "}
                {fmtNumber(Math.abs(trend))}
              </div>
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-1">
                {t("screens.health.stat7d")}
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="relative">
          {/* Y axis labels */}
          <div
            className="absolute left-0 top-0 bottom-0 w-7 flex flex-col justify-between text-right pr-1 text-[9px] font-semibold text-muted-foreground"
            style={{ height: H }}
          >
            <span>{yMax}</span>
            <span>{Math.round((yMin + yMax) / 2)}</span>
            <span>{yMin}</span>
          </div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block ml-7"
            style={{ width: "calc(100% - 1.75rem)", height: H }}
            role="img"
            aria-label={t("screens.health.trajectoryAria", { today: index.total })}
          >
            <defs>
              <linearGradient id="vitanaLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"  stopColor="#10b981" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="vitanaFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"  stopColor="#6366f1" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {/* Tier bands */}
            {tierBands.map((b, i) => (
              <rect
                key={i}
                x={0}
                y={b.yTop}
                width={W}
                height={Math.max(0, b.yBot - b.yTop)}
                fill={b.fill}
                opacity={0.45}
              />
            ))}

            {/* Goal line */}
            {goalInRange && (
              <>
                <line
                  x1={0} y1={toY(GOAL_SCORE)}
                  x2={W} y2={toY(GOAL_SCORE)}
                  stroke="#10b981" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.7}
                />
                <text x={4} y={toY(GOAL_SCORE) - 3} fontSize={9} fontWeight={700} fill="#047857">
                  {t("screens.health.goalLineLabel", { goal: GOAL_SCORE })}
                </text>
              </>
            )}

            {/* Area fill */}
            {areaPath && <path d={areaPath} fill="url(#vitanaFillGrad)" />}

            {/* History line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="url(#vitanaLineGrad)"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Projection (90d only) */}
            {projectionEnd && (
              <>
                <line
                  x1={toX(lastPt.day)} y1={toY(lastPt.score)}
                  x2={toX(projectionEnd.day)} y2={toY(projectionEnd.score)}
                  stroke="#a78bfa" strokeWidth={1.8} strokeDasharray="4 3" strokeLinecap="round"
                />
                <circle cx={toX(projectionEnd.day)} cy={toY(projectionEnd.score)} r={3.5} fill="white" stroke="#a78bfa" strokeWidth={2} />
              </>
            )}

            {/* Worst marker */}
            {showWorst && (
              <>
                <circle cx={toX(stats!.worst.day)} cy={toY(stats!.worst.score)} r={3.5} fill="#f59e0b" stroke="white" strokeWidth={2} />
              </>
            )}

            {/* Best marker */}
            {showBest && (
              <>
                <circle cx={toX(stats!.best.day)} cy={toY(stats!.best.score)} r={3.5} fill="#10b981" stroke="white" strokeWidth={2} />
              </>
            )}

            {/* Today marker — bigger w/ halo */}
            <circle cx={toX(todayPoint.day)} cy={toY(todayPoint.score)} r={8} fill="#6366f1" opacity={0.18} />
            <circle cx={toX(todayPoint.day)} cy={toY(todayPoint.score)} r={4.5} fill="#6366f1" stroke="white" strokeWidth={2.5} />
          </svg>

          {/* X axis labels */}
          <div className="ml-7 mt-1 flex justify-between text-[10px] font-semibold text-muted-foreground">
            {xAxisLabels.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        </div>

        {/* Insight + CTA */}
        <div className="rounded-xl bg-gradient-to-r from-emerald-50 via-blue-50 to-violet-50 dark:from-emerald-950/20 dark:via-blue-950/20 dark:to-violet-950/20 border border-emerald-200/40 px-3 py-2 flex items-center gap-2">
          <span className="text-base">✨</span>
          <p className="text-xs leading-snug text-emerald-800 dark:text-emerald-200 m-0">{insight}</p>
        </div>

        <button
          type="button"
          onClick={openDrawer}
          className="w-full flex items-center justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-1 py-1"
        >
          <span className="text-muted-foreground font-normal">
            {t("screens.health.lastNDays", { days: fetchDays })}
          </span>
          <span className="flex items-center gap-0.5">
            {t("screens.health.whatDrivesIndex")}
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </button>
      </CardContent>
    </Card>
  );
}
