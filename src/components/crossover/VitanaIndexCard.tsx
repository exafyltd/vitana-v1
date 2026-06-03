import { CrossoverCard } from "./CrossoverCard";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getVitanaIndexTier, getVitanaIndexPercentage } from "@/lib/vitanaIndex";
import { useVitanaIndex } from "@/hooks/useVitanaIndex";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface VitanaBreakdown {
  nutrition: number;
  hydration: number;
  exercise: number;
  sleep: number;
  mental: number;
}

interface VitanaIndexCardProps {
  score?: number;
  trend?: string;
  breakdown?: VitanaBreakdown;
  className?: string;
}

function VitanaIndexCardBase({
  score: scoreOverride,
  trend: trendOverride,
  breakdown: breakdownOverride,
  className
}: VitanaIndexCardProps) {
  const navigate = useNavigate();
  const { index, isLoading } = useVitanaIndex();

  const score = scoreOverride ?? index?.total ?? 0;
  const isComputing = isLoading || (!index && scoreOverride === undefined);
  const breakdown: VitanaBreakdown = breakdownOverride ?? {
    nutrition: Math.round(((index?.pillars.nutrition ?? 0) / 200) * 100),
    hydration: Math.round(((index?.pillars.hydration ?? 0) / 200) * 100),
    exercise:  Math.round(((index?.pillars.exercise  ?? 0) / 200) * 100),
    sleep:     Math.round(((index?.pillars.sleep     ?? 0) / 200) * 100),
    mental:    Math.round(((index?.pillars.mental    ?? 0) / 200) * 100),
  };
  const trend = trendOverride ??
    (index?.trend === "up" ? "↑ improving"
      : index?.trend === "down" ? "↓ declining"
      : "steady");

  const tier = getVitanaIndexTier(score);
  const progressPercent = getVitanaIndexPercentage(score);

  const scoreStatus = {
    color: tier.color,
    status: t(tier.labelKey),
    variant: "success" as const
  };

  const pillarRow = (label: string, value: number) => (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${value >= 80 ? 'text-health-success' : value >= 60 ? 'text-health-warning' : 'text-health-error'}`}>
        {value}%
      </span>
    </div>
  );

  const content = (
    <div className="space-y-4">
      {/* Prominent Circular Progress */}
      <div className="flex justify-center">
        <div className="relative flex items-center justify-center">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/20" />
            <circle
              cx="50" cy="50" r="40"
              stroke="currentColor" strokeWidth="8" fill="none"
              strokeDasharray={`${progressPercent * 2.51} 251`}
              className="transition-all duration-700 ease-out"
              strokeLinecap="round"
              style={{ stroke: scoreStatus.color }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-bold" style={{ color: scoreStatus.color }}>{isComputing ? "…" : score}</div>
            <div className="text-xs text-muted-foreground">{t('screens.crossover.index')}</div>
          </div>
        </div>
      </div>

      {/* Status & 5-pillar breakdown */}
      <div className="space-y-3 text-center">
        <div>
          <div className="text-lg font-bold" style={{ color: scoreStatus.color }}>{isComputing ? "computing…" : scoreStatus.status}</div>
          <div className="text-sm text-muted-foreground">{trend}</div>
        </div>

        <div className="space-y-1">
          {pillarRow("Nutrition", breakdown.nutrition)}
          {pillarRow("Hydration", breakdown.hydration)}
          {pillarRow("Exercise",  breakdown.exercise)}
          {pillarRow("Sleep",     breakdown.sleep)}
          {pillarRow("Mental",    breakdown.mental)}
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Activity}
      category="vitana"
      title={t('screens.crossover.vitanaHealthIndex')}
      subtitle="The five pillars: Nutrition, Hydration, Exercise, Sleep, Mental."
      content={content}
      buttonText="View Full Report"
      onButtonClick={() => navigate('/health/vitana-index')}
      secondaryButtonText="Track Today"
      onSecondaryButtonClick={() => navigate('/health/vitana-index')}
      size="lg"
      className={className}
    />
  );
}

export const VitanaIndexCard = withCardId(VitanaIndexCardBase, "CT-CX-010", "C-001");
