import { useMemo } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useMyJourney } from '@/hooks/useMyJourney';
import { getJourneyStage, JourneyWave, JOURNEY_WAVES } from '@/config/journeyWaves';
import { CalendarEvent } from '@/hooks/useCalendarEvents';

/** Fallback only, used until /api/v1/my-journey resolves. */
function daysSinceCreated(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

export interface JourneyProgress {
  dayNumber: number;
  wave: JourneyWave;
  waveProgress: number;
  totalProgress: number;
  isActive: boolean;
}

export function useJourneyProgress(events?: CalendarEvent[]): JourneyProgress | null {
  const { user } = useAuth();
  const { data: myJourney } = useMyJourney();

  return useMemo(() => {
    // Canonical day-in-journey (same value the ORB greeting and My Journey
    // ring use) — falls back to raw signup-date math only while
    // /api/v1/my-journey hasn't resolved yet.
    const canonicalDay = myJourney?.journey?.day_in_journey;
    const dayNumber = typeof canonicalDay === 'number'
      ? canonicalDay
      : user?.created_at
        ? daysSinceCreated(user.created_at)
        : null;
    if (dayNumber !== null) {
      const stage = getJourneyStage(dayNumber);
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
  }, [user?.created_at, myJourney?.journey?.day_in_journey, events]);
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
