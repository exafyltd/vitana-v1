/**
 * Mock data for AI Intelligence section
 * Comprehensive data for all AI screens with realistic content
 */

export const todayActions = [
  {
    id: "act-001",
    label: "Complete 15-min mindfulness session",
    scope: ["mental", "stress"],
    etaMins: 15,
    priority: "high" as const,
    reason: "Your stress levels were elevated yesterday"
  },
  {
    id: "act-002", 
    label: "Drink 16oz water before noon",
    scope: ["hydration"],
    etaMins: 2,
    priority: "medium" as const,
    reason: "You're behind on hydration goals"
  },
  {
    id: "act-003",
    label: "Schedule lab work follow-up",
    scope: ["health", "appointments"],
    etaMins: 5,
    priority: "high" as const,
    reason: "Lab results available for review"
  },
  {
    id: "act-004",
    label: "Join evening walk group",
    scope: ["exercise", "social"],
    etaMins: 30,
    priority: "medium" as const,
    reason: "Perfect weather and your step count is low"
  }
];

export const memoryHighlights = [
  {
    title: "Sleep Quality Breakthrough",
    body: "Your sleep efficiency improved 23% after implementing the 10pm wind-down routine.",
    rationale: "This pattern emerged from 3 weeks of consistent data."
  },
  {
    title: "Hydration Success Pattern",
    body: "Morning hydration sessions correlate with 18% better cognitive performance scores.",
    rationale: "AI detected this correlation across 45 data points."
  },
  {
    title: "Social Energy Connection", 
    body: "Group workouts boost your energy levels 2x more than solo sessions.",
    rationale: "Comparing energy ratings across 28 workout sessions."
  }
];

export const contextPulse = {
  timeOfDay: "Morning Peak" as const,
  location: "Home Office",
  energy: "high" as const,
  mood: "focused" as const,
  weather: "Sunny, 72°F",
  schedule: "3 meetings, 2 focus blocks"
};

export const inspiration = {
  title: "Morning Meditation with Dr. Sarah Chen",
  mediaThumbUrl: "/lovable-uploads/dr-roberts-avatar.jpg",
  duration: "12 min",
  category: "Guided Meditation"
};

export const lifestylePatterns = [
  "Hydration improved +12% this week",
  "Average bedtime: 23:20 → 22:50 (trending earlier)",
  "Step count consistency +34% vs last month",
  "Meditation streak: 8 days strong 🧘‍♀️",
  "Social connections: 3 new meaningful interactions"
];

export const indexMovement = {
  vitanaIndex: 72,
  delta: 3,
  trend: "up" as const,
  pillars: {
    sleep: { score: 68, delta: +5 },
    hydration: { score: 74, delta: +2 },
    mental: { score: 70, delta: +1 },
    exercise: { score: 66, delta: +4 },
    nutrition: { score: 65, delta: +1 }
  }
};

export const socialEngagement = {
  newFollowers: 5,
  groupsJoined: 2,
  messagesReceived: 12,
  mentions: 3,
  connections: 7
};

export const productivity = {
  tasksDone: 7,
  tasksPlanned: 9,
  skipped: 2,
  focusMinutes: 185,
  deepWorkSessions: 3
};

export const correlations = [
  "Walking ≥5,000 steps → Sleep quality +18%",
  "Less caffeine after 2pm → HRV improvement +9%", 
  "Morning meditation → Stress resilience +24%",
  "Group workouts → Energy levels +31%",
  "Consistent bedtime → Cognitive performance +15%"
];

export const recommendations = {
  healthTodos: [
    {
      id: "ht-001",
      title: "Schedule annual physical with Dr. Roberts",
      etaMins: 5,
      reason_code: "overdue_checkup",
      priority: "high" as const
    },
    {
      id: "ht-002", 
      title: "Complete stress management assessment",
      etaMins: 10,
      reason_code: "elevated_cortisol",
      priority: "medium" as const
    },
    {
      id: "ht-003",
      title: "Update emergency contact information",
      etaMins: 3,
      reason_code: "outdated_info", 
      priority: "low" as const
    }
  ],
  meetups: [
    {
      id: "mu-001",
      title: "Meditation Circle: Stress Resilience",
      when: "Today 7:00 PM",
      with: "Sarah Miller + 12 others",
      reason_code: "stress_management_focus",
      location: "Community Center",
      spots: 3
    },
    {
      id: "mu-002",
      title: "Morning Runners Group", 
      when: "Tomorrow 6:30 AM",
      with: "Mike Thompson + 8 others",
      reason_code: "exercise_accountability",
      location: "Riverside Park",
      spots: 5
    }
  ],
  content: [
    {
      id: "co-001",
      title: "The Science of Sleep Optimization",
      mediaThumbUrl: "/lovable-uploads/murphy-avatar.jpg",
      duration: "18 min",
      type: "podcast",
      rating: 4.8
    },
    {
      id: "co-002",
      title: "5-Minute Energy Boosting Yoga",
      mediaThumbUrl: "/lovable-uploads/emma-wilson-avatar.jpg",
      duration: "6 min",
      type: "video",
      rating: 4.9
    },
    {
      id: "co-003",
      title: "Hydration Hacks for Busy Professionals",
      mediaThumbUrl: "/lovable-uploads/lisa-chen-avatar.jpg", 
      duration: "12 min",
      type: "article",
      rating: 4.7
    }
  ],
  services: [
    {
      item_id: "srv-001",
      sku: "MASSAGE-60",
      title: "Deep Tissue Massage Therapy",
      provider: "Wellness Spa Downtown",
      price: 89,
      rating: 4.8,
      availability: "Today 3:00 PM"
    },
    {
      item_id: "srv-002", 
      sku: "NUTRITION-CONSULT",
      title: "Personalized Nutrition Consultation",
      provider: "Dr. Lisa Chen, RD",
      price: 125,
      rating: 4.9,
      availability: "Next week"
    }
  ],
  labs: [
    {
      item_id: "lab-001",
      title: "Comprehensive Metabolic Panel",
      price: 85,
      provider: "LabCorp",
      rating: 4.6,
      turnaround: "24-48 hours"
    },
    {
      item_id: "lab-002",
      title: "Vitamin D & B12 Assessment", 
      price: 45,
      provider: "Quest Diagnostics",
      rating: 4.7,
      turnaround: "1-2 days"
    }
  ]
};

