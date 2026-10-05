/**
 * VTID-04902 — an event link in a chat message opens the Events screen in the
 * app (owner report 2026-10-05: it opened the event card "inside the chat",
 * i.e. the public landing page in a browser layer over the chat).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k, t: (k: string) => k }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/hooks/useMessageReactions', () => ({
  useMessageReactions: () => ({ reactionSummary: [], addReaction: vi.fn(), removeReaction: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn(), from: () => ({}) } };
});

import MessageBubble from './MessageBubble';

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

function renderBubble(body: string) {
  return render(
    <MemoryRouter initialEntries={['/inbox/g/g1']}>
      <Routes>
        <Route
          path="/inbox/g/:groupId"
          element={
            <MessageBubble
              message={{ id: 'm1', sender_id: 'other', body, content: body, message_type: 'text', created_at: '2026-10-05T10:00:00Z', thread_id: 'g1', sender: { user_id: 'other', display_name: 'Mariia' } } as never}
              isOwnMessage={false}
            />
          }
        />
        <Route path="/comm/events-meetups" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MessageBubble event links (VTID-04902)', () => {
  it('navigates to the Events screen in the app', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderBubble('Komm vorbei: https://vitanaland.com/events/sommerfest-2026 !');
    const link = screen.getByText('https://vitanaland.com/events/sommerfest-2026');
    expect(link.getAttribute('target')).toBeNull();
    fireEvent.click(link);
    expect(screen.getByTestId('where').textContent).toBe('/comm/events-meetups?event=sommerfest-2026');
    expect(open).not.toHaveBeenCalled();
  });

  it('keeps other links as external links', () => {
    renderBubble('Siehe https://example.com/page');
    const link = screen.getByText('https://example.com/page');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
