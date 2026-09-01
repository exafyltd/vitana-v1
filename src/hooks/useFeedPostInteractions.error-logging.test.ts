/**
 * useFeedPostInteractions.ts's comment-enrichment queries — error-
 * visibility fix on two sites:
 *
 * 1. The comment-author `profiles` query: previously destructured only
 *    `{ data: profiles }`. Now logs the error; fallback unchanged.
 * 2. The `myLikes` per-comment-like-state query: previously destructured
 *    only `{ data: myLikes }`. A DB error here can make an already-liked
 *    comment appear unliked, so this is slightly higher stakes — but per
 *    the audit's own instruction, still just logged, not given a new
 *    fallback (there's no "unknown" like-state to fall back to here).
 *
 * Pinned at the source level — no existing render-test harness, matching
 * this repo's established source-level-assertion precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useFeedPostInteractions.ts'), 'utf8');

describe('useFeedPostInteractions — comment-author profile enrichment error logging', () => {
  it('destructures `error` from the profiles query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: profiles, error: profilesError \} = await supabase\s*\n\s*\.from\('profiles'\)/,
    );
  });

  it('logs the error before the unchanged profileMap fallback', () => {
    const idx = SRC.indexOf("const { data: profiles, error: profilesError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(profilesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));');
  });
});

describe('useFeedPostInteractions — my-likes error logging', () => {
  it('destructures `error` from the myLikes query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: myLikes, error: myLikesError \} = await supabase\s*\n\s*\.from\(cfg\.commentLikes as any\)/,
    );
  });

  it('logs the error before the unchanged likedSet fallback', () => {
    const idx = SRC.indexOf("const { data: myLikes, error: myLikesError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 900);
    expect(after).toMatch(/if \(myLikesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain("likedSet = new Set((myLikes || []).map((l: any) => l.comment_id));");
  });
});
