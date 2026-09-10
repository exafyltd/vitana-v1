/**
 * MeetupDetailsDrawer.tsx's leave/cancel handler — the "remove matching
 * calendar event" cleanup query destructured only `{ data }`. Same shape
 * and stakes as the sibling fix in useEventParticipation.ts's leave flow:
 * a query failure resolved `calendarEvents` to null/undefined, reading as
 * "nothing to clean up" and silently skipping the delete, with nothing
 * logged. Best-effort cleanup step already isolated in its own try/catch
 * that never propagates to the caller — fix is logging only.
 *
 * Pinned at the source level — this component has no existing
 * render-test harness for this deeply-nested handler, matching this
 * file's own sibling MeetupDetailsDrawer.ticket-check-error-logging.test.ts
 * precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'MeetupDetailsDrawer.tsx'), 'utf8');

describe('MeetupDetailsDrawer — leave/cancel calendar cleanup error logging', () => {
  it('destructures `error` from the calendar_events cleanup lookup, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: calendarEvents, error: calendarEventsError \} = await supabase\s*\n\s*\.from\('calendar_events'\)/,
    );
  });

  it('logs the error before the unchanged `if (calendarEvents)` fallback', () => {
    const idx = SRC.indexOf("const { data: calendarEvents, error: calendarEventsError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);
    expect(after).toMatch(/if \(calendarEventsError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('if (calendarEvents) {');
    const errIdx = after.indexOf('if (calendarEventsError) {');
    const okIdx = after.indexOf('if (calendarEvents) {');
    expect(okIdx).toBeGreaterThan(errIdx);
  });
});
