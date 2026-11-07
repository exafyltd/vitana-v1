/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the "New" sheet
 * (tasks.md inbox-list task 2): it opens from the inbox header; the member
 * search calls EXACTLY the web RPCs `search_global_directory({ search_term })`
 * (Community) and `search_tenant_directory({ search_term, tenant_id_param })`
 * (Network) — never a member-listing table — so the service-bot / test-actor
 * exclusion (program NEVER rule 45, R5.5, sparring R1-F1) is inherited: a
 * directory fixture containing a bot and a test actor renders neither. A
 * second member switches the sheet to create-group mode (the mobile web's
 * create-group flow); start chat / create group build the web's RPCs and
 * inserts and open the conversation route by path. No network: every RPC
 * and insert lands in the Supabase double.
 */
import '../../helpers/no-network';
import { router } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { randomUUID } from 'expo-crypto';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../../src/ports/ui';
import { InboxScreen } from '../../../src/screens/inbox/InboxScreen';
import { __resetInboxUnreadForTests } from '../../../src/screens/inbox/data/unread';
import { BOT, ME, TENANT, TEST_ACTOR, directoryRpc, inboxWrapper, loadedRoutes, loadedTables } from './helpers';


beforeEach(() => {
  (randomUUID as jest.Mock).mockReturnValue('th-new-group');
});
afterEach(() => {
  router.navigate.mockClear();
  __clearToastsForTests();
  __resetInboxUnreadForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const MEMBER_LISTING_TABLES = ['global_community_profiles', 'profiles', 'app_users', 'memberships', 'user_tenants'];

const rpc = {
  search_global_directory: (a: { search_term: string }) => ({ data: directoryRpc(a.search_term), error: null }),
  search_tenant_directory: (a: { search_term: string }) => ({ data: directoryRpc(a.search_term), error: null }),
  is_community_user: () => ({ data: true, error: null }),
  create_or_get_global_dm: () => ({ data: [{ thread_id: 'th-dm' }], error: null }),
  create_tenant_direct_thread: () => ({ data: 'th-tenant', error: null }),
};

async function openSheet(sb = {}) {
  const h = inboxWrapper(loadedRoutes, { tables: loadedTables, rpc, ...sb });
  render(<InboxScreen />, { wrapper: h.wrapper });
  await waitFor(() => expect(screen.getByTestId('inbox-card-u-anna')).toBeTruthy());
  fireEvent.press(screen.getByTestId('inbox-new'));
  return h;
}

async function search(term: string) {
  fireEvent.changeText(screen.getByTestId('inbox-new-search'), term);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 350));
  });
}

