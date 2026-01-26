import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";

export interface OrganizerEvent {
  id: string;
  title: string;
  image_url: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  ticketsSold: number;
  totalRevenue: number;
  checkedInCount: number;
  totalCapacity: number;
  buyerCount: number;
}

/**
 * Fetch function for organizer events - exported for prefetch registry
 */
export async function fetchOrganizerEventsQueryFn(userId: string): Promise<OrganizerEvent[]> {
  if (!userId) return [];

  // Fetch events created by the user
  const { data: userEvents, error: eventsError } = await supabase
    .from("global_community_events")
    .select("id, title, image_url, start_time, end_time, location")
    .eq("created_by", userId)
    .order("start_time", { ascending: false });

  if (eventsError) throw eventsError;

  if (!userEvents || userEvents.length === 0) {
    return [];
  }

  // Fetch ticket types and purchases for each event
  const eventsWithSales = await Promise.all(
    userEvents.map(async (event) => {
      // Get total capacity from ticket types
      const { data: ticketTypes } = await supabase
        .from("event_ticket_types")
        .select("quantity_available")
        .eq("event_id", event.id)
        .eq("is_active", true);

      const totalCapacity = ticketTypes?.reduce(
        (sum, tt) => sum + (tt.quantity_available || 0),
        0
      ) || 0;

      // Get sales data from purchases
      const { data: purchases } = await supabase
        .from("event_ticket_purchases")
        .select("quantity, total_amount, buyer_id, checked_in_at")
        .eq("event_id", event.id)
        .eq("status", "completed");

      const ticketsSold = purchases?.reduce(
        (sum, p) => sum + (p.quantity || 0),
        0
      ) || 0;

      const totalRevenue = purchases?.reduce(
        (sum, p) => sum + (p.total_amount || 0),
        0
      ) || 0;

      const checkedInCount = purchases?.filter(
        (p) => p.checked_in_at !== null
      ).length || 0;

      // Count unique buyers
      const uniqueBuyers = new Set(purchases?.map((p) => p.buyer_id));
      const buyerCount = uniqueBuyers.size;

      return {
        id: event.id,
        title: event.title,
        image_url: event.image_url,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        ticketsSold,
        totalRevenue,
        checkedInCount,
        totalCapacity,
        buyerCount,
      };
    })
  );

  // Filter to only events with ticket types (paid events)
  return eventsWithSales.filter((e) => e.totalCapacity > 0 || e.ticketsSold > 0);
}

/**
 * Hook for fetching organizer's events with sales data
 * Uses React Query for caching and stale-while-revalidate
 */
export function useOrganizerEvents() {
  const { user } = useAuth();

  const { data: events = [], isLoading: loading, error, isFetching } = useQuery({
    queryKey: ['organizer-events', user?.id],
    queryFn: () => fetchOrganizerEventsQueryFn(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return { 
    events, 
    loading, 
    error: error?.message || null,
    isFetching 
  };
}
