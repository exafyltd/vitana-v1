/**
 * VTID-05100 — a Vitana companion message renders its Unified Card System card
 * (metadata.card, read as content_data.card) under Vitana's note, with the
 * same card component as everywhere else (owner decision D3). Only the Vitana
 * bot's messages get a card; another sender or a malformed payload stays a
 * plain bubble. The card's button opens its screen; no X in the chat.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { VITANA_BOT_USER_ID } from '@/lib/vitanaBotIdentity';

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k, t: (k: string) => k }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/hooks/useMessageReactions', () => ({
  useMessageReactions: () => ({ reactionSummary: [], addReaction: vi.fn(), removeReaction: vi.fn() }),
}));
const dismiss = vi.fn();
vi.mock('@/hooks/useCardDismiss', () => ({ useCardDismiss: () => ({ isDismissed: false, dismiss }) }));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn(), from: () => ({}) } };
});

import MessageBubble from './MessageBubble';

const NOTE = 'Ein Foto macht dein Profil lebendig.';
const CARD = { kind: 'vitana_card', v: 1, card_type: 'E1', params: { days_since_signup: 3 } };

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.hash}</div>;
}

function renderBubble(senderId: string, metadata: unknown) {
  return render(
    <MemoryRouter initialEntries={[`/inbox/u/${VITANA_BOT_USER_ID}`]}>
      <Routes>
        <Route
          path="/inbox/u/:userId"
          element={
            <MessageBubble
              message={{
                id: 'm1',
                sender_id: senderId,
                body: NOTE,
                content: NOTE,
                message_type: 'text',
                content_data: metadata,
                created_at: '2026-10-13T08:00:00Z',
                thread_id: senderId,
                sender: { user_id: senderId, display_name: 'Someone' },
              } as never}
              isOwnMessage={false}
            />
          }
        />
        <Route path="/me/profile" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => dismiss.mockReset());

describe('MessageBubble — Vitana companion card (VTID-05100)', () => {
  it("a Vitana message with a card payload shows Vitana's note and the card under it", () => {
    renderBubble(VITANA_BOT_USER_ID, { source: 'companion', moment_key: 'profile_photo', card: CARD });
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    const card = screen.getByTestId('vitana-companion-card');
    expect(card.querySelector('[role="button"]')).not.toBeNull();
  });

  it("the card's tap opens the card's screen, and the card has no X in the chat", () => {
    renderBubble(VITANA_BOT_USER_ID, { source: 'companion', card: CARD });
    const card = screen.getByTestId('vitana-companion-card');
    // Only the card's own action button; the X (lucide-x) is absent.
    expect(card.querySelectorAll('button').length).toBe(1);
    expect(card.querySelector('svg.lucide-x')).toBeNull();
    fireEvent.click(card.querySelector('[role="button"]') as HTMLElement);
    expect(screen.getByTestId('where').textContent).toBe('/me/profile#avatar');
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('another sender with the same card payload stays a plain bubble', () => {
    renderBubble('someone-else', { card: CARD });
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(screen.queryByTestId('vitana-companion-card')).toBeNull();
  });

  it.each([
    ['no card', { source: 'companion' }],
    ['wrong kind', { card: { ...CARD, kind: 'card' } }],
    ['unknown version', { card: { ...CARD, v: 2 } }],
    ['unknown card_type', { card: { ...CARD, card_type: 'Z9' } }],
    ['params not an object', { card: { ...CARD, params: [] } }],
    ['no metadata', undefined],
  ])('a Vitana message with a malformed payload (%s) stays a plain bubble', (_label, metadata) => {
    renderBubble(VITANA_BOT_USER_ID, metadata);
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(screen.queryByTestId('vitana-companion-card')).toBeNull();
  });
});
