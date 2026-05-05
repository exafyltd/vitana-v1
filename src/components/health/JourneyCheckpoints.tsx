import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { communityFetch } from "@/lib/community-gateway";
import { useVitanaIndexCache } from "./VitanaIndexProvider";
import {
  pillarLabel,
  weakestPillar as findWeakestPillar,
  type VitanaPillarKey,
} from "@/hooks/useVitanaIndex";
import { PillarDeltaBadges } from "./PillarDeltaBadges";
import { projectDays, trend7d } from "@/lib/vitana-projection";
import { nextTier, pointsToNextTier } from "@/lib/vitanaIndex";
import { bucketFromWaveId } from "@/lib/horizonBuckets";
import type { ContributionVector } from "@/types/autopilot";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

const PILLAR_EMOJI: Record<VitanaPillarKey, string> = {
  nutrition: "🥗",
  hydration: "💧",
  exercise: "💪",
  sleep: "😴",
  mental: "🧠",
};

const JOURNEY_TOTAL_DAYS = 90;

interface Recommendation {
  id: string;
  title: string;
  summary: string;
  status: string;
  source_ref?: string;
  impact_score?: number;
  wave_id?: string | number;
  wave_order?: number;
  contribution_vector?: ContributionVector;
  horizon?: "today" | "next3" | "thisWeek" | "month" | "future";
}

interface JourneyCheckpointsProps {
  recommendations: Recommendation[];
  dayNumber: number;
  onOpenAutopilot: () => void;
  onActivated?: () => void;
}

function dayNumberFromCreated(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const ms = Date.now() - new Date(createdAt).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.floor(ms / 86400000));
}

function dominantPillar(vector?: ContributionVector | null): VitanaPillarKey | null {
  if (!vector) return null;
  let best: VitanaPillarKey | null = null;
  let bestVal = 0;
  for (const [k, v] of Object.entries(vector) as Array<[VitanaPillarKey, number | undefined]>) {
    if (typeof v === "number" && v > bestVal) {
      best = k;
      bestVal = v;
    }
  }
  return best;
}

function sumVectorTotal(vector?: ContributionVector | null): number {
  if (!vector) return 0;
  return Object.values(vector).reduce<number>(
    (acc, v) => acc + (typeof v === "number" && v > 0 ? v : 0),
    0,
  );
}

function sumVectors(recs: Recommendation[]): { vector: ContributionVector; total: number } {
  const vector: ContributionVector = {};
  let total = 0;
  for (const rec of recs) {
    if (!rec.contribution_vector) continue;
    for (const [k, v] of Object.entries(rec.contribution_vector) as Array<[VitanaPillarKey, number | undefined]>) {
      if (typeof v === "number" && v > 0) {
        vector[k] = (vector[k] ?? 0) + v;
        total += v;
      }
    }
  }
  return { vector, total };
}

function pillarTintBefore(pillar: VitanaPillarKey | null): string {
  return pillar ? `before:bg-pill-${pillar}-accent` : "before:bg-muted-foreground";
}

function CheckpointCard({
  pillar,
  children,
}: {
  pillar: VitanaPillarKey | null;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={`relative overflow-hidden rounded-2xl border ring-1 ring-border/60 shadow-sm bg-card before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1 before:rounded-full ${pillarTintBefore(pillar)}`}
    >
      <CardContent className="p-4 pl-5 space-y-3">{children}</CardContent>
    </Card>
  );
}

