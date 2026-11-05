/**
 * VTID-05429 (Native Wave 2, profile lane) — `/me/profile` (MyProfileScreen):
 * loaded / empty / error, the ID-card segments, the tabs, and every edit sheet's
 * save asserted as the BUILT request on the client double — nothing is sent
 * (no-network guard first; the double records writes and never forwards them).
 * React 19: `ReactElement`, no global `JSX`.
 */
import '../helpers/no-network';
import { router, routeParams } from './mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { MyProfileScreen } from '../../src/screens/profile/MyProfileScreen';
import { createProfileDouble, profileRow, renderProfile } from './helpers';

const hidden = { includeHiddenElements: true } as const;

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  routeParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
});

function loaded(extra: Record<string, Record<string, unknown>[]> = {}, opts: { failWrites?: boolean } = {}) {
  return createProfileDouble({
    email: 'ana@example.org',
    failWrites: opts.failWrites,
    tables: {
      profiles: [profileRow],
      profile_posts: [{ id: 'po-1', user_id: 'u-1', content: 'First dance post', image_url: null, likes_count: 2, comments_count: 0, created_at: '2026-10-01T00:00:00Z' }],
      profile_gallery: [{ id: 'ph-1', user_id: 'u-1', image_url: 'https://cdn.example.org/a.jpg', caption: 'Stage' }],
      profile_milestones: [{ id: 'm-1', user_id: 'u-1', title: 'First festival', icon: '⭐', is_public: true }],
      global_community_group_members: [{ id: 'gm-1', user_id: 'u-1', group_id: 'g-1', role: 'member', joined_at: '2026-02-01' }],
      global_community_groups: [{ id: 'g-1', name: 'Salsa Berlin', avatar_url: null, member_count: 1200, created_by: 'u-9', status: 'approved' }],
      vitana_index_scores: [{ user_id: 'u-1', date: '2026-10-31', score_total: 612 }],
      ...extra,
    },
    rpc: { get_user_follow_counts: () => ({ data: { followers_count: 12, following_count: 7 }, error: null }) },
  });
}

