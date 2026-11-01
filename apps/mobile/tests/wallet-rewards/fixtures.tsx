/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — fixtures and the render
 * harness. The gateway is a recording fake (path → JSON body, 404 otherwise,
 * every call kept with its method), the Supabase client is the shell's
 * in-memory double with a signed-in member. No network: the test files import
 * ../helpers/no-network first. Nothing here can redeem, pay or write: the fake
 * answers GET bodies only and records anything else so a test can assert it
 * never happened.
 */
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { UIProvider } from '../../src/ports/ui';
import { RewardShopActionsProvider, type RewardShopActions } from '../../src/screens/wallet-rewards/data/actions';
import type { RewardOverview, RewardShop, RewardOrder } from '../../src/screens/wallet-rewards/data/rewards';

export const RULES_PATH = '/api/v1/wallet/reward-rules';
export const SHOP_PATH = '/api/v1/rewards/shop';
export const ORDERS_PATH = '/api/v1/rewards/orders';

export const overview: RewardOverview = {
  ok: true,
  unit: 'VTNA',
  eur_per_vtna: 0.01,
  earned_balance: 120,
  groups: [
    {
      group: 'first_steps',
      rules: [
        { id: 'onboarding_complete', amount: 50, once: true, cap: null, earned: true, used_in_window: null },
        { id: 'profile_complete', amount: 40, once: true, cap: null, earned: false, used_in_window: null },
        { id: 'first_diary', amount: 30, once: true, cap: null, earned: true, used_in_window: null },
      ],
    },
    {
      group: 'habits',
      rules: [
        { id: 'autopilot_action_done', amount: 5, once: false, cap: { count: 2, days: 1 }, window: 'day', earned: false, used_in_window: 1 },
        { id: 'diary_streak_7', amount: 25, once: true, cap: null, earned: false, used_in_window: null },
      ],
    },
    {
      group: 'community',
      rules: [{ id: 'live_room_15min', amount: 10, once: false, cap: { count: 3, days: 7 }, window: 'week', earned: false, used_in_window: 3 }],
    },
  ],
  never_earns: ['done_by_vitana', 'purchases', 'self_reported'],
  recent: [
    { rule_id: 'first_diary', amount: 30, created_at: '2026-10-30T09:00:00.000Z' },
    { rule_id: null, amount: 5, created_at: '2026-10-29T09:00:00.000Z' },
  ],
};

export const shop: RewardShop = {
  ok: true,
  eur_per_vtna: 0.01,
  earned_balance: 120,
  items: [
    {
      id: 'i-mug', slug: 'mug', titles: { de: 'Vitana-Becher', en: 'Vitana mug' }, descriptions: { de: 'Ein Becher.', en: 'A mug.' },
      images: [], vtna_price: 100, eur_value: 12, fulfilment: 'ship', age_restricted: false, min_age: null,
      ships_to_countries: ['DE', 'AT'], available: true, affordable: true,
    },
    {
      id: 'i-wine', slug: 'wine', titles: { de: 'Weinprobe' }, descriptions: {},
      images: [], vtna_price: 300, eur_value: 30, fulfilment: 'event', age_restricted: true, min_age: 18,
      ships_to_countries: [], available: true, affordable: false,
    },
    {
      id: 'i-code', slug: 'code', titles: { de: 'Gutschein-Code', en: 'Voucher code' }, descriptions: {},
      images: [], vtna_price: 50, eur_value: 5, fulfilment: 'digital', age_restricted: false, min_age: null,
      ships_to_countries: [], available: false, affordable: true,
    },
  ],
  shipping_fees: [
    { country: 'DE', currency: 'EUR', fee_cents: 490 },
    { country: 'AT', currency: 'EUR', fee_cents: 690 },
  ],
};

export const orders: RewardOrder[] = [
  {
    id: 'o-1', item_id: 'i-mug', vtna_amount: 100, fulfilment: 'ship', status: 'shipped', country: 'DE',
    shipping_fee_cents: 490, shipping_currency: 'EUR', created_at: '2026-10-20T09:00:00.000Z',
  },
];

export type GatewayCall = { path: string; method: string };

/** A recording gateway fake: GET bodies by exact path, 404 otherwise. */
export function recordingGateway(routes: Record<string, unknown>) {
  const calls: GatewayCall[] = [];
  const fetch = async (path: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ path, method });
    const body = method === 'GET' && Object.prototype.hasOwnProperty.call(routes, path) ? routes[path] : undefined;
    return {
      ok: body !== undefined,
      status: body !== undefined ? 200 : 404,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    } as unknown as Response;
  };
  return { fetch, calls };
}

export const defaultRoutes = (): Record<string, unknown> => ({
  [RULES_PATH]: overview,
  [SHOP_PATH]: shop,
  [ORDERS_PATH]: { ok: true, orders },
});

export function renderWithProviders(
  ui: ReactElement,
  opts: { routes?: Record<string, unknown>; language?: string; direction?: 'ltr' | 'rtl'; actions?: RewardShopActions; signedIn?: boolean } = {},
) {
  const double = createSupabaseDouble({
    session: opts.signedIn === false ? null : fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } }),
    tables: { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }], profiles: [{ user_id: 'u-1', display_name: 'Ana', handle: null }] },
  });
  const wrapper = makeWrapper({ client: double.client, language: opts.language ?? 'de-DE' });
  const gateway = recordingGateway(opts.routes ?? defaultRoutes());
  __setGatewayForTests(gateway.fetch);
  const body = opts.actions ? <RewardShopActionsProvider value={opts.actions}>{ui}</RewardShopActionsProvider> : ui;
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction={opts.direction ?? 'ltr'}>
      {children}
    </UIProvider>
  );
  const utils = render(<Wrapped>{body}</Wrapped>, { wrapper });
  return { ...utils, gateway, double };
}
