/**
 * VTID-03924 — switching to "developer" (or "infra") landed on "/home"
 * (community), the same fallthrough branch as an unrecognized role, instead
 * of the gateway's Command Hub — reported live as "developer should switch
 * to the Command Hub. This does not work, it switches to community."
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getCommandHubUrlMock = vi.fn();
vi.mock('@/config/devHub.config', () => ({
  getCommandHubUrl: () => getCommandHubUrlMock(),
}));

import { getRoleSwitchDestination, isExternalRoleSwitchDestination } from './role-switch-destination';

describe('getRoleSwitchDestination', () => {
  beforeEach(() => {
    getCommandHubUrlMock.mockReset();
    getCommandHubUrlMock.mockReturnValue('https://gateway.vitanaland.com/command-hub/');
  });

  it('sends developer to the Command Hub, not /home', () => {
    expect(getRoleSwitchDestination('developer')).toBe('https://gateway.vitanaland.com/command-hub/');
  });

  it('sends infra to the Command Hub too — same technical-role shape as developer', () => {
    expect(getRoleSwitchDestination('infra')).toBe('https://gateway.vitanaland.com/command-hub/');
  });

  it('falls back to /home for developer/infra only if the gateway base is unconfigured', () => {
    getCommandHubUrlMock.mockReturnValue(null);
    expect(getRoleSwitchDestination('developer')).toBe('/home');
    expect(getRoleSwitchDestination('infra')).toBe('/home');
  });

  it('still sends plain community switches to /home', () => {
    expect(getRoleSwitchDestination('community')).toBe('/home');
    expect(getCommandHubUrlMock).not.toHaveBeenCalled();
  });

  it('keeps the other pre-existing destinations unchanged', () => {
    expect(getRoleSwitchDestination('admin')).toBe('/admin');
    expect(getRoleSwitchDestination('staff')).toBe('/admin');
    expect(getRoleSwitchDestination('backoffice')).toBe('/backoffice/dashboard');
    expect(getRoleSwitchDestination('professional')).toBe('/professional/dashboard');
    expect(getRoleSwitchDestination('patient')).toBe('/patient/dashboard');
  });
});

describe('isExternalRoleSwitchDestination', () => {
  it('flags the Command Hub URL as external — navigate() cannot reach a different origin', () => {
    expect(isExternalRoleSwitchDestination('https://gateway.vitanaland.com/command-hub/')).toBe(true);
    expect(isExternalRoleSwitchDestination('http://localhost:8081/command-hub/')).toBe(true);
  });

  it('treats every in-app path as internal', () => {
    expect(isExternalRoleSwitchDestination('/home')).toBe(false);
    expect(isExternalRoleSwitchDestination('/admin')).toBe(false);
    expect(isExternalRoleSwitchDestination('/backoffice/dashboard')).toBe(false);
  });
});
