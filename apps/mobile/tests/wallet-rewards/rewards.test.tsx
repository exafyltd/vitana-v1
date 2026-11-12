/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — fake-gateway / fixture
 * unit tests for the native rewards screen (`/wallet/rewards`, WALLET.REWARDS,
 * WALLET.REWARDS_EARN_MORE `?tab=earn`, WALLET.REWARDS_SHOP `?tab=shop`), a
 * port of src/pages/wallet/Rewards.tsx with VtnaRewardRules, EarnMore and
 * RewardShop. No network (the guard is imported first); the gateway is the
 * recording fake from ./fixtures, which only answers GETs. The shop's confirm
 * goes to RewardShopActions: most tests inject a fake; the default (the web
 * redeemRewardItem, POST /rewards/shop/redeem) is tested against the real
 * gateway client over a fake fetch, never a live system. React 19: components
 * typed with `ReactElement`, no global `JSX`.
 */
import '../helpers/no-network';
import './mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { Linking, Platform } from 'react-native';
import { mockParams, router } from './mocks';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { createGatewayFetch } from '../../src/ports/core';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { RewardsScreen } from '../../src/screens/wallet-rewards/RewardsScreen';
import { EARN_ACTION_ROUTES, itemText, nextGoal, stillEarnable } from '../../src/screens/wallet-rewards/data/rewards';
import { ORDERS_PATH, RULES_PATH, SHOP_PATH, defaultRoutes, orders, overview, renderWithProviders, shop } from './fixtures';

// Several screens or locales per test: more than the 5 s Jest default.
jest.setTimeout(30_000);

const APP = join(__dirname, '../..');

beforeEach(() => {
  // Android: the screen is reachable (the iOS gate is tested in ./iap-gate.test.tsx).
  jest.replaceProperty(Platform, 'OS', 'android');
});
afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  jest.restoreAllMocks();
  mockParams.current = {};
  __clearToastsForTests();
  jest.clearAllMocks();
});

const toastKeys = () => __toastsForTests().map((t) => t.titleKey);

describe('rewards screen — header, back link and tabs via the tab param', () => {
  it('renders the web header and the mobile back link to the wallet', async () => {
    renderWithProviders(<RewardsScreen />);
    expect(screen.getByText('Belohnungen')).toBeTruthy();
    expect(screen.getByText('Verdiene VTNA mit dem, was dir guttut – und löse sie im Shop ein.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('rewards-back-to-wallet'));
    expect(router.navigate).toHaveBeenCalledWith('/wallet');
    await screen.findByTestId('vtna-reward-rules');
  });

  it('defaults to the "earned" tab (web useUrlTab default) with the three tab labels', async () => {
    renderWithProviders(<RewardsScreen />);
    expect(screen.getByTestId('rewards-tab-earned')).toBeTruthy();
    expect(within(screen.getByTestId('rewards-tab-earned')).getByText('Verdient')).toBeTruthy();
    expect(within(screen.getByTestId('rewards-tab-earn')).getByText('Mehr verdienen')).toBeTruthy();
    expect(within(screen.getByTestId('rewards-tab-shop')).getByText('Shop')).toBeTruthy();
    expect(await screen.findByTestId('vtna-reward-rules')).toBeTruthy();
    expect(screen.queryByTestId('earn-more')).toBeNull();
    expect(screen.queryByTestId('reward-shop')).toBeNull();
  });

  it('?tab=earn opens "Mehr verdienen" (WALLET.REWARDS_EARN_MORE)', async () => {
    mockParams.current = { tab: 'earn' };
    renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('earn-more')).toBeTruthy();
    expect(screen.queryByTestId('vtna-reward-rules')).toBeNull();
  });

  it('?tab=intelligence (the former tab, VTID-05037) lands on "Mehr verdienen"', async () => {
    mockParams.current = { tab: 'intelligence' };
    renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('earn-more')).toBeTruthy();
  });

  it('?tab=shop opens the shop (WALLET.REWARDS_SHOP)', async () => {
    mockParams.current = { tab: 'shop' };
    renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('reward-shop')).toBeTruthy();
  });

  it('a tab press writes the tab param back (web setActiveTab → ?tab=)', async () => {
    renderWithProviders(<RewardsScreen />);
    fireEvent.press(screen.getByTestId('rewards-tab-shop'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'shop' });
    fireEvent.press(screen.getByTestId('rewards-tab-earn'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'earn' });
    await screen.findByTestId('vtna-reward-rules');
  });
});

