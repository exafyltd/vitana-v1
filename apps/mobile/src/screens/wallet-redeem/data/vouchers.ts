/**
 * VTID-05423 (native-wave2-wallet-r2/wallet-redeem) — native twin of
 * `src/hooks/useRedeemVoucher.ts` (`useVoucherByCode`, `useClaimVoucher`).
 * The web hook imports the Supabase client (class-B, requirements R4.2), so it
 * is re-implemented here over the app's one Supabase client with the same
 * tables, filters, query key, stale time and invalidations:
 *
 *   lookup  vouchers.select('*').eq('code', CODE).maybeSingle()
 *           → fallback vouchers.select('*'), first 8 id chars = CODE (legacy)
 *           → voucher_orders.select(<order columns>).eq('voucher_id', id).maybeSingle()
 *   claim   vouchers.update({ status: 'redeemed', redeemed_by_user_id, redeemed_at })
 *             .eq('id', voucherId).eq('status', 'active').select().single()
 *
 * Differences that are not behaviour: the order's display tier name is not
 * built here (the web's English `TIER_NAMES` map) but by the screen from the
 * catalogs (`tierName` in `text.ts`), and the unused `purchaseDate` is not
 * formatted. A failed claim throws `ClaimVoucherError`; the screen shows the
 * catalog form of the web's "Failed to claim voucher…" message.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';

export type VoucherLookupData = {
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
    created_at: string;
  } | null;
};

type VoucherRow = {
  id: string;
  code: string | null;
  tier: string;
  status: string;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
};

type OrderRow = { id: string; buyer_name: string | null; buyer_email: string | null; amount_cents: number; currency: string; created_at: string };

/** The columns the web order lookup selects (useRedeemVoucher.ts). */
export const ORDER_COLUMNS = 'id, buyer_name, buyer_email, amount_cents, currency, created_at';

export const VOUCHER_BY_CODE_KEY = 'voucher-by-code';

export async function fetchVoucherByCode(code: string): Promise<VoucherLookupData> {
  if (!code) return { voucher: null, order: null };
  const supabase = getSupabase();
  let voucher: VoucherRow | null = null;

  // First by the code column.
  try {
    const { data, error } = await supabase.from('vouchers').select('*').eq('code', code.toUpperCase()).maybeSingle();
    if (!error && data) voucher = data as unknown as VoucherRow;
  } catch {
    // web: "Code column query failed, trying fallback"
  }

  // Legacy fallback: the first 8 characters of the id.
  if (!voucher) {
    const { data: all, error: searchError } = await supabase.from('vouchers').select('*');
    if (!searchError && all) {
      voucher = (all as unknown as VoucherRow[]).find((v) => v.id.slice(0, 8).toUpperCase() === code.toUpperCase()) ?? null;
    }
  }

  if (!voucher) return { voucher: null, order: null };

  const { data: order } = await supabase.from('voucher_orders').select(ORDER_COLUMNS).eq('voucher_id', voucher.id).maybeSingle();
  const o = (order ?? null) as OrderRow | null;

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
    order: o ? { id: o.id, buyer_name: o.buyer_name, buyer_email: o.buyer_email, amount_cents: o.amount_cents, currency: o.currency, created_at: o.created_at } : null,
  };
}

export function useVoucherByCode(code: string) {
  return useQuery({
    queryKey: [VOUCHER_BY_CODE_KEY, code],
    queryFn: () => fetchVoucherByCode(code),
    enabled: !!code,
    staleTime: 1000 * 60,
  });
}

/** The web throws `new Error("Failed to claim voucher. It may have already been redeemed.")`. */
export class ClaimVoucherError extends Error {
  constructor() {
    super('claim_failed');
    this.name = 'ClaimVoucherError';
  }
}

export async function claimVoucher({ voucherId, userId }: { voucherId: string; userId: string }): Promise<unknown> {
  const { data, error } = await getSupabase()
    .from('vouchers')
    .update({ status: 'redeemed', redeemed_by_user_id: userId, redeemed_at: new Date().toISOString() } as never)
    .eq('id', voucherId)
    .eq('status', 'active')
    .select()
    .single();
  if (error) throw new ClaimVoucherError();
  return data;
}

export function useClaimVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: claimVoucher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VOUCHER_BY_CODE_KEY] });
      queryClient.invalidateQueries({ queryKey: ['my-vouchers'] });
      queryClient.invalidateQueries({ queryKey: ['redeemable-vouchers'] });
    },
  });
}
