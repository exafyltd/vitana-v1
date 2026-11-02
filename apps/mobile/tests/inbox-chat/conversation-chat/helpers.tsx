/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the test
 * harness: an in-memory Supabase double (PostgREST builder incl. or/lt/filter/
 * update, rpc, storage signed URLs and REALTIME channels whose events a test
 * emits and whose broadcasts it reads), a gateway fake keyed by
 * "METHOD /path" that records every request (method, path, JSON body), and
 * the provider wrapper. Nothing leaves the process: `../../helpers/no-network`
 * blocks fetch, and no test sends a real message or opens a real call.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { TenantProvider } from '../../../src/identity/TenantProvider';
import { LanguageProvider } from '../../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';

type Row = Record<string, any>;
type Result = { data: any; error: { message: string; code?: string } | null; count?: number | null };

export const ME = 'u-me';
export const PEER = 'u-peer';

export type FakeChannel = {
  name: string;
  opts: any;
  handlers: Array<{ type: string; event?: string; cb: (p: any) => void }>;
  on: (type: string, filter: any, cb: (p: any) => void) => FakeChannel;
  subscribe: (cb?: (status: string) => void) => FakeChannel;
  send: jest.Mock;
  track: jest.Mock;
  unsubscribe: jest.Mock;
  presenceState: () => Record<string, unknown>;
};

