/**
 * VTID-05458 — the 1:1 DM screen (/inbox/u/:recipientId) and the thread form
 * (/inbox/t/:threadId) with their /msg/ deep links: loaded / empty / error,
 * the built gateway requests (read, send, mark read, window around a
 * message), Enter = new line, typing from a mocked realtime event, a failed
 * send with Retry, deep-link scroll + highlight, the thread-id resolver.
 * Fake gateway + Supabase double only; nothing is sent anywhere.
 */
import '../../helpers/no-network';
import { router } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { ConversationScreen } from '../../../src/screens/chat/ConversationScreen';
import { chatGateway, createChatDouble, dm, makeChatWrapper, ME, PEER, PROFILES } from './helpers';

afterAll(() => __setSupabaseForTests(null));

const thread = [dm('m1', PEER, 'Hallo Mia', 1), dm('m2', ME, 'Hi Petra', 2), dm('m3', PEER, 'Wie geht es dir?', 3)];

function setup(routes: Record<string, unknown> = {}, tables: Record<string, Record<string, unknown>[]> = {}) {
  const d = createChatDouble({ tables: { global_community_profiles: PROFILES, ...tables } });
  const gw = chatGateway({ [`GET /chat/conversation/${PEER}`]: { data: thread }, 'POST /chat/read': { ok: true }, ...routes });
  return { d, gw, wrapper: makeChatWrapper({ client: d.client, gateway: gw }) };
}

