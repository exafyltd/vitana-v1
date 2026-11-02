/**
 * VTID-05430 (Native Wave 2, public-profile lane) — an in-memory Supabase
 * client for the public profile reads. Auth comes from the shared double
 * (tests/helpers/supabase-double.ts); `rpc` and `from()` are replaced with a
 * builder that also supports `order` / `in` (the double has neither). Records
 * every call; never touches a network, never writes.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseDouble } from '../helpers/supabase-double';

type Result = { data: any; error: { message: string } | null };
type Row = Record<string, any>;

export type FakeOptions = {
  session?: any;
  rpc?: Record<string, (args: any) => Result>;
  tables?: Record<string, Row[]>;
  /** Tables whose reads fail. */
  failTables?: string[];
};

export function createProfileClient(opts: FakeOptions = {}) {
  const base = createSupabaseDouble({
    session: opts.session,
    tables: { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }] },
  });
  const calls: Array<{ fn: string; args: any[] }> = [];
  const tables = opts.tables ?? {};

  const rpc = jest.fn(async (name: string, args?: any): Promise<Result> => {
    calls.push({ fn: `rpc.${name}`, args: [args] });
    const h = opts.rpc?.[name];
    if (h) return h(args);
    if (name === 'get_role_preference') return { data: [{ role: 'community' }], error: null };
    if (name === 'get_my_permitted_roles') return { data: { ok: true, roles: ['community'] }, error: null };
    if (name === 'list_public_tenants') return { data: [], error: null };
    return { data: null, error: null };
  });

  function from(table: string) {
    const filters: Array<[string, string, any]> = [];
    const orders: Array<[string, boolean]> = [];
    const run = (): Result => {
      calls.push({ fn: `from.${table}.select`, args: [filters.map(([op, c, v]) => [op, c, v]), orders] });
      if (opts.failTables?.includes(table)) return { data: null, error: { message: `${table} failed` } };
      let out = (tables[table] ?? []).filter((r) =>
        filters.every(([op, c, v]) => (op === 'eq' ? r[c] === v : op === 'in' ? (v as any[]).includes(r[c]) : true)),
      );
      for (const [col, asc] of [...orders].reverse()) {
        out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
      }
      return { data: out, error: null };
    };
    const builder: any = {
      select: () => builder,
      eq: (c: string, v: any) => (filters.push(['eq', c, v]), builder),
      in: (c: string, v: any[]) => (filters.push(['in', c, v]), builder),
      order: (c: string, o?: { ascending?: boolean }) => (orders.push([c, o?.ascending !== false]), builder),
      limit: () => builder,
      single: async () => {
        const r = run();
        const first = Array.isArray(r.data) ? r.data[0] : r.data;
        return first ? { data: first, error: null } : { data: null, error: { message: 'not found' } };
      },
      maybeSingle: async () => {
        const r = run();
        return r.error ? r : { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: null };
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  return { client: { ...base.client, rpc, from: jest.fn(from) } as any, calls };
}
