/**
 * VTID-04983 — Wallet › Rewards › Shop: items priced in earned VTNA, the
 * member's balance or shortfall, the age and address steps, and the redeem
 * call (which never carries a price). Ship items hand off to Stripe.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RewardShop as ShopData } from '@/hooks/useRewardShop';

const mockUseRewardShop = vi.fn();
const mockRedeem = vi.fn();
vi.mock('@/hooks/useRewardShop', async (orig) => ({
  ...(await orig<typeof import('@/hooks/useRewardShop')>()),
  useRewardShop: () => mockUseRewardShop(),
  useRewardOrders: () => ({ data: [] }),
  redeemRewardItem: (...a: unknown[]) => mockRedeem(...a),
}));
vi.mock('@/hooks/useEurUsdRate', () => ({ useEurUsdRate: () => ({ eurPerUsd: 0.9 }) }));

import { RewardShop } from './RewardShop';

const shop: ShopData = {
  ok: true,
  eur_per_vtna: 0.01,
  earned_balance: 1000,
  items: [
    {
      id: 'i-ticket', slug: 'event-ticket', titles: { de: 'Ticket DE', en: 'Event ticket' }, descriptions: {}, images: [],
      vtna_price: 300, eur_value: 3, fulfilment: 'event', age_restricted: false, min_age: null, ships_to_countries: [],
      available: true, affordable: true,
    },
    {
      id: 'i-wine', slug: 'son-amaret-chardonnay', titles: { de: 'Son Amaret Chardonnay' }, descriptions: {}, images: [],
      vtna_price: 1200, eur_value: 12, fulfilment: 'ship', age_restricted: true, min_age: 18, ships_to_countries: ['DE'],
      available: true, affordable: false,
    },
  ],
  shipping_fees: [{ country: 'DE', currency: 'EUR', fee_cents: 690 }],
};

function renderShop() {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}><RewardShop /></QueryClientProvider>);
}

describe('RewardShop (VTID-04983)', () => {
  beforeEach(() => {
    mockUseRewardShop.mockReset();
    mockRedeem.mockReset();
    window.localStorage.removeItem('vitana.wallet.displayCurrency');
  });

  it('shows loading, error and the empty shop', () => {
    mockUseRewardShop.mockReturnValue({ isLoading: true });
    const { unmount } = renderShop();
    expect(screen.getByTestId('reward-shop-loading')).toBeTruthy();
    unmount();
    mockUseRewardShop.mockReturnValue({ isLoading: false, error: new Error('x') });
    const r2 = renderShop();
    expect(screen.getByTestId('reward-shop-error')).toBeTruthy();
    r2.unmount();
    mockUseRewardShop.mockReturnValue({ isLoading: false, data: { ...shop, items: [] } });
    renderShop();
    expect(screen.getByTestId('reward-shop-empty')).toBeTruthy();
  });

  it('lists items with their VTNA price and the balance', () => {
    mockUseRewardShop.mockReturnValue({ isLoading: false, data: shop });
    renderShop();
    expect(screen.getByTestId('reward-shop-item-event-ticket')).toBeTruthy();
    expect(screen.getByTestId('reward-shop-price-son-amaret-chardonnay').textContent).toMatch(/1[.,\s]?200/);
    expect(screen.getByTestId('reward-shop-earned').textContent).toMatch(/1[.,\s]?000/);
  });

  it('an event item redeems with a key and never sends a price', async () => {
    mockUseRewardShop.mockReturnValue({ isLoading: false, data: shop });
    mockRedeem.mockResolvedValue({ ok: true, order_id: 'o-1', status: 'paid', vtna_amount: 300 });
    renderShop();
    fireEvent.click(screen.getByTestId('reward-shop-open-event-ticket'));
    fireEvent.click(screen.getByTestId('reward-shop-confirm'));
    await waitFor(() => expect(mockRedeem).toHaveBeenCalledTimes(1));
    const req = mockRedeem.mock.calls[0][0];
    expect(req).toMatchObject({ item_id: 'i-ticket', currency: 'EUR' });
    expect(typeof req.idempotency_key).toBe('string');
    expect(JSON.stringify(req)).not.toMatch(/price|amount/);
  });

  it('the wine needs the age step and an address, and shows the shortfall', () => {
    mockUseRewardShop.mockReturnValue({ isLoading: false, data: shop });
    renderShop();
    fireEvent.click(screen.getByTestId('reward-shop-open-son-amaret-chardonnay'));
    expect(screen.getByTestId('reward-shop-balance').textContent).toMatch(/200/);
    expect(screen.getByLabelText(/geburtsdatum|date of birth/i)).toBeTruthy();
    expect(screen.getByTestId('reward-shop-fee')).toBeTruthy();
    expect((screen.getByTestId('reward-shop-confirm') as HTMLButtonElement).disabled).toBe(true);
  });

  it('the Rewards page has the Shop tab and no hardcoded sample data', () => {
    const src = readFileSync(join(__dirname, '../../pages/wallet/Rewards.tsx'), 'utf8');
    expect(src).toContain('<SplitBarTrigger value="shop">');
    expect(src).toContain('<RewardShop shippingReturn={shippingReturn} />');
    expect(src).not.toContain('rewardsData');
    expect(src).not.toMatch(/console\.log/);
  });

  it('every shop string exists in German and English', () => {
    const load = (lc: string) => JSON.parse(readFileSync(join(__dirname, `../../i18n/${lc}/wallet.json`), 'utf8')).wallet.rewardShop;
    const de = load('de');
    const en = load('en');
    const keys = (o: Record<string, unknown>, p = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) => (k.startsWith('_') ? [] : v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
    expect(keys(en).sort()).toEqual(keys(de).sort());
    expect(de.status.awaiting_shipping_payment).toBeTruthy();
    expect(de.errors.INSUFFICIENT_BALANCE).toBeTruthy();
  });
});
