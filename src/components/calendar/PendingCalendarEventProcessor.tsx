import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { listPendingSenderEvents, dequeueBySourceMessageId } from "@/lib/calendarPendingQueue";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { notify } from '@/lib/i18n-toast';

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

        console.log(`Processing ${pending.length} pending calendar events`);

        // Batch process events in parallel for better performance
        const batchSize = 3; // Process 3 events at a time
        for (let i = 0; i < pending.length; i += batchSize) {
          const batch = pending.slice(i, i + batchSize);
          
          await Promise.allSettled(
            batch.map(async (item) => {
              try {
                // Quick UUID validation and cleanup
                if (item.source_message_id) {
                  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.source_message_id);
                  
                  if (isValidUUID) {
                    // Quick check for existing event
                    const { data: existing } = await supabase
                      .from('calendar_events')
                      .select('id')
                      .eq('user_id', user.id)
                      .eq('source_message_id', item.source_message_id)
                      .limit(1)
                      .maybeSingle();
                      
                    if (existing?.id) {
                      dequeueBySourceMessageId(item.source_message_id);
                      return;
                    }
                  } else {
                    console.warn('Invalid source_message_id, cleaning up:', item.source_message_id);
                    item.source_message_id = undefined;
                  }
                }

                // Create the calendar event
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

                // Remove from queue on success
                if (item.source_message_id) {
                  dequeueBySourceMessageId(item.source_message_id);
                }

                console.log(`Successfully processed: ${item.title}`);
              } catch (err) {
                console.error(`Failed to process pending event "${item.title}":`, err);
                // Event stays in queue for retry
              }
            })
          );

          // Small delay between batches to avoid overwhelming the database
          if (i + batchSize < pending.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Single consolidated toast for all processed events
        const remainingPending = listPendingSenderEvents();
        const processedCount = pending.length - remainingPending.length;
        
        if (processedCount > 0) {
          notify('toasts.calendar.calendarUpdated');

          // Smart refresh - only if we actually processed events
          await fetchEvents();
          window.dispatchEvent(new CustomEvent('calendar-events:refresh'));
        }

      } finally {
        processingRef.current = false;
      }
    };

    // Small delay to let the UI settle before processing
    const timeoutId = setTimeout(processQueue, 100);
    return () => clearTimeout(timeoutId);
  }, [user?.id, addEvent, fetchEvents, toast]);

  return null;
}
