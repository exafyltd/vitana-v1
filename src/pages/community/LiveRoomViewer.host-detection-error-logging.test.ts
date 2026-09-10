/**
 * LiveRoomViewer.tsx's DB-based host detection — error-visibility fix.
 *
 * The `live-room-host` query (react-query) previously destructured only
 * `{ data }` from the live_rooms select. A Postgres-level failure
 * resolves `data` to null — indistinguishable from "no such room" — and
 * `effectiveIsHost` falls back to `isHost` (navigation-state only, which
 * this query exists specifically to survive a page refresh past). A
 * legitimate host reloading this page during a live session would
 * silently lose moderator controls (End Stream, Settings) with nothing
 * logged to explain why.
 *
 * Pinned at the source level — this page has heavy routing/auth/
 * LiveKit-adjacent dependencies with no existing render-test harness,
 * matching this repo's IntroExperience.orb-placement.test.ts precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'LiveRoomViewer.tsx'), 'utf8');

describe('LiveRoomViewer — host detection query error logging', () => {
  it('destructures `error` from the live_rooms host-detection query, not just `data`', () => {
    expect(SRC).toMatch(/const \{ data, error \} = await supabase\s*\n\s*\.from\('live_rooms'\)/);
  });

  it('logs the error when present, before returning the unchanged `data` fallback', () => {
    const idx = SRC.indexOf(".from('live_rooms')");
    const after = SRC.slice(idx, idx + 600);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.error(');
    // The fallback must stay unchanged: still returns `data` verbatim
    // (undefined/null on failure, same as before this fix).
    expect(after).toMatch(/return data;\s*\n\s*\},/);
  });
});
