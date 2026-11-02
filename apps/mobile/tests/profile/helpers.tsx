/**
 * VTID-05429 (Native Wave 2, profile lane) — test harness for the profile and
 * privacy screens. An in-memory Supabase double with the builder methods the
 * native profile data layer uses (select with head counts, eq/in/order/limit,
 * maybeSingle, update, insert, delete, rpc, auth.getSession, storage
 * upload / getPublicUrl) that RECORDS every write and never sends one, a
 * gateway fake (pathname match, records method + body), and the provider wrapper
 * under the UI kit provider. No network: tests import `../helpers/no-network`
 * first, so any real fetch fails the test.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthProvider';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { TenantProvider } from '../../src/identity/TenantProvider';
import { LanguageProvider } from '../../src/identity/LanguageProvider';
import { ThemeProvider } from '../../src/theme/ThemeProvider';
import { UIProvider } from '../../src/ports/ui';

type Row = Record<string, any>;
type Result = { data: any; error: { message: string } | null; count?: number | null };

export type ProfileDoubleOptions = {
  /** Signed-in user id; null = signed out. */
  userId?: string | null;
  email?: string;
  tables?: Record<string, Row[]>;
  rpc?: Record<string, (args: any) => Result>;
  /** Tables whose reads resolve to an error. */
  failTables?: string[];
  /** When true, every update resolves to an error (still recorded, never sent). */
  failWrites?: boolean;
};

export type RecordedWrite = { table: string; values: Row; filters: Array<[string, any]> };
export type RecordedInsert = { table: string; values: Row };
export type RecordedDelete = { table: string; filters: Array<[string, any]> };
export type RecordedUpload = { bucket: string; path: string; bytes: number; options: Row };

const ok = (data: any = null, count: number | null = null): Result => ({ data, error: null, count });
const err = (message = 'error'): Result => ({ data: null, error: { message }, count: null });

