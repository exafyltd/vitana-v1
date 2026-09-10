/**
 * DancePreferencesDrawer.tsx — load error visibility + save-safety gate.
 *
 * The load effect's `supabase.from("profiles").select("dance_preferences")
 * .maybeSingle()` previously destructured only `{ data }`, never checking
 * `error`. A real DB failure resolved `data` to `null`, indistinguishable
 * from "this user genuinely has no dance preferences yet" — so every
 * preference field silently reset to its empty default. `handleSave` has
 * no guard against saving an all-empty payload derived from a failed load,
 * so a failed-load-then-save would silently wipe the user's real
 * preferences.
 *
 * Fixed:
 * 1. `error` is now destructured and logged via `console.error`; on error
 *    the load bails out before touching any of the preference state
 *    (leaving the drawer's still-empty initial state untouched, same as
 *    before — no new blanking behavior added).
 * 2. A `loadSucceeded` flag (reset false at the start of every load
 *    attempt, set true only after a clean read) gates `handleSave` — a
 *    failed/never-settled load refuses to save.
 *
 * DancePreferencesDrawer.tsx has no existing render-test harness (Drawer +
 * Supabase + AuthProvider/ProfileProvider entanglement); per this repo's
 * own established pattern, this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'DancePreferencesDrawer.tsx'), 'utf8');

describe('DancePreferencesDrawer — load error logging + loadSucceeded gate', () => {
  it('declares a loadSucceeded flag, defaulting to false', () => {
    expect(SRC).toContain('const [loadSucceeded, setLoadSucceeded] = useState(false);');
  });

  it('resets loadSucceeded to false at the start of every load attempt', () => {
    const idx = SRC.indexOf('setLoading(true);');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 100);
    expect(after).toContain('setLoadSucceeded(false);');
  });

  it('destructures `error` from the dance_preferences query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data, error \} = await supabase\s*\n\s*\.from\("profiles"\)/
    );
  });

  it('logs the error and bails out before touching preference state', () => {
    const idx = SRC.indexOf('const { data, error } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);

    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain("console.error('[DancePreferencesDrawer] Error loading dance preferences:', error);");

    const errIdx = after.indexOf('if (error) {');
    const returnIdx = after.indexOf('return;', errIdx);
    const prefsIdx = after.indexOf('const prefs: DancePreferences');
    expect(returnIdx).toBeGreaterThan(errIdx);
    expect(returnIdx).toBeLessThan(prefsIdx);
  });

  it('sets loadSucceeded true only after the preference state is populated', () => {
    const idx = SRC.indexOf('const prefs: DancePreferences');
    const after = SRC.slice(idx, idx + 700);
    expect(after).toContain('setLoadSucceeded(true);');
    const setVenueIdx = after.indexOf('setVenuePrefs(');
    const succeededIdx = after.indexOf('setLoadSucceeded(true);');
    expect(succeededIdx).toBeGreaterThan(setVenueIdx);
  });

  it('handleSave refuses to save unless loadSucceeded, before any Supabase call', () => {
    const idx = SRC.indexOf('const handleSave = async () => {');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);

    expect(after).toMatch(/if \(!loadSucceeded\) \{/);
    const guardIdx = after.indexOf('if (!loadSucceeded) {');
    const setSavingIdx = after.indexOf('setSaving(true);');
    expect(setSavingIdx).toBeGreaterThan(guardIdx);

    const guardBlock = after.slice(guardIdx, setSavingIdx);
    expect(guardBlock).toContain('return;');
    expect(guardBlock).toContain("notifyError('toasts.profile.couldNotSavePreferences');");
  });
});
