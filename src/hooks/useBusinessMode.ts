/**
 * VTID-03999 — the business-mode state every piece of mobile chrome reads.
 *
 * A mode on this axis is route-based: the user is "in" a business mode when
 * they are on a business route AND hold at least one membership. Which
 * business is active (a member of several) is a per-device convenience kept
 * in a tiny shared store backed by localStorage (`lib/business-mode.ts`),
 * so the switcher sheet, the drawer and the bottom bar agree without prop
 * drilling. Nothing here writes to any role table.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMyPartnerOrgs } from '@/hooks/useOrgMembers';
import type { MyOrgRow } from '@/components/commerce/MyOrgCard';
import {
  businessHomeFor,
  getActiveOrgIdSnapshot,
  isBusinessRoute,
  pickActiveOrg,
  setActiveOrgId,
  subscribeActiveOrgId,
} from '@/lib/business-mode';

const EMPTY: MyOrgRow[] = [];

export function useBusinessMode() {
  const query = useMyPartnerOrgs();
  const orgs = query.data ?? EMPTY;
  const location = useLocation();
  const navigate = useNavigate();
  const storedId = useSyncExternalStore(subscribeActiveOrgId, getActiveOrgIdSnapshot, () => null);
  const activeOrg = pickActiveOrg(orgs, storedId);
  const isBusinessMode = activeOrg !== null && isBusinessRoute(location.pathname);

  /** Remember the org and land on that role's business home. */
  const enterBusinessMode = useCallback(
    (orgId: string) => {
      const org = orgs.find((o) => o.id === orgId) ?? null;
      setActiveOrgId(orgId);
      navigate(businessHomeFor(org?.role ?? 'staff'));
    },
    [orgs, navigate],
  );

  /** Only changes which business is active; stays wherever the user is. */
  const selectOrg = useCallback((orgId: string) => setActiveOrgId(orgId), []);

  return { orgs, activeOrg, isBusinessMode, isLoading: query.isLoading, enterBusinessMode, selectOrg };
}
