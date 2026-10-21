/**
 * Desktop Spotlight finish (lane commerce-shell): the Commerce Portal takes the
 * app shell (AppLayout: sidebar + ORB) for a signed-in member on the app host
 * on desktop Spotlight — the same skin the phone app already uses. Guests,
 * `commerce.vitanaland.com` and Spotlight off keep the standalone portal.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { mobile: false, spotlight: true, user: { id: 'u1' } as { id: string } | null, commerceHost: false };

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => state.mobile }));
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => state.spotlight }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: state.user, signOut: vi.fn() }) }));
vi.mock('@/lib/commerce-host', () => ({ isCommerceHost: () => state.commerceHost }));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k }));
vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

import { CommerceShell } from './CommerceShell';

const renderShell = () =>
  render(
    <MemoryRouter>
      <CommerceShell>
        <p>portal body</p>
      </CommerceShell>
    </MemoryRouter>,
  );

describe('CommerceShell skin under desktop Spotlight', () => {
  beforeEach(() => {
    Object.assign(state, { mobile: false, spotlight: true, user: { id: 'u1' }, commerceHost: false });
  });

  it('desktop + Spotlight + signed-in member + app host → AppLayout, children without the phone wrapper', () => {
    const { container } = renderShell();
    expect(screen.getByTestId('app-layout')).toBeTruthy();
    expect(screen.getByText('portal body')).toBeTruthy();
    expect(container.querySelector('[data-commerce-main]')).toBeNull();
    expect(container.querySelector('.max-w-5xl')).toBeNull();
  });

  it('guest → standalone portal', () => {
    state.user = null;
    const { container } = renderShell();
    expect(screen.queryByTestId('app-layout')).toBeNull();
    expect(container.querySelector('[data-commerce-main]')).toBeTruthy();
  });

  it('commerce.vitanaland.com → standalone portal', () => {
    state.commerceHost = true;
    const { container } = renderShell();
    expect(screen.queryByTestId('app-layout')).toBeNull();
    expect(container.querySelector('[data-commerce-main]')).toBeTruthy();
  });

  it('Spotlight off → standalone portal', () => {
    state.spotlight = false;
    const { container } = renderShell();
    expect(screen.queryByTestId('app-layout')).toBeNull();
    expect(container.querySelector('[data-commerce-main]')).toBeTruthy();
  });

  it('phone app (unchanged) → AppLayout with the phone wrapper', () => {
    Object.assign(state, { mobile: true, spotlight: false });
    const { container } = renderShell();
    expect(screen.getByTestId('app-layout')).toBeTruthy();
    expect(container.querySelector('.max-w-5xl')).toBeTruthy();
  });
});
