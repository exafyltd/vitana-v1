/**
 * VTID-05685 (native-parity-test-gaps) — ledger row `/comm/my-groups/:id` (status native, an exclusion alias):
 * the route file reads `id` from the route params and renders the group detail, like /comm/groups/:id.
 * Supabase is the in-memory double of tests/community/helpers; no network.
 */
import '../helpers/no-network';
import './mocks';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen, waitFor } from '@testing-library/react-native';
import { routeParams } from './mocks';
import { __setSupabaseForTests } from '../../src/auth/client';
import { createCommunitySupabaseDouble, makeCommunityWrapper } from '../community/helpers';
import MyGroupDetailRoute from '../../app/(app)/comm/my-groups/[id]';

const ledger = JSON.parse(readFileSync(join(__dirname, '../../parity/ledger.json'), 'utf8')) as {
  rows: Array<{ key: string; web_path: string; status: string; lane: string; source: string; scope: string }>;
};

const group = {
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

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  for (const k of Object.keys(routeParams)) delete routeParams[k];
});

describe('/comm/my-groups/:id route', () => {
  it('renders the group detail for the id in the route params', async () => {
    routeParams.id = 'g-1';
    const d = createCommunitySupabaseDouble({ tables: { global_community_groups: [group], global_community_group_members: [] } });
    render(<MyGroupDetailRoute />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('screen-group-detail')).toBeTruthy());
    expect(screen.getByText('Morning Flow')).toBeTruthy();
  });

  it('shows the not-found state when the id in the route params is not a group', async () => {
    routeParams.id = 'missing';
    const d = createCommunitySupabaseDouble({ tables: { global_community_groups: [group], global_community_group_members: [] } });
    render(<MyGroupDetailRoute />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('group-detail-not-found')).toBeTruthy());
    expect(screen.queryByText('Morning Flow')).toBeNull();
  });

  it('is native in the ledger (an exclusion alias in the home-feed lane)', () => {
    expect(ledger.rows.find((r) => r.key === '/comm/my-groups/:id')).toMatchObject({
      web_path: '/comm/my-groups/:id',
      status: 'native',
      lane: 'home-feed',
      source: 'exclusion',
      scope: 'in',
    });
  });
});
