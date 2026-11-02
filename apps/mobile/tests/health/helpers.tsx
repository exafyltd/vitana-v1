/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — test harness for
 * the health screens. No network: the test files import
 * `../helpers/no-network` first.
 *
 *  - Supabase: the shared auth double (signed-in member `u-1`) with a
 *    RECORDING query builder in place of `from` / `rpc`: every built request
 *    (table, method, columns, filters, order, limit, rpc options) is kept so
 *    the tests assert what the native code asks for — reads only, scoped to
 *    `user_id = auth.uid()`.
 *  - Gateway: N1's real `createGatewayFetch` (Bearer + `/api/v1` prefix) over
 *    a fake `fetchImpl` answering by `METHOD /path`, recording every request.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { __setGatewayForTests } from '../../src/auth/gateway';
import { createGatewayFetch } from '../../src/ports/core';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';

export const ORIGIN = 'https://g1-test.example.org';
export const TOKEN = 'token-health-test';
export const USER_ID = 'u-1';

/** What the shell's own providers read (language preference, tenant registry) — not the health module. */
export const SHELL_TABLES = new Set(['user_preferences', 'tenants', 'patient_profiles']);
export const SHELL_RPCS = new Set(['list_public_tenants', 'get_my_permitted_roles', 'list_roles_for_active_tenant', 'get_role_preference']);

/** The requests the health module built (the shell providers' reads filtered out). */
export function healthOnly<T extends { table?: string; name?: string }>(list: T[]): T[] {
  return list.filter((r) => !(r.table && SHELL_TABLES.has(r.table)) && !(r.name && SHELL_RPCS.has(r.name)));
}

export type Filter = [op: string, column: string, value: unknown];
export type SbRequest = {
  table: string;
  method: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  columns?: string;
  filters: Filter[];
  order: Array<[string, unknown]>;
  limit?: number;
};
export type RpcRequest = { name: string; args: unknown; options: unknown };

/** A table answers its rows (filtered by eq / gte, ordered, limited); `{ error }` answers an error. */
export type TableFixture = Array<Record<string, any>> | { error: string };

