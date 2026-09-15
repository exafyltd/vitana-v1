/**
 * PendingCalendarEventProcessor.tsx — dedup-check swallowed-error bug.
 *
 * Before inserting an AI-suggested calendar event recovered from a queued
 * chat message, the code checks `calendar_events` for an existing row with
 * the same `source_message_id` via `.maybeSingle()`, previously destructuring
 * only `{ data: existing }`. On a real DB error, `existing` resolves to
 * `undefined` — indistinguishable from "no duplicate exists" — so the code
 * fell straight through to `addEvent(...)` as if no duplicate existed. A
 * transient DB failure could therefore create a duplicate calendar event
 * for the same source message.
 *
 * Fixed: the `error` is now checked and `throw`n immediately, which is
 * caught by this function's own existing per-item `try/catch` (the same
 * one that already handles `addEvent()` failures) — the item is logged and
 * left in the local queue for retry, matching the function's own established
 * "don't process this one now, keep it queued" pattern, rather than risking
 * an insert without having confirmed no duplicate exists.
 *
 * This component has no existing render-test harness (its behavior spans
 * useAuth/useCalendarEvents/calendarPendingQueue/supabase inside a
 * useEffect + batched-async loop); per this repo's own established pattern,
 * this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'PendingCalendarEventProcessor.tsx'), 'utf8');

describe('PendingCalendarEventProcessor — dedup-check error handling', () => {
  it('destructures `error` from the calendar_events dedupe lookup, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: existing, error: existingError \} = await supabase\s*\n\s*\.from\('calendar_events'\)/
    );
  });

  it('throws on the dedupe-check error before the existing?.id check and before addEvent()', () => {
    const idx = SRC.indexOf('const { data: existing, error: existingError } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 900);

    expect(after).toMatch(/if \(existingError\) \{/);
    expect(after).toContain('throw existingError;');

    const throwIdx = after.indexOf('throw existingError;');
    const existingCheckIdx = after.indexOf('if (existing?.id)');
    expect(existingCheckIdx).toBeGreaterThan(throwIdx);

    const addEventIdx = SRC.indexOf('await addEvent({');
    const fullThrowIdx = SRC.indexOf('throw existingError;');
    expect(addEventIdx).toBeGreaterThan(fullThrowIdx);
  });

  it('the thrown error is caught by the existing per-item catch, which leaves the item queued for retry', () => {
    const throwIdx = SRC.indexOf('throw existingError;');
    const catchIdx = SRC.indexOf('} catch (err) {');
    expect(throwIdx).toBeGreaterThan(-1);
    expect(catchIdx).toBeGreaterThan(throwIdx);
    const catchBlock = SRC.slice(catchIdx, catchIdx + 300);
    expect(catchBlock).toContain('console.error(');
    expect(catchBlock).toContain('// Event stays in queue for retry');
  });
});
