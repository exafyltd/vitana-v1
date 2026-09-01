/**
 * EditMeetupPopup.tsx — existing ticket-types fetch error-visibility fix.
 *
 * On open, the popup pre-fetches `event_ticket_types` for the event being
 * edited via `const { data: existingTickets } = await supabase.from(...)`
 * and never checked `error`. On a real Postgres failure, `existingTickets`
 * resolves to `undefined`, which falls into the SAME else-branch as "this
 * event genuinely has no tickets" (`setEnableTicketSales(false);
 * setTicketTypes([])`) — indistinguishable from a real DB error. Since this
 * form is a SAVE form, an admin who then saves without noticing would
 * silently wipe a real paid event's ticket configuration.
 *
 * Fixed: the query now also destructures `error`, logs it loudly via
 * `console.error`, and surfaces a toast via `notifyError(...)` using the
 * existing generic `toasts.common.loadFailed`/`loadFailedDesc` keys (already
 * present in both `de` and `en` catalogs — no new i18n keys needed). The
 * fallback behavior itself is UNCHANGED: blocking the edit form entirely on
 * a read error would be worse UX than logging loudly and degrading, so the
 * existing branch (populate on success / clear on empty-or-error) still
 * runs exactly as before — this only makes a real failure visible instead
 * of silently indistinguishable from "no tickets".
 *
 * EditMeetupPopup.tsx (a large dialog form with async image
 * generation/upload) has no existing render-test harness; per this repo's
 * own established pattern for exactly this class of fix (see
 * useResellerSales.error-logging.test.ts, useTenant.error-logging.test.ts,
 * ReportedContentNew.bans-error-logging.test.ts), this pins the fix at the
 * source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'EditMeetupPopup.tsx'), 'utf8');

describe('EditMeetupPopup — existing ticket-types fetch error logging', () => {
  it('destructures `error` from the event_ticket_types fetch, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: existingTickets, error: existingTicketsError \} = await supabase\s*\n\s*\.from\("event_ticket_types"\)/
    );
  });

  it('logs and surfaces the error before the unchanged existingTickets branch runs', () => {
    const idx = SRC.indexOf('error: existingTicketsError } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 1600);

    expect(after).toMatch(/if \(existingTicketsError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain("notifyError('toasts.common.loadFailed', 'toasts.common.loadFailedDesc')");

    // The fallback branch must stay byte-for-byte unchanged.
    expect(after).toContain('if (existingTickets && existingTickets.length > 0) {');
    expect(after).toContain('setEnableTicketSales(false);');
    expect(after).toContain('setTicketTypes([]);');

    const errIdx = after.indexOf('if (existingTicketsError) {');
    const useIdx = after.indexOf('if (existingTickets && existingTickets.length > 0) {');
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});
