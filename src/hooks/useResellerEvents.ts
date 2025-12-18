import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";

export interface ResellerEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  image_url: string | null;
  created_by: string;
  slug: string | null;
  tickets_sold: number;
  tickets_available: number;
  gross_revenue: number;
}

export function useResellerEvents() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["reseller-events", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      // Fetch events created by this user
      const { data: events, error: eventsError } = await supabase
        .from("global_community_events")
        .select(`
          id,
          title,
          start_time,
          end_time,
          location,
          image_url,
          created_by,
          slug
        `)
        .eq("created_by", session.user.id)
        .order("start_time", { ascending: false });

      if (eventsError) {
        console.error("Error fetching reseller events:", eventsError);
        throw eventsError;
      }

      if (!events || events.length === 0) return [];

      // Get ticket types and sales for each event
      const eventIds = events.map((e) => e.id);

      const { data: ticketTypes } = await supabase
        .from("event_ticket_types")
        .select("event_id, quantity_available, quantity_sold")
        .in("event_id", eventIds)
        .eq("is_active", true);

      const { data: purchases } = await supabase
        .from("event_ticket_purchases")
        .select("event_id, total_amount, quantity, status")
        .in("event_id", eventIds)
        .eq("status", "completed");

      // Aggregate data per event
      const enrichedEvents: ResellerEvent[] = events.map((event) => {
        const eventTicketTypes = ticketTypes?.filter((t) => t.event_id === event.id) || [];
        const eventPurchases = purchases?.filter((p) => p.event_id === event.id) || [];

        const tickets_available = eventTicketTypes.reduce(
          (sum, t) => sum + (t.quantity_available || 0),
          0
        );
        const tickets_sold = eventPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
        const gross_revenue = eventPurchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

        return {
          id: event.id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location,
          image_url: event.image_url,
          created_by: event.created_by,
          slug: event.slug,
          tickets_sold,
          tickets_available,
          gross_revenue,
        };
      });

      return enrichedEvents;
    },
    enabled: !!session?.user?.id,
  });
}

export function useResellerEventStats() {
  const { data: events = [], isLoading } = useResellerEvents();

  const now = new Date();

  const upcomingEvents = events.filter((e) => new Date(e.start_time) > now);
  const nextEvent = upcomingEvents[0];

  const totalTicketsSold = events.reduce((sum, e) => sum + e.tickets_sold, 0);
  const totalRevenue = events.reduce((sum, e) => sum + e.gross_revenue, 0);

  return {
    upcomingEventsCount: upcomingEvents.length,
    nextEventDate: nextEvent?.start_time,
    ticketsSold30Days: totalTicketsSold,
    revenue30Days: totalRevenue,
    totalEvents: events.length,
    isLoading,
  };
}
