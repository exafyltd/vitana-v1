/** VTID-05186 (N3, plan change 11) — tenant, roles, memberships, role switch, business mode. */
import './helpers/no-network';
import './helpers/mocks';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { createSupabaseDouble, fakeSession } from './helpers/supabase-double';
import { makeWrapper } from './helpers/providers';
import { useTenant } from '../src/identity/TenantProvider';
import { useRole } from '../src/identity/useRole';
import { fetchPermittedRoles } from '../src/identity/useMemberships';
import { useRoleSwitch } from '../src/identity/useRoleSwitch';
import { openWebConsole, webConsoleUrl } from '../src/identity/web-console';
import { overlayBus } from '../src/navigation/overlay-bus';
import { computeAvailableRoles, ROLE_LADDER } from '../src/ports/core';
import { __setSupabaseForTests } from '../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../src/ports/ui';

let mockPathname = '/home';
jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn(), push: jest.fn() },
  usePathname: () => mockPathname,
}));

const TENANT = 't-maxina';
const session = fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: TENANT }, user_metadata: {} } });

function double(rpc: Record<string, (a: unknown) => unknown> = {}) {
  return createSupabaseDouble({
    session,
    tables: { tenants: [{ tenant_id: TENANT, slug: 'maxina', name: 'Maxina' }], patient_profiles: [] },
    rpc: {
      get_role_preference: () => ({ data: [{ role: 'community' }], error: null }),
      get_my_permitted_roles: () => ({ data: { ok: true, roles: ['community', 'staff'] }, error: null }),
      ...(rpc as Record<string, never>),
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  overlayBus.clear();
  __clearToastsForTests();
  mockPathname = '/home';
});
afterAll(() => __setSupabaseForTests(null));

describe('tenant', () => {
  it('reads the active tenant from app_metadata and merges TENANT_CONFIGS', async () => {
    const d = double();
    const { result } = renderHook(() => useTenant(), { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(result.current.tenant?.name).toBe('Maxina'));
    expect(result.current.activeTenantId).toBe(TENANT);
    expect(result.current.tenant?.brandAccent).toBe('#FF7BAC');
  });

  it('setTenantBySlug switches, refreshes the session and persists the slug', async () => {
    const d = double({ switch_to_tenant_by_slug: () => ({ data: null, error: null }) });
    d.client.from.mockClear();
    const { result } = renderHook(() => useTenant(), { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(result.current.activeTenantId).toBe(TENANT));
    await act(async () => {
      await result.current.setTenantBySlug('earthlinks');
    });
    expect(d.client.rpc).toHaveBeenCalledWith('switch_to_tenant_by_slug', { p_tenant_slug: 'maxina' });
    expect(d.client.auth.refreshSession).toHaveBeenCalled();
    expect(result.current.storedSlug).toBe('maxina');
    expect(result.current.switching).toBe(false);
  });
});

describe('role preference', () => {
  it('set_role_preference is optimistic and rolls back on failure', async () => {
    const d = double({ set_role_preference: () => ({ data: null, error: { message: 'denied' } }) });
    const events: unknown[] = [];
    overlayBus.on('role.changed', (e) => events.push(e));
    const { result } = renderHook(() => useRole(), { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(d.client.rpc).toHaveBeenCalledWith('get_role_preference', { p_tenant_id: TENANT }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let res: { ok: boolean } = { ok: true };
    await act(async () => {
      res = await result.current.setRole('patient');
    });
    expect(res.ok).toBe(false);
    expect(d.client.rpc).toHaveBeenCalledWith('set_role_preference', { p_tenant_id: TENANT, p_role: 'patient' });
    expect(events).toEqual([
      { from: 'community', to: 'patient' },
      { from: 'patient', to: 'community' },
    ]);
    expect(result.current.dbRole).toBe('community');
  });

  it('get_my_permitted_roles falls back to list_roles_for_active_tenant', async () => {
    const d = createSupabaseDouble({
      rpc: {
        get_my_permitted_roles: () => ({ data: null, error: { message: 'function does not exist' } }),
        list_roles_for_active_tenant: () => ({ data: [{ role: 'community' }, { role: 'professional' }], error: null }),
      },
    });
    __setSupabaseForTests(d.client);
    await expect(fetchPermittedRoles(TENANT)).resolves.toEqual(['community', 'professional']);
    expect(d.client.rpc).toHaveBeenCalledWith('list_roles_for_active_tenant', { p_tenant_id: TENANT });
  });

  it('computeAvailableRoles never lists backoffice, developer or infra on the phone', () => {
    const roles = computeAvailableRoles({ granted: ROLE_LADDER, isExafyAdmin: true, isPatient: true, isMobile: true });
    expect(roles).toEqual(['community', 'patient', 'professional', 'staff', 'admin']);
  });
});

describe('role switch', () => {
  it('staff/admin open the adminInBrowser sheet when webBaseUrl is unset (never a host)', async () => {
    const d = double({ set_role_preference: () => ({ data: null, error: null }) });
    const sheet = jest.fn();
    overlayBus.on('adminInBrowser:open', sheet);
    const { result } = renderHook(() => useRoleSwitch(), { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(result.current.availableRoles).toEqual(['community', 'staff']));
    await act(async () => {
      await result.current.switchRole('staff');
    });
    expect(sheet).toHaveBeenCalledWith({ path: '/admin' });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('a failed write raises the role-switch error toast (keys) and does not navigate', async () => {
    const d = double({ set_role_preference: () => ({ data: null, error: { message: 'x' } }) });
    const { result } = renderHook(() => useRoleSwitch(), { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(result.current.availableRoles.length).toBe(2));
    await act(async () => {
      await result.current.switchRole('community');
    });
    expect(__toastsForTests().map((t) => t.titleKey)).toEqual(['toasts.settings.errorSwitchingRole']);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('community lands on /home through the router', async () => {
    const d = double({ set_role_preference: () => ({ data: null, error: null }) });
    const { result } = renderHook(() => useRoleSwitch(), { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(result.current.availableRoles.length).toBe(2));
    await act(async () => {
      await result.current.switchRole('community');
    });
    expect(router.navigate).toHaveBeenCalledWith('/home');
  });

  it('a business entry switches without any role RPC', async () => {
    const d = double();
    const { result } = renderHook(() => useRoleSwitch(), {
      wrapper: makeWrapper({ client: d.client, gateway: { '/api/v1/partner-orgs/mine': { organizations: [{ id: 'org-1', display_name: 'Lab', role: 'org_admin' }] } } }),
    });
    await waitFor(() => expect(result.current.businessEntries).toEqual([{ orgId: 'org-1', orgName: 'Lab', role: 'org_admin' }]));
    expect(result.current.canSwitch).toBe(true);
    act(() => result.current.switchToBusiness('org-1'));
    expect(router.navigate).toHaveBeenCalledWith('/commerce/team');
    expect(d.client.rpc.mock.calls.map((c: unknown[]) => c[0])).not.toContain('set_role_preference');
  });

  it('openWebConsole opens webBaseUrl + path in the system browser when it is set', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await expect(openWebConsole('/admin', 'https://g1-web.example.org/')).resolves.toBe('browser');
    expect(spy).toHaveBeenCalledWith('https://g1-web.example.org/admin');
    expect(webConsoleUrl('/admin', undefined)).toBeNull();
  });
});
