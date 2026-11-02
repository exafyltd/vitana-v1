/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — test
 * harness. No network and no live system: the gateway is N1's real
 * `createGatewayFetch` (Bearer token + `/api/v1`, the production code path)
 * over a fake `fetchImpl` that answers by `METHOD /path` and records every
 * request (headers, query, body); the Supabase client is the shell's
 * in-memory double plus the tables, filters, inserts / deletes, RPCs, Edge
 * Functions and realtime channel these screens use, all recorded in `log`.
 * Payments and orders are only ever *built* here — the tests assert the
 * request the screen would send; nothing is charged or ordered.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// RNTL asyncUtilTimeout 8000 ms (findBy / waitFor) for every lane test.
import './timing';
import { Platform } from 'react-native';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { createGatewayFetch } from '../../src/ports/core';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';

export const ORIGIN = 'https://g1-test.example.org';
export const TOKEN = 'token-commerce-test';
export const USER = 'u-1';

export type Req = { method: string; path: string; query: URLSearchParams; headers: Record<string, string>; body: any };
export type Route = unknown | ((req: Req) => unknown);
export const FAIL = Symbol('fail');

export function commerceGateway(routes: Record<string, Route>) {
  const requests: Req[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const raw = (init.headers ?? {}) as Record<string, string>;
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = v;
    const req: Req = { method, path, query: u.searchParams, headers, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined };
    requests.push(req);
    const key = `${method} ${path}`;
    const route = Object.prototype.hasOwnProperty.call(routes, key) ? routes[key] : undefined;
    const body = typeof route === 'function' ? (route as (r: Req) => unknown)(req) : route;
    const status = body === undefined ? 404 : body === FAIL ? 500 : 200;
    const text = body === undefined || body === FAIL ? '{"ok":false,"error":"x"}' : JSON.stringify(body);
    return { ok: status === 200, status, text: async () => text, json: async () => JSON.parse(text) } as unknown as Response;
  };
  return { gateway: createGatewayFetch({ origin: ORIGIN, getAccessToken: () => TOKEN, fetchImpl }), requests };
}

export type Op = { op: string; table?: string; args: any };

export type SupabaseOpts = {
  /** Rows per table, or FAIL for a read error on that table. */
  tables?: Record<string, any[] | typeof FAIL>;
  /** Error code of the next `bookmarked_items` insert (e.g. '23505'). */
  insertError?: Record<string, { code?: string; message: string }>;
  /** Edge Function answers by name, or FAIL. */
  functions?: Record<string, unknown>;
  /** RPC answers by name, or FAIL. */
  rpc?: Record<string, unknown>;
};

