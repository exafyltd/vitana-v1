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
    titleKey: "screens.ai.lifestylePlan_nutrition_title",
    subtitleKey: "screens.ai.lifestylePlan_nutrition_subtitle",
    goalKey: "screens.ai.lifestylePlan_nutrition_goal",
    progress: 3,
    total: 5,
    unitKey: "screens.ai.unit_servings",
    nextActionKey: "screens.ai.lifestylePlan_nutrition_nextAction"
  },
  hydration: {
    icon: Droplets,
    category: "hydration" as HealthCategoryColor,
    titleKey: "screens.ai.lifestylePlan_hydration_title",
    subtitleKey: "screens.ai.lifestylePlan_hydration_subtitle",
    goalKey: "screens.ai.lifestylePlan_hydration_goal",
    progress: 6,
    total: 8,
    unitKey: "screens.ai.unit_glasses",
    nextActionKey: "screens.ai.lifestylePlan_hydration_nextAction"
  },
  exercise: {
    icon: Dumbbell,
    category: "exercise" as HealthCategoryColor,
    titleKey: "screens.ai.lifestylePlan_exercise_title",
    subtitleKey: "screens.ai.lifestylePlan_exercise_subtitle",
    goalKey: "screens.ai.lifestylePlan_exercise_goal",
    progress: 15,
    total: 30,
    unitKey: "screens.ai.unit_minutes",
    nextActionKey: "screens.ai.lifestylePlan_exercise_nextAction"
  },
  sleep: {
    icon: Moon,
    category: "sleep" as HealthCategoryColor,
    titleKey: "screens.ai.lifestylePlan_sleep_title",
    subtitleKey: "screens.ai.lifestylePlan_sleep_subtitle",
    goalKey: "screens.ai.lifestylePlan_sleep_goal",
    progress: 7.5,
    total: 8,
    unitKey: "screens.ai.unit_hours",
    nextActionKey: "screens.ai.lifestylePlan_sleep_nextAction"
  },
  mental: {
    icon: Brain,
    category: "mental" as HealthCategoryColor,
    titleKey: "screens.ai.lifestylePlan_mental_title",
    subtitleKey: "screens.ai.subtitle_mentalHealth",
    goalKey: "screens.ai.lifestylePlan_mental_goal",
    progress: 2,
    total: 3,
    unitKey: "screens.ai.unit_moments",
    nextActionKey: "screens.ai.lifestylePlan_mental_nextAction"
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
          <span className="text-muted-foreground">{t('screens.crossover.progress')}</span>
          <span className={cn(
            "font-medium",
            isOnTrack ? "text-health-success" : "text-health-warning"
          )}>
            {config.progress}/{config.total} {t(config.unitKey)}
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
        <span className="font-medium text-foreground">{t(config.nextActionKey)}</span>
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
      title={t(config.titleKey)}
      subtitle={t(config.subtitleKey)}
      content={content}
      buttonText={t('screens.ai.actionLabel_logProgress')}
      onButtonClick={handleQuickLog}
      secondaryButtonText={t('screens.ai.actionLabel_viewDetails')}
      onSecondaryButtonClick={navigateToTracker}
      size="md"
      className={className}
    />
  );
}