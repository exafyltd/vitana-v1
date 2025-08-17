import { CrossoverCard } from "./CrossoverCard";
import { Apple, Droplets, Dumbbell, Moon, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type LifestylePlanType = "nutrition" | "hydration" | "exercise" | "sleep" | "mental";

interface LifestylePlanCardProps {
  type: LifestylePlanType;
  className?: string;
}

const planConfigs = {
  nutrition: {
    icon: Apple,
    title: "Daily Nutrition",
    subtitle: "Track meals and nutrient intake for optimal health",
    goal: "5 servings fruits & vegetables",
    progress: 3,
    total: 5,
    unit: "servings",
    iconVariant: "success" as const,
    nextAction: "Log lunch meal"
  },
  hydration: {
    icon: Droplets,
    title: "Hydration Goals",
    subtitle: "Maintain optimal water intake throughout the day",
    goal: "8 glasses of water daily",
    progress: 6,
    total: 8,
    unit: "glasses",
    iconVariant: "info" as const,
    nextAction: "Drink 16oz water"
  },
  exercise: {
    icon: Dumbbell,
    title: "Exercise Plan",
    subtitle: "Stay active with daily movement and workouts",
    goal: "30 minutes active time",
    progress: 15,
    total: 30,
    unit: "minutes",
    iconVariant: "warning" as const,
    nextAction: "15min walk"
  },
  sleep: {
    icon: Moon,
    title: "Sleep Quality",
    subtitle: "Optimize rest and recovery patterns",
    goal: "8 hours quality sleep",
    progress: 7.5,
    total: 8,
    unit: "hours",
    iconVariant: "success" as const,
    nextAction: "Set bedtime reminder"
  },
  mental: {
    icon: Heart,
    title: "Mental Wellness",
    subtitle: "Nurture mental health and emotional balance",
    goal: "3 mindful moments daily",
    progress: 2,
    total: 3,
    unit: "moments",
    iconVariant: "info" as const,
    nextAction: "5min meditation"
  }
};

export function LifestylePlanCard({ type, className }: LifestylePlanCardProps) {
  const navigate = useNavigate();
  const config = planConfigs[type];
  
  const progressPercent = Math.round((config.progress / config.total) * 100);
  const isOnTrack = progressPercent >= 80;

  const content = (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">{config.progress} / {config.total}</span>
          <span className={cn(
            "text-xs font-medium",
            isOnTrack ? "text-health-success" : "text-health-warning"
          )}>
            {progressPercent}%
          </span>
        </div>
        
        <div className="w-full bg-muted/30 rounded-full h-1.5">
          <div 
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              isOnTrack ? "bg-health-success" : "bg-health-warning"
            )}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>
      
      <div className="p-2 bg-muted/20 rounded-md">
        <p className="text-xs text-muted-foreground line-clamp-1">Next: {config.nextAction}</p>
      </div>
    </div>
  );

  const handleQuickLog = () => {
    console.log("Quick log for:", type);
  };

  const navigateToTracker = () => {
    const routes = {
      nutrition: '/health-tracker/nutrition',
      hydration: '/health-tracker/hydration', 
      exercise: '/health-tracker/exercise',
      sleep: '/health-tracker/sleep',
      mental: '/health-tracker/mental-health'
    };
    navigate(routes[type]);
  };

  return (
    <CrossoverCard
      icon={config.icon}
      iconVariant={config.iconVariant}
      title={config.title}
      subtitle={config.subtitle}
      content={content}
      buttonText="Log Progress"
      onButtonClick={handleQuickLog}
      secondaryButtonText="View Details"
      onSecondaryButtonClick={navigateToTracker}
      className={className}
    />
  );
}