/**
 * Mock data for AI Intelligence section
 *
 * This file is rendered DIRECTLY in production on /ai, /ai/companion,
 * /ai/insights, /ai/recommendations. The pages were built as a UI
 * prototype with placeholder data — there is no real backend wired yet.
 *
 * Strings are in German because the platform is German-first (Vitanaland
 * community). When real AI-driven data comes from the gateway, the mocks
 * become unused. Until then this avoids leaking English into the German UI.
 *
 * If you change a string here, update the EN equivalent in a comment
 * for future reference.
 */

export const todayActions = [
  {
    id: "act-001",
    label: "15-Minuten-Achtsamkeitssitzung abschließen", // EN: Complete 15-min mindfulness session
    scope: ["mental", "stress"],
    etaMins: 15,
    priority: "high" as const,
    reason: "Dein Stresslevel war gestern erhöht" // EN: Your stress levels were elevated yesterday
  },
  {
    id: "act-002",
    label: "Vor dem Mittag 0,5 Liter Wasser trinken", // EN: Drink 16oz water before noon
    scope: ["hydration"],
    etaMins: 2,
    priority: "medium" as const,
    reason: "Du hängst hinter deinen Hydrations-Zielen zurück" // EN: You're behind on hydration goals
  },
  {
    id: "act-003",
    label: "Folgetermin für Laboruntersuchung planen", // EN: Schedule lab work follow-up
    scope: ["health", "appointments"],
    etaMins: 5,
    priority: "high" as const,
    reason: "Laborergebnisse zur Überprüfung verfügbar" // EN: Lab results available for review
  },
  {
    id: "act-004",
    label: "Abendlicher Spaziergangs-Gruppe beitreten", // EN: Join evening walk group
    scope: ["exercise", "social"],
    etaMins: 30,
    priority: "medium" as const,
    reason: "Perfektes Wetter und dein Schrittezähler ist niedrig" // EN: Perfect weather and your step count is low
  }
];

export const memoryHighlights = [
  {
    title: "Durchbruch bei der Schlafqualität", // EN: Sleep Quality Breakthrough
    body: "Deine Schlafeffizienz hat sich um 23% verbessert, nachdem du die Routine zum Herunterfahren um 22 Uhr eingeführt hast.", // EN: Your sleep efficiency improved 23% after implementing the 10pm wind-down routine.
    rationale: "Dieses Muster zeigte sich aus 3 Wochen konsistenter Daten." // EN: This pattern emerged from 3 weeks of consistent data.
  },
  {
    title: "Erfolgsmuster bei der Hydration", // EN: Hydration Success Pattern
    body: "Hydrations-Sessions am Morgen korrelieren mit 18% besseren kognitiven Leistungswerten.", // EN: Morning hydration sessions correlate with 18% better cognitive performance scores.
    rationale: "Die KI hat diese Korrelation über 45 Datenpunkte hinweg erkannt." // EN: AI detected this correlation across 45 data points.
  },
  {
    title: "Soziale Energie-Verbindung", // EN: Social Energy Connection
    body: "Gruppen-Workouts steigern deine Energie 2x stärker als Solo-Sessions.", // EN: Group workouts boost your energy levels 2x more than solo sessions.
    rationale: "Vergleich der Energie-Bewertungen über 28 Trainings-Sessions hinweg." // EN: Comparing energy ratings across 28 workout sessions.
  }
];

export const contextPulse = {
  timeOfDay: "Morgenhoch" as const, // EN: Morning Peak
  location: "Home-Office", // EN: Home Office
  energy: "high" as const,
  mood: "focused" as const,
  weather: "Sonnig, 22°C", // EN: Sunny, 72°F
  schedule: "3 Meetings, 2 Fokus-Blöcke" // EN: 3 meetings, 2 focus blocks
};

export const inspiration = {
  title: "Morgenmeditation mit Dr. Sarah Chen", // EN: Morning Meditation with Dr. Sarah Chen
  mediaThumbUrl: "/lovable-uploads/dr-roberts-avatar.jpg",
  duration: "12 Min.",
  category: "Geführte Meditation" // EN: Guided Meditation
};

