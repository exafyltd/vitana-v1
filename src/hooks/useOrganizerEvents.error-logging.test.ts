/**
 * useOrganizerEvents.ts — per-event ticketTypes/purchases query error-visibility fix.
 *
 * Inside the per-event `Promise.all` map, both the `event_ticket_types`
 * capacity query and the `event_ticket_purchases` sales query destructured
 * only `{ data }`, never `error`. On a real Postgres failure, both resolve
 * to `undefined`, and the existing `?.reduce(...) || 0` fallbacks compute
 * `totalCapacity`/`ticketsSold` as 0 — which then gets the event FILTERED
 * OUT of "My Events" entirely (`eventsWithSales.filter((e) =>
 * e.totalCapacity > 0 || e.ticketsSold > 0)`), indistinguishable from an
 * event that genuinely has no tickets.
 *
 * Fixed: both queries now also destructure `error` and log it via
 * `console.error`, matching this file's own established pattern one level
 * up (`if (eventsError) throw eventsError;`) for VISIBILITY, but NOT
 * throwing here — a per-event failure inside `Promise.all` throwing would
 * fail every OTHER event's computation too, a bigger behavior change than
 * warranted for this fix. The filter logic and 0-fallback are unchanged;
 * only visibility is added.
 *
 * useOrganizerEvents.ts has no existing render-test harness; per this
 * repo's own established pattern (useResellerSales.error-logging.test.ts,
 * useTenant.error-logging.test.ts), this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useOrganizerEvents.ts'), 'utf8');

describe('useOrganizerEvents — per-event ticketTypes/purchases error logging', () => {
  it('destructures `error` from the event_ticket_types query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: ticketTypes, error: ticketTypesError \} = await supabase\s*\n\s*\.from\("event_ticket_types"\)/
    );
  });

  it('logs the ticketTypes error before the unchanged totalCapacity fallback', () => {
    const idx = SRC.indexOf('error: ticketTypesError } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);
    expect(after).toMatch(/if \(ticketTypesError\) \{/);
    expect(after).toContain('console.error(');
    // Unchanged fallback
    expect(after).toContain('const totalCapacity = ticketTypes?.reduce(');
    const errIdx = after.indexOf('if (ticketTypesError) {');
    const useIdx = after.indexOf('const totalCapacity = ticketTypes?.reduce(');
    expect(useIdx).toBeGreaterThan(errIdx);
  });

  it('destructures `error` from the event_ticket_purchases query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: purchases, error: purchasesError \} = await supabase\s*\n\s*\.from\("event_ticket_purchases"\)/
    );
  });

  it('logs the purchases error before the unchanged ticketsSold fallback', () => {
    const idx = SRC.indexOf('error: purchasesError } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);
    expect(after).toMatch(/if \(purchasesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('const ticketsSold = purchases?.reduce(');
    const errIdx = after.indexOf('if (purchasesError) {');
    const useIdx = after.indexOf('const ticketsSold = purchases?.reduce(');
    expect(useIdx).toBeGreaterThan(errIdx);
  });

  it('does not change the existing filter logic (still totalCapacity>0 || ticketsSold>0)', () => {
    expect(SRC).toContain('eventsWithSales.filter((e) => e.totalCapacity > 0 || e.ticketsSold > 0)');
  });
});
