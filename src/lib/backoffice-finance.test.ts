/** VTID-03856 — pure helpers behind the Finance & Treasury Read screens. */
import { describe, it, expect } from 'vitest';
import { reconciliationBuckets, yearToDateWindow, isEnabledCurrency, type ErpPaymentRow } from '@/lib/backoffice-finance';

const row = (id: string, type: string, status: string, paid: string, unallocated: string | null): ErpPaymentRow =>
  ({ id, naming_series: id, payment_type: type, posting_date: '2026-09-12', party_type: 'customer', party_id: 'c', party_name: 'Acme', paid_amount: paid, status, unallocated_amount: unallocated });

describe('reconciliationBuckets', () => {
  it('splits drafts, unallocated and settled, skips cancelled, and nets totals by direction', () => {
    const b = reconciliationBuckets([
      row('p1', 'receive', 'submitted', '5000.00', '5000.00'),
      row('p2', 'receive', 'draft', '1250.50', '1250.50'),
      row('p3', 'pay', 'submitted', '800.00', '300.00'),
      row('p4', 'receive', 'submitted', '100.00', '0.00'),
      row('p5', 'pay', 'cancelled', '999.00', '999.00'),
    ]);
    expect(b.unallocated.map((p) => p.id)).toEqual(['p1', 'p3']);
    expect(b.drafts.map((p) => p.id)).toEqual(['p2']);
    expect(b.settled.map((p) => p.id)).toEqual(['p4']);
    expect(b.totals).toEqual({ unallocatedIn: 5000, unallocatedOut: 300, draftIn: 1250.5, draftOut: 0 });
  });
  it('handles an empty list', () => {
    expect(reconciliationBuckets([])).toEqual({ unallocated: [], drafts: [], settled: [], totals: { unallocatedIn: 0, unallocatedOut: 0, draftIn: 0, draftOut: 0 } });
  });
});

describe('yearToDateWindow / isEnabledCurrency', () => {
  it('spans Jan 1 to today in ISO dates ERPClaw accepts', () => {
    expect(yearToDateWindow(new Date(2026, 8, 13))).toEqual({ from_date: '2026-01-01', to_date: '2026-09-13' });
    expect(yearToDateWindow(new Date(2026, 0, 5))).toEqual({ from_date: '2026-01-01', to_date: '2026-01-05' });
  });
  it('reads ERPClaw integer booleans', () => {
    expect(isEnabledCurrency({ code: 'AED', name: null, symbol: null, decimal_places: 2, enabled: 1 })).toBe(true);
    expect(isEnabledCurrency({ code: 'USD', name: null, symbol: null, decimal_places: 2, enabled: 0 })).toBe(false);
  });
});