describe('"Verdient" — VTNA reward rules (VtnaRewardRules)', () => {
  it('loaded: earned balance, value, groups, rules with caps and earned badges, never-earns, recent', async () => {
    const { gateway } = renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('vtna-reward-rules')).toBeTruthy();
    expect(within(screen.getByTestId('reward-rules-earned-balance')).getByText('120 VTNA')).toBeTruthy();
    expect(screen.getByText('So verdienst du VTNA')).toBeTruthy();
    expect(screen.getByTestId('reward-group-first_steps')).toBeTruthy();
    expect(screen.getByTestId('reward-group-habits')).toBeTruthy();
    expect(screen.getByTestId('reward-group-community')).toBeTruthy();
    expect(within(screen.getByTestId('reward-rule-profile_complete')).getByText('+40 VTNA')).toBeTruthy();
    expect(within(screen.getByTestId('reward-rule-first_diary')).getByText('Verdient')).toBeTruthy();
    expect(within(screen.getByTestId('reward-rule-cap-autopilot_action_done')).getByText('1 von 2 heute')).toBeTruthy();
    expect(within(screen.getByTestId('reward-rule-cap-live_room_15min')).getByText('3 von 3 diese Woche')).toBeTruthy();
    expect(within(screen.getByTestId('reward-never-earns')).getByText('Gekaufte Credits und Bonuspakete')).toBeTruthy();
    const recent = screen.getByTestId('reward-recent');
    expect(within(recent).getByText('Ersten Tagebucheintrag schreiben')).toBeTruthy();
    expect(within(recent).getByText('Belohnung')).toBeTruthy();
    expect(gateway.calls).toContainEqual({ path: RULES_PATH, method: 'GET' });
  });

  it('loading first, then the error state when the gateway fails', async () => {
    renderWithProviders(<RewardsScreen />, { routes: {} });
    expect(screen.getByTestId('reward-rules-loading')).toBeTruthy();
    expect(await screen.findByTestId('reward-rules-error')).toBeTruthy();
    expect(screen.getByText('Deine Belohnungen konnten gerade nicht geladen werden.')).toBeTruthy();
  });

  it('a gateway body with ok:false is an error (web fetchRewardRules)', async () => {
    renderWithProviders(<RewardsScreen />, { routes: { ...defaultRoutes(), [RULES_PATH]: { ok: false, error: 'nope' } } });
    expect(await screen.findByTestId('reward-rules-error')).toBeTruthy();
  });

  it('no recent rewards: the empty line', async () => {
    renderWithProviders(<RewardsScreen />, { routes: { ...defaultRoutes(), [RULES_PATH]: { ...overview, recent: [] } } });
    await screen.findByTestId('vtna-reward-rules');
    expect(screen.getByText('Noch keine Belohnungen – dein erster Schritt wartet oben.')).toBeTruthy();
  });

  it('signed out: no gateway read is made (web enabled: !!userId) and the screen stays loading', async () => {
    const { gateway } = renderWithProviders(<RewardsScreen />, { signedIn: false });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId('reward-rules-loading')).toBeTruthy();
    expect(gateway.calls).toEqual([]);
  });
});

