import { CrossoverCard } from "./CrossoverCard";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getVitanaIndexTier, getVitanaIndexPercentage } from "@/lib/vitanaIndex";
import { withCardId } from "@/lib/withCardId";
import { cn } from "@/lib/utils";

interface VitanaIndexCardProps {
  score?: number;
  trend?: string;
  className?: string;
}

function VitanaIndexCardBase({ 
  score = 742, 
  trend = "+11% vs last week",
  className 
}: VitanaIndexCardProps) {
  const navigate = useNavigate();

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
            <div className="text-xl font-bold" style={{ color: scoreStatus.color }}>{score}</div>
            <div className="text-xs text-muted-foreground">Index</div>
          </div>
        </div>
      </div>
      
      {/* Status & Breakdown */}
      <div className="space-y-3 text-center">
        <div>
          <div className="text-lg font-bold" style={{ color: scoreStatus.color }}>{scoreStatus.status}</div>
          <div className="text-sm text-muted-foreground">{trend}</div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Sleep</span>
            <span className="text-health-success font-medium">85%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Exercise</span>
            <span className="text-health-warning font-medium">67%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Nutrition</span>
            <span className="text-health-success font-medium">92%</span>
          </div>
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
      onButtonClick={() => navigate('/health-tracker/vitana-index')}
      secondaryButtonText="Track Today"
      onSecondaryButtonClick={() => navigate('/health-tracker')}
      size="lg"
      className={className}
    />
  );
}

export const VitanaIndexCard = withCardId(VitanaIndexCardBase, "CT-CX-010", "C-001");