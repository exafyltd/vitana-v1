/**
 * Desktop Spotlight finish (lane commerce-shell): /shop is `immersive` inside
 * AppLayout on desktop Spotlight, so the sidebar and the ORB stay (SR-04).
 * Phones / Spotlight off keep today's full-screen feed with no app shell.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

let spotlight = true;

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlight }));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));
vi.mock('@/components/layout/spotlight', async () => {
  const real = await vi.importActual<typeof import('@/components/layout/spotlight')>('@/components/layout/spotlight');
  return {
    ...real,
    ScreenFrame: ({ archetype, children }: { archetype: string; children: ReactNode }) => (
      <div data-archetype={archetype}>{children}</div>
    ),
  };
});
vi.mock('@/components/discover/ProductDetailsDrawer', () => ({ ProductDetailsDrawer: () => null }));
vi.mock('@/hooks/useShopFeed', () => ({
  useShopFeed: () => ({
    videos: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    error: null,
    roleBlocked: false,
    fetchNextPage: vi.fn(),
    refresh: vi.fn(),
  }),
  useShopEvents: () => ({ emit: vi.fn(), sessionId: 's1' }),
  useShopVideoAnchor: () => ({ anchor: null, isLoading: false, unavailable: false, error: null, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useUniversalCart', () => ({ useUniversalCart: () => ({ addItem: vi.fn(), isAdding: false, roleBlocked: false }) }));

import ShopFeed from '@/pages/ShopFeed';

const renderFeed = () =>
  render(
    <MemoryRouter>
      <ShopFeed />
    </MemoryRouter>,
  );

describe('ShopFeed under desktop Spotlight', () => {
  it('Spotlight on → the immersive frame inside AppLayout, no nested main landmark', () => {
    spotlight = true;
    const { container } = renderFeed();
    const shell = screen.getByTestId('app-layout');
    expect(shell.querySelector('[data-archetype="immersive"]')).toBeTruthy();
    expect(screen.getByText('videoShop.feed.emptyTitle')).toBeTruthy();
    expect(container.querySelector('main')).toBeNull();
  });

  it('Spotlight off (phones) → today’s full-screen feed, no app shell', () => {
    spotlight = false;
    const { container } = renderFeed();
    expect(screen.queryByTestId('app-layout')).toBeNull();
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('main')).toBeTruthy();
  });
});
