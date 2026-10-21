/**
 * VTID-05296 (N-W2 community-hub) — test harness for the ported community /
 * intents / search screens. A richer in-memory Supabase double (adds the
 * builder methods these hooks use: order/in/gt/is/insert/delete/count, getUser,
 * functions.invoke) and a gateway fake that matches by pathname (ignoring the
 * query string), plus the provider wrapper. No network: `./helpers/no-network`
 * and the kit's safe-area mock are applied by the test files that import this.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';

type Row = Record<string, any>;
type Result = { data: any; error: { message: string } | null; count?: number | null };

export type SupabaseDoubleOptions = {
  userId?: string | null;
  tables?: Record<string, Row[]>;
  rpc?: Record<string, (args: any) => Result | Promise<Result>>;
  functions?: Record<string, () => void>;
  /** When set, every `from()` query resolves to this error. */
  failTables?: boolean;
};

const ok = (data: any = null, count: number | null = null): Result => ({ data, error: null, count });
const err = (message = 'error'): Result => ({ data: null, error: { message }, count: null });

export function createCommunitySupabaseDouble(opts: SupabaseDoubleOptions = {}) {
  const tables = opts.tables ?? {};
  const userId = opts.userId === undefined ? 'u-self' : opts.userId;
  const calls: Array<{ fn: string; args: any[] }> = [];
  const inserts: Array<{ table: string; values: Row }> = [];
  const deletes: Array<{ table: string; filters: Array<[string, any]> }> = [];
  const record = (fn: string, args: any[]) => calls.push({ fn, args });

  const matchRow = (r: Row, filters: Array<[string, string, any]>) =>
    filters.every(([op, c, v]) => {
      const cell = r[c];
      switch (op) {
        case 'eq':
          return cell === v;
        case 'in':
          return Array.isArray(v) && v.includes(cell);
        case 'ilike':
          return String(cell ?? '').toLowerCase().includes(String(v).replace(/%/g, '').toLowerCase());
        case 'gt':
          return cell > v;
        case 'is':
          return v === null ? cell === null || cell === undefined : cell === v;
        default:
          return true;
      }
    });

  function from(table: string) {
    const filters: Array<[string, string, any]> = [];
    let limitN: number | null = null;
    let headCount = false;
    let mode: 'select' | 'insert' | 'delete' = 'select';
    let insertValues: Row | null = null;

    const compute = (): Result => {
      if (opts.failTables) return err('table error');
      if (mode === 'insert') {
        inserts.push({ table, values: insertValues ?? {} });
        record(`from.${table}.insert`, [insertValues]);
        return ok(null);
      }
      if (mode === 'delete') {
        deletes.push({ table, filters: filters.map(([, c, v]) => [c, v]) });
        record(`from.${table}.delete`, [filters]);
        return ok(null);
      }
      let out = (tables[table] ?? []).filter((r) => matchRow(r, filters));
      if (limitN !== null) out = out.slice(0, limitN);
      record(`from.${table}.select`, [filters]);
      if (headCount) return { data: null, error: null, count: out.length };
      return ok(out);
    };

    const builder: any = {
      select: (_cols?: string, o?: { count?: string; head?: boolean }) => {
        if (o?.head) headCount = true;
        return builder;
      },
      insert: (values: Row) => {
        mode = 'insert';
        insertValues = values;
        return builder;
      },
      delete: () => {
        mode = 'delete';
        return builder;
      },
      eq: (c: string, v: any) => (filters.push(['eq', c, v]), builder),
      in: (c: string, v: any) => (filters.push(['in', c, v]), builder),
      ilike: (c: string, v: any) => (filters.push(['ilike', c, v]), builder),
      gt: (c: string, v: any) => (filters.push(['gt', c, v]), builder),
      is: (c: string, v: any) => (filters.push(['is', c, v]), builder),
      order: () => builder,
      limit: (n: number) => ((limitN = n), builder),
      single: async () => {
        const r = compute();
        const first = Array.isArray(r.data) ? r.data[0] : r.data;
        return first ? ok(first) : err('not found');
      },
      maybeSingle: async () => {
        const r = compute();
        return ok(Array.isArray(r.data) ? (r.data[0] ?? null) : r.data);
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(compute()).then(resolve, reject),
    };
    return builder;
  }

  const auth = {
    getUser: jest.fn(async () => {
      record('auth.getUser', []);
      return { data: { user: userId ? { id: userId } : null }, error: null };
    }),
    getSession: jest.fn(async () => ({ data: { session: userId ? { user: { id: userId }, access_token: `token-${userId}` } : null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
    refreshSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
  };

  const rpc = jest.fn(async (name: string, args?: any) => {
    record(`rpc.${name}`, [args]);
    const h = opts.rpc?.[name];
    return h ? h(args) : ok(null);
  });

  const functions = {
    invoke: jest.fn(async (name: string) => {
      record(`functions.invoke.${name}`, []);
      opts.functions?.[name]?.();
      return { data: null, error: null };
    }),
  };

  return {
    client: { auth, rpc, from: jest.fn(from), functions } as any,
    calls,
    inserts,
    deletes,
  };
}

/** A gateway fake that matches a route by pathname (ignores the query string). */
export function pathGateway(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const fetch = async (path: string) => {
    calls.push(path);
    const pathname = path.split('?')[0];
    const body = Object.prototype.hasOwnProperty.call(routes, pathname) ? routes[pathname] : undefined;
    return {
      ok: body !== undefined,
      status: body !== undefined ? 200 : 404,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    } as unknown as Response;
  };
  return { fetch, calls };
}

const qcs: QueryClient[] = [];
afterEach(() => {
  while (qcs.length) qcs.pop()?.clear();
});

export function makeCommunityWrapper(opts: {
  client: unknown;
  gateway?: Record<string, unknown>;
  language?: string;
}) {
  __setSupabaseForTests(opts.client as never);
  __setGatewayForTests(pathGateway(opts.gateway ?? {}).fetch);
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
