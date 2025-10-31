import { DailyHydrationData, HydrationPlanData } from '@/types/hydration';

const mondayHydration: DailyHydrationData = {
  dayId: 'monday-hydration-1',
  day: 'Day 1',
  date: '2025-01-06',
  targetAmount: 2500,
  currentAmount: 2300,
  nextReminder: 'Next glass in 45 min',
  tags: ['Morning Boost', 'Post-Workout'],
  completionPercentage: 92,
  aiNote: 'Great progress! You\'re staying ahead of your hydration goals today.',
  intakes: [
    { time: '07:00', amount: 300, type: 'water', logged: true },
    { time: '09:00', amount: 250, type: 'herbal-tea', logged: true },
    { time: '11:00', amount: 300, type: 'water', logged: true },
    { time: '13:00', amount: 350, type: 'electrolyte', logged: true },
    { time: '15:00', amount: 300, type: 'water', logged: true },
    { time: '17:00', amount: 400, type: 'coconut-water', logged: true },
    { time: '19:00', amount: 300, type: 'water', logged: true },
    { time: '21:00', amount: 100, type: 'water', logged: true }
  ]
};

const tuesdayHydration: DailyHydrationData = {
  dayId: 'tuesday-hydration-1',
  day: 'Day 2',
  date: '2025-01-07',
  targetAmount: 2500,
  currentAmount: 1800,
  nextReminder: 'Next glass in 15 min',
  tags: ['Catch-up Needed'],
  completionPercentage: 72,
  intakes: [
    { time: '07:00', amount: 300, type: 'water', logged: true },
    { time: '09:30', amount: 250, type: 'water', logged: true },
    { time: '12:00', amount: 400, type: 'electrolyte', logged: true },
    { time: '15:00', amount: 300, type: 'water', logged: true },
    { time: '18:00', amount: 350, type: 'water', logged: true },
    { time: '20:00', amount: 200, type: 'herbal-tea', logged: true }
  ]
};

const wednesdayHydration: DailyHydrationData = {
  dayId: 'wednesday-hydration-1',
  day: 'Day 3',
  date: '2025-01-08',
  targetAmount: 2700,
  currentAmount: 2700,
  nextReminder: 'Goal achieved! 🎉',
  tags: ['Electrolytes', 'Optimal'],
  completionPercentage: 100,
  aiNote: 'Autopilot increased your target by 200ml due to higher temperature today.',
  intakes: [
    { time: '06:30', amount: 300, type: 'water', logged: true },
    { time: '08:30', amount: 300, type: 'electrolyte', logged: true },
    { time: '10:30', amount: 350, type: 'water', logged: true },
    { time: '12:30', amount: 400, type: 'coconut-water', logged: true },
    { time: '14:30', amount: 350, type: 'water', logged: true },
    { time: '16:30', amount: 300, type: 'sports-drink', logged: true },
    { time: '18:30', amount: 400, type: 'water', logged: true },
    { time: '20:30', amount: 300, type: 'herbal-tea', logged: true }
  ]
};

const thursdayHydration: DailyHydrationData = {
  dayId: 'thursday-hydration-1',
  day: 'Day 4',
  date: '2025-01-09',
  targetAmount: 2500,
  currentAmount: 2100,
  nextReminder: 'Next glass in 30 min',
  tags: ['On Track'],
  completionPercentage: 84,
  intakes: [
    { time: '07:15', amount: 300, type: 'water', logged: true },
    { time: '09:15', amount: 250, type: 'water', logged: true },
    { time: '11:15', amount: 350, type: 'electrolyte', logged: true },
    { time: '13:15', amount: 400, type: 'water', logged: true },
    { time: '15:15', amount: 300, type: 'water', logged: true },
    { time: '17:15', amount: 300, type: 'coconut-water', logged: true },
    { time: '19:15', amount: 200, type: 'herbal-tea', logged: true }
  ]
};

const fridayHydration: DailyHydrationData = {
  dayId: 'friday-hydration-1',
  day: 'Day 5',
  date: '2025-01-10',
  targetAmount: 2500,
  currentAmount: 2500,
  nextReminder: 'Perfect! Stay consistent',
  tags: ['Goal Met', 'Post-Workout'],
  completionPercentage: 100,
  intakes: [
    { time: '06:45', amount: 300, type: 'water', logged: true },
    { time: '08:45', amount: 300, type: 'water', logged: true },
    { time: '10:45', amount: 350, type: 'electrolyte', logged: true },
    { time: '12:45', amount: 400, type: 'water', logged: true },
    { time: '14:45', amount: 300, type: 'sports-drink', logged: true },
    { time: '16:45', amount: 350, type: 'water', logged: true },
    { time: '18:45', amount: 300, type: 'coconut-water', logged: true },
    { time: '20:45', amount: 200, type: 'herbal-tea', logged: true }
  ]
};

const saturdayHydration: DailyHydrationData = {
  dayId: 'saturday-hydration-1',
  day: 'Day 6',
  date: '2025-01-11',
  targetAmount: 2500,
  currentAmount: 1900,
  nextReminder: 'Next glass in 20 min',
  tags: ['Weekend'],
  completionPercentage: 76,
  intakes: [
    { time: '08:00', amount: 300, type: 'water', logged: true },
    { time: '10:30', amount: 300, type: 'water', logged: true },
    { time: '13:00', amount: 400, type: 'electrolyte', logged: true },
    { time: '16:00', amount: 300, type: 'water', logged: true },
    { time: '19:00', amount: 400, type: 'water', logged: true },
    { time: '21:00', amount: 200, type: 'herbal-tea', logged: true }
  ]
};

const sundayHydration: DailyHydrationData = {
  dayId: 'sunday-hydration-1',
  day: 'Day 7',
  date: '2025-01-12',
  targetAmount: 2500,
  currentAmount: 2400,
  nextReminder: 'Almost there!',
  tags: ['Rest Day', 'Steady'],
  completionPercentage: 96,
  intakes: [
    { time: '08:30', amount: 300, type: 'water', logged: true },
    { time: '10:30', amount: 300, type: 'herbal-tea', logged: true },
    { time: '12:30', amount: 350, type: 'water', logged: true },
    { time: '14:30', amount: 400, type: 'coconut-water', logged: true },
    { time: '16:30', amount: 350, type: 'water', logged: true },
    { time: '18:30', amount: 400, type: 'water', logged: true },
    { time: '20:30', amount: 300, type: 'herbal-tea', logged: true }
  ]
};

export const mockHydrationPlan: HydrationPlanData = {
  goalFocus: 'Electrolyte Balance & Recovery',
  schedule: '8 glasses per day',
  currentWeek: 2,
  totalWeeks: 4,
  completionPercentage: 72,
  aiInsight: 'Autopilot increased your hydration target by 300ml due to higher temperature today.',
  lastUpdated: '2h ago',
  dailyTargetMl: 2500,
  dailyStats: [
    mondayHydration,
    tuesdayHydration,
    wednesdayHydration,
    thursdayHydration,
    fridayHydration,
    saturdayHydration,
    sundayHydration
  ],
  progress: {
    consistencyScore: 82,
    avgDailyIntake: 2400,
    missedDays: 1,
    streakDays: 5,
    recoveryImpact: '+5% energy boost',
    weeklyTrend: 6
  },
  isGenerated: true,
  reminderFrequency: 'every-2-hours'
};
