import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthProvider";

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
 * Shared query function for fetching community events
 * Used by both the hook and prefetch registry for cache consistency
 */
export async function fetchCommunityEventsQueryFn(): Promise<CommunityEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("global_community_events")
    .select("*")
    .gte("start_time", today.toISOString())
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Database error:", error);
    throw error;
  }

  const eventIds = data?.map(e => e.id) || [];

  // Fetch co-creator status, creator profiles, and real participant counts in parallel
  const [coCreatorResult, profilesResult, participantsResult] = await Promise.all([
    user
      ? supabase.from('event_co_creators').select('event_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] as { event_id: string }[], error: null }),
    supabase
      .from('global_community_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', [...new Set(data?.map(event => event.created_by) || [])]),
    eventIds.length > 0
      ? supabase
          .from('global_event_participants')
          .select('event_id')
          .in('event_id', eventIds)
          .eq('status', 'attending')
      : Promise.resolve({ data: [] as { event_id: string }[], error: null }),
  ]);

  // Throw on profiles error so host names aren't silently degraded
  if (profilesResult.error) {
    console.error('[CommunityEvents] Profiles enrichment failed:', profilesResult.error);
    throw new Error(`Profiles enrichment failed: ${profilesResult.error.message}`);
  }

  if (coCreatorResult.error) {
    console.warn('[CommunityEvents] Co-creator enrichment failed:', coCreatorResult.error);
  }
  if (participantsResult.error) {
    console.warn('[CommunityEvents] Participants enrichment failed:', participantsResult.error);
  }

  const coCreatorEventIds = new Set(coCreatorResult.data?.map(cc => cc.event_id) || []);

  const profilesMap = new Map(
    profilesResult.data?.map(p => [p.user_id, p]) || []
  );

  // Count participants per event
  const participantCounts = new Map<string, number>();
  for (const row of participantsResult.data || []) {
    participantCounts.set(row.event_id, (participantCounts.get(row.event_id) || 0) + 1);
  }

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
    staleTime: 30 * 1000, // 30 seconds
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
      
      toast({
        title: "Meetup Created! 🎉",
        description: `${eventData.title} has been created successfully.`,
      });

      return { success: true, data, eventId: data.id };
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create meetup. Please try again.",
        variant: "destructive",
      });
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
      
      toast({
        title: "Meetup Updated! ✏️",
        description: `${eventData.title} has been updated successfully.`,
      });

      return { success: true, data };
    } catch (error) {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: "Failed to update meetup. Please try again.",
        variant: "destructive",
      });
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
