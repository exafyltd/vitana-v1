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
import { PillarDeltaBadges } from "@/components/health/PillarDeltaBadges";
import { EMPTY_COPY } from "@/lib/celebrate";
import { HORIZON_BUCKETS, type HorizonBucket } from "@/lib/horizonBuckets";
import type { ContributionVector, VitanaPillarKey } from "@/types/autopilot";

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

function bucketFromWaveId(waveId: number | string | undefined): HorizonBucket {
  if (waveId === undefined || waveId === null) return "future";
  const n = typeof waveId === "number" ? waveId : parseInt(String(waveId), 10);
  if (!Number.isFinite(n)) return "future";
  if (n <= 0) return "today";
  if (n === 1) return "next3";
  if (n === 2) return "thisWeek";
  if (n === 3) return "month";
  return "future";
}

function dominantPillar(vector?: ContributionVector | null): VitanaPillarKey | null {
  if (!vector) return null;
  let bestKey: VitanaPillarKey | null = null;
  let bestVal = 0;
  for (const [k, v] of Object.entries(vector) as Array<[VitanaPillarKey, number | undefined]>) {
    if (typeof v === "number" && v > bestVal) {
      bestKey = k;
      bestVal = v;
    }
  }
  return bestKey;
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

interface PathStopCardProps {
  bucket: HorizonBucket;
  recommendations: Recommendation[];
  onOpen: () => void;
}

function PathStopCard({ bucket, recommendations, onOpen }: PathStopCardProps) {
  const { vector, total } = sumVectors(recommendations);
  const dom = dominantPillar(vector);
  const tintClass = dom ? `before:bg-pill-${dom}-accent` : "before:bg-muted-foreground";
  const labelTintClass = dom
    ? `bg-pill-${dom}-tint text-pill-${dom}-accent border-transparent`
    : "bg-muted text-muted-foreground";
  const isEmpty = recommendations.length === 0;

  return (
    <Card
      className={`min-w-[14rem] snap-start rounded-2xl border ring-1 ring-border/60 shadow-sm bg-card relative overflow-hidden ${
        isEmpty ? "opacity-60" : ""
      } before:absolute before:left-0 before:top-4 before:bottom-4 before:w-1 before:rounded-full ${tintClass}`}
    >
      <CardContent className="p-4 pl-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{BUCKET_LABEL[bucket]}</span>
          {dom && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${labelTintClass}`}>
              {PILLAR_LABEL[dom]}
            </Badge>
          )}
        </div>
        <div className="text-2xl font-bold">
          {recommendations.length}
          <span className="text-xs font-normal text-muted-foreground ml-1">
            action{recommendations.length === 1 ? "" : "s"}
          </span>
        </div>
        {total > 0 ? (
          <PillarDeltaBadges vector={vector} compact />
        ) : (
          <p className="text-xs text-muted-foreground">{EMPTY_COPY.myJourneyOnePillar}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={isEmpty}
          onClick={onOpen}
        >
          Open
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
    <div className="overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      {HORIZON_BUCKETS.map((bucket) => (
        <PathStopCard
          key={bucket}
          bucket={bucket}
          recommendations={bucketed[bucket]}
          onOpen={onOpenAutopilot}
        />
      ))}
    </div>
  );
}

function CompassLine() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent(LIFE_COMPASS_OPEN_EVENT));
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline inline-flex items-center gap-1.5"
    >
      <Compass className="w-3.5 h-3.5" />
      Set or review your Life Compass
    </button>
  );
}

function HeroBand() {
  const { index } = useVitanaIndexCache();
  const total = index?.total ?? null;
  const tier = index?.tier ?? null;

  return (
    <div className="grid md:grid-cols-2 gap-4 mb-4">
      <Card className="rounded-2xl border ring-1 ring-border/60 shadow-sm">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-sm shrink-0">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {total === null ? "…" : total}
              </div>
              <div className="text-[10px] text-muted-foreground">of 999</div>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your Index</p>
            {tier && (
              <p className="text-base font-semibold">{tier.label}</p>
            )}
            {tier && (
              <p className="text-xs text-muted-foreground">{tier.framing ?? tier.description}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl">
        <VitanaIndexTrajectoryCard />
      </div>
    </div>
  );
}

export default function AutopilotDashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { pendingCount } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);

  const { data, isLoading } = useQuery({
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
      // Only show open work on the path; completed actions vanish to keep the
      // path forward-looking.
      if (rec.status === "completed") continue;
      empty[bucketFromWaveId(rec.wave_id)].push(rec);
    }
    return empty;
  }, [recommendations]);

  const allEmpty =
    recommendations.filter((r) => r.status !== "completed").length === 0;

  const handleOpenAutopilot = () => setAutopilotOpen(true);

  // ── Mobile layout ──────────────────────────────────────────
  if (isMobile) {
    return (
      <AppLayout>
        <SEO title="My Journey" description="Your personalized autopilot journey" canonical={window.location.href} />

        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50 pb-32">
          <div className="px-4 pt-2">
            <StandardHeader title="My Journey" description="The path your Index walks" emoji="🚀" />
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
                <ExpandableSearchButton placeholder="Search tasks..." />
                <UniversalCalendarButton />
              </div>
            </UtilityActionButton>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pt-2">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <HeroBand />
                <div className="mb-4">
                  <CompassLine />
                </div>

                {allEmpty ? (
                  <Card className="rounded-2xl border ring-1 ring-border/60 p-8 text-center">
                    <div className="text-4xl mb-3">🧬</div>
                    <p className="text-sm">{EMPTY_COPY.myJourneyPath}</p>
                  </Card>
                ) : (
                  <PersonalPath bucketed={bucketed} onOpenAutopilot={handleOpenAutopilot} />
                )}

                <div className="mt-6 text-center text-sm text-muted-foreground pb-4">
                  <Sparkles className="w-4 h-4 inline-block mr-1 align-text-top" />
                  New stops appear as Autopilot learns more about you.
                </div>
              </>
            )}
          </div>
        </div>

        <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
      </AppLayout>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────
  return (
    <AppLayout>
      <SEO title="My Journey" description="Your personalized autopilot journey" canonical={window.location.href} />
      <div className="p-6 min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="max-w-7xl mx-auto">
          <StandardHeader title="My Journey" description="The path your Index walks" emoji="🚀" />

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <HeroBand />

              <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
                <CompassLine />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenAutopilot}
                  className="text-sm"
                >
                  <Zap className="w-4 h-4 mr-1.5" />
                  Open Autopilot
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

              <div className="mt-8 text-center text-sm text-muted-foreground pb-8">
                <Sparkles className="w-4 h-4 inline-block mr-1 align-text-top" />
                New stops appear as Autopilot learns more about you.
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
