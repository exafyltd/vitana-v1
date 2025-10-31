export type SleepQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface SleepStage {
  stage: 'deep' | 'light' | 'rem' | 'awake';
  duration: number; // in minutes
  percentage: number;
}

export interface DailySleepData {
  dayId: string;
  day: string; // e.g., "Day 1", "Monday"
  date: string; // ISO date
  duration: string; // e.g., "7h 42m"
  durationMinutes: number;
  sleepScore: number; // 0-100
  quality: SleepQuality;
  bedtime: string; // HH:mm
  wakeTime: string; // HH:mm
  stages: SleepStage[];
  tags: string[]; // e.g., ["Deep Sleep 35%", "REM 25%"]
  aiNote?: string;
  targetDuration: number; // in minutes (e.g., 450 for 7.5h)
}

export interface SleepProgress {
  avgDuration: string; // e.g., "7h 36m"
  avgDurationMinutes: number;
  consistencyScore: number; // 0-100
  consistencyTrend: number; // percentage change
  deepSleepPercentage: number;
  remSleepPercentage: number;
  recoveryImpact: string; // e.g., "+9% energy next day"
  streakDays: number;
}

export interface SleepPlanData {
  goalFocus: string; // e.g., "Deep Sleep & Recovery Balance"
  schedule: string; // e.g., "7.5h avg / night"
  targetBedtime: string; // e.g., "23:00"
  currentWeek: number;
  totalWeeks: number;
  completionPercentage: number;
  aiInsight: string;
  lastUpdated: string; // e.g., "3h ago"
  dailyStats: DailySleepData[];
  progress: SleepProgress;
  isGenerated: boolean;
}
