/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — fixtures and the fake wallet
 * client. The client is the shell's in-memory Supabase double
 * (tests/helpers/supabase-double.ts) with the two wallet reads the native
 * `useWallet` twin makes (`user_wallets`, `wallet_transactions` with
 * `.or().order().limit()`), answered from memory, plus the flows' writes
 * (the wallet RPCs, the `messages` / `user_activity_log` inserts) and the
 * recipient search (`global_community_profiles`), recorded and answered from
 * memory. `walletGateway` is the fake gateway wallet rail (Stripe deposits).
 * No network; nothing reaches a live system or Stripe.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import type { UserBalance, WalletTransaction } from '../../src/screens/wallet-home/data/wallet';
import type { WalletActions } from '../../src/screens/wallet-home/data/actions';
import { configure } from '@testing-library/react-native';

// Screens load async (kit, catalogs, queries); give findBy/waitFor room on a loaded runner.
configure({ asyncUtilTimeout: 5000 });

export const balances: UserBalance[] = [
  { currency_type: 'USD', balance: 120.5, updated_at: '2026-10-30T10:00:00.000Z' },
  { currency_type: 'CREDITS', balance: 2450, updated_at: '2026-10-30T10:00:00.000Z' },
  { currency_type: 'VTNA', balance: 80, updated_at: '2026-10-30T10:00:00.000Z' },
];

export const transactions: WalletTransaction[] = [
  { id: 'tx-1', transaction_type: 'reward', amount: 25, from_currency: 'CREDITS', to_currency: 'CREDITS', fees: 0, status: 'completed', created_at: '2026-10-29T09:00:00.000Z', updated_at: '2026-10-29T09:00:00.000Z', to_user_id: 'u-1' },
  { id: 'tx-2', transaction_type: 'transfer', amount: -10, from_currency: 'USD', fees: 0, status: 'pending', created_at: '2026-10-28T09:00:00.000Z', updated_at: '2026-10-28T09:00:00.000Z', from_user_id: 'u-1' },
  { id: 'tx-3', transaction_type: 'reseller_commission', amount: 12, to_currency: 'USD', fees: 0, status: 'completed', created_at: '2026-10-27T09:00:00.000Z', updated_at: '2026-10-27T09:00:00.000Z', to_user_id: 'u-1' },
];

export type WalletFixture = {
  balances?: UserBalance[];
  transactions?: WalletTransaction[];
  failBalances?: boolean;
  failTransactions?: boolean;
  /** Fails the named RPC with a permission error. */
  failRpc?: string;
  members?: Array<{ user_id: string; display_name: string | null; avatar_url: string | null; is_visible: boolean }>;
};

export const members = [
  { user_id: 'u-1', display_name: 'Ana', avatar_url: null, is_visible: true },
  { user_id: 'u-2', display_name: 'Bojan', avatar_url: null, is_visible: true },
  { user_id: 'u-3', display_name: 'Bora', avatar_url: null, is_visible: false },
];

const rpcRow = { transaction_id: 'wtx-1', from_balance: 10, to_balance: 500 };

