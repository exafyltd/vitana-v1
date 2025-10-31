export type HydrationReminderFrequency = 'hourly' | 'every-2-hours' | 'custom';
export type HydrationUnit = 'ml' | 'oz' | 'glasses';

export interface HydrationIntake {
  time: string; // HH:mm format
  amount: number; // in ml
  type: 'water' | 'electrolyte' | 'herbal-tea' | 'coconut-water' | 'sports-drink';
  logged: boolean;
}

export interface DailyHydrationData {
  dayId: string;
  day: string; // e.g., "Day 1", "Monday"
  date: string; // ISO date
  targetAmount: number; // in ml
  currentAmount: number; // in ml
  intakes: HydrationIntake[];
  nextReminder: string; // e.g., "Next glass in 45 min"
  tags: string[]; // e.g., ["Electrolytes", "Post-Workout"]
  aiNote?: string;
  completionPercentage: number;
}

export interface HydrationProgress {
  consistencyScore: number; // 0-100
  avgDailyIntake: number; // in ml
  missedDays: number;
  streakDays: number;
  recoveryImpact: string; // e.g., "+5% energy boost"
  weeklyTrend: number; // percentage change vs last week
}

export interface HydrationPlanData {
  goalFocus: string; // e.g., "Electrolyte Balance & Recovery"
  schedule: string; // e.g., "8 glasses per day" or "2.4L target"
  currentWeek: number;
  totalWeeks: number;
  completionPercentage: number;
  aiInsight: string;
  lastUpdated: string; // e.g., "2h ago"
  dailyTargetMl: number;
  dailyStats: DailyHydrationData[];
  progress: HydrationProgress;
  isGenerated: boolean;
  reminderFrequency: HydrationReminderFrequency;
}
