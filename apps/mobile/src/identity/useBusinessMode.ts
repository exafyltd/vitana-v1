/**
 * VTID-05186 (N3, plan change 11) — src/hooks/useBusinessMode.ts: route-based
 * business mode; the active org is a per-device convenience in the shared
 * store (AsyncStorage-backed, business-mode.ts:118-139 semantics). Nothing
 * here writes to any role table.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { usePathname, router } from 'expo-router';
import { businessHomeFor, isBusinessRoute, pickActiveOrg } from '../ports/core';
import { activeOrgStore, hydrateActiveOrg } from './device-storage';
import { useMyPartnerOrgs, type MyOrgRow } from './useMyPartnerOrgs';

const EMPTY: MyOrgRow[] = [];

export function useBusinessMode() {
  const query = useMyPartnerOrgs();
  const orgs = query.data ?? EMPTY;
  const pathname = usePathname();
  const storedId = useSyncExternalStore(activeOrgStore.subscribe, activeOrgStore.getSnapshot, activeOrgStore.getSnapshot);
  useEffect(() => {
    void hydrateActiveOrg();
  }, []);
  const activeOrg = pickActiveOrg(orgs, storedId);
  const isBusinessMode = activeOrg !== null && isBusinessRoute(pathname);

  const enterBusinessMode = useCallback(
    (orgId: string) => {
      const org = orgs.find((o) => o.id === orgId) ?? null;
      activeOrgStore.set(orgId);
      router.navigate(businessHomeFor(org?.role ?? 'staff') as never);
    },
    [orgs],
  );
  const selectOrg = useCallback((orgId: string) => activeOrgStore.set(orgId), []);

  return { orgs, activeOrg, isBusinessMode, isLoading: query.isLoading, enterBusinessMode, selectOrg };
}
