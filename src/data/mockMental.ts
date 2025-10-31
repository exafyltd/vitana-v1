import { MentalPlanData } from "@/types/mental";

export const mockMentalPlan: MentalPlanData = {
  isGenerated: true,
  goal: "Stress Regulation & Cognitive Clarity",
  schedule: "10 min daily reflection",
  progressText: "Week 2 of 4",
  completion: 72,
  aiInsight: "Autopilot reduced your reflection duration to 8 min for better consistency.",
  lastUpdated: "2h ago",
  coachMessage: "Remember – consistency beats intensity. Short mindful moments count.",
  dailyStats: [
    {
      dayId: "day-1",
      dayName: "Mon",
      mood: "Balanced",
      moodEmoji: "🙂",
      focusScore: 88,
      stressLevel: 22,
      mindfulnessDuration: "12 min",
      mindfulnessMinutes: 12,
      aiNote: "Focus sessions +1 today",
      tags: ["Breathwork Done", "Reflection Completed"]
    },
    {
      dayId: "day-2",
      dayName: "Tue",
      mood: "Calm",
      moodEmoji: "😊",
      focusScore: 92,
      stressLevel: 18,
      mindfulnessDuration: "10 min",
      mindfulnessMinutes: 10,
      aiNote: "Excellent mindfulness consistency",
      tags: ["Breathwork Done", "Calm Playlist Played"]
    },
    {
      dayId: "day-3",
      dayName: "Wed",
      mood: "Neutral",
      moodEmoji: "😐",
      focusScore: 76,
      stressLevel: 35,
      mindfulnessDuration: "7 min",
      mindfulnessMinutes: 7,
      aiNote: "Try journaling before sleep",
      tags: ["Reflection Completed"]
    },
    {
      dayId: "day-4",
      dayName: "Thu",
      mood: "Tired",
      moodEmoji: "😞",
      focusScore: 65,
      stressLevel: 48,
      mindfulnessDuration: "5 min",
      mindfulnessMinutes: 5,
      aiNote: "Consider adding short recovery breaks",
      tags: ["Breathwork Done"]
    },
    {
      dayId: "day-5",
      dayName: "Fri",
      mood: "Balanced",
      moodEmoji: "🙂",
      focusScore: 85,
      stressLevel: 25,
      mindfulnessDuration: "9 min",
      mindfulnessMinutes: 9,
      aiNote: "Recovery improving",
      tags: ["Breathwork Done", "Reflection Completed"]
    },
    {
      dayId: "day-6",
      dayName: "Sat",
      mood: "Calm",
      moodEmoji: "😊",
      focusScore: 90,
      stressLevel: 20,
      mindfulnessDuration: "15 min",
      mindfulnessMinutes: 15,
      aiNote: "Extended practice paying off",
      tags: ["Breathwork Done", "Calm Playlist Played", "Reflection Completed"]
    },
    {
      dayId: "day-7",
      dayName: "Sun",
      mood: "Rested",
      moodEmoji: "😌",
      focusScore: 93,
      stressLevel: 15,
      mindfulnessDuration: "20 min",
      mindfulnessMinutes: 20,
      aiNote: "Peak mental clarity achieved",
      tags: ["Breathwork Done", "Reflection Completed", "Calm Playlist Played"]
    }
  ],
  progress: {
    avgMoodIndex: "😊 7.8 / 10",
    focusStability: "86%",
    focusStabilityTrend: "+6%",
    stressRecovery: "+12%",
    mindfulnessStreak: 9
  }
};
