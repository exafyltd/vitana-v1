/**
 * VTID-03832 — the linear role ladder gains `backoffice` between staff and admin.
 * Pins decision 4b of the BackOffice plan: admin/developer/infra inherit BackOffice,
 * staff does not, and backoffice does not reach admin.
 */
import { describe, it, expect } from 'vitest';
import { ROLE_HIERARCHY, type UserRole } from './useRole';

const rank = (r: UserRole) => ROLE_HIERARCHY[r];

describe('ROLE_HIERARCHY (VTID-03832)', () => {
  it('has exactly eight roles in the documented order', () => {
    const ordered = (Object.keys(ROLE_HIERARCHY) as UserRole[]).sort((a, b) => rank(a) - rank(b));
    expect(ordered).toEqual(['community', 'patient', 'professional', 'staff', 'backoffice', 'admin', 'developer', 'infra']);
    expect(new Set(Object.values(ROLE_HIERARCHY)).size).toBe(8);
  });

  it('backoffice sits strictly between staff and admin', () => {
    expect(rank('staff')).toBeLessThan(rank('backoffice'));
    expect(rank('backoffice')).toBeLessThan(rank('admin'));
    expect(rank('backoffice')).toBe(5);
    expect(rank('admin')).toBe(6);
    expect(rank('developer')).toBe(7);
    expect(rank('infra')).toBe(8);
  });

  it('hasPermission semantics: admin/developer/infra pass a backoffice guard, staff does not, backoffice does not pass admin', () => {
    const passes = (current: UserRole, required: UserRole) => rank(current) >= rank(required);
    expect(passes('admin', 'backoffice')).toBe(true);
    expect(passes('developer', 'backoffice')).toBe(true);
    expect(passes('infra', 'backoffice')).toBe(true);
    expect(passes('staff', 'backoffice')).toBe(false);
    expect(passes('backoffice', 'admin')).toBe(false);
    expect(passes('backoffice', 'backoffice')).toBe(true);
  });
});
