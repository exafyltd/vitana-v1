/**
 * VTID-05425 fix 2 — the return leg after a hosted Stripe page (plan
 * checkout, credit pack, billing portal). The web lands back on
 * `/wallet/subscriptions?checkout=success|cancelled` (gateway success /
 * cancel URLs) and the page loads `/billing/me` fresh: the member sees the
 * refreshed plan card; the web shows no toast for either value. Native opens
 * the page with expo-web-browser, marks the flow pending, and refetches (with
 * a short poll for webhook lag) when the browser closes, on AppState
 * 'active' and on screen focus, and when a `?checkout=` link reaches the
 * screen. Fakes only: the fake billing gateway, a stubbed expo-web-browser,
 * captured AppState listeners. No network, no Stripe.
 */
import '../helpers/no-network';
import './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { mockParams } from './mocks';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { SubscriptionsScreen } from '../../src/screens/wallet-subscriptions/SubscriptionsScreen';
import { ProfileSubscriptionsScreen } from '../../src/screens/wallet-subscriptions/ProfileSubscriptionsScreen';
import { premiumActive, billingMe, renderWithBilling, spyOpenBrowser } from './fixtures';

jest.setTimeout(30000);

afterAll(() => __setSupabaseForTests(null));
afterEach(async () => {
  mockParams.current = {};
  __clearToastsForTests();
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

/** Capture every AppState listener so a test can bring the app back to the foreground. */
function captureAppState() {
  const listeners: ((s: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
    listeners.push(fn as (s: AppStateStatus) => void);
    return { remove: () => listeners.splice(listeners.indexOf(fn as never), 1) } as never;
  });
  return (s: AppStateStatus) => act(() => listeners.slice().forEach((l) => l(s)));
}

describe('return leg after a hosted billing page', () => {
  it('plan checkout → AppState active → billing/me refetched → the new plan card', async () => {
    const setAppState = captureAppState();
    const browser = spyOpenBrowser(); // Android: the tab opens, the app goes to the background
    const { gateway } = renderWithBilling(<SubscriptionsScreen />, { actions: 'app' });
    fireEvent.press(await screen.findByTestId('subs-plan-premium-choose'));
    await waitFor(() => expect(browser).toHaveBeenCalledWith('https://checkout.example.invalid/sub'));
    expect(screen.getByTestId('subs-state-free')).toBeTruthy();
    const reads = gateway.meReads();

    gateway.setMe(premiumActive); // the webhook landed while the member paid
    setAppState('background');
    setAppState('active');

    expect(await screen.findByTestId('subs-state-active')).toBeTruthy();
    expect(screen.queryByTestId('subs-state-free')).toBeNull();
    expect(gateway.meReads()).toBeGreaterThan(reads);
    // The web shows no toast on the return.
    expect(__toastsForTests()).toEqual([]);
  });

  it('webhook lag: polls billing/me until the plan changes', async () => {
    const setAppState = captureAppState();
    spyOpenBrowser();
    const { gateway } = renderWithBilling(<SubscriptionsScreen />, { actions: 'app' });
    fireEvent.press(await screen.findByTestId('subs-plan-premium-choose'));
    await waitFor(() => expect(gateway.posts()).toHaveLength(1));
    await waitFor(() => expect(screen.getByTestId('subs-plan-premium-choose')).toBeTruthy());
    const reads = gateway.meReads();

    setAppState('active'); // back, but the webhook has not landed yet
    await waitFor(() => expect(gateway.meReads()).toBe(reads + 1));
    gateway.setMe(premiumActive);

    expect(await screen.findByTestId('subs-state-active', {}, { timeout: 8000 })).toBeTruthy();
    expect(gateway.meReads()).toBe(reads + 2);
  });

  it('credit pack: the in-app browser closes (iOS) → billing/me refetched → the new credits', async () => {
    spyOpenBrowser({ type: 'cancel' }); // iOS: the member tapped Done
    const { gateway } = renderWithBilling(<ProfileSubscriptionsScreen />, { actions: 'app' });
    await screen.findByTestId('subs-pack-starter-buy');
    const reads = gateway.meReads();
    gateway.setMe(billingMe({ wallet: { purchased_credits: 100, balance_total: 100 } }));
    fireEvent.press(screen.getByTestId('subs-pack-starter-buy'));
    await waitFor(() => expect(gateway.meReads()).toBeGreaterThan(reads));
  });

  it('?checkout=cancelled → billing/me refetched once, the old plan stays, no toast, the flow is closed', async () => {
    const setAppState = captureAppState();
    spyOpenBrowser();
    const { gateway, rerender } = renderWithBilling(<SubscriptionsScreen />, { actions: 'app' });
    fireEvent.press(await screen.findByTestId('subs-plan-premium-choose'));
    await waitFor(() => expect(gateway.posts()).toHaveLength(1));
    const reads = gateway.meReads();

    mockParams.current = { checkout: 'cancelled' }; // the cancel URL reached the app
    rerender(<SubscriptionsScreen />);
    await waitFor(() => expect(gateway.meReads()).toBe(reads + 1));
    expect(screen.getByTestId('subs-state-free')).toBeTruthy();
    expect(screen.queryByTestId('subs-state-active')).toBeNull();
    expect(__toastsForTests()).toEqual([]);

    // Nothing is pending any more: coming back to the foreground does not read billing/me again.
    setAppState('active');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(gateway.meReads()).toBe(reads + 1);
  });

  it('?checkout=success on a cold open → billing/me refetched → the new plan card', async () => {
    mockParams.current = { checkout: 'success', session_id: 'cs_test' };
    const { gateway } = renderWithBilling(<SubscriptionsScreen />, { actions: 'app' });
    await screen.findByTestId('subs-state-free');
    gateway.setMe(premiumActive);
    expect(await screen.findByTestId('subs-state-active', {}, { timeout: 8000 })).toBeTruthy();
    expect(__toastsForTests()).toEqual([]);
  });

  it('no external flow pending: AppState active does not read billing/me again', async () => {
    const setAppState = captureAppState();
    const { gateway } = renderWithBilling(<SubscriptionsScreen />, { actions: 'app' });
    await screen.findByTestId('subs-state-free');
    const reads = gateway.meReads();
    setAppState('active');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(gateway.meReads()).toBe(reads);
  });
});