export function createChatDouble(opts: { userId?: string | null; tables?: Record<string, Row[]>; rpc?: Record<string, (args: any) => Result>; failTables?: string[]; sendResult?: string } = {}) {
  const tables = opts.tables ?? {};
  const userId = opts.userId === undefined ? ME : opts.userId;
  const calls: Array<{ fn: string; args: any[] }> = [];
  const writes: Array<{ table: string; op: 'insert' | 'update' | 'delete'; values?: Row; filters: Array<[string, string, any]> }> = [];
  const channels = new Map<string, FakeChannel>();
  const broadcasts: Array<{ channel: string; event: string; payload: any }> = [];
  const removed: string[] = [];

  function from(table: string) {
    const filters: Array<[string, string, any]> = [];
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let values: Row | null = null;
    let limitN: number | null = null;
    const compute = (): Result => {
      if (opts.failTables?.includes(table)) return { data: null, error: { message: `${table} failed` } };
      if (mode !== 'select') {
        writes.push({ table, op: mode, values: values ?? undefined, filters: [...filters] });
        calls.push({ fn: `from.${table}.${mode}`, args: [values, filters] });
        return { data: mode === 'insert' ? [{ id: `ins-${writes.length}`, created_at: '2026-11-02T10:00:00.000Z', ...(values ?? {}) }] : null, error: null };
      }
      calls.push({ fn: `from.${table}.select`, args: [filters] });
      let rows = (tables[table] ?? []).filter((r) =>
        filters.every(([op, c, v]) => (op === 'eq' ? r[c] === v : op === 'in' ? (v as unknown[]).includes(r[c]) : op === 'is' ? (r[c] ?? null) === v : true)),
      );
      if (limitN !== null) rows = rows.slice(0, limitN);
      return { data: rows, error: null };
    };
    const b: any = {
      select: () => b,
      insert: (v: Row) => ((mode = 'insert'), (values = v), b),
      update: (v: Row) => ((mode = 'update'), (values = v), b),
      delete: () => ((mode = 'delete'), b),
      eq: (c: string, v: any) => (filters.push(['eq', c, v]), b),
      in: (c: string, v: any) => (filters.push(['in', c, v]), b),
      is: (c: string, v: any) => (filters.push(['is', c, v]), b),
      lt: (c: string, v: any) => (filters.push(['lt', c, v]), b),
      or: (v: string) => (filters.push(['or', '', v]), b),
      filter: (c: string, op: string, v: any) => (filters.push(['filter', `${c} ${op}`, v]), b),
      order: () => b,
      limit: (n: number) => ((limitN = n), b),
      single: async () => {
        const r = compute();
        const first = Array.isArray(r.data) ? r.data[0] : r.data;
        return r.error ? r : first ? { data: first, error: null } : { data: null, error: { message: 'not found' } };
      },
      maybeSingle: async () => {
        const r = compute();
        return r.error ? r : { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: null };
      },
      then: (res: (r: Result) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(compute()).then(res, rej),
    };
    return b;
  }

  function channel(name: string, chOpts?: any): FakeChannel {
    const existing = channels.get(name);
    if (existing) return existing;
    const ch: FakeChannel = {
      name,
      opts: chOpts,
      handlers: [],
      on(type, filter, cb) {
        ch.handlers.push({ type, event: filter?.event, cb });
        return ch;
      },
      subscribe(cb) {
        cb?.('SUBSCRIBED');
        return ch;
      },
      send: jest.fn(async (msg: { event: string; payload: any }) => {
        broadcasts.push({ channel: name, event: msg.event, payload: msg.payload });
        return opts.sendResult ?? 'ok';
      }),
      track: jest.fn(async () => 'ok'),
      unsubscribe: jest.fn(async () => {
        channels.delete(name);
        return 'ok';
      }),
      presenceState: () => ({}),
    };
    channels.set(name, ch);
    return ch;
  }

  const client = {
    auth: {
      getUser: jest.fn(async () => ({ data: { user: userId ? { id: userId } : null }, error: null })),
      getSession: jest.fn(async () => ({ data: { session: userId ? { user: { id: userId, user_metadata: { active_tenant_id: 't-1' } }, access_token: `token-${userId}` } : null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
      refreshSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
    },
    from: jest.fn(from),
    rpc: jest.fn(async (fn: string, args?: any) => {
      calls.push({ fn: `rpc.${fn}`, args: [args] });
      const h = opts.rpc?.[fn];
      return h ? h(args) : { data: [], error: null };
    }),
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: jest.fn(async (path: string) => ({ data: { signedUrl: `https://signed.test/${bucket}/${path}` }, error: null })),
      }),
    },
    channel: jest.fn(channel),
    removeChannel: jest.fn(async (ch: FakeChannel) => {
      removed.push(ch.name);
      channels.delete(ch.name);
      return 'ok';
    }),
  };

  /** Deliver a realtime event to every handler of `name` for that type/event. */
  function emit(name: string, type: 'broadcast' | 'postgres_changes' | 'presence', event: string, payload: any) {
    const ch = channels.get(name);
    if (!ch) throw new Error(`no channel ${name} (have ${[...channels.keys()].join(', ')})`);
    for (const h of ch.handlers) {
      if (h.type !== type) continue;
      if (type === 'postgres_changes') h.cb({ new: payload });
      else if (h.event === event) h.cb(type === 'broadcast' ? { payload } : payload);
    }
  }

  return { client: client as any, calls, writes, channels, broadcasts, removed, emit };
}

export type GatewayRoute = (req: { method: string; path: string; query: string; body: any }) => { status?: number; body?: unknown } | unknown;

/** Gateway fake: "METHOD /path" (query string ignored) → JSON. Records every request. */
export function chatGateway(routes: Record<string, GatewayRoute | unknown>) {
  const requests: Array<{ method: string; path: string; query: string; body: any }> = [];
  const fetch = async (path: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const [pathname, query = ''] = path.split('?');
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    requests.push({ method, path: pathname, query, body });
    const key = `${method} ${pathname}`;
    if (!Object.prototype.hasOwnProperty.call(routes, key)) return { ok: false, status: 404, text: async () => JSON.stringify({ error: 'Gateway 404' }) } as unknown as Response;
    const route = routes[key];
    const out = typeof route === 'function' ? (route as GatewayRoute)({ method, path: pathname, query, body }) : { body: route };
    const { status = 200, body: resBody } = (out ?? {}) as { status?: number; body?: unknown };
    return { ok: status < 400, status, text: async () => JSON.stringify(resBody ?? {}) } as unknown as Response;
  };
  return { fetch, requests };
}

const qcs: QueryClient[] = [];
afterEach(() => {
  while (qcs.length) qcs.pop()?.clear();
});

export function makeChatWrapper(o: { client: unknown; gateway?: ReturnType<typeof chatGateway>; language?: string }) {
  __setSupabaseForTests(o.client as never);
  __setGatewayForTests((o.gateway ?? chatGateway({})).fetch as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  qcs.push(qc);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <AuthProvider client={o.client as never}>
            <TenantProvider>
              <LanguageProvider initialLanguage={o.language ?? 'en-US'}>{children}</LanguageProvider>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

/** A gateway DM row (chat_messages shape). */
export function dm(id: string, sender: string, content: string, minute: number, extra: Row = {}) {
  return {
    id,
    sender_id: sender,
    receiver_id: sender === ME ? PEER : ME,
    content,
    created_at: new Date(Date.UTC(2026, 10, 2, 9, minute)).toISOString(),
    read_at: sender === ME ? null : '2026-11-02T09:59:00.000Z',
    ...extra,
  };
}

export const PROFILES = [
  { user_id: ME, display_name: 'Mia Me', avatar_url: null },
  { user_id: PEER, display_name: 'Petra Peer', avatar_url: null },
];