describe('ConversationScreen (DM)', () => {
  it('loads the conversation from GET /chat/conversation/:peer?limit=50 and shows the peer in the header', async () => {
    const { gw, wrapper } = setup();
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Wie geht es dir?')).toBeTruthy());
    expect(screen.getByText('Hallo Mia')).toBeTruthy();
    expect(screen.getByTestId('conversation-title').props.children).toBe('Petra Peer');
    const read = gw.requests.find((r) => r.method === 'GET' && r.path === `/chat/conversation/${PEER}`);
    expect(read?.query).toBe('limit=50');
  });

  it('shows the empty state when the conversation has no messages', async () => {
    const { wrapper } = setup({ [`GET /chat/conversation/${PEER}`]: { data: [] } });
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('conversation-empty')).toBeTruthy());
    expect(screen.getByText('No messages yet')).toBeTruthy();
  });

  it('shows the load error with Try again when the gateway and both fallbacks fail', async () => {
    const d = createChatDouble({ tables: { global_community_profiles: PROFILES }, failTables: ['chat_messages', 'global_messages'] });
    const gw = chatGateway({ [`GET /chat/conversation/${PEER}`]: () => ({ status: 500, body: { error: 'boom' } }) });
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper: makeChatWrapper({ client: d.client, gateway: gw }) });
    await waitFor(() => expect(screen.getByTestId('conversation-load-error')).toBeTruthy());
    expect(screen.getByTestId('conversation-retry')).toBeTruthy();
  });

  it('marks the conversation read with POST /chat/read { peer_id }', async () => {
    const { gw, wrapper } = setup();
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper });
    await waitFor(() => expect(gw.requests.some((r) => r.path === '/chat/read')).toBe(true), { timeout: 2000 });
    expect(gw.requests.find((r) => r.path === '/chat/read')?.body).toEqual({ peer_id: PEER });
  });

  it('Enter makes a new line; only the send button sends, and the built request is POST /chat/send', async () => {
    const sent: unknown[] = [];
    const { gw, wrapper } = setup({
      'POST /chat/send': ({ body }: { body: Record<string, unknown> }) => {
        sent.push(body);
        return { body: { data: { ...dm('m9', ME, String(body.content), 9), client_message_id: body.client_message_id } } };
      },
    });
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    const field = screen.getByTestId('message-input-field');
    expect(field.props.multiline).toBe(true);
    fireEvent.changeText(field, 'Zeile eins\nZeile zwei');
    fireEvent(field, 'submitEditing');
    expect(gw.requests.some((r) => r.path === '/chat/send')).toBe(false);
    await act(async () => {
      fireEvent.press(screen.getByTestId('message-send'));
    });
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ receiver_id: PEER, content: 'Zeile eins\nZeile zwei', client_message_id: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    await waitFor(() => expect(screen.getByText('Zeile eins\nZeile zwei')).toBeTruthy());
  });

  it('a failed send stays as "Not sent" with Retry, which re-posts the same client_message_id', async () => {
    const ids: string[] = [];
    let fail = true;
    const { wrapper } = setup({
      'POST /chat/send': ({ body }: { body: Record<string, unknown> }) => {
        ids.push(String(body.client_message_id));
        if (fail) return { status: 500, body: { error: 'down' } };
        return { body: { data: { ...dm('m10', ME, String(body.content), 10), client_message_id: body.client_message_id } } };
      },
    });
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('message-input-field'), 'Bist du da?');
    await act(async () => {
      fireEvent.press(screen.getByTestId('message-send'));
    });
    await waitFor(() => expect(screen.getByTestId('message-failed-row')).toBeTruthy());
    expect(screen.getByTestId('message-status-failed')).toBeTruthy();
    fail = false;
    await act(async () => {
      fireEvent.press(screen.getByTestId('message-retry'));
    });
    await waitFor(() => expect(screen.queryByTestId('message-failed-row')).toBeNull());
    expect(ids).toHaveLength(2);
    expect(ids[1]).toBe(ids[0]);
  });

  it('shows "<name> is typing…" from a mocked typing_start event and hides it on typing_stop', async () => {
    const { d, wrapper } = setup();
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    act(() => d.emit(`typing:${PEER}`, 'broadcast', 'typing_start', { user_id: PEER, name: 'Petra Peer' }));
    expect(screen.getByTestId('typing-indicator')).toBeTruthy();
    expect(screen.getByText('Petra Peer is typing…')).toBeTruthy();
    act(() => d.emit(`typing:${PEER}`, 'broadcast', 'typing_stop', { user_id: PEER }));
    expect(screen.queryByTestId('typing-indicator')).toBeNull();
    // My own typing_start is ignored.
    act(() => d.emit(`typing:${PEER}`, 'broadcast', 'typing_start', { user_id: ME, name: 'Mia Me' }));
    expect(screen.queryByTestId('typing-indicator')).toBeNull();
  });

  it('typing in the composer broadcasts typing_start on typing:<thread> (to the fake channel only)', async () => {
    const { d, wrapper } = setup();
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('message-input-field'), 'H');
    });
    await waitFor(() => expect(d.broadcasts.some((b) => b.channel === `typing:${PEER}` && b.event === 'typing_start')).toBe(true));
    expect(d.broadcasts.find((b) => b.event === 'typing_start')?.payload).toMatchObject({ user_id: ME, thread_id: PEER, name: 'Mia Me' });
  });

  it('a new DM from this peer (realtime INSERT on chat_messages) refetches the conversation', async () => {
    let page = thread;
    const { d, gw, wrapper } = setup({ [`GET /chat/conversation/${PEER}`]: () => ({ body: { data: page } }) });
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    const realtime = [...d.channels.keys()].find((k) => k.startsWith('chat_realtime_')) as string;
    page = [...thread, dm('m4', PEER, 'Neu!', 4)];
    act(() => d.emit(realtime, 'postgres_changes', 'INSERT', { sender_id: PEER, receiver_id: ME }));
    await waitFor(() => expect(screen.getByText('Neu!')).toBeTruthy());
    expect(gw.requests.filter((r) => r.path === `/chat/conversation/${PEER}`).length).toBeGreaterThan(1);
  });

  it('swipe-to-reply / Reply shows the reply preview and sends reply_to_message_id', async () => {
    const sent: Record<string, unknown>[] = [];
    const { wrapper } = setup({
      'POST /chat/send': ({ body }: { body: Record<string, unknown> }) => {
        sent.push(body);
        return { body: { data: dm('m11', ME, String(body.content), 11, { reply_to_message_id: body.reply_to_message_id }) } };
      },
    });
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    fireEvent(screen.getByTestId('bubble-body-m1'), 'longPress');
    fireEvent.press(screen.getByTestId('message-action-reply', { includeHiddenElements: true }));
    expect(screen.getByTestId('reply-preview')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('message-input-field'), 'Gut!');
    await act(async () => {
      fireEvent.press(screen.getByTestId('message-send'));
    });
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].reply_to_message_id).toBe('m1');
    expect(screen.queryByTestId('reply-preview')).toBeNull();
  });

  it('back returns to the inbox', async () => {
    const { wrapper } = setup();
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper });
    fireEvent.press(screen.getByTestId('conversation-back'));
    expect(router.replace).toHaveBeenCalledWith('/inbox');
  });
});

