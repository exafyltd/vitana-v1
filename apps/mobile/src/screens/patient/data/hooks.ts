/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — the patient data
 * hooks, re-implemented natively (design §3b: the web hooks import the web
 * Supabase client through `src/lib/admin-api.ts`, so they are class B and
 * never moved into `@vitana/core`). Same gateway paths, query keys, retry
 * policy and invalidations as the web hook named on each; the gateway through
 * the shell's `getGateway()` (bearer token from the native session, `/api/v1`
 * prepended). Every call sends the request built in `./requests.ts`.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGateway } from '../../../auth/gateway';
import { getSupabase } from '../../../auth/client';
import { gatewayJson } from '../../../ports/core';
import {
  PARTNER_LINK_REQUESTS_KEY,
  PARTNER_LINK_REQUESTS_REQUEST,
  PATIENT_HEALTH_RESULTS_KEY,
  PATIENT_HEALTH_RESULTS_REQUEST,
  adminHeaders,
  linkRequestDecisionRequest,
  parseLinkRequests,
  type GatewayRequest,
  type PatientHealthResult,
} from './requests';

/** The tenant claim `adminFetch` reads from the current session at call time (`app_metadata.active_tenant_id`). */
async function activeTenantClaim(): Promise<unknown> {
  try {
    const { data } = await getSupabase().auth.getSession();
    return (data.session?.user?.app_metadata as Record<string, unknown> | undefined)?.active_tenant_id;
  } catch {
    return undefined;
  }
}

/** Sends one built request through the shell gateway with the `adminFetch` headers (non-2xx throws GatewayError). */
export async function sendAdmin<T>(req: GatewayRequest): Promise<T> {
  return gatewayJson<T>(getGateway(), req.path, { method: req.method, headers: adminHeaders(await activeTenantClaim()) });
}

/** `src/hooks/usePatientHealthResults.ts`. */
export function usePatientHealthResults() {
  return useQuery({
    queryKey: PATIENT_HEALTH_RESULTS_KEY,
    queryFn: async () => {
      const json = await sendAdmin<{ results?: PatientHealthResult[] }>(PATIENT_HEALTH_RESULTS_REQUEST);
      return (json?.results ?? []) as PatientHealthResult[];
    },
  });
}

/** `src/hooks/usePartnerLinkRequests.ts` `usePartnerLinkRequests` (best-effort, no retry). */
export function usePartnerLinkRequests() {
  return useQuery({
    queryKey: PARTNER_LINK_REQUESTS_KEY,
    queryFn: async () => parseLinkRequests(await sendAdmin<unknown>(PARTNER_LINK_REQUESTS_REQUEST)),
    retry: false,
  });
}

/** `useLinkRequestDecision(action)`: a decision refreshes the requests and the results (a confirmed link can add a result). */
function useLinkRequestDecision(action: 'confirm' | 'decline') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => sendAdmin<unknown>(linkRequestDecisionRequest(requestId, action)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PARTNER_LINK_REQUESTS_KEY });
      void qc.invalidateQueries({ queryKey: PATIENT_HEALTH_RESULTS_KEY });
    },
  });
}

export function useConfirmPartnerLink() {
  return useLinkRequestDecision('confirm');
}

export function useDeclinePartnerLink() {
  return useLinkRequestDecision('decline');
}