describe('"Mehr verdienen" — still earnable actions + next goal (EarnMore)', () => {
  it('pure logic: stillEarnable skips onboarding, earned one-offs and full caps; highest reward first, max 5', () => {
    expect(stillEarnable(overview).map((r) => r.id)).toEqual(['profile_complete', 'diary_streak_7', 'autopilot_action_done']);
  });

  it('pure logic: nextGoal redeems the most valuable affordable item, else saves for the cheapest open one', () => {
    expect(nextGoal(shop.items, 120)).toEqual({ kind: 'redeem', item: shop.items[0] });
    expect(nextGoal(shop.items, 20)).toEqual({ kind: 'save', item: shop.items[0], missing: 80 });
    expect(nextGoal([], 20)).toBeNull();
  });

  it('pure logic: itemText picks the UI language, else German, else English, else the fallback', () => {
    expect(itemText({ de: 'Becher', en: 'Mug' }, 'en', 'x')).toBe('Mug');
    expect(itemText({ de: 'Becher', en: 'Mug' }, 'fr', 'x')).toBe('Becher');
    expect(itemText({ en: 'Mug' }, 'fr', 'x')).toBe('Mug');
    expect(itemText(undefined, 'fr', 'x')).toBe('x');
  });

  it('the action routes are the web EARN_ACTION_ROUTES', () => {
    const web = readFileSync(join(APP, '../../src/components/wallet/EarnMore.tsx'), 'utf8');
    for (const [rule, route] of Object.entries(EARN_ACTION_ROUTES)) expect(web).toContain(`${rule}: '${route}'`);
    expect(Object.keys(EARN_ACTION_ROUTES)).toHaveLength(16);
  });

  it('lists the earnable actions with amounts and a "Los geht\'s" button to where each happens', async () => {
    mockParams.current = { tab: 'earn' };
    renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('earn-more-actions')).toBeTruthy();
    expect(within(screen.getByTestId('earn-more-action-profile_complete')).getByText('+40 VTNA')).toBeTruthy();
    expect(within(screen.getByTestId('earn-more-action-autopilot_action_done')).getByText('1 von 2 heute')).toBeTruthy();
    expect(screen.queryByTestId('earn-more-action-first_diary')).toBeNull();
    fireEvent.press(screen.getByTestId('earn-more-go-diary_streak_7'));
    expect(router.navigate).toHaveBeenCalledWith('/daily-diary');
  });

  it('goal card: can already redeem → "Zum Shop" switches to the shop tab', async () => {
    mockParams.current = { tab: 'earn' };
    renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('earn-more-goal-redeem')).toBeTruthy();
    expect(screen.getByText('Du kannst schon Vitana-Becher einlösen!')).toBeTruthy();
    fireEvent.press(screen.getByTestId('earn-more-goal-shop'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'shop' });
  });

  it('goal card: not enough yet → missing VTNA and progress', async () => {
    mockParams.current = { tab: 'earn' };
    renderWithProviders(<RewardsScreen />, { routes: { ...defaultRoutes(), [RULES_PATH]: { ...overview, earned_balance: 20 } } });
    expect(await screen.findByTestId('earn-more-goal-missing')).toBeTruthy();
    expect(screen.getByText('Noch 80 VTNA bis Vitana-Becher')).toBeTruthy();
    expect(screen.getByText('20 von 100 VTNA')).toBeTruthy();
  });

  it('nothing left to earn: the all-done line; shop error hides the goal card', async () => {
    mockParams.current = { tab: 'earn' };
    const done = { ...overview, groups: [{ group: 'first_steps' as const, rules: [{ id: 'profile_complete', amount: 40, once: true, cap: null, earned: true, used_in_window: null }] }] };
    renderWithProviders(<RewardsScreen />, { routes: { [RULES_PATH]: done } });
    expect(await screen.findByTestId('earn-more-all-done')).toBeTruthy();
    expect(screen.queryByTestId('earn-more-goal')).toBeNull();
  });

  it('error state when the rules fail', async () => {
    mockParams.current = { tab: 'earn' };
    renderWithProviders(<RewardsScreen />, { routes: {} });
    expect(await screen.findByTestId('earn-more-error')).toBeTruthy();
  });
});

