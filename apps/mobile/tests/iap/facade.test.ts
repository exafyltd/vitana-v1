// VTID-05680 — vendor-neutral purchase seam: no-op default, flag OFF, facade enforcement.
import {
  NoopPurchaseProvider,
  getPurchaseProvider,
  setPurchaseProvider,
  setIapFlagResolver,
  isIapEnabled,
  IAP_FLAG_NAME,
  isIapAvailable,
  listProducts,
  purchase,
  restore,
  getEntitlements,
  type PurchaseProvider,
} from '../../src/iap';

function fake(): jest.Mocked<PurchaseProvider> {
  return {
    isAvailable: jest.fn(() => true),
    listProducts: jest.fn(async (ids: string[]) => ids.map((id) => ({ id, title: `T ${id}`, price: null }))),
    purchase: jest.fn(async () => ({ status: 'purchased' as const, entitlements: [{ id: 'e1' }] })),
    restore: jest.fn(async () => ({ status: 'restored' as const, entitlements: [{ id: 'e1' }] })),
    getEntitlements: jest.fn(async () => [{ id: 'e1' }]),
  } as unknown as jest.Mocked<PurchaseProvider>;
}

afterEach(() => {
  setPurchaseProvider(null);
  setIapFlagResolver(null);
});

describe('defaults', () => {
  it('flag name is reserved and the flag is OFF by default', () => {
    expect(IAP_FLAG_NAME).toBe('iap_enabled');
    expect(isIapEnabled()).toBe(false);
  });

  it('no-op provider is unavailable and empty', async () => {
    expect(getPurchaseProvider()).toBe(NoopPurchaseProvider);
    expect(NoopPurchaseProvider.isAvailable()).toBe(false);
    expect(await NoopPurchaseProvider.listProducts(['a'])).toEqual([]);
    expect((await NoopPurchaseProvider.purchase('a')).status).toBe('unavailable');
    expect((await NoopPurchaseProvider.restore()).status).toBe('unavailable');
    expect(await NoopPurchaseProvider.getEntitlements()).toEqual([]);
  });

  it('facade answers unavailable/empty by default', async () => {
    expect(isIapAvailable()).toBe(false);
    expect(await listProducts(['a'])).toEqual([]);
    expect((await purchase('a')).status).toBe('unavailable');
    expect((await restore()).status).toBe('unavailable');
    expect(await getEntitlements()).toEqual([]);
  });
});

describe('flag OFF ignores an installed provider', () => {
  it('never calls the fake', async () => {
    const p = fake();
    setPurchaseProvider(p);
    expect(isIapAvailable()).toBe(false);
    expect(await listProducts(['a'])).toEqual([]);
    expect((await purchase('a')).status).toBe('unavailable');
    expect((await restore()).status).toBe('unavailable');
    expect(await getEntitlements()).toEqual([]);
    for (const fn of Object.values(p)) expect(fn).not.toHaveBeenCalled();
  });
});

describe('flag ON passes through', () => {
  beforeEach(() => setIapFlagResolver(() => true));

  it('uses the installed provider', async () => {
    const p = fake();
    setPurchaseProvider(p);
    expect(isIapAvailable()).toBe(true);
    expect(await listProducts(['a'])).toEqual([{ id: 'a', title: 'T a', price: null }]);
    expect((await purchase('a')).status).toBe('purchased');
    expect((await restore()).status).toBe('restored');
    expect(await getEntitlements()).toEqual([{ id: 'e1' }]);
    expect(p.purchase).toHaveBeenCalledWith('a');
  });

  it('with no provider installed the no-op answers', async () => {
    expect(isIapAvailable()).toBe(false);
    expect((await purchase('a')).status).toBe('unavailable');
  });

  it('turns sync throws and rejections into failed / empty, never throws', async () => {
    const p = fake();
    p.isAvailable.mockImplementation(() => { throw new Error('x'); });
    p.listProducts.mockRejectedValue(new Error('x'));
    p.purchase.mockRejectedValue(new Error('x'));
    p.restore.mockImplementation(() => { throw new Error('x'); });
    p.getEntitlements.mockRejectedValue(new Error('x'));
    setPurchaseProvider(p);
    expect(isIapAvailable()).toBe(false);
    expect(await listProducts(['a'])).toEqual([]);
    expect((await purchase('a')).status).toBe('failed');
    expect((await restore()).status).toBe('failed');
    expect(await getEntitlements()).toEqual([]);
  });

  it('a throwing flag resolver counts as OFF', () => {
    setIapFlagResolver(() => { throw new Error('x'); });
    expect(isIapEnabled()).toBe(false);
  });
});

describe('resets', () => {
  it('setPurchaseProvider(null) restores the no-op, setIapFlagResolver(null) the OFF default', () => {
    setPurchaseProvider(fake());
    setPurchaseProvider(null);
    expect(getPurchaseProvider()).toBe(NoopPurchaseProvider);
    setIapFlagResolver(() => true);
    expect(isIapEnabled()).toBe(true);
    setIapFlagResolver(null);
    expect(isIapEnabled()).toBe(false);
  });
});
