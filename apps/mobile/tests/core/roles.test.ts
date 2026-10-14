/** VTID-05183 — the extracted role rules, and proof the stubbed Command Hub branch is unreachable on mobile. */
import {
  ROLE_LADDER,
  MOBILE_EXCLUDED_ROLES,
  computeAvailableRoles,
  computeBusinessEntries,
  getRoleSwitchDestination,
  isExternalRoleSwitchDestination,
  isUserRole,
  patientNavigation,
  type UserRole,
} from '@vitana/core/roles';

describe('roles', () => {
  it('an Exafy admin on mobile gets every role except backoffice/developer/infra', () => {
    const roles = computeAvailableRoles({ granted: [], isExafyAdmin: true, isPatient: false, isMobile: true });
    expect(roles).toEqual(['community', 'patient', 'professional', 'staff', 'admin']);
    for (const r of ['backoffice', 'developer', 'infra']) expect(roles).not.toContain(r);
  });

  it('no mobile input can reach the stubbed Command Hub branch (developer/infra)', () => {
    const grantSets: string[][] = [[], ['developer'], ['infra'], ['developer', 'infra', 'admin'], [...ROLE_LADDER], ['bogus']];
    for (const granted of grantSets) {
      for (const isExafyAdmin of [true, false]) {
        for (const isPatient of [true, false]) {
          const roles = computeAvailableRoles({ granted, isExafyAdmin, isPatient, isMobile: true });
          for (const role of roles) {
            expect(['developer', 'infra']).not.toContain(role);
            const dest = getRoleSwitchDestination(role);
            expect(isExternalRoleSwitchDestination(dest)).toBe(false);
          }
        }
      }
    }
    expect(MOBILE_EXCLUDED_ROLES).toEqual(expect.arrayContaining(['developer', 'infra']));
  });

  it('destinations match the web mapping', () => {
    const cases: Array<[UserRole, string]> = [
      ['patient', '/patient/dashboard'],
      ['professional', '/professional/dashboard'],
      ['staff', '/admin'],
      ['admin', '/admin'],
      ['backoffice', '/backoffice/dashboard'],
      ['community', '/home'],
    ];
    for (const [role, path] of cases) expect(getRoleSwitchDestination(role)).toBe(path);
  });

  it('helpers', () => {
    expect(isUserRole('patient')).toBe(true);
    expect(isUserRole('org_admin')).toBe(false);
    expect(computeBusinessEntries([{ id: 'o1', display_name: 'Lab', role: 'staff' }])).toEqual([{ orgId: 'o1', orgName: 'Lab', role: 'staff' }]);
    expect(patientNavigation[0]).toMatchObject({ path: '/patient/dashboard', icon: 'LayoutDashboard' });
  });
});
