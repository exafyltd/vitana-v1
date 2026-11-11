/**
 * VTID-05732 — direct threads hide avatars (VTID-05584), so the bubble row must
 * not reserve an avatar column there: incoming bubbles sit flush left and own
 * bubbles flush right. With avatars shown (group threads) the column stays.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k, t: (k: string) => k }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useMessageReactions', () => ({
  useMessageReactions: () => ({ reactionSummary: [], addReaction: vi.fn(), removeReaction: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn(), from: () => ({}) } };
});
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string) => k,
}));

import MessageBubble from './MessageBubble';

function renderBubble(own: boolean, showAvatar: boolean) {
  return render(
    <MemoryRouter>
      <MessageBubble
        message={{
          id: 'm1',
          sender_id: own ? 'me' : 'peer',
          sender: { user_id: own ? 'me' : 'peer', display_name: 'Peer Name' },
          body: 'hello',
          content: 'hello',
          message_type: 'text',
          created_at: new Date(2026, 9, 21, 10, 7).toISOString(),
          thread_id: 'peer',
        } as never}
        isOwnMessage={own}
        showAvatar={showAvatar}
        groupPosition={undefined}
      />
    </MemoryRouter>,
  );
}

// The avatar column is the `w-8 flex` wrapper rendered by MessageBubble.
const avatarColumn = (root: HTMLElement) => root.querySelector('div.w-8.flex');

describe('MessageBubble in direct threads (VTID-05732)', () => {
  it('incoming bubble reserves no avatar column when avatars are hidden', () => {
    const { container } = renderBubble(false, false);
    expect(avatarColumn(container)).toBeNull();
  });

  it('own bubble reserves no avatar column when avatars are hidden', () => {
    const { container } = renderBubble(true, false);
    expect(avatarColumn(container)).toBeNull();
  });

  it('keeps the avatar column when avatars are shown (group threads)', () => {
    const { container } = renderBubble(false, true);
    expect(avatarColumn(container)).not.toBeNull();
  });
});
