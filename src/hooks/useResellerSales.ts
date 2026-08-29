import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResellerProfile } from "./useResellerProfile";

/**
 * RESELLER SALES HOOK
 * 
 * Fetches attributed sales from reseller_attributions table.
 * Shows ONLY sales that the reseller earned commission on,
 * NOT sales from events they created (that's for organizers).
 */

export interface ResellerEventSale {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  ticketsSold: number;
  saleAmount: number;
  commissionAmount: number;
  commissionRate: number;
  lastSaleAt: string;
}

export interface ResellerSalesSummary {
  totalTicketsSold: number;
  totalSaleAmount: number;
  totalCommissionEarned: number;
  ticketsSold30Days: number;
  saleAmount30Days: number;
  commission30Days: number;
  eventSales: ResellerEventSale[];
  // Payout-related fields
  commissionPaidToWallet: number;
  commissionPendingPayout: number;
  lastPayout: {
    id: string;
    amount: number;
    status: string;
    paid_at: string | null;
    created_at: string;
  } | null;
}

export function useResellerSales() {
  const { data: resellerProfile } = useResellerProfile();

  return useQuery({
    queryKey: ["reseller-attributed-sales", resellerProfile?.id],
    queryFn: async (): Promise<ResellerSalesSummary> => {
      if (!resellerProfile?.id) {
        return {
          totalTicketsSold: 0,
          totalSaleAmount: 0,
          totalCommissionEarned: 0,
          ticketsSold30Days: 0,
          saleAmount30Days: 0,
          commission30Days: 0,
          eventSales: [],
          commissionPaidToWallet: 0,
          commissionPendingPayout: 0,
          lastPayout: null,
        };
      }

      // Fetch all attributions for this reseller (with payout info)
      const { data: attributions, error: attrError } = await supabase
        .from("reseller_attributions")
        .select(`
          id,
          event_id,
          sale_amount,
          commission_amount,
          commission_rate,
          created_at,
          ticket_purchase_id,
          payout_id
        `)
        .eq("reseller_id", resellerProfile.id)
        .order("created_at", { ascending: false });
      
      // Fetch payouts for this reseller
      const { data: payouts, error: payoutsError } = await supabase
        .from("reseller_payouts")
        .select("*")
        .eq("reseller_profile_id", resellerProfile.id)
        .order("created_at", { ascending: false });

      if (attrError) {
        console.error("Error fetching reseller attributions:", attrError);
        throw attrError;
      }

      if (payoutsError) {
        console.error("Error fetching reseller payouts:", payoutsError);
        throw payoutsError;
      }

      if (!attributions || attributions.length === 0) {
        // Calculate payout stats even if no attributions
        const validPayouts = (payouts || []) as any[];
        const paidToWallet = validPayouts
          .filter((p) => p.status === "paid_to_wallet")
          .reduce((sum: number, p: any) => sum + Number(p.total_commission_amount), 0);
        const lastPaidPayout = validPayouts.find((p) => p.status === "paid_to_wallet");
        
        return {
          totalTicketsSold: 0,
          totalSaleAmount: 0,
          totalCommissionEarned: 0,
          ticketsSold30Days: 0,
          saleAmount30Days: 0,
          commission30Days: 0,
          eventSales: [],
          commissionPaidToWallet: paidToWallet,
          commissionPendingPayout: 0,
          lastPayout: lastPaidPayout ? {
            id: lastPaidPayout.id,
            amount: Number(lastPaidPayout.total_commission_amount),
            status: lastPaidPayout.status,
            paid_at: lastPaidPayout.paid_at,
            created_at: lastPaidPayout.created_at,
          } : null,
        };
      }

      // Get unique event IDs
      const eventIds = [...new Set(attributions.map((a) => a.event_id))];

      // Fetch event details
      const { data: events, error: eventsError } = await supabase
        .from("global_community_events")
        .select("id, title, start_time")
        .in("id", eventIds);

      if (eventsError) {
        console.error("Error fetching event details:", eventsError);
        throw eventsError;
      }

      const eventMap = new Map(events?.map((e) => [e.id, e]) || []);

      // Fetch ticket purchase quantities
      const purchaseIds = attributions.map((a) => a.ticket_purchase_id);
      const { data: purchases, error: purchasesError } = await supabase
        .from("event_ticket_purchases")
        .select("id, quantity")
        .in("id", purchaseIds);

      if (purchasesError) {
        console.error("Error fetching purchase details:", purchasesError);
        throw purchasesError;
      }

      const purchaseMap = new Map(purchases?.map((p) => [p.id, p.quantity || 1]) || []);

      // Calculate totals and group by event
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let totalTicketsSold = 0;
      let totalSaleAmount = 0;
      let totalCommissionEarned = 0;
      let ticketsSold30Days = 0;
      let saleAmount30Days = 0;
      let commission30Days = 0;

      const eventSalesMap = new Map<string, {
        ticketsSold: number;
        saleAmount: number;
        commissionAmount: number;
        commissionRate: number;
        lastSaleAt: string;
      }>();

      attributions.forEach((attr) => {
        const quantity = purchaseMap.get(attr.ticket_purchase_id) || 1;
        const saleAmount = Number(attr.sale_amount) || 0;
        const commissionAmount = Number(attr.commission_amount) || 0;
        const createdAt = new Date(attr.created_at);

        totalTicketsSold += quantity;
        totalSaleAmount += saleAmount;
        totalCommissionEarned += commissionAmount;

        if (createdAt >= thirtyDaysAgo) {
          ticketsSold30Days += quantity;
          saleAmount30Days += saleAmount;
          commission30Days += commissionAmount;
        }

        // Group by event
        const existing = eventSalesMap.get(attr.event_id);
        if (existing) {
          existing.ticketsSold += quantity;
          existing.saleAmount += saleAmount;
          existing.commissionAmount += commissionAmount;
          if (attr.created_at > existing.lastSaleAt) {
            existing.lastSaleAt = attr.created_at;
          }
        } else {
          eventSalesMap.set(attr.event_id, {
            ticketsSold: quantity,
            saleAmount,
            commissionAmount,
            commissionRate: Number(attr.commission_rate) || 0,
            lastSaleAt: attr.created_at,
          });
        }
      });

      // Build event sales array
      const eventSales: ResellerEventSale[] = [];
      
      eventSalesMap.forEach((sales, eventId) => {
        const event = eventMap.get(eventId);
        
        eventSales.push({
          eventId,
          eventTitle: event?.title || "Unknown Event",
          eventDate: event?.start_time || "",
          ticketsSold: sales.ticketsSold,
          saleAmount: sales.saleAmount,
          commissionAmount: sales.commissionAmount,
          commissionRate: sales.commissionRate,
          lastSaleAt: sales.lastSaleAt,
        });
      });

      // Sort by commission earned (highest first)
      eventSales.sort((a, b) => b.commissionAmount - a.commissionAmount);

      // Calculate payout-related fields
      const validPayouts = (payouts || []) as any[];
      const paidToWallet = validPayouts
        .filter((p) => p.status === "paid_to_wallet")
        .reduce((sum: number, p: any) => sum + Number(p.total_commission_amount), 0);
      
      // Calculate pending: attributions without payout_id, or with pending/approved payout
      const pendingPayout = attributions
        .filter((attr) => !attr.payout_id)
        .reduce((sum, attr) => sum + (Number(attr.commission_amount) || 0), 0);
      
      const lastPaidPayout = validPayouts.find((p) => p.status === "paid_to_wallet");

      return {
        totalTicketsSold,
        totalSaleAmount,
        totalCommissionEarned,
        ticketsSold30Days,
        saleAmount30Days,
        commission30Days,
        eventSales,
        commissionPaidToWallet: paidToWallet,
        commissionPendingPayout: pendingPayout,
        lastPayout: lastPaidPayout ? {
          id: lastPaidPayout.id,
          amount: Number(lastPaidPayout.total_commission_amount),
          status: lastPaidPayout.status,
          paid_at: lastPaidPayout.paid_at,
          created_at: lastPaidPayout.created_at,
        } : null,
      };
    },
    enabled: !!resellerProfile?.id,
  });
}
