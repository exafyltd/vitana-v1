/**
 * useCalendarEvents.ts — two more swallowed-error sites, both gating a
 * correctness-relevant decision rather than a purely cosmetic one:
 *
 * 1. `addEvent()`'s source_message_id dedupe check (before insert):
 *    previously destructured only `{ data }`. A query failure resolved
 *    `existing` to undefined — indistinguishable from "no existing row" —
 *    so the code fell straight through to the insert, risking a duplicate
 *    calendar event. Now: the error is logged and rethrown, aborting the
 *    add (the surrounding try/catch already logs+toasts+rethrows for any
 *    other real failure in this function, so this doesn't change the
 *    function's error contract, just makes an existing failure mode
 *    reachable through it).
 *
 * 2. `respondToInvite()`'s declined-branch cleanup lookup (gates the
 *    delete of a stale calendar event created from the same invite):
 *    previously destructured only `{ data }`. A query failure resolved
 *    `existing` to undefined, skipping the delete — but the function
 *    still unconditionally returned success, leaving a stale entry with
 *    no trace of why. Now: the error is logged AND surfaced via the
 *    return's `error` field — this function's own established pattern
 *    for "don't throw, but don't silently claim success either" (see the
 *    sibling `eventError` branch in the accept/maybe path, which already
 *    returns `{ eventId: undefined, response, error: eventError }`).
 *
 * Pinned at the source level — this hook has no existing render-test
 * harness, matching this file's own sibling
 * useCalendarEvents.idempotency-error-logging.test.ts precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useCalendarEvents.ts'), 'utf8');

describe('useCalendarEvents — addEvent() dedupe-check error logging + abort', () => {
  it('destructures `error` from the addEvent dedupe lookup, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: existing, error: existingErr \} = await supabase\s*\n\s*\.from\('calendar_events'\)/,
    );
  });

  it('logs and rethrows the error, aborting before the insert path', () => {
    const idx = SRC.indexOf('const { data: existing, error: existingErr } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 1100);
    expect(after).toMatch(/if \(existingErr\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('throw existingErr;');
    // The unchanged existing-found fallback still follows.
    const throwIdx = after.indexOf('throw existingErr;');
    const foundIdx = after.indexOf('if (existing) {');
    expect(foundIdx).toBeGreaterThan(throwIdx);
  });
});

describe('useCalendarEvents — respondToInvite() decline-cleanup lookup error logging', () => {
  it('destructures `error` from the declined-branch existing-event lookup', () => {
    expect(SRC).toMatch(
      /const \{ data: existing, error: existingErr \} = await supabase\s*\n\s*\.from\('calendar_events'\)\s*\n\s*\.select\('id'\)/,
    );
  });

  it('logs the error and records it for the return value instead of silently reporting success', () => {
    const idx = SRC.indexOf("const { data: existing, error: existingErr } = await supabase\n              .from('calendar_events')\n              .select('id')");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 1100);
    expect(after).toMatch(/if \(existingErr\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('declineCleanupError = existingErr;');
  });

  it('returns the declineCleanupError via the `error` field instead of unconditionally reporting success', () => {
    expect(SRC).toContain(
      'return { eventId: undefined, response: normalized, error: declineCleanupError };',
    );
  });
});
