import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
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

// `_eventDetails` is kept so existing callers compile; the calendar entry no
// longer needs it (VTID-04915).
export function useEventParticipation(eventId: string, initialCount: number = 0, _eventDetails?: EventDetails) {
  const [participantCount, setParticipantCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Re-seed when the list hands us a newer count (refetch/realtime), instead
  // of keeping the value from the first render forever (VTID-04907).
  useEffect(() => {
    setParticipantCount(initialCount);
  }, [initialCount]);

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

        // No write to global_community_events.participant_count: members
        // cannot update other people's events (a silent no-op under RLS);
        // counts always come from participant rows (VTID-04907).

        // VTID-04915: the calendar entry is cancelled by the database
        // (trg_event_participation_calendar, VTID-04321) on every leave path.

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

        // VTID-04915: the calendar entry is written by the database
        // (trg_event_participation_calendar, VTID-04321), the same for web,
        // voice and tickets — no second, client-side copy any more.

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
