/**
 * VTID-05430 (Native Wave 2, public-profile lane) — fixture / fake-client unit
 * tests for `/u/:identifier` (PROFILE.PUBLIC, PROFILE.WITH_MATCH) and the legacy
 * `/profile/:id` redirect. No network (the no-network guard is imported first;
 * the Supabase client is the in-memory fake, every call is a read and is
 * recorded). Covers: loaded / not-found / load error, the alias redirect, the
 * `?match_intent=` variant, the shell choice (PublicShell signed out,
 * MobileAppShell signed in), the signed-out landing CTAs, the member tabs, and
 * the legacy redirect signed out and signed in. React 19: `ReactElement`.
 */
import '../helpers/no-network';
import './mocks';
import type { ReactElement, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { mockParams, mockRedirects, router } from './mocks';
import { fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { __setSupabaseForTests } from '../../src/auth/client';
import { UIProvider } from '../../src/ports/ui';
import { PublicProfileScreen } from '../../src/screens/public-profile/PublicProfileScreen';
import { LegacyProfileRedirectScreen } from '../../src/screens/public-profile/LegacyProfileRedirectScreen';
import { createProfileClient, type FakeOptions } from './fake-client';
import { dbProfile, groupMemberships, groups, milestones, photos, posts, PROFILE_ID, VIEWER_ID } from './fixtures';

afterAll(() => __setSupabaseForTests(null));

afterEach(() => {
  mockParams.current = {};
  mockRedirects.length = 0;
  jest.clearAllMocks();
});

const viewerSession = fakeSession(VIEWER_ID, { user: { id: VIEWER_ID, app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } });

const fullTables = {
  profile_milestones: milestones,
  profile_gallery: photos,
  profile_posts: posts,
  global_community_group_members: groupMemberships,
  global_community_groups: groups,
};

function found(): FakeOptions['rpc'] {
  return {
    get_user_profile_by_identifier: () => ({ data: [dbProfile], error: null }),
    get_public_vitana_index: () => ({ data: [{ score_total: 742 }], error: null }),
  };
}

function renderWith(ui: ReactElement, opts: FakeOptions) {
  const fake = createProfileClient(opts);
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction="ltr">
      {children}
    </UIProvider>
  );
  const utils = render(<Wrapped>{ui}</Wrapped>, { wrapper: makeWrapper({ client: fake.client, language: 'de-DE' }) });
  return { ...utils, fake };
}

describe('PublicProfileScreen — signed out (PublicShell + landing)', () => {
  it('loads the profile by identifier and renders the landing inside the public shell', async () => {
    mockParams.current = { identifier: '@lenatest' };
    const { fake } = renderWith(<PublicProfileScreen />, { rpc: found(), tables: fullTables });
    expect(await screen.findByTestId('public-profile-landing')).toBeTruthy();
    expect(screen.getByTestId('public-shell')).toBeTruthy();
    expect(screen.queryByTestId('mobile-app-shell')).toBeNull();
    expect(screen.getByText('Lena Test')).toBeTruthy();
    expect(screen.getByText('@lenatest')).toBeTruthy();
    expect(screen.getByText('VITANA 742')).toBeTruthy();
    expect(screen.getByText('Berlin')).toBeTruthy();
    // The leading @ is stripped before the lookup (web `cleanId`).
    expect(fake.calls.find((c) => c.fn === 'rpc.get_user_profile_by_identifier')?.args[0]).toEqual({ identifier: 'lenatest' });
    expect(fake.calls.find((c) => c.fn === 'rpc.get_public_vitana_index')?.args[0]).toEqual({ p_user_id: PROFILE_ID });
  });

  it('shows the stats strip, the top milestones, the photo preview and the social links', async () => {
    mockParams.current = { identifier: 'lenatest' };
    renderWith(<PublicProfileScreen />, { rpc: found(), tables: fullTables });
    await screen.findByTestId('public-profile-landing');
    await screen.findByTestId('landing-milestone-m-1');
    expect(screen.getByTestId('landing-milestone-m-2')).toBeTruthy();
    expect(screen.getByText('Erster Marathon')).toBeTruthy();
    expect(screen.getByTestId('landing-photo-p-1')).toBeTruthy();
    expect(screen.getByTestId('landing-photo-p-2')).toBeTruthy();
    expect(screen.getByTestId('landing-stat-posts')).toBeTruthy();
    expect(screen.getByTestId('landing-social-Instagram')).toBeTruthy();
    expect(screen.getByTestId('landing-social-TikTok')).toBeTruthy();
    expect(screen.queryByTestId('landing-social-LinkedIn')).toBeNull();
    expect(screen.getByText(/Lebensmeilensteine/)).toBeTruthy();
    expect(screen.getByText(/Fotogalerie/)).toBeTruthy();
  });

  it('Follow, Message and View Full Profile send the visitor to the Maxina sign-in with the profile as redirect', async () => {
    mockParams.current = { identifier: 'lenatest' };
    renderWith(<PublicProfileScreen />, { rpc: found(), tables: fullTables });
    await screen.findByTestId('public-profile-landing');
    for (const id of ['landing-follow', 'landing-message', 'landing-view-full']) {
      fireEvent.press(screen.getByTestId(id));
    }
    expect(router.navigate).toHaveBeenCalledTimes(3);
    for (const call of (router.navigate as jest.Mock).mock.calls) expect(call[0]).toBe('/maxina?redirectTo=/u/lenatest');
  });

  it('renders "user not found" when no profile matches and no alias exists; Return to Home goes to /', async () => {
    mockParams.current = { identifier: 'nobody' };
    const { fake } = renderWith(<PublicProfileScreen />, { rpc: { get_user_profile_by_identifier: () => ({ data: [], error: null }) } });
    expect(await screen.findByTestId('public-profile-not-found')).toBeTruthy();
    expect(screen.getByTestId('public-shell')).toBeTruthy();
    expect(screen.getByText('Benutzer nicht gefunden')).toBeTruthy();
    // The alias table was consulted with the lower-cased handle (VTID-01967).
    const alias = fake.calls.find((c) => c.fn === 'from.handle_aliases.select');
    expect(alias?.args[0]).toEqual([['eq', 'old_handle', 'nobody']]);
    fireEvent.press(screen.getByTestId('public-profile-return-home'));
    expect(router.navigate).toHaveBeenCalledWith('/');
  });

  it('renders the not-found state with the load error when the lookup fails', async () => {
    mockParams.current = { identifier: 'lenatest' };
    renderWith(<PublicProfileScreen />, { rpc: { get_user_profile_by_identifier: () => ({ data: null, error: { message: 'boom' } }) } });
    expect(await screen.findByTestId('public-profile-not-found')).toBeTruthy();
    expect(screen.getByTestId('public-profile-error')).toBeTruthy();
  });

  it('follows a legacy handle alias to the canonical /u/<vitana_id> (replace)', async () => {
    mockParams.current = { identifier: 'OldHandle' };
    renderWith(<PublicProfileScreen />, {
      rpc: { get_user_profile_by_identifier: () => ({ data: [], error: null }) },
      tables: {
        handle_aliases: [{ old_handle: 'oldhandle', user_id: PROFILE_ID }],
        profiles: [{ user_id: PROFILE_ID, handle: 'lenatest', vitana_id: 'lena42' }],
      },
    });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/u/lena42'));
  });

  it('keeps the profile when the secondary milestones / gallery reads fail', async () => {
    mockParams.current = { identifier: 'lenatest' };
    renderWith(<PublicProfileScreen />, { rpc: found(), failTables: ['profile_milestones', 'profile_gallery'] });
    expect(await screen.findByTestId('public-profile-landing')).toBeTruthy();
    expect(screen.getByText('Lena Test')).toBeTruthy();
    expect(screen.queryByTestId('landing-milestone-m-1')).toBeNull();
  });
});

describe('PublicProfileScreen — signed in (MobileAppShell + member view)', () => {
  it('renders the member profile inside the member shell with the Posts tab first', async () => {
    mockParams.current = { identifier: 'lenatest' };
    renderWith(<PublicProfileScreen />, { session: viewerSession, rpc: found(), tables: fullTables });
    expect(await screen.findByTestId('public-profile-member')).toBeTruthy();
    expect(screen.getByTestId('mobile-app-shell')).toBeTruthy();
    expect(screen.queryByTestId('public-shell')).toBeNull();
    expect(screen.queryByTestId('public-profile-landing')).toBeNull();
    expect(screen.getByText('Lena Test')).toBeTruthy();
    expect(screen.getByTestId('profile-tab-posts').props.accessibilityState).toEqual({ selected: true });
    expect(await screen.findByTestId('profile-post-post-1')).toBeTruthy();
    expect(screen.getByText('Heute 10 km gelaufen.')).toBeTruthy();
  });

  it('switches to About (bio + milestones), Media (photos) and Groups', async () => {
    mockParams.current = { identifier: 'lenatest' };
    renderWith(<PublicProfileScreen />, { session: viewerSession, rpc: found(), tables: fullTables });
    await screen.findByTestId('public-profile-member');

    fireEvent.press(screen.getByTestId('profile-tab-about'));
    expect(screen.getByTestId('profile-tab-about').props.accessibilityState).toEqual({ selected: true });
    expect(await screen.findByTestId('profile-milestone-m-1')).toBeTruthy();
    expect(screen.getAllByText('Bewegung, Schlaf und gutes Essen.').length).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId('profile-tab-media'));
    expect(await screen.findByTestId('profile-photo-p-1')).toBeTruthy();

    fireEvent.press(screen.getByTestId('profile-tab-groups'));
    expect(await screen.findByTestId('profile-group-g-1')).toBeTruthy();
    fireEvent.press(screen.getByTestId('profile-group-g-1'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/groups/g-1');
  });

  it('PROFILE.WITH_MATCH: ?match_intent= opens the same profile (the web page reads no highlight from it)', async () => {
    mockParams.current = { identifier: 'lenatest', match_intent: 'intent-9' };
    const { fake } = renderWith(<PublicProfileScreen />, { session: viewerSession, rpc: found(), tables: fullTables });
    expect(await screen.findByTestId('public-profile-member')).toBeTruthy();
    expect(screen.getByText('Lena Test')).toBeTruthy();
    expect(fake.calls.find((c) => c.fn === 'rpc.get_user_profile_by_identifier')?.args[0]).toEqual({ identifier: 'lenatest' });
  });

  it('a shared link (?utm_source=profile) shows the landing, still inside the member shell', async () => {
    mockParams.current = { identifier: 'lenatest', utm_source: 'profile' };
    renderWith(<PublicProfileScreen />, { session: viewerSession, rpc: found(), tables: fullTables });
    expect(await screen.findByTestId('public-profile-landing')).toBeTruthy();
    expect(screen.getByTestId('mobile-app-shell')).toBeTruthy();
  });

  it('renders "user not found" in the member shell', async () => {
    mockParams.current = { identifier: 'nobody' };
    renderWith(<PublicProfileScreen />, { session: viewerSession, rpc: { get_user_profile_by_identifier: () => ({ data: [], error: null }) } });
    expect(await screen.findByTestId('public-profile-not-found')).toBeTruthy();
    expect(screen.getByTestId('mobile-app-shell')).toBeTruthy();
  });

  it('issues reads only — no insert, update, upsert or delete on any table', async () => {
    mockParams.current = { identifier: 'lenatest' };
    const { fake } = renderWith(<PublicProfileScreen />, { session: viewerSession, rpc: found(), tables: fullTables });
    await screen.findByTestId('profile-post-post-1');
    expect(fake.calls.every((c) => c.fn.startsWith('rpc.') || c.fn.endsWith('.select'))).toBe(true);
  });
});

describe('LegacyProfileRedirectScreen — /profile/:id', () => {
  it.each([
    [undefined, '1', '/u/sarahwellness'],
    [undefined, PROFILE_ID, `/u/${PROFILE_ID}`],
    [undefined, '@some_handle', '/u/some_handle'],
    [viewerSession, '3', '/u/maxina'],
    [viewerSession, 'clean-handle', '/u/clean-handle'],
  ])('session %#: /profile/%s redirects to %s', async (session, id, target) => {
    mockParams.current = { id };
    renderWith(<LegacyProfileRedirectScreen />, { session });
    await waitFor(() => expect(mockRedirects).toEqual([target]));
  });

  it.each([[undefined], [viewerSession]])('session %#: an invalid id renders not-found and never redirects', async (session) => {
    mockParams.current = { id: 'not a handle!' };
    renderWith(<LegacyProfileRedirectScreen />, { session });
    expect(await screen.findByTestId('not-found')).toBeTruthy();
    expect(mockRedirects).toEqual([]);
  });
});

describe('route files', () => {
  it('/u/[identifier] and /profile/[id] live in the (public) group and render the lane screens', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const profileRoute = require('../../app/(public)/u/[identifier]').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const legacyRoute = require('../../app/(public)/profile/[id]').default;
    expect(profileRoute().type).toBe(PublicProfileScreen);
    expect(legacyRoute().type).toBe(LegacyProfileRedirectScreen);
  });
});