export const lifestylePatterns = [
  "Hydration +12 % diese Woche verbessert", // EN: Hydration improved +12% this week
  "Durchschnittliche Schlafenszeit: 23:20 → 22:50 (Trend nach früher)", // EN: Average bedtime: 23:20 → 22:50 (trending earlier)
  "Schrittezähler-Konsistenz +34 % gegenüber dem letzten Monat", // EN: Step count consistency +34% vs last month
  "Meditations-Serie: 8 Tage stark 🧘‍♀️", // EN: Meditation streak: 8 days strong 🧘‍♀️
  "Soziale Verbindungen: 3 neue bedeutsame Interaktionen" // EN: Social connections: 3 new meaningful interactions
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
  "Gehen ≥ 5.000 Schritte → Schlafqualität +18 %", // EN: Walking ≥5,000 steps → Sleep quality +18%
  "Weniger Koffein nach 14 Uhr → HRV-Verbesserung +9 %", // EN: Less caffeine after 2pm → HRV improvement +9%
  "Morgenmeditation → Stressresilienz +24 %", // EN: Morning meditation → Stress resilience +24%
  "Gruppen-Workouts → Energielevel +31 %", // EN: Group workouts → Energy levels +31%
  "Konstante Bettzeit → Kognitive Leistung +15 %" // EN: Consistent bedtime → Cognitive performance +15%
];

export const recommendations = {
  healthTodos: [
    {
      id: "ht-001",
      title: "Jährliches Check-up mit Dr. Roberts vereinbaren", // EN: Schedule annual physical with Dr. Roberts
      etaMins: 5,
      reason_code: "overdue_checkup",
      priority: "high" as const
    },
    {
      id: "ht-002",
      title: "Stressmanagement-Bewertung abschließen", // EN: Complete stress management assessment
      etaMins: 10,
      reason_code: "elevated_cortisol",
      priority: "medium" as const
    },
    {
      id: "ht-003",
      title: "Notfallkontakt-Informationen aktualisieren", // EN: Update emergency contact information
      etaMins: 3,
      reason_code: "outdated_info",
      priority: "low" as const
    }
  ],
  meetups: [
    {
      id: "mu-001",
      title: "Meditationskreis: Stressresilienz", // EN: Meditation Circle: Stress Resilience
      when: "Heute 19:00 Uhr",
      with: "Sarah Miller + 12 weitere",
      reason_code: "stress_management_focus",
      location: "Gemeindezentrum", // EN: Community Center
      spots: 3
    },
    {
      id: "mu-002",
      title: "Morgen-Lauftreff", // EN: Morning Runners Group
      when: "Morgen 6:30 Uhr",
      with: "Mike Thompson + 8 weitere",
      reason_code: "exercise_accountability",
      location: "Flusspark", // EN: Riverside Park
      spots: 5
    }
  ],
  content: [
    {
      id: "co-001",
      title: "Die Wissenschaft der Schlafoptimierung", // EN: The Science of Sleep Optimization
      mediaThumbUrl: "/lovable-uploads/murphy-avatar.jpg",
      duration: "18 Min.",
      type: "podcast",
      rating: 4.8
    },
    {
      id: "co-002",
      title: "5-Minuten Energie-Yoga", // EN: 5-Minute Energy Boosting Yoga
      mediaThumbUrl: "/lovable-uploads/emma-wilson-avatar.jpg",
      duration: "6 Min.",
      type: "video",
      rating: 4.9
    },
    {
      id: "co-003",
      title: "Hydrations-Tipps für vielbeschäftigte Berufstätige", // EN: Hydration Hacks for Busy Professionals
      mediaThumbUrl: "/lovable-uploads/lisa-chen-avatar.jpg",
      duration: "12 Min.",
      type: "article",
      rating: 4.7
    }
  ],
  services: [
    {
      item_id: "srv-001",
      sku: "MASSAGE-60",
      title: "Tiefengewebsmassage-Therapie", // EN: Deep Tissue Massage Therapy
      provider: "Wellness Spa Downtown",
      price: 89,
      rating: 4.8,
      availability: "Heute 15:00 Uhr"
    },
    {
      item_id: "srv-002",
      sku: "NUTRITION-CONSULT",
      title: "Personalisierte Ernährungsberatung", // EN: Personalized Nutrition Consultation
      provider: "Dr. Lisa Chen, RD",
      price: 125,
      rating: 4.9,
      availability: "Nächste Woche"
    }
  ],
  labs: [
    {
      item_id: "lab-001",
      title: "Umfassendes Stoffwechsel-Panel", // EN: Comprehensive Metabolic Panel
      price: 85,
      provider: "LabCorp",
      rating: 4.6,
      turnaround: "24-48 Stunden"
    },
    {
      item_id: "lab-002",
      title: "Vitamin D & B12-Beurteilung", // EN: Vitamin D & B12 Assessment
      price: 45,
      provider: "Quest Diagnostics",
      rating: 4.7,
      turnaround: "1-2 Tage"
    }
  ]
};