export function walletClient(fx: WalletFixture = {}) {
  const double = createSupabaseDouble({
    session: fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } }),
    tables: { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }], profiles: [{ user_id: 'u-1', display_name: 'Ana', handle: null }] },
    rpc: Object.fromEntries(
      ['update_user_balance', 'process_wallet_exchange', 'process_wallet_transfer'].map((name) => [
        name,
        () => (fx.failRpc === name ? { data: null, error: { message: 'permission denied' } } : { data: name === 'update_user_balance' ? 10 : [rpcRow], error: null }),
      ]),
    ),
  });
  /** The rows the wallet reads answer; a test may replace them (e.g. after a deposit). */
  const state = { balances: fx.balances ?? balances };
  const inserts: Array<{ table: string; values: unknown }> = [];
  const searches: Array<Array<[string, unknown]>> = [];
  const reads: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  const baseFrom = double.client.from;
  double.client.from = jest.fn((table: string) => {
    if (table === 'messages' || table === 'user_activity_log') {
      const done = { data: { id: 'row-1' }, error: null };
      return {
        insert: (values: unknown) => {
          inserts.push({ table, values });
          const chain: any = { select: () => chain, single: async () => done, then: (resolve: (r: unknown) => unknown) => Promise.resolve(done).then(resolve) };
          return chain;
        },
      };
    }
    if (table === 'global_community_profiles') {
      const filters: Array<[string, unknown]> = [];
      const b: any = {
        select: (cols: string) => (filters.push(['select', cols]), b),
        eq: (c: string, v: unknown) => (filters.push([`eq:${c}`, v]), b),
        ilike: (c: string, v: unknown) => (filters.push([`ilike:${c}`, v]), b),
        order: (c: string, o: unknown) => (filters.push([`order:${c}`, o]), b),
        limit: (n: number) => (filters.push(['limit', n]), b),
        then: (resolve: (r: unknown) => unknown) => {
          searches.push(filters);
          const like = filters.find(([k]) => k === 'ilike:display_name')?.[1] as string | undefined;
          const term = like ? like.replace(/%/g, '').toLowerCase() : '';
          const rows = (fx.members ?? members).filter((m) => m.is_visible && (!term || String(m.display_name).toLowerCase().includes(term)));
          return Promise.resolve({ data: rows.map(({ is_visible: _v, ...r }) => r), error: null }).then(resolve);
        },
      };
      return b;
    }
    if (table !== 'user_wallets' && table !== 'wallet_transactions') return baseFrom(table);
    const filters: Array<[string, unknown]> = [];
    const result = () => {
      reads.push({ table, filters });
      if (table === 'user_wallets') {
        if (fx.failBalances) return { data: null, error: { message: 'permission denied for table user_wallets' } };
        return { data: state.balances, error: null };
      }
      if (fx.failTransactions) return { data: null, error: { message: 'permission denied for table wallet_transactions' } };
      return { data: fx.transactions ?? transactions, error: null };
    };
    const b: any = {
      select: (cols: string) => (filters.push(['select', cols]), b),
      eq: (c: string, v: unknown) => (filters.push([`eq:${c}`, v]), b),
      or: (expr: string) => (filters.push(['or', expr]), b),
      order: (c: string, o: unknown) => (filters.push([`order:${c}`, o]), b),
      limit: (n: number) => (filters.push(['limit', n]), b),
      then: (resolve: (r: unknown) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject),
    };
    return b;
  });
  const rpcs = () => double.calls.filter((c) => c.fn.startsWith('rpc.') && c.fn !== 'rpc.list_public_tenants').map((c) => ({ fn: c.fn.slice(4), args: c.args[0] }));
  return { ...double, client: double.client, reads, state, inserts, searches, rpcs };
}

export type GatewayCall = { method: string; path: string; headers: Record<string, string>; body: unknown };

/**
 * The fake gateway wallet rail: `POST /wallet/deposits/create` answers a
 * deposit with a placeholder checkout URL, `GET /wallet/deposits/:id` answers
 * the next status of `statuses` (the last one repeats). Every call recorded.
 */
export function walletGateway(opts: { statuses?: string[]; createStatus?: number; createBody?: unknown } = {}) {
  const calls: GatewayCall[] = [];
  const statuses = [...(opts.statuses ?? ['succeeded'])];
  const answer = (status: number, body: unknown) =>
    ({ ok: status >= 200 && status < 300, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) }) as unknown as Response;
  const fetch = async (path: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {};
    new Headers(init?.headers ?? undefined).forEach((v, k) => (headers[k] = v));
    calls.push({ method, path, headers, body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body });
    if (method === 'POST' && path === '/wallet/deposits/create') {
      return answer(opts.createStatus ?? 200, opts.createBody ?? { ok: true, deposit_id: 'dep_1', checkout_url: 'https://checkout.example.invalid/dep_1', expires_at: '2026-11-02T12:00:00.000Z' });
    }
    const m = /^\/wallet\/deposits\/([^/]+)$/.exec(path);
    if (method === 'GET' && m) {
      const status = statuses.length > 1 ? statuses.shift()! : statuses[0];
      return answer(200, { ok: true, deposit: { id: decodeURIComponent(m[1]), amount_minor: 5435, currency: 'USD', status, failure_reason: null, created_at: 'x', updated_at: 'x' } });
    }
    return answer(404, { ok: false, error: 'not_found' });
  };
  return { fetch, calls };
}

/** Fake `WalletActions`: every call is a jest.fn; `wait` resolves at once. */
export function fakeWalletActions(overrides: Partial<WalletActions> = {}): { [K in keyof WalletActions]: jest.Mock } {
  return {
    createDeposit: jest.fn(async () => ({ ok: true, deposit_id: 'dep_1', checkout_url: 'https://checkout.example.invalid/dep_1', expires_at: 'x' })),
    getDeposit: jest.fn(async (id: string) => ({ ok: true, deposit: { id, amount_minor: 1, currency: 'USD', status: 'succeeded', failure_reason: null, created_at: 'x', updated_at: 'x' } })),
    openCheckout: jest.fn(async () => ({ closed: true })),
    updateBalance: jest.fn(async () => 10),
    exchangeCurrency: jest.fn(async () => ({ id: 'wtx-1', from_balance: 10, to_balance: 500 })),
    transferFunds: jest.fn(async () => ({ id: 'wtx-1', fromBalance: 10, toBalance: 0 })),
    sendMessage: jest.fn(async () => undefined),
    logActivity: jest.fn(async () => undefined),
    searchMembers: jest.fn(async () => []),
    wait: jest.fn(async () => undefined),
    ...overrides,
  } as never;
}
