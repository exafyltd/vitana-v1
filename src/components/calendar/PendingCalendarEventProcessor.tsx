import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { listPendingSenderEvents, dequeueBySourceMessageId } from "@/lib/calendarPendingQueue";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Processes locally queued sender calendar events after the user signs in.
 * Renders nothing.
 */
export default function PendingCalendarEventProcessor() {
  const { user } = useAuth();
  const { addEvent, fetchEvents } = useCalendarEvents();
  const processingRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    const processQueue = async () => {
      if (!user?.id || processingRef.current) return;
      processingRef.current = true;
      try {
        const pending = listPendingSenderEvents();
        if (pending.length === 0) return;

        for (const item of pending) {
          try {
            // Idempotency: if source_message_id exists and is valid UUID, check if already inserted by THIS user
            if (item.source_message_id) {
              // Check if it's a valid UUID before querying
              const isValidUUID = (uuid: string) => {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                return uuidRegex.test(uuid);
              };

              if (isValidUUID(item.source_message_id)) {
                const { data: existing } = await supabase
                  .from('calendar_events')
                  .select('id')
                  .eq('user_id', user.id)
                  .eq('source_message_id', item.source_message_id)
                  .limit(1)
                  .maybeSingle();
                if (existing?.id) {
                  dequeueBySourceMessageId(item.source_message_id);
                  continue;
                }
              } else {
                // Invalid UUID, remove source_message_id to avoid database errors
                console.warn('Invalid source_message_id in pending event, removing:', item.source_message_id);
                item.source_message_id = undefined;
              }
            }

            await addEvent({
              title: item.title,
              description: item.description ?? undefined,
              start_time: item.start_time,
              end_time: item.end_time ?? undefined,
              location: item.location ?? undefined,
              event_type: (item.event_type ?? 'personal'),
              status: (item.status ?? 'confirmed'),
              priority: (item.priority ?? 'medium'),
              is_recurring: !!item.is_recurring,
              source_type: (item.source_type ?? 'invite'),
              source_message_id: item.source_message_id ?? undefined,
              attendees_count: 0,
              has_rewards: false,
              metadata: { queued: true },
              recurring_pattern: undefined,
            } as any);

            if (item.source_message_id) {
              dequeueBySourceMessageId(item.source_message_id);
            }

            toast({
              title: 'Calendar Updated',
              description: `Added "${item.title}" to your calendar`,
            });
          } catch (err) {
            // Keep in queue on failure, proceed with next
            console.error('Pending calendar event processing failed:', err);
          }
        }

        await fetchEvents();
        window.dispatchEvent(new CustomEvent('calendar-events:refresh'));
      } finally {
        processingRef.current = false;
      }
    };

    processQueue();
  }, [user?.id, addEvent, fetchEvents, toast]);

  return null;
}
