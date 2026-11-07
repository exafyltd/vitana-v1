/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — the gateway calls the
 * patient screens make, as pure request builders and response types, so the
 * unit tests assert the built request (method, path, headers) against a fake
 * gateway and nothing is ever fired at a live backend (requirements R5.2).
 * Paths are gateway paths under `/api/v1` (the native gateway fetch prepends
 * it, `src/auth/gateway.ts`); each mirrors the web client named on it.
 */

export type GatewayRequest = { method: 'GET' | 'POST'; path: string };

// ── src/hooks/usePatientHealthResults.ts ────────────────────────────────

/** `adminFetch('/api/v1/patient/health-results')` → `{ results }`. */
export const PATIENT_HEALTH_RESULTS_REQUEST: GatewayRequest = { method: 'GET', path: '/patient/health-results' };
export const PATIENT_HEALTH_RESULTS_KEY = ['patient-health-results'] as const;

export interface PatientBiomarker {
  id: string;
  biomarker_code: string | null;
  name: string | null;
  value: number | null;
  unit: string | null;
  ref_range_low: number | null;
  ref_range_high: number | null;
  status: string | null;
  measured_at: string;
}

export interface PatientHealthResultOrg {
  display_name: string | null;
  self_registered_name: string | null;
  professional_user_id: string | null;
}

export interface PatientHealthResult {
  id: string;
  report_date: string | null;
  source: string | null;
  created_at: string;
  partner_result_id: string | null;
  org: PatientHealthResultOrg | null;
  biomarkers: PatientBiomarker[];
}

// ── src/hooks/usePartnerLinkRequests.ts ─────────────────────────────────

/** `PARTNER_LINK_REQUESTS_API` without the `/api/v1` prefix. */
export const PARTNER_LINK_REQUESTS_PATH = '/partner-health/member/link-requests';
export const PARTNER_LINK_REQUESTS_REQUEST: GatewayRequest = { method: 'GET', path: PARTNER_LINK_REQUESTS_PATH };
export const PARTNER_LINK_REQUESTS_KEY = ['partner-link-requests'] as const;

export interface PartnerLinkRequest {
  id: string;
  partner_display_name: string;
  test_name: string;
  proposed_at: string | null;
}

/** `useLinkRequestDecision(action)` — `POST /link-requests/:id/confirm|decline`, no body. */
export function linkRequestDecisionRequest(requestId: string, action: 'confirm' | 'decline'): GatewayRequest {
  return { method: 'POST', path: `${PARTNER_LINK_REQUESTS_PATH}/${encodeURIComponent(requestId)}/${action}` };
}

/** `fetchPartnerLinkRequests`: anything but an array reads as "no requests". */
export function parseLinkRequests(json: unknown): PartnerLinkRequest[] {
  const requests = (json as { requests?: unknown } | null)?.requests;
  return Array.isArray(requests) ? (requests as PartnerLinkRequest[]) : [];
}

/**
 * The headers `src/lib/admin-api.ts` `adminFetch` adds besides the bearer
 * token (which the shell gateway sets): JSON content type and
 * `X-Vitana-Tenant` from the session's `app_metadata.active_tenant_id`.
 */
export function adminHeaders(activeTenantId: unknown): Record<string, string> {
  const tenant = typeof activeTenantId === 'string' && activeTenantId.trim() ? activeTenantId : null;
  return { 'content-type': 'application/json', ...(tenant ? { 'x-vitana-tenant': tenant } : {}) };
}
