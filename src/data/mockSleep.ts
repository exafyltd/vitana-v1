import { DailySleepData, SleepPlanData } from '@/types/sleep';

// Monday
const mondaySleep: DailySleepData = {
  dayId: 'monday-sleep-1',
  day: 'Day 1',
  date: '2025-01-06',
  duration: '7h 42m',
  durationMinutes: 462,
  sleepScore: 87,
  quality: 'good',
  bedtime: '22:45',
  wakeTime: '06:27',
  stages: [
    { stage: 'deep', duration: 162, percentage: 35 },
    { stage: 'light', duration: 185, percentage: 40 },
    { stage: 'rem', duration: 115, percentage: 25 }
  ],
  tags: ['Deep Sleep 35%', 'REM 25%', 'Consistency +12%'],
  aiNote: 'Excellent circadian stability today.',
  targetDuration: 450
};

// Tuesday
const tuesdaySleep: DailySleepData = {
  dayId: 'tuesday-sleep-1',
  day: 'Day 2',
  date: '2025-01-07',
  duration: '6h 55m',
  durationMinutes: 415,
  sleepScore: 73,
  quality: 'fair',
  bedtime: '23:30',
  wakeTime: '06:25',
  stages: [
    { stage: 'deep', duration: 125, percentage: 30 },
    { stage: 'light', duration: 207, percentage: 50 },
    { stage: 'rem', duration: 83, percentage: 20 }
  ],
  tags: ['Below Target', 'Late Bedtime'],
  aiNote: 'AI suggests earlier wind-down routine.',
  targetDuration: 450
};

// Wednesday
const wednesdaySleep: DailySleepData = {
  dayId: 'wednesday-sleep-1',
  day: 'Day 3',
  date: '2025-01-08',
  duration: '8h 10m',
  durationMinutes: 490,
  sleepScore: 92,
  quality: 'excellent',
  bedtime: '22:30',
  wakeTime: '06:40',
  stages: [
    { stage: 'deep', duration: 176, percentage: 36 },
    { stage: 'light', duration: 196, percentage: 40 },
    { stage: 'rem', duration: 118, percentage: 24 }
  ],
  tags: ['Deep Sleep 36%', 'Optimal Duration', 'Great Recovery'],
  aiNote: 'Perfect sleep architecture — great job!',
  targetDuration: 450
};

// Thursday
const thursdaySleep: DailySleepData = {
  dayId: 'thursday-sleep-1',
  day: 'Day 4',
  date: '2025-01-09',
  duration: '7h 30m',
  durationMinutes: 450,
  sleepScore: 84,
  quality: 'good',
  bedtime: '22:50',
  wakeTime: '06:20',
  stages: [
    { stage: 'deep', duration: 144, percentage: 32 },
    { stage: 'light', duration: 189, percentage: 42 },
    { stage: 'rem', duration: 117, percentage: 26 }
  ],
  tags: ['On Target', 'Good REM'],
  targetDuration: 450
};

// Friday
const fridaySleep: DailySleepData = {
  dayId: 'friday-sleep-1',
  day: 'Day 5',
  date: '2025-01-10',
  duration: '7h 50m',
  durationMinutes: 470,
  sleepScore: 90,
  quality: 'excellent',
  bedtime: '22:35',
  wakeTime: '06:25',
  stages: [
    { stage: 'deep', duration: 165, percentage: 35 },
    { stage: 'light', duration: 188, percentage: 40 },
    { stage: 'rem', duration: 117, percentage: 25 }
  ],
  tags: ['Deep Sleep 35%', 'Consistent Timing'],
  aiNote: 'Sleep consistency improved — keep it up!',
  targetDuration: 450
};

// Saturday
const saturdaySleep: DailySleepData = {
  dayId: 'saturday-sleep-1',
  day: 'Day 6',
  date: '2025-01-11',
  duration: '8h 5m',
  durationMinutes: 485,
  sleepScore: 94,
  quality: 'excellent',
  bedtime: '23:10',
  wakeTime: '07:15',
  stages: [
    { stage: 'deep', duration: 175, percentage: 36 },
    { stage: 'light', duration: 194, percentage: 40 },
    { stage: 'rem', duration: 116, percentage: 24 }
  ],
  tags: ['Weekend Rest', 'Deep Sleep 36%', 'Recovery Day'],
  aiNote: 'Excellent weekend recovery sleep.',
  targetDuration: 450
};

// Sunday
const sundaySleep: DailySleepData = {
  dayId: 'sunday-sleep-1',
  day: 'Day 7',
  date: '2025-01-12',
  duration: '7h 10m',
  durationMinutes: 430,
  sleepScore: 79,
  quality: 'good',
  bedtime: '23:45',
  wakeTime: '06:55',
  stages: [
    { stage: 'deep', duration: 129, percentage: 30 },
    { stage: 'light', duration: 189, percentage: 44 },
    { stage: 'rem', duration: 112, percentage: 26 }
  ],
  tags: ['Slightly Short', 'Prepare for Week'],
  targetDuration: 450
};

export const mockSleepPlan: SleepPlanData = {
  goalFocus: 'Deep Sleep & Recovery Balance',
  schedule: '7.5h avg / night',
  targetBedtime: '23:00',
  currentWeek: 3,
  totalWeeks: 4,
  completionPercentage: 68,
  aiInsight: 'Autopilot shifted your target bedtime by 15min earlier to improve deep sleep ratio.',
  lastUpdated: '3h ago',
  dailyStats: [
    mondaySleep,
    tuesdaySleep,
    wednesdaySleep,
    thursdaySleep,
    fridaySleep,
    saturdaySleep,
    sundaySleep
  ],
  progress: {
    avgDuration: '7h 36m',
    avgDurationMinutes: 456,
    consistencyScore: 88,
    consistencyTrend: 4,
    deepSleepPercentage: 32,
    remSleepPercentage: 24,
    recoveryImpact: '+9% energy next day',
    streakDays: 5
  },
  isGenerated: true
};
