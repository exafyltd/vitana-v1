/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — the IO-free earnings aggregation of the
 * web `useUnifiedEarnings` and `useResellerSales` hooks (`src/hooks/useUnifiedEarnings.ts`,
 * `useResellerSales.ts`), as pure functions over already-fetched rows. The same sums, windows
 * (30 days) and fallbacks; no Supabase here, so the totals are testable from fixtures.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export interface WalletTxRow {
  id: string;
  transaction_type: string;
  amount: number | null;
  from_currency?: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface TicketPurchaseRow {
  total_amount: number | null;
  quantity: number | null;
  created_at: string;
}

export interface AttributionRow {
  event_id: string;
  sale_amount: number | string | null;
  commission_amount: number | string | null;
  commission_rate: number | string | null;
  created_at: string;
  ticket_purchase_id: string;
  payout_id: string | null;
}

export interface PayoutRow {
  id: string;
  status: string;
  total_commission_amount: number | string;
  paid_at: string | null;
  created_at: string;
}

export interface ResellerSalesSummary {
  totalTicketsSold: number;
  totalSaleAmount: number;
  totalCommissionEarned: number;
  ticketsSold30Days: number;
  saleAmount30Days: number;
  commission30Days: number;
  commissionPaidToWallet: number;
  commissionPendingPayout: number;
  lastPayout: { id: string; amount: number; status: string; paid_at: string | null; created_at: string } | null;
}

export const EMPTY_RESELLER_SALES: ResellerSalesSummary = {
  totalTicketsSold: 0,
  totalSaleAmount: 0,
  totalCommissionEarned: 0,
  ticketsSold30Days: 0,
  saleAmount30Days: 0,
  commission30Days: 0,
  commissionPaidToWallet: 0,
  commissionPendingPayout: 0,
  lastPayout: null,
};

export type EarningsTxType = 'reseller_commission' | 'ticket_sale' | 'direct_sale';

export interface EarningsTransaction {
  id: string;
  type: EarningsTxType;
  amount: number;
  currency: string;
  timestamp: string;
}

export interface UnifiedEarnings {
  totalEarnings: number;
  earnings30Days: number;
  pendingPayout: number;
  inWallet: number;
  recentTransactions: EarningsTransaction[];
}

export const EMPTY_EARNINGS: UnifiedEarnings = { totalEarnings: 0, earnings30Days: 0, pendingPayout: 0, inWallet: 0, recentTransactions: [] };

/** Gross, ticket count and last-30-days gross of confirmed purchases on the member's own events. */
export function summariseDirectSales(purchases: TicketPurchaseRow[], now: Date = new Date()): { gross: number; tickets: number; lastMonth: number } {
  const since = now.getTime() - 30 * DAY_MS;
  let gross = 0;
  let tickets = 0;
  let lastMonth = 0;
  for (const p of purchases) {
    gross += p.total_amount || 0;
    tickets += p.quantity || 0;
    if (new Date(p.created_at).getTime() >= since) lastMonth += p.total_amount || 0;
  }
  return { gross, tickets, lastMonth };
}

/** Reseller attributions + payouts → the commission summary (web `useResellerSales`). */
export function summariseResellerSales(
  attributions: AttributionRow[],
  payouts: PayoutRow[],
  quantityByPurchase: ReadonlyMap<string, number>,
  now: Date = new Date(),
): ResellerSalesSummary {
  const since = now.getTime() - 30 * DAY_MS;
  const paid = payouts.filter((p) => p.status === 'paid_to_wallet');
  const commissionPaidToWallet = paid.reduce((sum, p) => sum + Number(p.total_commission_amount), 0);
  const lastPaid = paid[0];
  const lastPayout = lastPaid
    ? { id: lastPaid.id, amount: Number(lastPaid.total_commission_amount), status: lastPaid.status, paid_at: lastPaid.paid_at, created_at: lastPaid.created_at }
    : null;

  let totalTicketsSold = 0;
  let totalSaleAmount = 0;
  let totalCommissionEarned = 0;
  let ticketsSold30Days = 0;
  let saleAmount30Days = 0;
  let commission30Days = 0;
  for (const a of attributions) {
    const quantity = quantityByPurchase.get(a.ticket_purchase_id) || 1;
    const sale = Number(a.sale_amount) || 0;
    const commission = Number(a.commission_amount) || 0;
    totalTicketsSold += quantity;
    totalSaleAmount += sale;
    totalCommissionEarned += commission;
    if (new Date(a.created_at).getTime() >= since) {
      ticketsSold30Days += quantity;
      saleAmount30Days += sale;
      commission30Days += commission;
    }
  }
  const commissionPendingPayout = attributions.filter((a) => !a.payout_id).reduce((sum, a) => sum + (Number(a.commission_amount) || 0), 0);
  return {
    totalTicketsSold,
    totalSaleAmount,
    totalCommissionEarned,
    ticketsSold30Days,
    saleAmount30Days,
    commission30Days,
    commissionPaidToWallet,
    commissionPendingPayout,
    lastPayout,
  };
}

/** Wallet rows → ledger transactions (web `recentTransactions` mapping). */
export function toLedgerTransactions(rows: WalletTxRow[]): EarningsTransaction[] {
  return rows.map((tx) => ({
    id: tx.id,
    type: tx.transaction_type as EarningsTxType,
    amount: tx.amount || 0,
    currency: tx.from_currency || 'EUR',
    timestamp: tx.created_at,
  }));
}

/** Web `useUnifiedEarnings` totals: wallet rows only feed the ledger; the KPI sums come from sales. */
export function computeUnifiedEarnings(input: {
  wallet: WalletTxRow[];
  direct: { gross: number; tickets: number; lastMonth: number };
  reseller: ResellerSalesSummary;
}): UnifiedEarnings {
  const { reseller, direct } = input;
  const resellerEarnings30Days = reseller.ticketsSold30Days
    ? (reseller.totalCommissionEarned / Math.max(1, reseller.totalTicketsSold)) * reseller.ticketsSold30Days
    : 0;
  return {
    totalEarnings: reseller.totalCommissionEarned + direct.gross,
    earnings30Days: resellerEarnings30Days + direct.lastMonth,
    pendingPayout: reseller.commissionPendingPayout,
    inWallet: reseller.commissionPaidToWallet,
    recentTransactions: toLedgerTransactions(input.wallet),
  };
}

export type LedgerFilter = 'all' | 'direct_sale' | 'reseller_commission';

/** Ledger filter chips: "direct sales" covers ticket sales too, like the web ledger. */
export function filterLedger(rows: EarningsTransaction[], filter: LedgerFilter): EarningsTransaction[] {
  if (filter === 'all') return rows;
  if (filter === 'reseller_commission') return rows.filter((r) => r.type === 'reseller_commission');
  return rows.filter((r) => r.type !== 'reseller_commission');
}

export function formatMoney(amount: number, locale: string, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** Web `getEventType`: a missing location or an online keyword means an online event. */
export function eventKind(location?: string | null): 'in-person' | 'online' {
  if (!location || location.trim() === '') return 'online';
  const lower = location.toLowerCase();
  return ['online', 'zoom', 'virtual', 'webinar', 'livestream', 'remote'].some((k) => lower.includes(k)) ? 'online' : 'in-person';
}

export type InventoryFilter = 'all' | 'high-commission' | 'ending-soon' | 'popular';

/** Web inventory chip rules (commission and days-until thresholds). */
export function matchesInventoryFilter(commissionRate: number, startIso: string, filter: InventoryFilter, now: Date = new Date()): boolean {
  const daysUntil = Math.floor((new Date(startIso).getTime() - now.getTime()) / DAY_MS);
  switch (filter) {
    case 'high-commission':
      return commissionRate >= 15;
    case 'ending-soon':
      return daysUntil <= 7;
    case 'popular':
      return commissionRate >= 10;
    default:
      return true;
  }
}
