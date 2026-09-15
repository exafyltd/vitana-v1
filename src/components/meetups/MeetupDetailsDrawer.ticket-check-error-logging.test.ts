/**
 * MeetupDetailsDrawer.tsx's ticket-ownership check — error-visibility fix.
 *
 * `checkUserTicket()` queries event_ticket_purchases and previously
 * destructured only `{ data }`. A Postgres-level query failure resolves
 * `data` to null — indistinguishable from "no completed ticket" — so a
 * user who already paid for a ticket was silently shown the "get ticket"
 * CTA again in this in-app drawer, with nothing logged.
 *
 * Pinned at the source level (matching PublicEventLanding's identical
 * fix and this repo's IntroExperience.orb-placement.test.ts precedent) —
 * this drawer has heavy context/hook dependencies with no existing
 * render-test harness.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'MeetupDetailsDrawer.tsx'), 'utf8');

describe('MeetupDetailsDrawer — ticket ownership check error logging', () => {
  it('destructures `error` from the event_ticket_purchases query, not just `data`', () => {
    expect(SRC).toMatch(/const \{ data, error \} = await supabase\s*\n\s*\.from\("event_ticket_purchases"\)/);
  });

  it('logs the error when present, before falling back to the unchanged ticket-check result', () => {
    const idx = SRC.indexOf('.from("event_ticket_purchases")');
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('setUserHasTicket(!!data && data.length > 0)');
  });
});
