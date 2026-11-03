/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — test harness for the
 * business / commerce-mode screens. A Supabase double that RECORDS every auth
 * call, RPC and storage upload, and a gateway fake that records every request
 * (method, path without `/api/v1`, parsed body, headers) and answers by
 * `METHOD path` or bare path (a `{ __status, __body }` value answers that
 * status). Nothing reaches a network: `../helpers/no-network` replaces
 * `fetch` with a thrower and both doubles are installed through the shell's
 * test hooks; the gateway double sits under `createGatewayFetch`, exactly as
 * in the app. Writes are asserted as BUILT requests (requirements R5.2).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactElement, ReactNode } from 'react';
import { configure, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { UIProvider, __clearToastsForTests } from '../../src/ports/ui';
import { createGatewayFetch } from '../../src/ports/core';

// Every business test imports this harness: findBy*/waitFor get 5 s instead
// of RNTL's 1 s default so the suite holds under default-worker load.
configure({ asyncUtilTimeout: 5000 });
// Chained 5 s waits must fit inside the test's own budget (Jest default 5 s).
jest.setTimeout(30000);

type Row = Record<string, any>;
type Result = { data: any; error: { message: string } | null };
const ok = (data: any = null): Result => ({ data, error: null });

export function createCommerceSupabase(opts: {
  signedIn?: boolean;
  userId?: string;
  email?: string;
  tables?: Record<string, Row[]>;
  rpc?: Record<string, (args: any) => Result>;
  oauth?: Record<string, (id: string) => Result>;
  auth?: Partial<Record<'signUp' | 'signInWithPassword', (args: any) => Result>>;
} = {}) {
  const userId = opts.userId ?? 'u-1';
  const signedIn = opts.signedIn ?? true;
  const tables: Record<string, Row[]> = { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }], ...(opts.tables ?? {}) };
  const calls: Array<{ fn: string; args: any }> = [];
  const session = {
    access_token: `token-${userId}`,
    refresh_token: 'r',
    user: { id: userId, email: opts.email ?? 'ana@example.org', app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} },
  };
  const uploads: Array<{ bucket: string; path: string; size: number; options: Row }> = [];

  function from(table: string) {
    const filters: Array<[string, any]> = [];
    const run = (): Result => ok((tables[table] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v)));
    const builder: any = {
      select: () => builder,
      eq: (c: string, v: any) => (filters.push([c, v]), builder),
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => {
        const r = run();
        return ok(Array.isArray(r.data) ? (r.data[0] ?? null) : r.data);
      },
      single: async () => {
        const r = run();
        return ok(Array.isArray(r.data) ? r.data[0] : r.data);
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  const rpc = jest.fn(async (name: string, args?: any) => {
    calls.push({ fn: `rpc.${name}`, args });
    const h = opts.rpc?.[name];
    if (h) return h(args);
    if (name === 'list_public_tenants') return ok(tables.tenants.map((t) => ({ display_name: t.name, open_signup: true, ...t })));
    if (name === 'get_role_preference') return ok([{ role: 'community' }]);
    return ok(null);
  });

  const storage = {
    from: (bucket: string) => ({
      upload: jest.fn(async (path: string, body: Uint8Array, options: Row) => {
        uploads.push({ bucket, path, size: body.length, options });
        return ok({ path });
      }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${bucket}/${path}` } }),
    }),
  };

  const oauth = opts.oauth
    ? {
        getAuthorizationDetails: jest.fn(async (id: string) => (calls.push({ fn: 'oauth.details', args: id }), opts.oauth?.details?.(id) ?? ok(null))),
        approveAuthorization: jest.fn(async (id: string) => (calls.push({ fn: 'oauth.approve', args: id }), opts.oauth?.approve?.(id) ?? ok(null))),
        denyAuthorization: jest.fn(async (id: string) => (calls.push({ fn: 'oauth.deny', args: id }), opts.oauth?.deny?.(id) ?? ok(null))),
      }
    : undefined;

  const auth: any = {
    getSession: jest.fn(async () => ok({ session: signedIn ? session : null })),
    getUser: jest.fn(async () => ok({ user: signedIn ? session.user : null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
    refreshSession: jest.fn(async () => ok({ session: signedIn ? session : null })),
    signOut: jest.fn(async () => ({ error: null })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
    signUp: jest.fn(async (args: any) => (calls.push({ fn: 'auth.signUp', args }), opts.auth?.signUp?.(args) ?? ok({ user: null }))),
    signInWithPassword: jest.fn(async (args: any) => (calls.push({ fn: 'auth.signInWithPassword', args }), opts.auth?.signInWithPassword?.(args) ?? ok({ session: null }))),
    ...(oauth ? { oauth } : {}),
  };

  return { client: { auth, rpc, from: jest.fn(from), storage } as any, calls, uploads };
}

export type GatewayCall = { method: string; path: string; body: unknown; headers: Record<string, string> };

/** Answers `"METHOD /path"` first, then the bare `"/path"` (query string included, then without). */
export function createCommerceGateway(routes: Record<string, unknown> = {}) {
  const calls: GatewayCall[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const path = url.replace(/^https?:\/\/[^/]+\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body, headers: { ...(init.headers as Record<string, string>) } });
    const bare = path.split('?')[0];
    const key = [`${method} ${path}`, `${method} ${bare}`, path, bare].find((k) => Object.prototype.hasOwnProperty.call(routes, k));
    let value = key ? routes[key] : undefined;
    if (typeof value === 'function') value = (value as (b: unknown) => unknown)(body);
    const status = value && typeof value === 'object' && '__status' in (value as Row) ? (value as Row).__status : value === undefined ? 404 : 200;
    const payload = value && typeof value === 'object' && '__body' in (value as Row) ? (value as Row).__body : value;
    return { ok: status >= 200 && status < 300, status, text: async () => (payload === undefined ? '' : JSON.stringify(payload)) } as unknown as Response;
  };
  return {
    fetch,
    calls,
    writes: () => calls.filter((c) => c.method !== 'GET'),
    find: (method: string, path: string) => calls.find((c) => c.method === method && c.path === path),
  };
}

const clients: QueryClient[] = [];
afterEach(() => {
  while (clients.length) clients.pop()?.clear();
  __clearToastsForTests();
});

export function renderBusiness(
  ui: ReactElement,
  opts: { supabase: ReturnType<typeof createCommerceSupabase>; gateway?: ReturnType<typeof createCommerceGateway>; language?: string; direction?: 'ltr' | 'rtl' },
) {
  const gateway = opts.gateway ?? createCommerceGateway();
  __setSupabaseForTests(opts.supabase.client);
  // The shell's gateway: N1's createGatewayFetch over the fake, as in the app (origin + /api/v1 + path).
  __setGatewayForTests(createGatewayFetch({ origin: 'https://gateway.test', getAccessToken: async () => 'token-u-1', fetchImpl: gateway.fetch as never }));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  clients.push(qc);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider initialMode="light">
          <AuthProvider client={opts.supabase.client}>
            <TenantProvider>
              <LanguageProvider initialLanguage={opts.language ?? 'de-DE'}>
                <UIProvider colorScheme="light" direction={opts.direction ?? 'ltr'}>
                  {children}
                </UIProvider>
              </LanguageProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }
  return { ...render(ui, { wrapper: Wrapper }), gateway, qc };
}

/** Org rows as `/partner-orgs/mine` returns them. */
export const ORG_ADMIN = { id: 'org-1', org_key: 'demo-studio', display_name: 'Demo Studio', org_type: 'fitness_wellness', status: 'active', role: 'org_admin', lifecycle_state: 'draft' };
export const ORG_STAFF = { id: 'org-2', org_key: 'lab-two', display_name: 'Lab Two', org_type: 'health_medical', status: 'pending_review', role: 'staff' };
export const ORG_PRO = { id: 'org-3', org_key: 'clinic', display_name: 'Clinic', org_type: 'health_medical', status: 'active', role: 'professional' };
