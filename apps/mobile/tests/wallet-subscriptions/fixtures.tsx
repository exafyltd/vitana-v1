/**
 * VTID-05425 — fixtures + the render helper for the subscriptions tests.
 *
 * `billingGateway()` is a FAKE gateway: it answers the billing paths from
 * fixtures and records every call (method, path, JSON body). Checkout /
 * portal / redeem answers are canned (they are only reached through the
 * not-wired `gatewayBillingActions`, see renderWithBilling); nothing leaves the process (the
 * no-network guard is imported first by every test file, and `Linking.openURL`
 * is spied, so a "hosted checkout" URL is only recorded, never opened).
 */
import type { ReactElement, ReactNode } from 'react';
import { Linking } from 'react-native';
import { render } from '@testing-library/react-native';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { UIProvider } from '../../src/ports/ui';
import type { BillingMe, FoundingStatus, RedeemResult } from '../../src/screens/wallet-subscriptions/data/billing';
import { BillingActionsProvider, gatewayBillingActions } from '../../src/screens/wallet-subscriptions/data/actions';

const FUTURE = '2099-03-01T00:00:00.000Z';

export function billingMe(over: { plan?: Partial<BillingMe['plan']>; wallet?: Partial<BillingMe['wallet']>; usage?: BillingMe['usage']; earnings?: number } = {}): BillingMe {
  return {
    ok: true,
    plan: {
      plan_key: 'free',
      status: 'free',
      current_period_end: null,
      cancel_at_period_end: false,
      trial_end: null,
      price_key: null,
      source: null,
      ...over.plan,
    },
    wallet: { purchased_credits: 0, reward_credits: 0, cash_balance: 0, balance_total: 0, ...over.wallet },
    usage: over.usage ?? {
      voice_live_minutes: { used: 6, quota: 15, reset_at: null, unit: 'minutes', behavior: 'paywall' },
      live_room_minutes: { used: 40, quota: 40, reset_at: null, unit: 'minutes', behavior: 'paywall' },
      match_posts: { used: 0, quota: 0, reset_at: null, unit: 'posts', behavior: 'hard_block' },
    },
    earnings: { year_in_cents: over.earnings ?? 0 },
    stripe: { has_customer: false, has_paid_subscription: false },
  };
}

export const freePlan = billingMe();
/** No usage rows, no earnings, no cash — the leanest answer /billing/me gives. */
export const emptyPlan = billingMe({ usage: {} });
export const premiumActive = billingMe({
  plan: { plan_key: 'premium', status: 'active', current_period_end: FUTURE, price_key: 'premium_monthly', source: 'stripe' },
  wallet: { cash_balance: 1250 },
  earnings: 4200,
});
export const premiumPastDue = billingMe({ plan: { plan_key: 'premium', status: 'past_due', current_period_end: FUTURE, source: 'stripe' } });
export const premiumTrialing = billingMe({ plan: { plan_key: 'premium', status: 'trialing', trial_end: FUTURE, source: 'stripe' } });
export const premiumAutoGrant = billingMe({ plan: { plan_key: 'premium', status: 'active', current_period_end: FUTURE, source: 'launch_auto_grant_2026' } });
export const hostPlan = billingMe({ plan: { plan_key: 'premium_5x', status: 'active', current_period_end: FUTURE, source: 'stripe' } });

export const foundingActive: FoundingStatus = { ok: true, active: true, uses_count: 120, max_uses: 1000, remaining: 880, code: 'FOUNDING-1000', campaign: 'founding_1000' };

export type GatewayCall = { method: string; path: string; body: unknown };

export type BillingGatewayOpts = {
  me?: BillingMe | { status: number; body: unknown };
  founding?: FoundingStatus | null;
  redeem?: RedeemResult | { status: number; body: unknown };
};

function isFailure(v: unknown): v is { status: number; body: unknown } {
  return !!v && typeof v === 'object' && 'status' in v && typeof (v as { status: unknown }).status === 'number' && !('ok' in v);
}

/** The fake billing gateway: canned answers per path, every call recorded. */
export function billingGateway(opts: BillingGatewayOpts = {}) {
  const calls: GatewayCall[] = [];
  const answer = (status: number, body: unknown) =>
    ({ ok: status >= 200 && status < 300, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) }) as unknown as Response;
  const fetch = async (path: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ method, path, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    if (path === '/billing/me') {
      const me = opts.me ?? freePlan;
      return isFailure(me) ? answer(me.status, me.body) : answer(200, me);
    }
    if (path === '/billing/founding-status') return opts.founding ? answer(200, opts.founding) : answer(404, undefined);
    if (path === '/billing/checkout/subscription') return answer(200, { ok: true, url: 'https://checkout.example.invalid/sub', session_id: 'cs_test' });
    if (path === '/billing/checkout/credits') return answer(200, { ok: true, url: 'https://checkout.example.invalid/credits', session_id: 'cs_test' });
    if (path === '/billing/portal') return answer(200, { ok: true, url: 'https://portal.example.invalid/session' });
    if (path === '/billing/redeem') {
      const r = opts.redeem ?? { ok: true, granted_plan: 'premium', granted_until: '2099-06-01T00:00:00.000Z' };
      return isFailure(r) ? answer(r.status, r.body) : answer(200, r);
    }
    return answer(404, undefined);
  };
  return { fetch, calls, posts: () => calls.filter((c) => c.method === 'POST') };
}

const session = fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } });

function supabase() {
  return createSupabaseDouble({
    session,
    tables: { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }] },
    rpc: {
      get_role_preference: () => ({ data: [{ role: 'community' }], error: null }),
      get_my_permitted_roles: () => ({ data: { ok: true, roles: ['community'] }, error: null }),
    },
  }).client;
}

/** Spy on Linking.openURL so a hosted checkout / portal URL is recorded, never opened. */
export function spyOpenURL() {
  return jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
}

/**
 * Renders `ui` under the kit provider + the app provider stack with the fake billing gateway installed.
 * `actions: 'wire'` (the default here) injects `gatewayBillingActions`, so the writes reach the FAKE
 * gateway and their paths / payloads can be asserted; `actions: 'app'` leaves the app's default
 * `BillingActions` (no call at all), exactly what the shipped routes use.
 */
export function renderWithBilling(ui: ReactElement, opts: BillingGatewayOpts & { language?: string; direction?: 'ltr' | 'rtl'; actions?: 'wire' | 'app' } = {}) {
  const gw = billingGateway(opts);
  const wrapper = makeWrapper({ client: supabase(), language: opts.language ?? 'de-DE' });
  __setGatewayForTests(gw.fetch);
  const app = opts.actions === 'app';
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction={opts.direction ?? 'ltr'}>
      {app ? children : <BillingActionsProvider value={gatewayBillingActions}>{children}</BillingActionsProvider>}
    </UIProvider>
  );
  const utils = render(<Wrapped>{ui}</Wrapped>, { wrapper });
  return { ...utils, gateway: gw };
}
