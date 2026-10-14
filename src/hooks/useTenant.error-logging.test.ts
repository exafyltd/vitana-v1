/**
 * useTenant.tsx — tenant resolution error visibility.
 *
 * Originally (pre-VTID-05151) three `.from('tenants')` call sites, two of
 * which destructured only `{ data }`, so a failed lookup left a member
 * silently outside their tenant. VTID-05151 moved slug→id resolution to the
 * tenant registry (list_public_tenants); what remains must stay loud:
 *
 *   1. Every remaining `.from('tenants')` call site destructures `error`.
 *   2. The deterministic fallback's tenants lookup (only for the compiled
 *      Maxina fallback, which has no id) logs its error before applying the
 *      data-present check.
 *   3. setTenantBySlug logs a refused switch and never falls back to a local
 *      lookup that would set a tenant the server refused (the old
 *      `select('tenant_id, name')` branch is gone).
 *   4. A failed registry call says so (`[tenant-registry] fallback`).
 *
 * Pinned at the source level, matching this file's original precedent; the
 * behaviour is covered by useTenant.registry.test.tsx.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useTenant.tsx'), 'utf8');
const REGISTRY_HOOK = readFileSync(join(__dirname, 'useTenantRegistry.ts'), 'utf8');

describe('useTenant — tenants query error logging', () => {
  it('every `.from(\'tenants\')` call site destructures `error`, not just `data`', () => {
    const callSites = [...SRC.matchAll(/\.from\('tenants'\)/g)];
    expect(callSites.length).toBe(2);
    for (const site of callSites) {
      const before = SRC.slice(Math.max(0, site.index! - 150), site.index!);
      expect(before).toMatch(/const \{\s*data(?:: \w+)?,\s*error(?::\s*\w+)?\s*\}\s*=\s*await supabase\s*$/);
    }
  });

  it('the deterministic-fallback resolveTenant() logs its error before applying the data-present check', () => {
    const idx = SRC.indexOf("select('tenant_id')\n              .eq('slug', fallbackSlug)");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.warn(');
    expect(after).toContain('if (data && tenantVersionRef.current === version)');
  });

  it('setTenantBySlug logs a refused switch and has no local fallback lookup', () => {
    expect(SRC).not.toContain("select('tenant_id, name')");
    expect(SRC).not.toContain('using local fallback');
    const idx = SRC.indexOf("supabase.rpc('switch_to_tenant_by_slug'");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 600);
    expect(after).toMatch(/if \(error\) \{\s*console\.warn\(/);
    expect(after).toMatch(/return \{\s*ok: false,/);
  });

  it('a failed registry call is logged, not swallowed', () => {
    expect(REGISTRY_HOOK).toContain("console.warn('[tenant-registry] fallback', err);");
  });
});
