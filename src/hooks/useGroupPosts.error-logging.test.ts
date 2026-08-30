/**
 * useGroupPosts.ts's author-profile enrichment query — error-visibility
 * fix. Previously destructured only `{ data: profiles }`; a DB failure
 * resolved to null, silently rendering post authors as "Unknown". Now
 * also destructures `error` and logs it. Fallback unchanged.
 *
 * Pinned at the source level — no existing render-test harness, matching
 * this repo's established source-level-assertion precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useGroupPosts.ts'), 'utf8');

describe('useGroupPosts — author profile enrichment error logging', () => {
  it('destructures `error` from the global_community_profiles query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: profiles, error: profilesError \} = await supabase\s*\n\s*\.from\('global_community_profiles'\)/,
    );
  });

  it('logs the error before the unchanged profileMap fallback', () => {
    const idx = SRC.indexOf("const { data: profiles, error: profilesError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(profilesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));');
  });
});
