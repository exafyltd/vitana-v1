import { useState } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, TrendingDown, Minus, Target, Info, Scale, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useVitanaIndex,
  pillarKeys,
  pillarLabel,
  type VitanaPillarKey,
  type VitanaPillarSubscores,
} from "@/hooks/useVitanaIndex";
import VitanaPillarAgentsPanel from "@/components/health/VitanaPillarAgentsPanel";
import VitanaLogDataDialog from "@/components/health/VitanaLogDataDialog";
import MissionAlignmentCard from "@/components/health/MissionAlignmentCard";
import { t } from '@/lib/i18n-toast';

const PILLAR_DESCRIPTION_KEYS: Record<VitanaPillarKey, string> = {
  nutrition: 'screens.health.vitanaIndexPillar_food',
  hydration: 'screens.health.vitanaIndexPillar_water',
  exercise:  'screens.health.vitanaIndexPillar_exercise',
  sleep:     'screens.health.vitanaIndexPillar_recovery',
  mental:    'screens.health.vitanaIndexPillar_mental',
};
const PILLAR_DESCRIPTIONS: Record<VitanaPillarKey, string> = {
  nutrition: t(PILLAR_DESCRIPTION_KEYS.nutrition),
  hydration: t(PILLAR_DESCRIPTION_KEYS.hydration),
  exercise:  t(PILLAR_DESCRIPTION_KEYS.exercise),
  sleep:     t(PILLAR_DESCRIPTION_KEYS.sleep),
  mental:    t(PILLAR_DESCRIPTION_KEYS.mental),
};

const SUBSCORE_MAX: VitanaPillarSubscores = {
  baseline: 40,
  completions: 80,
  data: 40,
  streak: 40,
};

