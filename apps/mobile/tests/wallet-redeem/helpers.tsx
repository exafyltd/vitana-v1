/**
 * VTID-05423 (native-wave2-wallet-r2/wallet-redeem) — test harness for
 * `/redeem`. The Supabase client is the shell's in-memory double with a
 * `from()` that serves the two tables the redeem page reads (`vouchers`,
 * `voucher_orders`) and records every BUILT request — table, operation,
 * columns, update values, filters, terminal (`maybeSingle` / `single` /
 * awaited list) — so the tests assert the exact calls the web hook makes.
 * No network: the test files import `../helpers/no-network` first.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { configure } from '@testing-library/react-native';

// Screens load async (kit, catalogs, queries); give findBy/waitFor room on a loaded runner.
configure({ asyncUtilTimeout: 5000 });

export const USER = 'u-redeem';

export type Built = { table: string; op: 'select' | 'update'; columns?: string; values?: Record<string, any>; filters: Array<[string, any]>; terminal: 'maybeSingle' | 'single' | 'list' };

/** `FAIL` makes that read (or the claim) answer with a Supabase error. */
export const FAIL = Symbol('fail');

export type RedeemDb = {
  vouchers?: any[];
  orders?: any[];
  /** The code-column lookup answers an error (the web then tries the id-prefix fallback). */
  codeLookup?: typeof FAIL;
  /** The fallback list answers an error. */
  list?: typeof FAIL;
  /** The claim update answers an error, or never settles (`'pending'`). */
  claim?: typeof FAIL | 'pending';
};

export function redeemSupabase(db: RedeemDb, signedIn: boolean) {
  const double = createSupabaseDouble({ session: signedIn ? fakeSession(USER) : null });
  const built: Built[] = [];
  const vouchers = db.vouchers ?? [];
  const orders = db.orders ?? [];

  double.client.from = jest.fn((table: string) => {
    const req: Built = { table, op: 'select', filters: [], terminal: 'list' };
    const match = (rows: any[]) => rows.filter((r) => req.filters.every(([c, v]) => r[c] === v));
    const answer = (): { data: any; error: any } => {
      built.push(req);
      if (req.op === 'update') {
        if (db.claim === FAIL) return { data: null, error: { message: 'update failed' } };
        const hit = match(vouchers)[0];
        return hit ? { data: { ...hit, ...req.values }, error: null } : { data: null, error: { message: 'no rows' } };
      }
      const rows = table === 'vouchers' ? vouchers : table === 'voucher_orders' ? orders : [];
      if (table === 'vouchers' && req.terminal === 'maybeSingle' && db.codeLookup === FAIL) return { data: null, error: { message: 'column code does not exist' } };
      if (table === 'vouchers' && req.terminal === 'list' && db.list === FAIL) return { data: null, error: { message: 'boom' } };
      const m = match(rows);
      return { data: req.terminal === 'list' ? m : (m[0] ?? null), error: null };
    };
    const b: any = {
      select: (columns?: string) => {
        if (req.op === 'select') req.columns = columns;
        return b;
      },
      update: (values: Record<string, any>) => ((req.op = 'update'), (req.values = values), b),
      eq: (c: string, v: any) => (req.filters.push([c, v]), b),
      maybeSingle: async () => ((req.terminal = 'maybeSingle'), answer()),
      single: () => {
        req.terminal = 'single';
        if (req.op === 'update' && db.claim === 'pending') {
          built.push(req);
          return new Promise(() => undefined);
        }
        return Promise.resolve(answer());
      },
      then: (res: (r: any) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(answer()).then(res, rej),
    };
    return b;
  });
  return { client: double.client, built };
}

/** Provider wrapper with the redeem Supabase fake installed; signed out unless `signedIn`. */
export function redeemWrapper(db: RedeemDb, opts: { signedIn?: boolean; language?: string } = {}) {
  const sb = redeemSupabase(db, !!opts.signedIn);
  const wrapper = makeWrapper({ client: sb.client, language: opts.language ?? 'en-US' });
  return { wrapper, built: sb.built };
}

// ── fixtures ─────────────────────────────────────────────────────────────
export const VOUCHER_ID = 'abcd1234-0000-4000-8000-000000000001';

export const voucher = (over: Record<string, unknown> = {}) => ({
  id: VOUCHER_ID,
  code: 'GIFT-2026',
  tier: 'experience',
  status: 'active',
  expires_at: null,
  redeemed_at: null,
  redeemed_by_user_id: null,
  ...over,
});

export const order = (over: Record<string, unknown> = {}) => ({
  id: 'o-1',
  voucher_id: VOUCHER_ID,
  buyer_name: 'Jane',
  buyer_email: 'jane@example.org',
  amount_cents: 4900,
  currency: 'eur',
  created_at: '2026-10-01T10:00:00.000Z',
  ...over,
});
