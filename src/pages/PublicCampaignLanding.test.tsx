/**
 * Regression test for VTID-03942 — a campaign linked to a sold-out event
 * still showed a "Buy Ticket" CTA instead of "Sold Out".
 *
 * PublicCampaignLanding fetches the linked event via the
 * `get_public_event_details` RPC (which already returns `is_sold_out`) but
 * dropped that field when building `linkedEventTickets`, then hardcoded
 * `isSoldOut: false` when computing the CTA — regardless of what the RPC
 * actually reported. The sibling page PublicEventLanding.tsx already wires
 * `event?.is_sold_out` through correctly; this test pins the same behavior
 * here.
 *
 * No live network/Supabase calls — `supabase.rpc` is mocked directly per
 * this repo's absolute rule against writing to (or depending on) any real
 * backend for verification.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PublicCampaignLanding from './PublicCampaignLanding';

const rpcMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'camp-1' }),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ translate: (_key: string, fallback?: string) => fallback ?? _key }),
}));
vi.mock('@/lib/i18n-toast', () => ({ t: (key: string) => key }));
vi.mock('@/lib/locale-format', () => ({ formatDate: () => '' }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/tickets/EventTicketSelector', () => ({ EventTicketSelector: () => null }));

const CAMPAIGN = {
  id: 'camp-1',
  name: 'Test Campaign',
  description: null,
  cover_image_url: null,
  status: 'active',
  start_date: null,
  end_date: null,
  target_channels: null,
  metadata: { event_id: 'event-1' },
  created_at: '2026-01-01T00:00:00Z',
  owner_id: 'owner-1',
  owner_name: 'Owner',
  owner_avatar: null,
};

function mockRpcResponses(event: Record<string, unknown>) {
  rpcMock.mockImplementation((fn: string) => {
    if (fn === 'get_public_campaign_details') {
      return Promise.resolve({ data: [CAMPAIGN], error: null });
    }
    if (fn === 'get_public_event_details') {
      return Promise.resolve({ data: [event], error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
}

describe('PublicCampaignLanding — linked event sold-out CTA (VTID-03942)', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('shows "Sold Out" when the linked event is sold out, instead of a buy-ticket CTA', async () => {
    mockRpcResponses({
      has_tickets: true,
      lowest_ticket_price: 25,
      is_paid_event: true,
      title: 'Linked Event',
      is_sold_out: true,
    });

    render(<PublicCampaignLanding />);

    await waitFor(() => {
      expect(screen.getByText('Sold Out')).toBeInTheDocument();
    });
    expect(screen.queryByText('Buy Ticket')).not.toBeInTheDocument();
  });

  it('does NOT show "Sold Out" when the linked event still has tickets available (no regression)', async () => {
    mockRpcResponses({
      has_tickets: true,
      // lowest_ticket_price deliberately null so the CTA label is the plain
      // "Buy Ticket" fallback, not "Buy Ticket · <price>" — this test is
      // about the sold-out flag, not price formatting.
      lowest_ticket_price: null,
      is_paid_event: true,
      title: 'Linked Event',
      is_sold_out: false,
    });

    render(<PublicCampaignLanding />);

    await waitFor(() => {
      expect(screen.getByText('Buy Ticket')).toBeInTheDocument();
    });
    expect(screen.queryByText('Sold Out')).not.toBeInTheDocument();
  });
});
