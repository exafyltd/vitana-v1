/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — test harness for
 * the Discover screens. The gateway is N1's real `createGatewayFetch` (so the
 * Bearer token and `/api/v1` prefix are the production code path) over a fake
 * `fetchImpl` that answers by `METHOD /path` (query string kept separately)
 * and records every request with its headers and body. The Supabase client is
 * the shared auth double with a recording `from()` / `rpc` / `functions`
 * builder for the tables the Discover data layer reads and writes. No network:
 * the test files import `../helpers/no-network` first.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { __setGatewayForTests } from '../../src/auth/gateway';
import { createGatewayFetch } from '../../src/ports/core';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';

export const ORIGIN = 'https://g1-test.example.org';
export const TOKEN = 'token-u-1';

export type Req = { method: string; path: string; query: URLSearchParams; headers: Record<string, string>; body: any };
export type Route = unknown | ((req: Req) => unknown);
/** A route answering `{ status, body }` sets the status; FAIL answers 500. */
export const FAIL = Symbol('fail');
export const status = (code: number, body: unknown) => ({ __status: code, body });

export function discoverGateway(routes: Record<string, Route>) {
  const requests: Req[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    const req: Req = { method, path, query: u.searchParams, headers, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined };
    requests.push(req);
    const key = `${method} ${path}`;
    const route = Object.prototype.hasOwnProperty.call(routes, key) ? routes[key] : undefined;
    let out = typeof route === 'function' ? (route as (r: Req) => unknown)(req) : route;
    let code = out === undefined ? 404 : out === FAIL ? 500 : 200;
    if (out && typeof out === 'object' && '__status' in (out as any)) {
      code = (out as any).__status;
      out = (out as any).body;
    }
    const text = out === undefined || out === FAIL ? '{"ok":false,"error":"x"}' : JSON.stringify(out);
    return { ok: code >= 200 && code < 300, status: code, text: async () => text } as unknown as Response;
  };
  return { gateway: createGatewayFetch({ origin: ORIGIN, getAccessToken: () => TOKEN, fetchImpl }), requests };
}

export type DbOp = { table: string; op: 'select' | 'insert' | 'delete' | 'update'; filters: Array<[string, string, unknown]>; values?: unknown; order?: unknown };

/** The shared auth double plus a recording table builder (select / insert / delete, eq / in / gte / order / limit). */
export function discoverClient(opts: { signedIn?: boolean; tables?: Record<string, any[]>; insertError?: Record<string, { code?: string; message: string }> } = {}) {
  const double = createSupabaseDouble({ session: opts.signedIn === false ? null : fakeSession('u-1', { access_token: TOKEN }) });
  const tables = opts.tables ?? {};
  const ops: DbOp[] = [];
  const invokes: Array<{ name: string; body: unknown }> = [];
  const rpcs: Array<{ name: string; args: unknown }> = [];
  const from = (table: string) => {
    const op: DbOp = { table, op: 'select', filters: [] };
    const rows = () =>
      (tables[table] ?? []).filter((r) =>
        op.filters.every(([kind, c, v]) => (kind === 'eq' ? r[c] === v : kind === 'in' ? (v as unknown[]).includes(r[c]) : true)),
      );
    const result = () => {
      ops.push({ ...op });
      if (op.op === 'insert') {
        const err = opts.insertError?.[table];
        if (err) return { data: null, error: err };
        tables[table] = [...(tables[table] ?? []), ...(Array.isArray(op.values) ? op.values : [op.values])];
        return { data: op.values, error: null };
      }
      if (op.op === 'delete') {
        tables[table] = (tables[table] ?? []).filter((r) => !rows().includes(r));
        return { data: null, error: null };
      }
      return { data: rows(), error: null };
    };
    const b: any = {
      select: () => b,
      insert: (values: unknown) => ((op.op = 'insert'), (op.values = values), b),
      delete: () => ((op.op = 'delete'), b),
      update: (values: unknown) => ((op.op = 'update'), (op.values = values), b),
      eq: (c: string, v: unknown) => (op.filters.push(['eq', c, v]), b),
      in: (c: string, v: unknown[]) => (op.filters.push(['in', c, v]), b),
      gte: (c: string, v: unknown) => (op.filters.push(['gte', c, v]), b),
      order: (c: string, o: unknown) => ((op.order = [c, o]), b),
      limit: () => b,
      single: async () => {
        const r = result();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      maybeSingle: async () => {
        const r = result();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      then: (resolve: (r: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject),
    };
    return b;
  };
  double.client.from = jest.fn(from);
  double.client.rpc = jest.fn(async (name: string, args: unknown) => {
    rpcs.push({ name, args });
    return { data: null, error: null };
  });
  double.client.functions = {
    invoke: jest.fn(async (name: string, o: { body: unknown }) => {
      invokes.push({ name, body: o.body });
      return { data: { url: 'https://checkout.g1-test.example.org/session' }, error: null };
    }),
  };
  return { client: double.client, ops, invokes, rpcs, tables };
}

export function discoverWrapper(routes: Record<string, Route>, opts: { signedIn?: boolean; language?: string; tables?: Record<string, any[]>; insertError?: Record<string, { code?: string; message: string }> } = {}) {
  const db = discoverClient(opts);
  const wrapper = makeWrapper({ client: db.client, language: opts.language ?? 'en-US' });
  const gw = discoverGateway(routes);
  __setGatewayForTests(gw.gateway);
  return { wrapper, requests: gw.requests, db };
}

// ── fixtures ─────────────────────────────────────────────────────────────
export const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export function product(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: UUID(n),
    title: `Product ${n}`,
    description: `Description ${n}`,
    brand: `Brand ${n}`,
    category: 'supplements',
    subcategory: 'longevity',
    price_cents: 1990 + n,
    currency: 'EUR',
    compare_at_price_cents: null,
    images: [],
    affiliate_url: '',
    availability: 'in_stock',
    rating: 4.5,
    review_count: 12,
    origin_country: null,
    origin_region: null,
    merchant_id: null,
    ingredients_primary: [],
    health_goals: [],
    dietary_tags: [],
    reward_preview: null,
    ...extra,
  };
}

export const emptyBreakdown = { allergies: 0, contraindications: 0, medications: 0, dietary: 0, budget: 0, sensitivities: 0, geo: 0, excluded_region: 0 };
export const searchResult = (items: unknown[], hidden = emptyBreakdown) => ({ ok: true, items, total_count: items.length, applied_filters: {}, hidden_breakdown: hidden, hidden_total: 0, suggested_expansions: [] });
export const feedResult = (items: unknown[], guest = false) => ({ ok: true, items, feed_context: { lifecycle_stage: null, personalization_weight: 1, region_group: null, scope: 'friendly', rationale: '', guest }, hidden_breakdown: emptyBreakdown });
export const emptyCart = { ok: true, cart: null, items: [] };
export const budget = { ok: true, monthly_cap_cents: null, spent_this_month_cents: 0, cart_active_subtotal_cents: 0, currency: 'EUR', status: 'under' };

/** Lets react-query settle. */
export const flush = () => new Promise((r) => setTimeout(r, 0));
