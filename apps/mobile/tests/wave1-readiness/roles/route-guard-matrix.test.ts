/**
 * VTID-05684 — Wave 1 readiness (roles, R2): routeGuard over all 8 roles x one path per group.
 * A table of the values current main returns (apps/mobile/src/shell/logic/route-guard.ts), each group with its line.
 * Rows already asserted in tests/shell-logic.test.ts:182-198 and tests/patient/gate-tabs-routes.test.tsx:99-102 are left out.
 * Readiness evidence only; does not prove the Wave 1 exit (needs G1).
 */
import '../../helpers/no-network';
import { routeGuard, COMMUNITY_PREFIXES } from '../../../src/shell/logic/route-guard';
import { ROLE_LADDER, normalizeEntry, type TenantEntry, type TenantRegistry, type UserRole } from '../../../src/ports/core';

const REG: TenantRegistry = {
  source: 'rpc',
  tenants: [
    normalizeEntry({ tenant_id: 't-m', slug: 'maxina', name: 'Maxina', display_name: 'Maxina', open_signup: true }) as TenantEntry,
    normalizeEntry({ tenant_id: 't-a', slug: 'alkalma', name: 'AlKalma', display_name: 'AlKalma', open_signup: true }) as TenantEntry,
  ],
};

type Row = readonly [path: string, role: UserRole, bounce: string | null];

