import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from "@/context/AuthProvider";
import { notify, notifyError } from '@/lib/i18n-toast';

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  virtual_link: string | null;
  start_time: string;
  end_time: string | null;
  max_participants: number | null;
  participant_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  /**
   * JSON metadata from `global_community_events.metadata`.
   * Expected keys for ticket CTA logic: has_tickets, is_paid, price.
   */
  metadata?: any;
  is_co_creator?: boolean;
  creator_display_name?: string;
  creator_avatar_url?: string;
}

interface CreateEventData {
  title: string;
  description?: string;
  event_type?: string;
  location?: string;
  virtual_link?: string;
  start_time: string;
  end_time?: string;
  max_participants?: number;
  image_url?: string;
  metadata?: any;
  // Reseller options
  resellable?: boolean;
  resale_scope?: 'none' | 'tenant' | 'public';
  default_reseller_commission_rate?: number;
}

/** Helper to build the user-scoped query key */
function eventsQueryKey(userId: string | undefined) {
  return ['global-community-events', userId ?? 'anonymous'];
}

/**
 * Attendee counts per event, aggregated in the database (one tiny response)
 * instead of downloading one row per attendee across all events just to
 * count them client-side — that payload scaled with total attendance.
 * Falls back to the legacy per-row fetch if PostgREST aggregates are
 * unavailable, so counts never silently regress to zero.
 */
async function fetchParticipantCounts(eventIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (eventIds.length === 0) return counts;

  const agg = await supabase
    .from('global_event_participants')
    .select('event_id, count()')
    .in('event_id', eventIds)
    .eq('status', 'attending');
  if (!agg.error && agg.data) {
    for (const row of agg.data as unknown as Array<{ event_id: string; count: number }>) {
      counts.set(row.event_id, Number(row.count) || 0);
    }
    return counts;
  }
  console.warn('[CommunityEvents] Aggregate count unavailable, falling back to row fetch:', agg.error?.message);

  const rows = await supabase
    .from('global_event_participants')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('status', 'attending');
  if (rows.error) {
    console.warn('[CommunityEvents] Participants enrichment failed:', rows.error);
    return counts;
  }
  for (const row of rows.data || []) {
    counts.set(row.event_id, (counts.get(row.event_id) || 0) + 1);
  }
  return counts;
}

/**
 * Shared query function for fetching community events
 * Used by both the hook and prefetch registry for cache consistency
 */
