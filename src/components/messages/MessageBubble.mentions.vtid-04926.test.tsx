/**
 * VTID-04926 — a member tagged in a group message shows as a link to their
 * profile; text that only looks like a tag stays plain.
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
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderBubble(body: string, mentions?: unknown) {
  return render(
    <MemoryRouter initialEntries={['/inbox/g/g1']}>
      <Routes>
        <Route
          path="/inbox/g/:groupId"
          element={
            <MessageBubble
              message={{ id: 'm1', sender_id: 'other', body, content: body, content_data: mentions ? { mentions } : null, message_type: 'text', created_at: '2026-10-06T19:35:00Z', thread_id: 'g1', sender: { user_id: 'other', display_name: 'Michael Lottmann' } } as never}
              isOwnMessage={false}
            />
          }
        />
        <Route path="/u/:id" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MessageBubble @mentions (VTID-04926)', () => {
  it('links a tagged member to their profile', () => {
    renderBubble('@Stefan Ehlke wir haben dich vermisst', [{ user_id: 'u-stefan', display_name: 'Stefan Ehlke' }]);
    const link = screen.getByTestId('message-mention');
    expect(link.textContent).toBe('@Stefan Ehlke');
    fireEvent.click(link);
    expect(screen.getByTestId('where').textContent).toBe('/u/u-stefan');
  });

  it('keeps URLs working next to a mention', () => {
    renderBubble('@Anna schau https://example.com/x', [{ user_id: 'u-anna', display_name: 'Anna' }]);
    expect(screen.getByTestId('message-mention').textContent).toBe('@Anna');
    expect(screen.getByText('https://example.com/x').getAttribute('target')).toBe('_blank');
  });

  it('leaves untagged @text plain (older messages, typed names)', () => {
    renderBubble('@stefan bist du da?');
    expect(screen.queryByTestId('message-mention')).toBeNull();
    expect(screen.getByText(/@stefan bist du da\?/)).toBeTruthy();
  });

  it('ignores a malformed mentions payload', () => {
    renderBubble('@Anna hi', 'not-an-array');
    expect(screen.queryByTestId('message-mention')).toBeNull();
  });
});