export function createProfileDouble(opts: ProfileDoubleOptions = {}) {
  const tables = opts.tables ?? {};
  const userId = opts.userId === undefined ? 'u-1' : opts.userId;
  const writes: RecordedWrite[] = [];
  const inserts: RecordedInsert[] = [];
  const deletes: RecordedDelete[] = [];
  const uploads: RecordedUpload[] = [];
  const reads: string[] = [];
  let insertSeq = 0;

  function from(table: string) {
    const filters: Array<[string, string, any]> = [];
    let head = false;
    let limitN: number | null = null;
    let updateValues: Row | null = null;
    let insertValues: Row | null = null;
    let isDelete = false;

    const compute = (): Result => {
      if (insertValues) {
        inserts.push({ table, values: insertValues });
        insertSeq += 1;
        return opts.failWrites ? err('write failed') : ok({ id: `ins-${insertSeq}`, ...insertValues });
      }
      if (isDelete) {
        deletes.push({ table, filters: filters.map(([, c, v]) => [c, v]) });
        return opts.failWrites ? err('write failed') : ok(null);
      }
      if (updateValues) {
        writes.push({ table, values: updateValues, filters: filters.map(([, c, v]) => [c, v]) });
        return opts.failWrites ? err('write failed') : ok(null);
      }
      reads.push(table);
      if (opts.failTables?.includes(table)) return err(`${table} failed`);
      let out = (tables[table] ?? []).filter((r) =>
        filters.every(([op, c, v]) => (op === 'eq' ? r[c] === v : op === 'in' ? Array.isArray(v) && v.includes(r[c]) : true)),
      );
      if (limitN !== null) out = out.slice(0, limitN);
      return head ? { data: null, error: null, count: out.length } : ok(out);
    };

    const builder: any = {
      select: (_cols?: string, o?: { head?: boolean }) => ((head = !!o?.head), builder),
      update: (values: Row) => ((updateValues = values), builder),
      insert: (values: Row) => ((insertValues = values), builder),
      delete: () => ((isDelete = true), builder),
      single: async () => compute(),
      eq: (c: string, v: any) => (filters.push(['eq', c, v]), builder),
      in: (c: string, v: any) => (filters.push(['in', c, v]), builder),
      order: () => builder,
      limit: (n: number) => ((limitN = n), builder),
      maybeSingle: async () => {
        const r = compute();
        if (r.error) return r;
        return ok(Array.isArray(r.data) ? (r.data[0] ?? null) : r.data);
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(compute()).then(resolve, reject),
    };
    return builder;
  }

  const session = userId ? { access_token: `token-${userId}`, refresh_token: 'r', user: { id: userId, email: opts.email, app_metadata: {}, user_metadata: {} } } : null;
  const auth = {
    getSession: jest.fn(async () => ({ data: { session }, error: null })),
    getUser: jest.fn(async () => ({ data: { user: session?.user ?? null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: () => undefined } } })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
    refreshSession: jest.fn(async () => ({ data: { session }, error: null })),
    signOut: jest.fn(async () => ({ error: null })),
  };
  const rpc = jest.fn(async (name: string, args?: any) => {
    const h = opts.rpc?.[name];
    if (h) return h(args);
    if (name === 'list_public_tenants') return ok([]);
    return ok(null);
  });

  const storage = {
    from: (bucket: string) => ({
      upload: jest.fn(async (path: string, body: Uint8Array, options: Row) => {
        uploads.push({ bucket, path, bytes: body?.length ?? 0, options });
        return opts.failWrites ? err('upload failed') : ok({ path });
      }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${bucket}/${path}` } }),
    }),
  };

  return { client: { auth, rpc, from: jest.fn(from), storage } as any, writes, inserts, deletes, uploads, reads };
}

/** A gateway fake that matches by pathname; records every path; never touches a network. */
export function pathGateway(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const requests: Array<{ path: string; method: string; body?: string; headers: Record<string, string> }> = [];
  const fetch = async (path: string, init: RequestInit = {}) => {
    calls.push(path);
    requests.push({ path, method: init.method ?? 'GET', body: typeof init.body === 'string' ? init.body : undefined, headers: (init.headers as Record<string, string>) ?? {} });
    const body = Object.prototype.hasOwnProperty.call(routes, path.split('?')[0]) ? routes[path.split('?')[0]] : undefined;
    return { ok: body !== undefined, status: body !== undefined ? 200 : 404, text: async () => (body === undefined ? '' : JSON.stringify(body)) } as unknown as Response;
  };
  return { fetch, calls, requests };
}

const qcs: QueryClient[] = [];
afterEach(() => {
  while (qcs.length) qcs.pop()?.clear();
});

export function renderProfile(ui: ReactElement, opts: { client: unknown; gateway?: Record<string, unknown>; language?: string; direction?: 'ltr' | 'rtl' }) {
  __setSupabaseForTests(opts.client as never);
  const gw = pathGateway(opts.gateway ?? {});
  __setGatewayForTests(gw.fetch);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  qcs.push(qc);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <AuthProvider client={opts.client as never}>
            <TenantProvider>
              <LanguageProvider initialLanguage={opts.language ?? 'en-US'}>
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
  return { ...render(ui, { wrapper: Wrapper }), gatewayCalls: gw.calls, gatewayRequests: gw.requests };
}

/** The member's `profiles` row used across the screen tests. */
export const profileRow = {
  id: 'p-1',
  user_id: 'u-1',
  first_name: 'Ana',
  last_name: 'Belić',
  display_name: 'Ana B',
  handle: 'ana',
  avatar_url: null,
  avatar_offset_x: 50,
  avatar_offset_y: 50,
  longevity_archetype: 'The Mindful Mover',
  bio: 'Salsa every Friday.',
  location: 'Berlin',
  links: [{ label: 'Site', url: 'https://example.org' }],
  languages: ['de', 'en'],
  linkedin_url: 'https://linkedin.example.org/in/ana',
  email: 'ana@example.org',
  phone: null,
  city: 'Berlin',
  country: 'DE',
  created_at: '2026-01-15T10:00:00.000Z',
  account_visibility: { city: 'public' },
};
