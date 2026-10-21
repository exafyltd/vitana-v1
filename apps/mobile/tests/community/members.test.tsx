/** VTID-05296 — Members directory + profile-preview overlay: loaded / empty / error / preview open-dismiss. */
import '../helpers/no-network';
import './mocks';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { createCommunitySupabaseDouble, makeCommunityWrapper } from './helpers';
import { MembersScreen } from '../../src/screens/community/MembersScreen';

afterAll(() => __setSupabaseForTests(null));

const member = {
  vitana_id: 'ana',
  registration_seq: 7,
  display_name: 'Ana Belić',
  avatar_url: null,
  location: 'Berlin',
  member_since: '2026-01-01',
  dance_preview: { variety: 'salsa', level: 'intermediate', role: 'lead' },
};

describe('MembersScreen', () => {
  it('lists members returned by the gateway', async () => {
    const d = createCommunitySupabaseDouble();
    render(<MembersScreen />, {
      wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/community/members': { members: [member], next_cursor: null } } }),
    });
    await waitFor(() => expect(screen.getByTestId('members-list')).toBeTruthy());
    expect(screen.getByText('Ana Belić')).toBeTruthy();
  });

  it('shows the empty state when there are no members', async () => {
    const d = createCommunitySupabaseDouble();
    render(<MembersScreen />, {
      wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/community/members': { members: [], next_cursor: null } } }),
    });
    await waitFor(() => expect(screen.getByTestId('members-empty')).toBeTruthy());
  });

  it('shows the error state when the gateway fails', async () => {
    const d = createCommunitySupabaseDouble();
    render(<MembersScreen />, { wrapper: makeCommunityWrapper({ client: d.client, gateway: {} }) });
    await waitFor(() => expect(screen.getByTestId('list-error')).toBeTruthy());
  });

  it('opens the profile-preview overlay on a card tap', async () => {
    const d = createCommunitySupabaseDouble();
    render(<MembersScreen />, {
      wrapper: makeCommunityWrapper({ client: d.client, gateway: { '/community/members': { members: [member], next_cursor: null } } }),
    });
    await waitFor(() => expect(screen.getByTestId('members-list')).toBeTruthy());
    expect(screen.queryByTestId('member-preview', { includeHiddenElements: true })).toBeNull();
    fireEvent.press(screen.getByTestId('member-card-ana'));
    expect(screen.getByTestId('member-preview-view-profile', { includeHiddenElements: true })).toBeTruthy();
  });
});
