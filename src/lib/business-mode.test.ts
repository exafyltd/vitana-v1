/**
 * VTID-03999 — pure helpers behind the business modes: which routes are the
 * business area, where each role lands, what its bottom bar and drawer
 * section contain, and how the active org is picked and remembered.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetActiveOrgIdForTests,
  ACTIVE_ORG_STORAGE_KEY,
  BUSINESS_ROUTES,
  businessDrawerItems,
  businessHomeFor,
  businessRoleLabelKey,
  getActiveOrgIdSnapshot,
  isBusinessRoute,
  pickActiveOrg,
  readActiveOrgId,
  resolveBusinessBottomNav,
  setActiveOrgId,
  subscribeActiveOrgId,
  writeActiveOrgId,
} from './business-mode';

describe('isBusinessRoute (VTID-03999)', () => {
  it('is true for the business area only', () => {
    expect(isBusinessRoute('/commerce')).toBe(true);
    expect(isBusinessRoute('/commerce/team')).toBe(true);
    expect(isBusinessRoute('/commerce/health-orders')).toBe(true);
    expect(isBusinessRoute('/commerce/health-orders/inbox')).toBe(true);
  });

  it('is false for sign-in, invite landings and everything outside /commerce', () => {
    expect(isBusinessRoute('/commerce/join')).toBe(false);
    expect(isBusinessRoute('/commerce/invites/abc/accept')).toBe(false);
    expect(isBusinessRoute('/home')).toBe(false);
    expect(isBusinessRoute('/commercex')).toBe(false);
    expect(isBusinessRoute('/patient/results')).toBe(false);
  });
});

describe('businessHomeFor + labels', () => {
  it('sends the org admin to the team (invitations) and everyone else to the orders', () => {
    expect(businessHomeFor('org_admin')).toBe(BUSINESS_ROUTES.team);
    expect(businessHomeFor('staff')).toBe(BUSINESS_ROUTES.orders);
    expect(businessHomeFor('professional')).toBe(BUSINESS_ROUTES.orders);
  });

  it('maps org_admin to roleOrgAdmin, not roleOrg_admin (the key that once leaked)', () => {
    expect(businessRoleLabelKey('org_admin')).toBe('screens.commerceportal.orgOnboarding.roleOrgAdmin');
    expect(businessRoleLabelKey('staff')).toBe('screens.commerceportal.orgOnboarding.roleStaff');
    expect(businessRoleLabelKey('professional')).toBe('screens.commerceportal.orgOnboarding.roleProfessional');
  });
});

describe('resolveBusinessBottomNav', () => {
  it('gives each role four items with an i18n key, overview first, settings last', () => {
    for (const role of ['org_admin', 'staff', 'professional']) {
      const items = resolveBusinessBottomNav(role);
      expect(items).toHaveLength(4);
      expect(items[0].path).toBe('/commerce');
      expect(items[3].path).toBe('/settings');
      for (const item of items) expect(item.i18nKey).toMatch(/^mobileNav\./);
    }
  });

  it('org admin has Team, staff has the results inbox, professional has messages', () => {
    expect(resolveBusinessBottomNav('org_admin').map((i) => i.path)).toEqual(['/commerce', '/commerce/team', '/commerce/health-orders', '/settings']);
    expect(resolveBusinessBottomNav('staff').map((i) => i.path)).toEqual(['/commerce', '/commerce/health-orders', '/commerce/health-orders/inbox', '/settings']);
    expect(resolveBusinessBottomNav('professional').map((i) => i.path)).toEqual(['/commerce', '/commerce/health-orders', '/inbox', '/settings']);
  });

  it('marks overview and orders exact so the orders item does not light up on its inbox child', () => {
    const staff = resolveBusinessBottomNav('staff');
    expect(staff.find((i) => i.path === '/commerce')?.exact).toBe(true);
    expect(staff.find((i) => i.path === '/commerce/health-orders')?.exact).toBe(true);
    expect(staff.find((i) => i.path === '/commerce/health-orders/inbox')?.exact).toBeUndefined();
  });

  it('an unknown role falls back to the least-privileged bar', () => {
    expect(resolveBusinessBottomNav('bogus')).toEqual(resolveBusinessBottomNav('professional'));
  });
});

describe('businessDrawerItems', () => {
  it('only the org admin sees Team; professionals never see the results inbox (server 403s it anyway)', () => {
    expect(businessDrawerItems('org_admin').map((i) => i.path)).toEqual(['/commerce', '/commerce/team', '/commerce/health-orders', '/commerce/health-orders/inbox']);
    expect(businessDrawerItems('staff').map((i) => i.path)).toEqual(['/commerce', '/commerce/health-orders', '/commerce/health-orders/inbox']);
    expect(businessDrawerItems('professional').map((i) => i.path)).toEqual(['/commerce', '/commerce/health-orders']);
  });
});

describe('active org selection + storage', () => {
  const orgs = [
    { id: 'a', display_name: 'A' },
    { id: 'b', display_name: 'B' },
  ];

  beforeEach(() => {
    __resetActiveOrgIdForTests();
    try {
      window.localStorage.clear();
    } catch {
      /* ignore */
    }
  });
  afterEach(() => vi.restoreAllMocks());

  it('picks the stored org when it is still a membership, else the first, else null', () => {
    expect(pickActiveOrg(orgs, 'b')?.id).toBe('b');
    expect(pickActiveOrg(orgs, 'zzz')?.id).toBe('a');
    expect(pickActiveOrg(orgs, null)?.id).toBe('a');
    expect(pickActiveOrg([], 'a')).toBeNull();
  });

  it('round-trips through localStorage and notifies subscribers', () => {
    const seen: Array<string | null> = [];
    const unsubscribe = subscribeActiveOrgId(() => seen.push(getActiveOrgIdSnapshot()));
    setActiveOrgId('b');
    expect(window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY)).toBe('b');
    expect(readActiveOrgId()).toBe('b');
    expect(seen).toEqual(['b']);
    setActiveOrgId(null);
    expect(window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY)).toBeNull();
    unsubscribe();
    setActiveOrgId('a');
    expect(seen).toEqual(['b', null]);
  });

  it('never throws when storage is unavailable', () => {
    vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => writeActiveOrgId('a')).not.toThrow();
    expect(readActiveOrgId()).toBeNull();
    expect(() => setActiveOrgId('a')).not.toThrow();
    expect(getActiveOrgIdSnapshot()).toBe('a');
  });
});
