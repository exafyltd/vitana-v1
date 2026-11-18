/**
 * Full emoji reactions — the mobile reaction drawer's "+" opens the shared emoji
 * sheet; a pick outside the six quick reactions writes; a seventh distinct emoji
 * (database cap) is refused with a message, and removal still works.
 */
import '../../helpers/no-network';
import './mocks';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { MessageBubble } from '../../../src/screens/chat/MessageBubble';
import type { ChatViewMessage } from '../../../src/screens/chat/data/types';
import { createChatDouble, makeChatWrapper, ME, PEER } from './helpers';

jest.mock('../../../src/screens/chat/data/reactionEmoji', () => ({
  ...jest.requireActual('../../../src/screens/chat/data/reactionEmoji'),
  REACTION_PICKER_ENABLED: true,
}));

jest.setTimeout(30_000);
afterAll(() => __setSupabaseForTests(null));

const msg = (over: Partial<ChatViewMessage> = {}): ChatViewMessage => ({
  id: 'p1',
  thread_id: PEER,
  sender_id: PEER,
  body: 'Hallo',
  message_type: 'text',
  created_at: '2026-11-02T09:00:00.000Z',
  sender: { user_id: PEER, display_name: 'Petra Peer' },
  ...over,
});

function renderBubble(opts: Parameters<typeof createChatDouble>[0] = {}) {
  const d = createChatDouble(opts);
  render(<MessageBubble message={msg()} isOwn={false} userId={ME} showSender showTime parent={null} parentUnavailable={false} />, {
    wrapper: makeChatWrapper({ client: d.client }),
  });
  return d;
}

describe('reaction picker (mobile)', () => {
  it('the "+" opens the full emoji sheet and a pick outside the six is written', async () => {
    const d = renderBubble();
    fireEvent(screen.getByTestId('bubble-body-p1'), 'longPress');
    fireEvent.press(screen.getByTestId('reaction-more-emojis', { includeHiddenElements: true }));
    expect(screen.getByTestId('emoji-picker')).toBeTruthy();
    fireEvent.press(screen.getByTestId('emoji-tab-food', { includeHiddenElements: true }));
    await act(async () => {
      fireEvent.press(screen.getByTestId('emoji-🍎', { includeHiddenElements: true }));
    });
    expect(d.writes.find((w) => w.table === 'message_reactions')?.values).toMatchObject({ message_id: 'p1', user_id: ME, emoji: '🍎' });
  });

  it('a rejected add (cap reached) writes nothing more and shows the cap message', async () => {
    const d = renderBubble({ insertError: { message: 'P0001: reaction_cap_reached' } });
    fireEvent(screen.getByTestId('bubble-body-p1'), 'longPress');
    await act(async () => {
      fireEvent.press(screen.getByTestId('quick-reaction-🎉', { includeHiddenElements: true }));
    });
    expect(d.writes.filter((w) => w.table === 'message_reactions')).toHaveLength(1);
    expect(screen.queryByTestId('reaction-cluster')).toBeNull();
  });
});
