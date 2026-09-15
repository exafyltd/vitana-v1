/**
 * Videos.tsx admin video-moderation queue — error-visibility fix.
 *
 * The `media_uploads` moderation-queue query and the uploader-profile
 * enrichment query both destructured only `{ data }`. A DB failure on
 * either resolved to null/undefined, which the surrounding `|| []`
 * fallback renders as "no videos to review" — indistinguishable from a
 * genuinely empty moderation queue, hiding real pending items with
 * nothing logged.
 *
 * Fixed: both now also destructure `error` and log it via
 * `console.error`. Neither fallback changed.
 *
 * Pinned at the source level — this page has no existing render-test
 * harness, matching this repo's established source-level-assertion
 * precedent (see useCalendarEvents.idempotency-error-logging.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'Videos.tsx'), 'utf8');

describe('Videos (admin) — moderation queue error logging', () => {
  it('destructures `error` from the primary media_uploads query', () => {
    expect(SRC).toContain('const { data, error } = await query;');
  });

  it('logs the primary query error before the uploader-profile enrichment step', () => {
    const idx = SRC.indexOf('const { data, error } = await query;');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.error(');
  });

  it('destructures `error` from the uploader-profile enrichment query', () => {
    expect(SRC).toMatch(
      /const \{ data: profiles, error: profilesError \} = await supabase\s*\n\s*\.from\('profiles'\)/,
    );
  });

  it('logs the profiles error before the unchanged map fallback', () => {
    const idx = SRC.indexOf("const { data: profiles, error: profilesError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);
    expect(after).toMatch(/if \(profilesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('uploader: profiles?.find(p => p.user_id === video.user_id)');
  });
});
