/**
 * Commerce Partner Onboarding (VTID-03936, frontend Phase 2) — React Query
 * hooks for a partner org's own roster, backed by the gateway's
 * `/api/v1/partner-orgs/*` routes (VTID-03932/VTID-03935).
 *
 * Matches `useAdminMembers.ts`'s own convention (useQuery/useMutation +
 * `adminFetch`, invalidate on success) — this is a new, org-scoped hook
 * module, deliberately not reusing that tenant-scoped one, since
 * `partner_organization_members`/`_invites` are keyed by `orgId`, not
 * `activeTenantId`.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-api';
import { PARTNER_ORGS_API } from '@/lib/commerce-host';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';

export interface OrgMemberRow {
  id: string;
  user_id: string;
  role: 'org_admin' | 'staff' | 'professional';
  granted_by: string | null;
  granted_at: string;
}

export interface OrgInviteRow {
  id: string;
  email: string;
  role: 'org_admin' | 'staff' | 'professional';
  /** The accept-invite token (`POST /invites/:token/accept`) — needed to
   * rebuild the "copy invite link" affordance for an already-created invite. */
  token: string;
  expires_at: string;
  accepted_at: string | null;
}

export function useOrgMembers(orgId: string | null) {
  return useQuery({
    queryKey: ['partner-org-members', orgId],
    queryFn: async () => {
      const json = await adminFetch(`${PARTNER_ORGS_API}/${orgId}/members`);
      return json.members as OrgMemberRow[];
    },
    enabled: !!orgId,
  });
}

export function useOrgInvites(orgId: string | null) {
  return useQuery({
    queryKey: ['partner-org-invites', orgId],
    queryFn: async () => {
      const json = await adminFetch(`${PARTNER_ORGS_API}/${orgId}/invites`);
      return json.invites as OrgInviteRow[];
    },
    enabled: !!orgId,
  });
}

export function useCreateOrgInvite(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: OrgInviteRow['role'] }) => {
      if (!orgId) throw new Error('NO_ORG');
      const json = await adminFetch(`${PARTNER_ORGS_API}/${orgId}/members/invite`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
      return json.invite as OrgInviteRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-org-invites', orgId] });
    },
  });
}

/**
 * Every partner org the caller belongs to, with their per-org role
 * (VTID-03951). A separate call from `CommercePortal.tsx`'s own
 * `loadMyOrgs()`/`myOrgs` state — that page predates this hook and is left
 * untouched; this is for the new health-orders screen, which needs the same
 * membership data independently.
 */
export function useMyPartnerOrgs() {
  return useQuery({
    queryKey: ['partner-orgs-mine'],
    queryFn: async () => {
      const json = await adminFetch(`${PARTNER_ORGS_API}/mine`);
      return (json.organizations ?? []) as MyOrgRow[];
    },
  });
}
