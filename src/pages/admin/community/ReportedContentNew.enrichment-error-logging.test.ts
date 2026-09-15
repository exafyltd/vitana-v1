/**
 * ReportedContentNew.tsx — secondary enrichment-query error visibility fix.
 *
 * The primary reports/bans/audit queries in this file already checked
 * `error` and surfaced it via `notifyError(...)`, but three secondary
 * enrichment queries were missed: reported post content (`profile_posts`),
 * reported-post author display names, and banned-user display names
 * (both `global_community_profiles`). A DB failure on any of these
 * previously resolved to blank author name / post content / ban
 * display-name cells in the admin moderation table, with nothing logged —
 * the reports/bans themselves still load and stay actionable, only the
 * enrichment silently degrades.
 *
 * Fixed: all three now also destructure `error` and log it via
 * `console.error`, matching the primary queries' pattern. No toast (these
 * are cosmetic-only, unlike the primary load failures) and no change to
 * the unchanged `|| []` fallbacks everything downstream still reads.
 *
 * Pinned at the source level, matching this file's own established
 * precedent (see the sibling *.bans-error-logging.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'ReportedContentNew.tsx'), 'utf8');

describe('ReportedContentNew — secondary enrichment query error logging', () => {
  it('destructures `error` from the reported-post content query', () => {
    expect(SRC).toMatch(
      /const \{ data: posts, error: postsError \} = await supabase\s*\n\s*\.from\("profile_posts" as never\)/
    );
  });

  it('logs the reported-post content error before the unchanged fallback', () => {
    const idx = SRC.indexOf('const { data: posts, error: postsError }');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(postsError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('for (const p of (posts as unknown as');
  });

  it('destructures `error` from the reported-post author-name query', () => {
    expect(SRC).toMatch(
      /const \{ data: profs, error: profsError \} = await supabase\s*\n\s*\.from\("global_community_profiles"\)/
    );
  });

  it('logs the author-name error before the unchanged fallback', () => {
    const idx = SRC.indexOf('const { data: profs, error: profsError }');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(profsError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('for (const pr of profs || [])');
  });

  it('destructures `error` from the banned-user display-name query', () => {
    expect(SRC).toMatch(
      /const \{ data: bp, error: bpError \} = await supabase\.from\("global_community_profiles"\)/
    );
  });

  it('logs the ban display-name error before the unchanged fallback', () => {
    const idx = SRC.indexOf('const { data: bp, error: bpError }');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(bpError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('for (const x of bp || [])');
  });
});
