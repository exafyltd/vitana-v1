/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — test harness for the five
 * `/ai` screens. An in-memory Supabase double that records every read
 * (table + filters) and every write (insert / update / rpc), and a gateway
 * fake that records every request (method, path, headers, parsed body) and
 * answers by `METHOD /path` or the bare path. Nothing reaches a network:
 * `../helpers/no-network` replaces `fetch` with a thrower and both doubles
 * are installed through the shell's test hooks. Writes are asserted as BUILT
 * requests — nothing is fired at a live backend (requirements R5.2).
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
import { __resetAutopilotRefsForTests, __resetCoachThreadForTests } from '../../src/screens/ai-coach/data/gateway';

// Every AI coach test imports this harness: give findBy*/waitFor 5 s instead
// of RNTL's 1 s default so the suite holds under default-worker load.
configure({ asyncUtilTimeout: 5000 });
// Chained 5 s waits must fit inside the test's own budget (Jest default 5 s).
jest.setTimeout(30000);

afterEach(() => {
  __resetAutopilotRefsForTests();
  __resetCoachThreadForTests();
  __clearToastsForTests();
});

type Row = Record<string, any>;
type Result = { data: any; error: { message: string } | null };
const ok = (data: any = null): Result => ({ data, error: null });

export type Read = { table: string; filters: Array<[string, string, any]>; order?: [string, boolean]; limit?: number };
export type Write = { kind: 'insert' | 'update'; table: string; values: Row; filters: Array<[string, string, any]> };

export function createCoachSupabase(opts: { userId?: string; tables?: Record<string, Row[]>; failTables?: string[]; signedOut?: boolean } = {}) {
  const userId = opts.userId ?? 'u-1';
  const tables: Record<string, Row[]> = { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }], ...(opts.tables ?? {}) };
  const reads: Read[] = [];
  const writes: Write[] = [];
  const rpcs: Array<{ name: string; args: any }> = [];
  const session = opts.signedOut ? null : { access_token: `token-${userId}`, refresh_token: 'r', user: { id: userId, app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } };

  function from(table: string) {
    const filters: Array<[string, string, any]> = [];
    let order: [string, boolean] | undefined;
    let limit: number | undefined;
    let write: Write | null = null;
    const run = (): Result => {
      if (write) {
        writes.push({ ...write, filters: [...filters] });
        const rows = (tables[table] ??= []);
        if (write.kind === 'insert') rows.push({ ...write.values });
        else rows.filter((r) => filters.every(([, c, v]) => r[c] === v)).forEach((r) => Object.assign(r, write?.values));
        return ok(write.kind === 'insert' ? [{ ...write.values }] : null);
      }
      reads.push({ table, filters: [...filters], order, limit });
      if (opts.failTables?.includes(table)) return { data: null, error: { message: `${table} failed` } };
      let out = (tables[table] ?? []).filter((r) => filters.every(([op, c, v]) => (op === 'eq' ? r[c] === v : op === 'gte' ? r[c] >= v : true)));
      if (order) {
        const [c, asc] = order;
        out = [...out].sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1));
      }
      if (limit !== undefined) out = out.slice(0, limit);
      return ok(out);
    };
    const builder: any = {
      select: () => builder,
      eq: (c: string, v: any) => (filters.push(['eq', c, v]), builder),
      gte: (c: string, v: any) => (filters.push(['gte', c, v]), builder),
      order: (c: string, o?: { ascending?: boolean }) => ((order = [c, o?.ascending !== false]), builder),
      limit: (n: number) => ((limit = n), builder),
      insert: (values: Row) => ((write = { kind: 'insert', table, values, filters: [] }), builder),
      update: (values: Row) => ((write = { kind: 'update', table, values, filters: [] }), builder),
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
    rpcs.push({ name, args });
    if (name === 'list_public_tenants') return ok(tables.tenants.map((t) => ({ display_name: t.name, open_signup: true, ...t })));
    if (name === 'get_role_preference') return ok([{ role: 'community' }]);
    return ok(null);
  });

  const auth = {
    getSession: jest.fn(async () => ok({ session })),
    getUser: jest.fn(async () => ok({ user: session?.user ?? null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
    refreshSession: jest.fn(async () => ok({ session })),
    signOut: jest.fn(async () => ({ error: null })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  };

  return { client: { auth, rpc, from: jest.fn(from), functions: { invoke: jest.fn(async () => ok(null)) } } as any, reads, writes, rpcs, tables };
}

export type GatewayCall = { method: string; path: string; headers: Record<string, string>; body: unknown };

/** Answers `"METHOD /path"` first, then the bare `"/path"` (query included, then without). `{ __status, __body }` answers that status; a function computes the answer. */
export function createCoachGateway(routes: Record<string, unknown> = {}) {
  const calls: GatewayCall[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const path = url.replace(/^https?:\/\/[^/]+\/api\/v1/, '').replace(/^\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, headers: (init.headers ?? {}) as Record<string, string>, body });
    const bare = path.split('?')[0];
    const key = [`${method} ${path}`, `${method} ${bare}`, path, bare].find((k) => Object.prototype.hasOwnProperty.call(routes, k));
    let value = key ? routes[key] : undefined;
    if (typeof value === 'function') value = await (value as (b: unknown) => unknown)(body);
    const status = value && typeof value === 'object' && '__status' in (value as Row) ? (value as Row).__status : value === undefined ? 404 : 200;
    const payload = value && typeof value === 'object' && '__body' in (value as Row) ? (value as Row).__body : value;
    return { ok: status >= 200 && status < 300, status, text: async () => (payload === undefined ? '' : JSON.stringify(payload)) } as unknown as Response;
  };
  return { fetch, calls };
}

const clients: QueryClient[] = [];
afterEach(() => {
  while (clients.length) clients.pop()?.clear();
});

export function renderCoach(
  ui: ReactElement,
  opts: { supabase?: ReturnType<typeof createCoachSupabase>; gateway?: ReturnType<typeof createCoachGateway>; language?: string; direction?: 'ltr' | 'rtl' } = {},
) {
  const supabase = opts.supabase ?? createCoachSupabase();
  const gateway = opts.gateway ?? createCoachGateway();
  __setSupabaseForTests(supabase.client);
  // The shell gateway prefixes `/api/v1`, exactly as N1's createGatewayFetch does in the app.
  __setGatewayForTests(((path: string, init?: RequestInit) => gateway.fetch(`/api/v1${path.startsWith('/') ? path : `/${path}`}`, init)) as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  clients.push(qc);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider initialMode="light">
          <AuthProvider client={supabase.client}>
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
  return { ...render(ui, { wrapper: Wrapper }), supabase, gateway, qc };
}

// ── fixtures ─────────────────────────────────────────────────────────────
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const indexRows = (userId = 'u-1') => [
  { user_id: userId, date: day(-2), score_total: 410, score_nutrition: 90, score_hydration: 70, score_exercise: 60, score_sleep: 40, score_mental: 80 },
  { user_id: userId, date: day(-1), score_total: 431, score_nutrition: 91, score_hydration: 71, score_exercise: 61, score_sleep: 41, score_mental: 81 },
];

export const futureEvent = (title: string, hours: number, event_type = 'health') => ({
  id: `ev-${title}`,
  user_id: 'u-1',
  title,
  event_type,
  start_time: new Date(Date.now() + hours * 3600_000).toISOString(),
});
