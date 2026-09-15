import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function useOrganizerEvents() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizerEvents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch events created by the user
        const { data: userEvents, error: eventsError } = await supabase
          .from("global_community_events")
          .select("id, title, image_url, start_time, end_time, location")
          .eq("created_by", user.id)
          .order("start_time", { ascending: false });

        if (eventsError) throw eventsError;

        if (!userEvents || userEvents.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        // Fetch ticket types and purchases for each event
        const eventsWithSales = await Promise.all(
          userEvents.map(async (event) => {
            // Get total capacity from ticket types
            const { data: ticketTypes, error: ticketTypesError } = await supabase
              .from("event_ticket_types")
              .select("quantity_available")
              .eq("event_id", event.id)
              .eq("is_active", true);

            if (ticketTypesError) {
              console.error("Error fetching ticket types for event", event.id, ticketTypesError);
            }

            const totalCapacity = ticketTypes?.reduce(
              (sum, tt) => sum + (tt.quantity_available || 0),
              0
            ) || 0;

            // Get sales data from purchases
            const { data: purchases, error: purchasesError } = await supabase
              .from("event_ticket_purchases")
              .select("quantity, total_amount, buyer_id, checked_in_at")
              .eq("event_id", event.id)
              .eq("status", "completed");

            if (purchasesError) {
              console.error("Error fetching ticket purchases for event", event.id, purchasesError);
            }

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
        const paidEvents = eventsWithSales.filter((e) => e.totalCapacity > 0 || e.ticketsSold > 0);
        setEvents(paidEvents);
      } catch (err) {
        console.error("Error fetching organizer events:", err);
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerEvents();
  }, []);

  return { events, loading, error };
}
