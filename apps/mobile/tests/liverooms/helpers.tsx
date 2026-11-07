/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — test harness for the
 * native live-rooms list, drawer and viewer. A small in-memory Supabase double
 * (the builder methods the live-room data layer uses, plus `rpc`, `auth` and
 * per-test table failures), a gateway fake that answers by path and method, and
 * the provider wrapper. No network: every test imports `../helpers/no-network`
 * first, and the Supabase and gateway seams are replaced here.
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

// Lane rule: RNTL's 1000 ms default is too tight for async loads on CI workers.
configure({ asyncUtilTimeout: 5000 });

type Row = Record<string, any>;
type Result = { data: any; error: { code?: string; message: string } | null };

export type LiveRoomsDoubleOptions = {
  userId?: string | null;
  tables?: Record<string, Row[]>;
  rpc?: Record<string, (args: any) => unknown>;
  /** When true, every `from()` query resolves to an error. */
  failTables?: boolean;
};

const ok = (data: any = null): Result => ({ data, error: null });
const fail = (): Result => ({ data: null, error: { message: 'table unavailable' } });

export function createLiveRoomsSupabaseDouble(opts: LiveRoomsDoubleOptions = {}) {
  const tables = opts.tables ?? {};
  const userId = opts.userId === undefined ? 'u-self' : opts.userId;
  const inserts: Array<{ table: string; values: Row }> = [];
  const deletes: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  const rpcCalls: Array<{ name: string; args: any }> = [];

  type Filter = ['eq' | 'in' | 'gte', string, unknown];
  const matches = (r: Row, filters: Filter[]) =>
    filters.every(([op, col, v]) => {
      const cell = r[col];
      if (op === 'eq') return cell === v;
      if (op === 'in') return Array.isArray(v) && v.includes(cell);
      if (op === 'gte') return cell !== null && cell !== undefined && String(cell) >= String(v);
      return true;
    });

  function from(table: string) {
    const filters: Filter[] = [];
    let mode: 'select' | 'insert' | 'delete' = 'select';
    let insertValues: Row = {};
    let limitN: number | null = null;

    const run = (): Result => {
      if (opts.failTables) return fail();
      if (mode === 'insert') {
        inserts.push({ table, values: insertValues });
        return ok([{ id: `ins-${inserts.length}`, ...insertValues }]);
      }
      if (mode === 'delete') {
        deletes.push({ table, filters: filters.map(([, c, v]) => [c, v]) });
        return ok(null);
      }
      let out = (tables[table] ?? []).filter((r) => matches(r, filters));
      if (limitN !== null) out = out.slice(0, limitN);
      return ok(out);
    };

    const builder: any = {
      select: () => builder,
      insert: (values: Row) => ((mode = 'insert'), (insertValues = values), builder),
      delete: () => ((mode = 'delete'), builder),
      eq: (c: string, v: unknown) => (filters.push(['eq', c, v]), builder),
      in: (c: string, v: unknown) => (filters.push(['in', c, v]), builder),
      gte: (c: string, v: unknown) => (filters.push(['gte', c, v]), builder),
      order: () => builder,
      limit: (n: number) => ((limitN = n), builder),
      maybeSingle: async () => {
        const r = run();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  const auth = {
    getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }),
    getSession: async () => ({
      data: { session: userId ? { user: { id: userId }, access_token: `token-${userId}` } : null },
      error: null,
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    startAutoRefresh: () => undefined,
    stopAutoRefresh: () => undefined,
    refreshSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
  };

  const rpc = async (name: string, args?: any) => {
    rpcCalls.push({ name, args });
    const handler = opts.rpc?.[name];
    return { data: handler ? handler(args) : null, error: null };
  };

  return {
    client: { auth, from, rpc } as any,
    inserts,
    deletes,
    rpcCalls,
  };
}

export type GatewayReply = { status: number; body?: unknown };
export type GatewayCall = { path: string; method: string; body: unknown };

/**
 * Gateway fake. `handler` answers each call; an unmatched path answers 404.
 * Every call is recorded so tests can assert which endpoints a screen reached.
 */
export function fakeGateway(handler: (path: string, method: string) => GatewayReply | undefined = () => undefined) {
  const calls: GatewayCall[] = [];
  const fetchImpl = async (path: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    const pathname = path.split('?')[0];
    let body: unknown = null;
    if (typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    calls.push({ path: pathname, method, body });
    const reply = handler(pathname, method) ?? { status: 404, body: { error: 'NOT_FOUND' } };
    const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: async () => text,
    } as unknown as Response;
  };
  return { fetch: fetchImpl, calls };
}

const qcs: QueryClient[] = [];
afterEach(() => {
  while (qcs.length) qcs.pop()?.clear();
});

/** Provider wrapper for the live-rooms screens. Installs the Supabase and gateway doubles first. */
export function makeLiveRoomsWrapper(opts: { client: unknown; gateway?: ReturnType<typeof fakeGateway>; language?: string }) {
  __setSupabaseForTests(opts.client as never);
  if (opts.gateway) __setGatewayForTests(opts.gateway.fetch as never);
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

/** A live room as the `community_live_streams` table returns it. */
export function streamRow(over: Partial<Row> = {}): Row {
  return {
    id: 'room-live-1',
    title: 'Morning Breath Circle',
    description: 'Slow breathing together',
    stream_type: 'audio',
    tags: ['breathwork'],
    access_level: 'public',
    cover_image_url: null,
    co_hosts: [],
    scheduled_for: null,
    status: 'live',
    duration_minutes: 45,
    created_by: 'u-host',
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
    started_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    ended_at: null,
    viewer_count: 3,
    peak_viewers: 3,
    total_messages: 0,
    metadata: {},
    ...over,
  };
}

/** Milliseconds from now as an ISO timestamp (negative = in the past). */
export function inMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}
