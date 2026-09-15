/**
 * AboutDrawer.tsx — refuses to save when the initial profile load never
 * succeeded.
 *
 * `handleSave` had zero required-field validation and unconditionally
 * `.update()`d `profiles` with whatever was in `formData`. Combined with
 * AboutForm's previously-ungated `onDataChange` (see the sibling
 * AboutForm.load-guard.test.ts), a transient read failure followed by any
 * save would silently wipe the user's real bio/location/links/languages.
 *
 * Fixed: AboutDrawer now tracks `loadSucceeded` (fed by AboutForm's new
 * `onLoadStatusChange` callback) and `handleSave` refuses to run — showing
 * an error toast and leaving the drawer open — unless the load actually
 * succeeded.
 *
 * AboutDrawer.tsx has no existing render-test harness (Dialog + Supabase +
 * ProfileProvider entanglement); per this repo's own established pattern,
 * this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'AboutDrawer.tsx'), 'utf8');

describe('AboutDrawer — refuses to save on a failed/never-settled load', () => {
  it('tracks a loadSucceeded flag, defaulting to false', () => {
    expect(SRC).toContain('const [loadSucceeded, setLoadSucceeded] = useState(false);');
  });

  it('wires AboutForm\'s onLoadStatusChange to loadSucceeded', () => {
    expect(SRC).toContain(
      '<AboutForm onDataChange={setFormData} onLoadStatusChange={setLoadSucceeded} />'
    );
  });

  it('handleSave checks loadSucceeded before doing anything else', () => {
    const idx = SRC.indexOf('const handleSave = async () => {');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);
    expect(after).toMatch(/if \(!loadSucceeded\) \{/);

    const guardIdx = after.indexOf('if (!loadSucceeded) {');
    const setSavingIdx = after.indexOf('setSaving(true);');
    expect(guardIdx).toBeGreaterThan(-1);
    // The guard must come before the try block that starts the actual save.
    expect(setSavingIdx).toBeGreaterThan(guardIdx);
  });

  it('the guard returns early without calling the Supabase update', () => {
    const idx = SRC.indexOf('if (!loadSucceeded) {');
    const after = SRC.slice(idx, idx + 400);
    expect(after).toContain('return;');
    expect(after).toContain("toast({");
  });
});
