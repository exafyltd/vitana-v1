/**
 * VTID-05458 — the group chat (/inbox/g/:groupId): loading / loaded / empty /
 * error, the header (name, "n members · official group"), the built gateway
 * requests (GET group + messages, POST read, POST send), @mentions in the
 * composer, the realtime reload, and the /msg/ deep link loading the window
 * around an older message. Fake gateway + Supabase double only.
 */
import '../../helpers/no-network';
import './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { GroupChatScreen } from '../../../src/screens/chat/GroupChatScreen';
import { chatGateway, createChatDouble, makeChatWrapper, ME, PEER } from './helpers';

afterAll(() => __setSupabaseForTests(null));

const group = {
  id: 'g1',
  name: 'Alle Beisammen',
  is_system: true,
  metadata: {},
  member_count: 3,
  members: [
    { user_id: ME, role: 'member', display_name: 'Mia Me', avatar_url: null },
    { user_id: PEER, role: 'member', display_name: 'Petra Peer', avatar_url: null },
    { user_id: 'u-bot', role: 'member', display_name: 'Vitana', avatar_url: null, is_bot: true },
  ],
};
const gm = (id: string, sender: string, content: string, minute: number) => ({ id, sender_id: sender, group_id: 'g1', content, created_at: new Date(Date.UTC(2026, 10, 2, 9, minute)).toISOString() });
const latest = [gm('gm3', PEER, 'Dritte', 3), gm('gm2', ME, 'Zweite', 2), gm('gm1', PEER, 'Erste', 1)]; // newest first, like the gateway

function setup(routes: Record<string, unknown> = {}) {
  const d = createChatDouble();
  const gw = chatGateway({ 'GET /chat/groups/g1': { data: group }, 'GET /chat/groups/g1/messages': { data: latest }, 'POST /chat/groups/g1/read': { ok: true }, ...routes });
  return { d, gw, wrapper: makeChatWrapper({ client: d.client, gateway: gw }) };
}

describe('GroupChatScreen', () => {
  it('shows "Loading group…" with the back button, then the group', async () => {
    const { gw, wrapper } = setup();
    render(<GroupChatScreen groupId="g1" />, { wrapper });
    expect(screen.getByTestId('group-loading')).toBeTruthy();
    expect(screen.getByTestId('group-chat-back')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('group-name').props.children).toBe('Alle Beisammen'));
    expect(screen.getByTestId('group-subtitle').props.children).toBe('3 members · official group');
    expect(screen.getByText('Erste')).toBeTruthy();
    expect(gw.requests.find((r) => r.path === '/chat/groups/g1/messages')?.query).toBe('limit=100');
    await waitFor(() => expect(gw.requests.some((r) => r.method === 'POST' && r.path === '/chat/groups/g1/read')).toBe(true));
  });

  it('shows "No messages yet." for an empty group', async () => {
    const { wrapper } = setup({ 'GET /chat/groups/g1/messages': { data: [] } });
    render(<GroupChatScreen groupId="g1" />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('group-empty')).toBeTruthy());
  });

  it('shows "Couldn\'t open group" + Back to Inbox when the group fails', async () => {
    const denied = () => ({ status: 403, body: { error: 'not_a_member' } });
    const { wrapper } = setup({ 'GET /chat/groups/g1': denied, 'GET /chat/groups/g1/messages': denied });
    render(<GroupChatScreen groupId="g1" />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('group-error')).toBeTruthy());
    expect(screen.getByText('not_a_member')).toBeTruthy();
    expect(screen.getByTestId('group-back-to-inbox')).toBeTruthy();
  });

  it('sends with POST /chat/groups/:id/send { content, client_message_id }', async () => {
    const sent: Record<string, unknown>[] = [];
    const { wrapper } = setup({
      'POST /chat/groups/g1/send': ({ body }: { body: Record<string, unknown> }) => {
        sent.push(body);
        return { body: { data: { ...gm('gm9', ME, String(body.content), 9), client_message_id: body.client_message_id } } };
      },
    });
    render(<GroupChatScreen groupId="g1" />, { wrapper });
    await waitFor(() => expect(screen.getByText('Erste')).toBeTruthy());
    expect(screen.getByTestId('message-input-field').props.placeholder).toBe('Message…');
    fireEvent.changeText(screen.getByTestId('message-input-field'), 'Hallo alle');
    await act(async () => {
      fireEvent.press(screen.getByTestId('message-send'));
    });
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ content: 'Hallo alle', client_message_id: expect.any(String) });
    await waitFor(() => expect(screen.getByText('Hallo alle')).toBeTruthy());
  });

  it('@mentions: suggestions from the roster (never me or the bot), the pick goes along as content_data.mentions', async () => {
    const sent: Record<string, unknown>[] = [];
    const { wrapper } = setup({
      'POST /chat/groups/g1/send': ({ body }: { body: Record<string, unknown> }) => {
        sent.push(body);
        return { body: { data: gm('gm8', ME, String(body.content), 8) } };
      },
    });
    render(<GroupChatScreen groupId="g1" />, { wrapper });
    await waitFor(() => expect(screen.getByText('Erste')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('message-input-field'), 'Hi @');
    expect(screen.queryByTestId('mention-suggestions')).toBeNull();
    fireEvent.changeText(screen.getByTestId('message-input-field'), 'Hi @P');
    expect(screen.getByTestId(`mention-option-${PEER}`)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('message-input-field'), 'Hi @V');
    expect(screen.queryByTestId('mention-option-u-bot')).toBeNull();
    fireEvent.changeText(screen.getByTestId('message-input-field'), 'Hi @Pe');
    fireEvent.press(screen.getByTestId(`mention-option-${PEER}`));
    expect(screen.getByTestId('message-input-field').props.value).toBe('Hi @Petra Peer ');
    await act(async () => {
      fireEvent.press(screen.getByTestId('message-send'));
    });
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ content: 'Hi @Petra Peer', content_data: { mentions: [{ user_id: PEER, display_name: 'Petra Peer' }] } });
  });

  it('a realtime INSERT for this group reloads the messages', async () => {
    let page = latest;
    const { d, wrapper } = setup({ 'GET /chat/groups/g1/messages': () => ({ body: { data: page } }) });
    render(<GroupChatScreen groupId="g1" />, { wrapper });
    await waitFor(() => expect(screen.getByText('Erste')).toBeTruthy());
    page = [gm('gm4', PEER, 'Vierte', 4), ...latest];
    await act(async () => {
      d.emit('group_chat_g1', 'postgres_changes', 'INSERT', { group_id: 'g1' });
    });
    await waitFor(() => expect(screen.getByText('Vierte')).toBeTruthy());
  });

  it('/msg/:messageId loads the window around an older message (GET ?around=) and highlights it', async () => {
    const spy = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
    const { gw, wrapper } = setup({
      'GET /chat/groups/g1/messages': ({ query }: { query: string }) =>
        query.includes('around=gm0') ? { body: { data: [gm('gm0', PEER, 'Ganz alt', 0)], has_newer: true } } : { body: { data: latest } },
    });
    render(<GroupChatScreen groupId="g1" scrollToMessageId="gm0" />, { wrapper });
    await waitFor(() => expect(screen.getByText('Ganz alt')).toBeTruthy());
    expect(gw.requests.some((r) => r.query === 'limit=40&around=gm0')).toBe(true);
    await waitFor(() => expect(screen.getByTestId('message-highlight')).toBeTruthy());
    spy.mockRestore();
  });
});
