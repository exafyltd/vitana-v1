/** VTID-05296 — Groups + Group detail: loaded / empty / error / tab switch / join-leave. */
import '../helpers/no-network';
import './mocks';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { createCommunitySupabaseDouble, makeCommunityWrapper } from './helpers';
import { GroupsScreen } from '../../src/screens/community/GroupsScreen';
import { GroupDetailScreen } from '../../src/screens/community/GroupDetailScreen';

afterAll(() => __setSupabaseForTests(null));

const mineGroup = {
  id: 'g-1',
  name: 'Morning Flow',
  description: 'Sunrise yoga',
  category: 'yoga',
  cover_url: null,
  avatar_url: null,
  member_count: 12,
  created_at: '2026-01-01T00:00:00Z',
  status: 'approved',
  is_public: true,
  created_by: 'u-self',
};
const directoryGroup = {
  id: 'g-2',
  name: 'Trail Runners',
  description: 'Weekend trails',
  category: 'running',
  cover_url: null,
  avatar_url: null,
  member_count: 40,
  is_public: true,
  created_at: '2026-02-01T00:00:00Z',
  status: 'approved',
  created_by: 'u-other',
};

describe('GroupsScreen', () => {
  it('shows my groups when loaded', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_groups: [mineGroup], global_community_group_members: [] } });
    render(<GroupsScreen />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('groups-list-mine')).toBeTruthy());
    expect(screen.getByText('Morning Flow')).toBeTruthy();
  });

  it('shows the empty state for my groups', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_groups: [], global_community_group_members: [] } });
    render(<GroupsScreen />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('groups-empty-mine')).toBeTruthy());
  });

  it('switches to Discover and lists recommended groups with a join action', async () => {
    const d = createCommunitySupabaseDouble({
      tables: { global_community_groups: [directoryGroup], global_community_group_members: [] },
    });
    render(<GroupsScreen />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    fireEvent.press(screen.getByTestId('groups-tab-recommended'));
    await waitFor(() => expect(screen.getByTestId('groups-list-discover')).toBeTruthy());
    expect(screen.getByText('Trail Runners')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('group-join-g-2')).toBeTruthy());
  });

  it('starts on the Discover tab when initialTab is recommended', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_groups: [directoryGroup], global_community_group_members: [] } });
    render(<GroupsScreen initialTab="recommended" />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('groups-list-discover')).toBeTruthy());
  });

  it('shows the directory error state when the discover query fails', async () => {
    const d = createCommunitySupabaseDouble({ failTables: true });
    render(<GroupsScreen initialTab="recommended" />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('list-error')).toBeTruthy());
  });

  it('filters My groups by the search box', async () => {
    const other = { ...mineGroup, id: 'g-3', name: 'Evening Stretch', created_by: 'u-self' };
    const d = createCommunitySupabaseDouble({ tables: { global_community_groups: [mineGroup, other], global_community_group_members: [] } });
    render(<GroupsScreen />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('groups-list-mine')).toBeTruthy());
    expect(screen.getByText('Morning Flow')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('groups-search'), 'evening');
    await waitFor(() => expect(screen.queryByText('Morning Flow')).toBeNull());
    expect(screen.getByText('Evening Stretch')).toBeTruthy();
  });

  it('opens the create-group sheet and inserts a group on submit', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_groups: [], global_community_group_members: [] } });
    render(<GroupsScreen />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('screen-groups')).toBeTruthy());
    fireEvent.press(screen.getByTestId('groups-create'));
    fireEvent.changeText(screen.getByTestId('create-group-name', { includeHiddenElements: true }), 'Sunset Yogis');
    await waitFor(() => {
      fireEvent.press(screen.getByTestId('create-group-submit', { includeHiddenElements: true }));
      expect(d.inserts.some((i) => i.table === 'global_community_groups')).toBe(true);
    });
    const inserted = d.inserts.find((i) => i.table === 'global_community_groups');
    expect(inserted?.values.name).toBe('Sunset Yogis');
  });
});

describe('GroupDetailScreen', () => {
  it('renders the group and a leave action for a member', async () => {
    const d = createCommunitySupabaseDouble({
      tables: {
        global_community_groups: [mineGroup],
        global_community_group_members: [{ id: 'm-1', group_id: 'g-1', user_id: 'u-self', role: 'admin', joined_at: '2026-01-02T00:00:00Z' }],
      },
    });
    render(<GroupDetailScreen id="g-1" />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('screen-group-detail')).toBeTruthy());
    expect(screen.getByText('Morning Flow')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('group-detail-leave')).toBeTruthy());
  });

  it('shows the not-found state when the group is missing', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_groups: [], global_community_group_members: [] } });
    render(<GroupDetailScreen id="missing" />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('group-detail-not-found')).toBeTruthy());
  });

  it('shows the not-found state when the detail query errors', async () => {
    const d = createCommunitySupabaseDouble({ failTables: true });
    render(<GroupDetailScreen id="g-1" />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('group-detail-not-found')).toBeTruthy());
  });
});
