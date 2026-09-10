/**
 * MediaManagement.tsx admin dashboard stats — error-visibility fix.
 *
 * The `allMedia` and `recentUploads` queries both destructured only
 * `{ data }`. A DB failure on either resolved to null/undefined, and the
 * downstream `|| 0` derivations (pending/flagged/approved counts,
 * recent24h) then silently rendered as "0 flagged, 0 pending" — a
 * false-confidence dashboard indistinguishable from a genuinely clean
 * moderation queue.
 *
 * Fixed: both now also destructure `error` and log it via
 * `console.error`. Neither derived-stat fallback changed.
 *
 * Pinned at the source level — this page has no existing render-test
 * harness, matching this repo's established source-level-assertion
 * precedent (see useCalendarEvents.idempotency-error-logging.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'MediaManagement.tsx'), 'utf8');

describe('MediaManagement (admin) — dashboard stats error logging', () => {
  it('destructures `error` from the allMedia query', () => {
    expect(SRC).toMatch(
      /const \{ data: allMedia, error: allMediaError \} = await supabase\s*\n\s*\.from\('media_uploads'\)/,
    );
  });

  it('logs the allMedia error before the derived-stats fallbacks', () => {
    const idx = SRC.indexOf("const { data: allMedia, error: allMediaError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 600);
    expect(after).toMatch(/if \(allMediaError\) \{/);
    expect(after).toContain('console.error(');
  });

  it('destructures `error` from the recentUploads query', () => {
    expect(SRC).toMatch(
      /const \{ data: recentUploads, error: recentUploadsError \} = await supabase\s*\n\s*\.from\('media_uploads'\)/,
    );
  });

  it('logs the recentUploads error before the unchanged recent24h fallback', () => {
    const idx = SRC.indexOf("const { data: recentUploads, error: recentUploadsError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(recentUploadsError\) \{/);
    expect(after).toContain('console.error(');
    expect(SRC).toContain('recent24h: recentUploads?.length || 0');
  });
});
