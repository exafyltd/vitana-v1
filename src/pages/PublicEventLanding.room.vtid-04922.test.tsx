/**
 * VTID-04922 — a shared Live Room reaches /pub/events/<roomId>; when no event exists for a UUID and a
 * live stream does, the person is sent into the room; a plain missing event still shows "not found".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

let eventRows: unknown[] = [];
let streamRow: { id: string } | null = null;
const streamQuery = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: eventRows, error: null })),
    from: vi.fn((table: string) => {
      if (table !== 'community_live_streams') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }), single: () => Promise.resolve({ data: null }) }) }) };
      }
      return {
        select: () => ({
          eq: (_c: string, v: string) => {
            streamQuery(v);
            return { maybeSingle: () => Promise.resolve({ data: streamRow }) };
          },
        }),
      };
    }),
  },
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (_k: string, d: string) => d }) }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/tickets/EventTicketSelector', () => ({ EventTicketSelector: () => null }));

import PublicEventLanding from './PublicEventLanding';

const ROOM = '9c55506a-0b41-4f08-bce8-c63ba3f4edbf';

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/pub/events/:id" element={<PublicEventLanding />} />
        <Route path="/e/:slug" element={<PublicEventLanding />} />
        <Route path="/comm/live-rooms" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  eventRows = [];
  streamRow = null;
  streamQuery.mockClear();
});

describe('PublicEventLanding live-room fallback', () => {
  it('sends a UUID with no event but a live stream into the room', async () => {
    streamRow = { id: ROOM };
    renderAt(`/pub/events/${ROOM}`);
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe(`/comm/live-rooms?live=${ROOM}`));
  });

  it('shows not-found for a UUID that is neither an event nor a stream', async () => {
    renderAt(`/pub/events/${ROOM}`);
    await waitFor(() => expect(screen.getAllByText(/not found/i).length).toBeGreaterThan(0));
    expect(screen.queryByTestId('where')).toBeNull();
  });

  it('never queries live streams for a slug', async () => {
    renderAt('/e/some-typo-slug');
    await waitFor(() => expect(screen.getAllByText(/not found/i).length).toBeGreaterThan(0));
    expect(streamQuery).not.toHaveBeenCalled();
  });
});
