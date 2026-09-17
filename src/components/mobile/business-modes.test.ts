/**
 * VTID-03999 — source-check for the business modes on mobile: the switcher
 * sheet offers business memberships as a second group, the drawer and the
 * bottom bar follow the active business on business routes, the commerce
 * shell is the app's own chrome on a phone (dark portal elsewhere), and the
 * two writes that create a membership land the user in business mode. Same
 * pattern as the sibling drawer suites; the pure helpers have real unit
 * tests in src/lib/business-mode.test.ts.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('business modes on mobile (VTID-03999)', () => {
  const hook = read('src/hooks/useRoleSwitch.ts');
  const sheet = read('src/components/mobile/RoleSwitcherSheet.tsx');
  const nav = read('src/components/mobile/SideDrawerNav.tsx');
  const bottom = read('src/components/mobile/MobileBottomNav.tsx');
  const shell = read('src/components/commerce/CommerceShell.tsx');
  const app = read('src/App.tsx');

  it('the switch hook offers business entries and never writes a role for them', () => {
    expect(hook).toContain("import { useBusinessMode } from '@/hooks/useBusinessMode';");
    expect(hook).toContain('canSwitch: availableRoles.length > 1 || businessEntries.length > 0,');
    expect(hook).toContain('switchToBusiness: business.enterBusinessMode,');
    // The business switch is a navigation: setRole is only called from switchRole.
    expect(hook.split('setRole(').length - 1).toBe(1);
  });

  it('the sheet renders a second radiogroup for the businesses and checks exactly one entry', () => {
    expect(sheet).toContain("t('screens.mobile.businessModesTitle')");
    expect(sheet).toContain('active={!inBusiness && role === activeRole}');
    expect(sheet).toContain('active={activeBusinessOrgId === entry.orgId}');
    expect(sheet).toContain('label={t(businessRoleLabelKey(entry.role))}');
    expect(sheet).toContain('subtitle={entry.orgName}');
  });

  it('the open sheet hides the ORB button and bottom bar so its last entry is tappable', () => {
    expect(sheet).toContain("document.body.dataset.drawerOpen = 'true';");
    expect(sheet).toContain('delete document.body.dataset.drawerOpen;');
    expect(sheet).toContain('}, [open, isMobile]);');
  });

  it('the drawer takes the business branch before the Vitana-mode branches and keeps the way back', () => {
    expect(nav).toContain('if (inBusinessMode && business.activeOrg) {');
    expect(nav.indexOf('if (inBusinessMode && business.activeOrg) {')).toBeLessThan(
      nav.indexOf("if (dbRole === 'community' || dbRole === 'backoffice') return communityRows;"),
    );
    expect(nav).toContain('businessDrawerItems(business.activeOrg.role)');
    expect(nav).toContain("if (inBusinessMode && dbRole === 'community') {\n        navigate('/home');");
    expect(nav).toContain('t(businessRoleLabelKey(business.activeOrg.role))');
    expect(nav).toContain('businessEntries={roleSwitch.businessEntries}');
    expect(nav).toContain('const active = isActive(item.route, item.exact);');
  });

  it('the bottom bar shows the business role bar on business routes and keeps the VTID-03968 hide otherwise', () => {
    expect(bottom).toContain('resolveBusinessBottomNav(business.activeOrg.role)');
    expect(bottom).toContain('const items = businessItems ?? roleItems ?? navItems;');
    expect(bottom).toContain('(businessItems === null && roleItems === null && roleSectionRoutes.some(matchesRoute))');
    expect(bottom).toContain('end={exact}');
  });

  it('the commerce shell is the app chrome on a phone and the dark portal elsewhere', () => {
    expect(shell).toContain('const inApp = isMobile && !isCommerceHost();');
    expect(shell).toContain("import AppLayout from '@/components/AppLayout';");
    expect(shell).toContain("portalClass: inApp ? '' : 'dark'");
    expect(shell).toContain('<div className="dark min-h-screen bg-slate-950 text-slate-100">');
  });

  it('joining or registering a business lands in its business mode, on the role home', () => {
    const accept = read('src/pages/CommerceAcceptInvite.tsx');
    expect(accept).toContain('if (orgId) setActiveOrgId(orgId);');
    expect(accept).toContain("navigate(orgId ? businessHomeFor(res?.role ?? 'staff') : '/commerce', { replace: true });");
    const portal = read('src/pages/CommercePortal.tsx');
    expect(portal).toContain('onCreated={onOrgRegistered}');
    expect(portal).toContain("navigate(businessHomeFor('org_admin'));");
    const dialog = read('src/components/commerce/RegisterOrgDialog.tsx');
    expect(dialog).toContain("await onCreated(org ? { ...org, role: 'org_admin' } : null);");
  });

  it('the two business routes exist and are gated like every /commerce/* route (AuthGuard, no dbRole)', () => {
    expect(app).toContain('<Route path="/commerce/health-orders/inbox" element={<AuthGuard><CommerceHealthOrders /></AuthGuard>} />');
    expect(app).toContain('<Route path="/commerce/team" element={<AuthGuard><CommerceTeam /></AuthGuard>} />');
    expect(read('src/pages/CommerceHealthOrders.tsx')).toContain("useLocation().pathname.endsWith('/inbox') ? 'inbox' : 'orders'");
  });
});
