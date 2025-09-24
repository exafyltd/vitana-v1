import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  location?: string | null;
  event_type: 'personal' | 'community' | 'professional' | 'health' | 'workout' | 'nutrition';
  status: 'confirmed' | 'pending' | 'conflict' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  is_recurring: boolean;
  recurring_pattern?: any;
  attendees_count?: number | null;
  has_rewards?: boolean | null;
  metadata?: any;
  source_message_id?: string | null;
  source_type?: 'manual' | 'invite' | 'imported';
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CalendarInviteResponse {
  id: string;
  message_id: string;
  user_id: string;
  event_id?: string | null;
  response: 'accepted' | 'declined' | 'maybe' | 'pending';
  responded_at: string;
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user's calendar events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Cast the data to match our interface
      setEvents((data || []) as CalendarEvent[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch calendar events';
      setError(errorMessage);
      console.error('Error fetching calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new calendar event
  const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          ...eventData,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setEvents(prev => [...prev, data as CalendarEvent]);
      
      toast({
        title: 'Event Added',
        description: `"${eventData.title}" has been added to your calendar`,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add calendar event';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Update an existing calendar event
  const updateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, ...data } as CalendarEvent : event
      ));

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update calendar event';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Remove a calendar event
  const removeEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));
      
      toast({
        title: 'Event Removed',
        description: 'Event has been removed from your calendar',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove calendar event';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Handle calendar invite response
  const respondToInvite = async (
    messageId: string, 
    response: 'accepted' | 'declined' | 'maybe' | 'accept' | 'decline',
    eventData?: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const normalized = (response === 'accept' ? 'accepted' : response === 'decline' ? 'declined' : response) as 'accepted' | 'declined' | 'maybe';

      console.log('📅 Responding to calendar invite:', { messageId, response, normalized, eventData });

      // Always record the invite response first
      const { error: responseError } = await supabase
        .from('calendar_invite_responses')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          event_id: null, // Will be updated if event creation succeeds
          response: normalized,
          responded_at: new Date().toISOString()
        }, {
          onConflict: 'message_id,user_id'
        });

      if (responseError) {
        console.error('❌ Failed to record invite response:', responseError.code, responseError);
        
        // Fallback: try direct update if upsert fails with duplicate key
        if (responseError.code === '23505') {
          const { error: updateError } = await supabase
            .from('calendar_invite_responses')
            .update({ 
              response: normalized, 
              responded_at: new Date().toISOString(),
              event_id: null 
            })
            .eq('message_id', messageId)
            .eq('user_id', user.id);
          
          if (updateError) {
            console.error('❌ Fallback update also failed:', updateError);
            throw updateError;
          }
        } else {
          throw responseError;
        }
      }

      console.log('✅ Invite response recorded successfully');

      let eventId: string | undefined;

      // If accepting the invite, create the calendar event
      if (normalized === 'accepted' && eventData) {
        try {
          console.log('📝 Creating calendar event for accepted invite:', eventData);
          
          // Validate and clean event data
          const cleanEventData = {
            ...eventData,
            user_id: user.id, // Ensure user_id is set correctly
            source_message_id: messageId,
            source_type: 'invite' as const,
            // Ensure required fields have defaults
            title: eventData.title || 'Calendar Event',
            event_type: eventData.event_type || 'personal' as const,
            status: eventData.status || 'confirmed' as const,
            priority: eventData.priority || 'medium' as const,
            is_recurring: eventData.is_recurring || false,
          };

          // Validate start_time format
          const startTime = new Date(cleanEventData.start_time);
          if (isNaN(startTime.getTime())) {
            throw new Error('Invalid start_time format');
          }

          console.log('🔧 Cleaned event data:', cleanEventData);

          const newEvent = await addEvent(cleanEventData);
          eventId = newEvent.id;

          console.log('✅ Calendar event created successfully:', eventId);

          // Update the invite response with the event ID
          const { error: updateError } = await supabase
            .from('calendar_invite_responses')
            .update({ event_id: eventId })
            .eq('message_id', messageId)
            .eq('user_id', user.id);

          if (updateError) {
            console.error('⚠️ Failed to update invite response with event ID:', updateError);
            // Don't throw here - the event was created successfully
          }

          // Refresh events list to show the new event immediately
          await fetchEvents();

        } catch (eventError) {
          console.error('❌ Failed to create calendar event:', eventError);
          
          // Event creation failed, but response was already recorded
          toast({
            title: 'Partial Success',
            description: 'Response recorded, but failed to add event to calendar. You can add it manually.',
            variant: 'destructive',
          });
          
          // Don't throw - we want to return success for the response part
          return { eventId: undefined, response, error: eventError };
        }
      }

      return { eventId, response: normalized };
    } catch (err) {
      console.error('❌ Failed to respond to invite:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to respond to invite';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Get invite response for a message
  const getInviteResponse = async (messageId: string): Promise<CalendarInviteResponse | null> => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from('calendar_invite_responses')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .order('responded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const normalized = data ? { 
        ...data, 
        response: data.response === 'accept' ? 'accepted' : data.response === 'decline' ? 'declined' : data.response
      } : null;

      return normalized as CalendarInviteResponse | null;
    } catch (err) {
      console.error('Error fetching invite response:', err);
      return null;
    }
  };

  // Check for event conflicts
  const checkConflicts = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(new Date(startTime).getTime() + 60 * 60 * 1000); // Default 1 hour

    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = event.end_time ? new Date(event.end_time) : new Date(eventStart.getTime() + 60 * 60 * 1000);

      // Check for overlap
      return (start < eventEnd && end > eventStart);
    });
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate >= startOfDay && eventDate <= endOfDay;
    });
  };

  // Get upcoming events
  const getUpcomingEvents = (limit = 5) => {
    const now = new Date();
    return events
      .filter(event => new Date(event.start_time) > now)
      .slice(0, limit);
  };

  useEffect(() => {
    fetchEvents();

    // Set up real-time subscription for calendar events
    const eventsChannel = supabase
      .channel('calendar-events-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calendar_events'
      }, (payload) => {
        console.log('📅 Calendar event change detected:', payload);
        fetchEvents(); // Refresh events list
      })
      .subscribe();

    // Set up real-time subscription for invite responses 
    const responsesChannel = supabase
      .channel('calendar-responses-changes')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'calendar_invite_responses'
      }, (payload) => {
        console.log('📨 Calendar invite response change detected:', payload);
        // This will trigger updates in CalendarInviteStatus components
      })
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(responsesChannel);
    };
  }, []);

  return {
    events,
    loading,
    error,
    fetchEvents,
    addEvent,
    updateEvent,
    removeEvent,
    respondToInvite,
    getInviteResponse,
    checkConflicts,
    getEventsForDate,
    getUpcomingEvents,
  };
}