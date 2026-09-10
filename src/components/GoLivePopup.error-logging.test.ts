/**
 * GoLivePopup.tsx's Supabase fallback room lookup — error-visibility fix.
 *
 * This lookup only runs after the primary gateway call (`useMyRoom()`)
 * has already failed. It previously destructured only `{ data: appUser }`.
 * A further DB error here resolved `appUser` to null/undefined, falling
 * through both the `live_room_id` and `tenant_id` branches — leaving the
 * Go Live flow silently broken with no resolvable room and no visible
 * error anywhere.
 *
 * Fixed: also destructures `error` and logs it via `console.error`.
 * Neither branch's fallback changed.
 *
 * Pinned at the source level — this component has no existing
 * render-test harness for this effect, matching this repo's established
 * source-level-assertion precedent (see
 * useCalendarEvents.idempotency-error-logging.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'GoLivePopup.tsx'), 'utf8');

describe('GoLivePopup — Supabase fallback app_users lookup error logging', () => {
  it('destructures `error` from the app_users fallback lookup, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: appUser, error: appUserError \} = await supabase\s*\n\s*\.from\('app_users'\)/,
    );
  });

  it('logs the error before the unchanged live_room_id/tenant_id branches', () => {
    const idx = SRC.indexOf("const { data: appUser, error: appUserError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(appUserError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('if (appUser?.live_room_id) {');
    const errIdx = after.indexOf('if (appUserError) {');
    const branchIdx = after.indexOf('if (appUser?.live_room_id) {');
    expect(branchIdx).toBeGreaterThan(errIdx);
  });
});
