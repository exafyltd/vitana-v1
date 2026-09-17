/**
 * VTID-03993 — the role list the mobile/desktop switcher offers. Pure logic
 * (no rendering): the union of granted roles, community and the patient
 * flag, minus the roles that have no phone-sized home.
 */
import { describe, expect, it } from 'vitest';
import { computeAvailableRoles, computeBusinessEntries, MOBILE_EXCLUDED_ROLES } from './useRoleSwitch';

describe('computeAvailableRoles (VTID-03993)', () => {
  it('always includes community, even when the RPC lists nothing', () => {
    expect(computeAvailableRoles({ granted: undefined, isExafyAdmin: false, isPatient: false, isMobile: true })).toEqual(['community']);
    expect(computeAvailableRoles({ granted: [], isExafyAdmin: false, isPatient: false, isMobile: false })).toEqual(['community']);
  });

  it('adds patient from the patient_profiles flag — user_permitted_roles is a table the trigger never writes', () => {
    expect(computeAvailableRoles({ granted: ['community'], isExafyAdmin: false, isPatient: true, isMobile: true })).toEqual(['community', 'patient']);
  });

  it('keeps ladder order and drops unknown strings', () => {
    expect(computeAvailableRoles({ granted: ['staff', 'bogus', 'patient'], isExafyAdmin: false, isPatient: false, isMobile: false })).toEqual(['community', 'patient', 'staff']);
  });

  it('hides backoffice/developer/infra on mobile only', () => {
    const granted = ['community', 'backoffice', 'developer', 'infra', 'professional'];
    expect(computeAvailableRoles({ granted, isExafyAdmin: false, isPatient: false, isMobile: true })).toEqual(['community', 'professional']);
    expect(computeAvailableRoles({ granted, isExafyAdmin: false, isPatient: false, isMobile: false })).toEqual(['community', 'professional', 'backoffice', 'developer', 'infra']);
    expect(MOBILE_EXCLUDED_ROLES).toEqual(['backoffice', 'developer', 'infra']);
  });

  it('an Exafy admin sees every role on desktop and the phone-sized five on mobile', () => {
    expect(computeAvailableRoles({ granted: [], isExafyAdmin: true, isPatient: false, isMobile: false })).toHaveLength(8);
    expect(computeAvailableRoles({ granted: [], isExafyAdmin: true, isPatient: false, isMobile: true })).toEqual(['community', 'patient', 'professional', 'staff', 'admin']);
  });
});

describe('computeBusinessEntries (VTID-03999)', () => {
  it('maps every membership to a sheet entry in API order, keeping the business role as-is', () => {
    expect(
      computeBusinessEntries([
        { id: 'o1', display_name: 'Demo Labor GmbH', role: 'org_admin' },
        { id: 'o2', display_name: 'Zweites Labor', role: 'professional' },
      ]),
    ).toEqual([
      { orgId: 'o1', orgName: 'Demo Labor GmbH', role: 'org_admin' },
      { orgId: 'o2', orgName: 'Zweites Labor', role: 'professional' },
    ]);
    expect(computeBusinessEntries([])).toEqual([]);
  });
});
