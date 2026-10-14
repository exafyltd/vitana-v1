/**
 * VTID-05186 (N3, plan change 3) — the ported shell rules, table-tested with
 * the inputs and expectations of the web tests they mirror
 * (MobileBottomNav.role.test.ts, business-modes.test.ts, SideDrawerNav.*.test.ts,
 * role-switch-destination.test.ts, useRoleSwitch.test.ts, useSmartRouting.mobile.test.ts).
 */
import './helpers/no-network';
import { composeDrawerRows, drawerRowActive, modeTone, type DrawerInput } from '../src/shell/logic/drawer';
import { resolveBottomNav, shouldHideBottomNav, barItemActive } from '../src/shell/logic/bottom-nav';
import { routeGuard } from '../src/shell/logic/route-guard';
import { getInstantTenantName } from '../src/shell/logic/tenant-display';
import { findActiveLabel, initiallyExpandedGroups, type ModeOption } from '../src/shell/logic/mode-pill';
import { FALLBACK_REGISTRY, normalizeEntry, type TenantEntry, type TenantRegistry, CROSS_MODE_IDS, drawerNavIconTones, getRoleSwitchDestination, isExternalRoleSwitchDestination, computeAvailableRoles, resolveRoleBottomNav } from '../src/ports/core';

const REG: TenantRegistry = {
  source: 'rpc',
  tenants: [
    normalizeEntry({ tenant_id: 't-m', slug: 'maxina', name: 'Maxina', display_name: 'Maxina', open_signup: true }) as TenantEntry,
    normalizeEntry({ tenant_id: 't-a', slug: 'alkalma', name: 'AlKalma', display_name: 'AlKalma', open_signup: true }) as TenantEntry,
  ],
};

const base: DrawerInput = { dbRole: 'community', isPatient: false, isPartnerOrgMember: false, iapRestricted: false, business: null };
const ids = (input: Partial<DrawerInput>) => composeDrawerRows({ ...base, ...input }).map((r) => r.id);

describe('drawer rows — community', () => {
  it('lists the community rows with logout last', () => {
    const rows = ids({});
    expect(rows[0]).toBe('journey');
    expect(rows[rows.length - 1]).toBe('logout');
    expect(rows).toContain('wallet');
    expect(rows).not.toContain('patient-results');
    expect(rows).not.toContain('commerce');
    expect(rows).not.toContain('health-orders');
  });

  it('wallet is hidden on iOS only (isIAPRestricted)', () => {
    expect(ids({ iapRestricted: true })).not.toContain('wallet');
    expect(ids({ iapRestricted: false })).toContain('wallet');
  });

  it('patient-results unlocks on the patient_profiles flag (VTID-03988), not org membership', () => {
    expect(ids({ isPatient: true })).toContain('patient-results');
    expect(ids({ isPartnerOrgMember: true })).not.toContain('patient-results');
  });

  it('commerce and health-orders unlock on partner-org membership, not dbRole', () => {
    const rows = ids({ isPartnerOrgMember: true });
    expect(rows).toContain('commerce');
    expect(rows).toContain('health-orders');
    expect(ids({ dbRole: 'backoffice' })).not.toContain('health-orders');
  });

  it('the logout row is an action', () => {
    expect(composeDrawerRows(base).find((r) => r.id === 'logout')?.action).toBe('logout');
  });
});

describe('drawer rows — business mode (the hardcoded cross subset, round-1 F2)', () => {
  it.each([
    ['org_admin', ['business-overview', 'business-team', 'business-orders', 'business-inbox']],
    ['staff', ['business-overview', 'business-orders', 'business-inbox']],
    ['professional', ['business-overview', 'business-orders']],
  ])('%s: business rows, then patient-results/support/settings, the switch row, logout last', (role, bizIds) => {
    for (const isPatient of [false, true]) {
      const rows = composeDrawerRows({ ...base, dbRole: 'community', isPatient, isPartnerOrgMember: true, business: { role } });
      const got = rows.map((r) => r.id);
      expect(got.slice(0, bizIds.length)).toEqual(bizIds);
      expect(got).not.toContain('commerce');
      expect(got).not.toContain('health-orders');
      expect(got.filter((x) => x === 'logout')).toHaveLength(1);
      expect(got[got.length - 1]).toBe('logout');
      expect(got[got.length - 2]).toBe('switch-community');
      expect(got.includes('patient-results')).toBe(isPatient);
      expect(rows.find((r) => r.id === 'business-overview')?.translationKey).toBe('drawerNav.businessOverview');
    }
  });

  it('the business branch wins over a Vitana role mode', () => {
    const got = ids({ dbRole: 'patient', isPatient: true, business: { role: 'staff' } });
    expect(got[0]).toBe('business-overview');
    expect(got.some((x) => x.startsWith('role:'))).toBe(false);
  });
});

