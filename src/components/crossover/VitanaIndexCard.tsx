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

  const content = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{score}</div>
          <div className="text-xs text-muted-foreground">Current Score</div>
        </div>
        <div className="text-right">
          <div className={cn("text-sm font-semibold", scoreStatus.color)}>{scoreStatus.status}</div>
          <div className="text-xs text-muted-foreground">{trend}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-sm font-medium text-health-success">85%</div>
          <div className="text-xs text-muted-foreground">Sleep</div>
        </div>
        <div>
          <div className="text-sm font-medium text-health-warning">67%</div>
          <div className="text-xs text-muted-foreground">Exercise</div>
        </div>
        <div>
          <div className="text-sm font-medium text-health-success">92%</div>
          <div className="text-xs text-muted-foreground">Nutrition</div>
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Activity}
      iconVariant={scoreStatus.variant}
      title="Vitana Health Index"
      subtitle="Overall wellness balance across all health pillars"
      content={content}
      buttonText="View Full Report"
      onButtonClick={() => navigate('/health-tracker/vitana-index')}
      secondaryButtonText="Track Today"
      onSecondaryButtonClick={() => navigate('/health-tracker')}
      className={className}
    />
  );
}