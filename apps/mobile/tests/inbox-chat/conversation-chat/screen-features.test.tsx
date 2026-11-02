/**
 * VTID-05458 fix 1 — the conversation-level surfaces the mobile web shows:
 * DM search (scope dm:<peer>, ConversationView.tsx:1245) and group search
 * (group:<id>, GroupChat.tsx:541) with the jump to the hit; Talk to Vitana
 * only in the Vitana DM (L1273, opens the ORB); Create group with the peer
 * (L1283, CreateGroupPopup inserts); "I am viewing" presence (POST
 * /chat/viewing); delivery receipts (POST /chat/delivered); the "↓ N new
 * messages" pill; the tenant context (?context=tenant → `messages`); the
 * legacy calendar answer (calendar_invite_responses + the confirmation);
 * quick replies sent as messages; the call tones. Fakes only.
 */
import '../../helpers/no-network';
import { activateOrb, router } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { registerChatDevice } from '../../../src/ports/chat-device';
import { __clearToastsForTests, __toastsForTests } from '../../../src/ports/ui';
import { ConversationScreen } from '../../../src/screens/chat/ConversationScreen';
import { GroupChatScreen } from '../../../src/screens/chat/GroupChatScreen';
import { MessageList } from '../../../src/screens/chat/MessageList';
import { buildSearchQuery } from '../../../src/screens/chat/data/search';
import { CallManager, CallProvider } from '../../../src/screens/chat/calls/CallProvider';
import { callSounds, CALL_SOUND_URLS } from '../../../src/screens/chat/calls/callSounds';
import { VITANA_BOT_USER_ID, type ChatViewMessage } from '../../../src/screens/chat/data/types';
import { chatGateway, createChatDouble, dm, fakeDevice, makeChatWrapper, ME, PEER, PROFILES } from './helpers';

afterEach(() => {
  registerChatDevice(null);
  callSounds.__reset();
  __clearToastsForTests();
  activateOrb.mockClear();
  router.navigate.mockClear();
});
afterAll(() => __setSupabaseForTests(null));

const thread = [dm('m1', PEER, 'Hallo Mia', 1), dm('m2', ME, 'Hi Petra', 2), dm('m3', PEER, 'Wie geht es dir?', 3, { read_at: null, delivered_at: null })];

function setupDm(routes: Record<string, unknown> = {}, tables: Record<string, Record<string, unknown>[]> = {}, peer = PEER, rows = thread) {
  const d = createChatDouble({ tables: { global_community_profiles: [...PROFILES, { user_id: VITANA_BOT_USER_ID, display_name: 'Vitana' }], ...tables } });
  const gw = chatGateway({ [`GET /chat/conversation/${peer}`]: { data: rows }, 'POST /chat/read': { ok: true }, 'POST /chat/viewing': { ok: true }, 'POST /chat/delivered': { updated: 1 }, ...routes });
  render(<ConversationScreen target={{ kind: 'recipient', id: peer }} />, { wrapper: makeChatWrapper({ client: d.client, gateway: gw }) });
  return { d, gw };
}

