import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RewardDot } from "@/components/ui/reward-dot";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { useVitanaIndexConfig } from "@/hooks/useVitanaIndexConfig";
import { useVitanaIndex } from "@/hooks/useVitanaIndex";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";
import { t } from '@/lib/i18n-toast';

interface VitanaIndexMiniProps {
  score?: number;
  trend?: "up" | "down" | "stable";
  variant?: "card" | "compact" | "badge";
  showDetails?: boolean;
  onClick?: () => void;
}

function VitanaIndexMiniBase({
  score: scoreOverride,
  trend: trendOverride,
  variant = "card",
  showDetails = true,
  onClick
}: VitanaIndexMiniProps) {
  const navigate = useNavigate();
  const { config } = useVitanaIndexConfig();
  const { index, isLoading } = useVitanaIndex();

  const score = scoreOverride ?? index?.total ?? 0;
  const trend = trendOverride ?? index?.trend ?? "stable";
  const nutritionScore = index?.pillars.nutrition ?? 0;
  const exerciseScore = index?.pillars.exercise ?? 0;
  const sleepScore = index?.pillars.sleep ?? 0;
  const isComputing = isLoading || (!index && scoreOverride === undefined);
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/health/my-health-tracker');
    }
  };

  const getScoreColor = (score: number) => {
    if (config?.scoring_tiers) {
      const tier = config.scoring_tiers.find(t => score >= t.min && score <= t.max);
      if (tier) return `from-[${tier.color}] to-[${tier.color}]/80`;
    }
    // Fallback to default logic
    if (score >= 80) return "from-calendar-success to-calendar-accent";
    if (score >= 60) return "from-calendar-accent to-calendar-secondary";
    return "from-calendar-secondary to-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (config?.scoring_tiers) {
      const tier = config.scoring_tiers.find(t => score >= t.min && score <= t.max);
      if (tier) return tier.label;
    }
    // Fallback to default logic
    return getVitanaIndexTier(score).label;
  };

  if (variant === "badge") {
    return (
      <div 
        className="inline-flex items-center gap-1.5 rounded-full cursor-pointer px-2.5 py-1 text-[12.5px] font-medium bg-[color-mix(in_oklab,hsl(var(--accent))_14%,transparent)] ring-1 ring-[hsl(var(--accent))/28] text-foreground before:content-[''] before:inline-block before:h-3 before:w-[2px] before:rounded-full before:bg-[hsl(var(--accent))] transition-transform duration-150 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
        onClick={handleClick}
        tabIndex={0}
        role="button"
        aria-label={`Vitana Index: ${score}. Click to view full report.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <Activity className="w-3 h-3 opacity-80" />
        <span>{t('screens.health.vitanaIndexValue0', { value0: isComputing ? "…" : score })}</span>
        {trend === "up" && <TrendingUp className="w-3 h-3 text-calendar-success" />}
        {trend === "down" && <TrendingDown className="w-3 h-3 text-destructive" />}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div 
        className="flex items-center justify-between p-3 rounded-lg bg-card ring-1 ring-border/60 shadow-[0_2px_10px_rgba(0,0,0,0.06)] cursor-pointer transition-transform duration-150 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
        onClick={handleClick}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t('screens.health.vitanaIndex')}</p>
            <p className="text-sm text-muted-foreground">{isComputing ? "computing…" : getScoreLabel(score)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-foreground">{isComputing ? "…" : score}</span>
          {trend === "up" && <TrendingUp className="w-5 h-5 text-calendar-success" />}
          {trend === "down" && <TrendingDown className="w-5 h-5 text-destructive" />}
        </div>
      </div>
    );
  }

  return (
    <Card 
      className="cursor-pointer bg-card ring-1 ring-border/60 shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-transform duration-150 ease-out hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none relative"
      onClick={handleClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <RewardDot 
        points={Math.floor(score / 10)} 
        description="Improve your health score for more credits"
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg">{t('screens.health.vitanaIndex')}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-foreground">{isComputing ? "…" : score}</span>
            {trend === "up" && <TrendingUp className="w-5 h-5 text-calendar-success" />}
            {trend === "down" && <TrendingDown className="w-5 h-5 text-destructive" />}
          </div>
        </div>
      </CardHeader>
      {showDetails && (
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('screens.health.overallHealth')}</span>
              <span className="font-medium text-foreground">{isComputing ? "computing…" : getScoreLabel(score)}</span>
            </div>
            <Progress
              value={Math.round((score / 999) * 100)}
              className="h-2"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium text-foreground">{nutritionScore}</div>
              <div className="text-muted-foreground">{t('screens.health.nutrition')}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-foreground">{exerciseScore}</div>
              <div className="text-muted-foreground">{t('screens.health.exercise')}</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-foreground">{sleepScore}</div>
              <div className="text-muted-foreground">{t('screens.health.sleep')}</div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

const VitanaIndexMini = withCardId(VitanaIndexMiniBase, "CT-HS-003");
export default VitanaIndexMini;