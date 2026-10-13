/**
 * VTID-05147 (Track S / S-M) — the role switcher's write path, end to end
 * through the real useRole().setRole.
 *
 * The platform migration closed every direct client write to role_preferences
 * and made set_role_preference refuse a tenant the caller does not belong to
 * ("Not a member of this tenant") next to the existing "Role not granted for
 * this tenant". This pins that the switcher only ever calls that RPC, and that
 * a refusal rolls the optimistic role back, shows the error toast and does not
 * navigate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

const rpcMock = vi.fn();
const fromMock = vi.fn();
const navigateMock = vi.fn();
const notifyErrorMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (proc: string, args: unknown) => {
      if (proc === 'get_role_preference') return Promise.resolve({ data: [{ role: 'community' }], error: null });
      return rpcMock(proc, args);
    },
    from: (table: string) => fromMock(table),
  },
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('./useTenant', () => ({ useTenant: () => ({ activeTenantId: 'tenant-1', isExafyAdmin: false }) }));
vi.mock('./useMemberships', () => ({ useMemberships: () => ({ roles: ['community', 'professional'] }) }));
vi.mock('./use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('./usePatientAccess', () => ({ usePatientAccess: () => ({ isPatient: false }) }));
vi.mock('./useBusinessMode', () => ({
  useBusinessMode: () => ({ orgs: [], isBusinessMode: false, activeOrg: null, enterBusinessMode: vi.fn() }),
}));
vi.mock('@/lib/i18n-toast', () => ({ notifyError: (...a: unknown[]) => notifyErrorMock(...a) }));

import { useRoleSwitch } from './useRoleSwitch';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['rolePref', 'tenant-1'], 'community');
  return { qc, Wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: qc }, children) };
}

describe('useRoleSwitch → set_role_preference (VTID-05147)', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    navigateMock.mockReset();
    notifyErrorMock.mockReset();
  });

  it('switching to a permitted professional calls only rpc(set_role_preference) and navigates', async () => {
    rpcMock.mockResolvedValue({ error: null });
    const { Wrapper } = wrapper();
    const { result } = renderHook(() => useRoleSwitch(), { wrapper: Wrapper });
    expect(result.current.availableRoles).toEqual(['community', 'professional']);

    let outcome: { ok: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.switchRole('professional');
    });

    expect(outcome).toEqual({ ok: true });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('set_role_preference', { p_tenant_id: 'tenant-1', p_role: 'professional' });
    // No direct table write (the tables are closed to members).
    expect(fromMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/professional/dashboard');
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it.each([
    ['Not a member of this tenant'],
    ['Role not granted for this tenant'],
  ])('a refusal (%s) rolls back, shows the error toast and does not navigate', async (message) => {
    rpcMock.mockResolvedValue({ error: { message } });
    const { qc, Wrapper } = wrapper();
    const { result } = renderHook(() => useRoleSwitch(), { wrapper: Wrapper });

    let outcome: { ok: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.switchRole('professional');
    });

    expect(outcome).toEqual({ ok: false });
    expect(notifyErrorMock).toHaveBeenCalledWith('toasts.settings.errorSwitchingRole', 'toasts.settings.failedSwitchRolePleaseTryAgain');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(qc.getQueryData(['rolePref', 'tenant-1'])).toBe('community');
  });

  it('the hook source has no direct role_preferences write', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    for (const f of ['useRoleSwitch.ts', 'useRole.tsx']) {
      const src = readFileSync(join(__dirname, f), 'utf8');
      expect(src).not.toMatch(/\.from\(\s*['"]role_preferences['"]\s*\)[\s\S]{0,200}\.(upsert|insert|update|delete)\(/);
    }
  });
});