export async function fetchCommunityEventsQueryFn(): Promise<CommunityEvent[]> {
  // getSession() reads the local session — getUser() made a full auth-server
  // round-trip that serially delayed every events load by one RTT.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("global_community_events")
    .select("*")
    .gte("start_time", today.toISOString())
    .order("start_time", { ascending: true })
    // Bound the payload: the screen shows the nearest events per tab and
    // filters client-side; without a limit this pulled EVERY future event.
    .limit(100);

  if (error) {
    console.error("Database error:", error);
    throw error;
  }

  const eventIds = data?.map(e => e.id) || [];

  // Fetch co-creator status, creator profiles, and real participant counts in parallel
  const [coCreatorResult, profilesResult, participantCounts] = await Promise.all([
    user
      ? supabase.from('event_co_creators').select('event_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] as { event_id: string }[], error: null }),
    supabase
      .from('global_community_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', [...new Set(data?.map(event => event.created_by) || [])]),
    fetchParticipantCounts(eventIds),
  ]);

  // Throw on profiles error so host names aren't silently degraded
  if (profilesResult.error) {
    console.error('[CommunityEvents] Profiles enrichment failed:', profilesResult.error);
    throw new Error(`Profiles enrichment failed: ${profilesResult.error.message}`);
  }

  if (coCreatorResult.error) {
    console.warn('[CommunityEvents] Co-creator enrichment failed:', coCreatorResult.error);
  }

  const coCreatorEventIds = new Set(coCreatorResult.data?.map(cc => cc.event_id) || []);

  const profilesMap = new Map(
    profilesResult.data?.map(p => [p.user_id, p]) || []
  );

  // Add is_co_creator flag, creator info, and real participant counts to events
  const eventsWithMetadata = (data || []).map(event => {
    const creatorProfile = profilesMap.get(event.created_by);
    return {
      ...event,
      participant_count: participantCounts.get(event.id) || 0,
      is_co_creator: coCreatorEventIds.has(event.id),
      creator_display_name: creatorProfile?.display_name || undefined,
      creator_avatar_url: creatorProfile?.avatar_url || undefined
    };
  });
  
  return eventsWithMetadata;
}

export function useCommunityEvents() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => eventsQueryKey(user?.id), [user?.id]);

  // Flush legacy unscoped cache key on first mount
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ['global-community-events'], exact: true });
  }, [queryClient]);

  // Use React Query for cache-first rendering with stale-while-revalidate
  const { 
    data: events = [], 
    isLoading, 
    isFetching,
    refetch 
  } = useQuery({
    queryKey,
    queryFn: fetchCommunityEventsQueryFn,
    // 2min (global default): matches the prefetch registry's staleTime so a
    // warmed cache is actually used. The old 30s override forced a full
    // refetch waterfall on nearly every navigation, defeating the prefetch;
    // the realtime subscription below keeps the list live in between.
    staleTime: 2 * 60 * 1000,
    enabled: !authLoading,
  });

  // Create a new community event
  const createEvent = async (eventData: CreateEventData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("global_community_events")
        .insert([{
          title: eventData.title,
          description: eventData.description,
          event_type: eventData.event_type || 'meetup',
          location: eventData.location,
          virtual_link: eventData.virtual_link,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          max_participants: eventData.max_participants,
          image_url: eventData.image_url,
          metadata: eventData.metadata || {},
          created_by: user.id,
          // Reseller fields
          resellable: eventData.resellable || false,
          resale_scope: eventData.resellable ? (eventData.resale_scope || 'tenant') : 'none',
          default_reseller_commission_rate: eventData.resellable ? (eventData.default_reseller_commission_rate || 10) : null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Optimistically add, then invalidate to get enriched data (creator profile)
      queryClient.setQueryData(queryKey, (old: CommunityEvent[] | undefined) => {
        return old ? [...old, data] : [data];
      });
      queryClient.invalidateQueries({ queryKey });
      
      notify('toasts.hooks.meetupCreated');

      return { success: true, data, eventId: data.id };
    } catch (error) {
      console.error("Error creating event:", error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedCreateMeetupPleaseTryAgain');
      return { success: false, error };
    }
  };

  // Update an existing community event
  const updateEvent = async (eventId: string, eventData: CreateEventData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("global_community_events")
        .update({
          title: eventData.title,
          description: eventData.description,
          event_type: eventData.event_type || 'meetup',
          location: eventData.location,
          virtual_link: eventData.virtual_link,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          max_participants: eventData.max_participants,
          image_url: eventData.image_url,
          metadata: eventData.metadata || {},
        })
        .eq('id', eventId)
        // RLS policy handles creator and co-creator checks
        .select()
        .single();

      if (error) throw error;

      // Merge with existing enriched fields to prevent "Community Host" regression
      queryClient.setQueryData(queryKey, (old: CommunityEvent[] | undefined) => {
        return old?.map(event => {
          if (event.id !== eventId) return event;
          return {
            ...data,
            creator_display_name: event.creator_display_name,
            creator_avatar_url: event.creator_avatar_url,
            is_co_creator: event.is_co_creator,
            participant_count: event.participant_count,
          };
        }) || [];
      });
      
      notify('toasts.hooks.meetupUpdated');

      return { success: true, data };
    } catch (error) {
      console.error("Error updating event:", error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedUpdateMeetupPleaseTryAgain');
      return { success: false, error };
    }
  };

  // Search events
  const searchEvents = (query: string) => {
    setSearchQuery(query);
  };

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    const searchLower = searchQuery.toLowerCase();
    return events.filter(event =>
      event.title.toLowerCase().includes(searchLower) ||
      (event.description && event.description.toLowerCase().includes(searchLower)) ||
      (event.location && event.location.toLowerCase().includes(searchLower))
    );
  }, [events, searchQuery]);

  // Separate today's and upcoming events
  const { todayEvents, upcomingEvents } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvts = filteredEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    });

    const upcomingEvts = filteredEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() >= tomorrow.getTime();
    });

    return { todayEvents: todayEvts, upcomingEvents: upcomingEvts };
  }, [filteredEvents]);

  // Real-time subscription - updates React Query cache
  useEffect(() => {
    const channel = supabase
      .channel('events-realtime-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_community_events'
        },
        (payload) => {
          // For new events, add to cache but trigger a refetch to get enriched data
          queryClient.setQueryData(queryKey, (old: CommunityEvent[] | undefined) => {
            return old ? [...old, payload.new as CommunityEvent] : [payload.new as CommunityEvent];
          });
          // Refetch to get creator profile info for the new event
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'global_community_events'
        },
        (payload) => {
          queryClient.setQueryData(queryKey, (old: CommunityEvent[] | undefined) => {
            return old?.map(event => 
              event.id === payload.new.id 
                ? { 
                    ...payload.new as CommunityEvent,
                    creator_display_name: event.creator_display_name,
                    creator_avatar_url: event.creator_avatar_url,
                    is_co_creator: event.is_co_creator,
                  }
                : event
            ) || [];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'global_community_events'
        },
        (payload) => {
          queryClient.setQueryData(queryKey, (old: CommunityEvent[] | undefined) => {
            return old?.filter(event => event.id !== payload.old.id) || [];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, queryKey]);

  return {
    events: filteredEvents,
    todayEvents,
    upcomingEvents,
    loading: isLoading,
    isFetching,
    searchQuery,
    fetchEvents: refetch,
    createEvent,
    updateEvent,
    searchEvents,
  };
}
