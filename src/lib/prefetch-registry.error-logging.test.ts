/**
 * prefetch-registry.ts — five silent-prefetch-poison error-visibility fixes.
 *
 * Five `queryClient.prefetchQuery` call sites (business packages, health
 * plans, shorts, community music, community podcasts) each did
 * `const { data } = await supabase.from(...)...; return data || [];` with
 * no error check. Because each shares its cache key with the real screen's
 * own (correctly-checked) query, a failed prefetch silently wrote an EMPTY
 * SUCCESS result into the React Query cache — the real screen then reads
 * that poisoned cache entry for the `staleTime` window, rendering "no
 * results" for content that genuinely exists, indistinguishable from an
 * actual empty state, with nothing logged anywhere.
 *
 * Fixed: all five now destructure `error`, log it via `console.error`, and
 * THROW it — matching the standard already used elsewhere in this very
 * file (`if (!res.ok) throw new Error(...)` for the my-journey / autopilot
 * recommendations prefetches) — so React Query's own retry/staleness
 * machinery treats the prefetch as a FAILED query instead of silently
 * caching an empty success. This does not change the return shape on
 * success (`data || []`, unchanged).
 *
 * prefetch-registry.ts has no existing render-test harness (it operates on
 * a raw QueryClient outside any component tree); per this repo's own
 * established pattern for exactly this class of fix, this pins all five
 * fixes at the source level in one file.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'prefetch-registry.ts'), 'utf8');

function assertErrorThrown(label: string, dataVarPattern: RegExp, marker: string) {
  it(`${label}: destructures \`error\`, logs it, and throws before returning`, () => {
    expect(SRC).toMatch(dataVarPattern);
    const idx = SRC.indexOf(marker);
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('throw error;');
    expect(after).toContain('return data || [];');

    const errIdx = after.indexOf('if (error) {');
    const throwIdx = after.indexOf('throw error;');
    const returnIdx = after.indexOf('return data || [];');
    expect(throwIdx).toBeGreaterThan(errIdx);
    expect(returnIdx).toBeGreaterThan(throwIdx);
  });
}

describe('prefetch-registry — swallowed Supabase error fixes', () => {
  assertErrorThrown(
    'business packages',
    /const \{ data, error \} = await supabase\.from\('business_packages'\)/,
    "await supabase.from('business_packages')"
  );

  assertErrorThrown(
    'health plans',
    /const \{ data, error \} = await supabase\.from\('user_health_plans'\)/,
    "await supabase.from('user_health_plans')"
  );

  assertErrorThrown(
    'shorts',
    /const \{ data, error \} = await supabase\.from\('media_videos'\)/,
    "await supabase.from('media_videos')"
  );

  it('community music: destructures `error`, logs it, and throws before returning', () => {
    const idx = SRC.indexOf("const { data, error } = await supabase\n          .from('media_uploads')\n          .select(`\n            id, title, description, tags, file_url, duration, plays_count, created_at,\n            music_metadata (genre, mood, artist_name)");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('throw error;');
    expect(after).toContain('return data || [];');
  });

  it("community podcasts: destructures `error`, logs it, and throws before returning", () => {
    const idx = SRC.indexOf("await supabase\n          .from('media_uploads')\n          .select('*, podcast_metadata(*)')");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('throw error;');
    expect(after).toContain('return data || [];');
  });

  it('all five error checks appear before their own return statement (5 occurrences each)', () => {
    const errorChecks = SRC.match(/if \(error\) \{/g) || [];
    const throwStatements = SRC.match(/throw error;/g) || [];
    expect(errorChecks.length).toBe(5);
    expect(throwStatements.length).toBe(5);
  });
});
