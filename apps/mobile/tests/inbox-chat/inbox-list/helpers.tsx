/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — test harness for
 * the inbox list. The gateway is N1's real `createGatewayFetch` (Bearer token
 * + `/api/v1` prefix are the production code path) over a fake `fetchImpl`
 * that answers by `METHOD /path` and records every request. The Supabase
 * client is an in-memory double of the PostgREST builder the inbox uses
 * (select / eq / neq / in / is / gt / or / not / order / limit / single /
 * maybeSingle / update / insert, `count: exact, head`), `rpc`, and realtime
 * channels whose handlers a test can fire. Every query, RPC and write is
 * logged, so tests assert the built requests. No network: the test files
 * import `../../helpers/no-network` first.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { configure } from '@testing-library/react-native';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { createGatewayFetch } from '../../../src/ports/core';
import { __resetInboxContextForTests } from '../../../src/screens/inbox/InboxScreen';
import { __resetInboxUnreadForTests } from '../../../src/screens/inbox/data/unread';
import { fakeSession } from '../../helpers/supabase-double';
import { makeWrapper } from '../../helpers/providers';

// The first render of a suite also loads the kit and the catalogs; give async waits room.
configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(30_000);

// Every test starts a fresh app session: Community context, no unread store.
afterEach(() => {
  __resetInboxContextForTests();
  __resetInboxUnreadForTests();
});

export const ORIGIN = 'https://g1-test.example.org';
export const TOKEN = 'token-inbox-test';
export const ME = 'u-me';
export const TENANT = 't-1';

export type Req = { method: string; path: string; query: URLSearchParams; headers: Record<string, string>; body: any };
export const FAIL = Symbol('fail');

export function inboxGateway(routes: Record<string, unknown>) {
  const requests: Req[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = (init.headers ?? {}) as Record<string, string>;
    requests.push({ method, path, query: u.searchParams, headers, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined });
    const key = `${method} ${path}`;
    const route = Object.prototype.hasOwnProperty.call(routes, key) ? routes[key] : undefined;
    const body = typeof route === 'function' ? (route as () => unknown)() : route;
    const status = body === undefined ? 404 : body === FAIL ? 500 : 200;
    const text = body === undefined || body === FAIL ? '{"error":"x"}' : JSON.stringify(body);
    return { ok: status === 200, status, text: async () => text } as unknown as Response;
  };
  return { gateway: createGatewayFetch({ origin: ORIGIN, getAccessToken: () => TOKEN, fetchImpl }), requests };
}

type Row = Record<string, any>;
export type Query = { table: string; op: 'select' | 'update' | 'insert'; columns?: string; head?: boolean; filters: Array<[string, string, any, any?]>; values?: any; limit?: number; single?: boolean };
type Result = { data: any; error: any; count?: number | null };

export type SupabaseOpts = {
  tables?: Record<string, Row[]>;
  /** Tables whose reads answer with an error. */
  failTables?: string[];
  rpc?: Record<string, (args: any) => Result | Promise<Result>>;
  tenant?: string | null;
  /** Every table read waits for this promise (the skeleton test). */
  gate?: Promise<unknown>;
};

function matches(row: Row, [op, col, a, b]: [string, string, any, any?]): boolean {
  switch (op) {
    case 'eq':
      return row[col] === a;
    case 'neq':
      return row[col] !== a;
    case 'in':
      return (a as any[]).includes(row[col]);
    case 'is':
      return a === null ? row[col] == null : row[col] === a;
    case 'gt':
      return String(row[col]) > String(a);
    case 'not':
      return a === 'is' && b === null ? row[col] != null : true;
    case 'or':
      return String(col)
        .split(',')
        .some((part) => {
          const [c, o, v] = part.split('.');
          return o === 'eq' ? String(row[c]) === v : false;
        });
    default:
      return true;
  }
}

