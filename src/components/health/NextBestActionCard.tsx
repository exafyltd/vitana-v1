import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, AlertCircle, Zap, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVitanaIndex, pillarLabel, weakestPillar, type VitanaPillarKey } from "@/hooks/useVitanaIndex";
import { useAutopilot } from "@/hooks/use-autopilot";
import { PillarDeltaBadges } from "@/components/health/PillarDeltaBadges";
import type { AutopilotAction } from "@/types/autopilot";
import { t } from '@/lib/i18n-toast';

const PILLAR_EMOJI: Record<VitanaPillarKey, string> = {
  nutrition: "🥗",
  hydration: "💧",
  exercise:  "🏃",
  sleep:     "😴",
  mental:    "🧠",
};

interface NextBestActionCardProps {
  // Back-compat: callers may pass a legacy override, but when omitted the
  // card reads live Vitana Index state and the real Autopilot queue.
  weakestPillar?: {
    name: string;
    score: number;
    icon: string;
  };
}

export default function NextBestActionCard({ weakestPillar: override }: NextBestActionCardProps) {
  const navigate = useNavigate();
  const { index, isLoading: indexLoading } = useVitanaIndex();
  const { pendingActions, loading: autopilotLoading } = useAutopilot();

  const focus = useMemo(() => {
    if (override) {
      return {
        name: override.name,
        score: override.score,
        icon: override.icon,
        pillarKey: null as VitanaPillarKey | null,
      };
    }
    if (!index) return null;
    const key = weakestPillar(index.pillars);
    return {
      name: pillarLabel(key),
      score: index.pillars[key],
      icon: PILLAR_EMOJI[key],
      pillarKey: key,
    };
  }, [override, index]);

  // Pick the first pending autopilot action whose contribution_vector lifts
  // the weakest pillar. Fall back to the first pending action.
  const targetedAction: AutopilotAction | null = useMemo(() => {
    if (!focus?.pillarKey || pendingActions.length === 0) return pendingActions[0] ?? null;
    const match = pendingActions.find(a => {
      const value = a.contributionVector?.[focus.pillarKey!];
      return typeof value === "number" && value > 0;
    });
    return match ?? pendingActions[0] ?? null;
  }, [focus, pendingActions]);

  const isLoading = indexLoading || autopilotLoading;

  if (isLoading && !focus) {
    return (
      <Card className="h-full bg-gradient-to-br from-status-warning-subtle to-status-warning-subtle border-s-4 border-status-warning/80">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-status-warning" />
            {t('screens.health.priorityAction')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-status-warning" />
        </CardContent>
      </Card>
    );
  }

  if (!focus) return null;

  return (
    <Card className="h-full bg-gradient-to-br from-status-warning-subtle to-status-warning-subtle border-s-4 border-status-warning/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-status-warning" />
            {t('screens.health.priorityAction')}
          </CardTitle>
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            {t('screens.health.focus')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-card/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{focus.icon}</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-muted-foreground">{t('screens.health.weakestPillar')}</div>
              <div className="text-lg font-bold text-foreground">{focus.name}</div>
            </div>
            <div className="text-end">
              <div className="text-2xl font-bold text-status-warning">{focus.score}</div>
              <div className="text-xs text-muted-foreground">/ 200</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            <Zap className="w-4 h-4 inline me-1 text-status-warning" />
            {t('screens.health.recommendedAction')}
          </div>

          {targetedAction ? (
            <div className="bg-card/60 rounded-lg p-3 text-sm space-y-2">
              <div className="flex items-start gap-2">
                <div className="text-xl flex-shrink-0">{targetedAction.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium mb-1">{targetedAction.title}</div>
                  <div className="text-xs text-muted-foreground">{targetedAction.reason}</div>
                </div>
              </div>
              {targetedAction.contributionVector && (
                <PillarDeltaBadges vector={targetedAction.contributionVector} compact />
              )}
            </div>
          ) : (
            <div className="bg-card/60 rounded-lg p-3 text-sm">
              <div className="font-medium mb-1">{t('screens.health.logActivityLiftName', { name: focus.name })}</div>
              <div className="text-xs text-muted-foreground">
                {t('screens.health.openIndexDetailLogDataComplete')}
              </div>
            </div>
          )}
        </div>

        <Button
          className="w-full bg-gradient-to-r from-status-warning to-status-warning hover:from-status-warning hover:to-status-warning"
          onClick={() => navigate(targetedAction ? "/dashboard/actions" : "/health/vitana-index")}
        >
          {targetedAction ? "Take action now" : "Open Vitana Index"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {t('screens.health.balanceAcrossAllFivePillarsSmall')}
        </p>
      </CardContent>
    </Card>
  );
}