function Sparkline({ history }: { history: Array<{ date: string; score: number }> }) {
  if (history.length === 0) {
    return <div className="text-xs text-muted-foreground">{t('screens.health.noHistoryYetCheckBackTomorrow')}</div>;
  }
  const max = Math.max(...history.map((h) => h.score), 1);
  const min = Math.min(...history.map((h) => h.score), 0);
  const range = Math.max(max - min, 1);
  const width = 280;
  const height = 48;
  const step = history.length > 1 ? width / (history.length - 1) : width;
  const points = history
    .map((h, i) => {
      const x = i * step;
      const y = height - ((h.score - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className="text-calendar-primary">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-5 h-5 text-calendar-success" />;
  if (trend === "down") return <TrendingDown className="w-5 h-5 text-destructive" />;
  return <Minus className="w-5 h-5 text-muted-foreground" />;
}

/**
 * A stacked pillar bar: baseline (slate) / completions (blue) / data (green) /
 * streak (amber). Each segment's width is proportional to the sub-score's
 * contribution toward the 200-per-pillar max.
 */
function PillarBar({ subscores }: { subscores: VitanaPillarSubscores | null }) {
  const s = subscores ?? { baseline: 0, completions: 0, data: 0, streak: 0 };
  const total = s.baseline + s.completions + s.data + s.streak;
  const pct = (n: number) => `${(n / 200) * 100}%`;
  return (
    <div className="relative w-full h-3 rounded-full bg-muted overflow-hidden" aria-label={`pillar ${total}/200`}>
      <div className="absolute inset-y-0 left-0 flex">
        <div style={{ width: pct(s.baseline) }}    className="bg-slate-600" title={`Baseline ${s.baseline}/${SUBSCORE_MAX.baseline}`} />
        <div style={{ width: pct(s.completions) }} className="bg-blue-500"  title={`Completions ${s.completions}/${SUBSCORE_MAX.completions}`} />
        <div style={{ width: pct(s.data) }}        className="bg-green-500" title={`Connected data ${s.data}/${SUBSCORE_MAX.data}`} />
        <div style={{ width: pct(s.streak) }}      className="bg-amber-500" title={`Streak ${s.streak}/${SUBSCORE_MAX.streak}`} />
      </div>
    </div>
  );
}

function StackLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-slate-600" /> {t('screens.health.baseline')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-blue-500" /> {t('screens.health.completions')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-green-500" /> {t('screens.health.connectedData')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-amber-500" /> {t('screens.health.streak')}
      </span>
    </div>
  );
}

function tierBadgeVariant(label: string): "default" | "secondary" | "destructive" {
  if (label === "Elite" || label === "Really good") return "default";
  if (label === "Strong" || label === "Building") return "secondary";
  return "destructive";
}

function balanceChipLabel(factor: number | null): string {
  if (factor === null) return "Balance: —";
  if (factor >= 1.00) return "Balance 1.0× — well balanced";
  if (factor >= 0.90) return "Balance 0.9× — slight lean";
  if (factor >= 0.80) return "Balance 0.8× — uneven";
  return "Balance 0.7× — very uneven";
}

function weakestPillarLabel(index: NonNullable<ReturnType<typeof useVitanaIndex>["index"]>): string {
  const entries = pillarKeys().map((k) => [k, index.pillars[k]] as const);
  const min = entries.reduce((m, e) => (e[1] < m[1] ? e : m), entries[0]);
  return pillarLabel(min[0]);
}

export default function VitanaIndexDetail() {
  const navigate = useNavigate();
  const { index, isLoading, isError, refetch } = useVitanaIndex();
  const [logDialogOpen, setLogDialogOpen] = useState(false);

  // 90-day framing — milestone and stretch goal, not pass/fail.
  const milestoneGoal = 600;
  const stretchGoal = 800;

  return (
    <AppLayout>
      <SEO
        title={t('screens.health.vitanaIndex')}
        description="Your single number for longevity across the five pillars: Nutrition, Hydration, Exercise, Sleep, Mental."
        canonical={window.location.href}
      />

      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">{t('screens.health.yourVitanaIndex')}</h1>
              <p className="text-muted-foreground">
                {t('screens.health.oneNumberFivePillarsNinetyDays')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setLogDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                {t('screens.health.logData')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>{t('screens.health.refresh')}</Button>
            </div>
          </div>
          <VitanaLogDataDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} />

          {/* Score card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('screens.health.currentScore')}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {index?.lastUpdated ? `Last updated ${index.lastUpdated}` : "Waiting for first compute"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-5xl font-bold text-foreground">
                    {isLoading ? "…" : (index?.total ?? "—")}
                  </span>
                  {index && <TrendIcon trend={index.trend} />}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {index && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={tierBadgeVariant(index.tier.label)}>{t(index.tier.labelKey)}</Badge>
                    <Badge variant="outline" className="gap-1">
                      <Scale className="w-3 h-3" />
                      {balanceChipLabel(index.balanceFactor)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{index.tier.description}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Sparkline history={index.history} />
                    <div className="text-xs text-muted-foreground">{t('screens.health.text7dayTrend')}</div>
                  </div>
                </>
              )}
              {!isLoading && !index && (
                <div className="text-sm text-muted-foreground">{t('screens.health.yourIndexHasnTComputedYet')}
                </div>
              )}
              {isError && (
                <div className="text-sm text-destructive">{t('screens.health.couldNotLoadYourIndexTry')}</div>
              )}
            </CardContent>
          </Card>

          {/* Goal card — two-tier framing */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-calendar-primary" />
                <CardTitle className="text-base">{t('screens.health.your90dayGoal')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{milestoneGoal}+</strong>{t('screens.health.text')} <em>{t('screens.health.reallyGood')}</em>{t('screens.health.zoneThrivingTierMostFocused90day')}
                <br />
                <strong>{stretchGoal}+</strong>{t('screens.health.eliteTerritorySustainedExcellenceAcrossAll')}
              </p>
              {index ? (
                index.total >= stretchGoal ? (
                  <div className="text-sm font-medium text-calendar-success">
                    {t('screens.health.youReEliteBandKeepBalance')}
                  </div>
                ) : index.total >= milestoneGoal ? (
                  <div className="text-sm">{t('screens.health.youReThrivingZoneStretchStretchgoal', { stretchGoal, value1: weakestPillarLabel(index) })}
                  </div>
                ) : (
                  <div className="text-sm">
                    {t('screens.health.youRe')} <strong>{milestoneGoal - index.total}</strong>{t('screens.health.pointsAwayFromThrivingZoneEvery', { value0: weakestPillarLabel(index) })}
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground">
                  {t('screens.health.seedYourIndexWithBaselineSurvey')}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('screens.health.weNeverForceYouTopDifferent')}
              </p>
            </CardContent>
          </Card>

          {/* Active agents — the 5 pillar agents' health + today's output */}
          <VitanaPillarAgentsPanel />

          {/* Mission Alignment — Phase 6 of Ultimate Goal hardening.
              Shows how the user's autopilot queue serves the 5 pillars +
              longevity economy axis. Contract: docs/GOVERNANCE/ULTIMATE-GOAL.md */}
          <MissionAlignmentCard />

          {/* Pillar breakdown — stacked segments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('screens.health.fivePillarsHowEachOneClimbs')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <StackLegend />
              {pillarKeys().map((key) => {
                const total = index?.pillars[key] ?? 0;
                const subscores = index?.subscores?.[key] ?? null;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{pillarLabel(key)}</span>
                      <span className="text-muted-foreground">{total}/200</span>
                    </div>
                    <PillarBar subscores={subscores} />
                    <p className="text-xs text-muted-foreground">{PILLAR_DESCRIPTIONS[key]}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* How the Index moves — explainer */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-calendar-primary" />
                <CardTitle className="text-base">{t('screens.health.howYourIndexMoves')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>
                {t('screens.health.eachFivePillarsMax200Each')} <strong>{t('screens.health.baseline')}</strong>{t('screens.health.fromYourOnboardingSurvey')} <strong>{t('screens.health.completions')}</strong>{t('screens.health.journeyActionsLast30Days')} <strong>{t('screens.health.connectedData')}</strong>{t('screens.health.fromWearablesLogs')} <strong>{t('screens.health.streakBonus')}</strong>{t('screens.health.forConsistencyWeSumFivePillars')}
                <strong> {t('screens.health.balanceFactor')}</strong>{t('screens.health.itDampensWhenOnePillarFar')}
              </p>
              <p>{t('screens.health.markAnyJourneyEventCompletePillar')}
              </p>
              <p className="pt-2">
                <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate('/autopilot')}>
                  {t('screens.health.seeYour90dayJourney')}
                </Button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
