import { useMemo } from 'react';
import { Calendar, Dumbbell, UtensilsCrossed, Moon, Droplets, Users, Lightbulb, Target, HeartPulse } from 'lucide-react';

export interface DailyPriority {
  type: 'hydration' | 'exercise' | 'nutrition' | 'sleep' | 'social' | 'learning' | 'planning' | 'healthPlan';
  message: string;
  actionText: string;
  icon: any;
  color: string;
  actionLink: string;
}

const PRIORITIES: Record<string, Omit<DailyPriority, 'type'>> = {
  hydration: {
    message: 'drink more water',
    actionText: 'Stay hydrated for optimal performance',
    icon: Droplets,
    color: 'from-blue-500/15 via-cyan-500/15 to-blue-500/15',
    actionLink: '/health/my-health-tracker'
  },
  exercise: {
    message: 'min 30min exercise',
    actionText: 'Move your body and boost your energy',
    icon: Dumbbell,
    color: 'from-green-500/15 via-emerald-500/15 to-green-500/15',
    actionLink: '/health/my-health-tracker'
  },
  nutrition: {
    message: 'eat only two meals today',
    actionText: 'Try intermittent fasting for better health',
    icon: UtensilsCrossed,
    color: 'from-orange-500/15 via-amber-500/15 to-orange-500/15',
    actionLink: '/health/my-health-tracker'
  },
  sleep: {
    message: 'get a min of 8 hours of sleep',
    actionText: 'Quality rest is essential for wellness',
    icon: Moon,
    color: 'from-indigo-500/15 via-purple-500/15 to-indigo-500/15',
    actionLink: '/health/my-health-tracker'
  },
  social: {
    message: 'meet some people to start socializing again',
    actionText: 'Connect with others for mental wellness',
    icon: Users,
    color: 'from-pink-500/15 via-rose-500/15 to-pink-500/15',
    actionLink: '/community'
  },
  learning: {
    message: 'find yourself some new inspiration to learn something new',
    actionText: 'Expand your knowledge and grow',
    icon: Lightbulb,
    color: 'from-yellow-500/15 via-amber-500/15 to-yellow-500/15',
    actionLink: '/home'
  },
  planning: {
    message: 'make a new plan what you want to achieve the next 6 months',
    actionText: 'Set goals for your wellness journey',
    icon: Target,
    color: 'from-violet-500/15 via-purple-500/15 to-violet-500/15',
    actionLink: '/health/pillars'
  },
  healthPlan: {
    message: 'make yourself an exercise/nutrition/sleep/hydration plan',
    actionText: 'Create a comprehensive wellness strategy',
    icon: HeartPulse,
    color: 'from-red-500/15 via-pink-500/15 to-red-500/15',
    actionLink: '/health/my-health-tracker'
  }
};

export function useDailyPriority(vitanaBreakdown?: any): DailyPriority {
  return useMemo(() => {
    // Get current day index for rotation
    const now = new Date();
    const dayIndex = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
    
    // Check if we have vitana breakdown data
    if (vitanaBreakdown) {
      const pillars = {
        hydration: vitanaBreakdown.hydration || 0,
        exercise: vitanaBreakdown.exercise || 0,
        nutrition: vitanaBreakdown.nutrition || 0,
        sleep: vitanaBreakdown.sleep || 0,
      };
      
      // Find lowest scoring pillar
      const lowestPillar = Object.entries(pillars)
        .sort(([, a], [, b]) => (a as number) - (b as number))[0];
      
      // If lowest score < 70%, prioritize that pillar
      if (lowestPillar && lowestPillar[1] < 70) {
        const priorityType = lowestPillar[0] as keyof typeof PRIORITIES;
        return {
          type: priorityType as DailyPriority['type'],
          ...PRIORITIES[priorityType]
        };
      }
    }
    
    // Otherwise, rotate through motivational priorities
    const motivationalTypes = ['social', 'learning', 'planning', 'healthPlan'];
    const selectedType = motivationalTypes[dayIndex % motivationalTypes.length];
    
    return {
      type: selectedType as DailyPriority['type'],
      ...PRIORITIES[selectedType]
    };
  }, [vitanaBreakdown]);
}
