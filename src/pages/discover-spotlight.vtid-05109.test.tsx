/**
 * VTID-05109 — the Discover overview switches on `useSpotlightEnabled()`:
 * flag on (desktop) → ScreenFrame storefront without the Overview SplitBar;
 * flag off → the legacy screen with its Suggested / Categories / Share & Earn
 * SplitBar exactly as before.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let spotlightOn = false;
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string) => k,
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/SubNavigation', () => ({
  default: ({ items }: { items: { id: string; name: string }[] }) => <nav data-testid="subnav">{items.map((i) => i.name).join(',')}</nav>,
}));
vi.mock('@/components/StandardHeader', () => ({
  default: (p: { title: string; density?: string }) => <header data-testid="header" data-density={p.density ?? 'default'}>{p.title}</header>,
}));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: (p: { children?: React.ReactNode }) => <div data-testid="utility">{p.children}</div>,
}));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => null }));
vi.mock('@/components/discover/DiscoverMasterActionPopup', () => ({ DiscoverMasterActionPopup: () => null }));
vi.mock('@/components/AutopilotPopup', () => ({ AutopilotPopup: () => null }));
vi.mock('@/components/health/VitanaIndexValue', () => ({ default: () => null }));
vi.mock('@/hooks/use-autopilot', () => ({ useAutopilot: () => ({ pendingCount: 0 }) }));
vi.mock('@/hooks/useActivityLogger', () => ({ useActivityLogger: () => ({ logActivity: vi.fn() }) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/components/discover/MarketplaceProductCard', () => ({ MarketplaceProductCard: () => <div data-testid="legacy-card" /> }));
vi.mock('@/components/discover/ProductDetailsDrawer', () => ({ ProductDetailsDrawer: () => null, ProductDetailsBody: () => null }));
vi.mock('@/components/discover/HiddenByLimitationsFooter', () => ({ HiddenByLimitationsFooter: () => null }));
vi.mock('@/components/discover/AffiliateDisclosure', () => ({ AffiliateDisclosure: () => null }));
vi.mock('@/components/discover/MobileDiscoverView', () => ({ MobileDiscoverView: () => null }));
vi.mock('@/components/cart/AddToCartButton', () => ({ AddToCartButton: () => null }));
vi.mock('@/components/sharing/UniversalShareButton', () => ({ UniversalShareButton: () => null }));
vi.mock('@/hooks/useMarketplace', async (orig) => {
  const ok = (data: unknown) => ({ data, isLoading: false, isError: false, refetch: vi.fn() });
  const product = { id: 'p1', title: 'Real product', images: [], price_cents: 990, currency: 'EUR', rating: null };
  return {
    ...(await orig<typeof import('@/hooks/useMarketplace')>()),
    useMarketplaceFeed: () => ok({ items: [product], feed_context: { guest: false }, hidden_breakdown: {} }),
    useMarketplaceSearch: () => ok({ items: [], total_count: 0 }),
    useMyRecommendations: () => ok({ items: [] }),
  };
});

import Discover from './Discover';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/discover']}>
      <Discover />
    </MemoryRouter>,
  );

describe('VTID-05109 Discover overview — Spotlight switch', () => {
  beforeEach(() => {
    spotlightOn = false;
  });

  it('flag off: the legacy screen, with its Overview SplitBar, unchanged', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(screen.getByText('screens.discover.suggestedForYou')).toBeInTheDocument();
    expect(screen.getByText('screens.discover.categories')).toBeInTheDocument();
    expect(screen.getByText('screens.discover.shareEarn')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toHaveAttribute('data-density', 'default');
    expect(container.querySelector('[data-discover-storefront]')).toBeNull();
  });

  it('flag on: ScreenFrame storefront — SubNavigation kept, compact header, no Overview SplitBar, one hero', () => {
    spotlightOn = true;
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype="storefront"]')).not.toBeNull();
    expect(screen.getByTestId('subnav').textContent).toContain('Supplements');
    expect(screen.getByTestId('header')).toHaveAttribute('data-density', 'compact');
    expect(screen.queryByText('screens.discover.suggestedForYou')).toBeNull();
    expect(screen.queryByText('screens.discover.categories')).toBeNull();
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(screen.getByText('Real product')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="legacy-card"]')).toBeNull();
  });
});
