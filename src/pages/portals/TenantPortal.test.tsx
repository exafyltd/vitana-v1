/**
 * VTID-05151 — the generic community portal (/:tenantSlug, /alkalma).
 */
import React from 'react';
import axe from 'axe-core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: null as Record<string, unknown> | null,
  rows: {} as Record<string, unknown>,
  resolveError: null as unknown,
  member: false,
  activeSlug: null as string | null,
  switchResult: { ok: true, tenantId: 't-1' } as Record<string, unknown>,
  rpcCalls: [] as Array<[string, unknown]>,
  switchCalls: [] as string[],
  signUps: [] as unknown[],
}));

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => ({
    tenant: state.activeSlug ? { slug: state.activeSlug } : null,
    setTenantBySlug: async (slug: string) => {
      state.switchCalls.push(slug);
      return state.switchResult;
    },
  }),
}));
vi.mock('@/hooks/useTenantRegistry', () => ({
  useTenantRegistry: () => ({
    source: 'rpc',
    isLoading: false,
    tenants: Object.values(state.rows),
  }),
}));
vi.mock('@/hooks/useSupabaseOAuthSignIn', () => ({
  useSupabaseOAuthSignIn: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: async (fn: string, args: { p_slug?: string }) => {
      state.rpcCalls.push([fn, args]);
      if (state.resolveError) return { data: null, error: state.resolveError };
      const row = args?.p_slug ? state.rows[args.p_slug] : undefined;
      return { data: row ? [row] : [], error: null };
    },
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: state.member ? { tenant_id: 't' } : null, error: null }),
      };
      return q;
    },
    auth: {
      signInWithPassword: async () => ({ data: {}, error: null }),
      signUp: async (args: unknown) => {
        state.signUps.push(args);
        return { data: {}, error: null };
      },
      resend: async () => ({ error: null }),
    },
    storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.example/${p}` } }) }) },
  },
}));

import TenantPortal from './TenantPortal';
import { portalLandingTarget } from '@/lib/tenant-registry';

const OPEN = {
  tenant_id: 't-acme',
  slug: 'acme',
  name: 'Acme',
  display_name: 'Acme Health',
  open_signup: true,
  brand: {},
  landing: { post_login_path: '/home/feed', oauth: false },
  locales: null,
};
const CLOSED = { ...OPEN, tenant_id: 't-closed', slug: 'closed-co', display_name: 'Closed Co', open_signup: false };
const SELF = { ...OPEN, tenant_id: 't-self', slug: 'self-co', display_name: 'Self Co', landing: { post_login_path: '/self-co' } };

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function renderAt(url: string, dir?: 'rtl') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <div dir={dir}>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/home" element={<Where />} />
            <Route path="/home/feed" element={<Where />} />
            <Route path="/maxina" element={<Where />} />
            <Route path="/alkalma" element={<TenantPortal slug="alkalma" />} />
            <Route path="/:tenantSlug" element={<TenantPortal />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </div>,
  );
}

const resolveCalls = () => state.rpcCalls.filter(([fn]) => fn === 'resolve_tenant');

beforeEach(() => {
  state.user = null;
  state.rows = { acme: OPEN, 'closed-co': CLOSED, 'self-co': SELF };
  state.resolveError = null;
  state.member = false;
  state.activeSlug = null;
  state.switchResult = { ok: true, tenantId: 't-acme' };
  state.rpcCalls = [];
  state.switchCalls = [];
  state.signUps = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('slug checks', () => {
  it('an unknown slug renders NotFound after one resolve call', async () => {
    renderAt('/zz-unknown');
    await screen.findByText('404');
    expect(resolveCalls()).toEqual([['resolve_tenant', { p_slug: 'zz-unknown' }]]);
  });

  it('a malformed or reserved slug renders NotFound without any call', async () => {
    for (const url of ['/a', '/bad_slug', '/home2x!', '/commerce', '/discover']) {
      const view = renderAt(url);
      expect(screen.getByText('404')).toBeTruthy();
      view.unmount();
    }
    expect(resolveCalls()).toEqual([]);
  });

  it('a retired slug redirects to its successor without a call', async () => {
    renderAt('/earthlings');
    expect((await screen.findByTestId('where')).textContent).toBe('/maxina');
    expect(resolveCalls()).toEqual([]);
  });

  it('a failed resolve shows the error state with Retry — never Maxina', async () => {
    state.resolveError = { message: 'boom' };
    renderAt('/acme');
    // The resolve call is retried once before the error state shows.
    const alert = await screen.findByRole('alert', undefined, { timeout: 5000 });
    expect(alert.textContent).not.toMatch(/maxina/i);
    expect(screen.queryByText('404')).toBeNull();
    state.resolveError = null;
    fireEvent.click(screen.getByRole('button'));
    await screen.findByText('Acme Health');
  });
});

describe('anonymous visitor', () => {
  it('open tenant: brand, sign-in and the sign-up form', async () => {
    renderAt('/acme');
    await screen.findByText('Acme Health');
    expect(document.querySelector('[data-screen="tenant-portal"]')).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('tab', { name: /beitreten|join/i }));
    fireEvent.click(screen.getByRole('tab', { name: /beitreten|join/i }));
    await waitFor(() => expect(document.querySelector('#tenant-signup-email')).toBeTruthy());
    expect(document.querySelector('[data-tenant-invite-only]')).toBeNull();
  });

  it('sign-up carries the tenant slug and confirms back to the portal', async () => {
    renderAt('/acme');
    await screen.findByText('Acme Health');
    fireEvent.mouseDown(screen.getByRole('tab', { name: /beitreten|join/i }));
    await waitFor(() => expect(document.querySelector('#tenant-signup-email')).toBeTruthy());
    fireEvent.change(document.querySelector('#tenant-signup-name')!, { target: { value: 'A B' } });
    fireEvent.change(document.querySelector('#tenant-signup-email')!, { target: { value: 'a@b.c' } });
    fireEvent.change(document.querySelector('#tenant-signup-password')!, { target: { value: 'secret12' } });
    await act(async () => {
      fireEvent.submit(document.querySelector('#tenant-signup-email')!.closest('form')!);
    });
    expect(state.signUps).toEqual([
      {
        email: 'a@b.c',
        password: 'secret12',
        options: { emailRedirectTo: 'https://vitanaland.com/acme?confirmed=true', data: { full_name: 'A B', tenant_slug: 'acme' } },
      },
    ]);
  });

  it('closed tenant: invite-only notice instead of the sign-up form', async () => {
    renderAt('/closed-co');
    await screen.findByText('Closed Co');
    fireEvent.mouseDown(screen.getByRole('tab', { name: /beitreten|join/i }));
    await waitFor(() => expect(document.querySelector('[data-tenant-invite-only]')).toBeTruthy());
    expect(document.querySelector('#tenant-signup-email')).toBeNull();
  });

  it('no OAuth buttons unless landing.oauth', async () => {
    renderAt('/acme');
    await screen.findByText('Acme Health');
    expect(document.querySelector('[data-tenant-auth-oauth]')).toBeNull();
  });

  it('/alkalma is the portal with its seeded name', async () => {
    state.rows.alkalma = { ...OPEN, tenant_id: 't-alk', slug: 'alkalma', display_name: 'AlKalma', landing: { oauth: true, post_login_path: '/home' } };
    renderAt('/alkalma');
    await screen.findByText('AlKalma');
    expect(document.querySelector('[data-tenant-auth-oauth]')).toBeTruthy();
  });

  it('RTL renders with logical classes only', async () => {
    const { container } = renderAt('/acme', 'rtl');
    await screen.findByText('Acme Health');
    const classes = [...container.querySelectorAll('[data-screen="tenant-portal"] *')].map((el) => el.getAttribute('class') ?? '').join(' ');
    expect(classes).not.toMatch(/\b(ml|mr|pl|pr|left|right|text-left|text-right|rounded-l|rounded-r)-/);
  });

  it('has no axe violations', async () => {
    const { container } = renderAt('/acme');
    await screen.findByText('Acme Health');
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
});

describe('signed-in visitor', () => {
  beforeEach(() => {
    state.user = { id: 'u-1' };
  });

  it('member: switches once, then goes to post_login_path', async () => {
    state.member = true;
    renderAt('/acme');
    expect((await screen.findByTestId('where')).textContent).toBe('/home/feed');
    expect(state.switchCalls).toEqual(['acme']);
  });

  it('member already in this tenant: no switch, straight to post_login_path', async () => {
    state.member = true;
    state.activeSlug = 'acme';
    renderAt('/acme');
    expect((await screen.findByTestId('where')).textContent).toBe('/home/feed');
    expect(state.switchCalls).toEqual([]);
  });

  it('cycle guard: a post_login_path pointing at the portal itself lands on /home', async () => {
    state.member = true;
    state.activeSlug = 'self-co';
    renderAt('/self-co');
    expect((await screen.findByTestId('where')).textContent).toBe('/home');
  });

  it('non-member of an open tenant: Join calls the switch RPC once', async () => {
    renderAt('/acme');
    const join = await screen.findByRole('button', { name: /Acme Health/ });
    expect(state.switchCalls).toEqual([]);
    await act(async () => {
      fireEvent.click(join);
    });
    expect(state.switchCalls).toEqual(['acme']);
    expect((await screen.findByTestId('where')).textContent).toBe('/home/feed');
  });

  it('a 42501 refusal shows an error and stays on the portal', async () => {
    state.switchResult = { ok: false, code: 'not_joinable' };
    renderAt('/acme');
    const join = await screen.findByRole('button', { name: /Acme Health/ });
    await act(async () => {
      fireEvent.click(join);
    });
    const err = await screen.findByRole('alert');
    expect(err.textContent).toMatch(/Acme Health/);
    expect(screen.queryByTestId('where')).toBeNull();
  });

  it('non-member of a closed tenant: invite-only, no join button', async () => {
    renderAt('/closed-co');
    await screen.findByText('Closed Co');
    await waitFor(() => expect(document.querySelector('[data-tenant-invite-only]')).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Closed Co/ })).toBeNull();
    expect(state.switchCalls).toEqual([]);
  });
});

describe('portalLandingTarget', () => {
  const reg = { source: 'rpc' as const, tenants: [OPEN, SELF] };
  it('never targets a portal path, and guards against open redirects', () => {
    expect(portalLandingTarget(OPEN, reg)).toBe('/home/feed');
    expect(portalLandingTarget(SELF, reg)).toBe('/home');
    expect(portalLandingTarget({ ...OPEN, landing: { post_login_path: '/self-co/x' } }, reg)).toBe('/home');
    expect(portalLandingTarget({ ...OPEN, landing: { post_login_path: '//evil.com' } }, reg)).toBe('/home');
    expect(portalLandingTarget({ ...OPEN, landing: {} }, reg)).toBe('/onboarding/welcome');
  });
});
