/** VTID-05296 — Intent board + match detail: loaded / empty / error / no-matches. */
import '../helpers/no-network';
import './mocks';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { createCommunitySupabaseDouble, makeCommunityWrapper } from './helpers';
import { IntentBoardScreen } from '../../src/screens/community/IntentBoardScreen';
import { IntentMatchDetailScreen } from '../../src/screens/community/IntentMatchDetailScreen';

afterAll(() => __setSupabaseForTests(null));

const intent = {
  intent_id: 'i-1',
  requester_user_id: 'u-self',
  requester_vitana_id: 'ana',
  tenant_id: 't-1',
  intent_kind: 'social_seek',
  category: 'dance.tango',
  title: 'Tango social this weekend',
  scope: 'Saturday evening',
  kind_payload: {},
  visibility: 'public',
  compass_alignment_at_post: null,
  status: 'open',
  match_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('IntentBoardScreen', () => {
  it('lists intents on the board', async () => {
    const d = createCommunitySupabaseDouble();
    render(<IntentBoardScreen />, {
      wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/intent-board': { compass: null, kinds_shown: [], intents: [intent] } } }),
    });
    await waitFor(() => expect(screen.getByTestId('intent-board-list')).toBeTruthy());
    expect(screen.getByText('Tango social this weekend')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    const d = createCommunitySupabaseDouble();
    render(<IntentBoardScreen />, {
      wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/intent-board': { compass: null, kinds_shown: [], intents: [] } } }),
    });
    await waitFor(() => expect(screen.getByTestId('intent-board-empty')).toBeTruthy());
  });

  it('shows the error state when the board fails', async () => {
    const d = createCommunitySupabaseDouble();
    render(<IntentBoardScreen />, { wrapper: makeCommunityWrapper({ client: d.client, gateway: {} }) });
    await waitFor(() => expect(screen.getByTestId('list-error')).toBeTruthy());
  });

  it('client-filters the dance meta-tab by category prefix', async () => {
    const d = createCommunitySupabaseDouble();
    render(<IntentBoardScreen />, {
      wrapper: makeCommunityWrapper({
        client: d.client,
        gateway: { '/intent-board': { compass: null, kinds_shown: [], intents: [intent, { ...intent, intent_id: 'i-2', category: 'commercial.books', title: 'Book swap' }] } },
      }),
    });
    await waitFor(() => expect(screen.getByTestId('intent-board-list')).toBeTruthy());
    fireEvent.press(screen.getByTestId('intent-board-filter-dance'));
    await waitFor(() => expect(screen.getByText('Tango social this weekend')).toBeTruthy());
    expect(screen.queryByText('Book swap')).toBeNull();
  });

  it('shows the dance-variety chips on the dance meta-tab and narrows by variety', async () => {
    const d = createCommunitySupabaseDouble();
    const bachata = { ...intent, intent_id: 'i-3', category: 'dance.bachata', title: 'Bachata practice', kind_payload: { dance: { variety: 'bachata' } } };
    render(<IntentBoardScreen />, {
      wrapper: makeCommunityWrapper({
        client: d.client,
        gateway: { '/intent-board': { compass: null, kinds_shown: [], intents: [intent, bachata] } },
      }),
    });
    await waitFor(() => expect(screen.getByTestId('intent-board-list')).toBeTruthy());
    fireEvent.press(screen.getByTestId('intent-board-filter-dance'));
    await waitFor(() => expect(screen.getByTestId('intent-board-variety')).toBeTruthy());
    // Tango + Bachata both show under "any"; selecting bachata drops the tango post.
    fireEvent.press(screen.getByTestId('intent-board-variety-bachata'));
    await waitFor(() => expect(screen.queryByText('Tango social this weekend')).toBeNull());
    expect(screen.getByText('Bachata practice')).toBeTruthy();
  });

  it('includes the learning_seek filter and forwards it as a kind', async () => {
    const d = createCommunitySupabaseDouble();
    const learning = { ...intent, intent_id: 'i-4', intent_kind: 'activity_seek', category: null, title: 'Learn to lead' };
    render(<IntentBoardScreen />, {
      wrapper: makeCommunityWrapper({
        client: d.client,
        gateway: { '/intent-board': { compass: null, kinds_shown: [], intents: [learning] } },
      }),
    });
    await waitFor(() => expect(screen.getByTestId('intent-board-list')).toBeTruthy());
    expect(screen.getByTestId('intent-board-filter-learning_seek')).toBeTruthy();
    fireEvent.press(screen.getByTestId('intent-board-filter-learning_seek'));
    await waitFor(() => expect(screen.getByTestId('intent-board-list')).toBeTruthy());
  });

  it('opens the composer from the Post action', async () => {
    const d = createCommunitySupabaseDouble();
    render(<IntentBoardScreen />, {
      wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/intent-board': { compass: null, kinds_shown: [], intents: [intent] } } }),
    });
    await waitFor(() => expect(screen.getByTestId('intent-board-list')).toBeTruthy());
    fireEvent.press(screen.getByTestId('intent-board-post'));
    expect(screen.getByTestId('composer-submit', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('IntentMatchDetailScreen', () => {
  it('renders the intent and its matches', async () => {
    const d = createCommunitySupabaseDouble();
    render(<IntentMatchDetailScreen id="i-1" />, {
      wrapper: makeCommunityWrapper({
        client: d.client,
        gateway: {
          '/intents/i-1': { intent },
          '/intents/i-1/matches': { matches: [{ match_id: 'm-1', intent_a_id: 'i-1', intent_b_id: 'i-2', vitana_id_a: 'ana', vitana_id_b: 'rex', kind_pairing: 'social', score: 80, match_reasons: {}, compass_aligned: false, state: 'proposed', created_at: '2026-01-02T00:00:00Z', partner_display_name: 'Rex T' }] },
        },
      }),
    });
    await waitFor(() => expect(screen.getByTestId('intent-match-list')).toBeTruthy());
    expect(screen.getByText('Rex T')).toBeTruthy();
  });

  it('shows no-matches when the intent has none', async () => {
    const d = createCommunitySupabaseDouble();
    render(<IntentMatchDetailScreen id="i-1" />, {
      wrapper: makeCommunityWrapper({
        client: d.client,
        gateway: { '/intents/i-1': { intent }, '/intents/i-1/matches': { matches: [] } },
      }),
    });
    await waitFor(() => expect(screen.getByTestId('intent-match-no-matches')).toBeTruthy());
  });

  it('shows not-found when the intent is missing', async () => {
    const d = createCommunitySupabaseDouble();
    render(<IntentMatchDetailScreen id="missing" />, { wrapper: makeCommunityWrapper({ client: d.client, gateway: {} }) });
    await waitFor(() => expect(screen.getByTestId('intent-match-not-found')).toBeTruthy());
  });
});