/** The shell double plus the commerce tables, writes, RPCs, Functions and realtime. */
export function commerceSupabase(opts: SupabaseOpts = {}) {
  const double = createSupabaseDouble({ session: fakeSession(USER) });
  const log: Op[] = [];
  const channels: Array<{ name: string; handler?: () => void; removed: boolean }> = [];
  const client = double.client;
  const tables = opts.tables ?? {};

  client.from = jest.fn((table: string) => {
    const filters: Array<[string, string, any]> = [];
    let order: [string, any] | null = null;
    let limit: number | null = null;
    let select: string | null = null;
    let write: { op: 'insert' | 'delete' | 'update'; values?: any } | null = null;
    const run = () => {
      if (write) {
        log.push({ op: write.op, table, args: { values: write.values, filters: filters.map(([o, c, v]) => [o, c, v]) } });
        const err = write.op === 'insert' ? opts.insertError?.[table] : undefined;
        if (err) return { data: null, error: err };
        return { data: write.values ? (Array.isArray(write.values) ? { id: 'new-1', ...write.values[0] } : { id: 'new-1', ...write.values }) : null, error: null };
      }
      log.push({ op: 'select', table, args: { select, filters: filters.map(([o, c, v]) => [o, c, v]), order, limit } });
      const src = tables[table];
      if (src === FAIL) return { data: null, error: { message: 'boom' } };
      let rows = (src ?? []).filter((r: any) => filters.every(([o, c, v]) => (o === 'eq' ? r[c] === v : true)));
      if (limit !== null) rows = rows.slice(0, limit);
      return { data: rows, error: null };
    };
    const b: any = {
      select: (s?: string) => ((select = select ?? s ?? '*'), b),
      eq: (c: string, v: any) => (filters.push(['eq', c, v]), b),
      gte: (c: string, v: any) => (filters.push(['gte', c, v]), b),
      lt: (c: string, v: any) => (filters.push(['lt', c, v]), b),
      order: (c: string, o: any) => ((order = [c, o]), b),
      limit: (n: number) => ((limit = n), b),
      insert: (values: any) => ((write = { op: 'insert', values }), b),
      delete: () => ((write = { op: 'delete' }), b),
      single: async () => {
        const r = run();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      maybeSingle: async () => {
        const r = run();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      then: (res: (r: any) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  });

  client.rpc = jest.fn(async (name: string, args: any) => {
    log.push({ op: 'rpc', table: name, args });
    const a = opts.rpc?.[name];
    if (a === FAIL) return { data: null, error: { message: 'rpc failed' } };
    return { data: a ?? [{ ok: true }], error: null };
  });

  client.functions = {
    invoke: jest.fn(async (name: string, o: any) => {
      log.push({ op: 'function', table: name, args: o?.body });
      const a = opts.functions?.[name];
      if (a === FAIL) return { data: null, error: { message: 'function failed' } };
      return { data: a ?? {}, error: null };
    }),
  };

  client.channel = jest.fn((name: string) => {
    const ch: any = { name, removed: false };
    ch.on = (_e: string, _f: unknown, handler: () => void) => ((ch.handler = handler), ch);
    ch.subscribe = () => ch;
    channels.push(ch);
    return ch;
  });
  client.removeChannel = jest.fn(async (ch: any) => {
    ch.removed = true;
    return 'ok';
  });

  return { client, log, channels };
}

/** Provider wrapper (signed-in member) with the fake gateway + Supabase installed. */
export function commerceWrapper(routes: Record<string, Route> = {}, sb: SupabaseOpts = {}, language = 'en-US') {
  const supabase = commerceSupabase(sb);
  const wrapper = makeWrapper({ client: supabase.client, language });
  const gw = commerceGateway(routes);
  __setGatewayForTests(gw.gateway);
  return { wrapper, requests: gw.requests, log: supabase.log, channels: supabase.channels, client: supabase.client };
}

/** Pins `Platform.OS` (the iOS IAP rule reads it); returns the restore. */
export function setOS(os: 'ios' | 'android'): () => void {
  const prev = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
  return () => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => prev });
}

// ── fixtures ─────────────────────────────────────────────────────────────
export const intent = (over: Record<string, unknown> = {}) => ({
  intent_id: 'i-1',
  requester_user_id: 'u-2',
  requester_vitana_id: 'maria3',
  tenant_id: 't-1',
  intent_kind: 'commercial_sell',
  category: 'home_goods',
  title: 'Selling a rowing machine',
  scope: 'Barely used rowing machine, pick-up in Berlin Mitte, works perfectly.',
  kind_payload: { budget_min: 100, budget_max: 200, location_label: 'Berlin' },
  visibility: 'public',
  compass_alignment_at_post: null,
  status: 'open',
  match_count: 2,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
  ...over,
});

const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
const past = new Date(Date.now() - 30 * 86_400_000).toISOString();

export const ticketRow = (over: Record<string, unknown> = {}) => ({
  id: 't-up',
  event_id: 'e-1',
  ticket_type_id: 'tt-1',
  buyer_id: USER,
  buyer_email: 'me@example.org',
  buyer_name: 'Alex Member',
  quantity: 2,
  unit_price: 20,
  total_amount: 40,
  currency: 'usd',
  status: 'completed',
  qr_code_token: 'QR-TOKEN-UP',
  ticket_number: 'VTN-20261112-000001',
  checked_in_at: null,
  created_at: '2026-10-20T10:00:00Z',
  metadata: {},
  ticket_type: { id: 'tt-1', name: 'Standard' },
  event: { id: 'e-1', title: 'Sunrise Breathwork', start_time: future, location: 'Tempelhof Field', image_url: null },
  ...over,
});

export const pastTicketRow = (over: Record<string, unknown> = {}) =>
  ticketRow({ id: 't-past', quantity: 1, total_amount: 15, ticket_number: 'VTN-20250101-000002', checked_in_at: past, event: { id: 'e-2', title: 'Forest Bathing Walk', start_time: past, location: 'Grunewald', image_url: null }, ...over });

export const cjRow = (over: Record<string, unknown> = {}) => ({
  id: 'cj-1-aaaaaaaa',
  status: 'shipped',
  total_amount: 29.9,
  tracking_number: 'TRK1',
  created_at: '2026-10-25T10:00:00Z',
  order_items: [{ item_name: 'Magnesium Glycinate', item_image_url: 'https://cdn.example.org/mg.jpg' }],
  ...over,
});

export const voucherRow = (over: Record<string, unknown> = {}) => ({
  id: 'v-1',
  tier: 'experience',
  status: 'paid',
  amount_cents: 9900,
  created_at: '2026-10-22T10:00:00Z',
  voucher_code: 'MAX-ABCD-1234',
  buyer_user_id: USER,
  ...over,
});

export const appointmentRow = (over: Record<string, unknown> = {}) => ({
  id: 'a-1',
  provider_name: 'Dr. Sarah Chen',
  provider_specialty: 'Longevity Medicine',
  provider_image_url: null,
  appointment_type: 'consultation',
  start_time: new Date(Date.now() + 3 * 86_400_000).toISOString(),
  duration_minutes: 30,
  location: 'New York, NY',
  status: 'scheduled',
  ...over,
});