describe('routeGuard matrix (current main)', () => {
  it('covers all 8 roles and every community prefix', () => {
    expect(ROLE_LADDER).toHaveLength(8);
    expect(COMMUNITY_PREFIXES).toHaveLength(11);
    const covered = ['/home','/comm/groups','/discover/x','/health','/wallet','/inbox','/sharing','/memory','/autopilot','/assistant','/business'];
    for (const p of COMMUNITY_PREFIXES) expect(covered.some((c: string) => c === p || c.startsWith(p + '/'))).toBe(true);
  });

  // community prefixes (route-guard.ts:10,36-39)
  describe('community prefixes', () => {
    it.each<Row>([
      ['/home', 'community', null],
      ['/home', 'professional', '/professional/dashboard'],
      ['/home', 'staff', '/admin'],
      ['/home', 'admin', '/admin'],
      ['/home', 'developer', null],
      ['/home', 'infra', null],
      ['/comm/groups', 'community', null],
      ['/comm/groups', 'patient', '/patient/dashboard'],
      ['/comm/groups', 'professional', '/professional/dashboard'],
      ['/comm/groups', 'staff', '/admin'],
      ['/comm/groups', 'backoffice', null],
      ['/comm/groups', 'admin', '/admin'],
      ['/comm/groups', 'developer', null],
      ['/comm/groups', 'infra', null],
      ['/discover/x', 'community', null],
      ['/discover/x', 'patient', '/patient/dashboard'],
      ['/discover/x', 'professional', '/professional/dashboard'],
      ['/discover/x', 'staff', '/admin'],
      ['/discover/x', 'backoffice', null],
      ['/discover/x', 'admin', '/admin'],
      ['/discover/x', 'developer', null],
      ['/discover/x', 'infra', null],
      ['/health', 'community', null],
      ['/health', 'patient', '/patient/dashboard'],
      ['/health', 'professional', '/professional/dashboard'],
      ['/health', 'staff', '/admin'],
      ['/health', 'backoffice', null],
      ['/health', 'admin', '/admin'],
      ['/health', 'developer', null],
      ['/health', 'infra', null],
      ['/wallet', 'community', null],
      ['/wallet', 'patient', '/patient/dashboard'],
      ['/wallet', 'professional', '/professional/dashboard'],
      ['/wallet', 'staff', '/admin'],
      ['/wallet', 'backoffice', null],
      ['/wallet', 'admin', '/admin'],
      ['/wallet', 'developer', null],
      ['/wallet', 'infra', null],
      ['/inbox', 'community', null],
      ['/inbox', 'patient', '/patient/dashboard'],
      ['/inbox', 'professional', '/professional/dashboard'],
      ['/inbox', 'backoffice', null],
      ['/inbox', 'admin', '/admin'],
      ['/inbox', 'developer', null],
      ['/inbox', 'infra', null],
      ['/sharing', 'community', null],
      ['/sharing', 'patient', '/patient/dashboard'],
      ['/sharing', 'professional', '/professional/dashboard'],
      ['/sharing', 'staff', '/admin'],
      ['/sharing', 'backoffice', null],
      ['/sharing', 'admin', '/admin'],
      ['/sharing', 'developer', null],
      ['/sharing', 'infra', null],
      ['/memory', 'community', null],
      ['/memory', 'patient', '/patient/dashboard'],
      ['/memory', 'professional', '/professional/dashboard'],
      ['/memory', 'staff', '/admin'],
      ['/memory', 'backoffice', null],
      ['/memory', 'admin', '/admin'],
      ['/memory', 'developer', null],
      ['/memory', 'infra', null],
      ['/autopilot', 'community', null],
      ['/autopilot', 'patient', '/patient/dashboard'],
      ['/autopilot', 'professional', '/professional/dashboard'],
      ['/autopilot', 'staff', '/admin'],
      ['/autopilot', 'backoffice', null],
      ['/autopilot', 'admin', '/admin'],
      ['/autopilot', 'developer', null],
      ['/autopilot', 'infra', null],
      ['/assistant', 'community', null],
      ['/assistant', 'patient', '/patient/dashboard'],
      ['/assistant', 'professional', '/professional/dashboard'],
      ['/assistant', 'staff', '/admin'],
      ['/assistant', 'backoffice', null],
      ['/assistant', 'admin', '/admin'],
      ['/assistant', 'developer', null],
      ['/assistant', 'infra', null],
      ['/business', 'community', null],
      ['/business', 'patient', '/patient/dashboard'],
      ['/business', 'professional', '/professional/dashboard'],
      ['/business', 'staff', '/admin'],
      ['/business', 'backoffice', null],
      ['/business', 'admin', '/admin'],
      ['/business', 'developer', null],
      ['/business', 'infra', null],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  // /admin (community bounced home) (route-guard.ts:40)
  describe('/admin (community bounced home)', () => {
    it.each<Row>([
      ['/admin', 'community', '/home'],
      ['/admin', 'patient', null],
      ['/admin', 'professional', null],
      ['/admin', 'staff', null],
      ['/admin', 'backoffice', null],
      ['/admin', 'admin', null],
      ['/admin', 'developer', null],
      ['/admin', 'infra', null],
      ['/admin/users', 'community', '/home'],
      ['/admin/users', 'patient', null],
      ['/admin/users', 'professional', null],
      ['/admin/users', 'staff', null],
      ['/admin/users', 'backoffice', null],
      ['/admin/users', 'admin', null],
      ['/admin/users', 'developer', null],
      ['/admin/users', 'infra', null],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  // /staff (route-guard.ts:40)
  describe('/staff', () => {
    it.each<Row>([
      ['/staff/queue', 'community', '/home'],
      ['/staff/queue', 'patient', null],
      ['/staff/queue', 'professional', null],
      ['/staff/queue', 'staff', null],
      ['/staff/queue', 'backoffice', null],
      ['/staff/queue', 'admin', null],
      ['/staff/queue', 'developer', null],
      ['/staff/queue', 'infra', null],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  // /professional (route-guard.ts:40)
  describe('/professional', () => {
    it.each<Row>([
      ['/professional/dashboard', 'community', '/home'],
      ['/professional/dashboard', 'patient', null],
      ['/professional/dashboard', 'professional', null],
      ['/professional/dashboard', 'staff', null],
      ['/professional/dashboard', 'backoffice', null],
      ['/professional/dashboard', 'admin', null],
      ['/professional/dashboard', 'developer', null],
      ['/professional/dashboard', 'infra', null],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  // /patient (only community bounced; patient/dashboard/community is in shell-logic) (route-guard.ts:40)
  describe('/patient (only community bounced; patient/dashboard/community is in shell-logic)', () => {
    it.each<Row>([
      ['/patient/dashboard', 'patient', null],
      ['/patient/dashboard', 'professional', null],
      ['/patient/dashboard', 'staff', null],
      ['/patient/dashboard', 'backoffice', null],
      ['/patient/dashboard', 'admin', null],
      ['/patient/dashboard', 'developer', null],
      ['/patient/dashboard', 'infra', null],
      ['/patient', 'community', '/home'],
      ['/patient', 'patient', null],
      ['/patient', 'professional', null],
      ['/patient', 'staff', null],
      ['/patient', 'backoffice', null],
      ['/patient', 'admin', null],
      ['/patient', 'developer', null],
      ['/patient', 'infra', null],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  // /backoffice (always /home on the phone) (route-guard.ts:31-32)
  describe('/backoffice (always /home on the phone)', () => {
    it.each<Row>([
      ['/backoffice', 'community', '/home'],
      ['/backoffice', 'patient', '/home'],
      ['/backoffice', 'professional', '/home'],
      ['/backoffice', 'staff', '/home'],
      ['/backoffice', 'backoffice', '/home'],
      ['/backoffice', 'admin', '/home'],
      ['/backoffice', 'developer', '/home'],
      ['/backoffice', 'infra', '/home'],
      ['/backoffice/dashboard', 'community', '/home'],
      ['/backoffice/dashboard', 'patient', '/home'],
      ['/backoffice/dashboard', 'professional', '/home'],
      ['/backoffice/dashboard', 'staff', '/home'],
      ['/backoffice/dashboard', 'admin', '/home'],
      ['/backoffice/dashboard', 'developer', '/home'],
      ['/backoffice/dashboard', 'infra', '/home'],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  // shared paths (route-guard.ts:11,19)
  describe('shared paths', () => {
    it.each<Row>([
      ['/settings', 'community', null],
      ['/settings', 'professional', null],
      ['/settings', 'staff', null],
      ['/settings', 'backoffice', null],
      ['/settings', 'admin', null],
      ['/settings', 'developer', null],
      ['/settings', 'infra', null],
      ['/onboarding', 'community', null],
      ['/onboarding', 'patient', null],
      ['/onboarding', 'professional', null],
      ['/onboarding', 'staff', null],
      ['/onboarding', 'backoffice', null],
      ['/onboarding', 'admin', null],
      ['/onboarding', 'developer', null],
      ['/onboarding', 'infra', null],
      ['/auth/login', 'community', null],
      ['/auth/login', 'patient', null],
      ['/auth/login', 'professional', null],
      ['/auth/login', 'staff', null],
      ['/auth/login', 'backoffice', null],
      ['/auth/login', 'admin', null],
      ['/auth/login', 'developer', null],
      ['/auth/login', 'infra', null],
      ['/exafy-admin', 'community', null],
      ['/exafy-admin', 'patient', null],
      ['/exafy-admin', 'professional', null],
      ['/exafy-admin', 'staff', null],
      ['/exafy-admin', 'backoffice', null],
      ['/exafy-admin', 'admin', null],
      ['/exafy-admin', 'developer', null],
      ['/exafy-admin', 'infra', null],
      ['/earthlinks', 'community', null],
      ['/earthlinks', 'patient', null],
      ['/earthlinks', 'professional', null],
      ['/earthlinks', 'staff', null],
      ['/earthlinks', 'backoffice', null],
      ['/earthlinks', 'admin', null],
      ['/earthlinks', 'developer', null],
      ['/earthlinks', 'infra', null],
      ['/community', 'community', null],
      ['/community', 'patient', null],
      ['/community', 'professional', null],
      ['/community', 'staff', null],
      ['/community', 'backoffice', null],
      ['/community', 'admin', null],
      ['/community', 'developer', null],
      ['/community', 'infra', null],
      ['/dev/tools', 'community', null],
      ['/dev/tools', 'patient', null],
      ['/dev/tools', 'professional', null],
      ['/dev/tools', 'staff', null],
      ['/dev/tools', 'backoffice', null],
      ['/dev/tools', 'admin', null],
      ['/dev/tools', 'developer', null],
      ['/dev/tools', 'infra', null],
      ['/_intro', 'community', null],
      ['/_intro', 'patient', null],
      ['/_intro', 'professional', null],
      ['/_intro', 'staff', null],
      ['/_intro', 'backoffice', null],
      ['/_intro', 'admin', null],
      ['/_intro', 'developer', null],
      ['/_intro', 'infra', null],
      ['/', 'community', null],
      ['/', 'patient', null],
      ['/', 'professional', null],
      ['/', 'staff', null],
      ['/', 'backoffice', null],
      ['/', 'admin', null],
      ['/', 'developer', null],
      ['/', 'infra', null],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  // consumer path (route-guard.ts:12,21)
  describe('consumer path', () => {
    it.each<Row>([
      ['/patient/results', 'patient', null],
      ['/patient/results', 'professional', null],
      ['/patient/results', 'staff', null],
      ['/patient/results', 'backoffice', null],
      ['/patient/results', 'admin', null],
      ['/patient/results', 'developer', null],
      ['/patient/results', 'infra', null],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  // admin device preview (route-guard.ts:18)
  describe('admin device preview', () => {
    it.each<Row>([
      ['/admin/device-preview', 'patient', null],
      ['/admin/device-preview', 'professional', null],
      ['/admin/device-preview', 'staff', null],
      ['/admin/device-preview', 'backoffice', null],
      ['/admin/device-preview', 'admin', null],
      ['/admin/device-preview', 'developer', null],
      ['/admin/device-preview', 'infra', null],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  // tenant portals (registry + retired slugs) (route-guard.ts:20; tenant-registry.ts:17)
  describe('tenant portals (registry + retired slugs)', () => {
    it.each<Row>([
      ['/maxina', 'community', null],
      ['/maxina', 'patient', null],
      ['/maxina', 'professional', null],
      ['/maxina', 'staff', null],
      ['/maxina', 'backoffice', null],
      ['/maxina', 'developer', null],
      ['/maxina', 'infra', null],
      ['/alkalma/x', 'community', null],
      ['/alkalma/x', 'professional', null],
      ['/alkalma/x', 'staff', null],
      ['/alkalma/x', 'backoffice', null],
      ['/alkalma/x', 'admin', null],
      ['/alkalma/x', 'developer', null],
      ['/alkalma/x', 'infra', null],
      ['/earthlings/x', 'community', null],
      ['/earthlings/x', 'patient', null],
      ['/earthlings/x', 'professional', null],
      ['/earthlings/x', 'staff', null],
      ['/earthlings/x', 'backoffice', null],
      ['/earthlings/x', 'admin', null],
      ['/earthlings/x', 'developer', null],
      ['/earthlings/x', 'infra', null],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  // no false prefix match (route-guard.ts:15 under())
  describe('no false prefix match', () => {
    it.each<Row>([
      ['/administrator', 'community', null],
      ['/administrator', 'patient', null],
      ['/administrator', 'professional', null],
      ['/administrator', 'staff', null],
      ['/administrator', 'backoffice', null],
      ['/administrator', 'admin', null],
      ['/administrator', 'developer', null],
      ['/administrator', 'infra', null],
      ['/staffing', 'community', null],
      ['/staffing', 'patient', null],
      ['/staffing', 'professional', null],
      ['/staffing', 'staff', null],
      ['/staffing', 'backoffice', null],
      ['/staffing', 'admin', null],
      ['/staffing', 'developer', null],
      ['/staffing', 'infra', null],
      ['/patients', 'community', null],
      ['/patients', 'patient', null],
      ['/patients', 'professional', null],
      ['/patients', 'staff', null],
      ['/patients', 'backoffice', null],
      ['/patients', 'admin', null],
      ['/patients', 'developer', null],
      ['/patients', 'infra', null],
      ['/homepage', 'community', null],
      ['/homepage', 'patient', null],
      ['/homepage', 'professional', null],
      ['/homepage', 'staff', null],
      ['/homepage', 'backoffice', null],
      ['/homepage', 'admin', null],
      ['/homepage', 'developer', null],
      ['/homepage', 'infra', null],
      ['/professionals', 'community', null],
      ['/professionals', 'patient', null],
      ['/professionals', 'professional', null],
      ['/professionals', 'staff', null],
      ['/professionals', 'backoffice', null],
      ['/professionals', 'admin', null],
      ['/professionals', 'developer', null],
      ['/professionals', 'infra', null],
      ['/backoffices', 'community', null],
      ['/backoffices', 'patient', null],
      ['/backoffices', 'professional', null],
      ['/backoffices', 'staff', null],
      ['/backoffices', 'backoffice', null],
      ['/backoffices', 'admin', null],
      ['/backoffices', 'developer', null],
      ['/backoffices', 'infra', null],
    ])('%s as %s -> %s', (path, role, want) => {
      expect(routeGuard(path, role, REG)).toBe(want);
    });
  });

  it('ignores the query string for tenant portal detection only (path with ? still matches a portal)', () => {
    // tenant-registry.ts:17 strips '?'; the other rules compare the raw path (route-guard.ts:15)
    expect(routeGuard('/maxina?x=1', 'community', REG)).toBeNull();
  });
});

