/**
 * VTID-05314 (messenger-ux-v2/ui-compact-grouping) — inside a run of one
 * sender's messages the avatar and name show once (first bubble), the corners
 * facing the neighbours are tightened with logical (RTL-safe) classes, the
 * last bubble keeps its tail, and other people's earlier bubbles move the
 * time to hover (title) / screen readers / the long-press drawer. My own
 * bubbles keep time and delivery status on every message.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
import type { GroupPosition } from '@/lib/messaging/grouping';

const CREATED = new Date(2026, 9, 21, 10, 7).toISOString(); // 10:07 local

function bubble(position: GroupPosition | undefined, own = false) {
  const view = render(
    <MemoryRouter>
      <MessageBubble
        message={{
          id: 'm1',
          sender_id: own ? 'me' : 'peer',
          sender: { user_id: own ? 'me' : 'peer', display_name: 'Peer Name' },
          body: 'hello',
          content: 'hello',
          message_type: 'text',
          created_at: CREATED,
          thread_id: 'peer',
        } as never}
        isOwnMessage={own}
        groupPosition={position}
      />
    </MemoryRouter>,
  );
  const surface = view.container.querySelector('div.select-none[tabindex="0"]') as HTMLElement;
  return { view, surface };
}

const visibleTime = () => screen.queryAllByText('10:07').filter((el) => !el.closest('[aria-hidden="true"]'));

describe('MessageBubble grouping (VTID-05314)', () => {
  it('without a position the bubble is unchanged: name, time, full corners', () => {
    const { surface } = bubble(undefined);
    expect(screen.getByText('Peer Name')).toBeTruthy();
    expect(visibleTime()).toHaveLength(1);
    expect(surface.className).not.toMatch(/rounded-(ss|se|es|ee)-md/);
    expect(surface.getAttribute('title')).toBeNull();
  });

  it('first bubble of someone else\'s group: name shown, time hidden from view but on hover and for screen readers', () => {
    const { surface } = bubble('first');
    expect(screen.getByText('Peer Name')).toBeTruthy();
    expect(visibleTime()).toHaveLength(0);
    expect(surface.getAttribute('title')).toMatch(/10:07/);
    expect(surface.querySelector('.sr-only')?.textContent).toMatch(/10:07/);
    expect(surface.className).toContain('rounded-es-md');
    expect(surface.className).not.toContain('rounded-ss-md');
  });

  it('middle bubble: no name, both start corners tightened, time hidden', () => {
    const { surface } = bubble('middle');
    expect(screen.queryByText('Peer Name')).toBeNull();
    expect(visibleTime()).toHaveLength(0);
    expect(surface.className).toContain('rounded-ss-md');
    expect(surface.className).toContain('rounded-es-md');
  });

  it('last bubble: no name, keeps the tail (bottom corner) and shows the time', () => {
    const { surface } = bubble('last');
    expect(screen.queryByText('Peer Name')).toBeNull();
    expect(visibleTime()).toHaveLength(1);
    expect(surface.className).toContain('rounded-ss-md');
    expect(surface.className).not.toContain('rounded-es-md');
    expect(surface.getAttribute('title')).toBeNull();
  });

  it('my own grouped bubbles use the end-side corners and keep time + status on every bubble', () => {
    const { surface } = bubble('middle', true);
    expect(surface.className).toContain('rounded-se-md');
    expect(surface.className).toContain('rounded-ee-md');
    expect(visibleTime()).toHaveLength(1);
    expect(screen.getByTestId('message-status-sent')).toBeTruthy();
  });

  it('a single bubble keeps the plain rounded shape', () => {
    const { surface } = bubble('single');
    expect(surface.className).toContain('rounded-2xl');
    expect(surface.className).not.toMatch(/rounded-(ss|se|es|ee)-md/);
    expect(surface.getAttribute('data-group-position')).toBe('single');
  });
});