describe('search in the conversation', () => {
  it('buildSearchQuery: q, limit, scope, type, local day bounds', () => {
    const qs = new URLSearchParams(buildSearchQuery(' Pizza ', { scope: 'dm:u-peer', type: 'image', from: '2026-11-01' }));
    expect(qs.get('q')).toBe('Pizza');
    expect(qs.get('limit')).toBe('20');
    expect(qs.get('scope')).toBe('dm:u-peer');
    expect(qs.get('type')).toBe('image');
    expect(qs.get('from')).toBe(new Date('2026-11-01T00:00:00.000').toISOString());
  });

  it('DM: the search button opens the panel; 3+ characters call GET /chat/search with scope dm:<peer>; a hit is highlighted', async () => {
    const { gw } = setupDm({ 'GET /chat/search': { ok: true, results: [{ message_id: 'm1', conversation_key: `dm:${PEER}`, sender_id: PEER, created_at: thread[0].created_at, snippet: 'Hallo Mia', message_type: 'text' }], next_cursor: null } });
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    fireEvent.press(screen.getByTestId('conversation-search-button'));
    fireEvent.changeText(await screen.findByTestId('message-search-input'), 'Ha');
    expect(await screen.findByTestId('message-search-too-short')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('message-search-input'), 'Hallo');
    const hit = await screen.findByTestId('message-search-result', {}, { timeout: 3000 });
    const req = gw.requests.find((r) => r.path === '/chat/search');
    expect(new URLSearchParams(req?.query).get('scope')).toBe(`dm:${PEER}`);
    jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
    fireEvent.press(hit);
    await waitFor(() => expect(screen.getByTestId('message-highlight')).toBeTruthy());
  });

  it('DM: no hits says "No messages found"', async () => {
    setupDm({ 'GET /chat/search': { ok: true, results: [], next_cursor: null } });
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    fireEvent.press(screen.getByTestId('conversation-search-button'));
    fireEvent.changeText(await screen.findByTestId('message-search-input'), 'Nichts');
    expect(await screen.findByTestId('message-search-empty', {}, { timeout: 3000 })).toBeTruthy();
  });

  it('group: the search button searches with scope group:<id>', async () => {
    const d = createChatDouble();
    const group = { id: 'g1', name: 'Läufer', metadata: {}, member_count: 2, members: [{ user_id: ME, role: 'member', display_name: 'Mia', avatar_url: null }] };
    const gw = chatGateway({ 'GET /chat/groups/g1': { data: group }, 'GET /chat/groups/g1/messages': { data: [] }, 'POST /chat/groups/g1/read': { ok: true }, 'POST /chat/viewing': { ok: true }, 'GET /chat/search': { ok: true, results: [], next_cursor: null } });
    render(<GroupChatScreen groupId="g1" />, { wrapper: makeChatWrapper({ client: d.client, gateway: gw }) });
    fireEvent.press(await screen.findByTestId('group-search-button'));
    fireEvent.changeText(await screen.findByTestId('message-search-input'), 'Lauf');
    await waitFor(() => expect(gw.requests.some((r) => r.path === '/chat/search')).toBe(true), { timeout: 3000 });
    expect(new URLSearchParams(gw.requests.find((r) => r.path === '/chat/search')?.query).get('scope')).toBe('group:g1');
    // VTID-05322: viewing presence for the group.
    expect(gw.requests.find((r) => r.path === '/chat/viewing')?.body).toMatchObject({ conversation_key: 'group:g1', active: true });
  });
});

describe('DM header actions', () => {
  it('Talk to Vitana shows only in the Vitana DM and opens the ORB', async () => {
    setupDm({}, {}, VITANA_BOT_USER_ID, [dm('v1', VITANA_BOT_USER_ID, 'Hallo, ich bin Vitana', 1, { receiver_id: ME })]);
    fireEvent.press(await screen.findByTestId('talk-to-vitana-button'));
    expect(activateOrb).toHaveBeenCalledTimes(1);
  });

  it('a member DM has no Talk to Vitana', async () => {
    setupDm();
    await waitFor(() => expect(screen.getByText('Hallo Mia')).toBeTruthy());
    expect(screen.queryByTestId('talk-to-vitana-button')).toBeNull();
  });

  it('Create group starts with the peer, inserts the thread, the members and the notice, then opens it', async () => {
    const { d } = setupDm();
    fireEvent.press(await screen.findByTestId('create-group-button'));
    expect(await screen.findByTestId(`create-group-member-${PEER}`)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('create-group-name'), 'Lauftreff');
    fireEvent.press(screen.getByTestId('create-group-submit'));
    await waitFor(() => expect(router.navigate).toHaveBeenCalled());
    const inserts = d.writes.filter((w) => w.op === 'insert');
    expect(inserts.map((w) => w.table)).toEqual(['global_message_threads', 'global_thread_participants', 'global_thread_participants', 'global_messages']);
    expect(inserts[0].values).toMatchObject({ created_by: ME, type: 'group', name: 'Lauftreff' });
    expect(inserts[1].values).toMatchObject({ user_id: ME, role: 'admin' });
    expect(inserts[2].values).toEqual([expect.objectContaining({ user_id: PEER, role: 'member' })]);
    expect(inserts[3].values).toMatchObject({ message_type: 'system', content_data: expect.objectContaining({ system_type: 'group_created', group_name: 'Lauftreff' }) });
    expect(__toastsForTests().some((x) => x.titleKey === 'inbox.createGroup.created')).toBe(true);
  });

  it('Create group stays disabled without a name', async () => {
    setupDm();
    fireEvent.press(await screen.findByTestId('create-group-button'));
    expect((await screen.findByTestId('create-group-submit')).props.accessibilityState?.disabled).toBe(true);
  });
});

