/**
 * VTID-03909 — setRole() used to fire the set_role_preference RPC in the
 * background and return void, so ProfileDrawer's hard-navigate-after-100ms
 * role switch could race the write: the page could reload before the RPC
 * resolved (or failed silently, since the only error handling was
 * console.error), landing the user on whichever role was ALREADY persisted
 * instead of the one they picked — indistinguishable, in the UI, from a
 * successful switch.
 *
 * setRole() now returns a promise that resolves once the write is actually
 * confirmed or rejected, so a caller that needs certainty before navigating
 * can await it instead of racing a fixed timeout.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

// useRole's own useQuery(['rolePref', tenantId]) ALSO calls supabase.rpc
// (get_role_preference) as soon as the hook mounts, through the same client —
// so the mock has to route by procedure name rather than assume every call
// is the set_role_preference write under test.
const setRolePreferenceMock = vi.fn();
const useTenantMock = vi.fn(() => ({ activeTenantId: 'tenant-1', isExafyAdmin: false }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (proc: string, args: unknown) => {
      if (proc === 'get_role_preference') {
        return Promise.resolve({ data: [{ role: 'community' }], error: null });
      }
      if (proc === 'set_role_preference') {
        return setRolePreferenceMock(args);
      }
      throw new Error(`unexpected rpc: ${proc}`);
    },
  },
}));
vi.mock('./useTenant', () => ({ useTenant: () => useTenantMock() }));
vi.mock('./use-mobile', () => ({ useIsMobile: () => false }));

import { useRole } from './useRole';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Seed the role-preference cache so setRole has a known "previous role" to
  // roll back to on failure.
  qc.setQueryData(['rolePref', 'tenant-1'], 'community');
  return { qc, Wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children) };
}

describe('useRole().setRole', () => {
  beforeEach(() => {
    setRolePreferenceMock.mockReset();
    useTenantMock.mockReset();
    useTenantMock.mockReturnValue({ activeTenantId: 'tenant-1', isExafyAdmin: false });
  });

  it('resolves { ok: true } once the RPC confirms, and leaves the optimistic cache in place', async () => {
    setRolePreferenceMock.mockResolvedValueOnce({ error: null });
    const { qc, Wrapper } = wrapper();
    const { result } = renderHook(() => useRole(), { wrapper: Wrapper });

    const outcome = await result.current.setRole('backoffice');

    expect(outcome).toEqual({ ok: true });
    expect(setRolePreferenceMock).toHaveBeenCalledWith({ p_tenant_id: 'tenant-1', p_role: 'backoffice' });
    expect(qc.getQueryData(['rolePref', 'tenant-1'])).toBe('backoffice');
  });

  it('resolves { ok: false, error } on a rejected write and rolls the cache back to the previous role', async () => {
    setRolePreferenceMock.mockResolvedValueOnce({ error: { message: 'Role not granted for this tenant or invalid role assignment' } });
    const { qc, Wrapper } = wrapper();
    const { result } = renderHook(() => useRole(), { wrapper: Wrapper });

    const outcome = await result.current.setRole('backoffice');

    expect(outcome.ok).toBe(false);
    expect(outcome.error).toMatch(/not granted/);
    // Rolled back — a caller awaiting this must not treat the switch as live.
    expect(qc.getQueryData(['rolePref', 'tenant-1'])).toBe('community');
  });

  it('resolves { ok: false } synchronously without calling the RPC when there is no active tenant', async () => {
    useTenantMock.mockReturnValue({ activeTenantId: null, isExafyAdmin: false });
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useRole(), { wrapper: Wrapper });

    const outcome = await result.current.setRole('patient');
    expect(outcome).toEqual({ ok: false, error: 'NO_ACTIVE_TENANT' });
    expect(setRolePreferenceMock).not.toHaveBeenCalled();
  });
});
