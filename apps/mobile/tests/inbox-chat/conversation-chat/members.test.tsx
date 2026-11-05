/**
 * VTID-05458 — member-listing exclusion (program NEVER rule 45, sparring
 * R1-F1): the group members modal's member search calls EXACTLY
 * `rpc('search_global_directory', { search_term })` in the community context
 * and `rpc('search_tenant_directory', { search_term, tenant_id_param })` in a
 * tenant — the RPCs that exclude service_bot_accounts and
 * notification_test_actors server-side — and never reads a profile table for
 * search. Plus the modal: members, roles, Leave, add-member flow.
 */
import '../../helpers/no-network';
import './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { searchDirectory } from '../../../src/screens/chat/data/members';
import { GroupMembersModal } from '../../../src/screens/chat/GroupMembersModal';
import { createChatDouble, makeChatWrapper, ME, PEER } from './helpers';

afterAll(() => __setSupabaseForTests(null));

describe('searchDirectory — the only member search', () => {
  it('community context: exactly rpc("search_global_directory", { search_term })', async () => {
    const d = createChatDouble({ rpc: { search_global_directory: () => ({ data: [{ user_id: 'u-1', display_name: 'Ana' }], error: null }) } });
    __setSupabaseForTests(d.client);
    const rows = await searchDirectory('an', 'global', 't-1');
    expect(d.client.rpc).toHaveBeenCalledTimes(1);
    expect(d.client.rpc).toHaveBeenCalledWith('search_global_directory', { search_term: 'an' });
    expect(d.client.from).not.toHaveBeenCalled();
    expect(rows).toEqual([{ user_id: 'u-1', display_name: 'Ana' }]);
  });

  it('tenant context: exactly rpc("search_tenant_directory", { search_term, tenant_id_param })', async () => {
    const d = createChatDouble();
    __setSupabaseForTests(d.client);
    await searchDirectory('le', 'tenant', 't-42');
    expect(d.client.rpc).toHaveBeenCalledTimes(1);
    expect(d.client.rpc).toHaveBeenCalledWith('search_tenant_directory', { search_term: 'le', tenant_id_param: 't-42' });
    expect(d.client.from).not.toHaveBeenCalled();
  });

  it('a blank term searches nothing', async () => {
    const d = createChatDouble();
    __setSupabaseForTests(d.client);
    expect(await searchDirectory('  ', 'global', null)).toEqual([]);
    expect(d.client.rpc).not.toHaveBeenCalled();
  });
});

describe('GroupMembersModal', () => {
  const tables = {
    global_thread_participants: [
      { id: 'p-me', thread_id: 'th-1', user_id: ME, role: 'admin', is_active: true },
      { id: 'p-peer', thread_id: 'th-1', user_id: PEER, role: 'member', is_active: true },
    ],
    global_community_profiles: [
      { user_id: ME, display_name: 'Mia Me', avatar_url: null },
      { user_id: PEER, display_name: 'Petra Peer', avatar_url: null },
    ],
  };

  it('lists the active members with roles; an admin gets the search, which shows only RPC results that are not members yet', async () => {
    const d = createChatDouble({
      tables,
      rpc: { search_global_directory: () => ({ data: [{ user_id: PEER, display_name: 'Petra Peer' }, { user_id: 'u-new', display_name: 'Nora New' }], error: null }) },
    });
    render(<GroupMembersModal open onClose={jest.fn()} threadId="th-1" userId={ME} currentUserRole="admin" groupName="Tanzgruppe" createdBy={ME} />, {
      wrapper: makeChatWrapper({ client: d.client }),
    });
    await waitFor(() => expect(screen.getByTestId(`group-member-${PEER}`)).toBeTruthy());
    expect(screen.getByText('Group Members (2)')).toBeTruthy();
    expect(screen.getByTestId('group-title').props.children).toBe('Tanzgruppe');
    expect(screen.getByTestId('group-rename')).toBeTruthy();
    expect(screen.queryByTestId('group-leave')).toBeNull();
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('group-member-search'), 'no');
    });
    await waitFor(() => expect(screen.getByTestId('group-member-result-u-new')).toBeTruthy());
    expect(screen.queryByTestId(`group-member-result-${PEER}`)).toBeNull();
    // The shell's own tenant-list RPC aside, the only member-search call is the directory RPC.
    expect(d.calls.filter((c) => c.fn.startsWith('rpc.') && c.fn !== 'rpc.list_public_tenants')).toEqual([{ fn: 'rpc.search_global_directory', args: [{ search_term: 'no' }] }]);
    expect(d.calls.some((c) => c.fn === 'from.global_community_profiles.select' && JSON.stringify(c.args).includes('ilike'))).toBe(false);
    await act(async () => {
      fireEvent.press(screen.getByTestId('group-member-result-u-new'));
    });
    expect(d.writes.find((w) => w.table === 'global_thread_participants' && w.op === 'insert')?.values).toEqual({ thread_id: 'th-1', user_id: 'u-new', role: 'member' });
    expect(d.writes.find((w) => w.table === 'global_messages')?.values).toMatchObject({ message_type: 'system', content_data: { system_type: 'member_added', added_user: 'u-new' } });
  });

  it('a plain member sees Leave Group and no member search', async () => {
    const d = createChatDouble({ tables });
    render(<GroupMembersModal open onClose={jest.fn()} threadId="th-1" userId={PEER} currentUserRole="member" groupName="Tanzgruppe" createdBy={ME} />, {
      wrapper: makeChatWrapper({ client: d.client }),
    });
    await waitFor(() => expect(screen.getByTestId(`group-member-${ME}`)).toBeTruthy());
    expect(screen.getByTestId('group-leave')).toBeTruthy();
    expect(screen.queryByTestId('group-member-search')).toBeNull();
    expect(screen.queryByTestId('group-rename')).toBeNull();
  });
});
