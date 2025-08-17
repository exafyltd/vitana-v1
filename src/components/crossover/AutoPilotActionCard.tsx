import { CrossoverCard } from "./CrossoverCard";
import { Zap, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AutoPilotActionCardProps {
  action?: string;
  timeEstimate?: string;
  className?: string;
}

export function AutoPilotActionCard({ 
  action = "Drink 1 glass of water now",
  timeEstimate = "30 seconds",
  className 
}: AutoPilotActionCardProps) {
  const navigate = useNavigate();

  const content = (
    <div className="space-y-3">
      <div className="text-center">
        <p className="text-sm font-medium text-foreground mb-1">{action}</p>
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{timeEstimate}</span>
        </div>
      </div>
    </div>
  );

  const handleDoItNow = () => {
    // In real implementation, this would trigger the action
    console.log("Executing action:", action);
  };

  return (
    <CrossoverCard
      icon={Zap}
      iconColor="text-blue-600"
      title="AutoPilot Next ⚡"
      subtitle="AI's top suggestion"
      content={content}
      buttonText="Do It Now"
      onButtonClick={handleDoItNow}
      secondaryButtonText="See All Actions"
      onSecondaryButtonClick={() => navigate('/dashboard/actions')}
      className={className}
    />
  );
}