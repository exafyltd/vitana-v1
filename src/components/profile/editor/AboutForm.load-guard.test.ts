/**
 * AboutForm.tsx — loadProfile() error visibility + save-safety gate.
 *
 * `loadProfile()`'s `supabase.from('profiles').select(...).maybeSingle()`
 * previously destructured only `{ data: profile }`, never checking `error`.
 * A real Postgres-level failure resolves `profile` to `null` — indistinguishable
 * from "this user genuinely has no bio/location/links/languages yet" — and the
 * form would silently render blank.
 *
 * Worse: the `onDataChange` effect fired on EVERY render with no "loaded" gate
 * (unlike the sibling IdentityForm, which already has one), so that blank
 * state was immediately reported up to AboutDrawer's `formData` — and
 * AboutDrawer's `handleSave` has zero required-field validation, so a save
 * right after a failed load would silently overwrite the user's real profile
 * data with blanks.
 *
 * Fixed:
 * 1. `error` is now destructured and logged via `console.error`.
 * 2. A `loaded` gate (matching IdentityForm's existing pattern) blocks
 *    `onDataChange` until the load has actually settled.
 * 3. A new `onLoadStatusChange` callback reports whether the load actually
 *    succeeded (no error), which AboutDrawer.tsx uses to refuse a save.
 *
 * AboutForm.tsx has no existing render-test harness for this specific effect
 * chain (auth + supabase + parent callback entanglement); per this repo's own
 * established pattern (see ReportedContentNew.bans-error-logging.test.ts /
 * useCalendarEvents.error-logging-abort.test.ts), this pins the fix at the
 * source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'AboutForm.tsx'), 'utf8');

describe('AboutForm — loadProfile() error logging', () => {
  it('destructures `error` from the profiles query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: profile, error \} = await supabase\s*\n\s*\.from\('profiles' as any\)/
    );
  });

  it('logs the error and reports load failure before touching form state', () => {
    const idx = SRC.indexOf("const { data: profile, error } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 600);

    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain("console.error('[AboutForm] Error loading profile:', error);");
    expect(after).toContain('onLoadStatusChange?.(false);');

    const errIdx = after.indexOf('if (error) {');
    const profileUseIdx = after.indexOf('if (profile) {');
    expect(profileUseIdx).toBeGreaterThan(errIdx);
  });

  it('reports load success only after a clean read', () => {
    const idx = SRC.indexOf('if (profile) {');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 900);
    expect(after).toContain('setLoaded(true);');
    expect(after).toContain('onLoadStatusChange?.(true);');
  });

  it('reports load failure from the catch block too', () => {
    const idx = SRC.lastIndexOf('} catch (error) {');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 200);
    expect(after).toContain('onLoadStatusChange?.(false);');
  });
});

describe('AboutForm — onDataChange is gated on `loaded`', () => {
  it('declares a `loaded` state flag', () => {
    expect(SRC).toContain('const [loaded, setLoaded] = useState(false);');
  });

  it('does not call onDataChange before the initial load has settled', () => {
    const idx = SRC.indexOf('Notify parent of data changes only after');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(loaded && onDataChange\) \{/);
  });

  it('includes `loaded` in the onDataChange effect dependency array', () => {
    expect(SRC).toContain('}, [bio, location, links, languages, onDataChange, loaded]);');
  });
});
