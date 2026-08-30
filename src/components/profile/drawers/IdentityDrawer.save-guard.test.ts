/**
 * IdentityDrawer.tsx — refuses to save when the initial profile load never
 * succeeded.
 *
 * `handleSave` only guarded against a blank `displayName` — `handle`,
 * `avatarUrl`, the avatar offsets, and `longevityArchetype` had no such
 * guard, so a failed IdentityForm load (see the sibling
 * IdentityForm.load-guard.test.ts) followed by a save with a non-empty
 * displayName would still silently wipe those fields.
 *
 * Fixed: IdentityDrawer now tracks `loadSucceeded` (fed by IdentityForm's
 * new `onLoadStatusChange` callback) and `handleSave` refuses to run —
 * before even reaching the existing displayName check — unless the load
 * actually succeeded.
 *
 * IdentityDrawer.tsx has no existing render-test harness; per this repo's
 * own established pattern, this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'IdentityDrawer.tsx'), 'utf8');

describe('IdentityDrawer — refuses to save on a failed/never-settled load', () => {
  it('tracks a loadSucceeded flag, defaulting to false', () => {
    expect(SRC).toContain('const [loadSucceeded, setLoadSucceeded] = useState(false);');
  });

  it('wires IdentityForm\'s onLoadStatusChange to loadSucceeded', () => {
    expect(SRC).toContain(
      '<IdentityForm onDataChange={setFormData} onLoadStatusChange={setLoadSucceeded} />'
    );
  });

  it('handleSave checks loadSucceeded before the existing displayName guard', () => {
    const idx = SRC.indexOf('const handleSave = async () => {');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);

    const loadGuardIdx = after.indexOf('if (!loadSucceeded) {');
    const nameGuardIdx = after.indexOf("if (!formData.displayName.trim()) {");
    expect(loadGuardIdx).toBeGreaterThan(-1);
    expect(nameGuardIdx).toBeGreaterThan(loadGuardIdx);
  });

  it('the load guard returns early without calling the Supabase update', () => {
    const idx = SRC.indexOf('if (!loadSucceeded) {');
    const after = SRC.slice(idx, idx + 400);
    expect(after).toContain('return;');
    expect(after).toContain('toast({');
  });
});