describe('presence + receipts', () => {
  it('posts "viewing dm:<peer>" and reports the peer\'s undelivered DMs to /chat/delivered', async () => {
    const { gw } = setupDm();
    await waitFor(() => expect(gw.requests.some((r) => r.path === '/chat/viewing')).toBe(true));
    const viewing = gw.requests.find((r) => r.path === '/chat/viewing');
    expect(viewing?.body).toMatchObject({ conversation_key: `dm:${PEER}`, active: true });
    expect(String(viewing?.body.device_id)).toMatch(/^app-/);
    await waitFor(() => expect(gw.requests.some((r) => r.path === '/chat/delivered')).toBe(true), { timeout: 3000 });
    expect(gw.requests.find((r) => r.path === '/chat/delivered')?.body).toEqual({ message_ids: ['m3'] });
  });
});

describe('"↓ N new messages"', () => {
  const msg = (id: string, sender: string, minute: number): ChatViewMessage => ({ id, thread_id: PEER, sender_id: sender, body: id, message_type: 'text', created_at: new Date(Date.UTC(2026, 10, 2, 9, minute)).toISOString() });

  it('counts messages from others that arrive while reading further up; a tap returns to the newest', async () => {
    const d = createChatDouble();
    const wrapper = makeChatWrapper({ client: d.client });
    const first = [msg('a', PEER, 1), msg('b', ME, 2)];
    const view = render(<MessageList messages={first} userId={ME} />, { wrapper });
    fireEvent.scroll(screen.getByTestId('message-list'), { nativeEvent: { contentOffset: { y: 400, x: 0 }, contentSize: { height: 2000, width: 300 }, layoutMeasurement: { height: 600, width: 300 } } });
    view.rerender(<MessageList messages={[...first, msg('c', PEER, 3), msg('d', PEER, 4), msg('e', ME, 5)]} userId={ME} />);
    expect(await screen.findByTestId('new-messages-pill')).toBeTruthy();
    expect(screen.getByText('2 new messages')).toBeTruthy();
    const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => undefined);
    fireEvent.press(screen.getByTestId('new-messages-pill'));
    expect(spy).toHaveBeenCalledWith({ offset: 0, animated: true });
    expect(screen.queryByTestId('new-messages-pill')).toBeNull();
  });
});

