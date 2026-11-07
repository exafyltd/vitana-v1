/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the native inbox
 * list (tasks.md inbox-list tasks 1 + 5): loaded / empty / error / skeleton,
 * unread badges (rows + the shell's inboxUnread source), search, filter
 * pills, the Community / Network mode pill, a row opening the conversation
 * route by path, and "Mark all as read". The data layer is the native twin of
 * the web class-B hooks, so the built gateway requests and PostgREST queries
 * are asserted against the web's.
 */
import '../../helpers/no-network';
import { router } from './mocks';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../../src/ports/ui';
import { useBadge } from '../../../src/ports/badges';
import { InboxScreen } from '../../../src/screens/inbox/InboxScreen';
import { __resetInboxUnreadForTests } from '../../../src/screens/inbox/data/unread';
import { VITANA_BOT_USER_ID } from '../../../src/screens/inbox/data/threads-model';
import { ANNA, BEN, FAIL, ME, TENANT, TOKEN, groups, inboxWrapper, loadedRoutes, loadedTables, profiles } from './helpers';

afterEach(() => {
  router.navigate.mockClear();
  __clearToastsForTests();
  __resetInboxUnreadForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

describe('inbox list: loaded', () => {
  it('renders the header, the action row and one card per conversation, group rows first in time order', async () => {
    const { wrapper } = inboxWrapper(loadedRoutes, { tables: loadedTables });
    render(<InboxScreen />, { wrapper });
    expect(screen.getByText('Inbox')).toBeTruthy();
    expect(screen.getByText('Your conversations, updates, and notifications')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    expect(screen.getByTestId(`inbox-card-${BEN}`)).toBeTruthy();
    expect(screen.getByTestId('inbox-card-chat_group:g-1')).toBeTruthy();
    expect(screen.getByText('Anna Berg')).toBeTruthy();
    expect(screen.getByText('See you at yoga')).toBeTruthy();
    expect(screen.getByText('FIRST 100')).toBeTruthy();
    expect(screen.getByText('5m')).toBeTruthy();
    expect(screen.getByText('3h')).toBeTruthy();
    // Vitana is seeded at the bottom while no Vitana conversation exists.
    expect(screen.getByTestId(`inbox-card-${VITANA_BOT_USER_ID}`)).toBeTruthy();
    expect(screen.getByText("Hi! I'm Vitana. Send me a message to get started.")).toBeTruthy();
    const order = screen.getAllByTestId(/^inbox-card-[^-]+(-[^-]+)*-open$/).map((n) => n.props.testID);
    expect(order).toEqual([`inbox-card-${ANNA}-open`, 'inbox-card-chat_group:g-1-open', `inbox-card-${BEN}-open`, `inbox-card-${VITANA_BOT_USER_ID}-open`]);
    expect(screen.getByTestId('inbox-new')).toBeTruthy();
    expect(screen.getByTestId('mode-pill')).toBeTruthy();
    // All / Direct / Groups / Contacts (Messages.tsx:1351-1353, VTID-04440).
    for (const f of ['all', 'direct', 'groups', 'contacts']) expect(screen.getByTestId(`inbox-filter-${f}`)).toBeTruthy();
    expect(screen.getByTestId('inbox-message-search-button')).toBeTruthy();
  });

  it('builds the web requests: gateway chat calls with the Bearer token, the same PostgREST reads', async () => {
    const { wrapper, requests, queries } = inboxWrapper(loadedRoutes, { tables: loadedTables });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    const calls = requests.map((r) => `${r.method} ${r.path}`);
    expect(calls).toEqual(expect.arrayContaining(['GET /chat/conversations', 'GET /chat/groups/']));
    for (const r of requests) {
      expect(r.headers.authorization).toBe(`Bearer ${TOKEN}`);
      expect(r.headers['content-type']).toBe('application/json');
    }
    const unread = queries.find((q) => q.table === 'chat_messages' && q.columns === 'sender_id');
    expect(unread?.filters).toEqual([
      ['eq', 'receiver_id', ME],
      ['is', 'read_at', null],
      ['neq', 'sender_id', ME],
    ]);
    const fallback = queries.find((q) => q.table === 'chat_messages' && q.columns === '*');
    expect(fallback?.filters).toEqual([
      ['or', `sender_id.eq.${ME},receiver_id.eq.${ME}`, null],
      ['not', 'receiver_id', 'is', null],
      ['is', 'group_id', null],
      ['order', 'created_at', { ascending: false }],
    ]);
    expect(fallback?.limit).toBe(2000);
    expect(queries.some((q) => q.table === 'global_thread_participants' && q.filters[0]?.[1] === 'user_id')).toBe(true);
    expect(queries.some((q) => q.table === 'global_community_profiles' && q.columns === 'user_id, display_name, avatar_url')).toBe(true);
    expect(queries.some((q) => q.table === 'profiles' && q.columns === 'user_id, display_name, full_name, avatar_url')).toBe(true);
    // The list itself only reads; the presence heartbeat (presence.test.tsx) is the web's one write.
    expect(queries.filter((q) => q.table !== 'thread_presence').every((q) => q.op === 'select')).toBe(true);
  });

  it('drops a peer that has no profile row (no phantom "Unknown User")', async () => {
    const tables = { ...loadedTables, global_community_profiles: profiles.filter((p) => p.user_id !== BEN) };
    const { wrapper } = inboxWrapper(loadedRoutes, { tables });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    expect(screen.queryByTestId(`inbox-card-${BEN}`)).toBeNull();
  });
});

describe('inbox list: skeleton, empty, error', () => {
  it('shows the six-row skeleton while the first fetch runs, without the action row', async () => {
    let release: (v: unknown) => void = () => undefined;
    const gate = new Promise((r) => (release = r));
    const { wrapper } = inboxWrapper({ ...loadedRoutes, 'GET /chat/groups/': { data: [] } }, { tables: loadedTables, gate });
    render(<InboxScreen />, { wrapper });
    expect(screen.getByTestId('inbox-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('inbox-new')).toBeNull();
    expect(screen.getByText('Inbox')).toBeTruthy();
    await act(async () => release(null));
    await waitFor(() => expect(screen.queryByTestId('inbox-skeleton')).toBeNull());
    expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy();
  });

  it('Network context with no threads shows the empty state with its two actions', async () => {
    const { wrapper, queries } = inboxWrapper(loadedRoutes, { tables: { thread_participants: [] } });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('mode-pill')).toBeTruthy());
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-tenant'));
    await waitFor(() => expect(screen.getByTestId('inbox-empty')).toBeTruthy());
    expect(screen.getByText('Your inbox is still empty.')).toBeTruthy();
    expect(screen.getByText('Connect with colleagues and team members in your professional network.')).toBeTruthy();
    expect(queries.find((q) => q.table === 'thread_participants')?.filters).toEqual([
      ['eq', 'user_id', ME],
      ['eq', 'is_active', true],
    ]);
    fireEvent.press(screen.getByTestId('inbox-empty-discover'));
    expect(router.navigate).toHaveBeenCalledWith('/community');
    fireEvent.press(screen.getByTestId('inbox-empty-start'));
    expect(screen.getByTestId('inbox-new-conversation')).toBeTruthy();
  });

  it('error: when the gateway and every table fail, the Community list keeps only the Vitana row (web fallback chain)', async () => {
    const routes = { 'GET /chat/conversations': FAIL, 'GET /chat/groups/': FAIL, 'GET /chat/unread-count': FAIL };
    const { wrapper } = inboxWrapper(routes, { failTables: ['chat_messages', 'global_thread_participants', 'global_community_profiles', 'profiles'] });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${VITANA_BOT_USER_ID}`)).toBeTruthy());
    expect(screen.queryByTestId(`inbox-card-${ANNA}`)).toBeNull();
  });

  it('error: a failing Network read falls back to the empty state', async () => {
    const { wrapper } = inboxWrapper(loadedRoutes, { failTables: ['thread_participants'] });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('mode-pill')).toBeTruthy());
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-tenant'));
    await waitFor(() => expect(screen.getByTestId('inbox-empty')).toBeTruthy());
  });
});

describe('unread badges', () => {
  it('a row shows its unread count, capped at 9+, and nothing when read', async () => {
    const { wrapper } = inboxWrapper(loadedRoutes, { tables: loadedTables });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}-unread`)).toBeTruthy());
    expect(within(screen.getByTestId(`inbox-card-${ANNA}-unread`)).getByText('2')).toBeTruthy();
    expect(screen.getByTestId(`inbox-card-${ANNA}-unread`).props.accessibilityLabel).toBe('2 unread');
    expect(within(screen.getByTestId('inbox-card-chat_group:g-1-unread')).getByText('9+')).toBeTruthy();
    expect(screen.queryByTestId(`inbox-card-${BEN}-unread`)).toBeNull();
  });

  it("the shell's inboxUnread badge is direct unread + every group's unread", async () => {
    const { wrapper, requests } = inboxWrapper(loadedRoutes, { tables: loadedTables });
    const { result } = renderHook(() => useBadge('inboxUnread'), { wrapper });
    await waitFor(() => expect(result.current).toBe(14));
    expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual(expect.arrayContaining(['GET /chat/unread-count', 'GET /chat/groups/']));
  });

  it('a realtime DM to the member bumps the row to the top with one more unread', async () => {
    const { wrapper, emit } = inboxWrapper(loadedRoutes, { tables: loadedTables });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${BEN}`)).toBeTruthy());
    await act(async () => emit('chat_messages', 'INSERT', { new: { id: 'rt', sender_id: BEN, receiver_id: ME, content: 'New from Ben', created_at: new Date().toISOString() } }));
    await waitFor(() => expect(screen.getByText('New from Ben')).toBeTruthy());
    expect(within(screen.getByTestId(`inbox-card-${BEN}-unread`)).getByText('1')).toBeTruthy();
    const first = screen.getAllByTestId(/-open$/)[0].props.testID;
    expect(first).toBe(`inbox-card-${BEN}-open`);
  });
});

describe('search, filters, navigation', () => {
  it('search filters by name / last message and lists the matches in the dropdown', async () => {
    const { wrapper } = inboxWrapper(loadedRoutes, { tables: loadedTables });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-search'));
    fireEvent.changeText(screen.getByTestId('inbox-search-input'), 'yoga');
    expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy();
    expect(screen.queryByTestId(`inbox-card-${BEN}`)).toBeNull();
    expect(screen.getByTestId(`inbox-search-item-${ANNA}`)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('inbox-search-input'), 'zzz');
    expect(screen.getByTestId('inbox-no-match')).toBeTruthy();
    expect(screen.getByText('No conversations matching "zzz"')).toBeTruthy();
    fireEvent.press(screen.getByTestId('inbox-search-close'));
    expect(screen.getByTestId(`inbox-card-${BEN}`)).toBeTruthy();
  });

  it('the Direct / Groups pills filter by thread type', async () => {
    const { wrapper } = inboxWrapper(loadedRoutes, { tables: loadedTables });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-filter-groups'));
    expect(screen.getByTestId('inbox-card-chat_group:g-1')).toBeTruthy();
    expect(screen.queryByTestId(`inbox-card-${ANNA}`)).toBeNull();
    fireEvent.press(screen.getByTestId('inbox-filter-direct'));
    expect(screen.queryByTestId('inbox-card-chat_group:g-1')).toBeNull();
    expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy();
  });

  it('a DM row opens /inbox/u/<peer>, a group row /inbox/g/<id> (conversation-chat routes, by path)', async () => {
    const { wrapper } = inboxWrapper(loadedRoutes, { tables: loadedTables });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    fireEvent.press(screen.getByTestId(`inbox-card-${ANNA}-open`));
    expect(router.navigate).toHaveBeenLastCalledWith(`/inbox/u/${ANNA}`);
    // The avatar opens the member's profile (web ClickableAvatar).
    fireEvent.press(screen.getByTestId(`inbox-card-${ANNA}-avatar`));
    expect(router.navigate).toHaveBeenLastCalledWith(`/u/${ANNA}`);
    fireEvent.press(screen.getByTestId('inbox-card-chat_group:g-1-open'));
    expect(router.navigate).toHaveBeenLastCalledWith('/inbox/g/g-1');
  });

  it('the Network list reads the tenant tables and its rows open /inbox/t/<id>?context=tenant', async () => {
    const tables = {
      thread_participants: [
        { thread_id: 'th-1', user_id: ME, last_read_at: null, is_active: true, role: 'member', profile: { user_id: ME, display_name: 'Me Myself' } },
        { thread_id: 'th-1', user_id: 'u-dr', last_read_at: null, is_active: true, role: 'member', profile: { user_id: 'u-dr', display_name: 'Dr. Lee' } },
      ],
      message_threads: [{ id: 'th-1', tenant_id: TENANT, type: 'direct', name: null, created_by: ME, created_at: '2026-10-01T00:00:00Z', updated_at: new Date().toISOString() }],
      messages: [{ id: 'tm-1', thread_id: 'th-1', tenant_id: TENANT, sender_id: 'u-dr', body: 'Your results are in', created_at: new Date().toISOString() }],
    };
    const { wrapper, queries } = inboxWrapper(loadedRoutes, { tables });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('mode-pill')).toBeTruthy());
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-tenant'));
    await waitFor(() => expect(screen.getByText('Dr. Lee')).toBeTruthy());
    expect(screen.getByText('Your results are in')).toBeTruthy();
    expect(queries.find((q) => q.table === 'message_threads')?.filters).toEqual([
      ['eq', 'tenant_id', TENANT],
      ['in', 'id', ['th-1']],
      ['order', 'updated_at', { ascending: false }],
    ]);
    fireEvent.press(screen.getByTestId('inbox-card-th-1-open'));
    expect(router.navigate).toHaveBeenLastCalledWith('/inbox/t/th-1?context=tenant');
  });
});

describe('mark all as read', () => {
  it('reads every DM via the gateway, watermarks legacy threads, clears chat notifications and reads each unread group', async () => {
    let groupRead = false;
    const routes = {
      ...loadedRoutes,
      'GET /chat/groups/': () => ({ data: groups.data.map((g) => ({ ...g, unread_count: groupRead ? 0 : g.unread_count })) }),
      'POST /chat/groups/g-1/read': () => ((groupRead = true), { ok: true }),
    };
    const { wrapper, requests, queries } = inboxWrapper(routes, { tables: loadedTables });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}-unread`)).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-menu'));
    await act(async () => fireEvent.press(screen.getByTestId('inbox-mark-all-read')));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toContain('inbox.toast.allMarkedRead'));
    const calls = requests.map((r) => `${r.method} ${r.path}`);
    expect(calls).toEqual(expect.arrayContaining(['POST /chat/read-all', 'POST /chat/groups/g-1/read']));
    expect(requests.find((r) => r.path === '/chat/read-all')?.body).toEqual({});
    const notif = queries.find((q) => q.table === 'user_notifications');
    expect(notif?.op).toBe('update');
    expect(notif?.filters).toEqual([
      ['eq', 'type', 'new_chat_message'],
      ['eq', 'user_id', ME],
      ['is', 'read_at', null],
    ]);
    await waitFor(() => expect(screen.queryByTestId(`inbox-card-${ANNA}-unread`)).toBeNull());
    await waitFor(() => expect(screen.queryByTestId('inbox-card-chat_group:g-1-unread')).toBeNull());
  });

  it('is disabled at 0 unread', async () => {
    const { wrapper, requests } = inboxWrapper({ ...loadedRoutes, 'GET /chat/groups/': { data: [] } }, { tables: { ...loadedTables, chat_messages: [] } });
    render(<InboxScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId(`inbox-card-${ANNA}`)).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-menu'));
    expect(screen.getByTestId('inbox-mark-all-read').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(screen.getByTestId('inbox-mark-all-read'));
    expect(requests.some((r) => r.path === '/chat/read-all')).toBe(false);
  });
});
