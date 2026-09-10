/**
 * PublicCampaignLanding.tsx — linked-event ticket-availability error fix.
 *
 * `fetchPublicCampaign()` enriches a public campaign with its linked
 * event's ticket info via `const { data: eventData } = await
 * supabase.rpc("get_public_event_details", ...)` and never checked
 * `error`. On a real RPC failure, `eventData` resolves to `undefined`, the
 * `if (eventData && eventData.length > 0)` branch is skipped, and
 * `linkedEventTickets` stays `null` — which downstream collapses
 * `hasTickets` to `false` (`linkedEventTickets?.has_tickets || false`).
 * That is indistinguishable from "this event genuinely has no tickets",
 * so a DB error silently rendered the exact same CTA as a sold-out/
 * ticketless event, with nothing in the console to say a query actually
 * failed rather than legitimately returning nothing.
 *
 * Fixed: the RPC call now also destructures `error` and logs it via
 * `console.error`, matching the sibling campaign-fetch RPC two lines above
 * it in the same function (which already does `if (fetchError) {
 * console.error(...); setError(...); }`). This is a secondary enrichment
 * call for an already-successfully-loaded campaign, so the fix logs
 * rather than failing the whole page — the existing has_tickets=false
 * fallback behavior is otherwise unchanged.
 *
 * PublicCampaignLanding.tsx has no existing render-test harness; per this
 * repo's own established pattern (see the sibling
 * PublicEventLanding.ticket-check-error-logging.test.ts, which pins the
 * identical class of fix on the sibling page), this pins the fix at the
 * source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'PublicCampaignLanding.tsx'), 'utf8');

describe('PublicCampaignLanding — linked-event ticket-availability error logging', () => {
  it('destructures `error` from the get_public_event_details RPC call, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: eventData, error: eventError \} = await supabase\.rpc\("get_public_event_details", \{/
    );
  });

  it('logs the error when present, before falling back to the unchanged has_tickets/price behavior', () => {
    const idx = SRC.indexOf('supabase.rpc("get_public_event_details"');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 600);

    expect(after).toMatch(/if \(eventError\) \{/);
    expect(after).toContain('console.error(');
    // The fallback must stay byte-for-byte unchanged: still gated on
    // eventData actually coming back with rows.
    expect(after).toContain('if (eventData && eventData.length > 0) {');
    expect(after).toContain('has_tickets: event.has_tickets || false,');
  });

  it('the error check happens before the eventData usage, not after', () => {
    const idx = SRC.indexOf('supabase.rpc("get_public_event_details"');
    const body = SRC.slice(idx, idx + 600);
    const errIdx = body.indexOf('if (eventError) {');
    const useIdx = body.indexOf('if (eventData && eventData.length > 0) {');
    expect(errIdx).toBeGreaterThan(-1);
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});
