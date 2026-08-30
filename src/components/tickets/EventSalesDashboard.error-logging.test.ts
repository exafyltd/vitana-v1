/**
 * EventSalesDashboard.tsx — fetchSalesData() ticket types/purchases error-visibility fix.
 *
 * `fetchSalesData()` queried both `event_ticket_types` and
 * `event_ticket_purchases` with `const { data: types } = ...` / `const
 * { data: purchases } = ...`, never checking `error`. On a real Postgres
 * failure both resolve to `undefined`, and the existing `|| []` fallbacks
 * render an event with real sales as $0 revenue / 0 tickets sold — a
 * confidently wrong financial dashboard, not a missing one.
 *
 * Fixed: both queries now also destructure `error` and log it via
 * `console.error`. The `|| []` fallback behavior and all downstream stat
 * computation are unchanged — this only makes a real failure visible.
 *
 * EventSalesDashboard.tsx has no existing render-test harness; per this
 * repo's own established pattern (useResellerSales.error-logging.test.ts),
 * this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'EventSalesDashboard.tsx'), 'utf8');

describe('EventSalesDashboard — fetchSalesData() error logging', () => {
  it('destructures `error` from the event_ticket_types query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: types, error: typesError \} = await supabase\s*\n\s*\.from\("event_ticket_types"\)/
    );
  });

  it('logs the types error before the unchanged setTicketTypes(types || []) usage', () => {
    const idx = SRC.indexOf('error: typesError } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 1200);
    expect(after).toMatch(/if \(typesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('setTicketTypes(types || []);');
    const errIdx = after.indexOf('if (typesError) {');
    const useIdx = after.indexOf('setTicketTypes(types || []);');
    expect(useIdx).toBeGreaterThan(errIdx);
  });

  it('destructures `error` from the event_ticket_purchases query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: purchases, error: purchasesError \} = await supabase\s*\n\s*\.from\("event_ticket_purchases"\)/
    );
  });

  it('logs the purchases error before the unchanged setSales usage', () => {
    const idx = SRC.indexOf('error: purchasesError } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 900);
    expect(after).toMatch(/if \(purchasesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('setSales((purchases as TicketSale[]) || []);');
    const errIdx = after.indexOf('if (purchasesError) {');
    const useIdx = after.indexOf('setSales((purchases as TicketSale[]) || []);');
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});
