/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — test
 * harness for the pillars / conditions / education / plans / services-hub
 * screens. expo-router is stubbed (router + `?tab=` search params); the
 * Supabase client is an in-memory double that answers `from(table)` reads
 * from fixture rows and RECORDS every built request (table, select columns,
 * filters, order, limit) and every write / rpc / edge-function call, so the
 * tests assert the exact queries the product code builds and that nothing
 * writes. No network: test files import `../../helpers/no-network` first.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import '../../helpers/mocks';
import { fakeSession } from '../../helpers/supabase-double';
import { makeWrapper } from '../../helpers/providers';
import { configure } from '@testing-library/react-native';

// Screens load async (kit, catalogs, queries); give findBy/waitFor room on a loaded runner.
configure({ asyncUtilTimeout: 5000 });

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  useGlobalSearchParams: () => mockParams.current,
  usePathname: () => '/health',
  Redirect: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

export const router = mockRouter;
export const searchParams = mockParams;

export type BuiltQuery = {
  table: string;
  op: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  columns?: string;
  filters: Array<[string, string, unknown]>;
  order: Array<[string, boolean]>;
  limit?: number;
};

type Row = Record<string, any>;
type TableAnswer = Row[] | { error: { message: string } } | ((q: BuiltQuery) => Row[]);

export function healthDouble(tables: Record<string, TableAnswer> = {}, userId = 'u-1') {
  const session = fakeSession(userId);
  const queries: BuiltQuery[] = [];
  const rpcs: Array<{ name: string; args: unknown }> = [];
  const functions: Array<{ name: string; body: unknown }> = [];

  function from(table: string) {
    const q: BuiltQuery = { table, op: 'select', filters: [], order: [] };
    queries.push(q);
    const run = () => {
      if (q.op !== 'select') return { data: null, error: null };
      const answer = tables[table] ?? [];
      if (typeof answer === 'function') return { data: answer(q), error: null };
      if (!Array.isArray(answer)) return { data: null, error: answer.error };
      return { data: answer, error: null };
    };
    const b: any = {
      select: (columns?: string) => ((q.columns = columns), b),
      insert: () => ((q.op = 'insert'), b),
      update: () => ((q.op = 'update'), b),
      upsert: () => ((q.op = 'upsert'), b),
      delete: () => ((q.op = 'delete'), b),
      eq: (c: string, v: unknown) => (q.filters.push(['eq', c, v]), b),
      gte: (c: string, v: unknown) => (q.filters.push(['gte', c, v]), b),
      order: (c: string, o?: { ascending?: boolean }) => (q.order.push([c, o?.ascending !== false]), b),
      limit: (n: number) => ((q.limit = n), b),
      single: async () => run(),
      maybeSingle: async () => run(),
      then: (resolve: (r: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return b;
  }

  const client: any = {
    from: jest.fn(from),
    rpc: jest.fn(async (name: string, args?: unknown) => {
      rpcs.push({ name, args });
      return { data: null, error: null };
    }),
    functions: {
      invoke: jest.fn(async (name: string, opts?: { body?: unknown }) => {
        functions.push({ name, body: opts?.body });
        return { data: null, error: null };
      }),
    },
    auth: {
      getSession: jest.fn(async () => ({ data: { session }, error: null })),
      getUser: jest.fn(async () => ({ data: { user: session.user }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
      signOut: jest.fn(async () => ({ error: null })),
    },
  };

  /**
   * Every request that is not a read: writes, RPCs (the web's compute RPC
   * upserts) and edge functions. The shell's TenantProvider read
   * `list_public_tenants` (a GET RPC, src/identity/tenant-registry.ts) is the
   * one read-only RPC and is not counted.
   */
  const SHELL_READ_RPCS = new Set(['list_public_tenants']);
  const nonReads = () => [
    ...queries.filter((q) => q.op !== 'select').map((q) => `${q.op} ${q.table}`),
    ...rpcs.filter((r) => !SHELL_READ_RPCS.has(r.name)).map((r) => `rpc ${r.name}`),
    ...functions.map((f) => `fn ${f.name}`),
  ];

  return { client, queries, rpcs, functions, nonReads };
}

/** Provider wrapper (signed-in member) over the health double. */
export function healthWrapper(tables: Record<string, TableAnswer> = {}, language = 'en-US') {
  const double = healthDouble(tables);
  const wrapper = makeWrapper({ client: double.client, language });
  return { wrapper, ...double };
}

/** An active `user_health_plans` row. */
export function planRow(plan_type: string, extra: Row = {}): Row {
  return {
    id: `plan-${plan_type}`,
    user_id: 'u-1',
    plan_type,
    adherence_score: 60,
    plan_data: null,
    is_ai_generated: true,
    last_updated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    active: true,
    created_at: '2026-10-01T08:00:00Z',
    ...extra,
  };
}
