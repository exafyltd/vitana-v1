import { useActivityLogger } from "@/hooks/useActivityLogger";

export function useCalendarEventLogger() {
  const { logActivity } = useActivityLogger();

  const logEventCreate = async (eventData: any) => {
    await logActivity({
      activityType: 'calendar.create',
      activityData: {
        title: eventData.title,
        event_type: eventData.event_type,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
      },
      dedupeKey: `calendar-create-${Date.now()}`,
    });
  };

  const logEventUpdate = async (eventId: string, eventData: any) => {
    await logActivity({
      activityType: 'calendar.update',
      activityData: {
        event_id: eventId,
        title: eventData.title,
        changes: eventData.changes || {},
      },
      dedupeKey: `calendar-update-${eventId}-${Date.now()}`,
    });
  };

  const logEventDelete = async (eventId: string, eventTitle: string) => {
    await logActivity({
      activityType: 'calendar.delete',
      activityData: {
        event_id: eventId,
        title: eventTitle,
      },
      dedupeKey: `calendar-delete-${eventId}-${Date.now()}`,
    });
  };

  const logEventRespond = async (eventId: string, response: 'accept' | 'decline' | 'maybe') => {
    await logActivity({
      activityType: 'calendar.respond',
      activityData: {
        event_id: eventId,
        response,
      },
      dedupeKey: `calendar-respond-${eventId}-${Date.now()}`,
    });
  };

  return {
    logEventCreate,
    logEventUpdate,
    logEventDelete,
    logEventRespond,
  };
}
