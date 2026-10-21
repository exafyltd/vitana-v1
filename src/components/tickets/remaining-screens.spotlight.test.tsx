/**
 * Desktop Spotlight finish (lane remaining-screens): /redeem and /delete-account
 * on the `form` archetype, /tickets/demo and /tickets/success on `detail`, each
 * inside the app shell (AppLayout) for a signed-in member on desktop Spotlight.
 * Spotlight off (phones, flag off) and signed-out visitors keep today's page.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { spotlight: true, user: { id: 'u1' } as { id: string } | null };

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => state.spotlight }));
vi.mock('@/context/AuthProvider', () => ({
  useAuth: () => ({ user: state.user, session: null, loading: false, signOut: vi.fn() }),
}));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('@/components/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));
vi.mock('@/components/StandardHeader', () => ({
  default: ({ title }: { title: string }) => <div data-testid="standard-header">{title}</div>,
}));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/tickets/EventTicket', () => ({
  EventTicket: ({ eventTitle }: { eventTitle: string }) => <div data-testid="event-ticket">{eventTitle}</div>,
}));
vi.mock('@/hooks/useEventTickets', () => ({ useTicketPurchase: () => ({ purchase: null, loading: false, error: null }) }));
vi.mock('@/hooks/useRedeemVoucher', () => ({
  useVoucherByCode: () => ({ data: undefined, isLoading: false, error: null }),
  useClaimVoucher: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn(), functions: { invoke: vi.fn() } } }));

import RedeemVoucher from '@/pages/RedeemVoucher';
import TicketDemo from '@/pages/TicketDemo';
import TicketPurchaseSuccess from '@/pages/TicketPurchaseSuccess';
import DeleteAccount from '@/pages/legal/DeleteAccount';

const at = (ui: ReactNode, path = '/') => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);

const CASES: { name: string; ui: () => ReactNode; path: string; archetype: 'form' | 'detail' }[] = [
  { name: '/redeem', ui: () => <RedeemVoucher />, path: '/redeem', archetype: 'form' },
  { name: '/delete-account', ui: () => <DeleteAccount />, path: '/delete-account', archetype: 'form' },
  { name: '/tickets/demo', ui: () => <TicketDemo />, path: '/tickets/demo', archetype: 'detail' },
  { name: '/tickets/success', ui: () => <TicketPurchaseSuccess />, path: '/tickets/success', archetype: 'detail' },
];

describe('remaining screens under desktop Spotlight', () => {
  beforeEach(() => {
    Object.assign(state, { spotlight: true, user: { id: 'u1' } });
  });

  for (const c of CASES) {
    it(`${c.name}: signed-in member → AppLayout + data-archetype="${c.archetype}"`, () => {
      const { container } = at(c.ui(), c.path);
      expect(screen.getByTestId('app-layout')).toBeTruthy();
      const frames = container.querySelectorAll('[data-archetype]');
      expect(frames).toHaveLength(1);
      expect(frames[0].getAttribute('data-archetype')).toBe(c.archetype);
      if (c.archetype === 'detail') {
        expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
      }
    });

    it(`${c.name}: Spotlight off → today's page, no shell, no frame`, () => {
      state.spotlight = false;
      const { container } = at(c.ui(), c.path);
      expect(screen.queryByTestId('app-layout')).toBeNull();
      expect(container.querySelector('[data-archetype]')).toBeNull();
      expect(container.querySelector('[data-vcard-size]')).toBeNull();
    });

    it(`${c.name}: signed-out visitor → today's page, no shell`, () => {
      state.user = null;
      const { container } = at(c.ui(), c.path);
      expect(screen.queryByTestId('app-layout')).toBeNull();
      expect(container.querySelector('[data-archetype]')).toBeNull();
    });
  }

  it('/tickets/demo: the demo ticket is inside the one spotlight VCard; brand picker and features are in the rail', () => {
    const { container } = at(<TicketDemo />, '/tickets/demo');
    const spot = container.querySelector('[data-vcard-size="spotlight"]')!;
    expect(spot.querySelector('[data-testid="event-ticket"]')).toBeTruthy();
    const rail = container.querySelector('[data-spotlight-rail]');
    expect(rail?.textContent).toContain('screens.ticketdemo.selectTenantBrand');
    expect(rail?.textContent).toContain('screens.ticketdemo.ticketFeatures');
  });

  it('/delete-account: the confirm flow is unchanged — info step first, no dialog open', () => {
    at(<DeleteAccount />, '/delete-account');
    expect(screen.getByText('screens.legal.deleteMyAccount')).toBeTruthy();
    expect(screen.queryByText('screens.legal.finalConfirmation')).toBeNull();
  });
});