export const summary = {
  recap: [
    "Autopilot rescheduled 1 meeting to optimize focus time",
    "You joined 'Better Sleep Community' group (47 members)", 
    "Completed 3/4 planned wellness tasks",
    "AI detected improved hydration pattern",
    "Stress levels normalized after meditation session"
  ],
  moodEnergy: {
    mood: "focused" as const,
    energy: "medium" as const,
    stress: "low" as const,
    confidence: "high" as const
  },
  vitanaScore: {
    today: 72,
    yesterday: 69,
    pillars: {
      sleep: 68,
      hydration: 74,
      mental: 70,
      exercise: 66,
      nutrition: 65
    }
  },
  socialPulse: {
    messages: 9,
    mentions: 3,
    newConnections: 2,
    groupActivity: "high"
  },
  tomorrow: [
    {
      title: "15-min morning walk",
      time: "08:00",
      type: "exercise"
    },
    {
      title: "Hydration micro-task reminder", 
      time: "10:30",
      type: "hydration"
    },
    {
      title: "Stress check-in meditation",
      time: "15:00", 
      type: "mental"
    }
  ]
};

export const chat = {
  suggestionChips: [
    "Hydration Goals",
    "Sleep Optimization", 
    "Find Meetup",
    "Book Lab Test",
    "Health Coach Session",
    "Share Progress"
  ],
  memoryPeek: [
    { key: "Last lab work", value: "May 12, 2024" },
    { key: "Average sleep", value: "6h 42m" },
    { key: "Meditation streak", value: "8 days" },
    { key: "Hydration goal", value: "64oz daily" },
    { key: "Next checkup", value: "Overdue" }
  ],
  autopilotLog: [
    {
      id: "ap-001",
      action: "Rescheduled 2pm meeting to 4pm",
      reason: "Detected energy dip pattern",
      timestamp: "2 hours ago",
      impact: "Protected focus time"
    },
    {
      id: "ap-002",
      action: "Suggested hydration reminder", 
      reason: "Behind on daily intake",
      timestamp: "45 min ago",
      impact: "Goal achievement likely"
    },
    {
      id: "ap-003",
      action: "Recommended meditation group",
      reason: "Stress levels elevated", 
      timestamp: "1 hour ago",
      impact: "Social support + mindfulness"
    },
    {
      id: "ap-004",
      action: "Optimized morning routine",
      reason: "Sleep data analysis",
      timestamp: "This morning",
      impact: "Sleep efficiency +15%"
    },
    {
      id: "ap-005",
      action: "Blocked focus time for wellness",
      reason: "Calendar fragmentation detected",
      timestamp: "Yesterday 6pm",
      impact: "Prevented overwhelm"
    }
  ]
};

// Utility functions for consistent data formatting
export const formatTimeEstimate = (mins: number): string => {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
};

export const getPriorityColor = (priority: "high" | "medium" | "low"): string => {
  switch (priority) {
    case "high": return "text-destructive";
    case "medium": return "text-calendar-accent";
    case "low": return "text-muted-foreground";
    default: return "text-muted-foreground";
  }
};

export const getMoodEmoji = (mood: string): string => {
  const moodMap: Record<string, string> = {
    focused: "🎯",
    calm: "😌", 
    tired: "😴",
    energetic: "⚡",
    stressed: "😰",
    happy: "😊",
    neutral: "😐"
  };
  return moodMap[mood] || "🙂";
};

export const getEnergyColor = (energy: "low" | "medium" | "high"): string => {
  switch (energy) {
    case "high": return "text-calendar-success";
    case "medium": return "text-calendar-accent";  
    case "low": return "text-calendar-secondary";
    default: return "text-muted-foreground";
  }
};