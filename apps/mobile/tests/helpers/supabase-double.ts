/**
 * VTID-05186 — an in-memory double of the supabase-js surface the shell uses
 * (auth, rpc, from().select/update). Records every call; never touches a network.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Result = { data: any; error: { message: string } | null };
type Row = Record<string, any>;

export type DoubleOptions = {
  session?: any;
  rpc?: Record<string, (args: any) => Result | Promise<Result>>;
  tables?: Record<string, Row[]>;
  auth?: Partial<Record<string, (...args: any[]) => any>>;
};

export function fakeSession(userId = 'u-1', extra: Partial<any> = {}) {
  return {
    access_token: `token-${userId}`,
    refresh_token: 'r',
    user: { id: userId, app_metadata: {}, user_metadata: {}, ...extra.user },
    ...extra,
  };
}

export function createSupabaseDouble(opts: DoubleOptions = {}) {
  let session = opts.session ?? null;
  const calls: Array<{ fn: string; args: any[] }> = [];
  const writes: Array<{ table: string; values: Row; filters: Array<[string, any]> }> = [];
  const listeners = new Set<(event: string, s: any) => void>();
  const tables = opts.tables ?? {};
  const record = (fn: string, args: any[]) => calls.push({ fn, args });
  const ok = (data: any = null): Result => ({ data, error: null });

  const authFn = (name: string, fallback: (...a: any[]) => any) =>
    jest.fn(async (...args: any[]) => {
      record(`auth.${name}`, args);
      return (opts.auth?.[name] ?? fallback)(...args);
    });

  const auth = {
    getSession: authFn('getSession', () => ok({ session })),
    onAuthStateChange: jest.fn((cb: (event: string, s: any) => void) => {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    }),
    signInWithPassword: authFn('signInWithPassword', () => ok({})),
    signUp: authFn('signUp', () => ok({})),
    resetPasswordForEmail: authFn('resetPasswordForEmail', () => ok({})),
    signInWithIdToken: authFn('signInWithIdToken', () => ok({})),
    signInWithOAuth: authFn('signInWithOAuth', () => ok({ url: 'https://g1-auth.example.org/authorize' })),
    exchangeCodeForSession: authFn('exchangeCodeForSession', () => ok({})),
    updateUser: authFn('updateUser', () => ok({})),
    refreshSession: authFn('refreshSession', () => ok({ session })),
    signOut: authFn('signOut', () => {
      session = null;
      listeners.forEach((l) => l('SIGNED_OUT', null));
      return { error: null };
    }),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  };

  const rpc = jest.fn(async (name: string, args?: any) => {
    record(`rpc.${name}`, [args]);
    const h = opts.rpc?.[name];
    if (h) return h(args);
    // The tenant registry (VTID-05151) lists the double's tenants by default.
    if (name === 'list_public_tenants') return ok((tables.tenants ?? []).map((t) => ({ display_name: t.name, open_signup: true, ...t })));
    return ok(null);
  });

  function from(table: string) {
    const filters: Array<[string, string, any]> = [];
    let limitN: number | null = null;
    let updateValues: Row | null = null;
    const rows = () => {
      let out = (tables[table] ?? []).filter((r) => filters.every(([op, c, v]) => (op === 'eq' ? r[c] === v : op === 'ilike' ? String(r[c] ?? '').toLowerCase().includes(String(v).replace(/%/g, '').toLowerCase()) : true)));
      if (limitN !== null) out = out.slice(0, limitN);
      return out;
    };
    const run = (): Result => {
      if (updateValues) {
        writes.push({ table, values: updateValues, filters: filters.map(([, c, v]) => [c, v]) });
        record(`from.${table}.update`, [updateValues, filters]);
        return ok(null);
      }
      record(`from.${table}.select`, [filters]);
      return ok(rows());
    };
    const builder: any = {
      select: () => builder,
      eq: (c: string, v: any) => (filters.push(['eq', c, v]), builder),
      ilike: (c: string, v: any) => (filters.push(['ilike', c, v]), builder),
      limit: (n: number) => ((limitN = n), builder),
      update: (values: Row) => ((updateValues = values), builder),
      single: async () => {
        const r = run();
        const first = Array.isArray(r.data) ? r.data[0] : r.data;
        return first ? ok(first) : { data: null, error: { message: 'not found' } };
      },
      maybeSingle: async () => {
        const r = run();
        return ok(Array.isArray(r.data) ? (r.data[0] ?? null) : r.data);
      },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  return {
    client: { auth, rpc, from: jest.fn(from) } as any,
    calls,
    writes,
    get session() {
      return session;
    },
    emit(event: string, s: any) {
      session = s;
      listeners.forEach((l) => l(event, s));
    },
  };
}
