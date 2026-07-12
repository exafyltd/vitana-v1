import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResellerProfile } from "./useResellerProfile";
import { toast } from "sonner";
import { notifyError, notifySuccess } from '@/lib/i18n-toast';

export interface ResellerPayout {
  id: string;
  reseller_profile_id: string;
  total_commission_amount: number;
  currency: string;
  status: "pending" | "approved" | "paid_to_wallet" | "rejected";
  wallet_transaction_id: string | null;
  created_at: string;
  paid_at: string | null;
  notes: string | null;
}

export interface PayoutSummary {
  totalPaidToWallet: number;
  totalPending: number;
  lastPayout: ResellerPayout | null;
  payouts: ResellerPayout[];
}

export function useResellerPayouts() {
  const { data: resellerProfile } = useResellerProfile();
  const queryClient = useQueryClient();

  const payoutsQuery = useQuery({
    queryKey: ["reseller-payouts", resellerProfile?.id],
    queryFn: async (): Promise<PayoutSummary> => {
      if (!resellerProfile?.id) {
        return {
          totalPaidToWallet: 0,
          totalPending: 0,
          lastPayout: null,
          payouts: [],
        };
      }

      const { data: payouts, error } = await supabase
        .from("reseller_payouts")
        .select("*")
        .eq("reseller_profile_id", resellerProfile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payouts:", error);
        throw error;
      }

      const validPayouts = (payouts || []) as ResellerPayout[];

      const totalPaidToWallet = validPayouts
        .filter((p) => p.status === "paid_to_wallet")
        .reduce((sum, p) => sum + Number(p.total_commission_amount), 0);

      const totalPending = validPayouts
        .filter((p) => p.status === "pending" || p.status === "approved")
        .reduce((sum, p) => sum + Number(p.total_commission_amount), 0);

      const lastPaidPayout = validPayouts.find((p) => p.status === "paid_to_wallet");

      return {
        totalPaidToWallet,
        totalPending,
        lastPayout: lastPaidPayout || null,
        payouts: validPayouts,
      };
    },
    enabled: !!resellerProfile?.id,
  });

  // Request payout mutation
  const requestPayoutMutation = useMutation({
    mutationFn: async () => {
      if (!resellerProfile?.id) {
        throw new Error("No reseller profile");
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("create-reseller-payout", {
        body: {
          reseller_profile_id: resellerProfile.id,
          mode: "all_unpaid",
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create payout");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-attributed-sales"] });
    },
    onError: (error) => {
      console.error("Payout request error:", error);
      notifyError('toasts.hooks.failedRequestPayout');
    },
  });

  // Credit payout to wallet mutation
  const creditPayoutMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("credit-reseller-payout", {
        body: { payout_id: payoutId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to credit payout");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-attributed-sales"] });
      queryClient.invalidateQueries({ queryKey: ["user-wallet"] });
      notifySuccess('toasts.hooks.commissionCreditedWallet');
    },
    onError: (error) => {
      console.error("Credit payout error:", error);
      notifyError('toasts.hooks.failedCreditPayoutWallet');
    },
  });

  // Request a payout for review (formerly a combined request+instant-credit
  // "MVP flow" — SECURITY: crediting is now gated behind admin approval via
  // approve-reseller-payout, so this only submits the request and reports
  // it as pending, never an instant wallet credit).
  const transferToWalletMutation = useMutation({
    mutationFn: async () => {
      if (!resellerProfile?.id) {
        throw new Error("No reseller profile");
      }

      const payoutResponse = await supabase.functions.invoke("create-reseller-payout", {
        body: {
          reseller_profile_id: resellerProfile.id,
          mode: "all_unpaid",
        },
      });

      if (payoutResponse.error) {
        throw new Error(payoutResponse.error.message || "Failed to create payout");
      }

      const payoutData = payoutResponse.data;
      if (!payoutData?.payout?.id) {
        // No unpaid commissions
        return { success: false, message: "No unpaid commissions to transfer" };
      }

      return {
        success: true,
        payout: payoutData.payout,
        amount: payoutData.total_commission,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reseller-payouts"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-attributed-sales"] });

      if (data.success) {
        notifySuccess('toasts.hooks.payoutRequestSubmitted', undefined, { amount: `€${data.amount?.toFixed(2)}` });
      } else {
        toast.info(data.message);
      }
    },
    onError: (error) => {
      console.error("Payout request error:", error);
      notifyError('toasts.hooks.failedRequestPayout');
    },
  });

  return {
    ...payoutsQuery,
    requestPayout: requestPayoutMutation.mutate,
    isRequestingPayout: requestPayoutMutation.isPending,
    creditPayout: creditPayoutMutation.mutate,
    isCreditingPayout: creditPayoutMutation.isPending,
    transferToWallet: transferToWalletMutation.mutate,
    isTransferring: transferToWalletMutation.isPending,
  };
}
