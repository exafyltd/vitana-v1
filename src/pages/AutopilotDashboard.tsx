import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { communityFetch } from "@/lib/community-gateway";
import {
  Loader2,
  Compass,
  ChevronRight,
  Sparkles,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useState, useMemo } from "react";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { VitanaIndexTrajectoryCard } from "@/components/health/VitanaIndexTrajectoryCard";
import { useVitanaIndexCache } from "@/components/health/VitanaIndexProvider";
import { LIFE_COMPASS_OPEN_EVENT } from "@/context/LifeCompassPopupContext";
import { useLifeCompass } from "@/hooks/useLifeCompass";
import { PillarDeltaBadges } from "@/components/health/PillarDeltaBadges";
import { EMPTY_COPY } from "@/lib/celebrate";
import { HORIZON_BUCKETS, bucketFromWaveId, type HorizonBucket } from "@/lib/horizonBuckets";
import { JourneyDayBadge } from "@/components/health/JourneyDayBadge";
import { JourneyCheckpoints, dayNumberFromCreated } from "@/components/health/JourneyCheckpoints";
import { JourneyWaveMap } from "@/components/health/JourneyWaveMap";
import { trend7d } from "@/lib/vitana-projection";
import type { ContributionVector, VitanaPillarKey } from "@/types/autopilot";
import { t } from '@/lib/i18n-toast';

interface Recommendation {
  id: string;
  title: string;
  summary: string;
  status: string;
  source_ref: string;
  impact_score: number;
  wave_id?: string | number;
  wave_order?: number;
  contribution_vector?: ContributionVector;
  /** Gateway-derived bucket; falls back to wave_id when missing. */
  horizon?: HorizonBucket;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
}

const BUCKET_LABEL: Record<HorizonBucket, string> = {
  today: "Today",
  next3: "Next 3 days",
  thisWeek: "This week",
  month: "30 days",
  future: "Future",
};

const PILLAR_LABEL: Record<VitanaPillarKey, string> = {
  nutrition: "Nutrition",
  hydration: "Hydration",
  exercise: "Exercise",
  sleep: "Sleep",
  mental: "Mental",
};

const HORIZON_VALUES: HorizonBucket[] = ["today", "next3", "thisWeek", "month", "future"];