export function JourneyCheckpoints({
  recommendations,
  dayNumber,
  onOpenAutopilot,
  onActivated,
}: JourneyCheckpointsProps) {
  const { index } = useVitanaIndexCache();
  const total = index?.total ?? null;
  const pillars = index?.pillars ?? null;
  const trend = index?.history ? trend7d(index.history) : null;
  const weakest = pillars ? findWeakestPillar(pillars) : null;

  const open = recommendations.filter((r) => r.status !== "completed");

  // ── Today's next step ────────────────────────────────────────────────
  // Highest-impact pending rec whose contribution_vector lifts the weakest
  // pillar, falling back to the highest-impact rec with any vector, then
  // any first pending rec.
  const todayPick = useMemo<Recommendation | null>(() => {
    if (open.length === 0) return null;
    const sorted = [...open].sort((a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0));
    if (weakest) {
      const focused = sorted.find((r) => {
        const v = r.contribution_vector?.[weakest];
        return typeof v === "number" && v > 0;
      });
      if (focused) return focused;
    }
    const withVector = sorted.find((r) => sumVectorTotal(r.contribution_vector) > 0);
    return withVector ?? sorted[0] ?? null;
  }, [open, weakest]);

  // ── This week (top 3 actions in today/next3/thisWeek horizons) ───────
  const weekPicks = useMemo<Recommendation[]>(() => {
    const inWeek = open.filter((r) => {
      if (r.horizon === "today" || r.horizon === "next3" || r.horizon === "thisWeek") return true;
      // Fallback when the gateway hasn't deployed the horizon field yet —
      // reuse the same wave-to-horizon logic the rest of the dashboard uses
      // so legacy numeric / plain-string wave_id formats (1, "1") still
      // count as "this week" and don't undercount the checkpoint.
      if (!r.horizon && r.wave_id !== undefined && r.wave_id !== null) {
        const bucket = bucketFromWaveId(r.wave_id);
        return bucket === "today" || bucket === "next3" || bucket === "thisWeek";
      }
      return false;
    });
    return [...inWeek]
      .sort((a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0))
      .slice(0, 3);
  }, [open]);

  const weekVector = sumVectors(weekPicks);
  const weekDominant = dominantPillar(weekVector.vector);
  const projected7d =
    total !== null ? projectDays(total, trend, 7, dayNumber) : null;

  // ── 30-day horizon copy ──────────────────────────────────────────────
  const projected30d =
    total !== null ? projectDays(total, trend, 30, dayNumber) : null;
  const next = total !== null ? nextTier(total) : null;
  const gap = total !== null ? pointsToNextTier(total) : null;
  const projDelta =
    projected30d !== null && total !== null ? projected30d - total : null;

  let tierGuidance = "";
  if (next === null) {
    tierGuidance = "Sustaining Elite. Keep all five pillars steady.";
  } else if (gap !== null && projDelta !== null && gap <= projDelta) {
    tierGuidance = weakest
      ? `On track to reach ${next.label} (${next.min}+) — keep lifting ${pillarLabel(weakest)}.`
      : `On track to reach ${next.label} (${next.min}+).`;
  } else if (weakest && pillars) {
    tierGuidance = `Reach ${next.label} (${next.min}+) by lifting ${pillarLabel(weakest)} most — currently ${pillars[weakest]}/200.`;
  } else {
    tierGuidance = `Reach ${next.label} (${next.min}+) by keeping a steady pace.`;
  }

  // ── Today's "Start" button ───────────────────────────────────────────
  const [startingId, setStartingId] = useState<string | null>(null);
  const { user } = useAuth();
  const handleStart = async () => {
    if (!todayPick || !user) return;
    setStartingId(todayPick.id);
    try {
      const res = await communityFetch(
        `/api/v1/autopilot/recommendations/${todayPick.id}/activate?role=community`,
        { method: "POST" },
      );
      if (!res.ok) {
        notifyError('toasts.health.couldnTStartThatYetOpen');
        onOpenAutopilot();
        return;
      }
      const json = await res.json();
      if (json?.ok) {
        notifySuccess('toasts.health.activatedFindItAutopilotWhenYou');
        onActivated?.();
        onOpenAutopilot();
      } else {
        onOpenAutopilot();
      }
    } catch {
      notifyError('toasts.health.networkHiccupOpenAutopilotTryAgain');
      onOpenAutopilot();
    } finally {
      setStartingId(null);
    }
  };

  const todayPillar = dominantPillar(todayPick?.contribution_vector);
  const day7 = Math.min(JOURNEY_TOTAL_DAYS, dayNumber + 7);
  const day30 = Math.min(JOURNEY_TOTAL_DAYS, dayNumber + 30);

  return (
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      {/* Today */}
      <CheckpointCard pillar={todayPillar}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('screens.health.today')}
          </span>
          <span className="text-xs text-muted-foreground">{t('screens.health.nextStep')}</span>
        </div>
        {todayPick ? (
          <>
            <div className="flex items-start gap-2">
              <span className="text-2xl shrink-0" aria-hidden="true">
                {todayPillar ? PILLAR_EMOJI[todayPillar] : "✨"}
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight">{todayPick.title}</div>
                {todayPick.summary && (
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {todayPick.summary}
                  </div>
                )}
              </div>
            </div>
            {todayPick.contribution_vector && (
              <PillarDeltaBadges vector={todayPick.contribution_vector} compact />
            )}
            <Button
              onClick={handleStart}
              disabled={startingId === todayPick.id}
              size="sm"
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
            >
              {startingId === todayPick.id ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-1.5" />
              )}{t('screens.health.start')}
            </Button>
          </>
        ) : (
          <div className="py-2 text-sm text-muted-foreground">
            {t('screens.health.nothingWaitingYouTodayYourIndex')}
          </div>
        )}
      </CheckpointCard>

      {/* By Day {N+7} */}
      <CheckpointCard pillar={weekDominant}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('screens.health.thisWeek')}
          </span>
          <span className="text-xs text-muted-foreground">{t('screens.health.dayDay7', { day7 })}</span>
        </div>
        {weekPicks.length === 0 ? (
          <div className="py-2 text-sm text-muted-foreground">{t('screens.health.noSuggestionsLandThisWeekYet')}
          </div>
        ) : (
          <>
            <p className="text-sm leading-snug">{t('screens.health.completeLengthActionValue1AutopilotSuggests', { length: weekPicks.length, value1: weekPicks.length === 1 ? "" : "s" })}
              {weekVector.total > 0 ? (
                <>
                  {" "}→ <strong className="text-green-600">+{weekVector.total}</strong>
                </>
              ) : null}
              .
              {projected7d !== null && total !== null && (
                <>{t('screens.health.value0YouDLandAround', { value0: " " })} <strong>{projected7d}</strong>.
                </>
              )}
            </p>
            <ul className="space-y-1 text-xs">
              {weekPicks.map((r) => {
                const p = dominantPillar(r.contribution_vector);
                return (
                  <li key={r.id} className="flex items-start gap-1.5">
                    <span aria-hidden="true">{p ? PILLAR_EMOJI[p] : "•"}</span>
                    <span className="truncate">{r.title}</span>
                  </li>
                );
              })}
            </ul>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={onOpenAutopilot}
            >
              {t('screens.health.openAutopilot')}
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </>
        )}
      </CheckpointCard>

      {/* By Day {N+30} */}
      <CheckpointCard pillar={weakest}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            {t('screens.health.text30dayHorizon')}
          </span>
          <span className="text-xs text-muted-foreground">{t('screens.health.dayDay30', { day30 })}</span>
        </div>
        {projected30d !== null && total !== null ? (
          <p className="text-sm leading-snug">{t('screens.health.atYourCurrentPace')} <strong>{projected30d}</strong>. {tierGuidance}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('screens.health.needFewMoreDaysDataProject')}
          </p>
        )}
        {weakest && pillars && (
          <Badge
            variant="outline"
            className={`text-[10px] bg-pill-${weakest}-tint text-pill-${weakest}-accent border-transparent`}
          >
            {PILLAR_EMOJI[weakest]} {pillarLabel(weakest)} · {pillars[weakest]}/200
          </Badge>
        )}
      </CheckpointCard>
    </div>
  );
}

// Re-exported so callers don't need to duplicate the day-number derivation.
export { dayNumberFromCreated };

export default JourneyCheckpoints;
