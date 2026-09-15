/**
 * IdentityForm.tsx — loadProfile() error visibility + save-safety signal.
 *
 * `loadProfile()`'s `supabase.from('profiles').select('*').single()`
 * previously destructured only `{ data: profile }`, never checking `error`.
 * A real Postgres-level failure (or, with `.single()`, a genuinely missing
 * row) resolved `profile` to `null`/`undefined`, silently rendering blank
 * fields — and `loaded` was still set to `true`, so the existing
 * `onDataChange` gate (unlike AboutForm, this one already had one) reported
 * that blank state as if it were real, letting IdentityDrawer's `handleSave`
 * overwrite `handle`/`avatarUrl`/offsets/`longevityArchetype` (none of which
 * have IdentityDrawer's `displayName` guard) with blanks.
 *
 * Fixed:
 * 1. `error` is now destructured and logged via `console.error`.
 * 2. A new `onLoadStatusChange` callback reports whether the load actually
 *    succeeded, which IdentityDrawer.tsx uses to refuse a save. Any error —
 *    including PGRST116 — counts as failure here: a user's profile row is
 *    created on signup and should always exist, so a missing row is itself
 *    a signal something is wrong, not a legitimate empty case.
 *
 * IdentityForm.tsx has no existing render-test harness for this effect
 * chain; per this repo's own established pattern, this pins the fix at the
 * source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'IdentityForm.tsx'), 'utf8');

describe('IdentityForm — loadProfile() error logging', () => {
  it('destructures `error` from the profiles query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: profile, error \} = await supabase\s*\n\s*\.from\('profiles'\)/
    );
  });

  it('logs the error and reports load failure before touching form state', () => {
    const idx = SRC.indexOf("const { data: profile, error } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 1000);

    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain("console.error('[IdentityForm] Error loading profile:', error);");
    expect(after).toContain('onLoadStatusChange?.(false);');

    const errIdx = after.indexOf('if (error) {');
    const profileUseIdx = after.indexOf('if (profile) {');
    expect(profileUseIdx).toBeGreaterThan(errIdx);
  });

  it('does NOT exclude PGRST116 in the actual guard — any error blocks save, since the row should always exist', () => {
    // The explanatory comment is allowed to mention PGRST116; what must NOT
    // exist is an actual code check that excludes it, e.g.
    // `error && error.code !== 'PGRST116'` (the pattern this repo's other
    // .single() call sites use to permit a legitimate "no rows" case).
    expect(SRC).not.toMatch(/error\s*&&\s*error\.code\s*!==\s*'PGRST116'/);
    expect(SRC).not.toMatch(/error\?\.code\s*!==\s*'PGRST116'/);
  });

  it('reports load success only after a clean read', () => {
    const idx = SRC.indexOf('if (profile) {');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);
    expect(after).toContain('setLoaded(true);');
    expect(after).toContain('onLoadStatusChange?.(true);');
  });

  it('reports load failure from loadProfile\'s own catch block', () => {
    const fnIdx = SRC.indexOf('const loadProfile = async () => {');
    const nextFnIdx = SRC.indexOf('const uploadFile = async');
    expect(fnIdx).toBeGreaterThan(-1);
    expect(nextFnIdx).toBeGreaterThan(fnIdx);
    const fnBody = SRC.slice(fnIdx, nextFnIdx);

    expect(fnBody).toContain('} catch (error) {');
    const catchIdx = fnBody.indexOf('} catch (error) {');
    const after = fnBody.slice(catchIdx, catchIdx + 200);
    expect(after).toContain('onLoadStatusChange?.(false);');
  });
});
