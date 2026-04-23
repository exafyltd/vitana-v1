import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, TrendingDown, Minus, Target, Info, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useVitanaIndex,
  pillarKeys,
  pillarLabel,
  type VitanaPillarKey,
  type VitanaPillarSubscores,
} from "@/hooks/useVitanaIndex";
import VitanaPillarAgentsPanel from "@/components/health/VitanaPillarAgentsPanel";

const PILLAR_DESCRIPTIONS: Record<VitanaPillarKey, string> = {
  nutrition: "What and how you eat — meals, macro balance, biomarkers",
  hydration: "Water and fluids through the day, adjusted for activity and climate",
  exercise:  "Movement, workouts, heart-rate zones, recovery",
  sleep:     "Duration, regularity, stages, HRV — where the body rebuilds",
  mental:    "Stress, mood, mindfulness, cognitive load",
};

const SUBSCORE_MAX: VitanaPillarSubscores = {
  baseline: 40,
  completions: 80,
  data: 40,
  streak: 40,
};

function Sparkline({ history }: { history: Array<{ date: string; score: number }> }) {
  if (history.length === 0) {
    return <div className="text-xs text-muted-foreground">No history yet — check back tomorrow.</div>;
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
        <span className="w-3 h-3 rounded-sm bg-slate-600" /> Baseline
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-blue-500" /> Completions
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-green-500" /> Connected data
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-amber-500" /> Streak
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

  // 90-day framing — milestone and stretch goal, not pass/fail.
  const milestoneGoal = 600;
  const stretchGoal = 800;

  return (
    <AppLayout>
      <SEO
        title="Vitana Index"
        description="Your single number for longevity across the five pillars: Nutrition, Hydration, Exercise, Sleep, Mental."
        canonical={window.location.href}
      />

      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Your Vitana Index</h1>
              <p className="text-muted-foreground">
                One number. Five pillars. Ninety days to lift it — balanced, honest, aspirational.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
          </div>

          {/* Score card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Current Score</CardTitle>
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
                    <Badge variant={tierBadgeVariant(index.tier.label)}>{index.tier.label}</Badge>
                    <Badge variant="outline" className="gap-1">
                      <Scale className="w-3 h-3" />
                      {balanceChipLabel(index.balanceFactor)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{index.tier.description}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Sparkline history={index.history} />
                    <div className="text-xs text-muted-foreground">7-day trend</div>
                  </div>
                </>
              )}
              {!isLoading && !index && (
                <div className="text-sm text-muted-foreground">
                  Your Index hasn't been computed yet. Complete the baseline survey from the Health screen to seed your Day-0 score.
                </div>
              )}
              {isError && (
                <div className="text-sm text-destructive">Could not load your Index. Try refresh.</div>
              )}
            </CardContent>
          </Card>

          {/* Goal card — two-tier framing */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-calendar-primary" />
                <CardTitle className="text-base">Your 90-day goal</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>{milestoneGoal}+</strong> is the <em>really good</em> zone — the "thriving" tier most focused 90-day pushes reach.
                <br />
                <strong>{stretchGoal}+</strong> is elite territory — sustained excellence across all five pillars over months, not days.
              </p>
              {index ? (
                index.total >= stretchGoal ? (
                  <div className="text-sm font-medium text-calendar-success">
                    You're in the elite band — keep the balance, keep the streaks.
                  </div>
                ) : index.total >= milestoneGoal ? (
                  <div className="text-sm">
                    You're in the thriving zone. Stretch to {stretchGoal} takes consistent multi-month practice, especially on your weakest pillar ({weakestPillarLabel(index)}).
                  </div>
                ) : (
                  <div className="text-sm">
                    You're <strong>{milestoneGoal - index.total}</strong> points away from the thriving zone. Every completion on the {weakestPillarLabel(index)} pillar moves you forward the fastest.
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground">
                  Seed your Index with the baseline survey to start tracking the climb.
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                We never force you to the top. Different lives have different capacities — the number is a compass, not a verdict.
              </p>
            </CardContent>
          </Card>

          {/* Active agents — the 5 pillar agents' health + today's output */}
          <VitanaPillarAgentsPanel />

          {/* Pillar breakdown — stacked segments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Five pillars — how each one climbs</CardTitle>
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
                <CardTitle className="text-base">How your Index moves</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>
                Each of the five pillars (max 200 each) is the sum of four sub-scores:
                a small <strong>baseline</strong> from your onboarding survey, <strong>completions</strong>
                of journey actions in the last 30 days, <strong>connected data</strong> from wearables and logs,
                and a <strong>streak bonus</strong> for consistency. We sum the five pillars, apply a
                <strong> balance factor</strong> (it dampens when one pillar is far ahead of another),
                and cap at 999.
              </p>
              <p>
                Mark any journey event complete → the pillar it targets goes up. Keep it going day after day →
                the streak bonus kicks in. Connect a wearable → the connected-data bar fills.
                Balance across all five → the balance factor stays at 1.0× and every point counts fully.
              </p>
              <p className="pt-2">
                <Button variant="link" className="p-0 h-auto text-sm" onClick={() => navigate('/autopilot')}>
                  See your 90-day journey →
                </Button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
