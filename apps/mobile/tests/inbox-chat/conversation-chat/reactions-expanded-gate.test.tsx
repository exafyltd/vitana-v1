/**
 * Expanded reactions — mobile gate, with the shipped flag value (REACTION_PICKER_ENABLED = false). The hook adds only the
 * six quick reactions. Removals are never gated.
 */
import '../../helpers/no-network';
import './mocks';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { MessageBubble } from '../../../src/screens/chat/MessageBubble';
import type { ChatViewMessage } from '../../../src/screens/chat/data/types';
import { makeChatWrapper } from './helpers';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { useReactions } from '../../../src/screens/chat/data/useReactions';
import { createChatDouble, ME, PEER } from './helpers';

const APPLE = '\u{1F34E}';
const HEART = '\u2764\uFE0F';
jest.setTimeout(30_000);
afterAll(() => __setSupabaseForTests(null));

function setup(rows: Array<Record<string, string>> = []) {
  const d = createChatDouble({ rpc: { get_message_reactions_text: () => ({ data: rows, error: null }) } });
  __setSupabaseForTests(d.client as never);
  return d;
}

describe('reactions gate (mobile): picker flag off', () => {
  it('refuses an emoji outside the six and writes nothing', async () => {
    const d = setup();
    const { result } = renderHook(() => useReactions('p1', ME));
    await act(async () => {
      expect(await result.current.addReaction(APPLE)).toBe('ignored');
    });
    expect(d.writes.filter((w) => w.table === 'message_reactions')).toHaveLength(0);
  });

  it('adds a quick reaction (bare heart stored canonical)', async () => {
    const d = setup();
    const { result } = renderHook(() => useReactions('p1', ME));
    await act(async () => {
      expect(await result.current.addReaction('\u2764')).toBe('added');
    });
    expect(d.writes.find((w) => w.table === 'message_reactions')?.values).toMatchObject({ emoji: HEART });
  });

  it('removes an outside-six reaction the member already has', async () => {
    const d = setup([{ message_id: 'p1', user_id: ME, emoji: APPLE, created_at: '2026-11-18T10:00:00.000Z' }]);
    const { result } = renderHook(() => useReactions('p1', ME));
    await waitFor(() => expect(result.current.summary).toHaveLength(1));
    await act(async () => {
      await result.current.removeReaction(APPLE);
    });
    expect(d.writes.find((w) => w.table === 'message_reactions' && w.op === 'delete')).toBeTruthy();
  });
});

// The picker-on path (any emoji of the set) is covered by reactions-picker.test.tsx, which turns the flag on in-process.

describe('reactions gate (mobile): no "+" while the flag is off', () => {
  it('the reaction drawer has no expanded-picker button', () => {
    const d = setup();
    const msg: ChatViewMessage = { id: 'p1', thread_id: PEER, sender_id: PEER, body: 'Hallo', message_type: 'text', created_at: '2026-11-02T09:00:00.000Z', sender: { user_id: PEER, display_name: 'Petra' } };
    render(<MessageBubble message={msg} isOwn={false} userId={ME} showSender showTime parent={null} parentUnavailable={false} />, { wrapper: makeChatWrapper({ client: d.client }) });
    fireEvent(screen.getByTestId('bubble-body-p1'), 'longPress');
    // Positive control: the drawer rendered, so the missing "+" below is not a broken render.
    expect(screen.getByTestId('quick-reaction-\u{1F44D}', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('reaction-more-emojis', { includeHiddenElements: true })).toBeNull();
  });
});
