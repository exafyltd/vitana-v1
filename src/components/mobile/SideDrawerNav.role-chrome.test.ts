/**
 * VTID-03993 — source-check for the role-aware drawer: the header pill opens
 * the switcher, non-community modes render the role's own navigation from
 * role-navigation.ts plus the cross-mode rows and an explicit way back to
 * Community. Same pattern as the sibling drawer suites.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('SideDrawerNav role chrome (VTID-03993)', () => {
  const nav = read('src/components/mobile/SideDrawerNav.tsx');

  it('uses the shared switch hook and the sheet, opened from the header pill', () => {
    expect(nav).toContain("import { useRoleSwitch } from '@/hooks/useRoleSwitch';");
    expect(nav).toContain('<RoleSwitcherSheet');
    expect(nav).toContain('setRoleSheetOpen(true)');
    expect(nav).toContain('{roleSwitch.canSwitch && (');
  });

  it('renders the role navigation in a non-community mode, community rows otherwise', () => {
    expect(nav).toContain("if (dbRole === 'community' || dbRole === 'backoffice') return communityRows;");
    expect(nav).toContain('getRoleNavigation(dbRole)');
    expect(nav).toContain("action: 'switch-community'");
    expect(nav).toContain("await roleSwitch.switchRole('community');");
  });

  it('keeps the org axis and logout in every mode', () => {
    expect(nav).toContain("const CROSS_MODE_IDS = ['commerce', 'patient-results', 'health-orders', 'support', 'settings', 'logout'];");
  });

  it('ProfileDrawer shares the hook and no longer ships raw English role labels', () => {
    const profile = read('src/components/profile/ProfileDrawer.tsx');
    expect(profile).toContain("import { useRoleSwitch } from '@/hooks/useRoleSwitch';".replace(/'/g, '"'));
    expect(profile).not.toContain('const ROLE_LABELS');
    expect(profile).toContain('<RoleSwitcherSheet');
  });
});
