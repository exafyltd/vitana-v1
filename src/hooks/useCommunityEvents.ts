import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export function useCommunityEvents() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch all community events
  const fetchEvents = async (): Promise<CommunityEvent[]> => {
    try {
      setLoading(true);
      
      // Check authentication status
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Authentication check:", { 
        user: user?.id || "Not authenticated",
        email: user?.email 
      });

      const { data, error } = await supabase
        .from("global_community_events")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Database error:", error);
        if (error.message.includes("JWT")) {
          toast({
            title: "Authentication Required",
            description: "Please log in to view community events.",
            variant: "destructive",
          });
          return [];
        }
        throw error;
      }

      // Fetch co-creator status for current user
      let coCreatorEventIds = new Set<string>();
      if (user) {
        const { data: coCreatorData } = await supabase
          .from('event_co_creators')
          .select('event_id')
          .eq('user_id', user.id);
        coCreatorEventIds = new Set(coCreatorData?.map(cc => cc.event_id) || []);
      }

      // Fetch creator profiles
      const creatorIds = [...new Set(data.map(event => event.created_by))];
      const { data: profilesData } = await supabase
        .from('global_community_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', creatorIds);
      
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      // Add is_co_creator flag and creator info to events
      const eventsWithCoCreator = (data || []).map(event => {
        const creatorProfile = profilesMap.get(event.created_by);
        return {
          ...event,
          is_co_creator: coCreatorEventIds.has(event.id),
          creator_display_name: creatorProfile?.display_name || undefined,
          creator_avatar_url: creatorProfile?.avatar_url || undefined
        };
      });
      
      console.log("Fetched events:", eventsWithCoCreator.length);
      setEvents(eventsWithCoCreator);
      return eventsWithCoCreator;
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to fetch meetups. Please try again.",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

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

      // Add to local state immediately
      setEvents(prev => [...prev, data]);
      
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

      // Update local state immediately
      setEvents(prev => prev.map(event => 
        event.id === eventId ? data : event
      ));
      
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
  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(searchLower) ||
      (event.description && event.description.toLowerCase().includes(searchLower)) ||
      (event.location && event.location.toLowerCase().includes(searchLower))
    );
  });

  // Separate today's and upcoming events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = filteredEvents.filter(event => {
    const eventDate = new Date(event.start_time);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === today.getTime();
  });

  const upcomingEvents = filteredEvents.filter(event => {
    const eventDate = new Date(event.start_time);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() >= tomorrow.getTime();
  });

  // Real-time subscription
  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_community_events'
        },
        (payload) => {
          setEvents(prev => [...prev, payload.new as CommunityEvent]);
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
          setEvents(prev => prev.map(event => 
            event.id === payload.new.id ? payload.new as CommunityEvent : event
          ));
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
          setEvents(prev => prev.filter(event => event.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    events: filteredEvents,
    todayEvents,
    upcomingEvents,
    loading,
    searchQuery,
    fetchEvents,
    createEvent,
    updateEvent,
    searchEvents,
  };
}