import { CrossoverCard } from "./CrossoverCard";
import { Zap, Clock, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

interface AutoPilotActionCardProps {
  action?: string;
  timeEstimate?: string;
  reason?: string;
  priority?: "low" | "medium" | "high";
  className?: string;
}

export function AutoPilotActionCard({ 
  action = "Drink 1 glass of water now",
  timeEstimate = "30 seconds",
  reason = "You're 2 glasses behind your daily goal",
  priority = "medium",
  className 
}: AutoPilotActionCardProps) {
  const navigate = useNavigate();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-health-danger";
      case "medium": return "text-health-warning";
      case "low": return "text-health-success";
      default: return "text-muted-foreground";
    }
  };

  const content = (
    <div className="space-y-3">
      <div className="p-3 bg-muted/30 rounded-lg">
        <p className="text-sm font-semibold text-foreground leading-tight">{action}</p>
        <p className="text-xs text-muted-foreground mt-1">{reason}</p>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">{timeEstimate}</span>
        </div>
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3" />
          <span className={getPriorityColor(priority)}>{t('screens.crossover.priorityPriority', { priority })}</span>
        </div>
      </div>
    </div>
  );

  const handleDoItNow = () => {
    console.log("Executing action:", action);
  };

  return (
    <CrossoverCard
      icon={Zap}
      category="autopilot"
      title={t('screens.crossover.autopilotRecommendation')}
      subtitle="AI-powered next best action based on your patterns"
      content={content}
      buttonText="Complete Action"
      onButtonClick={handleDoItNow}
      secondaryButtonText="View All Suggestions"
      onSecondaryButtonClick={() => navigate('/dashboard/actions')}
      urgent={priority === "high"}
      size="sm"
      className={className}
    />
  );
}