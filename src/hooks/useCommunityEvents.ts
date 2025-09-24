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
}

export function useCommunityEvents() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Fetch all community events
  const fetchEvents = async () => {
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
          return;
        }
        throw error;
      }
      
      console.log("Fetched events:", data?.length || 0);
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to fetch meetups. Please try again.",
        variant: "destructive",
      });
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
          created_by: user.id,
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

      return { success: true, data };
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
    searchEvents,
  };
}