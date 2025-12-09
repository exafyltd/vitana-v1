import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";

export interface ResellerSalesSummary {
  totalTicketsSold: number;
  totalGrossRevenue: number;
  ticketsSold30Days: number;
  revenue30Days: number;
  eventSales: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    ticketsSold: number;
    grossRevenue: number;
  }[];
}

export function useResellerSales() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["reseller-sales", session?.user?.id],
    queryFn: async (): Promise<ResellerSalesSummary> => {
      if (!session?.user?.id) {
        return {
          totalTicketsSold: 0,
          totalGrossRevenue: 0,
          ticketsSold30Days: 0,
          revenue30Days: 0,
          eventSales: [],
        };
      }

      // Get all events created by this user
      const { data: events } = await supabase
        .from("global_community_events")
        .select("id, title, start_time")
        .eq("created_by", session.user.id);

      if (!events || events.length === 0) {
        return {
          totalTicketsSold: 0,
          totalGrossRevenue: 0,
          ticketsSold30Days: 0,
          revenue30Days: 0,
          eventSales: [],
        };
      }

      const eventIds = events.map((e) => e.id);

      // Get all completed purchases for these events
      const { data: purchases } = await supabase
        .from("event_ticket_purchases")
        .select("event_id, total_amount, quantity, created_at")
        .in("event_id", eventIds)
        .eq("status", "completed");

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let totalTicketsSold = 0;
      let totalGrossRevenue = 0;
      let ticketsSold30Days = 0;
      let revenue30Days = 0;

      const eventSalesMap = new Map<string, { ticketsSold: number; grossRevenue: number }>();

      purchases?.forEach((purchase) => {
        const qty = purchase.quantity || 0;
        const amount = Number(purchase.total_amount) || 0;

        totalTicketsSold += qty;
        totalGrossRevenue += amount;

        if (new Date(purchase.created_at) >= thirtyDaysAgo) {
          ticketsSold30Days += qty;
          revenue30Days += amount;
        }

        const existing = eventSalesMap.get(purchase.event_id) || { ticketsSold: 0, grossRevenue: 0 };
        eventSalesMap.set(purchase.event_id, {
          ticketsSold: existing.ticketsSold + qty,
          grossRevenue: existing.grossRevenue + amount,
        });
      });

      const eventSales = events.map((event) => {
        const sales = eventSalesMap.get(event.id) || { ticketsSold: 0, grossRevenue: 0 };
        return {
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.start_time,
          ticketsSold: sales.ticketsSold,
          grossRevenue: sales.grossRevenue,
        };
      });

      return {
        totalTicketsSold,
        totalGrossRevenue,
        ticketsSold30Days,
        revenue30Days,
        eventSales: eventSales.sort((a, b) => b.grossRevenue - a.grossRevenue),
      };
    },
    enabled: !!session?.user?.id,
  });
}
