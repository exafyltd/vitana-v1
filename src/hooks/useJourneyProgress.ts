import { useMemo } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { getJourneyStage, JourneyWave } from '@/config/journeyWaves';
import { CalendarEvent } from '@/hooks/useCalendarEvents';

export interface JourneyProgress {
  dayNumber: number;
  wave: JourneyWave;
  waveProgress: number;
  totalProgress: number;
  isActive: boolean;
}

export function useJourneyProgress(): JourneyProgress | null {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user?.created_at) return null;
    const registrationDate = new Date(user.created_at);
    const stage = getJourneyStage(registrationDate);
    if (!stage) return null;
    return { ...stage, isActive: true };
  }, [user?.created_at]);
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
