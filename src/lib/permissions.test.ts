import { describe, it, expect } from 'vitest';
import { getPermissions, canSwitchTenant, canSwitchRole } from './permissions';

describe('getPermissions', () => {
  it('grants all permissions to an exafy admin', () => {
    const session = { user: { app_metadata: { exafy_admin: true } } };
    const perms = getPermissions(session);
    expect(perms.has('exafy.admin')).toBe(true);
    expect(perms.has('tenant.switch')).toBe(true);
    expect(perms.has('role.switch.self')).toBe(true);
  });

  it('grants only role.switch.self to a regular authenticated user', () => {
    const session = { user: { app_metadata: {} } };
    const perms = getPermissions(session);
    expect(perms.has('exafy.admin')).toBe(false);
    expect(perms.has('tenant.switch')).toBe(false);
    expect(perms.has('role.switch.self')).toBe(true);
  });

  it('does not treat a truthy non-boolean exafy_admin flag as admin', () => {
    const session = { user: { app_metadata: { exafy_admin: 'yes' } } };
    expect(getPermissions(session).has('exafy.admin')).toBe(false);
  });

  it('handles a null/undefined session without throwing', () => {
    expect(getPermissions(null).has('role.switch.self')).toBe(true);
    expect(getPermissions(undefined).has('exafy.admin')).toBe(false);
  });
});

describe('canSwitchTenant', () => {
  it('requires both exafy.admin and tenant.switch', () => {
    expect(canSwitchTenant(new Set(['exafy.admin', 'tenant.switch']))).toBe(true);
    expect(canSwitchTenant(new Set(['exafy.admin']))).toBe(false);
    expect(canSwitchTenant(new Set(['tenant.switch']))).toBe(false);
    expect(canSwitchTenant(new Set())).toBe(false);
  });
});

describe('canSwitchRole', () => {
  it('requires role.switch.self', () => {
    expect(canSwitchRole(new Set(['role.switch.self']))).toBe(true);
    expect(canSwitchRole(new Set(['exafy.admin']))).toBe(false);
  });
});