describe('drawer rows — role mode (CROSS_MODE_IDS minus role routes)', () => {
  it('patient: the role navigation (no /settings), then cross rows the role nav does not list, switch, logout', () => {
    const rows = composeDrawerRows({ ...base, dbRole: 'patient', isPatient: true, isPartnerOrgMember: true });
    const got = rows.map((r) => r.id);
    expect(got.slice(0, 8)).toEqual([
      'role:/patient/dashboard',
      'role:/patient/health',
      'role:/patient/appointments',
      'role:/patient/results',
      'role:/patient/care-team',
      'role:/patient/goals',
      'role:/patient/insurance',
      'role:/patient/notifications',
    ]);
    // patient-results' route is already a role row, so it is not repeated.
    expect(got.slice(8)).toEqual(['commerce', 'health-orders', 'support', 'settings', 'switch-community', 'logout']);
    const cross = got.slice(8, -2);
    for (const id of cross) expect(CROSS_MODE_IDS).toContain(id);
  });

  it('professional without org membership: patient-results (only community gates it), support, settings', () => {
    const got = ids({ dbRole: 'professional' });
    expect(got.filter((x) => !x.startsWith('role:'))).toEqual(['patient-results', 'support', 'settings', 'switch-community', 'logout']);
    expect(got.filter((x) => x.startsWith('role:'))).toHaveLength(8);
  });

  it('backoffice keeps the community list (patient-results gated on community only, as on the web)', () => {
    expect(ids({ dbRole: 'backoffice' })).toEqual(ids({ dbRole: 'community', isPatient: true }));
  });
});

describe('drawer — active row and tones', () => {
  it.each([
    ['/discover', '/discover', undefined, true],
    ['/discover/orders', '/discover', undefined, false],
    ['/commerce/health-orders', '/commerce', undefined, false],
    ['/comm/events-meetups/42', '/comm/events-meetups', undefined, true],
    ['/commerce/health-orders/inbox', '/commerce/health-orders', true, false],
    ['/anything', '__logout__', undefined, false],
    ['/anything', '__switch__', undefined, false],
  ])('%s vs %s (exact %s) → %s', (path, route, exact, want) => {
    expect(drawerRowActive(path, route, exact as boolean | undefined)).toBe(want);
  });

  it('community borrows the switch-community amber; business uses commerce', () => {
    expect(modeTone('community', false)).toEqual(drawerNavIconTones['switch-community']);
    expect(modeTone('patient', false)).toEqual(drawerNavIconTones.patient);
    expect(modeTone('community', true)).toEqual(drawerNavIconTones.commerce);
  });
});

describe('bottom bar (MobileBottomNav.role.test.ts, business-modes.test.ts)', () => {
  const paths = (r: ReturnType<typeof resolveBottomNav>) => r.items.map((i) => i.path);

  it('community bar: News, Inbox, Journey, Events', () => {
    expect(paths(resolveBottomNav('community', null))).toEqual(['/home', '/inbox', '/autopilot', '/comm/events-meetups']);
  });

  it('patient and professional get their own four items, each with a mobileNav key', () => {
    expect(paths(resolveBottomNav('patient', null))).toEqual(['/patient/dashboard', '/patient/results', '/patient/health', '/patient/appointments']);
    expect(paths(resolveBottomNav('professional', null))).toEqual(['/professional/dashboard', '/professional/patients', '/professional/schedule', '/settings']);
    for (const role of ['patient', 'professional'] as const) for (const i of resolveRoleBottomNav(role) ?? []) expect(i.i18nKey).toMatch(/^mobileNav\./);
  });

  it('staff/admin/backoffice have no phone bar', () => {
    for (const role of ['staff', 'admin', 'backoffice'] as const) expect(resolveRoleBottomNav(role)).toBeNull();
  });

  it.each([
    ['org_admin', ['/commerce', '/commerce/team', '/commerce/health-orders', '/settings']],
    ['staff', ['/commerce', '/commerce/health-orders', '/commerce/health-orders/inbox', '/settings']],
    ['professional', ['/commerce', '/commerce/health-orders', '/inbox', '/settings']],
  ])('business %s bar wins over the role bar', (role, want) => {
    expect(paths(resolveBottomNav('patient', { role }))).toEqual(want);
  });

  it.each([
    ['/maxina', false, true],
    ['/comm/live-rooms/x', false, true],
    ['/comm/live-rooms', false, false],
    ['/news/1', false, true],
    ['/onboarding/welcome', false, true],
    ['/staff/queue', false, true],
    ['/patient/dashboard', true, false],
    ['/home', false, false],
  ])('%s (mode bar %s) hidden → %s', (path, hasModeBar, hidden) => {
    expect(shouldHideBottomNav(path, hasModeBar)).toBe(hidden);
  });

  it('NavLink matching: prefix, exact for business overview/orders', () => {
    expect(barItemActive('/inbox/u/1', { path: '/inbox' })).toBe(true);
    expect(barItemActive('/commerce/team', { path: '/commerce', exact: true })).toBe(false);
    expect(barItemActive('/commerce', { path: '/commerce', exact: true })).toBe(true);
  });
});

