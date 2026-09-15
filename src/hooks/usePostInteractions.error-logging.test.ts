/**
 * usePostInteractions.ts's comment-author profile enrichment query —
 * error-visibility fix. Previously destructured only `{ data: profiles }`;
 * a DB failure resolved to null, silently rendering comment authors as
 * "Unknown" indistinguishable from a real profile miss. Now also
 * destructures `error` and logs it. Fallback unchanged.
 *
 * Pinned at the source level — no existing render-test harness, matching
 * this repo's established source-level-assertion precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'usePostInteractions.ts'), 'utf8');

describe('usePostInteractions — comment-author profile enrichment error logging', () => {
  it('destructures `error` from the profiles query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: profiles, error: profilesError \} = await supabase\s*\n\s*\.from\('profiles'\)/,
    );
  });

  it('logs the error before the unchanged profileMap fallback', () => {
    const idx = SRC.indexOf("const { data: profiles, error: profilesError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    // VTID-03923 added full_name to the .select(...) call, lengthening it —
    // widened from 400 with margin so this stays robust to similar future
    // column additions on the same line.
    const after = SRC.slice(idx, idx + 500);
    expect(after).toMatch(/if \(profilesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));');
  });
});
