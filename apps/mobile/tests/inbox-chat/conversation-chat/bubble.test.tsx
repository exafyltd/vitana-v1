/**
 * VTID-05458 — every MessageBubble variant (text, picture attachment, file,
 * @mention, link, reply quote, reaction cluster, forwarded, calendar invite,
 * system notice), the send-status icons, the dividers (day / unread) and the
 * swipe-to-reply gesture. Supabase double only (reactions RPC, signed URLs).
 */
import '../../helpers/no-network';
import { router } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { MessageBubble } from '../../../src/screens/chat/MessageBubble';
import { MessageList } from '../../../src/screens/chat/MessageList';
import type { ChatViewMessage } from '../../../src/screens/chat/data/types';
import { createChatDouble, makeChatWrapper, ME, PEER } from './helpers';

// Several screens or locales per test: more than the 5 s Jest default.
jest.setTimeout(30_000);

afterAll(() => __setSupabaseForTests(null));

const base = (over: Partial<ChatViewMessage>): ChatViewMessage => ({
  id: 'b1',
  thread_id: PEER,
  sender_id: PEER,
  body: 'Hallo',
  message_type: 'text',
  created_at: '2026-11-02T09:00:00.000Z',
  sender: { user_id: PEER, display_name: 'Petra Peer' },
  ...over,
});

function renderBubble(message: ChatViewMessage, extra: Partial<Parameters<typeof MessageBubble>[0]> = {}, rpc?: Record<string, () => { data: unknown; error: null }>) {
  const d = createChatDouble({ rpc });
  render(<MessageBubble message={message} isOwn={message.sender_id === ME} userId={ME} showSender showTime parent={null} parentUnavailable={false} {...extra} />, {
    wrapper: makeChatWrapper({ client: d.client }),
  });
  return d;
}

describe('MessageBubble variants', () => {
  it('text from someone else: flush left (no avatar indent), name on the first bubble', () => {
    renderBubble(base({}));
    expect(screen.getByText('Hallo')).toBeTruthy();
    expect(screen.getByText('Petra Peer')).toBeTruthy();
    expect(screen.getByTestId('bubble-row-other').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ justifyContent: 'flex-start' })]));
  });

  it('own text: end-aligned with the send status (sent / delivered / read / sending / failed)', () => {
    renderBubble(base({ id: 'o1', sender_id: ME, read_at: '2026-11-02T09:01:00.000Z' }));
    expect(screen.getByTestId('bubble-row-own').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ justifyContent: 'flex-end' })]));
    expect(screen.getByTestId('message-status-read').props.accessibilityLabel).toBe('Read');
  });

  it.each([
    [{ id: 's1' }, 'sent'],
    [{ id: 's2', delivered_at: '2026-11-02T09:01:00.000Z' }, 'delivered'],
    [{ id: 'temp-x', send_status: 'sending' as const }, 'sending'],
    [{ id: 'temp-y', send_status: 'failed' as const, client_message_id: 'y' }, 'failed'],
  ])('status %j → %s', (over, status) => {
    renderBubble(base({ sender_id: ME, ...over }), { onRetry: jest.fn() });
    expect(screen.getByTestId(`message-status-${status}`)).toBeTruthy();
  });

  it('a picture attachment is shown from a fresh chat-attachments signed URL and opens the viewer', async () => {
    renderBubble(base({ body: '', message_type: 'attachment', content_data: { attachments: [{ type: 'image', path: 'u/p.jpg', filename: 'p.jpg' }] } }));
    expect(screen.getByTestId('chat-image-skeleton')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('chat-image')).toBeTruthy());
    fireEvent.press(screen.getByTestId('chat-image'));
    expect(screen.getByTestId('chat-image-viewer')).toBeTruthy();
  });

  it('a non-picture attachment is a file chip; an old "Shared <file>" caption is hidden', () => {
    renderBubble(base({ body: 'Shared plan.pdf', message_type: 'attachment', content_data: { attachments: [{ type: 'file', url: 'https://x.test/plan.pdf', filename: 'plan.pdf' }] } }));
    expect(screen.getByTestId('chat-file')).toBeTruthy();
    expect(screen.queryByText('Shared plan.pdf')).toBeNull();
  });

  it('an @mention links to the member profile', () => {
    renderBubble(base({ body: 'Hi @Leo Lion, schau mal', content_data: { mentions: [{ user_id: 'u-leo', display_name: 'Leo Lion' }] } }));
    fireEvent.press(screen.getByTestId('message-mention'));
    expect(router.navigate).toHaveBeenCalledWith('/u/u-leo');
  });

  it('a URL is a link opened outside the app (trailing punctuation stays text)', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderBubble(base({ body: 'Siehe https://example.org/a.' }));
    fireEvent.press(screen.getByTestId('message-link'));
    expect(open).toHaveBeenCalledWith('https://example.org/a');
    open.mockRestore();
  });

  it('a reply quote shows the original and jumps to it; an unavailable original says so', () => {
    const onJumpTo = jest.fn();
    renderBubble(base({ id: 'r1', reply_to_message_id: 'p1' }), { parent: base({ id: 'p1', body: 'Original', sender: { user_id: ME, display_name: 'Mia Me' } }), onJumpTo });
    expect(screen.getByText('Original')).toBeTruthy();
    fireEvent.press(screen.getByTestId('reply-quote'));
    expect(onJumpTo).toHaveBeenCalledWith('p1');
  });

  it('reply quote whose original is gone', () => {
    renderBubble(base({ id: 'r2', reply_to_message_id: 'gone' }), { parentUnavailable: true });
    expect(screen.getByTestId('reply-quote-unavailable')).toBeTruthy();
  });

  it('reactions come from rpc get_message_reactions_text and render as a cluster', async () => {
    const d = renderBubble(base({ id: 'x1' }), {}, {
      get_message_reactions_text: () => ({ data: [{ message_id: 'x1', user_id: PEER, emoji: '👍', created_at: 'a' }, { message_id: 'x1', user_id: ME, emoji: '👍', created_at: 'b' }], error: null }),
    });
    await waitFor(() => expect(screen.getByTestId('reaction-cluster')).toBeTruthy());
    expect(screen.getByText('2')).toBeTruthy();
    expect(d.calls.find((c) => c.fn === 'rpc.get_message_reactions_text')?.args[0]).toEqual({ message_id_param: 'x1' });
  });

  it('long-press → quick reaction inserts into message_reactions', async () => {
    const d = renderBubble(base({ id: 'x2' }));
    fireEvent(screen.getByTestId('bubble-body-x2'), 'longPress');
    await act(async () => {
      fireEvent.press(screen.getByTestId('quick-reaction-❤', { includeHiddenElements: true }));
    });
    expect(d.writes.find((w) => w.table === 'message_reactions')?.values).toMatchObject({ message_id: 'x2', user_id: ME, emoji: '❤' });
  });

  it('forwarded label', () => {
    renderBubble(base({ content_data: { forwarded: true } }));
    expect(screen.getByTestId('message-forwarded-label')).toBeTruthy();
  });

  it('calendar invite card', () => {
    renderBubble(base({ message_type: 'calendar_invite', content_data: { title: 'Salsa Abend', date: '2026-11-20' } }));
    expect(screen.getByTestId('bubble-calendar-invite')).toBeTruthy();
    expect(screen.getByText('Salsa Abend')).toBeTruthy();
  });

  it('a group system notice renders from i18n with names', () => {
    renderBubble(base({ message_type: 'system', body: 'old body with a@b.c', content_data: { system_type: 'member_added', actor_name: 'Petra', added_user_name: 'Leo' } }));
    expect(screen.getByTestId('bubble-system-b1')).toBeTruthy();
    expect(screen.queryByText('old body with a@b.c')).toBeNull();
  });
});

