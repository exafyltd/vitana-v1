/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) fix 1 — the two
 * counts the utility bar's Calendar button shows, read natively (the web
 * `useCalendarEvents` hook is class B):
 *
 *  - upcoming: `getUpcomingEvents(10)` (useCalendarEvents.ts:727-732), the
 *    member's events after now, start-time order, at most 10;
 *  - conflicts: events with `status === 'conflict'`
 *    (UniversalCalendarButton.tsx:48).
 *
 * Same read as the web fetch (useCalendarEvents.ts:121-125): `calendar_events`
 * with `user_id = auth.uid()`, ordered by `start_time` ascending. READS ONLY:
 * none of the hook's add / update / delete / invite paths are wired.
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';

export interface CalendarEventRow {
  id: string;
  start_time: string;
  status?: string | null;
}

export const UPCOMING_LIMIT = 10;

/** getUpcomingEvents(limit) + the conflict count, over rows already in start-time order. */
export function calendarCounts(rows: CalendarEventRow[], now: Date = new Date()): { upcoming: number; conflicts: number } {
  const upcoming = rows.filter((e) => new Date(e.start_time) > now).slice(0, UPCOMING_LIMIT).length;
  const conflicts = rows.filter((e) => e.status === 'conflict').length;
  return { upcoming, conflicts };
}

export function useCalendarCounts(): { upcoming: number; conflicts: number } {
  const { user } = useAuth();
  const userId = user?.id;
  const query = useQuery({
    queryKey: ['calendar_events', 'utility-bar', userId ?? null],
    enabled: !!userId,
    queryFn: async (): Promise<CalendarEventRow[]> => {
      const { data, error } = await getSupabase()
        .from('calendar_events')
        .select('id, start_time, status')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEventRow[];
    },
  });
  return calendarCounts(query.data ?? []);
}
