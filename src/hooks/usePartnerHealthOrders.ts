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
  /** VTID-05056: set once staff proposed a member (absent until the gateway
   * migration is applied). `pending_member` = waiting for the member. */
  member_link_status?: MemberLinkStatus | null;
  proposed_at?: string | null;
}

/** VTID-05056: the member's answer to a staff-proposed link. */
export type MemberLinkStatus = 'pending_member' | 'confirmed' | 'declined';

/** VTID-05056: the inbox badge for a row's member decision, or null. */
export function memberLinkBadgeKey(status: MemberLinkStatus | null | undefined): string | null {
  if (status === 'pending_member') return 'screens.admin.awaitingMember';
  if (status === 'declined') return 'screens.admin.memberDeclined';
  return null;
}

/** VTID-05056: what confirm-match answers now — a proposal, not an order. */
export interface ConfirmMatchResponse {
  ok: true;
  status: 'pending_member';
  inbox_id: string;
}

/**
 * VTID-05056: maps a confirm-match failure (the gateway's `error` code, which
 * `adminFetch` and the admin page both surface as the Error message) to a
 * toast key. Unknown failures keep the generic message.
 */
export function confirmMatchErrorKey(err: unknown): string {
  const code = err instanceof Error ? err.message : '';
  switch (code) {
    case 'MEMBER_DECLINED':
      return 'toasts.admin.matchMemberDeclined';
    case 'USER_NOT_IN_TENANT':
      return 'toasts.admin.matchUserNotInTenant';
    case 'MEMBER_CONFIRMATION_UNAVAILABLE':
      return 'toasts.admin.matchConfirmationUnavailable';
    case 'PENDING_MEMBER':
      return 'toasts.admin.matchAlreadyPending';
    default:
      return 'toasts.admin.bulkActionFailed';
  }
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
        // VTID-05056: no partner_key — the gateway takes it from the order's own
        // partner (it used to default every upload to DoctorBox).
        body: JSON.stringify({ order_id: orderId, result }),
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
      // VTID-05056: 202 — the member is asked to confirm; no order exists yet.
      return (await adminFetch(`${PARTNER_HEALTH_API}/inbox/${inboxId}/confirm-match`, {
        method: 'POST',
        body: JSON.stringify(body),
      })) as ConfirmMatchResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      qc.invalidateQueries({ queryKey: INBOX_KEY });
    },
  });
}
