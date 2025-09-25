import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EventParticipation {
  eventId: string;
  isParticipating: boolean;
  participantCount: number;
}

export function useEventParticipation(eventId: string, initialCount: number = 0) {
  const [isParticipating, setIsParticipating] = useState(false);
  const [participantCount, setParticipantCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check if user is already participating
  useEffect(() => {
    const checkParticipation = async () => {
      if (!eventId) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('global_event_participants')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .eq('status', 'attending')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking participation:', error);
          return;
        }

        setIsParticipating(!!data);
      } catch (error) {
        console.error('Error checking participation:', error);
      }
    };

    checkParticipation();
  }, [eventId]);

  // Subscribe to real-time participant count updates
  useEffect(() => {
    if (!eventId) return;

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
        async (payload) => {
          // Refetch participant count
          const { data, error } = await supabase
            .from('global_event_participants')
            .select('*', { count: 'exact' })
            .eq('event_id', eventId)
            .eq('status', 'attending');

          if (!error && data !== null) {
            setParticipantCount(data.length);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const toggleParticipation = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to join events",
          variant: "destructive"
        });
        return;
      }

      if (isParticipating) {
        // Leave event
        const { error } = await supabase
          .from('global_event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsParticipating(false);
        setParticipantCount(prev => Math.max(0, prev - 1));
        
        toast({
          title: "Left Event",
          description: "You've successfully left this event"
        });
      } else {
        // Join event
        const { error } = await supabase
          .from('global_event_participants')
          .insert({
            event_id: eventId,
            user_id: user.id,
            status: 'attending'
          });

        if (error) throw error;

        setIsParticipating(true);
        setParticipantCount(prev => prev + 1);
        
        toast({
          title: "Joined Event! 🎉",
          description: "You've successfully joined this event"
        });
      }
    } catch (error: any) {
      console.error('Error toggling participation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update participation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    isParticipating,
    participantCount,
    loading,
    toggleParticipation
  };
}