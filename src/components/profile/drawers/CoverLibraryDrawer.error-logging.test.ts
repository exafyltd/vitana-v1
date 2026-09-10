/**
 * CoverLibraryDrawer.tsx — load-effect error visibility (log-only).
 *
 * The hand-typed `sb` Supabase wrapper used for the `profiles`/
 * `user_intent_cover_library` reads dropped `error` from its return type
 * signature entirely (`Promise<{ data: unknown }>`), so a real DB failure
 * was structurally invisible even though the underlying client always
 * resolves `{ data, error }`. This is a read-only picker with an
 * already-acknowledged "soft-fail" comment (the drawer opens with empty
 * state regardless), so the fix is log-only: widen the wrapper type to
 * include `error`, destructure it for both queries, and log via
 * `console.error` before falling back to the unchanged empty-state
 * defaults.
 *
 * CoverLibraryDrawer.tsx has no existing render-test harness for this load
 * effect; per this repo's own established pattern, this pins the fix at
 * the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'CoverLibraryDrawer.tsx'), 'utf8');

describe('CoverLibraryDrawer — load effect error logging', () => {
  it('the hand-typed wrapper includes `error` in both return type signatures', () => {
    expect(SRC).toContain('maybeSingle: () => Promise<{ data: unknown; error: unknown }>;');
    expect(SRC).toMatch(
      /order: \(\s*\n\s*col: string,\s*\n\s*opts: \{ ascending: boolean \},\s*\n\s*\) => Promise<\{ data: unknown; error: unknown \}>;/
    );
  });

  it('destructures `error` for both the profile and library-rows queries', () => {
    expect(SRC).toContain('{ data: profile, error: profileError },');
    expect(SRC).toContain('{ data: rows, error: rowsError },');
  });

  it('logs both errors before falling back to the unchanged empty-state defaults', () => {
    const idx = SRC.indexOf('if (cancelled) return;', SRC.indexOf('await Promise.all(['));
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 800);

    expect(after).toMatch(/if \(profileError\) \{/);
    expect(after).toContain("console.error('[CoverLibraryDrawer] Failed to load universal_intent_cover_url:', profileError);");
    expect(after).toMatch(/if \(rowsError\) \{/);
    expect(after).toContain("console.error('[CoverLibraryDrawer] Failed to load cover library rows:', rowsError);");

    // Unchanged fallback shape — still soft-fails to empty state.
    expect(after).toContain('?.universal_intent_cover_url ?? null,');
    expect(after).toContain('setLibraryRows((rows ?? []) as LibraryRow[]);');

    const profileErrIdx = after.indexOf('if (profileError) {');
    const rowsErrIdx = after.indexOf('if (rowsError) {');
    const useIdx = after.indexOf('setLibraryRows((rows ?? []) as LibraryRow[]);');
    expect(useIdx).toBeGreaterThan(profileErrIdx);
    expect(useIdx).toBeGreaterThan(rowsErrIdx);
  });
});
