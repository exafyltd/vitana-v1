import { useMemo } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { getJourneyStage, JourneyWave, JOURNEY_WAVES } from '@/config/journeyWaves';
import { CalendarEvent } from '@/hooks/useCalendarEvents';

export interface JourneyProgress {
  dayNumber: number;
  wave: JourneyWave;
  waveProgress: number;
  totalProgress: number;
  isActive: boolean;
}

export function useJourneyProgress(events?: CalendarEvent[]): JourneyProgress | null {
  const { user } = useAuth();

  return useMemo(() => {
    // Try computing from registration date first
    if (user?.created_at) {
      const registrationDate = new Date(user.created_at);
      const stage = getJourneyStage(registrationDate);
      if (stage) return { ...stage, isActive: true };
    }

    // Fallback: if there are active autopilot events, show progress based on completion ratio
    if (events && events.length > 0) {
      const autopilotEvents = events.filter(e => e.event_type === 'autopilot');
      if (autopilotEvents.length > 0) {
        const completed = autopilotEvents.filter(e => e.completion_status === 'completed').length;
        const totalProgress = Math.round((completed / autopilotEvents.length) * 100);

        return {
          dayNumber: 0,
          wave: JOURNEY_WAVES[0],
          waveProgress: totalProgress,
          totalProgress,
          isActive: true,
        };
      }
    }

    return null;
  }, [user?.created_at, events]);
}

export function bundleOnboardingPlan(todayEvents: CalendarEvent[]): {
  tasks: CalendarEvent[];
  totalMinutes: number;
  completedCount: number;
  totalCount: number;
} | null {
  const allAutopilot = todayEvents.filter(e => e.event_type === 'autopilot');
  if (allAutopilot.length === 0) return null;

  const incomplete = allAutopilot.filter(
    e => e.status !== 'cancelled' && e.completion_status !== 'completed'
  );
  const completedCount = allAutopilot.filter(
    e => e.completion_status === 'completed'
  ).length;

  return {
    tasks: incomplete,
    totalMinutes: incomplete.length * 5,
    completedCount,
    totalCount: allAutopilot.length,
  };
}
