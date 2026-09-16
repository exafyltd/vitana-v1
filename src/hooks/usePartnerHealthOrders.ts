/**
 * Commerce Partner Onboarding, Phase 4 (VTID-03951) — health-test orders for
 * a partner org's own staff/professional members, against the gateway's
 * already org-scoped `/api/v1/admin/partner-health/*` routes (Phase 1,
 * VTID-03932: generalized via `services/partner-health/org-access.ts` so a
 * caller with a `partner_organization_members` row — not just a Vitana
 * admin — gets a correctly filtered response: `staff`/`org_admin` see their
 * whole org, `professional` sees only orders assigned to them).
 *
 * Follows `usePatientHealthResults.ts`'s convention (React Query +
 * `adminFetch`, explicit typed interfaces) rather than the admin
 * `PartnerHealthOrders.tsx` page's older plain `useState`/inline `fetch`
 * style — that page predates `adminFetch` and this repo's React Query
 * convention for new hook modules (see `useOrgMembers.ts`).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-api';

/** `/api/v1/admin/partner-health/*` — a naming artifact from before Phase 1
 * generalized these routes past Vitana-admin-only callers; not renamed. */
const PARTNER_HEALTH_API = '/api/v1/admin/partner-health';

export interface PartnerHealthOrder {
  id: string;
  tenant_id: string;
  user_id: string;
  partner_id: string;
  assigned_professional_user_id: string | null;
  external_order_ref: string | null;
  test_name: string;
  status: string;
  status_updated_at: string;
  ordered_at: string;
  partner_registry?: { display_name: string } | { display_name: string }[] | null;
}

export interface PartnerHealthInboxRow {
  id: string;
  partner_id: string;
  raw_payload: Record<string, unknown>;
  candidate_user_ids: string[];
  reason: string;
  resolved: boolean;
  created_at: string;
  partner_registry?: { display_name: string } | { display_name: string }[] | null;
}

const ORDERS_KEY = ['partner-health-orders'];
const INBOX_KEY = ['partner-health-inbox'];

export function usePartnerHealthOrders() {
  return useQuery({
    queryKey: ORDERS_KEY,
    queryFn: async () => {
      const json = await adminFetch(`${PARTNER_HEALTH_API}/orders`);
      return (json.orders ?? []) as PartnerHealthOrder[];
    },
  });
}

/** `enabled` must be false for an assigned-only professional — the route
 * 403s for them, and there is nothing useful to show if it did succeed. */
export function usePartnerHealthInbox(enabled: boolean) {
  return useQuery({
    queryKey: INBOX_KEY,
    queryFn: async () => {
      const json = await adminFetch(`${PARTNER_HEALTH_API}/inbox`);
      return (json.inbox ?? []) as PartnerHealthInboxRow[];
    },
    enabled,
  });
}

export function usePatchPartnerOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await adminFetch(`${PARTNER_HEALTH_API}/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORDERS_KEY }),
  });
}

export function useUploadPartnerOrderResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, result }: { orderId: string; result: unknown }) => {
      await adminFetch(`${PARTNER_HEALTH_API}/inbox/${orderId}/upload-result`, {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, partner_key: 'doctorbox', result }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORDERS_KEY }),
  });
}

export function useConfirmPartnerInboxMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      inboxId: string;
      matched_user_id: string;
      matched_tenant_id: string;
      test_name: string;
      external_order_ref: string | null;
    }) => {
      const { inboxId, ...body } = payload;
      await adminFetch(`${PARTNER_HEALTH_API}/inbox/${inboxId}/confirm-match`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      qc.invalidateQueries({ queryKey: INBOX_KEY });
    },
  });
}
