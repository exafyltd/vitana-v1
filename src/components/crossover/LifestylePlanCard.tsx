import { CrossoverCard } from "./CrossoverCard";
import { Apple, Droplets, Dumbbell, Moon, Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { type HealthCategoryColor } from "./CrossoverCard";
import { t } from '@/lib/i18n-toast';

export type LifestylePlanType = "nutrition" | "hydration" | "exercise" | "sleep" | "mental";

interface LifestylePlanCardProps {
  type: LifestylePlanType;
  className?: string;
}

const planConfigs = {
  nutrition: {
    icon: Apple,
    category: "nutrition" as HealthCategoryColor,
    title: "Daily Nutrition",
    subtitle: "Track meals and nutrient intake for optimal health",
    goal: "5 servings fruits & vegetables",
    progress: 3,
    total: 5,
    unit: "servings",
    nextAction: "Log lunch meal"
  },
  hydration: {
    icon: Droplets,
    category: "hydration" as HealthCategoryColor,
    title: "Hydration Goals",
    subtitle: "Maintain optimal water intake throughout the day",
    goal: "8 glasses of water daily",
    progress: 6,
    total: 8,
    unit: "glasses",
    nextAction: "Drink 16oz water"
  },
  exercise: {
    icon: Dumbbell,
    category: "exercise" as HealthCategoryColor,
    title: "Exercise Plan",
    subtitle: "Stay active with daily movement and workouts",
    goal: "30 minutes active time",
    progress: 15,
    total: 30,
    unit: "minutes",
    nextAction: "15min walk"
  },
  sleep: {
    icon: Moon,
    category: "sleep" as HealthCategoryColor,
    title: "Sleep Quality",
    subtitle: "Optimize rest and recovery patterns",
    goal: "8 hours quality sleep",
    progress: 7.5,
    total: 8,
    unit: "hours",
    nextAction: "Set bedtime reminder"
  },
  mental: {
    icon: Brain,
    category: "mental" as HealthCategoryColor,
    title: "Mental Wellness",
    subtitle: "Nurture mental health and emotional balance",
    goal: "3 mindful moments daily",
    progress: 2,
    total: 3,
    unit: "moments",
    nextAction: "5min meditation"
  }
};

export function LifestylePlanCard({ type, className }: LifestylePlanCardProps) {
  const navigate = useNavigate();
  const config = planConfigs[type];
  
  const progressPercent = Math.round((config.progress / config.total) * 100);
  const isOnTrack = progressPercent >= 75;
  
  const content = (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className={cn(
            "font-medium",
            isOnTrack ? "text-health-success" : "text-health-warning"
          )}>
            {config.progress}/{config.total} {config.unit}
          </span>
        </div>
        <div className="w-full bg-muted/30 rounded-full h-2">
          <div 
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              isOnTrack ? "bg-health-success" : "bg-health-warning"
            )}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Next Action */}
      <div className="text-xs">
        <span className="text-muted-foreground">{t('screens.crossover.next')} </span>
        <span className="font-medium text-foreground">{config.nextAction}</span>
      </div>
    </div>
  );

  const handleQuickLog = () => {
    // In real implementation, this would open a quick log modal
    console.log(`Quick log for ${type}`);
  };

  const navigateToTracker = () => {
    const routes = {
      nutrition: '/health/my-health-tracker',
      hydration: '/health/my-health-tracker', 
      exercise: '/health/my-health-tracker',
      sleep: '/health/my-health-tracker',
      mental: '/health/my-health-tracker'
    };
    navigate(routes[type]);
  };

  return (
    <CrossoverCard
      icon={config.icon}
      category={config.category}
      title={config.title}
      subtitle={config.subtitle}
      content={content}
      buttonText="Log Progress"
      onButtonClick={handleQuickLog}
      secondaryButtonText="View Details"
      onSecondaryButtonClick={navigateToTracker}
      size="md"
      className={className}
    />
  );
}