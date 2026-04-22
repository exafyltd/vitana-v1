import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingUp, TrendingDown, Minus, Target, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVitanaIndex, pillarKeys, pillarLabel, type VitanaPillarKey } from "@/hooks/useVitanaIndex";

const PILLAR_DESCRIPTIONS: Record<VitanaPillarKey, string> = {
  physical: "Movement, heart rate, sleep and recovery signals",
  mental: "Stress, mindfulness, cognitive load and mood",
  nutritional: "Glucose, hydration, macro balance and meal timing",
  social: "Relationships, community engagement and connection quality",
  environmental: "Living-space, time outdoors and exposure signals",
  prosperity: "Business progress, marketplace activity and reward accumulation",
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

function tierBadgeVariant(label: string): "default" | "secondary" | "destructive" {
  if (label === "Excellent" || label === "Good") return "default";
  if (label === "Improving" || label === "Fair") return "secondary";
  return "destructive";
}

export default function VitanaIndexDetail() {
  const navigate = useNavigate();
  const { index, isLoading, isError, refetch } = useVitanaIndex();

  const goalTarget = 600;
  const goalTargetTier = "Good";
  const goalGap = index ? Math.max(0, goalTarget - index.total) : goalTarget;

  return (
    <AppLayout>
      <SEO title="Vitana Index" description="Your single number for longevity and well-being across 6 pillars." canonical={window.location.href} />

      <div className="p-6 bg-gradient-to-br from-calendar-background via-background to-calendar-background/50 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Your Vitana Index</h1>
              <p className="text-muted-foreground">One number. Six pillars. Ninety days to lift it.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Current Score</CardTitle>
                    <p className="text-sm text-muted-foreground">{index?.lastUpdated ? `Last updated ${index.lastUpdated}` : "Waiting for first compute"}</p>
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
                  <div className="flex items-center gap-2">
                    <Badge variant={tierBadgeVariant(index.tier.label)}>{index.tier.label}</Badge>
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

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-calendar-primary" />
                <CardTitle className="text-base">Your 90-day goal</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Maxina's default longevity goal: reach tier <strong>{goalTargetTier} ({goalTarget}+)</strong> by day 90 of your journey.
              </p>
              {index ? (
                goalGap === 0 ? (
                  <div className="text-sm font-medium text-calendar-success">
                    You've reached your goal — keep the streak going.
                  </div>
                ) : (
                  <div className="text-sm">
                    You're <strong>{goalGap}</strong> points away. Each completed Autopilot action lifts your Index by a few points in the pillar it targets.
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground">Seed your Index with the baseline survey to start tracking progress.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Six pillars</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pillarKeys().map((key) => {
                const value = index?.pillars[key] ?? 0;
                const pct = Math.round((value / 200) * 100);
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{pillarLabel(key)}</span>
                      <span className="text-muted-foreground">{value}/200</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground">{PILLAR_DESCRIPTIONS[key]}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-calendar-primary" />
                <CardTitle className="text-base">How your Index moves</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>Your Vitana Index is a single 0–999 number that summarises how you're tracking across six life pillars. The higher the number, the more your daily behaviour is compounding toward a longer, healthier life.</p>
              <p>Each completed Autopilot action lifts the pillar it targets. Each calendar event you mark done sends a small signal into tomorrow's recompute. Skipping doesn't punish you — it just slows the lift.</p>
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
