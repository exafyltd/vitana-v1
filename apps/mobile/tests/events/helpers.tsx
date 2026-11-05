/**
 * VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — shared helpers
 * for the events / meetups tests: expo-router stub, an in-memory Supabase
 * double with the query-builder methods the events lane calls (eq, in, gte,
 * gt, is, order, limit, insert, update, delete, rpc), fixture rows and a render
 * wrapper. Fakes only; no network (tests/helpers/no-network is imported first).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import '../helpers/no-network';
import '../helpers/mocks';
import { configure, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';

configure({ asyncUtilTimeout: 5000 });

export const VIEWER = 'u-viewer';
export const HOST = 'host-1';
export const FOLLOWED = 'host-follow';

const mockRouter = { navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: jest.fn(() => true) };
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  useGlobalSearchParams: () => mockParams.current,
  usePathname: () => '/comm/events-meetups',
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  Redirect: () => null,
  Link: ({ children }: { children: unknown }) => children,
}));

export { mockRouter, mockParams };

export type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;
export type RpcHandlers = Record<string, (args: any) => { data: any; error: { message: string } | null }>;
export type Write = { table: string; op: 'insert' | 'update' | 'delete'; values?: Row; filters: Array<[string, unknown]> };

const ok = (data: unknown) => ({ data, error: null });

/** A fixed event row; `overrides` replace any field. */
export function eventRow(id: string, overrides: Row = {}): any {
  const now = Date.now();
  return {
    id,
    slug: `slug-${id}`,
    title: `Event ${id}`,
    description: `About ${id}`,
    event_type: 'meetup',
    location: 'Berlin',
    virtual_link: null,
    start_time: new Date(now + 3 * 86_400_000).toISOString(),
    end_time: null,
    max_participants: 10,
    created_by: HOST,
    created_at: new Date(now - 3_600_000).toISOString(),
    updated_at: new Date(now - 3_600_000).toISOString(),
    metadata: {},
    image_url: null,
    ...overrides,
  };
}

/** A start time today, at 23:00 local time (always "today", also after midnight-free runs). */
export function todayAt23(): string {
  const d = new Date();
  d.setHours(23, 0, 0, 0);
  return d.toISOString();
}

/** A start time three days ahead (always after tomorrow). */
export function inThreeDays(): string {
  return new Date(Date.now() + 3 * 86_400_000).toISOString();
}

function matches(op: string, value: unknown, expected: unknown): boolean {
  if (op === 'eq' || op === 'is') return value === expected;
  if (op === 'in') return Array.isArray(expected) && expected.includes(value);
  if (op === 'gte') return String(value ?? '') >= String(expected);
  if (op === 'gt') return String(value ?? '') > String(expected);
  return true;
}

/**
 * An in-memory Supabase client: the auth surface of the shared double plus a
 * chainable `from()` that reads fixture tables and records every write.
 * `failOn[table]` makes reads of that table return the given error message.
 */