export function recordingSupabase(tables: Record<string, TableFixture>, rpcs: Record<string, unknown> = {}) {
  const double = createSupabaseDouble({ session: fakeSession(USER_ID) });
  const requests: SbRequest[] = [];
  const rpcCalls: RpcRequest[] = [];
  const storageCalls: string[] = [];

  function from(table: string) {
    const req: SbRequest = { table, method: 'select', filters: [], order: [] };
    requests.push(req);
    const run = () => {
      const fx = tables[table] ?? [];
      if (!Array.isArray(fx)) return { data: null, error: { message: fx.error } };
      let rows = fx.filter((r) =>
        req.filters.every(([op, c, v]) => (op === 'eq' ? r[c] === v : op === 'gte' ? String(r[c]) >= String(v) : true)),
      );
      for (const [col, opts] of [...req.order].reverse()) {
        const asc = (opts as { ascending?: boolean } | undefined)?.ascending !== false;
        rows = [...rows].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
      }
      if (req.limit !== undefined) rows = rows.slice(0, req.limit);
      return { data: rows, error: null };
    };
    const b: any = {
      select: (columns?: string) => ((req.columns = columns ?? '*'), b),
      insert: () => ((req.method = 'insert'), b),
      update: () => ((req.method = 'update'), b),
      upsert: () => ((req.method = 'upsert'), b),
      delete: () => ((req.method = 'delete'), b),
      eq: (c: string, v: unknown) => (req.filters.push(['eq', c, v]), b),
      gte: (c: string, v: unknown) => (req.filters.push(['gte', c, v]), b),
      order: (c: string, o?: unknown) => (req.order.push([c, o]), b),
      limit: (n: number) => ((req.limit = n), b),
      maybeSingle: async () => {
        const r = run();
        return r.error ? r : { data: (r.data as any[])[0] ?? null, error: null };
      },
      single: async () => {
        const r = run();
        return r.error ? r : { data: (r.data as any[])[0] ?? null, error: null };
      },
      then: (res: (r: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  }

  double.client.from = jest.fn(from);
  double.client.rpc = jest.fn(async (name: string, args?: unknown, options?: unknown) => {
    rpcCalls.push({ name, args, options });
    return name in rpcs ? { data: rpcs[name], error: null } : { data: null, error: { message: 'no such rpc' } };
  });
  double.client.storage = {
    from: (bucket: string) => {
      storageCalls.push(bucket);
      return { upload: jest.fn(), createSignedUrl: jest.fn(), remove: jest.fn() };
    },
  };
  return { client: double.client, requests, rpcCalls, storageCalls };
}

export type Route = unknown | ((req: GwReq) => unknown);
export type GwReq = { method: string; path: string; query: URLSearchParams; headers: Record<string, string> };
export const FAIL = Symbol('fail');

export function healthGateway(routes: Record<string, Route>) {
  const requests: GwReq[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const req: GwReq = { method, path, query: u.searchParams, headers: (init.headers ?? {}) as Record<string, string> };
    requests.push(req);
    const key = `${method} ${path}`;
    const route = Object.prototype.hasOwnProperty.call(routes, key) ? routes[key] : undefined;
    const body = typeof route === 'function' ? (route as (r: GwReq) => unknown)(req) : route;
    const status = body === undefined ? 404 : body === FAIL ? 500 : 200;
    const text = body === undefined || body === FAIL ? '{"ok":false,"error":"x"}' : JSON.stringify(body);
    return { ok: status === 200, status, text: async () => text } as unknown as Response;
  };
  return { gateway: createGatewayFetch({ origin: ORIGIN, getAccessToken: () => TOKEN, fetchImpl }), requests };
}

/** Provider wrapper (signed-in member) with the recording Supabase client and the fake gateway installed. */
export function healthWrapper(opts: { tables?: Record<string, TableFixture>; rpcs?: Record<string, unknown>; routes?: Record<string, Route>; language?: string } = {}) {
  const sb = recordingSupabase(opts.tables ?? fullTables(), opts.rpcs ?? { get_profile_health_summary: summaryPayload });
  const wrapper = makeWrapper({ client: sb.client, language: opts.language ?? 'en-US' });
  const gw = healthGateway(opts.routes ?? gatewayRoutes);
  __setGatewayForTests(gw.gateway);
  return { wrapper, sb, gw };
}

// ── fixtures ─────────────────────────────────────────────────────────────
const isoDay = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

/** Seven days of Index rows (oldest first): 380 → 412, today's pillars put sleep lowest. */
export function indexRows(userId = USER_ID) {
  const totals = [380, 384, 390, 395, 401, 406, 412];
  return totals.map((score, i) => ({
    user_id: userId,
    date: isoDay(6 - i),
    score_total: score,
    score_nutrition: 120,
    score_hydration: 90,
    score_exercise: 80,
    score_sleep: 60,
    score_mental: 110,
    confidence: 0.8,
    model_version: 'v3-5pillar',
    feature_inputs: i === totals.length - 1 ? { balance_factor: 0.9, subscores: { sleep: { baseline: 20, completions: 10, data: 20, streak: 10 } } } : null,
  }));
}

export const labReports = [
  { id: 'r1', user_id: USER_ID, title: 'Annual bloods', report_type: 'blood_panel', provider_name: 'Quest', report_date: '2026-09-14', processing_status: 'processed', created_at: '2026-09-15T10:00:00Z' },
  { id: 'r2', user_id: USER_ID, title: null, raw_file_ref: null, report_type: 'genomics', provider_name: null, source: null, report_date: null, processing_status: null, created_at: '2026-08-01T10:00:00Z' },
  { id: 'other', user_id: 'someone-else', title: 'Not mine', report_type: 'other', created_at: '2026-09-20T10:00:00Z' },
];

export const supplements = [
  { id: 's1', user_id: USER_ID, name: 'Vitamin D3', category: 'Vitamins', dosage: '2000 IU', frequency: 'Daily', notes: 'With breakfast', start_date: '2026-01-10', is_active: true, created_at: '2026-01-10T08:00:00Z', updated_at: '2026-01-10T08:00:00Z' },
  { id: 's2', user_id: USER_ID, name: 'Magnesium', category: 'Minerals', dosage: null, frequency: null, notes: null, start_date: null, is_active: false, created_at: '2026-02-10T08:00:00Z', updated_at: '2026-02-10T08:00:00Z' },
];

export function fullTables(): Record<string, TableFixture> {
  return {
    vitana_index_scores: indexRows(),
    lab_reports: labReports,
    user_supplements: supplements,
    life_compass: [{ id: 'c1', user_id: USER_ID, is_active: true, primary_goal: 'Sleep better', created_at: '2026-09-01T00:00:00Z' }],
  };
}

export const summaryPayload = { has_index: true, is_owner: true, shared: true, score: 412, standing: { available: true, top_percent: 18, community_average: 300, cohort_size: 140 } };

export const agentOutputs = [
  { pillar: 'nutrition', date: isoDay(0), subscore_baseline: 40, subscore_completions: 30, subscore_data: 30, subscore_streak: 20, agent_version: 'v1', computed_at: 'x' },
  { pillar: 'sleep', date: isoDay(0), subscore_baseline: 20, subscore_completions: 10, subscore_data: 20, subscore_streak: 10, agent_version: 'v1', computed_at: 'x' },
];

export const recommendations = [
  { id: 'a1', title: 'Walk 20 minutes', summary: 'x', domain: 'health', status: 'new', contribution_vector: { exercise: 6, mental: 2 } },
  { id: 'a2', title: 'Drink water', summary: 'x', domain: 'health', status: 'new', contribution_vector: { hydration: 4 } },
  { id: 'a3', title: 'Running already', summary: 'x', domain: 'health', status: 'activated', contribution_vector: { exercise: 9 } },
];

export const gatewayRoutes: Record<string, Route> = {
  'GET /pillar-agents/outputs': { outputs: agentOutputs },
  'GET /autopilot/recommendations': { ok: true, recommendations },
};
