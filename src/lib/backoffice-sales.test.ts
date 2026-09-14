/** VTID-03855 — pure helpers behind the Sales & CRM Read screens. */
import { describe, it, expect } from 'vitest';
import { formatMoney, groupOpportunitiesByStage, isOverdue, isTaskOverdue, num, statusVariant, fullTextMatch, type ErpOpportunity } from '@/lib/backoffice-sales';

const today = new Date('2026-09-13T12:00:00Z');

describe('num / formatMoney', () => {
  it('reads ERPClaw decimal strings and defaults to AED', () => {
    expect(num('42000.00')).toBe(42000);
    expect(num(null)).toBe(0);
    expect(num('abc')).toBe(0);
    expect(formatMoney('7000.00').replace(/[\u00a0\u202f]/g, ' ')).toMatch(/AED|\u062f\.\u0625/);
    expect(formatMoney('7000.00', 'USD').replace(/[\u00a0\u202f]/g, ' ')).toMatch(/\$|USD/);
  });
});

describe('isOverdue', () => {
  it('is overdue only when due date passed, money is outstanding, and the document is live', () => {
    expect(isOverdue({ due_date: '2026-07-31', outstanding_amount: '1750.00', status: 'unpaid' }, today)).toBe(true);
    expect(isOverdue({ due_date: '2026-09-30', outstanding_amount: '7000.00', status: 'unpaid' }, today)).toBe(false);
    expect(isOverdue({ due_date: '2026-07-31', outstanding_amount: '0', status: 'paid' }, today)).toBe(false);
    expect(isOverdue({ due_date: '2026-07-31', outstanding_amount: '1750.00', status: 'draft' }, today)).toBe(false);
    expect(isOverdue({ due_date: '2026-07-31', outstanding_amount: '1750.00', status: 'cancelled' }, today)).toBe(false);
    expect(isOverdue({ due_date: null, outstanding_amount: '1750.00', status: 'unpaid' }, today)).toBe(false);
  });
  it('task overdue only while open', () => {
    expect(isTaskOverdue({ due_date: '2026-09-08', status: 'open' }, today)).toBe(true);
    expect(isTaskOverdue({ due_date: '2026-09-08', status: 'completed' }, today)).toBe(false);
    expect(isTaskOverdue({ due_date: '2026-09-20', status: 'open' }, today)).toBe(false);
  });
});

describe('groupOpportunitiesByStage', () => {
  const opp = (id: string, stage: string | null, expected: string, weighted: string): ErpOpportunity => ({
    id, naming_series: null, opportunity_name: id, lead_id: null, customer_id: null, opportunity_type: 'sales', source: null, expected_closing_date: null,
    probability: '50', expected_revenue: expected, weighted_revenue: weighted, stage, lost_reason: null, assigned_to: null, next_follow_up_date: null,
    quotation_id: null, crm_contact_id: null, crm_company_id: null, pipeline_stage_id: null, created_at: '', updated_at: '',
  });
  it('keeps the report stage order, uses report totals, and appends unknown stages with computed totals', () => {
    const report = { pipeline: { stages: [
      { pipeline: 'P', stage: 'Qualified', count: 0, total_expected_revenue: '0', total_weighted_revenue: '0' },
      { pipeline: 'P', stage: 'Proposal', count: 1, total_expected_revenue: '42000.00', total_weighted_revenue: '21000.00' },
    ] } };
    const cols = groupOpportunitiesByStage(report, [opp('a', 'Proposal', '42000', '21000'), opp('b', null, '1000', '500'), opp('c', 'Negotiation', '3000', '2250')]);
    expect(cols.map((c) => c.stage)).toEqual(['Qualified', 'Proposal', '—', 'Negotiation']);
    expect(cols[1]).toMatchObject({ count: 1, expected: 42000, weighted: 21000 });
    expect(cols[1].opportunities.map((o) => o.id)).toEqual(['a']);
    expect(cols[3]).toMatchObject({ count: 1, expected: 3000, weighted: 2250 });
  });
  it('returns no columns when there is neither a report nor opportunities', () => {
    expect(groupOpportunitiesByStage(null, [])).toEqual([]);
  });
});

describe('statusVariant / fullTextMatch', () => {
  it('maps ERPClaw words to one badge variant each', () => {
    expect(statusVariant('draft')).toBe('info');
    expect(statusVariant('won')).toBe('active');
    expect(statusVariant('cancelled')).toBe('inactive');
    expect(statusVariant('high')).toBe('error');
    expect(statusVariant('partially_paid')).toBe('warning');
    expect(statusVariant('whatever')).toBe('inactive');
  });
  it('matches case-insensitively across fields and treats blank as match-all', () => {
    expect(fullTextMatch('acme', 'Acme Trading LLC', null)).toBe(true);
    expect(fullTextMatch('zzz', 'Acme Trading LLC', 'x')).toBe(false);
    expect(fullTextMatch('  ', null, undefined)).toBe(true);
  });
});