export function makeEventsDouble(opts: { tables?: Tables; rpc?: RpcHandlers; userId?: string | null; failOn?: Record<string, string> } = {}) {
  const tables = opts.tables ?? {};
  const failOn = opts.failOn ?? {};
  const base = createSupabaseDouble({
    session: opts.userId === null ? null : fakeSession(opts.userId ?? VIEWER),
    tables,
    rpc: opts.rpc,
  });
  const writes: Write[] = [];
  const reads: Array<{ table: string; filters: Array<[string, unknown, unknown]>; limit: number | null }> = [];

  const from = (table: string) => {
    const filters: Array<[string, string, unknown]> = [];
    const orders: Array<[string, boolean]> = [];
    let limitN: number | null = null;
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: any = null;

    const run = () => {
      if (op === 'select') {
        reads.push({ table, filters: [...filters], limit: limitN });
        if (failOn[table]) return { data: null, error: { message: failOn[table] } };
        let out = (tables[table] ?? []).filter((r) => filters.every(([o, c, v]) => matches(o, r[c], v)));
        for (const [c, asc] of [...orders].reverse()) {
          out = [...out].sort((a, b) => (String(a[c] ?? '') < String(b[c] ?? '') ? -1 : String(a[c] ?? '') > String(b[c] ?? '') ? 1 : 0) * (asc ? 1 : -1));
        }
        if (limitN !== null) out = out.slice(0, limitN);
        return ok(out);
      }
      writes.push({ table, op, values: payload ?? undefined, filters: filters.map(([, c, v]) => [c, v]) });
      if (op === 'insert') {
        const withId = (r: Row) => ({ id: `new-${writes.length}`, created_at: new Date().toISOString(), ...r });
        return ok(Array.isArray(payload) ? payload.map(withId) : withId(payload));
      }
      if (op === 'update') {
        const matched = (tables[table] ?? []).filter((r) => filters.every(([o, c, v]) => matches(o, r[c], v)));
        return ok(matched.map((r) => ({ ...r, ...payload })));
      }
      return ok(null);
    };

    const b: any = {
      select: () => b,
      eq: (c: string, v: unknown) => (filters.push(['eq', c, v]), b),
      in: (c: string, v: unknown[]) => (filters.push(['in', c, v]), b),
      gte: (c: string, v: unknown) => (filters.push(['gte', c, v]), b),
      gt: (c: string, v: unknown) => (filters.push(['gt', c, v]), b),
      is: (c: string, v: unknown) => (filters.push(['is', c, v]), b),
      order: (c: string, o?: { ascending?: boolean }) => (orders.push([c, o?.ascending !== false]), b),
      limit: (n: number) => ((limitN = n), b),
      insert: (v: unknown) => ((op = 'insert'), (payload = v), b),
      update: (v: unknown) => ((op = 'update'), (payload = v), b),
      delete: () => ((op = 'delete'), b),
      single: async () => {
        const r = run();
        const first = Array.isArray(r.data) ? r.data[0] : r.data;
        return first ? { data: first, error: null } : { data: null, error: r.error ?? { message: 'not found' } };
      },
      maybeSingle: async () => {
        const r = run();
        return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
      },
      then: (resolve: (r: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return b;
  };

  const client = base.client as any;
  client.from = jest.fn(from);
  return { client, writes, reads, rpc: client.rpc as jest.Mock };
}

/** Render a screen inside the lane's provider stack with the events double installed. */
export function renderWithEvents(ui: ReactElement, opts: { tables?: Tables; rpc?: RpcHandlers; userId?: string | null; failOn?: Record<string, string>; language?: string } = {}) {
  const dbl = makeEventsDouble(opts);
  const Wrapper = makeWrapper({ client: dbl.client, language: opts.language ?? 'de' });
  const utils = render(ui, { wrapper: Wrapper });
  return { ...utils, dbl };
}

/** Standard fixtures: three events (today, upcoming, followed host) plus follow and profile rows. */
export function standardTables(extra: Tables = {}): Tables {
  return {
    global_community_events: [
      eventRow('today-1', { start_time: todayAt23(), created_by: HOST }),
      eventRow('upcoming-1', { start_time: inThreeDays(), created_by: HOST }),
      eventRow('followed-1', { start_time: inThreeDays(), created_by: FOLLOWED, title: 'Followed meetup' }),
    ],
    global_event_participants: [
      { event_id: 'upcoming-1', status: 'attending', user_id: 'a' },
      { event_id: 'upcoming-1', status: 'attending', user_id: 'b' },
      { event_id: 'upcoming-1', status: 'invited', user_id: 'c' },
    ],
    event_co_creators: [],
    global_community_profiles: [
      { user_id: HOST, display_name: 'Host Person', avatar_url: null },
      { user_id: FOLLOWED, display_name: 'Followed Person', avatar_url: null },
    ],
    user_follows: [{ follower_id: VIEWER, following_id: FOLLOWED }],
    ...extra,
  };
}