describe('"Shop" — the reward shop (RewardShop)', () => {
  beforeEach(() => {
    mockParams.current = { tab: 'shop' };
  });

  it('loaded: summary, earned balance, item cards with price / approx EUR / fulfilment / age badge, sold out, orders', async () => {
    const { gateway } = renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('reward-shop')).toBeTruthy();
    expect(within(screen.getByTestId('reward-shop-earned')).getByText('Du hast 120 VTNA verdient.')).toBeTruthy();
    const mug = screen.getByTestId('reward-shop-item-mug');
    expect(within(mug).getByText('Vitana-Becher')).toBeTruthy();
    expect(within(mug).getByText('Wird versendet')).toBeTruthy();
    expect(within(screen.getByTestId('reward-shop-price-mug')).getByText('100 VTNA')).toBeTruthy();
    expect(within(mug).getByText(/≈ 12,00/)).toBeTruthy();
    expect(within(screen.getByTestId('reward-shop-item-wine')).getByText('ab 18')).toBeTruthy();
    expect(within(screen.getByTestId('reward-shop-open-code')).getByText('Ausverkauft')).toBeTruthy();
    const ordersCard = await screen.findByTestId('reward-shop-orders');
    expect(within(ordersCard).getByText('Vitana-Becher')).toBeTruthy();
    expect(within(ordersCard).getByText('Versendet')).toBeTruthy();
    expect(gateway.calls.map((c) => c.path)).toEqual(expect.arrayContaining([SHOP_PATH, ORDERS_PATH]));
    expect(gateway.calls.every((c) => c.method === 'GET')).toBe(true);
  });

  it('error, empty and the Stripe return notes (?shipping=paid / cancelled)', async () => {
    const err = renderWithProviders(<RewardsScreen />, { routes: {} });
    expect(await screen.findByTestId('reward-shop-error')).toBeTruthy();
    err.unmount();

    const empty = renderWithProviders(<RewardsScreen />, { routes: { [SHOP_PATH]: { ...shop, items: [] }, [ORDERS_PATH]: { ok: true, orders: [] } } });
    expect(await screen.findByTestId('reward-shop-empty')).toBeTruthy();
    expect(screen.queryByTestId('reward-shop-orders')).toBeNull();
    empty.unmount();

    mockParams.current = { tab: 'shop', shipping: 'paid' };
    const paid = renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('reward-shop-return-paid')).toBeTruthy();
    paid.unmount();

    mockParams.current = { tab: 'shop', shipping: 'cancelled' };
    renderWithProviders(<RewardsScreen />);
    expect(await screen.findByText('Die Versandzahlung wurde abgebrochen. Es wurden keine VTNA abgebucht.')).toBeTruthy();
  });

  it('a sold-out item cannot be opened', async () => {
    renderWithProviders(<RewardsScreen />);
    fireEvent.press(await screen.findByTestId('reward-shop-open-code'));
    expect(screen.queryByTestId('reward-shop-dialog')).toBeNull();
  });

  it('ship item: confirm stays disabled until the address is complete; the request carries the web fields', async () => {
    const redeem = jest.fn(async () => ({ ok: true as const, order_id: 'o-9', status: 'paid' as const, vtna_amount: 100 }));
    const { gateway } = renderWithProviders(<RewardsScreen />, { actions: { redeem } });
    fireEvent.press(await screen.findByTestId('reward-shop-open-mug'));
    const dialog = await screen.findByTestId('reward-shop-dialog');
    expect(within(dialog).getByText('Ein Becher.')).toBeTruthy();
    expect(within(screen.getByTestId('reward-shop-balance')).getByText('Du hast 120 VTNA verdient.')).toBeTruthy();
    expect(within(screen.getByTestId('reward-shop-fee')).getByText(/4,90/)).toBeTruthy();
    expect(within(dialog).getByText('Weiter zur Versandzahlung')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('reward-shop-confirm'));
    });
    expect(redeem).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('radio-AT'));
    expect(within(screen.getByTestId('reward-shop-fee')).getByText(/6,90/)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('reward-addr-name'), 'Ana Muster');
    fireEvent.changeText(screen.getByTestId('reward-addr-line1'), 'Hauptstraße 1');
    fireEvent.changeText(screen.getByTestId('reward-addr-postal_code'), '1010');
    fireEvent.changeText(screen.getByTestId('reward-addr-city'), 'Wien');
    await act(async () => {
      fireEvent.press(screen.getByTestId('reward-shop-confirm'));
    });
    expect(redeem).toHaveBeenCalledTimes(1);
    expect(redeem).toHaveBeenCalledWith({
      item_id: 'i-mug',
      idempotency_key: expect.any(String),
      currency: 'EUR',
      locale: 'de',
      country: 'AT',
      address: { name: 'Ana Muster', line1: 'Hauptstraße 1', line2: undefined, postal_code: '1010', city: 'Wien' },
    });
    // Success: the web toast, the dialog closes; no gateway write happened (the fake action is the only "redeem").
    await waitFor(() => expect(screen.queryByTestId('reward-shop-dialog')).toBeNull());
    expect(__toastsForTests().find((t) => t.titleKey === 'wallet.rewardShop.redeemed')?.params).toEqual({ item: 'Vitana-Becher' });
    expect(gateway.calls.filter((c) => c.method !== 'GET')).toEqual([]);
  });

  it('age-restricted item over budget: shortfall line, birth date + age confirmation required, confirm disabled', async () => {
    const redeem = jest.fn(async () => ({ ok: true as const, order_id: 'o-9', status: 'paid' as const, vtna_amount: 300 }));
    renderWithProviders(<RewardsScreen />, { actions: { redeem } });
    fireEvent.press(await screen.findByTestId('reward-shop-open-wine'));
    await screen.findByTestId('reward-shop-dialog');
    expect(within(screen.getByTestId('reward-shop-balance')).getByText('Dir fehlen noch 180 VTNA.')).toBeTruthy();
    expect(screen.getByText('Ich bestätige, dass ich mindestens 18 Jahre alt bin.')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('reward-birth-date'), '1990-01-01');
    fireEvent.press(screen.getByTestId('reward-age-confirm'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('reward-shop-confirm'));
    });
    expect(redeem).not.toHaveBeenCalled();
  });

  it('age-restricted item within budget sends birth_date + age_confirmed', async () => {
    const redeem = jest.fn(async () => ({ ok: true as const, order_id: 'o-9', status: 'paid' as const, vtna_amount: 300 }));
    renderWithProviders(<RewardsScreen />, { actions: { redeem }, routes: { ...defaultRoutes(), [SHOP_PATH]: { ...shop, earned_balance: 500 } } });
    fireEvent.press(await screen.findByTestId('reward-shop-open-wine'));
    await screen.findByTestId('reward-shop-dialog');
    fireEvent.changeText(screen.getByTestId('reward-birth-date'), '1990-1-1');
    fireEvent.press(screen.getByTestId('reward-age-confirm'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('reward-shop-confirm'));
    });
    expect(redeem).not.toHaveBeenCalled(); // web: birth date must be YYYY-MM-DD
    fireEvent.changeText(screen.getByTestId('reward-birth-date'), '1990-01-01');
    await act(async () => {
      fireEvent.press(screen.getByTestId('reward-shop-confirm'));
    });
    expect(redeem).toHaveBeenCalledWith(expect.objectContaining({ item_id: 'i-wine', birth_date: '1990-01-01', age_confirmed: true }));
    expect(redeem.mock.calls[0]).not.toHaveProperty('0.country');
  });

  it('a refused redeem shows the web error toast (known code, else generic) and keeps the dialog open', async () => {
    const redeem = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'OUT_OF_STOCK' })
      .mockResolvedValueOnce({ ok: false, error: 'SOMETHING_ELSE' })
      .mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<RewardsScreen />, { actions: { redeem } });
    fireEvent.press(await screen.findByTestId('reward-shop-open-mug'));
    await screen.findByTestId('reward-shop-dialog');
    for (const [f, v] of [['name', 'Ana'], ['line1', 'Weg 1'], ['postal_code', '10115'], ['city', 'Berlin']]) {
      fireEvent.changeText(screen.getByTestId(`reward-addr-${f}`), v);
    }
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fireEvent.press(screen.getByTestId('reward-shop-confirm'));
      });
    }
    expect(toastKeys()).toEqual(['wallet.rewardShop.errors.OUT_OF_STOCK', 'wallet.rewardShop.errors.generic', 'wallet.rewardShop.errors.generic']);
    expect(screen.getByTestId('reward-shop-dialog')).toBeTruthy();
  });

  it('cancel closes the dialog without a call', async () => {
    const redeem = jest.fn();
    renderWithProviders(<RewardsScreen />, { actions: { redeem } });
    fireEvent.press(await screen.findByTestId('reward-shop-open-mug'));
    await screen.findByTestId('reward-shop-dialog');
    fireEvent.press(screen.getByTestId('reward-shop-cancel'));
    await waitFor(() => expect(screen.queryByTestId('reward-shop-dialog')).toBeNull());
    expect(redeem).not.toHaveBeenCalled();
  });

  it('orders reference unknown items with the fallback label', async () => {
    renderWithProviders(<RewardsScreen />, { routes: { ...defaultRoutes(), [ORDERS_PATH]: { ok: true, orders: [{ ...orders[0], item_id: 'gone' }] } } });
    const card = await screen.findByTestId('reward-shop-orders');
    expect(within(card).getByText('Prämie')).toBeTruthy();
  });
});

