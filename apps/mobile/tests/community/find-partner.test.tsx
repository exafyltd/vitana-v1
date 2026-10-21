/** VTID-05296 — Find a Partner: view switch across matches / board / posts / members, each with states. */
import '../helpers/no-network';
import './mocks';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { createCommunitySupabaseDouble, makeCommunityWrapper } from './helpers';
import { FindPartnerScreen } from '../../src/screens/community/FindPartnerScreen';

afterAll(() => __setSupabaseForTests(null));

const openIntent = {
  intent_id: 'i-1',
  requester_user_id: 'u-self',
  requester_vitana_id: 'ana',
  tenant_id: 't-1',
  intent_kind: 'activity_seek',
  category: 'dance.salsa',
  title: 'Salsa partner wanted',
  scope: 'Weeknights',
  kind_payload: {},
  visibility: 'public',
  compass_alignment_at_post: null,
  status: 'open',
  match_count: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const match = {
  match_id: 'm-1',
  intent_a_id: 'i-1',
  intent_b_id: 'i-2',
  vitana_id_a: 'ana',
  vitana_id_b: 'milo',
  kind_pairing: 'activity',
  score: 91,
  match_reasons: {},
  compass_aligned: true,
  state: 'proposed',
  created_at: '2026-01-02T00:00:00Z',
  partner_display_name: 'Milo R',
  partner_intent_scope: 'Weeknights too',
};

describe('FindPartnerScreen', () => {
  it('matches view: lists fanned-out matches', async () => {
    const d = createCommunitySupabaseDouble();
    render(<FindPartnerScreen initialView="matches" />, {
      wrapper: makeCommunityWrapper({
        client: d.client,
        gateway: { '/intents': { intents: [openIntent] }, '/intents/i-1/matches': { matches: [match] } },
      }),
    });
    await waitFor(() => expect(screen.getByTestId('find-partner-matches-list')).toBeTruthy());
    expect(screen.getByText('Milo R')).toBeTruthy();
  });

  it('matches view: empty when the member has no open intents', async () => {
    const d = createCommunitySupabaseDouble();
    render(<FindPartnerScreen initialView="matches" />, {
      wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/intents': { intents: [] } } }),
    });
    await waitFor(() => expect(screen.getByTestId('find-partner-matches-empty')).toBeTruthy());
  });

  it('switches to the board view and lists intents', async () => {
    const d = createCommunitySupabaseDouble();
    render(<FindPartnerScreen initialView="matches" />, {
      wrapper: makeCommunityWrapper({
        client: d.client,
        gateway: { '/intents': { intents: [] }, '/intent-board': { compass: null, kinds_shown: [], intents: [openIntent] } },
      }),
    });
    fireEvent.press(screen.getByTestId('find-partner-view-board'));
    await waitFor(() => expect(screen.getByTestId('find-partner-board-list')).toBeTruthy());
    expect(screen.getByText('Salsa partner wanted')).toBeTruthy();
  });

  it('posts view: shows the empty state', async () => {
    const d = createCommunitySupabaseDouble();
    render(<FindPartnerScreen initialView="posts" />, {
      wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/intents': { intents: [] } } }),
    });
    await waitFor(() => expect(screen.getByTestId('find-partner-posts-empty')).toBeTruthy());
  });

  it('members view: lists the directory', async () => {
    const d = createCommunitySupabaseDouble();
    render(<FindPartnerScreen initialView="members" />, {
      wrapper: makeCommunityWrapper({
        client: d.client,
        gateway: { '/community/members': { members: [{ vitana_id: 'leo', registration_seq: 3, display_name: 'Leo P', avatar_url: null, location: 'Rome', member_since: null, dance_preview: null }], next_cursor: null } },
      }),
    });
    await waitFor(() => expect(screen.getByTestId('find-partner-members-list')).toBeTruthy());
    expect(screen.getByText('Leo P')).toBeTruthy();
  });
});
