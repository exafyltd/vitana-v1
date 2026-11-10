/**
 * VTID-05684 — Wave 1 readiness (roles, R3): which role-switch destinations are web consoles.
 * Subject: src/identity/useRoleSwitch.ts:26 isWebConsoleDestination.
 * Readiness evidence only; does not prove the Wave 1 exit (needs G1).
 */
import '../../helpers/no-network';
import '../../helpers/mocks';
import { isWebConsoleDestination } from '../../../src/identity/useRoleSwitch';
import { ROLE_LADDER, computeAvailableRoles, getRoleSwitchDestination, isExternalRoleSwitchDestination } from '../../../src/ports/core';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn(), push: jest.fn() },
  usePathname: () => '/home',
}));

describe('isWebConsoleDestination (useRoleSwitch.ts:26)', () => {
  it.each([
    ['/admin', true],
    ['/admin/x', true],
    ['/admin/users/42', true],
    ['https://hub.example.org/console', true],
    ['http://hub.example.org/console', true],
    ['/home', false],
    ['/patient/dashboard', false],
    ['/professional/dashboard', false],
    ['/backoffice/dashboard', false],
    ['/administrator', false],
    ['/admins', false],
    ['/adminx/y', false],
    ['/x/admin', false],
    ['', false],
  ] as const)('%s -> %s', (destination, want) => {
    expect(isWebConsoleDestination(destination)).toBe(want);
  });
});

describe('getRoleSwitchDestination for the roles offered on the phone', () => {
  const grantSets: string[][] = [[], ['staff'], ['admin'], ['professional'], [...ROLE_LADDER]];

  it.each([...ROLE_LADDER])('%s: never external when the phone offers it', (role) => {
    for (const granted of grantSets) {
      for (const isExafyAdmin of [true, false]) {
        for (const isPatient of [true, false]) {
          const offered = computeAvailableRoles({ granted: [role, ...granted], isExafyAdmin, isPatient, isMobile: true });
          for (const r of offered) {
            expect(isExternalRoleSwitchDestination(getRoleSwitchDestination(r))).toBe(false);
          }
        }
      }
    }
  });

  it('only admin and staff hand off to the web console (/admin) among the offered roles', () => {
    const offered = computeAvailableRoles({ granted: [], isExafyAdmin: true, isPatient: true, isMobile: true });
    const web = offered.filter((r) => isWebConsoleDestination(getRoleSwitchDestination(r)));
    expect(web).toEqual(['staff', 'admin']);
  });

  it('community, patient and professional switch in-app', () => {
    for (const role of ['community', 'patient', 'professional'] as const) {
      expect(isWebConsoleDestination(getRoleSwitchDestination(role))).toBe(false);
    }
  });
});