function bucketFromRec(rec: Recommendation): HorizonBucket {
  if (rec.horizon && HORIZON_VALUES.includes(rec.horizon)) return rec.horizon;
  if (rec.wave_id === undefined || rec.wave_id === null) return "future";
  return bucketFromWaveId(rec.wave_id);
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

// ── Hero cards ───────────────────────────────────────────────────────────

function NowCard() {
  const { index } = useVitanaIndexCache();
  const total = index?.total ?? null;
  const tier = index?.tier ?? null;
  const trend = index?.history ? trend7d(index.history) : null;

  const trendLabel = (() => {
    if (trend === null) return null;
    if (trend > 0) return { icon: TrendingUp, text: `+${trend} this week`, cls: "text-green-600" };
    if (trend < 0) return { icon: TrendingDown, text: `${trend} this week`, cls: "text-red-600" };
    return { icon: TrendingUp, text: "Steady this week", cls: "text-muted-foreground" };
  })();

  return (
    <Card className="rounded-2xl border ring-1 ring-border/60 shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-sm shrink-0">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{total === null ? "…" : total}</div>
            <div className="text-[10px] text-muted-foreground">{t('screens.autopilotdashboard.text999')}</div>
          </div>
        </div>
        <div className="space-y-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('screens.autopilotdashboard.yourIndex')}</p>
          {tier && <p className="text-base font-semibold">{t(tier.labelKey)}</p>}
          {trendLabel && (
            <p className={`text-xs flex items-center gap-1 ${trendLabel.cls}`}>
              <trendLabel.icon className="w-3 h-3" />
              {trendLabel.text}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Maps the canonical English primary_goal string saved by LifeCompassPopup
// (the SUGGESTED_GOALS canonicalTitle list) onto the corresponding i18n key
// in lifeCompass.goals.<category>.title. Custom user-typed goals fall through
// untranslated — there's nothing to look up.
const COMPASS_GOAL_KEYS: Record<string, string> = {
  "Build Financial Freedom": "lifeCompass.goals.wealth.title",
  "Find Life Partner": "lifeCompass.goals.relationship.title",
  "Transform Health": "lifeCompass.goals.health.title",
  "Advance Career": "lifeCompass.goals.career.title",
  "Master New Skills": "lifeCompass.goals.learning.title",
  "Spiritual Life": "lifeCompass.goals.spiritual.title",
  "Improve quality of life and extend lifespan": "lifeCompass.goals.longevity.title",
};

function localizePrimaryGoal(primaryGoal: string): string {
  const key = COMPASS_GOAL_KEYS[primaryGoal];
  if (!key) return primaryGoal;
  const translated = t(key);
  return translated || primaryGoal;
}

function CompassCard({ alignedCount }: { alignedCount: number }) {
  const { compass } = useLifeCompass();
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent(LIFE_COMPASS_OPEN_EVENT));
  };
  return (
    <Card
      className="rounded-2xl border ring-1 ring-border/60 shadow-sm cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-primary" />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('screens.autopilotdashboard.yourCompass')}</p>
        </div>
        {compass?.primary_goal ? (
          <>
            <p className="text-base font-semibold leading-snug line-clamp-2">{t('screens.autopilotdashboard.headingTowardPrimary_goal', { primary_goal: localizePrimaryGoal(compass.primary_goal) })}</p>
            <p className="text-xs text-muted-foreground">
              {alignedCount > 0
                ? t(alignedCount === 1 ? 'empty.actionsPendingOne' : 'empty.actionsPendingOther', { count: alignedCount })
                : t('empty.noActionsMatchedYet')}
            </p>
          </>
        ) : (
          <>
            <p className="text-base font-semibold leading-snug">{t('screens.autopilotdashboard.setYourLifeCompass')}</p>
            <p className="text-xs text-muted-foreground">
              {t('screens.autopilotdashboard.pickDirectionSoSuggestionsStayAligned')}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Personal Path stop-cards (demoted secondary nav) ─────────────────────

function PathStopCard({
  bucket,
  recommendations,
  onOpen,
}: {
  bucket: HorizonBucket;
  recommendations: Recommendation[];
  onOpen: () => void;
}) {
  const { vector, total } = sumVectors(recommendations);
  const dom = dominantPillar(vector);
  const tintClass = dom ? `before:bg-pill-${dom}-accent` : "before:bg-muted-foreground";
  const labelTintClass = dom
    ? `bg-pill-${dom}-tint text-pill-${dom}-accent border-transparent`
    : "bg-muted text-muted-foreground";
  const isEmpty = recommendations.length === 0;

  return (
    <Card
      className={`min-w-[12rem] snap-start rounded-2xl border ring-1 ring-border/60 shadow-sm bg-card relative overflow-hidden ${
        isEmpty ? "opacity-60" : ""
      } before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:rounded-full ${tintClass}`}
    >
      <CardContent className="p-3 pl-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{BUCKET_LABEL[bucket]}</span>
          {dom && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${labelTintClass}`}>
              {PILLAR_LABEL[dom]}
            </Badge>
          )}
        </div>
        <div className="text-xl font-bold">
          {recommendations.length}
          <span className="text-xs font-normal text-muted-foreground ml-1">{t('screens.autopilotdashboard.actionValue0', { value0: recommendations.length === 1 ? "" : "s" })}</span>
        </div>
        {total > 0 ? (
          <PillarDeltaBadges vector={vector} compact />
        ) : (
          <p className="text-[10px] text-muted-foreground">{EMPTY_COPY.myJourneyOnePillar}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-7"
          disabled={isEmpty}
          onClick={onOpen}
        >
          {t('screens.autopilotdashboard.open')}
        </Button>
      </CardContent>
    </Card>
  );
}

function PersonalPath({
  bucketed,
  onOpenAutopilot,
}: {
  bucketed: Record<HorizonBucket, Recommendation[]>;
  onOpenAutopilot: () => void;
}) {
  return (
    <div className="space-y-2 mb-6">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('screens.autopilotdashboard.byHorizon')}</p>
      <div className="overflow-x-auto flex gap-2 snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {HORIZON_BUCKETS.map((bucket) => (
          <PathStopCard
            key={bucket}
            bucket={bucket}
            recommendations={bucketed[bucket]}
            onOpen={onOpenAutopilot}
          />
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function AutopilotDashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { pendingCount } = useAutopilot();
  const { compass } = useLifeCompass();
  const [autopilotOpen, setAutopilotOpen] = useState(false);

  const dayNumber = dayNumberFromCreated(user?.created_at);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["autopilot-onboarding"],
    queryFn: async () => {
      const res = await communityFetch(
        "/api/v1/autopilot/recommendations?status=new,activated,completed&limit=100",
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<RecommendationsResponse>;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });

  const recommendations = data?.recommendations ?? [];

  const bucketed = useMemo<Record<HorizonBucket, Recommendation[]>>(() => {
    const empty: Record<HorizonBucket, Recommendation[]> = {
      today: [],
      next3: [],
      thisWeek: [],
      month: [],
      future: [],
    };
    for (const rec of recommendations) {
      if (rec.status === "completed") continue;
      empty[bucketFromRec(rec)].push(rec);
    }
    return empty;
  }, [recommendations]);

  const openCount = recommendations.filter((r) => r.status !== "completed").length;
  const allEmpty = openCount === 0;

  // Best-effort "actions aligned with your compass" count: until the gateway
  // surfaces compass alignment per rec, we mirror the open-action count when
  // a goal is set, otherwise zero. Keeps the UI honest without inventing data.
  const compassAlignedCount = compass?.primary_goal ? openCount : 0;

  const handleOpenAutopilot = () => setAutopilotOpen(true);

  // ── Mobile layout ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <AppLayout>
        <SEO title={t('screens.autopilotdashboard.myJourney')} description="Your personalized autopilot journey" canonical={window.location.href} />

        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50 pb-32">
          <div className="px-4 pt-2">
            <StandardHeader title={t('screens.autopilotdashboard.myJourney')} description="The path your Index walks" emoji="🚀" />
          </div>

          <div className="px-4">
            <UtilityActionButton
              compact
              className="min-w-0"
              afterGiftVoucherChildren={
                <>
                  <VitanaIndexChip />
                  <AutopilotChip pendingCount={pendingCount} onClick={handleOpenAutopilot} />
                </>
              }
            >
              <div className="flex items-center gap-2 min-w-max">
                <ExpandableSearchButton placeholder={t('screens.autopilotdashboard.searchTasks')} />
                <UniversalCalendarButton />
              </div>
            </UtilityActionButton>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <JourneyDayBadge />

                <div className="grid grid-cols-1 gap-3 mb-4">
                  <NowCard />
                  <CompassCard alignedCount={compassAlignedCount} />
                  <VitanaIndexTrajectoryCard />
                </div>

                <JourneyCheckpoints
                  recommendations={recommendations}
                  dayNumber={dayNumber}
                  onOpenAutopilot={handleOpenAutopilot}
                  onActivated={() => refetch()}
                />

                {allEmpty ? (
                  <Card className="rounded-2xl border ring-1 ring-border/60 p-6 text-center mb-6">
                    <div className="text-4xl mb-2">🧬</div>
                    <p className="text-sm">{EMPTY_COPY.myJourneyPath}</p>
                  </Card>
                ) : (
                  <PersonalPath bucketed={bucketed} onOpenAutopilot={handleOpenAutopilot} />
                )}

                <JourneyWaveMap dayNumber={dayNumber} />

                <div className="text-center text-sm text-muted-foreground pb-4">
                  <Sparkles className="w-4 h-4 inline-block mr-1 align-text-top" />
                  {t('screens.autopilotdashboard.newStopsAppearAsAutopilotLearns')}
                </div>
              </>
            )}
          </div>
        </div>

        <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
      </AppLayout>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────
  return (
    <AppLayout>
      <SEO title={t('screens.autopilotdashboard.myJourney')} description="Your personalized autopilot journey" canonical={window.location.href} />
      <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="max-w-7xl mx-auto">
          <StandardHeader title={t('screens.autopilotdashboard.myJourney')} description="The path your Index walks" emoji="🚀" />

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <JourneyDayBadge />

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <NowCard />
                <CompassCard alignedCount={compassAlignedCount} />
                <VitanaIndexTrajectoryCard />
              </div>

              <JourneyCheckpoints
                recommendations={recommendations}
                dayNumber={dayNumber}
                onOpenAutopilot={handleOpenAutopilot}
                onActivated={() => refetch()}
              />

              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('screens.autopilotdashboard.allYourWork')}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenAutopilot}
                  className="text-sm"
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  {t('screens.autopilotdashboard.openAutopilot')}
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </Button>
              </div>

              {allEmpty ? (
                <Card className="rounded-2xl border ring-1 ring-border/60 p-8 text-center mb-6">
                  <div className="text-5xl mb-3">🧬</div>
                  <p className="text-base">{EMPTY_COPY.myJourneyPath}</p>
                </Card>
              ) : (
                <PersonalPath bucketed={bucketed} onOpenAutopilot={handleOpenAutopilot} />
              )}

              <JourneyWaveMap dayNumber={dayNumber} />

              <div className="text-center text-sm text-muted-foreground pb-8">
                <Sparkles className="w-4 h-4 inline-block mr-1 align-text-top" />
                {t('screens.autopilotdashboard.newStopsAppearAsAutopilotLearns')}
              </div>
            </>
          )}
        </div>
      </div>

      <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
    </AppLayout>
  );
}
