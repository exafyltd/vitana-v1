/**
 * VTID-05431 (Native Wave 2, settings lane) — test harness for the settings
 * hub, `/settings/limitations` and `/settings/tenant-role`. An in-memory
 * Supabase double that RECORDS every write (update / upsert / rpc /
 * functions.invoke) and a gateway fake that records every request (method,
 * path, parsed body) and answers by `METHOD path` or bare path. Nothing
 * reaches a network: `../helpers/no-network` replaces `fetch` with a thrower
 * and both doubles are installed through the shell's test hooks. Writes are
 * asserted as BUILT requests — nothing is ever fired at a live backend
 * (requirements R5.2).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { UIProvider } from '../../src/ports/ui';

type Row = Record<string, any>;
type Result = { data: any; error: { message: string; code?: string } | null };
const ok = (data: any = null): Result => ({ data, error: null });

export type Write = { kind: 'update' | 'upsert'; table: string; values: Row; filters: Array<[string, any]>; options?: Row };

export function createSettingsSupabase(opts: {
  userId?: string;
  exafyAdmin?: boolean;
  tables?: Record<string, Row[]>;
  failTables?: string[];
  rpc?: Record<string, (args: any) => Result>;
  functions?: Record<string, () => Result>;
} = {}) {
  const userId = opts.userId ?? 'u-1';
  const tables: Record<string, Row[]> = { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }], ...(opts.tables ?? {}) };
  const writes: Write[] = [];
  const calls: Array<{ fn: string; args: any[] }> = [];
  const session = {
    access_token: `token-${userId}`,
    refresh_token: 'r',
    user: { id: userId, app_metadata: { active_tenant_id: 't-maxina', ...(opts.exafyAdmin ? { exafy_admin: true } : {}) }, user_metadata: {} },
  };

  function from(table: string) {
    const filters: Array<[string, any]> = [];
    let write: Write | null = null;
    const run = (): Result => {
      if (write) {
        writes.push({ ...write, filters: [...filters] });
        // Apply the write to the in-memory table, so a refetch reads what was saved.
        const rows = (tables[table] ??= []);
        if (write.kind === 'update') rows.filter((r) => filters.every(([c, v]) => r[c] === v)).forEach((r) => Object.assign(r, write?.values));
        else {
          const existing = rows.find((r) => r.user_id === write?.values.user_id);
          if (existing) Object.assign(existing, write.values);
          else rows.push({ ...write.values });
        }
        return ok(null);
      }
      if (opts.failTables?.includes(table)) return { data: null, error: { message: `${table} failed` } };
      return ok((tables[table] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v)));
    };
    const builder: any = {
      select: () => builder,
      eq: (c: string, v: any) => (filters.push([c, v]), builder),
      order: () => builder,
      limit: () => builder,
      update: (values: Row) => ((write = { kind: 'update', table, values, filters: [] }), builder),
      upsert: (values: Row, options?: Row) => {
        write = { kind: 'upsert', table, values, filters: [], options };
        return builder;
      },
      single: async () => {
        const r = run();
        const first = Array.isArray(r.data) ? r.data[0] : r.data;
        return r.error ? r : first ? ok(first) : { data: null, error: { message: 'not found' } };
      },
      maybeSingle: async () => {
        const r = run();
        return r.error ? r : ok(Array.isArray(r.data) ? (r.data[0] ?? null) : r.data);
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  const rpc = jest.fn(async (name: string, args?: any) => {
    calls.push({ fn: `rpc.${name}`, args: [args] });
    const h = opts.rpc?.[name];
    if (h) return h(args);
    if (name === 'list_public_tenants') return ok(tables.tenants.map((t) => ({ display_name: t.name, open_signup: true, ...t })));
    if (name === 'get_role_preference') return ok([{ role: 'community' }]);
    return ok(null);
  });

  const functions = {
    invoke: jest.fn(async (name: string) => {
      calls.push({ fn: `functions.${name}`, args: [] });
      return opts.functions?.[name]?.() ?? ok(null);
    }),
  };

  const auth = {
    getSession: jest.fn(async () => ok({ session })),
    getUser: jest.fn(async () => ok({ user: session.user })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
    refreshSession: jest.fn(async () => ok({ session })),
    signOut: jest.fn(async () => ({ error: null })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  };

  return { client: { auth, rpc, from: jest.fn(from), functions } as any, writes, calls };
}

export type GatewayCall = { method: string; path: string; body: unknown };

/** Answers `"METHOD /path"` first, then the bare `"/path"` (query string included, then without). A route value of `{ __status }` answers that status. */
export function createGateway(routes: Record<string, unknown> = {}) {
  const calls: GatewayCall[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const path = url.replace(/^https?:\/\/[^/]+\/api\/v1/, '').replace(/^\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });
    const bare = path.split('?')[0];
    const key = [`${method} ${path}`, `${method} ${bare}`, path, bare].find((k) => Object.prototype.hasOwnProperty.call(routes, k));
    const value = key ? routes[key] : undefined;
    const status = value && typeof value === 'object' && '__status' in (value as Row) ? (value as Row).__status : value === undefined ? 404 : 200;
    const payload = value && typeof value === 'object' && '__body' in (value as Row) ? (value as Row).__body : value;
    return { ok: status >= 200 && status < 300, status, text: async () => (payload === undefined ? '' : JSON.stringify(payload)) } as unknown as Response;
  };
  return { fetch, calls, writes: () => calls.filter((c) => c.method !== 'GET') };
}

const clients: QueryClient[] = [];
afterEach(() => {
  while (clients.length) clients.pop()?.clear();
});

export function renderSettings(ui: ReactElement, opts: { supabase: ReturnType<typeof createSettingsSupabase>; gateway?: ReturnType<typeof createGateway>; language?: string; direction?: 'ltr' | 'rtl' }) {
  const gateway = opts.gateway ?? createGateway();
  __setSupabaseForTests(opts.supabase.client);
  // The shell gateway is createGatewayFetch over this fake, exactly as in the app.
  __setGatewayForTests(((path: string, init?: RequestInit) => gateway.fetch(`/api/v1${path.startsWith('/') ? path : `/${path}`}`, init)) as never);
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
