export interface DailyMentalData {
  dayId: string;
  dayName: string;
  mood: string;
  moodEmoji: string;
  focusScore: number;
  stressLevel: number;
  mindfulnessDuration: string;
  mindfulnessMinutes: number;
  aiNote: string;
  tags: string[];
}

export interface MentalProgress {
  avgMoodIndex: string;
  focusStability: string;
  focusStabilityTrend: string;
  stressRecovery: string;
  mindfulnessStreak: number;
}

export interface MentalPlanData {
  isGenerated: boolean;
  goal: string;
  schedule: string;
  progressText: string;
  completion: number;
  aiInsight: string;
  lastUpdated: string;
  dailyStats: DailyMentalData[];
  progress: MentalProgress;
  coachMessage?: string;
}