describe('redeem request (default actions = the web redeemRewardItem, against a fake fetch)', () => {
  const ORIGIN = 'https://gateway.test';
  type Sent = { url: string; method: string; headers: Record<string, string>; body: unknown };

  /** The real native gateway client (createGatewayFetch) over a fake fetch: GET fixtures, one POST answer. No network. */
  function fakeFetchGateway(post: { status: number; body: unknown }) {
    const sent: Sent[] = [];
    const routes = defaultRoutes();
    const fetchImpl = async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      sent.push({ url, method, headers: (init?.headers ?? {}) as Record<string, string>, body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body });
      const path = url.replace(`${ORIGIN}/api/v1`, '');
      const hit = method === 'GET' ? routes[path] : post.body;
      const status = method === 'GET' ? (hit === undefined ? 404 : 200) : post.status;
      const text = hit === undefined ? '' : typeof hit === 'string' ? hit : JSON.stringify(hit);
      return { ok: status >= 200 && status < 300, status, text: async () => text, json: async () => JSON.parse(text) } as unknown as Response;
    };
    return { sent, gateway: createGatewayFetch({ origin: ORIGIN, getAccessToken: () => 'tok-member', fetchImpl }) };
  }

  async function confirmMug(gw: ReturnType<typeof createGatewayFetch>) {
    renderWithProviders(<RewardsScreen />, { gateway: gw });
    fireEvent.press(await screen.findByTestId('reward-shop-open-mug'));
    await screen.findByTestId('reward-shop-dialog');
    for (const [f, v] of [['name', 'Ana'], ['line1', 'Weg 1'], ['postal_code', '10115'], ['city', 'Berlin']]) {
      fireEvent.changeText(screen.getByTestId(`reward-addr-${f}`), v);
    }
    await act(async () => {
      fireEvent.press(screen.getByTestId('reward-shop-confirm'));
    });
  }

  beforeEach(() => {
    mockParams.current = { tab: 'shop' };
  });
  afterEach(() => __setGatewayForTests(null));

  it('builds the web request: POST /api/v1/rewards/shop/redeem, JSON body, bearer token; success → redeemed toast + ["wallet"] refetch + sheet closes', async () => {
    const { sent, gateway } = fakeFetchGateway({ status: 200, body: { ok: true, order_id: 'o-9', status: 'paid', vtna_amount: 100 } });
    renderWithProviders(<RewardsScreen />, { gateway });
    // The reads go through the same client: one /api/v1 prefix, never doubled.
    await waitFor(() => expect(sent.map((s) => s.url)).toContain(`${ORIGIN}/api/v1/rewards/shop`));
    fireEvent.press(await screen.findByTestId('reward-shop-open-mug'));
    await screen.findByTestId('reward-shop-dialog');
    for (const [f, v] of [['name', 'Ana'], ['line1', 'Weg 1'], ['postal_code', '10115'], ['city', 'Berlin']]) {
      fireEvent.changeText(screen.getByTestId(`reward-addr-${f}`), v);
    }
    await act(async () => {
      fireEvent.press(screen.getByTestId('reward-shop-confirm'));
    });
    const posts = sent.filter((s) => s.method !== 'GET');
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe(`${ORIGIN}/api/v1/rewards/shop/redeem`);
    expect(posts[0].method).toBe('POST');
    expect(posts[0].headers).toMatchObject({ 'content-type': 'application/json', authorization: 'Bearer tok-member' });
    expect(posts[0].body).toEqual({
      item_id: 'i-mug',
      idempotency_key: expect.any(String),
      currency: 'EUR',
      locale: 'de',
      country: 'DE',
      address: { name: 'Ana', line1: 'Weg 1', postal_code: '10115', city: 'Berlin' },
    });
    await waitFor(() => expect(screen.queryByTestId('reward-shop-dialog')).toBeNull());
    expect(__toastsForTests().find((t) => t.titleKey === 'wallet.rewardShop.redeemed')?.params).toEqual({ item: 'Vitana-Becher' });
    await waitFor(() => expect(sent.filter((s) => s.method === 'GET' && s.url.endsWith('/rewards/shop')).length).toBeGreaterThan(1));
  });

  it('a refused redeem maps the gateway error code to the web toast; a non-JSON failure → generic', async () => {
    await confirmMug(fakeFetchGateway({ status: 409, body: { ok: false, error: 'OUT_OF_STOCK' } }).gateway);
    expect(toastKeys()).toEqual(['wallet.rewardShop.errors.OUT_OF_STOCK']);
    expect(screen.getByTestId('reward-shop-dialog')).toBeTruthy();
    screen.unmount();
    __clearToastsForTests();
    await confirmMug(fakeFetchGateway({ status: 502, body: 'Bad Gateway' }).gateway);
    expect(toastKeys()).toEqual(['wallet.rewardShop.errors.generic']);
  });

  it('a shipped item with a checkout URL opens it in the system browser (web window.location.assign)', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await confirmMug(
      fakeFetchGateway({ status: 200, body: { ok: true, order_id: 'o-9', status: 'awaiting_shipping_payment', vtna_amount: 100, checkout_url: 'https://checkout.stripe.test/cs_1' } }).gateway,
    );
    expect(open).toHaveBeenCalledWith('https://checkout.stripe.test/cs_1');
    expect(toastKeys()).toEqual([]);
  });
});

