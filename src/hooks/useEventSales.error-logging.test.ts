/**
 * useEventSales.ts — useIsEventOrganizer/useEventHasTickets error-visibility fix.
 *
 * `useIsEventOrganizer`'s `.single()` lookup on `global_community_events`
 * and `useEventHasTickets`'s count query on `event_ticket_types` both
 * destructured only their success field (`data`/`count`), never `error`.
 * On a real Postgres failure, both silently resolved to "not the
 * organizer" / "no tickets" — hiding an organizer's own management
 * controls with nothing in the console to say why.
 *
 * Fixed: both now also destructure `error` and log it via `console.error`.
 * `useIsEventOrganizer`'s `.single()` has a LEGITIMATE PGRST116 case (the
 * event genuinely doesn't exist), matching this repo's own established
 * `error.code !== "PGRST116"` convention (see useMemoryMetadata.ts) — that
 * case is explicitly excluded from logging. `useEventHasTickets` uses a
 * head-only count query with no `.single()`/no-rows case, so every error is
 * logged. Neither fallback (`isOrganizer`/`hasTickets` computation) changed.
 *
 * useEventSales.ts has no existing render-test harness; per this repo's
 * own established pattern, this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useEventSales.ts'), 'utf8');

describe('useEventSales — useIsEventOrganizer error logging', () => {
  it('destructures `error` from the global_community_events .single() query', () => {
    expect(SRC).toMatch(
      /const \{ data: event, error \} = await supabase\s*\n\s*\.from\("global_community_events"\)/
    );
  });

  it('excludes PGRST116 (no rows) from being logged as an error', () => {
    const idx = SRC.indexOf('const { data: event, error } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);
    expect(after).toMatch(/if \(error && error\.code !== "PGRST116"\) \{/);
    expect(after).toContain('console.error(');
    // Unchanged fallback.
    expect(after).toContain('setIsOrganizer(event?.created_by === user.id);');
    const errIdx = after.indexOf('if (error && error.code !== "PGRST116") {');
    const useIdx = after.indexOf('setIsOrganizer(event?.created_by === user.id);');
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});

describe('useEventSales — useEventHasTickets error logging', () => {
  it('destructures `error` from the event_ticket_types count query', () => {
    expect(SRC).toMatch(
      /const \{ count, error \} = await supabase\s*\n\s*\.from\("event_ticket_types"\)/
    );
  });

  it('logs any error (no PGRST116 exclusion needed — no .single() here) before the unchanged fallback', () => {
    const idx = SRC.indexOf('const { count, error } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('setHasTickets((count || 0) > 0);');
    const errIdx = after.indexOf('if (error) {');
    const useIdx = after.indexOf('setHasTickets((count || 0) > 0);');
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});
