import { useMemo } from 'react';
import { Calendar, Dumbbell, UtensilsCrossed, Moon, Droplets, Users, Lightbulb, Target, HeartPulse } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

export interface DailyPriority {
  type: 'hydration' | 'exercise' | 'nutrition' | 'sleep' | 'social' | 'learning' | 'planning' | 'healthPlan';
  /** i18n key for the priority message (resolved at render time). */
  messageKey: string;
  /** i18n key for the action text (resolved at render time). */
  actionTextKey: string;
  icon: any;
  color: string;
  actionLink: string;
}

const PRIORITIES: Record<string, Omit<DailyPriority, 'type'>> = {
  hydration: {
    messageKey: 'screens.home.dailyPriority_hydration_msg',
    actionTextKey: 'screens.home.dailyPriority_hydration_action',
    icon: Droplets,
    color: 'from-blue-500/15 via-cyan-500/15 to-blue-500/15',
    actionLink: '/health/my-health-tracker'
  },
  exercise: {
    messageKey: 'screens.home.dailyPriority_exercise_msg',
    actionTextKey: 'screens.home.dailyPriority_exercise_action',
    icon: Dumbbell,
    color: 'from-green-500/15 via-emerald-500/15 to-green-500/15',
    actionLink: '/health/my-health-tracker'
  },
  nutrition: {
    messageKey: 'screens.home.dailyPriority_nutrition_msg',
    actionTextKey: 'screens.home.dailyPriority_nutrition_action',
    icon: UtensilsCrossed,
    color: 'from-orange-500/15 via-amber-500/15 to-orange-500/15',
    actionLink: '/health/my-health-tracker'
  },
  sleep: {
    messageKey: 'screens.home.dailyPriority_sleep_msg',
    actionTextKey: 'screens.home.dailyPriority_sleep_action',
    icon: Moon,
    color: 'from-indigo-500/15 via-purple-500/15 to-indigo-500/15',
    actionLink: '/health/my-health-tracker'
  },
  social: {
    messageKey: 'screens.home.dailyPriority_social_msg',
    actionTextKey: 'screens.home.dailyPriority_social_action',
    icon: Users,
    color: 'from-pink-500/15 via-rose-500/15 to-pink-500/15',
    actionLink: '/community'
  },
  learning: {
    messageKey: 'screens.home.dailyPriority_learning_msg',
    actionTextKey: 'screens.home.dailyPriority_learning_action',
    icon: Lightbulb,
    color: 'from-yellow-500/15 via-amber-500/15 to-yellow-500/15',
    actionLink: '/home'
  },
  planning: {
    messageKey: 'screens.home.dailyPriority_planning_msg',
    actionTextKey: 'screens.home.dailyPriority_planning_action',
    icon: Target,
    color: 'from-violet-500/15 via-purple-500/15 to-violet-500/15',
    actionLink: '/health/pillars'
  },
  healthPlan: {
    messageKey: 'screens.home.dailyPriority_healthPlan_msg',
    actionTextKey: 'screens.home.dailyPriority_healthPlan_action',
    icon: HeartPulse,
    color: 'from-red-500/15 via-pink-500/15 to-red-500/15',
    actionLink: '/health/my-health-tracker'
  }
};

export interface DailyPriorityResolved extends Omit<DailyPriority, 'messageKey' | 'actionTextKey'> {
  /** Resolved message string for the user's selected language. */
  message: string;
  /** Resolved action-text string for the user's selected language. */
  actionText: string;
}

export function useDailyPriority(vitanaBreakdown?: any): DailyPriorityResolved {
  return useMemo(() => {
    // Get current day index for rotation
    const now = new Date();
    const dayIndex = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));

    let priorityType: keyof typeof PRIORITIES;

    if (vitanaBreakdown) {
      const pillars = {
        hydration: vitanaBreakdown.hydration || 0,
        exercise: vitanaBreakdown.exercise || 0,
        nutrition: vitanaBreakdown.nutrition || 0,
        sleep: vitanaBreakdown.sleep || 0,
      };
      const lowestPillar = Object.entries(pillars)
        .sort(([, a], [, b]) => (a as number) - (b as number))[0];
      if (lowestPillar && (lowestPillar[1] as number) < 70) {
        priorityType = lowestPillar[0] as keyof typeof PRIORITIES;
      } else {
        const motivationalTypes = ['social', 'learning', 'planning', 'healthPlan'] as const;
        priorityType = motivationalTypes[dayIndex % motivationalTypes.length];
      }
    } else {
      const motivationalTypes = ['social', 'learning', 'planning', 'healthPlan'] as const;
      priorityType = motivationalTypes[dayIndex % motivationalTypes.length];
    }

    const config = PRIORITIES[priorityType];
    const { messageKey, actionTextKey, ...rest } = config;
    return {
      type: priorityType as DailyPriority['type'],
      ...rest,
      message: t(messageKey),
      actionText: t(actionTextKey),
    };
  }, [vitanaBreakdown]);
}
