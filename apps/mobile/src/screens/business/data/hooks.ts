/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the commerce data hooks,
 * re-implemented natively (design §3b: the web hooks import the web Supabase
 * client through `adminFetch`, so they are class B and stay out of
 * `@vitana/core`). Same gateway paths, payloads, query keys and invalidations
 * as the web hook named on each; every call goes through `commerceFetch`
 * (./client.ts), which the unit tests answer from a fake gateway.
 *
 *   useCommerceOrgs              CommercePortal.tsx loadMyOrgs + useOrgMembers.ts useMyPartnerOrgs
 *   usePartnerHealthOrders …     src/hooks/usePartnerHealthOrders.ts
 *   useOrgMembers / useOrgInvites / useCreateOrgInvite   src/hooks/useOrgMembers.ts
 *   useCommerceVerticals         src/hooks/useCommerceVerticals.ts
 */
import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/AuthProvider';
import {
  MY_PORTAL_API,
  PARTNER_ORGS_API,
  type ConfirmMatchResponse,
  type MyOrgRow,
  type OrgInviteRow,
  type OrgMemberRow,
  type PartnerHealthInboxRow,
  type PartnerHealthOrder,
  type Vertical,
  type VocabularyOptions,
} from '../../../ports/commerce';
import { commerceFetch } from './client';

/** `/api/v1/admin/partner-health/*` (usePartnerHealthOrders.ts PARTNER_HEALTH_API). */
export const PARTNER_HEALTH_API = '/api/v1/admin/partner-health';

/**
 * The caller's partner organizations (`GET /partner-orgs/mine`). Its own key:
 * the portal, the team page and the health orders read the membership here.
 */
export function useCommerceOrgs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['commerce', 'partner-orgs-mine', user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const json = await commerceFetch(`${PARTNER_ORGS_API}/mine`);
      return (json.organizations ?? []) as MyOrgRow[];
    },
  });
}

const ORDERS_KEY = ['partner-health-orders'];
const INBOX_KEY = ['partner-health-inbox'];

export function usePartnerHealthOrders(enabled = true) {
  return useQuery({
    queryKey: ORDERS_KEY,
    enabled,
    queryFn: async () => {
      const json = await commerceFetch(`${PARTNER_HEALTH_API}/orders`);
      return (json.orders ?? []) as PartnerHealthOrder[];
    },
  });
}

/** `enabled` is false for an assigned-only professional — the route 403s for them. */
export function usePartnerHealthInbox(enabled: boolean) {
  return useQuery({
    queryKey: INBOX_KEY,
    enabled,
    queryFn: async () => {
      const json = await commerceFetch(`${PARTNER_HEALTH_API}/inbox`);
      return (json.inbox ?? []) as PartnerHealthInboxRow[];
    },
  });
}

export function usePatchPartnerOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await commerceFetch(`${PARTNER_HEALTH_API}/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORDERS_KEY }),
  });
}

export function useUploadPartnerOrderResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, result }: { orderId: string; result: unknown }) => {
      await commerceFetch(`${PARTNER_HEALTH_API}/inbox/${orderId}/upload-result`, { method: 'POST', body: JSON.stringify({ order_id: orderId, result }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ORDERS_KEY }),
  });
}

export function useConfirmPartnerInboxMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { inboxId: string; matched_user_id: string; matched_tenant_id: string; test_name: string; external_order_ref: string | null }) => {
      const { inboxId, ...body } = payload;
      return (await commerceFetch(`${PARTNER_HEALTH_API}/inbox/${inboxId}/confirm-match`, { method: 'POST', body: JSON.stringify(body) })) as ConfirmMatchResponse;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ORDERS_KEY });
      void qc.invalidateQueries({ queryKey: INBOX_KEY });
    },
  });
}

export function useOrgMembers(orgId: string | null) {
  return useQuery({
    queryKey: ['partner-org-members', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const json = await commerceFetch(`${PARTNER_ORGS_API}/${orgId}/members`);
      return json.members as OrgMemberRow[];
    },
  });
}

export function useOrgInvites(orgId: string | null) {
  return useQuery({
    queryKey: ['partner-org-invites', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const json = await commerceFetch(`${PARTNER_ORGS_API}/${orgId}/invites`);
      return json.invites as OrgInviteRow[];
    },
  });
}

export function useCreateOrgInvite(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: OrgInviteRow['role'] }) => {
      if (!orgId) throw new Error('NO_ORG');
      const json = await commerceFetch(`${PARTNER_ORGS_API}/${orgId}/members/invite`, { method: 'POST', body: JSON.stringify({ email, role }) });
      return json.invite as OrgInviteRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partner-org-invites', orgId] }),
  });
}

/** `GET /vcaop/portal/my/verticals` — the product form's whole schema (useCommerceVerticals.ts). */
export function useCommerceVerticals() {
  const [verticals, setVerticals] = useState<Vertical[] | null>(null);
  const [options, setOptions] = useState<VocabularyOptions>({});
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await commerceFetch(`${MY_PORTAL_API}/verticals`);
      setVerticals(res.data?.verticals ?? []);
      setOptions(res.data?.options ?? {});
      setFailed(false);
    } catch {
      setVerticals([]);
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { verticals, options, failed, reload: load };
}
