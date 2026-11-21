/**
 * VTID-05645 — the IO-free earnings aggregation (web `useUnifiedEarnings` / `useResellerSales`) over
 * fixtures: sums, the 30-day window, pending vs paid commission, the ledger mapping and filters,
 * and the inventory-chip and event-kind rules.
 */
import {
  computeUnifiedEarnings,
  EMPTY_RESELLER_SALES,
  eventKind,
  filterLedger,
  formatMoney,
  matchesInventoryFilter,
  summariseDirectSales,
  summariseResellerSales,
  toLedgerTransactions,
} from '../../src/screens/business/earnings';

const NOW = new Date('2026-06-30T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe('summariseDirectSales', () => {
  it('sums gross and tickets, and the last 30 days only', () => {
    const out = summariseDirectSales(
      [
        { total_amount: 100, quantity: 2, created_at: daysAgo(5) },
        { total_amount: 50, quantity: 1, created_at: daysAgo(45) },
        { total_amount: null, quantity: null, created_at: daysAgo(1) },
      ],
      NOW,
    );
    expect(out).toEqual({ gross: 150, tickets: 3, lastMonth: 100 });
  });
});

describe('summariseResellerSales', () => {
  const attributions = [
    { event_id: 'e1', sale_amount: '100', commission_amount: '10', commission_rate: '10', created_at: daysAgo(3), ticket_purchase_id: 'p1', payout_id: null },
    { event_id: 'e1', sale_amount: 200, commission_amount: 20, commission_rate: 10, created_at: daysAgo(60), ticket_purchase_id: 'p2', payout_id: 'po1' },
  ];
  const payouts = [
    { id: 'po1', status: 'paid_to_wallet', total_commission_amount: '20', paid_at: daysAgo(50), created_at: daysAgo(55) },
    { id: 'po0', status: 'pending', total_commission_amount: 5, paid_at: null, created_at: daysAgo(70) },
  ];

  it('totals, 30-day window, pending (no payout) and paid-to-wallet commission', () => {
    const out = summariseResellerSales(attributions, payouts, new Map([['p1', 3]]), NOW);
    expect(out).toMatchObject({
      totalTicketsSold: 4, // p1 quantity 3, p2 defaults to 1
      totalSaleAmount: 300,
      totalCommissionEarned: 30,
      ticketsSold30Days: 3,
      saleAmount30Days: 100,
      commission30Days: 10,
      commissionPendingPayout: 10,
      commissionPaidToWallet: 20,
    });
    expect(out.lastPayout).toMatchObject({ id: 'po1', amount: 20, status: 'paid_to_wallet' });
  });

  it('with no attributions it still reports paid payouts', () => {
    const out = summariseResellerSales([], payouts, new Map(), NOW);
    expect(out).toMatchObject({ totalCommissionEarned: 0, commissionPaidToWallet: 20, commissionPendingPayout: 0 });
  });
});

describe('computeUnifiedEarnings', () => {
  it('adds reseller commission to direct gross; the 30-day reseller share is pro-rated per ticket', () => {
    const reseller = { ...EMPTY_RESELLER_SALES, totalCommissionEarned: 40, totalTicketsSold: 4, ticketsSold30Days: 2, commissionPendingPayout: 15, commissionPaidToWallet: 25 };
    const out = computeUnifiedEarnings({
      wallet: [{ id: 'w1', transaction_type: 'ticket_sale', amount: 12, created_at: daysAgo(2) }],
      direct: { gross: 100, tickets: 5, lastMonth: 60 },
      reseller,
    });
    expect(out.totalEarnings).toBe(140);
    expect(out.earnings30Days).toBe(20 + 60);
    expect(out.pendingPayout).toBe(15);
    expect(out.inWallet).toBe(25);
    expect(out.recentTransactions).toEqual([{ id: 'w1', type: 'ticket_sale', amount: 12, currency: 'EUR', timestamp: daysAgo(2) }]);
  });

  it('is all zero without any source', () => {
    const out = computeUnifiedEarnings({ wallet: [], direct: { gross: 0, tickets: 0, lastMonth: 0 }, reseller: EMPTY_RESELLER_SALES });
    expect(out).toEqual({ totalEarnings: 0, earnings30Days: 0, pendingPayout: 0, inWallet: 0, recentTransactions: [] });
  });
});

describe('ledger', () => {
  const rows = toLedgerTransactions([
    { id: 'a', transaction_type: 'reseller_commission', amount: 5, from_currency: 'USD', created_at: daysAgo(1) },
    { id: 'b', transaction_type: 'ticket_sale', amount: 7, created_at: daysAgo(2) },
    { id: 'c', transaction_type: 'purchase', amount: 9, created_at: daysAgo(3) },
  ]);

  it('maps currency with an EUR default', () => {
    expect(rows.map((r) => r.currency)).toEqual(['USD', 'EUR', 'EUR']);
  });

  it('filters: reseller only, and direct = everything that is not a reseller commission', () => {
    expect(filterLedger(rows, 'all')).toHaveLength(3);
    expect(filterLedger(rows, 'reseller_commission').map((r) => r.id)).toEqual(['a']);
    expect(filterLedger(rows, 'direct_sale').map((r) => r.id)).toEqual(['b', 'c']);
  });
});

describe('inventory rules', () => {
  it('eventKind: no location or an online keyword means online', () => {
    expect(eventKind(null)).toBe('online');
    expect(eventKind('  ')).toBe('online');
    expect(eventKind('Zoom call')).toBe('online');
    expect(eventKind('Berlin, Café Mitte')).toBe('in-person');
  });

  it('chip thresholds: high >= 15, popular >= 10, ending soon <= 7 days', () => {
    const soon = new Date(NOW.getTime() + 3 * 86_400_000).toISOString();
    const later = new Date(NOW.getTime() + 30 * 86_400_000).toISOString();
    expect(matchesInventoryFilter(15, later, 'high-commission', NOW)).toBe(true);
    expect(matchesInventoryFilter(14, later, 'high-commission', NOW)).toBe(false);
    expect(matchesInventoryFilter(10, later, 'popular', NOW)).toBe(true);
    expect(matchesInventoryFilter(9, later, 'popular', NOW)).toBe(false);
    expect(matchesInventoryFilter(0, soon, 'ending-soon', NOW)).toBe(true);
    expect(matchesInventoryFilter(0, later, 'ending-soon', NOW)).toBe(false);
    expect(matchesInventoryFilter(0, later, 'all', NOW)).toBe(true);
  });
});

describe('formatMoney', () => {
  it('formats in the given locale and currency', () => {
    expect(formatMoney(1234, 'en', 'EUR')).toContain('1,234');
    expect(formatMoney(1234, 'de', 'EUR')).toContain('1.234');
  });
});
