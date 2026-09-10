/**
 * useEventParticipation.ts's `toggleParticipation()` leave-flow — the
 * "also remove matching calendar event" cleanup query destructured only
 * `{ data }`. A query failure resolved `calendarEvents` to null/undefined,
 * which reads as "nothing to clean up" and silently skips deleting the
 * stale calendar entry — with nothing logged. This is a best-effort
 * cleanup step (already wrapped in its own try/catch that never
 * propagates a failure to the caller), so the fix is logging only, same
 * shape and stakes as the sibling fix in
 * MeetupDetailsDrawer.tsx's leave/cancel handler.
 *
 * Pinned at the source level — this hook has no existing render-test
 * harness, matching this repo's established source-level-assertion
 * precedent (see useCalendarEvents.idempotency-error-logging.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useEventParticipation.ts'), 'utf8');

describe('useEventParticipation — leave-flow calendar cleanup error logging', () => {
  it('destructures `error` from the calendar_events cleanup lookup, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: calendarEvents, error: calendarEventsError \} = await supabase\s*\n\s*\.from\('calendar_events'\)/,
    );
  });

  it('logs the error before the unchanged `if (calendarEvents)` fallback', () => {
    const idx = SRC.indexOf("const { data: calendarEvents, error: calendarEventsError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(calendarEventsError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('if (calendarEvents) {');
    const errIdx = after.indexOf('if (calendarEventsError) {');
    const okIdx = after.indexOf('if (calendarEvents) {');
    expect(okIdx).toBeGreaterThan(errIdx);
  });
});
