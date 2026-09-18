/**
 * VTID-03989 — full mobile adaptation of the org-admin journey. Source-check
 * pattern (matching `sidebar.rtl.test.ts` / the Phase C suites) for the
 * layout decisions that need a browser to exercise; the pure pieces
 * (`slugifyOrgKey`) have real unit tests in `commerce-host.slug.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RegisterOrgDialog on mobile (VTID-03989)', () => {
  const src = read('src/components/commerce/RegisterOrgDialog.tsx');

  it('renders through ResponsiveDialog (bottom sheet under md), not the centered Dialog', () => {
    expect(src).toContain('<ResponsiveDialogContent');
    expect(src).toContain('<ResponsiveDialogFooter');
    expect(src).not.toContain("from '@/components/ui/dialog'");
  });

  it('proposes org_key from the business name until the owner edits the key by hand', () => {
    expect(src).toContain('slugifyOrgKey(display_name)');
    expect(src).toContain('keyTouched ? f.org_key : slugifyOrgKey(display_name)');
    expect(src).toContain('setKeyTouched(true)');
  });
});

describe('PartnerOrgRoster on mobile (VTID-03989)', () => {
  const src = read('src/components/commerce/PartnerOrgRoster.tsx');

  it('dual-renders both tables: desktop table + stacked mobile cards', () => {
    expect(src.match(/hidden md:block/g)?.length).toBe(2);
    expect(src.match(/flex flex-col gap-2 md:hidden/g)?.length).toBe(2);
  });

  it('maps org_admin to the roleOrgAdmin key (was roleOrg_admin — a raw key leaked into the members list)', () => {
    expect(src).toContain("role.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')");
    expect(src).not.toContain('role.charAt(0).toUpperCase()}${role.slice(1)}');
  });

  it('stacks the invite form vertically below md', () => {
    expect(src).toContain('flex flex-col gap-2 md:flex-row');
  });

  it('hands the invite link to the native share sheet, falling back to the clipboard', () => {
    expect(src).toContain('.share({');
    expect(src).toContain("err.name === 'AbortError'");
    expect(src).toContain('await copyInviteLink(inv)');
  });
});

describe('CommerceShell back affordance (VTID-03989)', () => {
  const src = read('src/components/commerce/CommerceShell.tsx');

  it('shows a mobile-only back link to the app, suppressed on the commerce host', () => {
    // VTID-03999 superseded the back link: inside the phone app the shell IS
    // the app's own chrome (AppLayout: top bar, drawer, business bottom bar),
    // so there is nothing to go "back" to; desktop and the commerce host get
    // a self-contained portal shell wrapping token-styled children — VTID-04055
    // relit that shell light/premium (was dark), same tokens either way.
    expect(src).toContain('const inApp = isMobile && !isCommerceHost();');
    expect(src).toContain('<AppLayout>');
    expect(src).toContain('<div className="min-h-screen bg-background text-foreground">');
    expect(src).not.toContain('to="/home"');
    expect(src).not.toMatch(/className="[^"]*md:hidden"/);
  });
});

describe('CommercePortal hoists "Your organizations" for members (VTID-03989)', () => {
  const src = read('src/pages/CommercePortal.tsx');

  it('renders the section above the agent card only when the user belongs to an org', () => {
    const hoisted = src.indexOf('{hasOrgs && orgsSection}');
    const agent = src.indexOf('<AgentConnectCard />');
    const original = src.indexOf('{!hasOrgs && orgsSection}');
    expect(hoisted).toBeGreaterThan(-1);
    expect(hoisted).toBeLessThan(agent);
    expect(original).toBeGreaterThan(agent);
  });
});

describe('Drawer + Business Hub entry points (VTID-03989)', () => {
  it('drawer config declares the commerce item on /commerce', () => {
    expect(read('src/config/drawer-nav.config.ts')).toContain("{ id: 'commerce',   route: '/commerce',");
  });

  it('SideDrawerNav gates the commerce item on partner-org membership and shows the org role chip', () => {
    const nav = read('src/components/mobile/SideDrawerNav.tsx');
    expect(nav).toContain("!(item.id === 'commerce' && !isPartnerOrgMember)");
    expect(nav).toContain('{orgRoleLabel(primaryOrg.role)} · {primaryOrg.display_name}');
    expect(nav).toContain("if (route === '/commerce') return location.pathname === '/commerce';");
  });

  it('Business Hub snapshot carries the register/open-organizations card on BOTH layouts', () => {
    // Desktop overview and the separate mobile snapshot block in BusinessHub.tsx
    // are different trees — the card has to be in each, or phones never see it.
    expect(read('src/components/business/BusinessHubOverview.tsx')).toContain('<CommercePartnerCard />');
    const hub = read('src/pages/BusinessHub.tsx');
    expect(hub).toContain('<CommercePartnerCard />');
    expect(hub.indexOf('<CommercePartnerCard />')).toBeGreaterThan(hub.indexOf('mobileTab === "snapshot"'));
    const card = read('src/components/business/CommercePartnerCard.tsx');
    expect(card).toContain('to="/commerce"');
    expect(card).toContain('registerAsPartnerTitle');
  });
});
