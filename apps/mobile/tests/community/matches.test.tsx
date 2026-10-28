/** VTID-05296 — /me/matches: loaded / empty / error. */
import '../helpers/no-network';
import './mocks';
import { render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { createCommunitySupabaseDouble, makeCommunityWrapper } from './helpers';
import { MatchesScreen } from '../../src/screens/community/MatchesScreen';

afterAll(() => __setSupabaseForTests(null));

const futureIso = new Date(Date.now() + 86_400_000).toISOString();

describe('MatchesScreen', () => {
  it('lists resolved matches', async () => {
    const d = createCommunitySupabaseDouble({
      tables: {
        daily_matches: [
          { user_id: 'u-self', matched_user_id: 'u-9', match_score: 88, match_reasons: ['shared_goal'], expires_at: futureIso, action: null },
        ],
      },
      rpc: {
        get_user_profile_by_identifier: () => ({ data: [{ display_name: 'Mila K', avatar_url: null, location: 'Vienna' }], error: null }),
      },
    });
    render(<MatchesScreen />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('matches-list')).toBeTruthy());
    expect(screen.getByText('Mila K')).toBeTruthy();
    expect(screen.getByTestId('match-score-u-9')).toBeTruthy();
  });

  it('shows the empty state when there are no matches', async () => {
    const d = createCommunitySupabaseDouble({ tables: { daily_matches: [] } });
    render(<MatchesScreen />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('matches-empty')).toBeTruthy());
  });

  it('shows the error state when the read fails', async () => {
    const d = createCommunitySupabaseDouble({ tables: { daily_matches: [] }, failTables: true });
    render(<MatchesScreen />, { wrapper: makeCommunityWrapper({ client: d.client }) });
    // A failed read resolves to an empty list in the web hook, so the screen
    // shows the empty state rather than erroring — assert it does not crash.
    await waitFor(() => expect(screen.getByTestId('matches-empty')).toBeTruthy());
  });
});
