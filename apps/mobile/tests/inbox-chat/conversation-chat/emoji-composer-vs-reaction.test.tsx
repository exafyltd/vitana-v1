/**
 * The composer's emoji picker keeps every emoji a member used before (recents and the seed), including ones outside the
 * 181-emoji reaction set (for example 😎 👏 🙌 💯 ✨). Only the reaction "+" sheet is limited to the reaction set.
 */
import '../../helpers/no-network';
import './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { MessageInput } from '../../../src/screens/chat/MessageInput';
import { MessageBubble } from '../../../src/screens/chat/MessageBubble';
import type { ChatViewMessage } from '../../../src/screens/chat/data/types';
import { __resetRecentEmojiMemoryForTests, recentEmojiKey, recordRecentEmoji, RECENT_SEED } from '../../../src/screens/chat/data/emojiRecents';
import { createChatDouble, makeChatWrapper, ME, PEER } from './helpers';

jest.mock('../../../src/screens/chat/data/reactionEmoji', () => ({
  ...jest.requireActual('../../../src/screens/chat/data/reactionEmoji'),
  REACTION_PICKER_ENABLED: true,
}));

const SUNGLASSES = '\u{1F60E}'; // not in the reaction set
const APPLE = '\u{1F34E}';
jest.setTimeout(30_000);
afterAll(() => __setSupabaseForTests(null));
beforeEach(async () => {
  __resetRecentEmojiMemoryForTests();
  await AsyncStorage.clear();
  await AsyncStorage.setItem(recentEmojiKey(ME), JSON.stringify([SUNGLASSES, APPLE]));
});

describe('emoji recents: composer keeps every emoji, reactions use only the set', () => {
  it('the seed keeps its 16 composer emojis, including the ones outside the reaction set', () => {
    expect(RECENT_SEED).toHaveLength(16);
    for (const e of ['\u{1F60E}', '\u{1F44F}', '\u{1F64C}', '\u{1F4AF}', '\u2728']) expect(RECENT_SEED).toContain(e);
  });

  it('recording a composer pick outside the reaction set keeps it in the recents', async () => {
    const list = await recordRecentEmoji('\u{1F4AF}', ME);
    expect(list[0]).toBe('\u{1F4AF}');
    expect(JSON.parse((await AsyncStorage.getItem(recentEmojiKey(ME))) ?? '[]')).toEqual(['\u{1F4AF}', SUNGLASSES, APPLE]);
  });

  it('the composer picker shows a stored recent outside the reaction set', async () => {
    const d = createChatDouble();
    render(<MessageInput placeholder="Message…" onSend={jest.fn(async () => undefined)} currentUserId={ME} threadId="g1" conversationType="group" />, {
      wrapper: makeChatWrapper({ client: d.client }),
    });
    fireEvent.press(screen.getByTestId('emoji-picker-button'));
    await waitFor(() => expect(screen.getByTestId(`emoji-${SUNGLASSES}`, { includeHiddenElements: true })).toBeTruthy());
  });

  it('the reaction "+" sheet hides recents outside the reaction set and still offers supported ones', async () => {
    const d = createChatDouble();
    const msg: ChatViewMessage = { id: 'p1', thread_id: PEER, sender_id: PEER, body: 'Hallo', message_type: 'text', created_at: '2026-11-02T09:00:00.000Z', sender: { user_id: PEER, display_name: 'Petra' } };
    render(<MessageBubble message={msg} isOwn={false} userId={ME} showSender showTime parent={null} parentUnavailable={false} />, { wrapper: makeChatWrapper({ client: d.client }) });
    fireEvent(screen.getByTestId('bubble-body-p1'), 'longPress');
    await act(async () => {
      fireEvent.press(screen.getByTestId('reaction-more-emojis', { includeHiddenElements: true }));
    });
    await waitFor(() => expect(screen.getByTestId(`emoji-${APPLE}`, { includeHiddenElements: true })).toBeTruthy());
    expect(screen.queryByTestId(`emoji-${SUNGLASSES}`, { includeHiddenElements: true })).toBeNull();
  });
});
