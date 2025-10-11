import { AutopilotAction } from '@/types/autopilot';

export type GreetingMessageType = 
  | 'welcome'
  | 'reminder'
  | 'motivation'
  | 'recommendation'
  | 'inspiration'
  | 'celebration';

export interface GreetingContext {
  firstName?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  pendingActions?: AutopilotAction[];
  upcomingAppointments?: Array<{ title: string; time: string }>;
  healthScoreChange?: number;
  achievements?: string[];
}

export interface GreetingMessage {
  text: string;
  type: GreetingMessageType;
  priority: 'high' | 'medium' | 'low';
}

const getTimeGreeting = (timeOfDay: string): string => {
  switch (timeOfDay) {
    case 'morning': return 'Good morning';
    case 'afternoon': return 'Good afternoon';
    case 'evening': return 'Good evening';
    default: return 'Hello';
  }
};

export const generateGreetingMessage = (context: GreetingContext): GreetingMessage => {
  const { firstName, timeOfDay, pendingActions, upcomingAppointments, healthScoreChange, achievements } = context;
  const name = firstName || 'there';
  const timeGreeting = getTimeGreeting(timeOfDay);

  // Priority 1: Urgent appointments (within 24h)
  if (upcomingAppointments && upcomingAppointments.length > 0) {
    const apt = upcomingAppointments[0];
    return {
      text: `${timeGreeting} ${name}. Don't forget your ${apt.title} at ${apt.time}.`,
      type: 'reminder',
      priority: 'high'
    };
  }

  // Priority 2: Pending autopilot actions
  if (pendingActions && pendingActions.length > 0) {
    const count = pendingActions.length;
    const actionText = count === 1 ? 'action' : 'actions';
    return {
      text: `${timeGreeting} ${name}! You have ${count} health ${actionText} ready in your Autopilot.`,
      type: 'reminder',
      priority: 'medium'
    };
  }

  // Priority 3: Health score improvements (motivation)
  if (healthScoreChange && healthScoreChange > 0) {
    return {
      text: `${timeGreeting} ${name}! Your Vitana score improved by ${healthScoreChange} points since your last visit.`,
      type: 'motivation',
      priority: 'medium'
    };
  }

  // Priority 4: Achievements (celebration)
  if (achievements && achievements.length > 0) {
    return {
      text: `${timeGreeting} ${name}! Congratulations on reaching a new milestone: ${achievements[0]}.`,
      type: 'celebration',
      priority: 'medium'
    };
  }

  // Default: Simple welcome
  return {
    text: `${timeGreeting} ${name}! Welcome to Vitana.`,
    type: 'welcome',
    priority: 'low'
  };
};

export const getInspirationalMessage = (timeOfDay: string): string => {
  const messages = {
    morning: [
      "Every morning is a fresh start. Make today count!",
      "Rise and shine! Your health journey continues today.",
      "A healthy morning routine sets the tone for the entire day."
    ],
    afternoon: [
      "Keep your momentum going! Small steps lead to big changes.",
      "Remember to stay hydrated and take short breaks.",
      "You're halfway through the day. Keep up the great work!"
    ],
    evening: [
      "Wind down and reflect on today's achievements.",
      "Good evening! Time to relax and recharge for tomorrow.",
      "Evening is the perfect time to plan for a healthy tomorrow."
    ],
    night: [
      "Good rest is essential for good health. Sleep well!",
      "Quality sleep is the foundation of wellness.",
      "Time to recharge. Tomorrow is another opportunity."
    ]
  };

  const timeMessages = messages[timeOfDay as keyof typeof messages] || messages.morning;
  return timeMessages[Math.floor(Math.random() * timeMessages.length)];
};