describe('tenant context (?context=tenant)', () => {
  it('reads the thread from message_threads + messages of the tenant and sends into messages', async () => {
    const d = createChatDouble({
      tables: {
        message_threads: [{ id: 'tt1', tenant_id: 't-1', type: 'direct', name: null }],
        thread_participants: [
          { thread_id: 'tt1', user_id: ME, role: 'member', is_active: true, profile: { user_id: ME, display_name: 'Mia Me' } },
          { thread_id: 'tt1', user_id: PEER, role: 'member', is_active: true, profile: { user_id: PEER, display_name: 'Petra Netz' } },
        ],
        messages: [{ id: 'tm1', tenant_id: 't-1', thread_id: 'tt1', sender_id: PEER, body: 'Im Netzwerk', message_type: 'text', created_at: '2026-11-02T09:00:00.000Z' }],
        profiles: [{ user_id: PEER, tenant_id: 't-1', display_name: 'Petra Netz' }],
      },
    });
    const gw = chatGateway({ 'POST /chat/viewing': { ok: true } });
    render(<ConversationScreen target={{ kind: 'thread', id: 'tt1' }} context="tenant" />, { wrapper: makeChatWrapper({ client: d.client, gateway: gw }) });
    expect(await screen.findByText('Im Netzwerk')).toBeTruthy();
    expect(screen.getByTestId('conversation-title').props.children).toBe('Petra Netz');
    fireEvent.changeText(screen.getByTestId('message-input-field'), 'Antwort');
    fireEvent.press(screen.getByTestId('message-send'));
    await waitFor(() => expect(d.writes.some((w) => w.table === 'messages' && w.op === 'insert')).toBe(true));
    expect(d.writes.find((w) => w.table === 'messages')?.values).toMatchObject({ tenant_id: 't-1', thread_id: 'tt1', sender_id: ME, body: 'Antwort', message_type: 'text' });
    expect(gw.requests.some((r) => r.path.startsWith('/chat/conversation'))).toBe(false);
    await waitFor(() => expect(d.writes.some((w) => w.table === 'thread_participants' && w.op === 'update')).toBe(true));
  });
});

