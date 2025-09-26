import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

// Global event bus constant
const CALENDAR_REFRESH_EVENT = 'calendar-events:refresh';
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


// Allowed enums and helpers for validation
const ALLOWED_EVENT_TYPES = new Set(['personal','community','professional','health','workout','nutrition']);
const ALLOWED_STATUSES = new Set(['confirmed','pending','conflict','cancelled']);
const ALLOWED_PRIORITIES = new Set(['low','medium','high']);

const isValidUUID = (v?: string | null) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const eventSchema = z.object({
  title: z.string().trim().min(1).max(200).default('Calendar Event'),
  description: z.string().trim().max(2000).optional().nullable(),
  start_time: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), { message: 'Invalid start_time' }),
  end_time: z.string().optional().nullable(),
  location: z.string().trim().max(300).optional().nullable(),
  event_type: z.string().transform(v => ALLOWED_EVENT_TYPES.has(v as any) ? (v as any) : 'personal'),
  status: z.string().transform(v => ALLOWED_STATUSES.has(v as any) ? (v as any) : 'confirmed'),
  priority: z.string().transform(v => ALLOWED_PRIORITIES.has(v as any) ? (v as any) : 'medium'),
  is_recurring: z.boolean().default(false),
  recurring_pattern: z.any().optional(),
  attendees_count: z.number().int().nonnegative().optional().nullable(),
  has_rewards: z.boolean().optional().nullable(),
  metadata: z.any().optional(),
  source_message_id: z.string().uuid().optional().nullable(),
  source_type: z.enum(['manual','invite','imported']).optional(),
  user_id: z.string().uuid().optional(),
});

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch user's calendar events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const authUser = (await supabase.auth.getUser()).data.user;
      if (!authUser) {
        setEvents([]);
        return;
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', authUser.id)
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

  // Add a new calendar event (with auth check and idempotency)
  const addEvent = async (eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const authUser = (await supabase.auth.getUser()).data.user;
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      // Idempotency: if source_message_id provided, return existing
      if (eventData.source_message_id) {
        const { data: existing } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('source_message_id', eventData.source_message_id)
          .limit(1)
          .maybeSingle();
        if (existing) {
          return existing as any;
        }
      }

      // Try to insert - handle unique constraint violation gracefully
      let data: any;
      try {
        const result = await supabase
          .from('calendar_events')
          .insert({
            ...eventData,
            user_id: authUser.id
          })
          .select()
          .single();

        if (result.error) throw result.error;
        data = result.data;
      } catch (insertError: any) {
        // Handle unique constraint violation (23505) - event already exists
        if (insertError?.code === '23505' && eventData.source_message_id) {
          console.log('📅 Event already exists, returning existing event');
          const { data: existing } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', authUser.id)
            .eq('source_message_id', eventData.source_message_id)
            .limit(1)
            .single();
          
          if (existing) {
            return existing;
          }
        }
        throw insertError;
      }

      setEvents(prev => [...prev, data as CalendarEvent]);
      
      toast({
        title: 'Event Added',
        description: `"${eventData.title}" has been added to your calendar`,
      });

      // Dispatch global refresh event
      window.dispatchEvent(new Event(CALENDAR_REFRESH_EVENT));

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

      // Dispatch global refresh event
      window.dispatchEvent(new Event(CALENDAR_REFRESH_EVENT));

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

      // Dispatch global refresh event
      window.dispatchEvent(new Event(CALENDAR_REFRESH_EVENT));
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

      if (!isValidUUID(messageId)) {
        throw new Error('Invalid invite reference. Please wait until the message is fully sent, then try again.');
      }

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

      // If declined: remove any event created from this invite for current user
      if (normalized === 'declined') {
        try {
          const { data: existing } = await supabase
            .from('calendar_events')
            .select('id')
            .eq('user_id', user.id)
            .eq('source_message_id', messageId);

          if ((existing || []).length > 0) {
            const { error: delError } = await supabase
              .from('calendar_events')
              .delete()
              .eq('user_id', user.id)
              .eq('source_message_id', messageId);
            if (delError) {
              console.error('⚠️ Failed to delete declined invite events:', delError);
            }
          }

          await supabase
            .from('calendar_invite_responses')
            .update({ event_id: null })
            .eq('message_id', messageId)
            .eq('user_id', user.id);

          await fetchEvents();
          window.dispatchEvent(new Event(CALENDAR_REFRESH_EVENT));
        } catch (cleanupErr) {
          console.error('⚠️ Cleanup after decline failed:', cleanupErr);
        }

        return { eventId: undefined, response: normalized };
      }

      // If accepting or maybe responding to the invite, upsert the calendar event
      if ((normalized === 'accepted' || normalized === 'maybe') && eventData) {
        try {
          // Check if event already exists for idempotency
          const { data: existingEvent } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', user.id)
            .eq('source_message_id', messageId)
            .limit(1)
            .maybeSingle();

          const desiredStatus = normalized === 'accepted' ? ('confirmed' as const) : ('pending' as const);

          if (existingEvent) {
            // Only update status if needed
            if (existingEvent.status !== desiredStatus) {
              const { data: updated, error: updErr } = await supabase
                .from('calendar_events')
                .update({ status: desiredStatus })
                .eq('id', existingEvent.id)
                .select()
                .single();
              if (updErr) throw updErr;
              eventId = updated.id;
            } else {
              eventId = existingEvent.id;
            }

            // Update invite response with event ID
            await supabase
              .from('calendar_invite_responses')
              .update({ event_id: eventId })
              .eq('message_id', messageId)
              .eq('user_id', user.id);

            await fetchEvents();
            window.dispatchEvent(new Event(CALENDAR_REFRESH_EVENT));
          } else {
            console.log('📝 Creating calendar event for invite:', eventData);

            // Validate and clean event data
            const rawEventData = {
              ...eventData,
              user_id: user.id, // Ensure user_id is set correctly
              source_message_id: messageId,
              source_type: 'invite' as const,
              // Ensure required fields have defaults
              title: eventData.title || 'Calendar Event',
              event_type: (eventData as any).event_type || 'personal',
              status: desiredStatus, // Set status based on response
              priority: (eventData as any).priority || 'medium',
              is_recurring: !!eventData.is_recurring,
            } as any;

            // Sanitize enums and validate ISO times
            if (!ALLOWED_EVENT_TYPES.has(rawEventData.event_type)) rawEventData.event_type = 'personal';
            if (!ALLOWED_STATUSES.has(rawEventData.status)) rawEventData.status = 'confirmed';
            if (!ALLOWED_PRIORITIES.has(rawEventData.priority)) rawEventData.priority = 'medium';

            // Validate with zod (will coerce/guard invalid values)
            const cleanEventData = eventSchema.parse(rawEventData) as Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>;

            // Validate start_time format explicitly
            const startTime = new Date(cleanEventData.start_time);
            if (isNaN(startTime.getTime())) {
              throw new Error('Invalid start_time format');
            }

            const newEvent = await addEvent(cleanEventData);
            eventId = newEvent.id;

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

            // Dispatch global refresh event for other components
            window.dispatchEvent(new Event(CALENDAR_REFRESH_EVENT));
          }

        } catch (eventError) {
          console.error('❌ Failed to upsert calendar event:', eventError);
          
          // Event creation failed, but response was already recorded
          toast({
            title: 'Partial Success',
            description: 'Response recorded, but failed to update your calendar. You can add it manually.',
            variant: 'destructive',
          });
          
          // Don't throw - we want to return success for the response part
          return { eventId: undefined, response, error: eventError };
        }
      }

      // Dispatch global refresh event after successful invite response
      window.dispatchEvent(new Event(CALENDAR_REFRESH_EVENT));

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

  // Get ALL invite responses for a message (for senders to see summary)
  const getAllInviteResponses = async (messageId: string): Promise<CalendarInviteResponse[]> => {
    try {
      const { data, error } = await supabase
        .from('calendar_invite_responses')
        .select('*')
        .eq('message_id', messageId)
        .order('responded_at', { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map(item => ({
        ...item,
        response: item.response === 'accept' ? 'accepted' : item.response === 'decline' ? 'declined' : item.response
      }));

      return normalized as CalendarInviteResponse[];
    } catch (err) {
      console.error('Error fetching all invite responses:', err);
      return [];
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
    let eventsChannel: any;
    let responsesChannel: any;

    // Debounced fetch events for global refresh event bus
    const debouncedFetchEvents = () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        fetchEvents();
      }, 150);
    };

    // Global refresh event listener
    const handleGlobalRefresh = () => {
      debouncedFetchEvents();
    };

    window.addEventListener(CALENDAR_REFRESH_EVENT, handleGlobalRefresh);

    const init = async () => {
      await fetchEvents();
      const authUser = (await supabase.auth.getUser()).data.user;
      const userId = authUser?.id;
      if (!userId) return;

      // Real-time subscription scoped to current user
      eventsChannel = supabase
        .channel('calendar-events-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('📅 Calendar event change detected:', payload);
          fetchEvents();
        })
        .subscribe();

      // Invite responses scoped to current user
      responsesChannel = supabase
        .channel('calendar-responses-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'calendar_invite_responses',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          console.log('📨 Calendar invite response change detected:', payload);
        })
        .subscribe();
    };

    init();

    return () => {
      window.removeEventListener(CALENDAR_REFRESH_EVENT, handleGlobalRefresh);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current as any);
      }
      if (eventsChannel) supabase.removeChannel(eventsChannel);
      if (responsesChannel) supabase.removeChannel(responsesChannel);
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
    getAllInviteResponses,
    checkConflicts,
    getEventsForDate,
    getUpcomingEvents,
  };
}