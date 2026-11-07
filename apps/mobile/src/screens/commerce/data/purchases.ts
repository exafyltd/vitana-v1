/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) — the
 * post-purchase reads of the two Stripe return pages, re-implemented over the
 * native Supabase client (the web modules import the web client, class B):
 *
 *  - `useTicketPurchase` (src/hooks/useEventTickets.ts:128-167):
 *      event_ticket_purchases select *, ticket_type:event_ticket_types(*),
 *      event:global_community_events(id, title, start_time, location, image_url)
 *      where id = :purchaseId, single;
 *  - `verifyTicketPayment` (src/pages/TicketPurchaseSuccess.tsx:44-72): 1.5 s
 *      after landing, event_ticket_purchases update { status:'completed',
 *      stripe_session_id } where id = :purchaseId and status = 'pending';
 *  - `verifyPackagePayment` (src/pages/PackagePurchaseSuccess.tsx:55-82): the
 *      `verify-package-payment` edge function with { purchase_id, session_id }.
 *
 * These are the web's own calls, unchanged; the tests run them against the
 * Supabase double only.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { getSupabase } from '../../../auth/client';

const db = () => getSupabase() as any;

/** TicketPurchaseSuccess.tsx: "Small delay to ensure Stripe webhook has processed". */
export const TICKET_VERIFY_DELAY_MS = 1500;

export interface TicketPurchase {
  id: string;
  ticket_number: string;
  buyer_email: string;
  buyer_name: string;
  quantity: number;
  qr_code_token: string;
  status: string;
  ticket_type?: { name?: string | null } | null;
  event?: { id: string; title?: string | null; start_time?: string | null; location?: string | null; image_url?: string | null } | null;
}

export function useTicketPurchase(purchaseId: string) {
  const [purchase, setPurchase] = useState<TicketPurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!purchaseId) {
      setPurchase(null);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    setError(null);
    void (async () => {
      const { data, error: fetchError } = await db()
        .from('event_ticket_purchases')
        .select(
          `
          *,
          ticket_type:event_ticket_types(*),
          event:global_community_events(id, title, start_time, location, image_url)
        `,
        )
        .eq('id', purchaseId)
        .single();
      if (!live) return;
      if (fetchError) {
        setError(fetchError.message);
        setPurchase(null);
      } else {
        setPurchase(data as TicketPurchase);
      }
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [purchaseId]);
  return { purchase, loading, error };
}

/** Marks the pending purchase completed with the Stripe session id; true when the update succeeded. */
export async function verifyTicketPayment(purchaseId: string, sessionId: string): Promise<boolean> {
  const { error } = await db().from('event_ticket_purchases').update({ status: 'completed', stripe_session_id: sessionId }).eq('id', purchaseId).eq('status', 'pending');
  return !error;
}

export interface PackageItem {
  id: string;
  item_type: string;
  item_name: string;
  quantity: number;
}

export interface PackagePurchase {
  id: string;
  buyer_email: string;
  buyer_name: string;
  quantity: number;
  total_amount_cents: number;
  currency: string;
  status: string;
  business_packages: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    price_cents: number;
    currency: string;
    package_items: PackageItem[];
  };
}

/**
 * The verification error the web keeps in state: the server's / function's
 * own message when it gave one (shown as is, like the web), else the web's
 * literal fallback as a catalog key.
 */
export type VerifyError = { message: string } | { key: string };

export async function verifyPackagePayment(purchaseId: string, sessionId: string): Promise<{ purchase: PackagePurchase } | { error: VerifyError }> {
  try {
    const { data, error: fnError } = await db().functions.invoke('verify-package-payment', { body: { purchase_id: purchaseId, session_id: sessionId } });
    if (fnError || data?.error) {
      const message = data?.error || fnError?.message;
      return { error: message ? { message: String(message) } : { key: 'screens.packagepurchasesuccess.verificationFailed' } };
    }
    return { purchase: data.purchase as PackagePurchase };
  } catch (err) {
    return { error: err instanceof Error && err.message ? { message: err.message } : { key: 'discoverCommerceNative.commerce.package.failedToVerify' } };
  }
}
