/**
 * VTID-05056 (Health Hub Phase 0 / D8, frontend half of VTID-05055) — the
 * member's side of a partner link.
 *
 * Partner staff no longer link a lab result to a member directly. They
 * propose the member (`POST /api/v1/admin/partner-health/inbox/:id/confirm-match`
 * now answers 202 `pending_member`), and nothing reaches the member's orders,
 * calendar or results until the member confirms here. Backed by the gateway's
 * `routes/partner-health-member.ts`, mounted at
 * `/api/v1/partner-health/member`:
 *
 *   GET  /link-requests              → { ok, requests: PartnerLinkRequest[] }
 *   POST /link-requests/:id/confirm  → { ok, status: 'confirmed', order_id }
 *   POST /link-requests/:id/decline  → { ok, status: 'declined' }
 *
 * Same convention as `usePatientHealthResults.ts` (React Query + `adminFetch`,
 * explicit types). The list is best-effort: any failure (gateway without the
 * route, migration not applied, network) reads as "no requests", so the card
 * hides and the Results page is never blocked by it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-api';

export const PARTNER_LINK_REQUESTS_API = '/api/v1/partner-health/member/link-requests';

export const PARTNER_LINK_REQUESTS_KEY = ['partner-link-requests'];
/** Same key as `usePatientHealthResults` — a confirmed link can add a result. */
const PATIENT_HEALTH_RESULTS_KEY = ['patient-health-results'];

export interface PartnerLinkRequest {
  id: string;
  partner_display_name: string;
  test_name: string;
  proposed_at: string | null;
}

export async function fetchPartnerLinkRequests(): Promise<PartnerLinkRequest[]> {
  const json = await adminFetch(PARTNER_LINK_REQUESTS_API);
  return Array.isArray(json?.requests) ? (json.requests as PartnerLinkRequest[]) : [];
}

export function usePartnerLinkRequests() {
  return useQuery({
    queryKey: PARTNER_LINK_REQUESTS_KEY,
    queryFn: fetchPartnerLinkRequests,
    // A missing route or a pending migration is not worth retrying; the card
    // simply stays hidden.
    retry: false,
  });
}

function useLinkRequestDecision(action: 'confirm' | 'decline') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) =>
      adminFetch(`${PARTNER_LINK_REQUESTS_API}/${encodeURIComponent(requestId)}/${action}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PARTNER_LINK_REQUESTS_KEY });
      qc.invalidateQueries({ queryKey: PATIENT_HEALTH_RESULTS_KEY });
    },
  });
}

/** The member says "this is my test": the gateway creates the link + order. */
export function useConfirmPartnerLink() {
  return useLinkRequestDecision('confirm');
}

/** The member says "not me": the result stays in the partner's inbox. */
export function useDeclinePartnerLink() {
  return useLinkRequestDecision('decline');
}
