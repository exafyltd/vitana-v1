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
    expect(nav).toContain('roleSwitch.canSwitch ? (');
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

  it('places the pill (and org chip) below the avatar/name row, spanning full width, outside the profile button (VTID-03997)', () => {
    // Un-indented on purpose: at the bigger avatar size, indenting under the
    // text column left too little room for the pill and truncated the role
    // label (e.g. "Exafy-Admin" -> "Exafy-...").
    expect(nav).toContain('<div className="mt-3 flex min-w-0 flex-col items-start gap-1.5">');
    // Not nested inside the profile <button> — the pill appears only after it closes.
    const profileBtn = nav.indexOf('onClick={handleProfileClick}');
    const profileBtnEnd = nav.indexOf('</button>', profileBtn);
    const pill = nav.indexOf('aria-haspopup="dialog"');
    const chip = nav.indexOf('{orgRoleLabel(primaryOrg.role)} · {primaryOrg.display_name}');
    expect(profileBtn).toBeGreaterThan(-1);
    expect(pill).toBeGreaterThan(profileBtnEnd);
    expect(chip).toBeGreaterThan(pill);
    expect(nav).not.toContain('mt-2 inline-flex max-w-full items-center gap-1 rounded-full');
  });

  it('shows the mode as a single dropdown pill — role label + chevron — that opens the switcher', () => {
    // The whole pill is the interactive element (a <button>, not a split
    // chip + separate labelled CTA) — role label and chevron both live
    // inside it, mirroring a native <select>/dropdown affordance.
    const pillButton = nav.indexOf('aria-haspopup="dialog"');
    const pillOnClick = nav.lastIndexOf('openRoleSheet();', pillButton);
    const chevron = nav.indexOf('<ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />');
    expect(pillButton).toBeGreaterThan(-1);
    expect(pillOnClick).toBeGreaterThan(-1);
    expect(chevron).toBeGreaterThan(pillButton);
    expect(nav).toContain('ChevronDown');
    expect(nav).not.toContain('ArrowLeftRight');
    // A non-switchable account still sees the mode as a plain, non-interactive chip.
    expect(nav).toContain('roleSwitch.canSwitch ? (');
    // The sheet names the same mode label the header pill shows.
    expect(nav).toContain('currentModeLabel={roleLabel}');
    // The pill's dot borrows the mode's row tone; Community falls back.
    expect(nav).toContain("const modeTone = roleTone ?? drawerNavIconTones['switch-community'];");
  });

  it('renders a bigger profile avatar than the old compact header — big enough to read as the dominant element next to the name/pill', () => {
    expect(nav).toContain('<Avatar className="h-24 w-24 ring-[3px] ring-white/60 shrink-0">');
    expect(nav).not.toContain('h-9 w-9 ring-1 ring-white/40');
    expect(nav).not.toContain('h-16 w-16 ring-2 ring-white/50');
    // Name/handle scaled up to match — the pill is a roomy control, not a tiny badge.
    expect(nav).toContain('font-bold text-xl tracking-wide truncate');
    expect(nav).toContain('rounded-full px-4 py-2 text-sm font-semibold');
  });

  it('the switcher sheet names the active mode above the list (VTID-04041)', () => {
    const sheet = read('src/components/mobile/RoleSwitcherSheet.tsx');
    expect(sheet).toContain("t('screens.mobile.currentModeIs', { role: activeModeLabel })");
    expect(sheet).toContain('currentModeLabel ?? roleLabel(activeRole)');
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
