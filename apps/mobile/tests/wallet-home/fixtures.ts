/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — fixtures and the fake wallet
 * client. The client is the shell's in-memory Supabase double
 * (tests/helpers/supabase-double.ts) with the two wallet reads the native
 * `useWallet` twin makes (`user_wallets`, `wallet_transactions` with
 * `.or().order().limit()`), answered from memory. No network; every call is
 * recorded so a test can assert that no RPC and no write ever ran.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import type { UserBalance, WalletTransaction } from '../../src/screens/wallet-home/data/wallet';
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

export type WalletFixture = { balances?: UserBalance[]; transactions?: WalletTransaction[]; failBalances?: boolean; failTransactions?: boolean };

export function walletClient(fx: WalletFixture = {}) {
  const double = createSupabaseDouble({
    session: fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } }),
    tables: { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }], profiles: [{ user_id: 'u-1', display_name: 'Ana', handle: null }] },
  });
  const reads: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  const baseFrom = double.client.from;
  double.client.from = jest.fn((table: string) => {
    if (table !== 'user_wallets' && table !== 'wallet_transactions') return baseFrom(table);
    const filters: Array<[string, unknown]> = [];
    const result = () => {
      reads.push({ table, filters });
      if (table === 'user_wallets') {
        if (fx.failBalances) return { data: null, error: { message: 'permission denied for table user_wallets' } };
        return { data: fx.balances ?? balances, error: null };
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
  return { ...double, client: double.client, reads };
}
