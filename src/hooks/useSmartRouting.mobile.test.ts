/**
 * VTID-03936 — the mobile role-force fix. `useRole()`'s `effectiveRole`
 * (exposed as `currentRole`) is forced to `'community'` on mobile
 * viewports regardless of the real role; `useSmartRouting()` and
 * `useRoleRouteEnforcement()` used to read `currentRole` for their
 * redirect decisions, so a mobile patient's cold-start `/` redirect (and
 * the community→patient-routes bounce) never fired — both now read the
 * unforced `dbRole` instead, matching the precedent already shipped in
 * `SideDrawerNav.tsx`.
 *
 * These tests pin the fix by mocking `useIsMobile() => true` throughout —
 * if either hook regressed back to reading `currentRole`, both would
 * resolve to `'community'` under this mock and the assertions below would
 * fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

const navigateMock = vi.fn();
let locationPathname = '/';

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ pathname: locationPathname }),
}));

vi.mock('@/context/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' }, loading: false }),
}));

vi.mock('./useTenant', () => ({
  useTenant: () => ({ isExafyAdmin: false, activeTenantId: 'tenant-1', tenant: { slug: 'maxina' } }),
}));

// The mobile viewport this whole fix is about — every test below runs "on mobile".
vi.mock('./use-mobile', () => ({ useIsMobile: () => true }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (proc: string) => {
      if (proc === 'get_role_preference') return Promise.resolve({ data: [{ role: 'patient' }], error: null });
      throw new Error(`unexpected rpc: ${proc}`);
    },
  },
}));

import { useSmartRouting, useRoleRouteEnforcement } from './useSmartRouting';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { Wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children) };
}

describe('useSmartRouting on mobile (VTID-03936)', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    locationPathname = '/';
  });

  it('redirects a mobile patient from "/" to /patient/dashboard via dbRole, despite currentRole being mobile-forced to community', async () => {
    const { Wrapper } = wrapper();
    renderHook(() => useSmartRouting(), { wrapper: Wrapper });

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/patient/dashboard'));
  });
});

describe('useRoleRouteEnforcement on mobile (VTID-03936)', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('bounces a mobile patient off a community route to /patient/dashboard via dbRole', async () => {
    locationPathname = '/discover';
    const { Wrapper } = wrapper();
    renderHook(() => useRoleRouteEnforcement(), { wrapper: Wrapper });

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/patient/dashboard', { replace: true }));
  });

  it('does not bounce a mobile patient already on their own /patient/* route', async () => {
    locationPathname = '/patient/dashboard';
    const { Wrapper } = wrapper();
    renderHook(() => useRoleRouteEnforcement(), { wrapper: Wrapper });

    // Give the effect a tick to (not) fire before asserting the negative.
    await new Promise((r) => setTimeout(r, 0));
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
