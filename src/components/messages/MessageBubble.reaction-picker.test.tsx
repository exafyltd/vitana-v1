/**
 * Full emoji reactions — web pickers. The desktop context menu and the phone
 * long-press drawer both show the six shortcuts; behind REACTION_PICKER_ENABLED
 * both get a "+" that opens the emoji picker limited to the shared supported set
 * (a recent such as 😎 that cannot be a reaction is not offered), and a pick
 * outside the six is added as a reaction. With the flag off there is no "+".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const flags = vi.hoisted(() => ({ picker: true }));
const addReaction = vi.hoisted(() => vi.fn());

vi.mock('@/lib/reactions/reactionEmoji', async (orig) => {
  const real = await orig<typeof import('@/lib/reactions/reactionEmoji')>();
  return {
    ...real,
    get REACTION_PICKER_ENABLED() {
      return flags.picker;
    },
  };
});
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k, t: (k: string) => k }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useMessageReactions', () => ({
  useMessageReactions: () => ({ reactionSummary: [], addReaction, removeReaction: vi.fn() }),
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
import { QUICK_REACTIONS } from '@/lib/reactions/reactionEmoji';

const APPLE = '\u{1F34E}';

function bubble() {
  const view = render(
    <MemoryRouter>
      <MessageBubble
        message={{
          id: 'm1',
          sender_id: 'peer',
          sender: { user_id: 'peer', display_name: 'Peer Name' },
          body: 'hello',
          content: 'hello',
          message_type: 'text',
          created_at: new Date(2026, 10, 18, 10, 7).toISOString(),
          thread_id: 'peer',
        } as never}
        isOwnMessage={false}
      />
    </MemoryRouter>,
  );
  const surface = view.container.querySelector('div.select-none[tabindex="0"]') as HTMLElement;
  return { view, surface };
}

function openDrawer(surface: HTMLElement) {
  vi.useFakeTimers();
  fireEvent.touchStart(surface, { touches: [{ clientX: 1, clientY: 1 }] });
  act(() => {
    vi.advanceTimersByTime(800);
  });
  fireEvent.touchEnd(surface);
  vi.useRealTimers();
}

beforeEach(() => {
  flags.picker = true;
  addReaction.mockClear();
  localStorage.clear();
  // No AuthContext in these renders, so the picker reads the device-wide recents key.
  localStorage.setItem('vitana:emoji:recent:v1', JSON.stringify(['\u{1F60E}', '\u{1F44D}']));
});

describe('web reaction pickers', () => {
  it('phone drawer: the six shortcuts and, with the flag on, a "+" whose picker offers only supported emojis', async () => {
    const { surface } = bubble();
    openDrawer(surface);
    const drawer = screen.getByTestId('message-reaction-drawer');
    for (const e of QUICK_REACTIONS) expect(within(drawer).getByRole('button', { name: `React with ${e}` })).toBeTruthy();
    fireEvent.click(within(drawer).getByTestId('drawer-reaction-more-emojis'));
    const picker = await screen.findByTestId('emoji-picker-grid');
    expect(within(picker).queryByText('\u{1F60E}')).toBeNull(); // a recent that is not a reaction emoji
    expect(within(picker).getByText('\u{1F44D}')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'food' }));
    fireEvent.click(within(screen.getByTestId('emoji-picker-grid')).getByText(APPLE));
    expect(addReaction).toHaveBeenCalledWith(APPLE);
  });

  it('phone drawer: no "+" while the flag is off', () => {
    flags.picker = false;
    const { surface } = bubble();
    openDrawer(surface);
    expect(screen.queryByTestId('drawer-reaction-more-emojis')).toBeNull();
  });

  it('desktop context menu: six shortcuts and a "+" limited to the supported set', async () => {
    const { surface } = bubble();
    fireEvent.contextMenu(surface);
    for (const e of QUICK_REACTIONS) expect(screen.getAllByText(e).length).toBeGreaterThan(0);
    fireEvent.click(await screen.findByTestId('reaction-more-emojis'));
    const picker = await screen.findByTestId('emoji-picker-grid');
    expect(within(picker).queryByText('\u{1F60E}')).toBeNull();
    expect(within(picker).getByText('\u{1F44D}')).toBeTruthy();
  });
});
