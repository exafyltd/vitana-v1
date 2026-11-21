/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — test harness for the native Business Hub.
 * A small in-memory Supabase double (the builder methods the business data layer uses, a signed-in
 * member with an active tenant, per-table failures), a gateway fake that answers by path and method,
 * and the provider wrapper. No network: every test imports `../helpers/no-network` first.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { configure } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';

configure({ asyncUtilTimeout: 5000 });

type Row = Record<string, any>;
type Result = { data: any; error: { code?: string; message: string } | null };

export const TENANT = 'tenant-1';
export const USER = 'u-self';

export type BusinessDoubleOptions = {
  userId?: string | null;
  tables?: Record<string, Row[]>;
  /** Tables whose every query resolves to an error. */
  failTables?: string[];
};

export function createBusinessSupabaseDouble(opts: BusinessDoubleOptions = {}) {
  const tables = opts.tables ?? {};
  const userId = opts.userId === undefined ? USER : opts.userId;
  const reads: Array<{ table: string; filters: Array<[string, string, unknown]> }> = [];
  const writes: string[] = [];

  type Filter = ['eq' | 'in' | 'gte', string, unknown];
  const matches = (r: Row, filters: Filter[]) =>
    filters.every(([op, col, v]) => {
      const cell = r[col];
      if (op === 'eq') return cell === v;
      if (op === 'in') return Array.isArray(v) && v.includes(cell);
      return cell !== null && cell !== undefined && String(cell) >= String(v);
    });

  function from(table: string) {
    const filters: Filter[] = [];
    let limitN: number | null = null;
    const run = (): Result => {
      reads.push({ table, filters: filters.map((f) => [f[0], f[1], f[2]]) });
      if (opts.failTables?.includes(table)) return { data: null, error: { message: `${table} unavailable` } };
      let out = (tables[table] ?? []).filter((r) => matches(r, filters));
      if (limitN !== null) out = out.slice(0, limitN);
      return { data: out, error: null };
    };
    const builder: any = {
      select: () => builder,
      eq: (c: string, v: unknown) => (filters.push(['eq', c, v]), builder),
      in: (c: string, v: unknown) => (filters.push(['in', c, v]), builder),
      gte: (c: string, v: unknown) => (filters.push(['gte', c, v]), builder),
      order: () => builder,
      limit: (n: number) => ((limitN = n), builder),
      insert: () => (writes.push(`insert ${table}`), builder),
      update: () => (writes.push(`update ${table}`), builder),
      delete: () => (writes.push(`delete ${table}`), builder),
      maybeSingle: async () => {
        const r = run();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      single: async () => {
        const r = run();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  const user = userId ? { id: userId, app_metadata: { active_tenant_id: TENANT } } : null;
  const auth = {
    getUser: async () => ({ data: { user }, error: null }),
    getSession: async () => ({ data: { session: user ? { user, access_token: `token-${userId}` } : null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    startAutoRefresh: () => undefined,
    stopAutoRefresh: () => undefined,
    refreshSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  };

  return { client: { auth, from, rpc: async () => ({ data: null, error: null }) } as any, reads, writes };
}

export type GatewayReply = { status: number; body?: unknown };
export type GatewayCall = { path: string; query: string; method: string; body: unknown };

/** Gateway fake. `handler` answers each call; an unmatched path answers 404. Every call is recorded. */
export function fakeGateway(handler: (path: string, method: string, query: string) => GatewayReply | undefined = () => undefined) {
  const calls: GatewayCall[] = [];
  const fetchImpl = async (path: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    const [pathname, query = ''] = path.split('?');
    let body: unknown = null;
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    calls.push({ path: pathname, query, method, body });
    const reply = handler(pathname, method, query) ?? { status: 404, body: { error: 'NOT_FOUND' } };
    const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, text: async () => text, json: async () => (text ? JSON.parse(text) : null) } as unknown as Response;
  };
  return { fetch: fetchImpl, calls };
}

const qcs: QueryClient[] = [];
afterEach(() => {
  while (qcs.length) qcs.pop()?.clear();
});

/** Provider wrapper for the business screens. Installs the Supabase and gateway doubles first. */
export function makeBusinessWrapper(opts: { client: unknown; gateway?: ReturnType<typeof fakeGateway>; language?: string }) {
  __setSupabaseForTests(opts.client as never);
  __setGatewayForTests((opts.gateway ?? fakeGateway()).fetch as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  qcs.push(qc);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <AuthProvider client={opts.client as never}>
            <TenantProvider>
              <LanguageProvider initialLanguage={opts.language ?? 'en-US'}>{children}</LanguageProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

export const resellerProfileRow = { id: 'rp-1', user_id: USER, tenant_id: TENANT, reseller_code: 'RC1', commission_rate: 10, status: 'active' };

export function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}
