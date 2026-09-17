/**
 * VTID-03976 — Phase C2/C3: two new drawer-nav entries, each gated on the
 * axis that actually controls access to the page behind it, not a
 * convenient-but-wrong stand-in:
 *
 * - `/patient/results` is gated on real `dbRole !== 'community'` (matching
 *   `ProtectedRoute`'s own guard, which already reads `dbRole` — see
 *   `useRole.tsx`'s header comment on why `effectiveRole`/`currentRole`
 *   would be wrong here).
 * - `/commerce/health-orders` is gated on active
 *   `partner_organization_members` membership via `useMyPartnerOrgs()`,
 *   NOT `dbRole` — an org's own assigned-only `professional` member may
 *   never have been promoted to Vitana-wide `dbRole==='professional'`
 *   (see `CommerceHealthOrders.tsx`'s own header comment for the same
 *   distinction), so gating this item on `dbRole` would hide it from
 *   exactly the users it exists for.
 *
 * Source-check pattern, matching this repo's established precedent
 * (`sidebar.rtl.test.ts`) for pinning a filter/gating decision without a
 * full render harness.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const NAV_SRC = readFileSync(resolve(process.cwd(), 'src/components/mobile/SideDrawerNav.tsx'), 'utf8');
const CONFIG_SRC = readFileSync(resolve(process.cwd(), 'src/config/drawer-nav.config.ts'), 'utf8');

describe('SideDrawerNav new entries (VTID-03976)', () => {
  it('drawer-nav.config.ts declares both new items with distinct ids/routes', () => {
    expect(CONFIG_SRC).toContain("{ id: 'patient-results', route: '/patient/results'");
    expect(CONFIG_SRC).toContain("{ id: 'health-orders', route: '/commerce/health-orders'");
  });

  it('SideDrawerNav imports useMyPartnerOrgs and derives membership from it', () => {
    expect(NAV_SRC).toContain("import { useMyPartnerOrgs } from '@/hooks/useOrgMembers';");
    expect(NAV_SRC).toContain('const isPartnerOrgMember = (myPartnerOrgsQuery.data?.length ?? 0) > 0;');
  });

  it('patient-results is filtered on dbRole, not org membership', () => {
    expect(NAV_SRC).toContain("!(item.id === 'patient-results' && dbRole === 'community')");
  });

  it('health-orders is filtered on partner-org membership, not dbRole', () => {
    expect(NAV_SRC).toContain("!(item.id === 'health-orders' && !isPartnerOrgMember)");
    // Guard against a regression that gates it on dbRole instead — that
    // would hide it from an assigned-only professional with no elevated
    // Vitana-wide role, which is exactly the case this item exists for.
    expect(NAV_SRC).not.toMatch(/item\.id === 'health-orders' && dbRole/);
  });

  it('the pre-existing IAP-restricted wallet filter survives alongside the two new ones', () => {
    expect(NAV_SRC).toContain("!(isIAPRestricted() && item.id === 'wallet')");
  });
});
