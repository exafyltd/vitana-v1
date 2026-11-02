/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — fake-gateway /
 * fixture unit tests for the native `/wallet/subscriptions` overview and the
 * `/profile/subscriptions` storefront (tasks 1, 2, 4). No network: the
 * no-network guard is imported first, Supabase is the in-memory double, the
 * gateway is the fake billing gateway from ./fixtures (every call recorded),
 * and expo-web-browser is spied, so every checkout, portal or redeem request
 * lands in the fake gateway and nothing leaves the process. React 19: components are typed with
 * `ReactElement`; no global `JSX`.
 */
import '../helpers/no-network';
import './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { mockParams, router } from './mocks';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { SubscriptionsScreen } from '../../src/screens/wallet-subscriptions/SubscriptionsScreen';
import { ProfileSubscriptionsScreen } from '../../src/screens/wallet-subscriptions/ProfileSubscriptionsScreen';
import { normalizeCode, redeemErrorKey } from '../../src/screens/wallet-subscriptions/components/RedeemCodeCard';
import { launchGrantDismissKey } from '../../src/screens/wallet-subscriptions/components/Banners';
import {
  emptyPlan,
  foundingActive,
  freePlan,
  hostPlan,
  premiumActive,
  premiumAutoGrant,
  premiumPastDue,
  premiumTrialing,
  renderWithBilling,
  spyOpenBrowser,
} from './fixtures';