export const summary = {
  recap: [
    "Autopilot hat 1 Meeting verlegt, um die Fokuszeit zu optimieren", // EN: Autopilot rescheduled 1 meeting to optimize focus time
    "Du bist der Gruppe 'Besser Schlafen Community' beigetreten (47 Mitglieder)", // EN: You joined 'Better Sleep Community' group (47 members)
    "3 von 4 geplanten Wellness-Aufgaben abgeschlossen", // EN: Completed 3/4 planned wellness tasks
    "Die KI hat ein verbessertes Hydrations-Muster erkannt", // EN: AI detected improved hydration pattern
    "Stresslevel nach Meditationssitzung normalisiert" // EN: Stress levels normalized after meditation session
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
      title: "15-minütiger Morgenspaziergang", // EN: 15-min morning walk
      time: "08:00",
      type: "exercise"
    },
    {
      title: "Erinnerung an Hydrations-Micro-Task", // EN: Hydration micro-task reminder
      time: "10:30",
      type: "hydration"
    },
    {
      title: "Stress-Check-in-Meditation", // EN: Stress check-in meditation
      time: "15:00",
      type: "mental"
    }
  ]
};

export const chat = {
  suggestionChips: [
    "Hydrations-Ziele", // EN: Hydration Goals
    "Schlafoptimierung", // EN: Sleep Optimization
    "Meetup finden", // EN: Find Meetup
    "Labortest buchen", // EN: Book Lab Test
    "Gesundheits-Coach-Sitzung", // EN: Health Coach Session
    "Fortschritt teilen" // EN: Share Progress
  ],
  memoryPeek: [
    { key: "Letzte Laboruntersuchung", value: "12. Mai 2024" }, // EN: Last lab work / May 12, 2024
    { key: "Durchschnittlicher Schlaf", value: "6 Std. 42 Min." }, // EN: Average sleep / 6h 42m
    { key: "Meditations-Serie", value: "8 Tage" }, // EN: Meditation streak / 8 days
    { key: "Hydrations-Ziel", value: "2 Liter täglich" }, // EN: Hydration goal / 64oz daily
    { key: "Nächste Untersuchung", value: "Überfällig" } // EN: Next checkup / Overdue
  ],
  autopilotLog: [
    {
      id: "ap-001",
      action: "14-Uhr-Meeting auf 16 Uhr verschoben", // EN: Rescheduled 2pm meeting to 4pm
      reason: "Energietief-Muster erkannt", // EN: Detected energy dip pattern
      timestamp: "Vor 2 Stunden",
      impact: "Fokuszeit geschützt" // EN: Protected focus time
    },
    {
      id: "ap-002",
      action: "Hydrations-Erinnerung vorgeschlagen", // EN: Suggested hydration reminder
      reason: "Hinter der täglichen Aufnahme zurück", // EN: Behind on daily intake
      timestamp: "Vor 45 Min.",
      impact: "Zielerreichung wahrscheinlich" // EN: Goal achievement likely
    },
    {
      id: "ap-003",
      action: "Meditationsgruppe empfohlen", // EN: Recommended meditation group
      reason: "Stresslevel erhöht", // EN: Stress levels elevated
      timestamp: "Vor 1 Stunde",
      impact: "Soziale Unterstützung + Achtsamkeit" // EN: Social support + mindfulness
    },
    {
      id: "ap-004",
      action: "Morgenroutine optimiert", // EN: Optimized morning routine
      reason: "Analyse der Schlafdaten", // EN: Sleep data analysis
      timestamp: "Heute Morgen",
      impact: "Schlafeffizienz +15 %" // EN: Sleep efficiency +15%
    },
    {
      id: "ap-005",
      action: "Fokuszeit für Wellness blockiert", // EN: Blocked focus time for wellness
      reason: "Kalender-Fragmentierung erkannt", // EN: Calendar fragmentation detected
      timestamp: "Gestern 18:00 Uhr",
      impact: "Überforderung verhindert" // EN: Prevented overwhelm
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
