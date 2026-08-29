/**
 * useCalendarEvents.ts's invite-response idempotency check — error-
 * visibility fix.
 *
 * Before creating a calendar_events row for an invite response, this
 * hook checks for an existing row keyed on source_message_id specifically
 * to prevent duplicate calendar events for the same source message. It
 * previously destructured only `{ data }`. A Postgres-level query
 * failure resolved `data` to null — indistinguishable from "no existing
 * event" — so the code fell through to creating a brand-new event even
 * though one already existed, and a real user saw a duplicated calendar
 * entry with nothing logged to explain why.
 *
 * Pinned at the source level — this hook is large and stateful with no
 * existing test harness, matching this repo's
 * IntroExperience.orb-placement.test.ts precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useCalendarEvents.ts'), 'utf8');

describe('useCalendarEvents — invite-response idempotency check error logging', () => {
  it('destructures `error` from the existing-event lookup, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data, error: existingErr \} = await supabase\s*\n\s*\.from\('calendar_events'\)/,
    );
  });

  it('logs the error when present, before the unchanged `existingEvent = data` assignment', () => {
    const idx = SRC.indexOf("const { data, error: existingErr } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 1100);
    expect(after).toMatch(/if \(existingErr\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('existingEvent = data;');
  });
});
