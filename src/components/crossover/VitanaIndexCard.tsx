import { CrossoverCard } from "./CrossoverCard";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface VitanaIndexCardProps {
  score?: number;
  trend?: string;
  className?: string;
}

export function VitanaIndexCard({ 
  score = 742, 
  trend = "+11% vs last week",
  className 
}: VitanaIndexCardProps) {
  const navigate = useNavigate();

  const getScoreStatus = (score: number) => {
    if (score >= 750) return { color: "text-health-success", status: "Excellent", variant: "success" as const };
    if (score >= 650) return { color: "text-health-warning", status: "Good", variant: "warning" as const };
    if (score >= 500) return { color: "text-health-warning", status: "Fair", variant: "warning" as const };
    return { color: "text-health-danger", status: "Needs Attention", variant: "danger" as const };
  };

  const scoreStatus = getScoreStatus(score);

  const progressPercent = Math.round((score / 1000) * 100);

  const content = (
    <div className="flex items-center justify-center space-x-6">
      {/* Prominent Circular Progress */}
      <div className="relative flex items-center justify-center">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
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
            className={cn(
              "transition-all duration-700 ease-out",
              scoreStatus.color
            )}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-foreground">{score}</div>
          <div className="text-xs text-muted-foreground">Index</div>
        </div>
      </div>
      
      {/* Status & Breakdown */}
      <div className="space-y-3 flex-1">
        <div>
          <div className={cn("text-lg font-bold", scoreStatus.color)}>{scoreStatus.status}</div>
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