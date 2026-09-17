/**
 * VTID-03993 — the bottom bar follows the active MODE: a member in Patient /
 * Professional mode gets the role's own 4 items wherever they are (the mode,
 * not the path, decides — routing already bounces them off community routes
 * anyway); every other mode keeps the community bar or the VTID-03968 hide.
 * Pure resolver, no rendering.
 */
import { describe, expect, it } from 'vitest';
import { resolveRoleBottomNav } from './MobileBottomNav';

describe('resolveRoleBottomNav (VTID-03993)', () => {
  it('patient mode gets the patient bar', () => {
    expect(resolveRoleBottomNav('patient')?.map((i) => i.path)).toEqual([
      '/patient/dashboard',
      '/patient/results',
      '/patient/health',
      '/patient/appointments',
    ]);
  });

  it('professional mode gets the professional bar — no item on a community prefix that would bounce', () => {
    expect(resolveRoleBottomNav('professional')?.map((i) => i.path)).toEqual([
      '/professional/dashboard',
      '/professional/patients',
      '/professional/schedule',
      '/settings',
    ]);
  });

  it('community keeps the community bar (null = fall through)', () => {
    expect(resolveRoleBottomNav('community')).toBeNull();
    expect(resolveRoleBottomNav(null)).toBeNull();
    expect(resolveRoleBottomNav(undefined)).toBeNull();
  });

  it('staff/admin/backoffice have no phone bar (VTID-03968 hide still applies on their routes)', () => {
    expect(resolveRoleBottomNav('staff')).toBeNull();
    expect(resolveRoleBottomNav('admin')).toBeNull();
    expect(resolveRoleBottomNav('backoffice')).toBeNull();
  });

  it('every role bar has exactly four items with an i18n key each', () => {
    for (const role of ['patient', 'professional'] as const) {
      const items = resolveRoleBottomNav(role)!;
      expect(items).toHaveLength(4);
      for (const item of items) expect(item.i18nKey).toMatch(/^mobileNav\./);
    }
  });
});
