/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — test harness for the
 * Daily Diary. The gateway is N1's real `createGatewayFetch` (so the Bearer
 * token and the `/api/v1` prefix are the production code path) over a fake
 * `fetchImpl` that answers by `METHOD /path` (query string ignored) and
 * records every request with its headers and body. The Supabase client is the
 * shell's in-memory double plus the parts the diary uses: `diary_entries`
 * select / eq / order / limit, Storage (upload, getPublicUrl, remove,
 * createSignedUrl), `functions.invoke` and a realtime channel. No network:
 * the test files import `../helpers/no-network` first.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { configure } from '@testing-library/react-native';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { createGatewayFetch } from '../../src/ports/core';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';

// Give findBy and waitFor 5 s instead of RNTL's 1 s default under default-worker load (as tests/settings/helpers.tsx).
configure({ asyncUtilTimeout: 5000 });
// Chained 5 s waits must fit inside the test's own budget (Jest default 5 s).
jest.setTimeout(30000);

export const ORIGIN = 'https://g1-test.example.org';
export const TOKEN = 'token-diary-test';
export const USER = 'u-1';

export type Req = { method: string; path: string; query: URLSearchParams; headers: Record<string, string>; body: any };
export type Route = unknown | ((req: Req) => unknown);

/** A route answers 200 with its JSON; `FAIL` answers 500; a missing route answers 404. */
export const FAIL = Symbol('fail');

export function diaryGateway(routes: Record<string, Route>) {
  const requests: Req[] = [];
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = (init.headers ?? {}) as Record<string, string>;
    const req: Req = { method, path, query: u.searchParams, headers, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined };
    requests.push(req);
    const key = `${method} ${path}`;
    const route = Object.prototype.hasOwnProperty.call(routes, key) ? routes[key] : undefined;
    const body = typeof route === 'function' ? (route as (r: Req) => unknown)(req) : route;
    const status = body === undefined ? 404 : body === FAIL ? 500 : 200;
    const text = body === undefined || body === FAIL ? '{"ok":false,"error":"x"}' : JSON.stringify(body);
    return { ok: status === 200, status, text: async () => text } as unknown as Response;
  };
  return { gateway: createGatewayFetch({ origin: ORIGIN, getAccessToken: () => TOKEN, fetchImpl }), requests };
}

export type SupabaseOpts = {
  /** Rows of `diary_entries`, or `FAIL` for a read error. */
  entries?: any[] | typeof FAIL;
  /** `transcribe-audio` answer. */
  transcript?: string;
};

/** The shell double plus the diary's tables, Storage, Functions and realtime. */
export function diarySupabase(opts: SupabaseOpts = {}) {
  const double = createSupabaseDouble({ session: fakeSession(USER) });
  const log: Array<{ op: string; args: any[] }> = [];
  const channels: Array<{ name: string; handler?: () => void; removed: boolean }> = [];
  const client = double.client;

  client.from = jest.fn((table: string) => {
    const filters: Array<[string, any]> = [];
    let order: [string, any] | null = null;
    let limit: number | null = null;
    const run = () => {
      log.push({ op: `from.${table}.select`, args: [filters, order, limit] });
      if (opts.entries === FAIL) return { data: null, error: { message: 'boom' } };
      const rows = (opts.entries ?? []).filter((r: any) => filters.every(([c, v]) => r[c] === v));
      return { data: rows, error: null };
    };
    const b: any = {
      select: () => b,
      eq: (c: string, v: any) => (filters.push([c, v]), b),
      order: (c: string, o: any) => ((order = [c, o]), b),
      limit: (n: number) => ((limit = n), b),
      then: (res: (r: any) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    return b;
  });

  client.storage = {
    from: (bucket: string) => ({
      upload: jest.fn(async (name: string, bytes: Uint8Array, o: any) => {
        log.push({ op: `storage.${bucket}.upload`, args: [name, bytes.length, o] });
        return { data: { path: name }, error: null };
      }),
      getPublicUrl: (name: string) => ({ data: { publicUrl: `${ORIGIN}/storage/v1/object/public/${bucket}/${name}` } }),
      createSignedUrl: jest.fn(async (name: string, secs: number) => {
        log.push({ op: `storage.${bucket}.sign`, args: [name, secs] });
        return { data: { signedUrl: `${ORIGIN}/signed/${bucket}/${name}` }, error: null };
      }),
      remove: jest.fn(async (paths: string[]) => {
        log.push({ op: `storage.${bucket}.remove`, args: [paths] });
        return { data: [], error: null };
      }),
    }),
  };

  client.functions = {
    invoke: jest.fn(async (name: string, o: any) => {
      log.push({ op: `functions.${name}`, args: [o.body] });
      return { data: { transcript: opts.transcript ?? 'I walked by the river' }, error: null };
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

/** Provider wrapper (signed-in member) with the diary gateway + Supabase installed. */
export function diaryWrapper(routes: Record<string, Route>, sb: SupabaseOpts = {}, language = 'en-US') {
  const supabase = diarySupabase(sb);
  const wrapper = makeWrapper({ client: supabase.client, language });
  const gw = diaryGateway(routes);
  __setGatewayForTests(gw.gateway);
  return { wrapper, requests: gw.requests, log: supabase.log, channels: supabase.channels };
}

// ── fixtures ─────────────────────────────────────────────────────────────
const now = new Date();
export const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30).toISOString();
export const oldIso = new Date(2025, 0, 15, 12).toISOString();

export const textEntry = { id: 'e-text', user_id: USER, text: 'Drank two litres of water', source: 'text', tags: ['diary', 'text'], attachments: null, duration: null, created_at: todayIso };
export const voiceEntry = { id: 'e-voice', user_id: USER, text: 'Slept eight hours', source: 'voice', tags: ['diary', 'voice'], attachments: null, duration: 12, created_at: oldIso };
export const photoEntry = {
  id: 'e-photo',
  user_id: USER,
  text: 'Photo entry',
  source: 'photo',
  tags: ['diary', 'photo'],
  attachments: [`${ORIGIN}/storage/v1/object/public/diary-photos/${USER}/a.jpg`, `${ORIGIN}/storage/v1/object/public/diary-photos/${USER}/b.jpg`],
  duration: null,
  created_at: todayIso,
};
export const otherUsersEntry = { ...textEntry, id: 'e-other', user_id: 'u-2' };

export const ticket = (over: Record<string, unknown> = {}) => ({
  id: 't-1',
  ticket_number: 'FB-0001',
  kind: 'bug',
  status: 'triaged',
  created_at: todayIso,
  resolver_agent: null,
  raw_transcript: 'The save button does nothing',
  structured_fields: { severity: 'high', voice_origin: true },
  ...over,
});

export const savedEntry = (index: unknown = null) => ({ entry: { id: 'e-new', created_at: todayIso }, memory_item_id: 'mi-1', index });
