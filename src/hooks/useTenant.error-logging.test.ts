/**
 * useTenant.tsx — tenant-slug resolution error-visibility fix.
 *
 * Two `.from('tenants')` call sites destructured only `{ data }`:
 *
 *   1. The deterministic-fallback `resolveTenant()` closure (inside a
 *      useEffect) — a query failure previously left the branch entirely
 *      silent, so a user landing on a tenant-specific route/URL would
 *      never get switched into that tenant's context.
 *   2. `setTenantBySlug()`'s local-resolution fallback — called from
 *      TenantDetector on every route change plus every portal-
 *      confirmation page (MaxinaConfirmed, AlkalmaConfirmed,
 *      EarthlinksPortal, etc.). Unlike the RPC branch two lines above it
 *      (which does console.warn on failure), this branch had no error
 *      captured at all.
 *
 * A third `.from('tenants')` call site (the `tenantData` useQuery) was
 * already correct — it destructures `error` and `throw`s it — and is
 * unchanged.
 *
 * Pinned at the source level — this is a context/hook file with
 * localStorage, react-query, and auth-context entanglement and no
 * existing render-test harness, matching this repo's
 * IntroExperience.orb-placement.test.ts precedent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useTenant.tsx'), 'utf8');

describe('useTenant — tenants table query error logging', () => {
  it('every `.from(\'tenants\')` call site destructures `error`, not just `data`', () => {
    const callSites = [...SRC.matchAll(/\.from\('tenants'\)/g)];
    expect(callSites.length).toBe(3);

    // For each call site, the destructuring pattern lives on the line(s)
    // immediately preceding it in source order.
    for (const site of callSites) {
      const before = SRC.slice(Math.max(0, site.index! - 150), site.index!);
      expect(before).toMatch(/const \{\s*data(?:: \w+)?,\s*error(?::\s*\w+)?\s*\}\s*=\s*await supabase\s*$/);
    }
  });

  it('the deterministic-fallback resolveTenant() logs its error before applying the unchanged data-present check', () => {
    const idx = SRC.indexOf("select('tenant_id')\n              .eq('slug', fallbackSlug)");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(error\) \{/);
    expect(after).toContain('console.warn(');
    expect(after).toContain('if (data && tenantVersionRef.current === version)');
  });

  it('setTenantBySlug()\'s local-resolution fallback logs its error before applying the unchanged data-present check', () => {
    const idx = SRC.indexOf("select('tenant_id, name')");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(resolveErr\) \{/);
    expect(after).toContain('console.warn(');
    expect(after).toContain('if (data) {');
  });
});
