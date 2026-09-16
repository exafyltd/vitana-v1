/**
 * VTID-03968 — hasPermission() must check the real, unforced dbRole (and an
 * unconditional Exafy-admin bypass), matching every sibling consumer of
 * dbRole in this codebase (useRoleRouteEnforcement, useSmartRouting,
 * useHybridMessages, useGlobalMessages, useTenantMessages, SideDrawerNav —
 * see useSmartRouting.mobile.test.ts for the canonical VTID-03936 fix these
 * all follow).
 *
 * A prior change (VTID-03962) made hasPermission() check the mobile-forced
 * effectiveRole instead, on the theory that "BackOffice is desktop-only"
 * meant mobile should never pass a backoffice/admin guard at all. That
 * broke the VTID-03936 contract: useRoleRouteEnforcement deliberately
 * redirects a mobile patient/professional/staff/admin/backoffice account
 * to ITS OWN role dashboard (dbRole-based, unaffected by the mobile
 * community-force), and ProtectedRoute calls hasPermission() to decide
 * whether that same page may render. Gating hasPermission() on
 * effectiveRole meant a backoffice account got redirected to
 * /backoffice/dashboard and then immediately denied entry to it —
 * NotAuthorized's own "Return to Dashboard" link goes to "/", which
 * useSmartRouting's (also dbRole-based) redirect sends right back to
 * /backoffice/dashboard: an infinite loop, observed live on staging.
 *
 * effectiveRole (currentRole) exists for the COMMUNITY viewing/nav
 * experience on mobile (bottom nav, community feature chrome) — it does
 * not gate whether a role-appropriate dashboard route may render. (The
 * actual "this shouldn't look like this on mobile" complaint the
 * VTID-03962 investigation started from was the community MobileBottomNav
 * rendering underneath BackOffice's own navigation — fixed separately, in
 * MobileBottomNav's hideNavRoutes.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

const useTenantMock = vi.fn(() => ({ activeTenantId: 'tenant-1', isExafyAdmin: false }));
const useIsMobileMock = vi.fn(() => false);
let storedRole: string = 'community';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (proc: string) => {
      if (proc === 'get_role_preference') {
        return Promise.resolve({ data: [{ role: storedRole }], error: null });
      }
      throw new Error(`unexpected rpc: ${proc}`);
    },
  },
}));
vi.mock('./useTenant', () => ({ useTenant: () => useTenantMock() }));
vi.mock('./use-mobile', () => ({ useIsMobile: () => useIsMobileMock() }));

import { useRole } from './useRole';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { Wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children) };
}

async function renderRole() {
  const { Wrapper } = wrapper();
  const { result } = renderHook(() => useRole(), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('useRole().hasPermission — dbRole-based, matches VTID-03936 (VTID-03968)', () => {
  beforeEach(() => {
    useTenantMock.mockReset();
    useIsMobileMock.mockReset();
    storedRole = 'community';
  });

  it('Exafy admin, desktop: passes a backoffice guard', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: true });
    useIsMobileMock.mockReturnValue(false);
    storedRole = 'community';

    const result = await renderRole();
    expect(result.current.hasPermission('backoffice')).toBe(true);
  });

  it('Exafy admin, MOBILE: still passes a backoffice guard — access does not change with viewport', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: true });
    useIsMobileMock.mockReturnValue(true);
    storedRole = 'backoffice';

    const result = await renderRole();
    // currentRole (effectiveRole) is still mobile-forced for the community
    // viewing experience...
    expect(result.current.currentRole).toBe('community');
    // ...but hasPermission is a real-role check, unaffected by that force.
    expect(result.current.hasPermission('backoffice')).toBe(true);
    expect(result.current.hasPermission('community')).toBe(true);
  });

  it('non-Exafy account with a stored backoffice role, desktop: passes the guard', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: false });
    useIsMobileMock.mockReturnValue(false);
    storedRole = 'backoffice';

    const result = await renderRole();
    expect(result.current.hasPermission('backoffice')).toBe(true);
  });

  it('non-Exafy account with a stored backoffice role, MOBILE: still passes the guard (dbRole-based, matches useRoleRouteEnforcement redirecting it there)', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: false });
    useIsMobileMock.mockReturnValue(true);
    storedRole = 'backoffice';

    const result = await renderRole();
    expect(result.current.hasPermission('backoffice')).toBe(true);
  });

  it('a plain community account, MOBILE: does not pass a backoffice/admin guard', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: false });
    useIsMobileMock.mockReturnValue(true);
    storedRole = 'community';

    const result = await renderRole();
    expect(result.current.hasPermission('backoffice')).toBe(false);
    expect(result.current.hasPermission('admin')).toBe(false);
    expect(result.current.hasPermission('community')).toBe(true);
  });
});
