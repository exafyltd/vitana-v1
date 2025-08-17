import { CrossoverCard } from "./CrossoverCard";
import { Apple, Droplets, Dumbbell, Moon, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LucideIcon } from "lucide-react";

type PlanType = "nutrition" | "hydration" | "exercise" | "sleep" | "screen";

interface LifestylePlanCardProps {
  type: PlanType;
  goal?: string;
  progress?: string;
  className?: string;
}

const planConfig: Record<PlanType, {
  icon: LucideIcon;
  title: string;
  emoji: string;
  color: string;
  defaultGoal: string;
  defaultProgress: string;
  route: string;
}> = {
  nutrition: {
    icon: Apple,
    title: "Nutrition Plan",
    emoji: "🍎",
    color: "text-green-600",
    defaultGoal: "5 servings fruits/veggies",
    defaultProgress: "3/5 today",
    route: "/health-tracker/nutrition"
  },
  hydration: {
    icon: Droplets,
    title: "Hydration Plan", 
    emoji: "💧",
    color: "text-blue-600",
    defaultGoal: "8 glasses water",
    defaultProgress: "5/8 today",
    route: "/health-tracker/hydration"
  },
  exercise: {
    icon: Dumbbell,
    title: "Exercise Plan",
    emoji: "🏃",
    color: "text-purple-600",
    defaultGoal: "30 min movement",
    defaultProgress: "15 min done",
    route: "/health-tracker/exercise"
  },
  sleep: {
    icon: Moon,
    title: "Sleep Plan",
    emoji: "🌙",
    color: "text-indigo-600",
    defaultGoal: "8 hours sleep",
    defaultProgress: "7.5h last night",
    route: "/health-tracker/sleep"
  },
  screen: {
    icon: Smartphone,
    title: "Screen Time",
    emoji: "📱",
    color: "text-orange-600",
    defaultGoal: "< 4 hours daily",
    defaultProgress: "2.5h today",
    route: "/health-tracker/trends"
  }
};

export function LifestylePlanCard({ 
  type,
  goal,
  progress,
  className 
}: LifestylePlanCardProps) {
  const navigate = useNavigate();
  const config = planConfig[type];

  const content = (
    <div className="space-y-2 text-center">
      <p className="text-sm font-medium text-foreground">
        {goal || config.defaultGoal}
      </p>
      <p className="text-xs text-muted-foreground">
        {progress || config.defaultProgress}
      </p>
    </div>
  );

  const handleQuickLog = () => {
    // In real implementation, this would open a quick logging modal
    console.log("Quick log for:", type);
  };

  return (
    <CrossoverCard
      icon={config.icon}
      iconColor={config.color}
      title={`${config.title} ${config.emoji}`}
      subtitle="Today's target"
      content={content}
      buttonText="Quick Log"
      onButtonClick={handleQuickLog}
      secondaryButtonText="View Plan"
      onSecondaryButtonClick={() => navigate(config.route)}
      className={className}
      size="sm"
    />
  );
}