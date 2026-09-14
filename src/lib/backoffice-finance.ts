/**
 * VTID-03856 — Finance & Treasury Read screens: ERPClaw payment / FX shapes
 * (captured from a real ERPClaw-on-Postgres instance, docs/validation/VTID-03856/
 * outputs/erpclaw-shapes/) and the pure helpers the screens share.
 */
import { num } from "@/lib/backoffice-sales";

export interface ErpPaymentRow {
  id: string; naming_series: string | null; payment_type: "receive" | "pay" | string; posting_date: string;
  party_type: string | null; party_id: string | null; party_name?: string | null; paid_amount: string | number;
  status: string; unallocated_amount: string | number | null;
}
export interface ErpPaymentAllocation { voucher_type?: string; voucher_id?: string; allocated_amount?: string | number; [k: string]: unknown }
export interface ErpPaymentDetail extends Omit<ErpPaymentRow, "party_name"> {
  paid_from_account: string | null; paid_to_account: string | null; received_amount: string | number | null;
  payment_currency: string | null; exchange_rate: string | number | null; reference_number: string | null; reference_date: string | null;
  allocations?: ErpPaymentAllocation[]; deductions?: unknown[];
}
export interface ErpPaymentSummary { total_received?: string | number; total_paid?: string | number; by_party_type?: Array<{ party_type: string; count: number; amount: string | number }> }
export interface ErpCurrency { code: string; name: string | null; symbol: string | null; decimal_places: number | null; enabled: number | boolean | null }
export interface ErpExchangeRate { id: string; from_currency: string; to_currency: string; rate: string | number; effective_date: string; source: string | null; updated_at?: string }

export interface ReconciliationBuckets {
  /** submitted receipts/payments whose money is not yet matched to a document */
  unallocated: ErpPaymentRow[];
  /** entered but never submitted — nothing hit the bank ledger yet */
  drafts: ErpPaymentRow[];
  /** submitted and fully allocated */
  settled: ErpPaymentRow[];
  totals: { unallocatedIn: number; unallocatedOut: number; draftIn: number; draftOut: number };
}

/**
 * What a reconciler needs to see before matching anything (the matching itself —
 * `finance.bank.reconcile` — is Commit and not part of a Read slice).
 */
export function reconciliationBuckets(payments: ErpPaymentRow[]): ReconciliationBuckets {
  const b: ReconciliationBuckets = { unallocated: [], drafts: [], settled: [], totals: { unallocatedIn: 0, unallocatedOut: 0, draftIn: 0, draftOut: 0 } };
  for (const p of payments) {
    const status = String(p.status ?? "").toLowerCase();
    const inbound = p.payment_type === "receive";
    if (status === "cancelled") continue;
    if (status === "draft") {
      b.drafts.push(p);
      if (inbound) b.totals.draftIn += num(p.paid_amount); else b.totals.draftOut += num(p.paid_amount);
      continue;
    }
    if (num(p.unallocated_amount) > 0) {
      b.unallocated.push(p);
      if (inbound) b.totals.unallocatedIn += num(p.unallocated_amount); else b.totals.unallocatedOut += num(p.unallocated_amount);
    } else {
      b.settled.push(p);
    }
  }
  return b;
}

/** Calendar year-to-date window for `payment-summary` (`--from-date`/`--to-date` are required by ERPClaw). */
export function yearToDateWindow(today: Date = new Date()): { from_date: string; to_date: string } {
  const y = today.getFullYear();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { from_date: `${y}-01-01`, to_date: `${y}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}` };
}

export function isEnabledCurrency(c: ErpCurrency): boolean {
  return c.enabled === 1 || c.enabled === true;
}
