/** VTID-05296 — Open asks feed: loaded / empty / error. */
import '../helpers/no-network';
import './mocks';
import { render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { createCommunitySupabaseDouble, makeCommunityWrapper } from './helpers';
import { OpenAsksScreen } from '../../src/screens/community/OpenAsksScreen';

afterAll(() => __setSupabaseForTests(null));

const ask = {
  intent_id: 'i-1',
  requester_vitana_id: 'ana',
  intent_kind: 'learning_seek',
  category: 'dance.salsa',
  title: 'Looking for a salsa practice buddy',
  scope_excerpt: 'Weeknights in Kreuzberg',
  kind_payload: { location_label: 'Kreuzberg' },
  created_at: new Date().toISOString(),
};

describe('OpenAsksScreen', () => {
  it('lists open asks returned by the gateway', async () => {
    const d = createCommunitySupabaseDouble();
    render(<OpenAsksScreen />, {
      wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/community/open-asks': { asks: [ask], next_cursor: null } } }),
    });
    await waitFor(() => expect(screen.getByTestId('open-asks-list')).toBeTruthy());
    expect(screen.getByText('Looking for a salsa practice buddy')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    const d = createCommunitySupabaseDouble();
    render(<OpenAsksScreen />, {
      wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/community/open-asks': { asks: [], next_cursor: null } } }),
    });
    await waitFor(() => expect(screen.getByTestId('open-asks-empty')).toBeTruthy());
  });

  it('shows the error state when the gateway fails', async () => {
    const d = createCommunitySupabaseDouble();
    render(<OpenAsksScreen />, { wrapper: makeCommunityWrapper({ client: d.client, gateway: {} }) });
    await waitFor(() => expect(screen.getByTestId('list-error')).toBeTruthy());
  });
});