describe('MyProfileScreen — loaded / empty / error', () => {
  it('renders the Identity card, the stats strip and the posts tab from the member row', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('screen-my-profile')).toBeTruthy());
    // Display name composes Account first + last name (web ProfileProvider).
    expect(screen.getByTestId('profile-display-name').props.children).toBe('Ana Belić');
    expect(screen.getByText('@ana')).toBeTruthy();
    expect(screen.getByText('The Mindful Mover')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('profile-vitana-index-score').props.children).toBe('612'));
    await waitFor(() => expect(screen.getByTestId('profile-posts-list')).toBeTruthy());
    expect(screen.getByText('First dance post')).toBeTruthy();
    // Stats: 1 post, 1 photo, max(1 membership, 0 created) groups.
    expect(screen.getByTestId('profile-stats-posts')).toBeTruthy();
    // Reads only — nothing written on load.
    expect(d.writes).toEqual([]);
  });

  it('shows the follower / following counts (get_user_follow_counts, UUID ids only — web useFollow)', async () => {
    const uid = '7d3f1c2a-1b2c-4d5e-8f90-123456789abc';
    const d = createProfileDouble({
      userId: uid,
      tables: { profiles: [{ ...profileRow, user_id: uid }] },
      rpc: { get_user_follow_counts: (args) => ({ data: args.user_id_param === uid ? { followers_count: 1204, following_count: 7 } : null, error: null }) },
    });
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('profile-followers').props.children).toBe('1,204 Followers'));
    expect(screen.getByTestId('profile-following').props.children).toBe('7 Following');
  });

  it('renders the empty state when the member has no profiles row yet', async () => {
    const d = createProfileDouble({ email: 'newbie@example.org', tables: {} });
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('screen-my-profile')).toBeTruthy());
    // Web fallback: the email prefix as the display name.
    expect(screen.getByTestId('profile-display-name').props.children).toBe('newbie');
    await waitFor(() => expect(screen.getByTestId('profile-posts-empty')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('profile-vitana-index-empty')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-tabs-about'));
    expect(screen.getByTestId('profile-about-bio').props.children).toBe('Add a bio...');
    await waitFor(() => expect(screen.getByTestId('profile-milestones-empty')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-tabs-media'));
    await waitFor(() => expect(screen.getByTestId('profile-gallery-empty')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-tabs-groups'));
    await waitFor(() => expect(screen.getByTestId('profile-groups-empty')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-groups-discover'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/groups?discover=true');
  });

  it('renders the error state when the profile read fails, and retries', async () => {
    const d = createProfileDouble({ failTables: ['profiles'] });
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('my-profile-error')).toBeTruthy());
    expect(screen.getByText('Unable to load profile')).toBeTruthy();
    const before = d.reads.filter((t) => t === 'profiles').length;
    fireEvent.press(screen.getByTestId('my-profile-retry'));
    await waitFor(() => expect(d.reads.filter((t) => t === 'profiles').length).toBeGreaterThan(before));
  });
});

describe('MyProfileScreen — segments and tabs', () => {
  it('opens on the segment the card param names and persists a switch (web ?card=)', async () => {
    routeParams.current = { card: 'account' };
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('profile-account-card')).toBeTruthy());
    expect(screen.getByText('ana@example.org')).toBeTruthy();
    fireEvent.press(screen.getByTestId('profile-card-switch-back'));
    expect(screen.getByTestId('profile-social-card')).toBeTruthy();
    expect(router.setParams).toHaveBeenLastCalledWith({ card: 'back' });
    fireEvent.press(screen.getByTestId('profile-card-switch-front'));
    expect(router.setParams).toHaveBeenLastCalledWith({ card: undefined });
  });

  it('Business hides the stats + tabs and lists my recommendations from the gateway', async () => {
    routeParams.current = { card: 'business' };
    const d = loaded();
    const r = renderProfile(<MyProfileScreen />, {
      client: d.client,
      gateway: { '/discover/my-recommendations': { items: [{ id: 'r-1', product_id: 'pr-9', product_title: 'Magnesium', click_count: 4, conversion_count: 1 }] } },
    });
    await waitFor(() => expect(screen.getByTestId('profile-business-item-r-1')).toBeTruthy());
    expect(screen.queryByTestId('profile-tabs')).toBeNull();
    expect(r.gatewayCalls).toEqual(['/discover/my-recommendations']);
    fireEvent.press(screen.getByTestId('profile-business-item-r-1'));
    expect(router.navigate).toHaveBeenCalledWith('/discover/product/pr-9');
  });

  it('shows the about card, milestones, gallery and groups', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('screen-my-profile')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-tabs-about'));
    expect(screen.getByTestId('profile-about-bio').props.children).toBe('Salsa every Friday.');
    await waitFor(() => expect(screen.getByTestId('profile-milestone-m-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-tabs-media'));
    await waitFor(() => expect(screen.getByTestId('profile-photo-ph-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-tabs-groups'));
    await waitFor(() => expect(screen.getByTestId('profile-group-g-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-group-g-1'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/groups/g-1');
  });
});

describe('MyProfileScreen — edit sheets build the request and fire nothing', () => {
  it('Identity sheet: save builds the web IdentityDrawer UPDATE on the own row', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('profile-edit-identity')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-edit-identity'));
    await waitFor(() => expect(screen.getByTestId('identity-display-name', hidden).props.value).toBe('Ana Belić'));
    fireEvent.changeText(screen.getByTestId('identity-display-name', hidden), 'Ana Nova');
    fireEvent.changeText(screen.getByTestId('identity-handle', hidden), 'ananova');
    await act(async () => {
      fireEvent.press(screen.getByTestId('identity-sheet-save', hidden));
    });
    await waitFor(() => expect(d.writes).toHaveLength(1));
    expect(d.writes[0]).toEqual({
      table: 'profiles',
      values: {
        display_name: 'Ana Nova',
        handle: 'ananova',
        avatar_url: '',
        avatar_offset_x: 50,
        avatar_offset_y: 50,
        longevity_archetype: 'The Mindful Mover',
        updated_at: expect.any(String),
      },
      filters: [['user_id', 'u-1']],
    });
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toContain('profileEditor.identity.identityUpdated'));
  });

  it('Identity sheet: an empty display name is refused and nothing is built', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('profile-edit-identity')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-edit-identity'));
    await waitFor(() => expect(screen.getByTestId('identity-display-name', hidden).props.value).toBe('Ana Belić'));
    fireEvent.changeText(screen.getByTestId('identity-display-name', hidden), '   ');
    fireEvent.press(screen.getByTestId('identity-sheet-save', hidden));
    expect(d.writes).toEqual([]);
    expect(__toastsForTests().map((x) => x.descKey)).toContain('toasts.profile.displayNameRequired');
  });

  it('About sheet (from the About tab): save builds bio + location and carries links/languages', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('screen-my-profile')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-tabs-about'));
    fireEvent.press(screen.getByTestId('profile-about-card'));
    await waitFor(() => expect(screen.getByTestId('about-bio', hidden).props.value).toBe('Salsa every Friday.'));
    fireEvent.changeText(screen.getByTestId('about-bio', hidden), 'Tango too.');
    fireEvent.changeText(screen.getByTestId('about-location', hidden), 'Hamburg');
    await act(async () => {
      fireEvent.press(screen.getByTestId('about-sheet-save', hidden));
    });
    await waitFor(() => expect(d.writes).toHaveLength(1));
    expect(d.writes[0]).toEqual({
      table: 'profiles',
      values: { bio: 'Tango too.', location: 'Hamburg', links: profileRow.links, languages: profileRow.languages, updated_at: expect.any(String) },
      filters: [['user_id', 'u-1']],
    });
  });

  it('Account sheet: save maps fields to columns, empty → null, composes display_name', async () => {
    routeParams.current = { card: 'account' };
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('profile-edit-account')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-edit-account'));
    await waitFor(() => expect(screen.getByTestId('account-first-name', hidden).props.value).toBe('Ana'));
    fireEvent.changeText(screen.getByTestId('account-city', hidden), 'Munich');
    await act(async () => {
      fireEvent.press(screen.getByTestId('account-sheet-save', hidden));
    });
    await waitFor(() => expect(d.writes).toHaveLength(1));
    expect(d.writes[0]).toEqual({
      table: 'profiles',
      values: { first_name: 'Ana', last_name: 'Belić', phone: null, country: 'DE', city: 'Munich', display_name: 'Ana Belić', updated_at: expect.any(String) },
      filters: [['user_id', 'u-1']],
    });
  });

  it('Account card: tapping a tier badge builds one account_visibility UPDATE (next tier)', async () => {
    routeParams.current = { card: 'account' };
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('account-tier-city')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('account-tier-city'));
    });
    await waitFor(() => expect(d.writes).toHaveLength(1));
    // Stored city=public → cycles to private; the full merged map is written.
    expect(d.writes[0].values.account_visibility.city).toBe('private');
    expect(d.writes[0].values.account_visibility.country).toBe('connections');
    expect(d.writes[0].filters).toEqual([['user_id', 'u-1']]);
  });

  it('a failed save shows the save-failed toast (the write was built, never sent)', async () => {
    const d = loaded({}, { failWrites: true });
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('profile-edit-identity')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-edit-identity'));
    await waitFor(() => expect(screen.getByTestId('identity-display-name', hidden).props.value).toBe('Ana Belić'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('identity-sheet-save', hidden));
    });
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toContain('profileEditor.saveFailed'));
    expect(d.writes).toHaveLength(1);
  });

  it('Showcase Manage opens the highlights sheet', async () => {
    const d = loaded();
    renderProfile(<MyProfileScreen />, { client: d.client });
    await waitFor(() => expect(screen.getByTestId('profile-showcase-manage')).toBeTruthy());
    fireEvent.press(screen.getByTestId('profile-showcase-manage'));
    expect(screen.getByTestId('showcase-sheet-close', hidden)).toBeTruthy();
  });
});
