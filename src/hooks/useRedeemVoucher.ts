import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { fmtDate } from '@/lib/locale-format';
export interface VoucherLookupData {
  voucher: {
    id: string;
    code: string;
    tier: string;
    status: string;
    expires_at: string | null;
    redeemed_at: string | null;
    redeemed_by_user_id: string | null;
  } | null;
  order: {
    id: string;
    buyer_name: string | null;
    buyer_email: string | null;
    amount_cents: number;
    currency: string;
    tierName: string;
    purchaseDate: string;
  } | null;
}

const TIER_NAMES: Record<string, string> = {
  test: "Test Voucher",
  experience: "Experience Voucher",
  exclusive: "Exclusive Voucher",
};

// Type for voucher query result (until types.ts is regenerated)
interface VoucherRow {
  id: string;
  code: string | null;
  tier: string;
  status: string;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
}

async function fetchVoucherByCode(code: string): Promise<VoucherLookupData> {
  if (!code) {
    return { voucher: null, order: null };
  }

  let voucher: VoucherRow | null = null;

  // First try to find by code column using raw query to avoid type issues
  try {
    const { data: voucherData, error } = await supabase
      .from("vouchers")
      .select("*")
      .eq("code" as never, code.toUpperCase())
      .maybeSingle();

    if (!error && voucherData) {
      voucher = voucherData as unknown as VoucherRow;
    }
  } catch (e) {
    console.log("[useVoucherByCode] Code column query failed, trying fallback");
  }

  // If not found by code, try by first 8 chars of ID (legacy fallback)
  if (!voucher) {
    const { data: allVouchers, error: searchError } = await supabase
      .from("vouchers")
      .select("*");

    if (!searchError && allVouchers) {
      const vouchersArray = allVouchers as unknown as VoucherRow[];
      voucher = vouchersArray.find(
        (v) => v.id.slice(0, 8).toUpperCase() === code.toUpperCase()
      ) || null;
    }
  }

  if (!voucher) {
    return { voucher: null, order: null };
  }

  // Fetch associated order
  const { data: order, error: orderError } = await supabase
    .from("voucher_orders")
    .select("id, buyer_name, buyer_email, amount_cents, currency, created_at")
    .eq("voucher_id", voucher.id)
    .maybeSingle();

  if (orderError) {
    console.error("[useVoucherByCode] Error fetching order:", orderError);
  }

  return {
    voucher: {
      id: voucher.id,
      code: voucher.code || voucher.id.slice(0, 8).toUpperCase(),
      tier: voucher.tier,
      status: voucher.status,
      expires_at: voucher.expires_at,
      redeemed_at: voucher.redeemed_at,
      redeemed_by_user_id: voucher.redeemed_by_user_id,
    },
    order: order
      ? {
          id: order.id,
          buyer_name: order.buyer_name,
          buyer_email: order.buyer_email,
          amount_cents: order.amount_cents,
          currency: order.currency,
          tierName: TIER_NAMES[voucher.tier] || voucher.tier,
          purchaseDate: fmtDate(new Date(order.created_at), {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        }
      : null,
  };
}

export const useVoucherByCode = (code: string) => {
  return useQuery({
    queryKey: ["voucher-by-code", code],
    queryFn: () => fetchVoucherByCode(code),
    enabled: !!code,
    staleTime: 1000 * 60, // 1 minute
  });
};

export const useClaimVoucher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ voucherId, userId }: { voucherId: string; userId: string }) => {
      console.log("[useClaimVoucher] Claiming voucher:", voucherId, "for user:", userId);

      const { data, error } = await supabase
        .from("vouchers")
        .update({
          status: "redeemed",
          redeemed_by_user_id: userId,
          redeemed_at: new Date().toISOString(),
        } as never)
        .eq("id", voucherId)
        .eq("status", "active")
        .select()
        .single();

      if (error) {
        console.error("[useClaimVoucher] Error claiming voucher:", error);
        throw new Error("Failed to claim voucher. It may have already been redeemed.");
      }

      console.log("[useClaimVoucher] Voucher claimed successfully:", data);
      return data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["voucher-by-code"] });
      queryClient.invalidateQueries({ queryKey: ["my-vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["redeemable-vouchers"] });
    },
  });
};