describe('MessageList dividers, grouping and swipe-to-reply', () => {
  const rows: ChatViewMessage[] = [
    base({ id: 'l1', created_at: '2026-10-01T09:00:00.000Z', read_at: '2026-10-01T09:05:00.000Z' }),
    base({ id: 'l2', body: 'Zweite', created_at: '2026-11-02T09:00:00.000Z', read_at: null }),
    base({ id: 'l3', body: 'Dritte', created_at: '2026-11-02T09:01:00.000Z', read_at: null }),
  ];

  it('a day divider per day and the unread divider before the first unread message', () => {
    const d = createChatDouble();
    render(<MessageList messages={rows} userId={ME} unreadAnchorId="l2" />, { wrapper: makeChatWrapper({ client: d.client }) });
    expect(screen.getAllByTestId('divider-date')).toHaveLength(2);
    expect(screen.getByTestId('unread-divider')).toBeTruthy();
    expect(screen.getByText('Unread messages')).toBeTruthy();
  });

  it('swiping a bubble towards the end past 60 px replies to it', () => {
    const d = createChatDouble();
    const onReply = jest.fn();
    render(<MessageList messages={rows} userId={ME} onReply={onReply} />, { wrapper: makeChatWrapper({ client: d.client }) });
    fireGestureHandler(getByGestureTestId('swipe-l3'), [{ state: State.BEGAN, translationX: 0 }, { state: State.ACTIVE, translationX: 40 }, { state: State.ACTIVE, translationX: 70 }, { state: State.END, translationX: 70 }]);
    expect(onReply).toHaveBeenCalledWith(expect.objectContaining({ id: 'l3' }));
  });

  it('a short swipe does not reply', () => {
    const d = createChatDouble();
    const onReply = jest.fn();
    render(<MessageList messages={rows} userId={ME} onReply={onReply} />, { wrapper: makeChatWrapper({ client: d.client }) });
    fireGestureHandler(getByGestureTestId('swipe-l2'), [{ state: State.BEGAN, translationX: 0 }, { state: State.ACTIVE, translationX: 30 }, { state: State.END, translationX: 30 }]);
    expect(onReply).not.toHaveBeenCalled();
  });
});
