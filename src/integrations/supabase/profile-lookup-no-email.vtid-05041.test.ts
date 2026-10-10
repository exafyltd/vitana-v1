/**
 * VTID-05041 (Track S / S2) — the public profile lookup never returns email.
 *
 * get_user_profile_by_identifier(text) is SECURITY DEFINER and granted to
 * anon: visitors resolve a member by handle, vitana_id or user UUID on the
 * public profile page. Until VTID-05041 it also returned `p.email` for every
 * visible member, so anyone without signing in could read members' emails.
 * The fix is the vitana-platform migration
 * `20261010164100_vtid_05041_definer_functions_lockdown.sql` (same body as
 * this repo's 20260721124500 migration, minus `email`). This mirror guard:
 *  - fails the build if a migration in this repo newer than 20260721124500
 *    (the last definition here) creates/replaces the function with `email`
 *    in its RETURNS TABLE,
 *  - pins the generated RPC type and the callers without `email`.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../..');
const MIGRATIONS = join(ROOT, 'supabase/migrations');
// The last definition shipped from this repo (still with email); the live
// function is now owned by the vitana-platform VTID-05041 migration.
const LAST_DEFINITION = '20260721124500_public_profile_rpc_default_account_type_verification.sql';
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('get_user_profile_by_identifier returns no email (VTID-05041)', () => {
  it('no migration newer than the last definition puts email back into the return shape', () => {
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'));
    expect(files).toContain(LAST_DEFINITION);
    for (const f of files.filter((n) => n > LAST_DEFINITION)) {
      const sql = readFileSync(join(MIGRATIONS, f), 'utf8').replace(/--[^\n]*/g, '');
      const m = sql.match(/FUNCTION\s+(public\.)?get_user_profile_by_identifier\s*\([^)]*\)\s*RETURNS\s+TABLE\s*\(([^)]*)\)/i);
      if (m) expect({ file: f, returns: m[2] }).toEqual({ file: f, returns: expect.not.stringMatching(/\bemail\b/i) });
    }
  });

  it('the generated RPC type has no email', () => {
    const types = read('src/integrations/supabase/types.ts');
    const start = types.indexOf('      get_user_profile_by_identifier: {');
    expect(start).toBeGreaterThan(-1);
    const block = types.slice(start, types.indexOf('}[]', start));
    expect(block).toContain('display_name: string');
    expect(block).not.toMatch(/\bemail\b/);
  });

  it('no caller reads email from the lookup', () => {
    const page = read('src/pages/PublicProfilePage.tsx');
    const iface = page.slice(page.indexOf('interface DatabaseProfile {'), page.indexOf('}', page.indexOf('interface DatabaseProfile {')));
    expect(iface).toContain('display_name: string;');
    expect(iface).not.toMatch(/\bemail\b/);
    for (const p of ['src/pages/PublicProfilePage.tsx', 'src/components/profile/ProfilePreviewDialog.tsx', 'src/hooks/useRealMatches.ts']) {
      const src = read(p);
      expect(src).toContain('get_user_profile_by_identifier');
      expect({ file: p, readsEmail: /\.email\b/.test(src) }).toEqual({ file: p, readsEmail: false });
    }
  });
});