describe('route guard (useSmartRouting.mobile.test.ts)', () => {
  it.each([
    ['/home', 'patient', '/patient/dashboard'],
    ['/patient/health', 'patient', null],
    ['/backoffice/dashboard', 'backoffice', '/home'],
    ['/home', 'backoffice', null],
    ['/patient/results', 'community', null],
    ['/patient/dashboard', 'community', '/home'],
    ['/inbox', 'staff', '/admin'],
    ['/discover', 'professional', '/professional/dashboard'],
    ['/settings', 'patient', null],
    ['/maxina', 'admin', null],
    ['/alkalma/x', 'patient', null],
    ['/admin/device-preview', 'community', null],
  ] as const)('%s as %s → %s', (path, role, want) => {
    expect(routeGuard(path, role, REG)).toBe(want);
  });
});

describe('role switch destinations (role-switch-destination.test.ts, useRoleSwitch.test.ts)', () => {
  it.each([
    ['admin', '/admin'],
    ['staff', '/admin'],
    ['professional', '/professional/dashboard'],
    ['patient', '/patient/dashboard'],
    ['community', '/home'],
  ] as const)('%s → %s', (role, dest) => {
    expect(getRoleSwitchDestination(role)).toBe(dest);
    expect(isExternalRoleSwitchDestination(dest)).toBe(false);
  });

  it('no mobile input lists backoffice/developer/infra', () => {
    expect(computeAvailableRoles({ granted: ['developer', 'infra', 'backoffice', 'patient'], isExafyAdmin: false, isPatient: false, isMobile: true })).toEqual(['community', 'patient']);
  });
});

describe('tenant name and mode pill', () => {
  it('tenant name (registry, VTID-05151): URL slug, then the stored slug (retired → successor), else empty', () => {
    expect(getInstantTenantName('/alkalma', 'maxina', REG)).toBe('AlKalma');
    expect(getInstantTenantName('/home', 'alkalma', REG)).toBe('AlKalma');
    expect(getInstantTenantName('/home', 'earthlinks', REG)).toBe('Maxina');
    expect(getInstantTenantName('/home', null, REG)).toBe('');
    // With only the compiled fallback, an unlisted tenant shows no name (never a wrong brand).
    expect(getInstantTenantName('/alkalma', null, FALLBACK_REGISTRY)).toBe('');
    expect(getInstantTenantName('/maxina', null, FALLBACK_REGISTRY)).toBe('Maxina');
  });

  const modes: ModeOption[] = [
    { value: 'feed', label: 'Feed' },
    { value: 'services', label: 'Services', children: [{ value: 'services.events', label: 'Events' }] },
  ];
  it('findActiveLabel resolves dot-notation children; the active group starts expanded', () => {
    expect(findActiveLabel(modes, 'services.events')).toEqual({ label: 'Events', icon: undefined });
    expect(findActiveLabel(modes, 'feed')?.label).toBe('Feed');
    expect(findActiveLabel(modes, 'nope')).toBeNull();
    expect([...initiallyExpandedGroups(modes, 'services.events')]).toEqual(['services']);
  });
});