describe('deep links /msg/:messageId', () => {
  it('scrolls the target message to the middle and highlights it', async () => {
    const spy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
    const { wrapper } = setup();
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} scrollToMessageId="m1" />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('message-highlight')).toBeTruthy());
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ viewPosition: 0.5, animated: false }));
    expect(screen.getByTestId('msg-m1')).toBeTruthy();
    spy.mockRestore();
  });

  it('loads the window around a target outside the latest page (GET ?around=)', async () => {
    const spy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
    const old = dm('m0', PEER, 'Alte Nachricht', 0);
    const { gw, wrapper } = setup({
      [`GET /chat/conversation/${PEER}`]: ({ query }: { query: string }) =>
        query.includes('around=m0') ? { body: { data: [old], has_older: false, has_newer: true } } : { body: { data: thread } },
    });
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} scrollToMessageId="m0" />, { wrapper });
    await waitFor(() => expect(screen.getByText('Alte Nachricht')).toBeTruthy());
    expect(gw.requests.some((r) => r.query === 'limit=40&around=m0')).toBe(true);
    await waitFor(() => expect(screen.getByTestId('message-highlight')).toBeTruthy());
    spy.mockRestore();
  });
});

describe('/inbox/t/:threadId', () => {
  it('a legacy group thread id resolves to that group: name, "n members", messages from global_messages', async () => {
    const d = createChatDouble({
      tables: {
        global_community_profiles: PROFILES,
        global_message_threads: [{ id: 'th-1', name: 'Tanzgruppe', type: 'group', created_by: PEER }],
        global_thread_participants: [
          { thread_id: 'th-1', user_id: ME, role: 'member' },
          { thread_id: 'th-1', user_id: PEER, role: 'admin' },
        ],
        global_messages: [{ id: 'g1', thread_id: 'th-1', sender_id: PEER, body: 'Willkommen!', message_type: 'text', created_at: '2026-11-02T09:00:00.000Z' }],
      },
    });
    render(<ConversationScreen target={{ kind: 'thread', id: 'th-1' }} />, { wrapper: makeChatWrapper({ client: d.client, gateway: chatGateway({}) }) });
    await waitFor(() => expect(screen.getByText('Willkommen!')).toBeTruthy());
    expect(screen.getByTestId('conversation-title').props.children).toBe('Tanzgruppe');
    expect(screen.getByTestId('conversation-subtitle').props.children).toBe('2 members');
    expect(screen.getByTestId('edit-group-button')).toBeTruthy();
    expect(d.calls.some((c) => c.fn === 'from.global_messages.select')).toBe(true);
  });

  it('an id without a legacy thread row is a direct chat with that member', async () => {
    const { gw, wrapper } = setup();
    render(<ConversationScreen target={{ kind: 'thread', id: PEER }} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    expect(screen.getByTestId('conversation-title').props.children).toBe('Petra Peer');
    expect(gw.requests.some((r) => r.path === `/chat/conversation/${PEER}`)).toBe(true);
  });
});