describe('new-conversation sheet', () => {
  it('opens from the inbox header with the web title, search field and actions', async () => {
    await openSheet();
    expect(screen.getByTestId('inbox-new-conversation')).toBeTruthy();
    expect(screen.getByText('Start New Conversation')).toBeTruthy();
    expect(screen.getByText('Search for people')).toBeTruthy();
    expect(screen.getByTestId('inbox-new-start').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.changeText(screen.getByTestId('inbox-new-search'), 'c');
    expect(screen.getByText('Type at least 2 characters to search')).toBeTruthy();
  });

  it('Community search calls exactly search_global_directory({ search_term }) and renders no bot or test actor', async () => {
    const { rpcs, queries } = await openSheet();
    const before = queries.length;
    await search('Cleo');
    await waitFor(() => expect(screen.getByTestId('inbox-new-result-u-cleo')).toBeTruthy());
    expect(screen.getByTestId('inbox-new-result-u-cleon')).toBeTruthy();
    expect(screen.queryByTestId(`inbox-new-result-${BOT}`)).toBeNull();
    expect(screen.queryByTestId(`inbox-new-result-${TEST_ACTOR}`)).toBeNull();
    expect(screen.queryByText('Cleo Bot')).toBeNull();
    expect(screen.queryByText('Cleo Test Actor')).toBeNull();
    const searchRpcs = rpcs.filter((r) => r.name.startsWith('search_'));
    expect(searchRpcs).toEqual([{ name: 'search_global_directory', args: { search_term: 'Cleo' } }]);
    // No member-listing table is read by the search (the exclusion lives in the RPC).
    expect(queries.slice(before).filter((q) => MEMBER_LISTING_TABLES.includes(q.table))).toEqual([]);
  });

  it('Network search calls exactly search_tenant_directory({ search_term, tenant_id_param })', async () => {
    const h = inboxWrapper(loadedRoutes, { tables: { ...loadedTables, thread_participants: [] }, rpc });
    render(<InboxScreen />, { wrapper: h.wrapper });
    await waitFor(() => expect(screen.getByTestId('mode-pill')).toBeTruthy());
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-tenant'));
    await waitFor(() => expect(screen.getByTestId('inbox-new')).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-new'));
    await search('Cleo');
    await waitFor(() => expect(screen.getByTestId('inbox-new-result-u-cleo')).toBeTruthy());
    expect(screen.queryByTestId(`inbox-new-result-${BOT}`)).toBeNull();
    expect(h.rpcs.filter((r) => r.name.startsWith('search_'))).toEqual([{ name: 'search_tenant_directory', args: { search_term: 'Cleo', tenant_id_param: TENANT } }]);
  });

  it('a failed search raises the web toast', async () => {
    await openSheet({ rpc: { ...rpc, search_global_directory: () => ({ data: null, error: { message: 'x' } }) } });
    await search('Cleo');
    await waitFor(() => expect(__toastsForTests().map((x) => x.descKey)).toContain('inbox.toast.searchFailed'));
  });

  it('start chat: is_community_user + create_or_get_global_dm, then /inbox/u/<member>', async () => {
    const { rpcs } = await openSheet();
    await search('Cleo');
    await waitFor(() => expect(screen.getByTestId('inbox-new-add-u-cleo')).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-new-add-u-cleo'));
    expect(screen.getByTestId('inbox-new-selected-u-cleo')).toBeTruthy();
    expect(screen.getByText('Recipient')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('inbox-new-start')));
    await waitFor(() => expect(router.navigate).toHaveBeenCalledWith('/inbox/u/u-cleo'));
    expect(rpcs.filter((r) => !r.name.startsWith('search_') && r.name !== 'list_public_tenants')).toEqual([
      { name: 'is_community_user', args: undefined },
      { name: 'create_or_get_global_dm', args: { p_other_user: 'u-cleo' } },
    ]);
    expect(__toastsForTests().map((x) => x.descKey)).toContain('inbox.toast.conversationStarted');
  });

  it('a second member switches to create-group mode with a prefilled name; create builds the web inserts', async () => {
    const { queries } = await openSheet();
    await search('Cleo');
    await waitFor(() => expect(screen.getByTestId('inbox-new-add-u-cleo')).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-new-add-u-cleo'));
    await search('Cleon');
    await waitFor(() => expect(screen.getByTestId('inbox-new-add-u-cleon')).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-new-add-u-cleon'));
    await waitFor(() => expect(screen.getByText('Create Group Chat')).toBeTruthy());
    expect(screen.getByTestId('inbox-new-group-name').props.value).toBe('Cleo Ray, Cleon Park');
    expect(screen.getByText('Members (2)')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('inbox-new-start')));
    await waitFor(() => expect(router.navigate).toHaveBeenCalledWith('/inbox/t/th-new-group'));
    const inserts = queries.filter((q) => q.op === 'insert').map((q) => [q.table, q.values]);
    expect(inserts[0]).toEqual(['global_message_threads', { id: 'th-new-group', created_by: ME, type: 'group', name: 'Cleo Ray, Cleon Park' }]);
    expect(inserts[1]).toEqual(['global_thread_participants', { thread_id: 'th-new-group', user_id: ME, role: 'admin' }]);
    expect(inserts[2]).toEqual([
      'global_thread_participants',
      [
        { thread_id: 'th-new-group', user_id: 'u-cleo', role: 'member' },
        { thread_id: 'th-new-group', user_id: 'u-cleon', role: 'member' },
      ],
    ]);
    expect(inserts[3][0]).toBe('global_messages');
    expect((inserts[3][1] as { message_type: string }).message_type).toBe('system');
    expect(__toastsForTests().find((x) => x.descKey === 'inbox.toast.groupCreated')?.params).toEqual({ name: 'Cleo Ray, Cleon Park' });
  });

  it('removing a member returns to direct mode', async () => {
    await openSheet();
    await search('Cleo');
    await waitFor(() => expect(screen.getByTestId('inbox-new-add-u-cleo')).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-new-add-u-cleo'));
    await search('Cleon');
    await waitFor(() => expect(screen.getByTestId('inbox-new-add-u-cleon')).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-new-add-u-cleon'));
    await waitFor(() => expect(screen.getByText('Create Group Chat')).toBeTruthy());
    fireEvent.press(screen.getByTestId('inbox-new-remove-u-cleon'));
    await waitFor(() => expect(screen.getByText('Start New Conversation')).toBeTruthy());
    expect(screen.queryByTestId('inbox-new-group-name')).toBeNull();
  });
});
