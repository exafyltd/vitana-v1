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

  it('places the pill (and org chip) in the text column under name/handle, outside the profile button (VTID-03997)', () => {
    // The block is indented to the text column: avatar w-9 (36px) + gap-3 (12px) = ms-12.
    expect(nav).toContain('<div className="ms-12 mt-1.5 flex min-w-0 flex-col items-start gap-1">');
    // Not nested inside the profile <button> — the pill appears only after it closes.
    const profileBtn = nav.indexOf('onClick={handleProfileClick}');
    const profileBtnEnd = nav.indexOf('</button>', profileBtn);
    const pill = nav.indexOf("aria-label={t('screens.profile.switchRole')}");
    const chip = nav.indexOf('{orgRoleLabel(primaryOrg.role)} · {primaryOrg.display_name}');
    expect(profileBtn).toBeGreaterThan(-1);
    expect(pill).toBeGreaterThan(profileBtnEnd);
    expect(chip).toBeGreaterThan(pill);
    expect(nav).not.toContain('mt-2 inline-flex max-w-full items-center gap-1 rounded-full');
  });

  it('ProfileDrawer shares the hook and no longer ships raw English role labels', () => {
    const profile = read('src/components/profile/ProfileDrawer.tsx');
    expect(profile).toContain("import { useRoleSwitch } from '@/hooks/useRoleSwitch';".replace(/'/g, '"'));
    expect(profile).not.toContain('const ROLE_LABELS');
    expect(profile).toContain('<RoleSwitcherSheet');
  });
});
