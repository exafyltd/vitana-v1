/**
 * VTID-05425 fix 1 — the billing writes the SHIPPED screens make (no
 * `BillingActionsProvider` injected: the app default), asserted against the
 * FAKE billing gateway. They must be the web's `src/lib/billingApi.ts`
 * requests, and a hosted URL must be handed to the system the way the web
 * assigns `window.location` / `window.open`. No network: the no-network guard
 * is imported first, every request lands in the fake gateway, and
 * `Linking.openURL` is spied (a URL is recorded, never opened).
 */
import '../helpers/no-network';
import './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { mockParams, router } from './mocks';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests } from '../../src/ports/ui';
import { gatewayBillingActions } from '../../src/screens/wallet-subscriptions/data/actions';
import { SubscriptionsScreen } from '../../src/screens/wallet-subscriptions/SubscriptionsScreen';
import { ProfileSubscriptionsScreen } from '../../src/screens/wallet-subscriptions/ProfileSubscriptionsScreen';
import { billingGateway, premiumActive, renderWithBilling, spyOpenURL } from './fixtures';

afterAll(() => __setSupabaseForTests(null));
afterEach(async () => {
  mockParams.current = {};
  __clearToastsForTests();
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('request builders (gatewayBillingActions → fake gateway)', () => {
  /** Records the raw init the native gateway client sends, next to the fake gateway's parsed view. */
  function install() {
    const gw = billingGateway();
    const inits: (RequestInit | undefined)[] = [];
    __setGatewayForTests(async (path: string, init?: RequestInit) => {
      inits.push(init);
      return gw.fetch(path, init);
    });
    return { gw, inits };
  }

  it('choose plan: POST /billing/checkout/subscription {price_key}, JSON, answers the hosted URL', async () => {
    const { gw, inits } = install();
    await expect(gatewayBillingActions.startSubscriptionCheckout('premium_monthly')).resolves.toEqual({ ok: true, url: 'https://checkout.example.invalid/sub', session_id: 'cs_test' });
    expect(gw.calls).toEqual([{ method: 'POST', path: '/billing/checkout/subscription', body: { price_key: 'premium_monthly' } }]);
    expect(new Headers(inits[0]?.headers).get('Content-Type')).toBe('application/json');
  });

  it('credit pack: POST /billing/checkout/credits {pack_key}', async () => {
    const { gw } = install();
    await expect(gatewayBillingActions.startCreditsCheckout('boost')).resolves.toEqual(expect.objectContaining({ url: 'https://checkout.example.invalid/credits' }));
    expect(gw.calls).toEqual([{ method: 'POST', path: '/billing/checkout/credits', body: { pack_key: 'boost' } }]);
  });

  it('billing portal: POST /billing/portal with no body', async () => {
    const { gw, inits } = install();
    await expect(gatewayBillingActions.openPortal()).resolves.toEqual({ ok: true, url: 'https://portal.example.invalid/session' });
    expect(gw.calls).toEqual([{ method: 'POST', path: '/billing/portal', body: undefined }]);
    expect(inits[0]?.body).toBeUndefined();
  });

  it('redeem: POST /billing/redeem {code}', async () => {
    const { gw } = install();
    await expect(gatewayBillingActions.redeemCode('VITANA-AB12')).resolves.toEqual(expect.objectContaining({ ok: true }));
    expect(gw.calls).toEqual([{ method: 'POST', path: '/billing/redeem', body: { code: 'VITANA-AB12' } }]);
  });
});

describe('the app default BillingActions make the web requests and open the hosted page', () => {
  it('overview, free member: Choose / Buy / larger-plan Choose / Redeem post the web requests; checkout URLs are opened', async () => {
    const open = spyOpenURL();
    const { gateway } = renderWithBilling(<SubscriptionsScreen />, { actions: 'app' });
    fireEvent.press(await screen.findByTestId('subs-plan-premium-choose'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://checkout.example.invalid/sub'));
    fireEvent.press(screen.getByTestId('subs-pack-starter-buy'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://checkout.example.invalid/credits'));
    fireEvent.press(screen.getByTestId('subs-plans-expanded-toggle'));
    fireEvent.press(screen.getByTestId('subs-plan-premium_5x-choose'));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(3));
    fireEvent.changeText(screen.getByTestId('subs-redeem-input'), 'vitana-ab12');
    fireEvent.press(screen.getByTestId('subs-redeem-submit'));
    expect(await screen.findByTestId('subs-redeem-success')).toBeTruthy();
    expect(gateway.posts()).toEqual([
      { method: 'POST', path: '/billing/checkout/subscription', body: { price_key: 'premium_monthly' } },
      { method: 'POST', path: '/billing/checkout/credits', body: { pack_key: 'starter' } },
      { method: 'POST', path: '/billing/checkout/subscription', body: { price_key: 'premium_5x_monthly' } },
      { method: 'POST', path: '/billing/redeem', body: { code: 'VITANA-AB12' } },
    ]);
  });

  it('paid member: Manage and Withdraw open the billing portal', async () => {
    const open = spyOpenURL();
    const { gateway } = renderWithBilling(<SubscriptionsScreen />, { me: premiumActive, actions: 'app' });
    fireEvent.press(await screen.findByTestId('subs-state-manage'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://portal.example.invalid/session'));
    fireEvent.press(screen.getByTestId('subs-earnings-withdraw'));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
    expect(gateway.posts()).toEqual([
      { method: 'POST', path: '/billing/portal', body: undefined },
      { method: 'POST', path: '/billing/portal', body: undefined },
    ]);
  });

  it('storefront: a ?code= deep link redeems once and clears the param', async () => {
    mockParams.current = { code: 'founding 1000' };
    const { gateway } = renderWithBilling(<ProfileSubscriptionsScreen />, { actions: 'app' });
    expect(await screen.findByTestId('subs-redeem-success')).toBeTruthy();
    expect(gateway.posts()).toEqual([{ method: 'POST', path: '/billing/redeem', body: { code: 'FOUNDING1000' } }]);
    expect(router.setParams).toHaveBeenCalledWith({ code: undefined });
  });
});
