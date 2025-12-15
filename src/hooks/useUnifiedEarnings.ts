/**
 * UNIFIED EARNINGS HOOK
 * 
 * Combines all earnings sources (reseller commissions + direct sales)
 * into a single source of truth backed by wallet transactions.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useResellerSales } from "@/hooks/useResellerSales";

export interface EarningsTransaction {
  id: string;
  type: "reseller_commission" | "ticket_sale" | "direct_sale";
  title: string;
  source: string;
  amount: number;
  currency: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UnifiedEarnings {
  totalEarnings: number;
  earnings30Days: number;
  pendingPayout: number;
  inWallet: number;
  recentTransactions: EarningsTransaction[];
  bySource: {
    resellerCommissions: {
      earned: number;
      pending: number;
      inWallet: number;
      ticketsSold: number;
    };
    directSales: {
      gross: number;
      tickets: number;
      lastMonth: number;
    };
  };
}

export function useUnifiedEarnings() {
  const { user } = useAuth();
  const { data: resellerSales, isLoading: isLoadingReseller } = useResellerSales();

  // Fetch wallet transactions for earnings
  const { data: walletData, isLoading: isLoadingWallet } = useQuery({
    queryKey: ["unified-earnings-wallet", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch earnings-related transactions
      const { data: transactions, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("to_user_id", user.id)
        .in("transaction_type", ["reseller_commission", "ticket_sale", "purchase"])
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Calculate totals
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let totalEarnings = 0;
      let earnings30Days = 0;

      (transactions || []).forEach((tx) => {
        totalEarnings += tx.amount || 0;
        if (new Date(tx.created_at) >= thirtyDaysAgo) {
          earnings30Days += tx.amount || 0;
        }
      });

      return {
        transactions: transactions || [],
        totalEarnings,
        earnings30Days,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch direct event sales (as organizer)
  const { data: directSalesData, isLoading: isLoadingDirectSales } = useQuery({
    queryKey: ["unified-earnings-direct-sales", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get events created by the user
      const { data: events, error: eventsError } = await supabase
        .from("global_community_events")
        .select("id")
        .eq("created_by", user.id);

      if (eventsError) throw eventsError;
      if (!events?.length) return { gross: 0, tickets: 0, lastMonth: 0 };

      const eventIds = events.map((e) => e.id);

      // Get ticket purchases for these events
      const { data: purchases, error: purchasesError } = await supabase
        .from("event_ticket_purchases")
        .select("total_amount, quantity, created_at")
        .in("event_id", eventIds)
        .eq("status", "confirmed");

      if (purchasesError) throw purchasesError;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let gross = 0;
      let tickets = 0;
      let lastMonth = 0;

      (purchases || []).forEach((p) => {
        gross += p.total_amount || 0;
        tickets += p.quantity || 0;
        if (new Date(p.created_at) >= thirtyDaysAgo) {
          lastMonth += p.total_amount || 0;
        }
      });

      return { gross, tickets, lastMonth };
    },
    enabled: !!user?.id,
  });

  // Build unified earnings object
  const isLoading = isLoadingReseller || isLoadingWallet || isLoadingDirectSales;

  const recentTransactions: EarningsTransaction[] = (walletData?.transactions || []).map((tx) => ({
    id: tx.id,
    type: tx.transaction_type as EarningsTransaction["type"],
    title: tx.transaction_type === "reseller_commission" ? "Reseller Commission" : "Ticket Sale",
    source: tx.transaction_type === "reseller_commission" ? "Sell & Earn" : "My Event",
    amount: tx.amount || 0,
    currency: tx.from_currency || "EUR",
    timestamp: tx.created_at,
    metadata: tx.metadata as Record<string, any> | undefined,
  }));

  // Calculate 30-day earnings from reseller data
  const resellerEarnings30Days = resellerSales?.ticketsSold30Days 
    ? (resellerSales.totalCommissionEarned / Math.max(1, resellerSales.totalTicketsSold)) * resellerSales.ticketsSold30Days
    : 0;

  const unifiedEarnings: UnifiedEarnings = {
    totalEarnings: (resellerSales?.totalCommissionEarned || 0) + (directSalesData?.gross || 0),
    earnings30Days: resellerEarnings30Days + (directSalesData?.lastMonth || 0),
    pendingPayout: resellerSales?.commissionPendingPayout || 0,
    inWallet: resellerSales?.commissionPaidToWallet || 0,
    recentTransactions,
    bySource: {
      resellerCommissions: {
        earned: resellerSales?.totalCommissionEarned || 0,
        pending: resellerSales?.commissionPendingPayout || 0,
        inWallet: resellerSales?.commissionPaidToWallet || 0,
        ticketsSold: resellerSales?.totalTicketsSold || 0,
      },
      directSales: {
        gross: directSalesData?.gross || 0,
        tickets: directSalesData?.tickets || 0,
        lastMonth: directSalesData?.lastMonth || 0,
      },
    },
  };

  return {
    earnings: unifiedEarnings,
    resellerSales,
    isLoading,
  };
}
