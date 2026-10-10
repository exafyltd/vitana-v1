/**
 * VTID-05037 — Wallet › Rewards › "Mehr verdienen": only rules that can still
 * pay, highest first, each with a button to where the action happens; the
 * next Shop goal from real items; no invented numbers.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RewardOverview } from '@/hooks/useRewardRules';
import type { RewardShop, RewardShopItem } from '@/hooks/useRewardShop';

const rules = vi.fn();
const shop = vi.fn();
vi.mock('@/hooks/useRewardRules', async (orig) => ({
  ...(await orig<typeof import('@/hooks/useRewardRules')>()),
  useRewardRules: () => rules(),
}));
vi.mock('@/hooks/useRewardShop', async (orig) => ({
  ...(await orig<typeof import('@/hooks/useRewardShop')>()),
  useRewardShop: () => shop(),
}));

import { EarnMore, EARN_ACTION_ROUTES, nextGoal, stillEarnable } from './EarnMore';

const overview = (over: Partial<RewardOverview> = {}): RewardOverview => ({
  ok: true,
  unit: 'VTNA',
  eur_per_vtna: 0.01,
  earned_balance: 110,
  never_earns: [],
  recent: [],
  groups: [
    {
      group: 'first_steps',
      rules: [
        { id: 'onboarding_complete', amount: 50, once: true, cap: null, earned: false, used_in_window: null },
        { id: 'profile_complete', amount: 25, once: true, cap: null, earned: true, used_in_window: null },
        { id: 'first_diary', amount: 10, once: true, cap: null, earned: false, used_in_window: null },
        { id: 'first_health_check', amount: 25, once: true, cap: null, earned: false, used_in_window: null },
      ],
    },
    {
      group: 'habits',
      rules: [
        { id: 'autopilot_action_done', amount: 2, once: false, cap: { count: 3, days: 1 }, window: 'day', earned: false, used_in_window: 3 },
        { id: 'live_room_15min', amount: 5, once: false, cap: { count: 3, days: 7 }, window: 'week', earned: false, used_in_window: 1 },
        { id: 'mystery_rule', amount: 1, once: false, cap: null, earned: false, used_in_window: null },
      ],
    },
    {
      group: 'community',
      rules: [
        { id: 'first_group', amount: 25, once: true, cap: null, earned: false, used_in_window: null },
        { id: 'invite_friend_joined', amount: 100, once: false, cap: null, earned: false, used_in_window: null },
      ],
    },
  ],
  ...over,
});

const item = (slug: string, price: number, available = true): RewardShopItem => ({
  id: `i-${slug}`, slug, titles: { de: `${slug} DE`, en: `${slug} EN` }, descriptions: {}, images: [],
  vtna_price: price, eur_value: price / 100, fulfilment: 'event', age_restricted: false, min_age: null,
  ships_to_countries: [], available, affordable: false,
});
const shopData = (items: RewardShopItem[]): RewardShop => ({ ok: true, eur_per_vtna: 0.01, earned_balance: 0, items, shipping_fees: [] });

function renderIt() {
  return render(<MemoryRouter><EarnMore /></MemoryRouter>);
}

describe('stillEarnable (VTID-05037)', () => {
  it('drops earned one-time rules, exhausted capped rules and onboarding; highest first; max 5', () => {
    const ids = stillEarnable(overview()).map((r) => r.id);
    expect(ids).toEqual(['invite_friend_joined', 'first_health_check', 'first_group', 'first_diary', 'live_room_15min']);
    expect(ids).not.toContain('profile_complete');
    expect(ids).not.toContain('autopilot_action_done');
    expect(ids).not.toContain('onboarding_complete');
  });

  it('on equal amounts, first steps come before community', () => {
    const ids = stillEarnable(overview()).map((r) => r.id);
    expect(ids.indexOf('first_health_check')).toBeLessThan(ids.indexOf('first_group'));
  });
});

describe('nextGoal (VTID-05037)', () => {
  it('cheapest unaffordable item with the shortfall', () => {
    expect(nextGoal([item('a', 500), item('b', 300)], 110)).toMatchObject({ kind: 'save', item: { slug: 'b' }, missing: 190 });
  });
  it('redeem when something is affordable; unavailable items ignored; null when empty', () => {
    expect(nextGoal([item('a', 100), item('b', 50), item('c', 105, false)], 110)).toMatchObject({ kind: 'redeem', item: { slug: 'a' } });
    expect(nextGoal([item('x', 10, false)], 110)).toBeNull();
    expect(nextGoal([], 110)).toBeNull();
  });
});

describe('EarnMore (VTID-05037)', () => {
  beforeEach(() => {
    rules.mockReset();
    shop.mockReset();
    shop.mockReturnValue({ data: shopData([]) });
  });

  it('loading and error states', () => {
    rules.mockReturnValue({ isLoading: true });
    const a = renderIt();
    expect(screen.getByTestId('earn-more-loading')).toBeTruthy();
    a.unmount();
    rules.mockReturnValue({ isLoading: false, error: new Error('x') });
    renderIt();
    expect(screen.getByTestId('earn-more-error')).toBeTruthy();
  });

  it('each row links to where the action happens and shows its window', () => {
    rules.mockReturnValue({ isLoading: false, data: overview() });
    renderIt();
    expect(screen.getByTestId('earn-more-go-invite_friend_joined').getAttribute('href')).toBe('/invite');
    expect(screen.getByTestId('earn-more-go-first_diary').getAttribute('href')).toBe('/daily-diary');
    expect(screen.getByTestId('earn-more-action-live_room_15min').textContent).toMatch(/1.*3/);
  });

  it('a rule with no mapped route shows no button', () => {
    rules.mockReturnValue({
      isLoading: false,
      data: overview({ groups: [{ group: 'habits', rules: [{ id: 'mystery_rule', amount: 1, once: false, cap: null, earned: false, used_in_window: null }] }] }),
    });
    renderIt();
    expect(screen.getByTestId('earn-more-action-mystery_rule')).toBeTruthy();
    expect(screen.queryByTestId('earn-more-go-mystery_rule')).toBeNull();
  });

  it('all-done state when nothing can pay right now', () => {
    rules.mockReturnValue({
      isLoading: false,
      data: overview({ groups: [{ group: 'first_steps', rules: [{ id: 'first_diary', amount: 10, once: true, cap: null, earned: true, used_in_window: null }] }] }),
    });
    renderIt();
    expect(screen.getByTestId('earn-more-all-done')).toBeTruthy();
  });

  it('goal card: shortfall, can-redeem, hidden with an empty or failed shop', () => {
    rules.mockReturnValue({ isLoading: false, data: overview() });
    shop.mockReturnValue({ data: shopData([item('wine', 1200)]) });
    const a = renderIt();
    expect(screen.getByTestId('earn-more-goal-missing').textContent).toMatch(/1[.,\s]?090/);
    a.unmount();
    shop.mockReturnValue({ data: shopData([item('ticket', 100)]) });
    const b = renderIt();
    expect(screen.getByTestId('earn-more-goal-shop').getAttribute('href')).toBe('/wallet/rewards?tab=shop');
    b.unmount();
    shop.mockReturnValue({ data: shopData([]) });
    const c = renderIt();
    expect(screen.queryByTestId('earn-more-goal')).toBeNull();
    c.unmount();
    shop.mockReturnValue({ error: new Error('x') });
    renderIt();
    expect(screen.queryByTestId('earn-more-goal')).toBeNull();
  });
});

describe('wiring and data (VTID-05037)', () => {
  const root = join(__dirname, '../../..');

  it('every action route is a member screen in the registry', () => {
    const { screens } = JSON.parse(readFileSync(join(root, 'src/navigation/registry/screens.json'), 'utf8'));
    for (const route of new Set(Object.values(EARN_ACTION_ROUTES))) {
      const hit = screens.find((s: { route: string; access: string }) => s.route === route);
      expect(hit, route).toBeTruthy();
      expect(hit.access, route).toBe('member');
    }
  });

  it('Rewards page: Verdient / Mehr verdienen / Shop, old ?tab=intelligence mapped, no mock screen, no raw English', () => {
    const src = readFileSync(join(root, 'src/pages/wallet/Rewards.tsx'), 'utf8');
    expect(src).toContain('<SplitBarTrigger value="earn">');
    expect(src).toContain('<EarnMore />');
    expect(src).toContain('urlTab === "intelligence" ? "earn"');
    expect(src).not.toContain('EarningIntelligenceSplitScreen');
    expect(src).not.toMatch(/description="[A-Z]/);
    expect(existsSync(join(root, 'src/components/wallet/intelligence/EarningIntelligenceSplitScreen.tsx'))).toBe(false);
    const comp = readFileSync(join(__dirname, 'EarnMore.tsx'), 'utf8');
    expect(comp).not.toMatch(/mock/i);
  });

  it('DE and EN strings match', () => {
    const load = (lc: string) => JSON.parse(readFileSync(join(root, `src/i18n/${lc}/wallet.json`), 'utf8')).wallet;
    const keys = (o: Record<string, unknown>) => Object.keys(o).filter((k) => !k.startsWith('_')).sort();
    for (const ns of ['earnMore', 'rewardsPage']) {
      expect(keys(load('en')[ns])).toEqual(keys(load('de')[ns]));
    }
  });
});
