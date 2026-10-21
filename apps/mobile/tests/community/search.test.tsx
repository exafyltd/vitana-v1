/** VTID-05296 — Global search: query → results / empty. */
import '../helpers/no-network';
import './mocks';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { createCommunitySupabaseDouble, makeCommunityWrapper } from './helpers';
import { SearchScreen } from '../../src/screens/community/SearchScreen';

afterAll(() => __setSupabaseForTests(null));

const profiles = [
  { user_id: 'u-9', display_name: 'Ana Belić', avatar_url: null, is_visible: true },
  { user_id: 'u-self', display_name: 'Me', avatar_url: null, is_visible: true },
];

describe('SearchScreen', () => {
  it('shows results for a submitted query, excluding the current user', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_profiles: profiles } });
    render(<SearchScreen initialQuery="ana" />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('search-list')).toBeTruthy());
    expect(screen.getByText('Ana Belić')).toBeTruthy();
    expect(screen.queryByText('Me')).toBeNull();
  });

  it('shows the empty state when nothing matches', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_profiles: [] } });
    render(<SearchScreen initialQuery="zzz" />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('search-empty')).toBeTruthy());
  });

  it('runs a search when the submit button is pressed', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_profiles: profiles } });
    render(<SearchScreen />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    fireEvent.changeText(screen.getByTestId('search-input'), 'ana');
    fireEvent.press(screen.getByTestId('search-submit'));
    await waitFor(() => expect(screen.getByTestId('search-list')).toBeTruthy());
    expect(screen.getByText('Ana Belić')).toBeTruthy();
  });

  it('shows the error state when the profile query fails', async () => {
    const d = createCommunitySupabaseDouble({ tables: { global_community_profiles: profiles }, failTables: true });
    render(<SearchScreen initialQuery="ana" />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('list-error')).toBeTruthy());
  });
});
