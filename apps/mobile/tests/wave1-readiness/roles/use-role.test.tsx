/**
 * VTID-05684 — Wave 1 readiness (roles, R4): useRole edge cases over the Supabase double.
 * Subject: src/identity/useRole.ts (:29 NO_ACTIVE_TENANT, :39-40 success, :43 community default).
 * The optimistic update, rollback and role.changed payloads are already in tests/identity.test.tsx:72-91 and are left out.
 * Readiness evidence only; does not prove the Wave 1 exit (needs G1).
 */
import '../../helpers/no-network';
import '../../helpers/mocks';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createSupabaseDouble, fakeSession } from '../../helpers/supabase-double';
import { makeWrapper } from '../../helpers/providers';
import { useRole } from '../../../src/identity/useRole';
import { overlayBus } from '../../../src/navigation/overlay-bus';
import { __setSupabaseForTests } from '../../../src/auth/client';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn(), push: jest.fn() },
  usePathname: () => '/home',
}));

const TENANT = 't-maxina';
const withTenant = fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: TENANT }, user_metadata: {} } });
const noTenant = fakeSession('u-1');
const tables = { tenants: [{ tenant_id: TENANT, slug: 'maxina', name: 'Maxina', brand: { accent: '#FF7BAC' } }], patient_profiles: [] };

type RpcHandlers = Record<string, (a: unknown) => { data: unknown; error: { message: string } | null }>;
function double(session: unknown, rpc: RpcHandlers = {}) {
  return createSupabaseDouble({ session, tables, rpc: rpc as never });
}
const rpcCalls = (d: ReturnType<typeof double>, name: string) => d.client.rpc.mock.calls.filter((c: unknown[]) => c[0] === name);

beforeEach(() => {
  jest.clearAllMocks();
  overlayBus.clear();
});
afterAll(() => __setSupabaseForTests(null));

describe('useRole — no active tenant (useRole.ts:29)', () => {
  it('setRole answers NO_ACTIVE_TENANT and runs no RPC at all', async () => {
    const d = double(noTenant, { set_role_preference: () => ({ data: null, error: null }) });
    const events: unknown[] = [];
    overlayBus.on('role.changed', (e) => events.push(e));
    const { result } = renderHook(() => useRole(), { wrapper: makeWrapper({ client: d.client }) });
    let res: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      res = await result.current.setRole('patient');
    });
    expect(res).toEqual({ ok: false, error: 'NO_ACTIVE_TENANT' });
    expect(rpcCalls(d, 'set_role_preference')).toHaveLength(0);
    expect(rpcCalls(d, 'get_role_preference')).toHaveLength(0); // the query is disabled without a tenant (useRole.ts:23)
    expect(events).toEqual([]);
    expect(result.current.dbRole).toBe('community');
  });
});

describe('useRole — dbRole default (useRole.ts:43)', () => {
  it.each([
    ['null data', null],
    ['an empty list', []],
    ['a row with a null role', [{ role: null }]],
    ['a row with an empty role', [{ role: '' }]],
  ] as const)('is community when get_role_preference returns %s', async (_name, data) => {
    const d = double(withTenant, { get_role_preference: () => ({ data, error: null }) });
    const { result } = renderHook(() => useRole(), { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(rpcCalls(d, 'get_role_preference')).toHaveLength(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dbRole).toBe('community');
  });

  it('is the stored role when get_role_preference returns one', async () => {
    const d = double(withTenant, { get_role_preference: () => ({ data: [{ role: 'professional' }], error: null }) });
    const { result } = renderHook(() => useRole(), { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(result.current.dbRole).toBe('professional'));
    expect(rpcCalls(d, 'get_role_preference')[0][1]).toEqual({ p_tenant_id: TENANT });
  });

  it('stays community when get_role_preference errors', async () => {
    const d = double(withTenant, { get_role_preference: () => ({ data: null, error: { message: 'boom' } }) });
    const { result } = renderHook(() => useRole(), { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(rpcCalls(d, 'get_role_preference')).toHaveLength(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dbRole).toBe('community');
  });
});

describe('useRole — setRole success (useRole.ts:39-40)', () => {
  it('returns { ok: true }, writes once, and re-reads the preference', async () => {
    let stored = 'community';
    const d = double(withTenant, {
      get_role_preference: () => ({ data: [{ role: stored }], error: null }),
      set_role_preference: (a) => {
        stored = (a as { p_role: string }).p_role;
        return { data: null, error: null };
      },
    });
    const events: unknown[] = [];
    overlayBus.on('role.changed', (e) => events.push(e));
    const { result } = renderHook(() => useRole(), { wrapper: makeWrapper({ client: d.client }) });
    await waitFor(() => expect(rpcCalls(d, 'get_role_preference')).toHaveLength(1)); // tenant resolves first
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      res = await result.current.setRole('staff');
    });
    expect(res).toEqual({ ok: true });
    expect(rpcCalls(d, 'set_role_preference')).toEqual([['set_role_preference', { p_tenant_id: TENANT, p_role: 'staff' }]]);
    expect(events).toEqual([{ from: 'community', to: 'staff' }]); // success emits one change, no rollback event
    await waitFor(() => expect(rpcCalls(d, 'get_role_preference')).toHaveLength(2)); // invalidated -> re-read
    await waitFor(() => expect(result.current.dbRole).toBe('staff'));
  });
});
