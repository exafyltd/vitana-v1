/**
 * VTID-03962 — hasPermission() used to bypass mobile enforcement entirely.
 *
 * useRole()'s own comment says "MOBILE ENFORCEMENT: Mobile devices are
 * ALWAYS community role — no role switching on mobile", and effectiveRole
 * (returned as `currentRole`) correctly applied that. But hasPermission()
 * — the function ProtectedRoute actually calls to gate routes like
 * /backoffice/* — had two independent bugs that both ignored it:
 *
 *   1. `if (isExafyAdmin) return true;` bypassed mobile entirely for any
 *      Exafy admin account, regardless of viewport.
 *   2. The hierarchy check below it read the raw, unmapped `query.data`
 *      (dbRole) instead of the mobile-safe effectiveRole, so even a
 *      non-Exafy-admin account with a stored 'backoffice'/'admin'/etc.
 *      role preference would also pass a role-gated route's check on
 *      mobile.
 *
 * Net effect: an Exafy admin (or any elevated-role account) who opened a
 * desktop-only surface like BackOffice on a phone — via a stale URL, deep
 * link, or the landing-redirect race — had ProtectedRoute render it in
 * full, with the mobile community bottom nav overlaid on top, instead of
 * the intended access-denied/bounce-to-home behavior.
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

describe('useRole().hasPermission — mobile enforcement (VTID-03962)', () => {
  beforeEach(() => {
    useTenantMock.mockReset();
    useIsMobileMock.mockReset();
    storedRole = 'community';
  });

  it('Exafy admin, desktop, dbRole=community: still passes a backoffice guard (bypass preserved)', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: true });
    useIsMobileMock.mockReturnValue(false);
    storedRole = 'community';

    const result = await renderRole();
    expect(result.current.currentRole).toBe('community');
    expect(result.current.hasPermission('backoffice')).toBe(true);
  });

  it('Exafy admin, MOBILE: no longer passes a backoffice guard — effectiveRole is community', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: true });
    useIsMobileMock.mockReturnValue(true);
    storedRole = 'backoffice';

    const result = await renderRole();
    expect(result.current.currentRole).toBe('community');
    expect(result.current.hasPermission('backoffice')).toBe(false);
    // Community-level routes must still be reachable.
    expect(result.current.hasPermission('community')).toBe(true);
  });

  it('non-Exafy account with a stored backoffice role, desktop: passes the guard', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: false });
    useIsMobileMock.mockReturnValue(false);
    storedRole = 'backoffice';

    const result = await renderRole();
    expect(result.current.hasPermission('backoffice')).toBe(true);
  });

  it('non-Exafy account with a stored backoffice role, MOBILE: no longer passes the guard (was reading raw dbRole)', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: false });
    useIsMobileMock.mockReturnValue(true);
    storedRole = 'backoffice';

    const result = await renderRole();
    expect(result.current.hasPermission('backoffice')).toBe(false);
  });

  it('non-Exafy account with a stored admin role, MOBILE: does not pass an admin guard either', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: false });
    useIsMobileMock.mockReturnValue(true);
    storedRole = 'admin';

    const result = await renderRole();
    expect(result.current.hasPermission('admin')).toBe(false);
    expect(result.current.hasPermission('community')).toBe(true);
  });
});
