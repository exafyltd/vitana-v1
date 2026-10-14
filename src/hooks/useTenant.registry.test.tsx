/**
 * VTID-05151 — useTenant reads tenants from the registry.
 *
 *  - an active tenant the registry does not list is neutral (its own name, no
 *    brand), never Maxina;
 *  - setTenantBySlug refuses an unknown or reserved slug without calling the
 *    switch RPC;
 *  - when the RPC refuses (42501 TENANT_NOT_JOINABLE) the tenant is not set.
 */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: { id: 'u-1', app_metadata: { active_tenant_id: 't-other' } } as Record<string, unknown> | null,
  registryRows: [] as unknown[],
  registryError: null as unknown,
  switchError: null as unknown,
  tenantRows: {} as Record<string, unknown>,
  rpcCalls: [] as Array<[string, unknown]>,
  refreshedTenantId: 't-alkalma' as string | null,
}));

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: state.user, session: null }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: async (fn: string, args: unknown) => {
      state.rpcCalls.push([fn, args]);
      if (fn === 'list_public_tenants') return { data: state.registryError ? null : state.registryRows, error: state.registryError };
      if (fn === 'switch_to_tenant_by_slug') return { data: null, error: state.switchError };
      return { data: null, error: null };
    },
    from: (table: string) => {
      let id = '';
      const q = {
        select: () => q,
        eq: (_col: string, v: string) => {
          id = v;
          return q;
        },
        single: async () =>
          table === 'tenants' && state.tenantRows[id]
            ? { data: state.tenantRows[id], error: null }
            : { data: null, error: { message: 'not found' } },
      };
      return q;
    },
    auth: {
      refreshSession: async () => ({
        data: { session: { user: { app_metadata: { active_tenant_id: state.refreshedTenantId } } } },
        error: null,
      }),
    },
    functions: { invoke: async () => ({ data: null, error: null }) },
    storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: p } }) }) },
  },
}));

import { TenantProvider, useTenant, type TenantSwitchResult } from './useTenant';

const ROWS = [
  { tenant_id: 't-alkalma', slug: 'alkalma', name: 'Alkalma', display_name: 'AlKalma', open_signup: true, brand: { accent: '#3B82F6' }, landing: { post_login_path: '/home' }, locales: null },
  { tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina', display_name: 'Maxina', open_signup: true, brand: { accent: '#FF7BAC', bg: '#FFF5F8', fg: '#1a1a2e' }, landing: { post_login_path: '/onboarding/welcome' }, locales: null },
];

let ctx: ReturnType<typeof useTenant> | null = null;
function Probe() {
  ctx = useTenant();
  return null;
}

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <Probe />
      </TenantProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  ctx = null;
  state.user = { id: 'u-1', app_metadata: { active_tenant_id: 't-other' } };
  state.registryRows = ROWS;
  state.registryError = null;
  state.switchError = null;
  state.tenantRows = { 't-other': { tenant_id: 't-other', slug: 'other-co', name: 'Other Co' } };
  state.rpcCalls = [];
  state.refreshedTenantId = 't-alkalma';
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
});

describe('useTenant — registry-backed tenant', () => {
  it('an active tenant the registry does not list is neutral — its own name, never Maxina', async () => {
    mount();
    await waitFor(() => expect(ctx?.tenant).not.toBeNull());
    expect(ctx!.tenant).toMatchObject({ tenantId: 't-other', slug: 'other-co', name: 'Other Co', id: '' });
    expect(ctx!.tenant!.name).not.toBe('Maxina');
    expect(ctx!.tenant!.brandAccent).toBeUndefined();
  });

  it('a listed tenant resolves from the registry with its display name and brand', async () => {
    state.user = { id: 'u-1', app_metadata: { active_tenant_id: 't-alkalma' } };
    mount();
    await waitFor(() => expect(ctx?.tenant?.slug).toBe('alkalma'));
    expect(ctx!.tenant).toMatchObject({ id: '', tenantId: 't-alkalma', tenant_id: 't-alkalma', name: 'AlKalma', displayName: 'AlKalma', brandAccent: '#3B82F6' });
  });

  it('with the registry down, an unknown tenant is still neutral (the fallback is Maxina only, by slug)', async () => {
    state.registryError = { message: 'boom' };
    mount();
    await waitFor(() => expect(ctx?.tenant).not.toBeNull());
    expect(ctx!.tenant).toMatchObject({ name: 'Other Co', slug: 'other-co' });
  });
});

describe('useTenant — setTenantBySlug', () => {
  it('refuses an unknown or reserved slug without calling the switch RPC', async () => {
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    let results: TenantSwitchResult[] = [];
    await act(async () => {
      results = [await ctx!.setTenantBySlug('zz'), await ctx!.setTenantBySlug('zz-unknown'), await ctx!.setTenantBySlug('home')];
    });
    expect(results.map((r) => r.ok)).toEqual([false, false, false]);
    expect(state.rpcCalls.filter(([fn]) => fn === 'switch_to_tenant_by_slug')).toEqual([]);
  });

  it('a 42501 refusal does not set the tenant and reports not_joinable', async () => {
    state.switchError = { code: '42501', message: 'TENANT_NOT_JOINABLE' };
    mount();
    await waitFor(() => expect(ctx?.tenant?.slug).toBe('other-co'));
    let result: TenantSwitchResult | null = null;
    await act(async () => {
      result = await ctx!.setTenantBySlug('alkalma');
    });
    expect(result).toEqual({ ok: false, code: 'not_joinable', message: 'TENANT_NOT_JOINABLE' });
    expect(state.rpcCalls.filter(([fn]) => fn === 'switch_to_tenant_by_slug')).toEqual([['switch_to_tenant_by_slug', { p_tenant_slug: 'alkalma' }]]);
    expect(ctx!.activeTenantId).toBe('t-other');
    expect(localStorage.getItem('tenant_slug')).toBeNull();
  });

  it('a successful switch sets the tenant from the refreshed session', async () => {
    mount();
    await waitFor(() => expect(ctx?.tenant).not.toBeNull());
    let result: TenantSwitchResult | null = null;
    await act(async () => {
      result = await ctx!.setTenantBySlug('AlKalma');
    });
    expect(result).toEqual({ ok: true, tenantId: 't-alkalma' });
    await waitFor(() => expect(ctx!.tenant?.slug).toBe('alkalma'));
    expect(localStorage.getItem('tenant_slug')).toBe('alkalma');
  });

  it('signed out: no call at all', async () => {
    state.user = null;
    mount();
    await waitFor(() => expect(ctx).not.toBeNull());
    let result: TenantSwitchResult | null = null;
    await act(async () => {
      result = await ctx!.setTenantBySlug('alkalma');
    });
    expect(result).toEqual({ ok: false, code: 'not_signed_in' });
    expect(state.rpcCalls.filter(([fn]) => fn === 'switch_to_tenant_by_slug')).toEqual([]);
  });
});