/** The inbox Supabase double: tables, RPCs, realtime channels; everything logged. */
export function inboxSupabase(opts: SupabaseOpts = {}) {
  const tenant = opts.tenant === undefined ? TENANT : opts.tenant;
  const base = fakeSession(ME);
  const session = { ...base, user: { ...base.user, app_metadata: tenant ? { active_tenant_id: tenant } : {} } };
  const queries: Query[] = [];
  const rpcs: Array<{ name: string; args: any }> = [];
  const channels: Array<{ name: string; bindings: Array<{ type: string; filter: any; handler: (p: any) => void }>; removed: boolean; sent: any[] }> = [];
  const tables = opts.tables ?? {};

  const run = (q: Query): Result => {
    queries.push(q);
    if (q.op !== 'select') return { data: null, error: null };
    if (opts.failTables?.includes(q.table)) return { data: null, error: { message: 'boom' } };
    let rows = (tables[q.table] ?? []).filter((r) => q.filters.every((f) => matches(r, f)));
    const order = q.filters.find((f) => f[0] === 'order');
    if (order) rows = [...rows].sort((x, y) => (String(x[order[1]]) < String(y[order[1]]) ? 1 : -1) * (order[2]?.ascending ? -1 : 1));
    if (q.limit != null) rows = rows.slice(0, q.limit);
    if (q.head) return { data: null, error: null, count: rows.length };
    if (q.single) return rows[0] ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    return { data: rows, error: null };
  };

  const from = jest.fn((table: string) => {
    const q: Query = { table, op: 'select', filters: [] };
    const b: any = {
      select: (columns?: string, o?: { head?: boolean }) => ((q.columns = columns), (q.head = !!o?.head), b),
      eq: (c: string, v: any) => (q.filters.push(['eq', c, v]), b),
      neq: (c: string, v: any) => (q.filters.push(['neq', c, v]), b),
      in: (c: string, v: any[]) => (q.filters.push(['in', c, v]), b),
      is: (c: string, v: any) => (q.filters.push(['is', c, v]), b),
      gt: (c: string, v: any) => (q.filters.push(['gt', c, v]), b),
      not: (c: string, o: string, v: any) => (q.filters.push(['not', c, o, v]), b),
      or: (expr: string) => (q.filters.push(['or', expr, null]), b),
      order: (c: string, o: any) => (q.filters.push(['order', c, o]), b),
      limit: (n: number) => ((q.limit = n), b),
      update: (values: any) => ((q.op = 'update'), (q.values = values), b),
      insert: (values: any) => {
        q.op = 'insert';
        q.values = values;
        return Promise.resolve(run(q));
      },
      single: async () => run({ ...q, single: true }),
      maybeSingle: async () => {
        const r = run(q);
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      then: (res: (r: Result) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve(opts.gate)
          .then(() => run(q))
          .then(res, rej),
    };
    return b;
  });

  const rpc = jest.fn(async (name: string, args?: any) => {
    rpcs.push({ name, args });
    const h = opts.rpc?.[name];
    if (h) return h(args);
    if (name === 'list_public_tenants') return { data: [], error: null };
    return { data: null, error: null };
  });

  const channel = jest.fn((name: string) => {
    const ch: any = { name, bindings: [], removed: false, sent: [] };
    ch.on = (type: string, filter: any, handler: (p: any) => void) => (ch.bindings.push({ type, filter, handler }), ch);
    ch.subscribe = (cb?: (s: string) => void) => (cb?.('SUBSCRIBED'), ch);
    ch.send = async (msg: any) => (ch.sent.push(msg), 'ok');
    channels.push(ch);
    return ch;
  });

  const auth = {
    getSession: jest.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
    refreshSession: jest.fn(async () => ({ data: { session }, error: null })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
    signOut: jest.fn(async () => ({ error: null })),
  };

  const client: any = { auth, from, rpc, channel, removeChannel: jest.fn(async (ch: any) => ((ch.removed = true), 'ok')) };

  /** Fires a realtime postgres change on every live channel bound to `table` + `event`. */
  const emit = (table: string, event: string, payload: any) => {
    for (const ch of channels)
      for (const b of ch.bindings) if (!ch.removed && b.type === 'postgres_changes' && b.filter?.table === table && b.filter?.event === event) b.handler(payload);
  };

  return { client, queries, rpcs, channels, emit };
}

/** Provider wrapper (signed-in member, tenant t-1) with the inbox gateway + Supabase installed. */
export function inboxWrapper(routes: Record<string, unknown>, sb: SupabaseOpts = {}, language = 'en-US') {
  const supabase = inboxSupabase(sb);
  const wrapper = makeWrapper({ client: supabase.client, language });
  const gw = inboxGateway(routes);
  __setGatewayForTests(gw.gateway);
  return { wrapper, requests: gw.requests, ...supabase };
}

// ── fixtures ─────────────────────────────────────────────────────────────
export const ANNA = 'u-anna';
export const BEN = 'u-ben';
export const BOT = 'u-service-bot';
export const TEST_ACTOR = 'u-test-actor';

const mins = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

export const profiles = [
  { user_id: ME, display_name: 'Me Myself', avatar_url: null },
  { user_id: ANNA, display_name: 'Anna Berg', avatar_url: 'https://g1-test.example.org/a.png' },
  { user_id: BEN, display_name: 'Ben Cole', avatar_url: null },
];

export const conversations = {
  data: [
    { peer_id: ANNA, last_message: { id: 'm-a', sender_id: ANNA, receiver_id: ME, content: 'See you at yoga', created_at: mins(5) } },
    { peer_id: BEN, last_message: { id: 'm-b', sender_id: ME, receiver_id: BEN, content: 'Thanks Ben', created_at: mins(180) } },
  ],
};

/** Two unread from Anna. */
export const unreadRows = [
  { id: 'c1', sender_id: ANNA, receiver_id: ME, read_at: null, content: 'x', created_at: mins(6) },
  { id: 'c2', sender_id: ANNA, receiver_id: ME, read_at: null, content: 'See you at yoga', created_at: mins(5) },
];

export const groups = { data: [{ id: 'g-1', name: 'FIRST 100', created_at: mins(600), metadata: {}, last_message: { id: 'gm', sender_id: ANNA, content: 'Welcome all', created_at: mins(30) }, unread_count: 12 }] };

export const loadedRoutes = {
  'GET /chat/conversations': conversations,
  'GET /chat/groups/': groups,
  'GET /chat/unread-count': { count: 2 },
  'POST /chat/read-all': { updated: 2 },
  'POST /chat/groups/g-1/read': { ok: true },
};

export const loadedTables = { global_community_profiles: profiles, profiles: [], chat_messages: unreadRows };

/** The directory the search RPCs search: it contains a service bot and a test actor. */
export const directory = [
  { user_id: 'u-cleo', display_name: 'Cleo Ray', avatar_url: null, bio: 'Runner' },
  { user_id: BOT, display_name: 'Cleo Bot', avatar_url: null, bio: null },
  { user_id: TEST_ACTOR, display_name: 'Cleo Test Actor', avatar_url: null, bio: null },
  { user_id: 'u-cleon', display_name: 'Cleon Park', avatar_url: null, bio: null },
];

/** The server side of the two directory RPCs: excludes service_bot_accounts ∪ notification_test_actors (rule 45). */
export function directoryRpc(term: string) {
  const excluded = new Set([BOT, TEST_ACTOR]);
  return directory.filter((u) => !excluded.has(u.user_id) && u.display_name.toLowerCase().includes(term.toLowerCase()));
}
