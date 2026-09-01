/**
 * PublicEventLanding.tsx's ticket-ownership check — error-visibility fix.
 *
 * `checkUserTicket()` queries event_ticket_purchases and previously
 * destructured only `{ data }`. A Postgres-level query failure (RLS
 * change, transient error) resolves `data` to null — indistinguishable
 * from "no completed ticket" — so a user who already paid for a ticket
 * was silently shown the "buy ticket" CTA again, with nothing in the
 * console pointing at why.
 *
 * PublicEventLanding.tsx (480 lines: routing params, auth context, event
 * fetch, ticket selector) has no existing render-test harness; per this
 * repo's own established pattern for source-level assertions where the
 * moving parts can't practically be exercised through a component render
 * (see IntroExperience.orb-placement.test.ts), this pins the fix at the
 * source level instead.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'PublicEventLanding.tsx'), 'utf8');

describe('PublicEventLanding — ticket ownership check error logging', () => {
  it('destructures `error` from the event_ticket_purchases query, not just `data`', () => {
    expect(SRC).toMatch(/const \{ data, error \} = await supabase\s*\n\s*\.from\("event_ticket_purchases"\)/);
  });

  it('logs the error when present, before falling back to the unchanged ticket-check result', () => {
    const idx = SRC.indexOf('.from("event_ticket_purchases")');
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.error(');
    // The fallback must stay byte-for-byte unchanged: still a boolean of
    // whether any completed-ticket row came back.
    expect(after).toContain('setUserHasTicket(!!data && data.length > 0)');
  });
});
