/**
 * VTID-05024 — on a phone the Wallet has its own layout (mode pills, no
 * SubNavigation), so Rewards needs its own way in: a "Rewards" pill and
 * /wallet?tab=rewards both open /wallet/rewards, and the Rewards screen shows
 * a back link to the Wallet instead of the desktop tab bar.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const isMobile = { value: true };
const rtl = { value: false };
vi.mock('@/components/RTLProvider', () => ({ useRTL: () => ({ isRTL: rtl.value }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => isMobile.value }));
vi.mock('@/lib/appilix', () => ({ isIAPRestricted: () => false }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/SubNavigation', () => ({ default: () => <nav data-testid="desktop-subnav" /> }));
vi.mock('@/components/StandardHeader', () => ({ default: () => null }));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/expandable-search-button', () => ({ ExpandableSearchButton: () => null }));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => null }));
vi.mock('@/components/wallet/VtnaRewardRules', () => ({ VtnaRewardRules: () => <div data-testid="earned" /> }));
vi.mock('@/components/wallet/RewardShop', () => ({ RewardShop: () => <div data-testid="shop" /> }));
vi.mock('@/components/wallet/EarnMore', () => ({ EarnMore: () => <div data-testid="earn-more" /> }));
vi.mock('@/lib/screen-id', () => ({
  SCREEN_IDS: new Proxy({}, { get: (_t, k) => String(k) }),
  withScreenId: (c: unknown) => c,
}));
// The mode pill opens a bottom sheet; here every mode is a plain button.
vi.mock('@/components/ui/MobileModePill', () => ({
  MobileModePill: ({ modes, onModeChange }: { modes: Array<{ value: string; label: string }>; onModeChange: (v: string) => void }) => (
    <div>
      {modes.map((m) => (
        <button key={m.value} data-testid={`mode-${m.value}`} onClick={() => onModeChange(m.value)}>{m.label}</button>
      ))}
    </div>
  ),
}));

import Rewards from './Rewards';

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

describe('Rewards screen on a phone (VTID-05024)', () => {
  beforeEach(() => { isMobile.value = true; });

  it('shows a back link to the Wallet and no desktop tab bar', () => {
    render(<MemoryRouter initialEntries={['/wallet/rewards?tab=shop']}><Rewards /></MemoryRouter>);
    expect(screen.getByTestId('rewards-back-to-wallet').getAttribute('href')).toBe('/wallet');
    expect(screen.queryByTestId('desktop-subnav')).toBeNull();
    expect(screen.getByTestId('shop')).toBeTruthy();
  });

  it('VTID-05037: the tabs follow the app direction (Arabic lays out right-to-left)', () => {
    rtl.value = true;
    const a = render(<MemoryRouter initialEntries={['/wallet/rewards?tab=earn']}><Rewards /></MemoryRouter>);
    expect(screen.getByRole('tablist').closest('[dir]')?.getAttribute('dir')).toBe('rtl');
    a.unmount();
    rtl.value = false;
    render(<MemoryRouter initialEntries={['/wallet/rewards?tab=intelligence']}><Rewards /></MemoryRouter>);
    expect(screen.getByRole('tablist').closest('[dir]')?.getAttribute('dir')).toBe('ltr');
    expect(screen.getByTestId('earn-more')).toBeTruthy();
  });

  it('desktop is unchanged: tab bar, no back link', () => {
    isMobile.value = false;
    render(<MemoryRouter initialEntries={['/wallet/rewards']}><Rewards /></MemoryRouter>);
    expect(screen.getByTestId('desktop-subnav')).toBeTruthy();
    expect(screen.queryByTestId('rewards-back-to-wallet')).toBeNull();
  });
});

describe('mobile Wallet → Rewards (VTID-05024)', () => {
  // Wallet.tsx pulls in many data hooks and popups; render it with those stubbed.
  beforeEach(() => { isMobile.value = true; });

  async function renderWallet(entry: string) {
    vi.doMock('@/hooks/useWallet', () => ({
      useWallet: () => ({ balances: [], transactions: [], loading: false, error: null, getBalance: () => 0, isLoaded: true, refreshData: vi.fn() }),
    }));
    vi.doMock('@/hooks/useDisplayCurrency', () => ({ useDisplayCurrency: () => ({ displayCurrency: 'EUR', setDisplayCurrency: vi.fn() }) }));
    vi.doMock('@/hooks/useEurUsdRate', () => ({ useEurUsdRate: () => ({ eurPerUsd: 0.9 }) }));
    vi.doMock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' }, loading: false }) }));
    vi.doMock('@/hooks/useWalletGateway', () => ({ useDeposit: () => ({ isTerminal: false, deposit: null }) }));
    vi.doMock('@/hooks/usePopupCoordination', () => ({ usePopupCoordination: () => ({ requestPopup: vi.fn(), clearPopup: vi.fn() }) }));
    vi.doMock('@/hooks/useActivityLogger', () => ({ useActivityLogger: () => ({ logActivity: vi.fn() }) }));
    vi.doMock('@/hooks/use-autopilot', () => ({ useAutopilot: () => ({ pendingCount: 0 }) }));
    vi.doMock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string, d?: string) => d ?? k }) }));
    const stub = () => null;
    const stubs: Record<string, string[]> = {
      '@/components/mobile/MobileActionChips': ['VitanaIndexChip', 'AutopilotChip'],
      '@/components/wallet/WalletMasterActionPopup': ['WalletMasterActionPopup'],
      '@/components/payment/PopupCoordinationWrapper': ['PopupCoordinationWrapper'],
      '@/components/wallet/popups/AddFundsPopup': ['AddFundsPopup'],
      '@/components/wallet/popups/BuyCreditsPopup': ['BuyCreditsPopup'],
      '@/components/wallet/popups/WithdrawPopup': ['WithdrawPopup'],
      '@/components/wallet/popups/SpendCreditsPopup': ['SpendCreditsPopup'],
      '@/components/payment/PaymentRequestPopup': ['default'],
      '@/components/payment/MakePaymentPopup': ['default'],
      '@/components/payment/ExchangeAndSendPopup': ['default'],
      '@/components/notifications/CrossSystemNotifier': ['CrossSystemNotifier'],
      '@/components/wallet/intelligence/PredictiveActionsCard': ['PredictiveActionsCard'],
      '@/components/wallet/intelligence/DynamicRewardOpportunityCard': ['DynamicRewardOpportunityCard'],
      '@/components/wallet/intelligence/SmartEarningsForecastCard': ['SmartEarningsForecastCard'],
      '@/components/wallet/intelligence/IntelligentSpendingCard': ['IntelligentSpendingCard'],
      '@/components/wallet/mobile/MobileWalletBalanceCard': ['MobileWalletBalanceCard'],
      '@/components/wallet/mobile/MobileWalletTransactionList': ['MobileWalletTransactionList'],
      '@/components/wallet/mobile/MobileWalletQuickActions': ['MobileWalletQuickActions'],
      '@/components/AutopilotPopup': ['AutopilotPopup'],
      '@/components/wallet/WalletMotivationalBanner': ['WalletMotivationalBanner'],
      '@/components/wallet/WalletBalanceCard': ['WalletBalanceCard'],
      '@/components/wallet/WalletTransactionCard': ['WalletTransactionCard'],
      '@/components/crossover/NewsCard': ['NewsCard'],
      '@/components/wallet/CurrencyToggle': ['CurrencyToggle'],
    };
    for (const [m, names] of Object.entries(stubs)) {
      vi.doMock(m, () => Object.fromEntries(names.map((n) => [n, stub])));
    }
    const { default: Wallet } = await import('../Wallet');
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/wallet" element={<><Wallet /><Where /></>} />
          <Route path="/wallet/rewards" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('has a Rewards pill next to Balances, Activity and Actions, and it opens /wallet/rewards', async () => {
    await renderWallet('/wallet');
    for (const m of ['balances', 'activity', 'actions', 'rewards']) expect(screen.getByTestId(`mode-${m}`)).toBeTruthy();
    fireEvent.click(screen.getByTestId('mode-rewards'));
    expect(screen.getByTestId('where').textContent).toBe('/wallet/rewards');
  });

  it('/wallet?tab=rewards opens the Rewards screen', async () => {
    await renderWallet('/wallet?tab=rewards');
    expect(await screen.findByText('/wallet/rewards')).toBeTruthy();
  });
});

describe('labels and voice registry (VTID-05024)', () => {
  const root = join(__dirname, '../../..');
  it('the new labels exist in German and English', () => {
    for (const lc of ['de', 'en']) {
      const w = JSON.parse(readFileSync(join(root, `src/i18n/${lc}/wallet.json`), 'utf8')).wallet;
      expect(w.tabs.rewards).toBeTruthy();
      expect(w.backToWallet).toBeTruthy();
    }
  });

  it('Vitana only opens Rewards tabs that exist', () => {
    const { screens } = JSON.parse(readFileSync(join(root, 'src/navigation/registry/screens.json'), 'utf8'));
    const rewards = screens.filter((s: { route: string }) => s.route.startsWith('/wallet/rewards'));
    for (const s of rewards) {
      const tab = new URL(s.route, 'https://x').searchParams.get('tab');
      expect(tab === null || ['earned', 'shop', 'earn'].includes(tab)).toBe(true);
    }
    expect(rewards.map((s: { id: string }) => s.id)).toContain('WALLET.REWARDS_SHOP');
  });
});
