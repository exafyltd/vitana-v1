/** VTID-05183 — extracted business-mode rules and the active-org store over an injected storage. */
import {
  isBusinessRoute,
  resolveBusinessBottomNav,
  businessDrawerItems,
  businessHomeFor,
  businessRoleLabelKey,
  pickActiveOrg,
  createActiveOrgStore,
  ACTIVE_ORG_STORAGE_KEY,
} from '@vitana/core/business-mode';
import { createMemoryStorage, type KeyValueStorage } from '@vitana/core/storage';

describe('business routes and bars', () => {
  it('isBusinessRoute', () => {
    expect(isBusinessRoute('/commerce')).toBe(true);
    expect(isBusinessRoute('/commerce/team')).toBe(true);
    expect(isBusinessRoute('/commerce/join')).toBe(false);
    expect(isBusinessRoute('/commerce/invites/abc')).toBe(false);
    expect(isBusinessRoute('/commercex')).toBe(false);
  });

  it('resolveBusinessBottomNav per role', () => {
    const ids = (role: string) => resolveBusinessBottomNav(role).map((i) => i.id);
    expect(ids('org_admin')).toEqual(['business-overview', 'business-team', 'business-orders', 'settings']);
    expect(ids('staff')).toEqual(['business-overview', 'business-orders', 'business-inbox', 'settings']);
    expect(ids('professional')).toEqual(['business-overview', 'business-orders', 'inbox', 'settings']);
    expect(ids('unknown')).toEqual(ids('professional'));
    expect(businessDrawerItems('org_admin').map((i) => i.id)).toEqual(['business-overview', 'business-team', 'business-orders', 'business-inbox']);
    expect(resolveBusinessBottomNav('staff')[0].icon).toBe('LayoutDashboard');
  });

  it('labels and homes', () => {
    expect(businessHomeFor('org_admin')).toBe('/commerce/team');
    expect(businessHomeFor('staff')).toBe('/commerce/health-orders');
    expect(businessRoleLabelKey('org_admin')).toBe('screens.commerceportal.orgOnboarding.roleOrgAdmin');
    expect(pickActiveOrg([{ id: 'a' }, { id: 'b' }], 'b')).toEqual({ id: 'b' });
    expect(pickActiveOrg([{ id: 'a' }], 'gone')).toEqual({ id: 'a' });
    expect(pickActiveOrg([], 'a')).toBeNull();
  });
});

describe('createActiveOrgStore', () => {
  it('reads, writes and notifies through the injected storage', () => {
    const storage = createMemoryStorage({ [ACTIVE_ORG_STORAGE_KEY]: 'org-1' });
    expect(ACTIVE_ORG_STORAGE_KEY).toBe('vitana.businessOrgId');
    const store = createActiveOrgStore(storage);
    expect(store.getSnapshot()).toBe('org-1');
    const listener = jest.fn();
    const off = store.subscribe(listener);
    store.set('org-2');
    expect(store.getSnapshot()).toBe('org-2');
    expect(storage.data.get(ACTIVE_ORG_STORAGE_KEY)).toBe('org-2');
    expect(listener).toHaveBeenCalledTimes(1);
    store.set(null);
    expect(storage.data.has(ACTIVE_ORG_STORAGE_KEY)).toBe(false);
    off();
    store.set('org-3');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('a throwing storage gives null, as on the web', () => {
    const throwing: KeyValueStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    const store = createActiveOrgStore(throwing);
    expect(store.getSnapshot()).toBeNull();
    expect(() => store.set('org-1')).not.toThrow();
    expect(store.getSnapshot()).toBe('org-1');
  });
});