describe('card actions on the DM screen', () => {
  const inviteId = '22222222-2222-4222-8222-222222222222';
  const data = { title: 'Laufen', date: '2026-11-20', time: '18:30' };

  it('a DM calendar invite renders as the legacy card without buttons (the DM gateway keeps no action buttons, as on the web)', async () => {
    const d = createChatDouble({ tables: { global_community_profiles: PROFILES } });
    const gw = chatGateway({ [`GET /chat/conversation/${PEER}`]: { data: [dm(inviteId, PEER, 'Calendar invite: Laufen', 1, { message_type: 'calendar_invite', metadata: data })] }, 'POST /chat/read': { ok: true }, 'POST /chat/viewing': { ok: true }, 'POST /chat/delivered': { updated: 0 } });
    render(<ConversationScreen target={{ kind: 'recipient', id: PEER }} />, { wrapper: makeChatWrapper({ client: d.client, gateway: gw }) });
    expect(await screen.findByTestId('bubble-calendar-invite')).toBeTruthy();
    expect(screen.queryByTestId('invite-action-calendar_accept')).toBeNull();
  });

  it('tenant thread: Accept on an invite with buttons records the answer, creates the entry and sends "Event accepted ✅" as a system message', async () => {
    const d = createChatDouble({
      tables: {
        message_threads: [{ id: 'tt2', tenant_id: 't-1', type: 'direct' }],
        thread_participants: [{ thread_id: 'tt2', user_id: PEER, role: 'member', is_active: true, profile: { user_id: PEER, display_name: 'Petra' } }],
        messages: [{ id: inviteId, tenant_id: 't-1', thread_id: 'tt2', sender_id: PEER, body: 'Calendar invite: Laufen', message_type: 'calendar_invite', content_data: data, action_buttons: [{ label: 'Accept', action: 'calendar_accept', data }], created_at: '2026-11-02T09:00:00.000Z' }],
      },
    });
    render(<ConversationScreen target={{ kind: 'thread', id: 'tt2' }} context="tenant" />, { wrapper: makeChatWrapper({ client: d.client, gateway: chatGateway({}) }) });
    fireEvent.press(await screen.findByTestId('invite-action-calendar_accept'));
    await waitFor(() => expect(d.writes.some((w) => w.table === 'messages' && w.op === 'insert')).toBe(true));
    expect(d.writes.find((w) => w.table === 'calendar_invite_responses')?.values).toMatchObject({ message_id: inviteId, user_id: ME, response: 'accepted' });
    expect(d.writes.find((w) => w.table === 'calendar_events')?.values).toMatchObject({ title: 'Laufen', status: 'confirmed', source_message_id: inviteId });
    expect(d.writes.find((w) => w.table === 'messages')?.values).toMatchObject({ body: 'Event accepted ✅ - Added to your calendar', message_type: 'system' });
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey === 'toasts.messages.responseSent')).toBe(true));
  });

  it('respondToLegacyInvite(accepted): response upsert, calendar entry, event id back on the response; the confirmation texts', async () => {
    const { respondToLegacyInvite } = jest.requireActual('../../../src/screens/chat/data/calendar') as typeof import('../../../src/screens/chat/data/calendar');
    const d = createChatDouble();
    makeChatWrapper({ client: d.client });
    const res = await respondToLegacyInvite(inviteId, ME, 'accepted', data);
    expect(res.error).toBeUndefined();
    const writes = d.writes.map((w) => `${w.table}.${w.op}`);
    expect(writes).toEqual(['calendar_invite_responses.insert', 'calendar_events.insert', 'calendar_invite_responses.update']);
    expect(d.writes[0].values).toMatchObject({ message_id: inviteId, user_id: ME, response: 'accepted' });
    expect(d.writes[1].values).toMatchObject({ user_id: ME, title: 'Laufen', status: 'confirmed', source_message_id: inviteId, source_type: 'invite' });
    const { INVITE_RESPONSE_MESSAGES } = jest.requireActual('../../../src/screens/chat/ConversationScreen') as typeof import('../../../src/screens/chat/ConversationScreen');
    expect(INVITE_RESPONSE_MESSAGES.accepted(false)).toBe('Event accepted ✅ - Added to your calendar');
    expect(INVITE_RESPONSE_MESSAGES.declined(false)).toBe('Event declined ❌');
  });

  it('decline removes the member\'s calendar entry from that invite', async () => {
    const { respondToLegacyInvite } = jest.requireActual('../../../src/screens/chat/data/calendar') as typeof import('../../../src/screens/chat/data/calendar');
    const d = createChatDouble();
    makeChatWrapper({ client: d.client });
    await respondToLegacyInvite(inviteId, ME, 'declined', data);
    expect(d.writes.map((w) => `${w.table}.${w.op}`)).toEqual(['calendar_invite_responses.insert', 'calendar_events.delete']);
  });
});

describe('call tones', () => {
  it('an incoming call plays the looped incoming ringtone at 0.7; declining stops it', async () => {
    const dev = fakeDevice();
    registerChatDevice(dev.device as never);
    const d = createChatDouble({ tables: { profiles: PROFILES } });
    render(
      <CallProvider userId={ME}>
        <CallManager userId={ME} />
      </CallProvider>,
      { wrapper: makeChatWrapper({ client: d.client }) },
    );
    act(() => d.emit(`user:${ME}:calls`, 'broadcast', 'incoming-call', { callId: 'c1', callerId: PEER, recipientId: ME, isVideoCall: false, state: 'calling', callerName: 'Petra' }));
    await waitFor(() => expect(dev.log.players.find((p) => p.source === CALL_SOUND_URLS.incoming)?.played).toBe(1));
    expect(dev.log.players.find((p) => p.source === CALL_SOUND_URLS.incoming)?.opts).toEqual({ loop: true, volume: 0.7 });
    const before = dev.log.players.reduce((n, p) => n + p.stopped, 0);
    fireEvent.press(screen.getByTestId('incoming-call-reject'));
    await waitFor(() => expect(dev.log.players.reduce((n, p) => n + p.stopped, 0)).toBeGreaterThan(before));
  });
});
