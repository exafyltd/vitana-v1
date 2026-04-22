import { CrossoverCard } from "./CrossoverCard";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getVitanaIndexTier, getVitanaIndexPercentage } from "@/lib/vitanaIndex";
import { useVitanaIndex } from "@/hooks/useVitanaIndex";
import { withCardId } from "@/lib/withCardId";
import { cn } from "@/lib/utils";

interface VitanaBreakdown {
  physical: number;
  mental: number;
  nutritional: number;
  social: number;
  environmental?: number;
  prosperity?: number;
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
    physical: Math.round(((index?.pillars.physical ?? 0) / 200) * 100),
    mental: Math.round(((index?.pillars.mental ?? 0) / 200) * 100),
    nutritional: Math.round(((index?.pillars.nutritional ?? 0) / 200) * 100),
    social: Math.round(((index?.pillars.social ?? 0) / 200) * 100),
    environmental: Math.round(((index?.pillars.environmental ?? 0) / 200) * 100),
    prosperity: Math.round(((index?.pillars.prosperity ?? 0) / 200) * 100),
  };
  const trend = trendOverride ??
    (index?.trend === "up" ? "↑ improving"
      : index?.trend === "down" ? "↓ declining"
      : "steady");

  const tier = getVitanaIndexTier(score);
  const progressPercent = getVitanaIndexPercentage(score);

  const scoreStatus = {
    color: tier.color,
    status: tier.label,
    variant: "success" as const
  };

  const content = (
    <div className="space-y-4">
      {/* Prominent Circular Progress */}
      <div className="flex justify-center">
        <div className="relative flex items-center justify-center">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted/20"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${progressPercent * 2.51} 251`}
              className="transition-all duration-700 ease-out"
              strokeLinecap="round"
              style={{ stroke: scoreStatus.color }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-bold" style={{ color: scoreStatus.color }}>{isComputing ? "…" : score}</div>
            <div className="text-xs text-muted-foreground">Index</div>
          </div>
        </div>
      </div>

      {/* Status & Breakdown */}
      <div className="space-y-3 text-center">
        <div>
          <div className="text-lg font-bold" style={{ color: scoreStatus.color }}>{isComputing ? "computing…" : scoreStatus.status}</div>
          <div className="text-sm text-muted-foreground">{trend}</div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Physical</span>
            <span className={`font-medium ${breakdown.physical >= 80 ? 'text-health-success' : breakdown.physical >= 60 ? 'text-health-warning' : 'text-health-error'}`}>
              {breakdown.physical}%
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Mental</span>
            <span className={`font-medium ${breakdown.mental >= 80 ? 'text-health-success' : breakdown.mental >= 60 ? 'text-health-warning' : 'text-health-error'}`}>
              {breakdown.mental}%
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Nutritional</span>
            <span className={`font-medium ${breakdown.nutritional >= 80 ? 'text-health-success' : breakdown.nutritional >= 60 ? 'text-health-warning' : 'text-health-error'}`}>
              {breakdown.nutritional}%
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Social</span>
            <span className={`font-medium ${breakdown.social >= 80 ? 'text-health-success' : breakdown.social >= 60 ? 'text-health-warning' : 'text-health-error'}`}>
              {breakdown.social}%
            </span>
          </div>
          {breakdown.environmental !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Environmental</span>
              <span className={`font-medium ${breakdown.environmental >= 80 ? 'text-health-success' : breakdown.environmental >= 60 ? 'text-health-warning' : 'text-health-error'}`}>
                {breakdown.environmental}%
              </span>
            </div>
          )}
          {breakdown.prosperity !== undefined && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Prosperity</span>
              <span className={`font-medium ${breakdown.prosperity >= 80 ? 'text-health-success' : breakdown.prosperity >= 60 ? 'text-health-warning' : 'text-health-error'}`}>
                {breakdown.prosperity}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Activity}
      category="vitana"
      title="Vitana Health Index"
      subtitle="Overall wellness balance across all health pillars"
      content={content}
      buttonText="View Full Report"
      onButtonClick={() => navigate('/health/my-health-tracker')}
      secondaryButtonText="Track Today"
      onSecondaryButtonClick={() => navigate('/health/my-health-tracker')}
      size="lg"
      className={className}
    />
  );
}

export const VitanaIndexCard = withCardId(VitanaIndexCardBase, "CT-CX-010", "C-001");