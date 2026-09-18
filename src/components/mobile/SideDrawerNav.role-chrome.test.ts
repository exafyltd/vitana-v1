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

  it('shows the mode as a chip and the switch as a labelled CTA next to it (VTID-04041)', () => {
    // The chip is information (a <span>, not a button); the CTA is the one
    // interactive element and carries the visible "Rolle wechseln" label.
    const chipLabel = nav.indexOf("<span className=\"sr-only\">{t('screens.mobile.currentMode')}: </span>");
    const cta = nav.indexOf("aria-label={t('screens.profile.switchRole')}");
    const ctaText = nav.indexOf("<span>{t('screens.profile.switchRole')}</span>");
    expect(chipLabel).toBeGreaterThan(-1);
    expect(cta).toBeGreaterThan(chipLabel);
    expect(ctaText).toBeGreaterThan(cta);
    expect(nav).toContain('ArrowLeftRight');
    expect(nav).not.toContain('ChevronDown');
    // Chip + CTA share one wrapping row so long locales fall to a second line
    // instead of overflowing the 390px column.
    expect(nav).toContain('<div className="flex max-w-full flex-wrap items-center gap-1.5">');
    // The chip's dot borrows the mode's row tone; Community falls back.
    expect(nav).toContain("const modeTone = roleTone ?? drawerNavIconTones['switch-community'];");
  });

  it('the switcher sheet names the active mode above the list (VTID-04041)', () => {
    const sheet = read('src/components/mobile/RoleSwitcherSheet.tsx');
    expect(sheet).toContain("t('screens.mobile.currentModeIs', { role: currentModeLabel })");
    expect(sheet).toContain('`${t(businessRoleLabelKey(activeBusiness.role))} · ${activeBusiness.orgName}`');
  });

  it('ProfileDrawer shares the hook and no longer ships raw English role labels', () => {
    const profile = read('src/components/profile/ProfileDrawer.tsx');
    expect(profile).toContain("import { useRoleSwitch } from '@/hooks/useRoleSwitch';".replace(/'/g, '"'));
    expect(profile).not.toContain('const ROLE_LABELS');
    expect(profile).toContain('<RoleSwitcherSheet');
    // VTID-04041: same chip + CTA pair as the drawer header on mobile.
    expect(profile).toContain("<span>{t('screens.profile.switchRole')}</span>");
    expect(profile).toContain('ArrowLeftRight');
    expect(profile).not.toContain('ChevronDown');
  });
});