afterAll(() => __setSupabaseForTests(null));
afterEach(async () => {
  mockParams.current = {};
  router.canGoBack.mockImplementation(() => true);
  __clearToastsForTests();
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

/** The section testIDs present, in render order (the web's order is the contract). */
function sectionOrder(rootId: string): string[] {
  const SECTIONS = [
    'subs-promises',
    'subs-launch-grant',
    'subs-founding',
    'subs-redeem',
    'subs-state-free',
    'subs-state-active',
    'subs-state-past-due',
    'subs-earnings',
    'subs-plans-headline',
    'subs-plans-expanded',
    'subs-features',
    'subs-credit-packs',
    'subs-faq',
    'profile-subscriptions-manage',
  ];
  const out: string[] = [];
  const walk = (node: { props?: { testID?: string }; children?: unknown[] } | string) => {
    if (typeof node === 'string') return;
    const id = node.props?.testID;
    if (id && SECTIONS.includes(id) && !out.includes(id)) out.push(id);
    for (const c of (node.children ?? []) as never[]) walk(c);
  };
  walk(screen.getByTestId(rootId) as never);
  return out;
}

describe('/wallet/subscriptions overview — states', () => {
  it('shows the loading skeleton before /billing/me answers', () => {
    renderWithBilling(<SubscriptionsScreen />);
    expect(screen.getByTestId('wallet-subscriptions-loading')).toBeTruthy();
    expect(screen.queryByTestId('subs-promises')).toBeNull();
  });

  it('loaded (free plan): renders every web section in the web order, redeem card included', async () => {
    renderWithBilling(<SubscriptionsScreen />, { founding: foundingActive });
    await screen.findByTestId('subs-founding');
    expect(sectionOrder('wallet-subscriptions')).toEqual([
      'subs-promises',
      'subs-founding',
      'subs-redeem',
      'subs-state-free',
      'subs-plans-headline',
      'subs-plans-expanded',
      'subs-features',
      'subs-credit-packs',
      'subs-faq',
    ]);
    expect(screen.queryByTestId('wallet-subscriptions-loading')).toBeNull();
    // the page title (the sub-nav's Subscriptions tab carries the same word)
    expect(screen.getAllByText('Abonnements', { exact: true })).toHaveLength(2);
  });

  it('loaded (paid plan): no redeem card, earnings shown, Premium marked current with no Choose CTA', async () => {
    renderWithBilling(<SubscriptionsScreen />, { me: premiumActive });
    await screen.findByTestId('subs-state-active');
    expect(sectionOrder('wallet-subscriptions')).toEqual([
      'subs-promises',
      'subs-state-active',
      'subs-earnings',
      'subs-plans-headline',
      'subs-plans-expanded',
      'subs-features',
      'subs-credit-packs',
      'subs-faq',
    ]);
    expect(screen.getByTestId('subs-plan-premium-current')).toBeTruthy();
    expect(screen.queryByTestId('subs-plan-premium-choose')).toBeNull();
    expect(screen.getByTestId('subs-state-period')).toBeTruthy();
  });

  it('empty (no usage, no earnings, no campaign): the optional widgets stay hidden and usage reads 0 / 0 without bars', async () => {
    renderWithBilling(<SubscriptionsScreen />, { me: emptyPlan, founding: null });
    await screen.findByTestId('subs-features');
    expect(screen.queryByTestId('subs-earnings')).toBeNull();
    expect(screen.queryByTestId('subs-founding')).toBeNull();
    expect(screen.queryByTestId('subs-launch-grant')).toBeNull();
    for (const key of ['voice_live_minutes', 'live_room_minutes', 'match_posts', 'match_reveals', 'lab_analyses', 'photo_uploads']) {
      expect(screen.getByTestId(`subs-feature-${key}-count`)).toHaveTextContent('0 / 0');
      expect(screen.queryByTestId(`subs-feature-${key}-progress`)).toBeNull();
    }
  });

  it('error: shows the backend message when /billing/me fails with one', async () => {
    renderWithBilling(<SubscriptionsScreen />, { me: { status: 500, body: { error: 'BILLING_DOWN', message: 'Billing is resting' } } });
    expect(await screen.findByTestId('wallet-subscriptions-error', {}, { timeout: 4000 })).toHaveTextContent('Billing is resting');
    expect(screen.queryByTestId('subs-promises')).toBeNull();
  });

  it('error without a backend message falls back to the catalog text', async () => {
    renderWithBilling(<SubscriptionsScreen />, { me: { status: 503, body: null } });
    expect(await screen.findByTestId('wallet-subscriptions-error', {}, { timeout: 4000 })).toHaveTextContent('Zahlungsvorgang fehlgeschlagen');
  });
});

describe('/wallet/subscriptions — wallet sub-navigation', () => {
  it('lists the four wallet sections with Subscriptions selected; tapping another navigates to its web path', async () => {
    renderWithBilling(<SubscriptionsScreen />);
    for (const id of ['overview', 'balance', 'subscriptions', 'rewards']) expect(screen.getByTestId(`subs-subnav-${id}`)).toBeTruthy();
    expect(screen.getByTestId('subs-subnav-subscriptions').props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    fireEvent.press(screen.getByTestId('subs-subnav-overview'));
    expect(router.navigate).toHaveBeenCalledWith('/wallet');
    fireEvent.press(screen.getByTestId('subs-subnav-subscriptions'));
    expect(router.navigate).toHaveBeenCalledTimes(1);
    await screen.findByTestId('subs-promises');
  });
});

describe('plan state card', () => {
  it('free: "View plans" goes to /wallet/subscriptions', async () => {
    renderWithBilling(<SubscriptionsScreen />);
    fireEvent.press(await screen.findByTestId('subs-state-view-plans'));
    expect(router.navigate).toHaveBeenCalledWith('/wallet/subscriptions');
  });

  it('active: renewal line + Manage opens the hosted billing portal (fake gateway, POST /billing/portal)', async () => {
    const open = spyOpenBrowser();
    const { gateway } = renderWithBilling(<SubscriptionsScreen />, { me: premiumActive });
    expect(await screen.findByTestId('subs-state-period')).toHaveTextContent(/^Verlängert sich am /);
    fireEvent.press(screen.getByTestId('subs-state-manage'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://portal.example.invalid/session'));
    expect(gateway.posts()).toEqual([{ method: 'POST', path: '/billing/portal', body: undefined }]);
  });

  it('trialing: trial badge and trial-end line', async () => {
    renderWithBilling(<SubscriptionsScreen />, { me: premiumTrialing });
    expect(await screen.findByTestId('subs-state-badge')).toHaveTextContent('Im Test');
    expect(screen.getByTestId('subs-state-period')).toHaveTextContent(/^Testphase endet am /);
  });

  it('launch auto-grant: "gifted until" line', async () => {
    renderWithBilling(<SubscriptionsScreen />, { me: premiumAutoGrant });
    expect(await screen.findByTestId('subs-state-period')).toHaveTextContent(/^Geschenkt bis /);
  });

  it('past due: destructive card with Manage', async () => {
    renderWithBilling(<SubscriptionsScreen />, { me: premiumPastDue });
    expect(await screen.findByTestId('subs-state-past-due')).toBeTruthy();
    expect(screen.getByTestId('subs-state-manage')).toBeTruthy();
  });
});

describe('plan grids — web wire format through gatewayBillingActions + fake gateway', () => {
  it('headline: Premium monthly by default; the year switch shows the annual price + save badge and checks out premium_annual', async () => {
    const open = spyOpenBrowser();
    const { gateway } = renderWithBilling(<SubscriptionsScreen />);
    expect(await screen.findByTestId('subs-plan-premium-price')).toHaveTextContent('€9,99/Monat');
    expect(screen.getByTestId('subs-plan-free-current')).toBeTruthy();
    fireEvent.press(screen.getByTestId('subs-plans-headline-interval-year'));
    expect(screen.getByTestId('subs-plan-premium-price')).toHaveTextContent('€89/Jahr');
    expect(screen.getByTestId('subs-plan-premium-save')).toBeTruthy();
    fireEvent.press(screen.getByTestId('subs-plan-premium-choose'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://checkout.example.invalid/sub'));
    expect(gateway.posts()).toEqual([{ method: 'POST', path: '/billing/checkout/subscription', body: { price_key: 'premium_annual' } }]);
  });

  it('expanded: collapsed by default; opening it shows Host + Community and checks out the monthly Host price', async () => {
    spyOpenBrowser();
    const { gateway } = renderWithBilling(<SubscriptionsScreen />);
    await screen.findByTestId('subs-plans-expanded');
    expect(screen.queryByTestId('subs-plans-expanded-content')).toBeNull();
    fireEvent.press(screen.getByTestId('subs-plans-expanded-toggle'));
    expect(screen.getByTestId('subs-plan-premium_5x-price')).toHaveTextContent('€99/Monat');
    expect(screen.getByTestId('subs-plan-premium_20x-price')).toHaveTextContent('€199/Monat');
    fireEvent.press(screen.getByTestId('subs-plans-expanded-interval-year'));
    expect(screen.getByTestId('subs-plan-premium_5x-price')).toHaveTextContent('€890/Jahr');
    fireEvent.press(screen.getByTestId('subs-plan-premium_20x-choose'));
    await waitFor(() => expect(gateway.posts()).toEqual([{ method: 'POST', path: '/billing/checkout/subscription', body: { price_key: 'premium_20x_annual' } }]));
  });

  it('expanded: open from the start for a Host member, with Host marked current', async () => {
    renderWithBilling(<SubscriptionsScreen />, { me: hostPlan });
    expect(await screen.findByTestId('subs-plans-expanded-content')).toBeTruthy();
    expect(screen.getByTestId('subs-plan-premium_5x-current')).toBeTruthy();
    expect(screen.queryByTestId('subs-plan-premium_5x-choose')).toBeNull();
    expect(screen.getByTestId('subs-plan-premium_20x-choose')).toBeTruthy();
  });

  it('credit packs: Buy checks out the pack key and opens the hosted page', async () => {
    const open = spyOpenBrowser();
    const { gateway } = renderWithBilling(<SubscriptionsScreen />);
    fireEvent.press(await screen.findByTestId('subs-pack-boost-buy'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://checkout.example.invalid/credits'));
    expect(gateway.posts()).toEqual([{ method: 'POST', path: '/billing/checkout/credits', body: { pack_key: 'boost' } }]);
  });
});

describe('usage + earnings', () => {
  it('feature usage: used / quota with a progress bar when quota > 0', async () => {
    renderWithBilling(<SubscriptionsScreen />);
    expect(await screen.findByTestId('subs-feature-voice_live_minutes-count')).toHaveTextContent('6 / 15');
    expect(screen.getByTestId('subs-feature-voice_live_minutes-progress')).toBeTruthy();
    expect(screen.getByTestId('subs-feature-live_room_minutes-count')).toHaveTextContent('40 / 40');
    expect(screen.queryByTestId('subs-feature-match_posts-progress')).toBeNull();
  });

  it('earnings: amounts in the viewer locale; Withdraw opens the portal', async () => {
    const open = spyOpenBrowser();
    renderWithBilling(<SubscriptionsScreen />, { me: premiumActive });
    expect(await screen.findByTestId('subs-earnings-earned')).toHaveTextContent('€42,00');
    expect(screen.getByTestId('subs-earnings-net')).toHaveTextContent('€12,50');
    fireEvent.press(screen.getByTestId('subs-earnings-withdraw'));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://portal.example.invalid/session'));
  });
});

describe('banners', () => {
  it('founding banner: shown to a free member with the remaining-spots counter', async () => {
    renderWithBilling(<SubscriptionsScreen />, { founding: foundingActive });
    expect(await screen.findByTestId('subs-founding-remaining')).toHaveTextContent('880 von 1000 Plätzen verfügbar');
  });

  it('founding banner: never shown to a paid member, even while the campaign is active', async () => {
    renderWithBilling(<SubscriptionsScreen />, { me: premiumActive, founding: foundingActive });
    await screen.findByTestId('subs-state-active');
    await act(async () => {});
    expect(screen.queryByTestId('subs-founding')).toBeNull();
  });

  it('launch-grant banner: shown for the auto-grant, dismissal stored under the web key', async () => {
    renderWithBilling(<SubscriptionsScreen />, { me: premiumAutoGrant });
    fireEvent.press(await screen.findByTestId('subs-launch-grant-dismiss'));
    expect(screen.queryByTestId('subs-launch-grant')).toBeNull();
    await waitFor(async () => expect(await AsyncStorage.getItem(launchGrantDismissKey(premiumAutoGrant.plan.current_period_end))).toBe('1'));
  });

  it('launch-grant banner: stays hidden once dismissed', async () => {
    await AsyncStorage.setItem(launchGrantDismissKey(premiumAutoGrant.plan.current_period_end), '1');
    renderWithBilling(<SubscriptionsScreen />, { me: premiumAutoGrant });
    await screen.findByTestId('subs-state-active');
    await act(async () => {});
    expect(screen.queryByTestId('subs-launch-grant')).toBeNull();
  });

  it('FAQ: the four questions, answers revealed on tap', async () => {
    renderWithBilling(<SubscriptionsScreen />);
    await screen.findByTestId('subs-faq');
    expect(screen.queryByTestId('subs-faq-a1')).toBeNull();
    fireEvent.press(screen.getByTestId('subs-faq-q1'));
    expect(screen.getByTestId('subs-faq-a1')).toBeTruthy();
    for (const i of [2, 3, 4]) expect(screen.getByTestId(`subs-faq-q${i}`)).toBeTruthy();
  });
});

describe('redeem card (fake gateway)', () => {
  it('normalises input like the web (upper-case, A–Z 0–9 -, 32 chars)', () => {
    expect(normalizeCode('vitana test a4f2 9kx1')).toBe('VITANATESTA4F29KX1');
    expect(normalizeCode('ab-cd_ef!')).toBe('AB-CDEF');
    expect(normalizeCode('x'.repeat(40))).toHaveLength(32);
  });

  it('maps every backend error code to the web catalog key', () => {
    expect(redeemErrorKey('INVALID_CODE')).toBe('billing.redeemCard.error.invalid');
    expect(redeemErrorKey('EXPIRED')).toBe('billing.redeemCard.error.expired');
    expect(redeemErrorKey('EXPIRED_OR_INACTIVE')).toBe('billing.redeemCard.error.expired');
    expect(redeemErrorKey('MAX_USES_REACHED')).toBe('billing.redeemCard.error.maxUsed');
    expect(redeemErrorKey('ALREADY_REDEEMED')).toBe('billing.redeemCard.error.alreadyRedeemed');
    expect(redeemErrorKey('STRIPE_SUB_ACTIVE')).toBe('billing.redeemCard.error.stripeActive');
    expect(redeemErrorKey('BUDGET_EXHAUSTED')).toBe('billing.redeemCard.error.budgetExhausted');
    expect(redeemErrorKey(undefined)).toBe('billing.redeemCard.error.generic');
  });

  it('submit is disabled under 4 characters; a valid code posts /billing/redeem and shows the success card', async () => {
    const { gateway } = renderWithBilling(<SubscriptionsScreen />);
    const input = await screen.findByTestId('subs-redeem-input');
    fireEvent.changeText(input, 'ab1');
    expect(screen.getByTestId('subs-redeem-submit').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    fireEvent.changeText(input, 'vitana-ab12');
    fireEvent.press(screen.getByTestId('subs-redeem-submit'));
    expect(await screen.findByTestId('subs-redeem-success')).toBeTruthy();
    expect(screen.getByTestId('subs-redeem-success-body')).toHaveTextContent(/^Premium ist bis .+ aktiv\. Viel Freude\.$/);
    expect(gateway.posts()).toEqual([{ method: 'POST', path: '/billing/redeem', body: { code: 'VITANA-AB12' } }]);
  });

  it('a rejected code raises the mapped error toast', async () => {
    renderWithBilling(<SubscriptionsScreen />, { redeem: { ok: false, error: 'EXPIRED' } });
    fireEvent.changeText(await screen.findByTestId('subs-redeem-input'), 'OLD-CODE');
    fireEvent.press(screen.getByTestId('subs-redeem-submit'));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['billing.redeemCard.error.expired']));
    expect(screen.queryByTestId('subs-redeem-success')).toBeNull();
  });

  it('a failed call maps the backend error code from the response body', async () => {
    renderWithBilling(<SubscriptionsScreen />, { redeem: { status: 409, body: { error: 'ALREADY_REDEEMED' } } });
    fireEvent.changeText(await screen.findByTestId('subs-redeem-input'), 'USED-CODE');
    fireEvent.press(screen.getByTestId('subs-redeem-submit'));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['billing.redeemCard.error.alreadyRedeemed']));
  });

  it('a ?code= deep link submits once and clears the param (founding success copy)', async () => {
    mockParams.current = { code: 'founding 1000' };
    const { gateway } = renderWithBilling(<SubscriptionsScreen />, { redeem: { ok: true, granted_plan: 'premium', granted_until: '2099-06-01T00:00:00.000Z', campaign: 'founding_500', uses_count: 7, max_uses: 500 } });
    expect(await screen.findByTestId('subs-redeem-success-body')).toHaveTextContent(/du bist #7 von 500\./);
    expect(gateway.posts()).toEqual([{ method: 'POST', path: '/billing/redeem', body: { code: 'FOUNDING1000' } }]);
    expect(router.setParams).toHaveBeenCalledWith({ code: undefined });
  });
});

describe('rendering alone makes no write', () => {
  it('only GET reads reach the gateway', async () => {
    const { gateway } = renderWithBilling(<ProfileSubscriptionsScreen />, { actions: 'app', founding: foundingActive });
    await screen.findByTestId('subs-founding');
    expect(new Set(gateway.calls.map((c) => `${c.method} ${c.path}`))).toEqual(new Set(['GET /billing/me', 'GET /billing/founding-status']));
  });
});

describe('/profile/subscriptions storefront (MobileSubscriptions twin)', () => {
  it('loading, then the storefront sections in the web storefront order (free: no Manage CTA)', async () => {
    renderWithBilling(<ProfileSubscriptionsScreen />, { founding: foundingActive });
    expect(screen.getByTestId('profile-subscriptions-loading')).toBeTruthy();
    await screen.findByTestId('subs-founding');
    expect(sectionOrder('profile-subscriptions')).toEqual([
      'subs-state-free',
      'subs-founding',
      'subs-redeem',
      'subs-plans-headline',
      'subs-plans-expanded',
      'subs-features',
      'subs-credit-packs',
      'subs-promises',
      'subs-faq',
    ]);
    expect(screen.queryByTestId('subs-subnav')).toBeNull();
  });

  it('paid: earnings after the credit packs and the bottom Manage CTA to /settings?mode=billing', async () => {
    renderWithBilling(<ProfileSubscriptionsScreen />, { me: premiumActive });
    await screen.findByTestId('subs-state-active');
    expect(sectionOrder('profile-subscriptions')).toEqual([
      'subs-state-active',
      'subs-plans-headline',
      'subs-plans-expanded',
      'subs-features',
      'subs-credit-packs',
      'subs-earnings',
      'subs-promises',
      'subs-faq',
      'profile-subscriptions-manage',
    ]);
    fireEvent.press(screen.getByTestId('profile-subscriptions-manage'));
    expect(router.navigate).toHaveBeenCalledWith('/settings?mode=billing');
  });

  it('a free-status member keeps the redeem card and has no Manage CTA', async () => {
    renderWithBilling(<ProfileSubscriptionsScreen />, { me: freePlan });
    await screen.findByTestId('subs-redeem');
    expect(screen.queryByTestId('profile-subscriptions-manage')).toBeNull();
  });

  it('error state', async () => {
    renderWithBilling(<ProfileSubscriptionsScreen />, { me: { status: 500, body: { message: 'Billing is resting' } } });
    expect(await screen.findByTestId('profile-subscriptions-error', {}, { timeout: 4000 })).toHaveTextContent('Billing is resting');
  });

  it('back goes back; with no history it falls back to /home', async () => {
    renderWithBilling(<ProfileSubscriptionsScreen />);
    fireEvent.press(screen.getByTestId('profile-subscriptions-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
    router.canGoBack.mockImplementation(() => false);
    fireEvent.press(screen.getByTestId('profile-subscriptions-back'));
    expect(router.replace).toHaveBeenCalledWith('/home');
    await screen.findByTestId('subs-state-free');
  });
});
