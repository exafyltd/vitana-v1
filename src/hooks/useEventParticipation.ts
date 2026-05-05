import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useAuth } from "@/context/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notify, notifyError } from '@/lib/i18n-toast';

interface EventParticipation {
  eventId: string;
  isParticipating: boolean;
  participantCount: number;
}

export interface EventDetails {
  title: string;
  start_time: string;
  end_time?: string | null;
  location?: string;
  slug?: string;
  description?: string;
}

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function useEventParticipation(eventId: string, initialCount: number = 0, eventDetails?: EventDetails) {
  const [participantCount, setParticipantCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { addEvent, removeEvent } = useCalendarEvents();
  const queryClient = useQueryClient();

  const participationQueryKey = ['event-participation', eventId, user?.id];

  // Cached participation check — survives unmount/remount
  const { data: participationData, isLoading: checking } = useQuery({
    queryKey: participationQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_event_participants')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking participation:', error);
        return { isParticipating: false };
      }

      return { isParticipating: !!data && data.status === 'attending' };
    },
    enabled: !!eventId && isValidUUID(eventId) && !!user?.id && !!session,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const isParticipating = participationData?.isParticipating ?? false;

  // Subscribe to real-time participant changes.
  // Updates BOTH participantCount AND isParticipating for the current user.
  useEffect(() => {
    if (!eventId || !isValidUUID(eventId)) return;

    const channel = supabase
      .channel(`event-participants-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_event_participants',
          filter: `event_id=eq.${eventId}`
        },
        async () => {
          const { data, error } = await supabase
            .from('global_event_participants')
            .select('*', { count: 'exact' })
            .eq('event_id', eventId)
            .eq('status', 'attending');

          if (!error && data !== null) {
            setParticipantCount(data.length);

            // Also update isParticipating for the current user
            if (user?.id) {
              const userIsAttending = data.some(
                (row: any) => row.user_id === user.id
              );
              queryClient.setQueryData(participationQueryKey, { isParticipating: userIsAttending });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, user?.id]);

  const toggleParticipation = async () => {
    if (loading || checking || !isValidUUID(eventId)) return;

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notifyError('toasts.hooks.authenticationRequired', 'toasts.hooks.pleaseLogJoinEvents');
        return;
      }

      if (isParticipating) {
        // Leave event - delete from global_event_participants
        const { error } = await supabase
          .from('global_event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        if (error) throw error;

        // Sync participant_count on the event row
        await supabase
          .from('global_community_events')
          .update({ participant_count: Math.max(0, participantCount - 1) })
          .eq('id', eventId);

        // Also remove matching calendar event
        try {
          const { data: calendarEvents } = await supabase
            .from('calendar_events')
            .select('id, metadata')
            .eq('user_id', user.id);

          if (calendarEvents) {
            const matchingEvent = calendarEvents.find((ce: any) => {
              const meta = ce.metadata;
              return meta && typeof meta === 'object' && (meta as any).meetup_id === eventId;
            });
            if (matchingEvent) {
              await removeEvent(matchingEvent.id);
            }
          }
        } catch (calError) {
          console.error('Error removing calendar event:', calError);
        }

        queryClient.setQueryData(participationQueryKey, { isParticipating: false });
        setParticipantCount(prev => Math.max(0, prev - 1));
        
        notify('toasts.hooks.leftEvent', 'toasts.hooks.youVeSuccessfullyLeftThisEvent');
      } else {
        // Join event - insert into global_event_participants
        const { error } = await supabase
          .from('global_event_participants')
          .upsert(
            {
              event_id: eventId,
              user_id: user.id,
              status: 'attending'
            },
            { onConflict: 'event_id,user_id' }
          );

        if (error) throw error;

        // Sync participant_count on the event row
        await supabase
          .from('global_community_events')
          .update({ participant_count: participantCount + 1 })
          .eq('id', eventId);

        // Also add to VITANA Smart Calendar if event details provided
        if (eventDetails) {
          try {
            await addEvent({
              user_id: '',
              title: eventDetails.title,
              description: eventDetails.description || '',
              start_time: eventDetails.start_time,
              end_time: eventDetails.end_time,
              location: eventDetails.location || '',
              event_type: 'community' as const,
              status: 'confirmed' as const,
              priority: 'medium' as const,
              is_recurring: false,
              source_type: 'manual' as const,
              metadata: {
                meetup_id: eventId,
                meetup_slug: eventDetails.slug,
              }
            }, { showToast: false });
          } catch (calError) {
            console.error('Error adding calendar event:', calError);
          }
        }

        queryClient.setQueryData(participationQueryKey, { isParticipating: true });
        setParticipantCount(prev => prev + 1);
        
        notify('toasts.hooks.joinedEvent');
      }
    } catch (error: any) {
      console.error('Error toggling participation:', error);
      notifyError('toasts.hooks.error');
    } finally {
      setLoading(false);
    }
  };

  return {
    isParticipating,
    participantCount,
    loading,
    checking,
    toggleParticipation
  };
}
