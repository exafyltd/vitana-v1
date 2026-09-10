/**
 * GroupMembersDialog.tsx — global_community_profiles batch lookup
 * error-visibility fix.
 *
 * `fetchMembers()`'s `global_community_profiles` batch lookup previously
 * destructured only `{ data: profiles }`, never checking `error`. A real
 * DB failure resolved `profiles` to `null`, collapsed to `[]` — so every
 * member rendered with a blank name/avatar, indistinguishable from
 * "these members genuinely have no profile row" — with nothing logged.
 *
 * Fixed: `error` is now destructured and logged via `console.error`. This
 * is a read/display path, so per the fix spec this logs and degrades
 * rather than throwing/aborting the whole member list.
 *
 * GroupMembersDialog.tsx has no existing render-test harness for this
 * fetch callback; per this repo's own established pattern, this pins the
 * fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'GroupMembersDialog.tsx'), 'utf8');

describe('GroupMembersDialog — global_community_profiles lookup error logging', () => {
  it('destructures `error` from the global_community_profiles query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: profiles, error: profilesError \} = await supabase\s*\n\s*\.from\('global_community_profiles'\)/
    );
  });

  it('logs the error before the unchanged profileMap fallback usage', () => {
    const idx = SRC.indexOf("const { data: profiles, error: profilesError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);

    expect(after).toMatch(/if \(profilesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));');

    const errIdx = after.indexOf('if (profilesError) {');
    const useIdx = after.indexOf('const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));');
    expect(useIdx).toBeGreaterThan(errIdx);
  });

  it('does not throw on a profiles-lookup error (log-only, degrade gracefully)', () => {
    const idx = SRC.indexOf('if (profilesError) {');
    const after = SRC.slice(idx, idx + 300);
    const closeIdx = after.indexOf('}');
    const body = after.slice(0, closeIdx);
    expect(body).not.toContain('throw');
  });
});