describe('i18n + RTL', () => {
  const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;
  const strings = (root: ReactTestInstance): string[] => {
    const out: string[] = [];
    const walk = (n: ReactTestInstance | string) => {
      if (typeof n === 'string') return void out.push(n);
      for (const k of ['accessibilityLabel', 'placeholder', 'title']) if (typeof n.props?.[k] === 'string') out.push(n.props[k]);
      n.children.forEach(walk);
    };
    walk(root);
    return out;
  };

  it.each([...LOCALES])('%s: every tab and the shop dialog render without a raw key', async (locale) => {
    const language = languageFromLocale(locale);
    const direction = locale === 'ar' ? 'rtl' : 'ltr';
    for (const tab of ['earned', 'earn', 'shop']) {
      mockParams.current = { tab };
      const r = renderWithProviders(<RewardsScreen />, { language, direction });
      await screen.findByTestId(tab === 'earned' ? 'vtna-reward-rules' : tab === 'earn' ? 'earn-more-goal' : 'reward-shop-orders');
      if (tab === 'shop') {
        fireEvent.press(screen.getByTestId('reward-shop-open-wine'));
        await screen.findByTestId('reward-shop-dialog');
        expect(strings(screen.getByTestId('reward-shop-dialog')).filter((s) => RAW_KEY.test(s))).toEqual([]);
      }
      expect(strings(screen.getByTestId('screen-wallet-rewards')).filter((s) => RAW_KEY.test(s))).toEqual([]);
      r.unmount();
    }
  });

  it('every walletRewardsNative key exists in all 11 locales (DE first)', () => {
    const flat = (o: Record<string, unknown>, p = ''): string[] =>
      Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
    const de = flat(JSON.parse(readFileSync(join(APP, '../../src/i18n/de/walletRewardsNative.json'), 'utf8')));
    expect(de.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const keys = flat(JSON.parse(readFileSync(join(APP, `../../src/i18n/${locale}/walletRewardsNative.json`), 'utf8')));
      expect(keys.sort()).toEqual([...de].sort());
    }
  });

  it('no physical left/right in the wallet-rewards screen files', () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
    const bad = files(join(APP, 'src/screens/wallet-rewards')).filter((f) =>
      /\b(marginLeft|marginRight|paddingLeft|paddingRight|left|right|borderLeftWidth|borderRightWidth)\s*:|textAlign:\s*'(left|right)'/.test(readFileSync(f, 'utf8')),
    );
    expect(bad).toEqual([]);
  });

  it('Arabic: the screen renders under RTL with the Arabic header', async () => {
    renderWithProviders(<RewardsScreen />, { language: languageFromLocale('ar'), direction: 'rtl' });
    await screen.findByTestId('vtna-reward-rules');
    const ar = JSON.parse(readFileSync(join(APP, '../../src/i18n/ar/wallet.json'), 'utf8')).wallet.rewardsPage.title as string;
    expect(screen.getByText(ar)).toBeTruthy();
  });
});
