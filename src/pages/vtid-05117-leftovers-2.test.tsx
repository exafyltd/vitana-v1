/**
 * VTID-05117 (part C) — the remaining legacy routes on the Spotlight contract.
 *
 * Proves, without any network (Supabase, auth, the data hooks and the
 * Spotlight switch are mocked; nothing signs in, nothing is written):
 *  - flag off (useSpotlightEnabled() = false): each page renders today's tree,
 *    no [data-archetype];
 *  - flag on: each page renders <ScreenFrame> with its manifest archetype, and
 *    the `detail` screens show exactly one spotlight VCard;
 *  - /home/compose, /home/comments and /home/notif render the News page, so the
 *    manifest gives them the `focus-feed` archetype of /home.
 */
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

let spotlightOn = false;
let signedIn = true;

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/StandardHeader', () => ({ default: (p: { title: string }) => <header>{p.title}</header> }));
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string) => k,
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
// Radix Checkbox (DevLogin) measures itself; jsdom has no ResizeObserver.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', NoopObserver);
vi.mock('@/context/AuthProvider', () => ({
  useAuth: () => ({ user: signedIn ? { id: 'u1' } : null, loading: false }),
}));

const post = {
  id: 'p1',
  user_id: 'author-1',
  content: 'Morning walk\nTen thousand steps.',
  image_url: null,
  video_url: null,
  likes_count: 3,
  comments_count: 1,
  created_at: '2026-10-01T10:00:00Z',
  mentions: [],
};
let postRow: typeof post | null = post;
const chain = (table: string) => {
  const q: Record<string, unknown> = {};
  q.select = () => q;
  q.eq = () => q;
  q.maybeSingle = () =>
    Promise.resolve({
      data: table === 'profile_posts' ? postRow : { display_name: 'Ana', avatar_url: null },
      error: null,
    });
  return q;
};
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => chain(table),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));
vi.mock('@/hooks/useFeedPostInteractions', () => ({ useFeedPostInteractions: () => ({ isLiked: false, toggleLike: vi.fn() }) }));
vi.mock('@/components/home/NewsPostModerationMenu', () => ({ NewsPostModerationMenu: () => null }));
vi.mock('@/components/home/CommunityPostCard', () => ({ CommunityPostCard: () => <div data-testid="community-post-card" /> }));
vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => <span /> }));
vi.mock('@/components/media/FeedMedia', () => ({ FeedMedia: () => null }));

const matches = {
  data: [{ user_id: 'm1', display_name: 'Mila', avatar_url: null, match_reason: null, location: 'Wien', compatibility_score: 87 }] as unknown[],
  isLoading: false,
  isError: false,
};
vi.mock('@/hooks/useRealMatches', () => ({ useRealMatches: () => ({ ...matches, refetch: vi.fn() }) }));
vi.mock('@/hooks/useMarkMatchesViewed', () => ({ useMarkMatchesViewed: () => undefined }));
vi.mock('@/lib/matchReason', () => ({ localizeMatchReason: () => '' }));

const setFieldVisibility = vi.fn(() => Promise.resolve());
vi.mock('@/context/ProfileProvider', () => ({
  useProfile: () => ({ profile: { account: { visibility: {} } }, refreshProfile: vi.fn(), setFieldVisibility }),
}));

const game = {
  id: 'g1',
  name: 'Maxina Summer Game',
  description: 'Post, collect likes, win.',
  hero_image_url: null,
  points_registration: 1,
};
let gamePhase: 'pre' | 'live' | 'ended' = 'live';
vi.mock('@/hooks/useEventGame', () => ({
  useEventGame: () => ({ data: game, isLoading: false }),
  useEventGamePhase: () => gamePhase,
  useEventGameFeatureFlag: () => ({ data: true, isLoading: false }),
  useEventGameJoin: () => ({ isParticipant: false, join: { isPending: false, mutateAsync: vi.fn() } }),
}));
vi.mock('@/components/event-game/EventGameCelebration', () => ({ EventGameCelebration: () => null }));
vi.mock('@/components/event-game/EventGameLeaderboardView', () => ({ EventGameLeaderboardView: () => null }));

import PostDetail from './PostDetail';
import MatchesPage from './MatchesPage';
import PrivacySettings from './PrivacySettings';
import DevLogin from './dev/DevLogin';
import EventGamePublicLanding from './EventGamePublicLanding';

function at(url: string, routePath: string, ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={routePath} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  spotlightOn = false;
  signedIn = true;
  postRow = post;
  gamePhase = 'live';
  matches.data = [{ user_id: 'm1', display_name: 'Mila', avatar_url: null, match_reason: null, location: 'Wien', compatibility_score: 87 }];
  matches.isLoading = false;
});

describe("VTID-05117 part C — flag off keeps today's trees", () => {
  it.each([
    ['/post/post/p1', '/post/:source/:id', () => <PostDetail />],
    ['/me/matches', '/me/matches', () => <MatchesPage />],
    ['/profile/me/privacy', '/profile/me/privacy', () => <PrivacySettings />],
    ['/dev/login', '/dev/login', () => <DevLogin />],
    ['/e/game/summer', '/e/game/:slug', () => <EventGamePublicLanding />],
  ])('%s renders no [data-archetype]', async (url, routePath, Page) => {
    // A signed-in visitor is sent on from the dev sign-in page.
    signedIn = url !== '/dev/login';
    const { container } = at(url, routePath, <Page />);
    if (!signedIn) expect(container.querySelector('form input[type="email"]')).not.toBeNull();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('[data-spotlight-layout]')).toBeNull();
  });

  it('/me/matches keeps its legacy list (same test ids, no VCard)', () => {
    const { container } = at('/me/matches', '/me/matches', <MatchesPage />);
    expect(screen.getByTestId('matches-list')).toBeInTheDocument();
    expect(container.querySelector('[data-vcard-size]')).toBeNull();
  });
});

describe('VTID-05117 part C — flag on composes the manifest archetype', () => {
  beforeEach(() => {
    spotlightOn = true;
  });

  it('/post/:source/:id is a `detail` screen: the post is the one spotlight card', async () => {
    const { container } = at('/post/post/p1', '/post/:source/:id', <PostDetail />);
    expect(container.querySelector('[data-archetype="detail"] [data-archetype-skeleton]')).not.toBeNull();
    await screen.findByText('Morning walk');
    const frame = container.querySelector('[data-archetype="detail"]') as HTMLElement;
    expect(frame.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(frame.querySelector('[data-stage-kind="post"]')).not.toBeNull();
    expect(screen.getByTestId('app-layout')).toContainElement(frame);
  });

  it('/post/:source/:id without a post: one honest text-only spotlight with a way back', async () => {
    postRow = null;
    const { container } = at('/post/post/missing', '/post/:source/:id', <PostDetail />);
    await screen.findByText('screens.postDetail.notFound');
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(container.querySelector('[data-post-not-found]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'spotlightMember.post.backToFeed' })).toBeInTheDocument();
  });

  it('/me/matches is a `collection` screen of row cards (real matches only)', () => {
    const { container } = at('/me/matches', '/me/matches', <MatchesPage />);
    const frame = container.querySelector('[data-archetype="collection"]') as HTMLElement;
    expect(frame).not.toBeNull();
    expect(frame.querySelectorAll('[data-vcard-size="row"]')).toHaveLength(1);
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(frame.querySelector('[data-vcard-size="spotlight"]')).toBeNull();
  });

  it('/me/matches: skeleton while loading, honest empty state when there is none', () => {
    matches.isLoading = true;
    const loading = at('/me/matches', '/me/matches', <MatchesPage />);
    expect(loading.container.querySelector('[data-member-skeleton]')).not.toBeNull();
    loading.unmount();
    matches.isLoading = false;
    matches.data = [];
    const empty = at('/me/matches', '/me/matches', <MatchesPage />);
    expect(empty.container.querySelector('[data-member-empty]')).not.toBeNull();
  });

  it('/profile/me/privacy is a `form` screen with the same visibility controls', () => {
    const { container } = at('/profile/me/privacy', '/profile/me/privacy', <PrivacySettings />);
    const frame = container.querySelector('[data-archetype="form"]') as HTMLElement;
    expect(frame).not.toBeNull();
    expect(frame.querySelector('[data-spotlight-layout]')?.getAttribute('data-width')).toBe('form');
    expect(frame.querySelectorAll('[data-member-panel]')).toHaveLength(5);
    // Same rows as the legacy screen: 5 sections + 9 sub-fields + 1 locked row.
    expect(frame.querySelectorAll('[data-privacy-sections] button')).toHaveLength(15);
  });

  it('/dev/login is a `workspace` screen (operator tier) around the same sign-in form', () => {
    signedIn = false;
    const { container } = at('/dev/login', '/dev/login', <DevLogin />);
    const frame = container.querySelector('[data-archetype="workspace"]') as HTMLElement;
    expect(frame).not.toBeNull();
    expect(frame.querySelector('form input[type="email"]')).not.toBeNull();
  });

  it('/e/game/:slug is a `detail` screen: the game is the one spotlight card with Join + Leaderboard', () => {
    const { container } = at('/e/game/summer', '/e/game/:slug', <EventGamePublicLanding />);
    const frame = container.querySelector('[data-archetype="detail"]') as HTMLElement;
    expect(frame.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Maxina Summer Game');
    expect(screen.getByRole('button', { name: /eventGame.landing.ctaJoin/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eventGame.landing.ctaLeaderboard/ })).toBeInTheDocument();
  });

  it('/e/game/:slug after the game: one spotlight card with the final results', () => {
    gamePhase = 'ended';
    const { container } = at('/e/game/summer', '/e/game/:slug', <EventGamePublicLanding />);
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(screen.getByText('eventGame.landing.notLiveEndedTitle')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eventGame.landing.ctaJoin/ })).toBeNull();
  });
});

describe('VTID-05117 part C — manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/design/screen-manifest.json'), 'utf8')).screens as {
    path: string;
    archetype: string;
    status: string;
  }[];
  const entry = (route: string) => manifest.find((e) => e.path === route);
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8');

  it.each(['/home/compose', '/home/comments', '/home/notif'])('%s renders the News page, so it is a migrated `focus-feed` like /home', (route) => {
    expect(entry('/home')?.archetype).toBe('focus-feed');
    expect(entry(route)).toMatchObject({ archetype: 'focus-feed', status: 'migrated' });
    const block = app.slice(app.indexOf(`<Route path="${route}"`), app.indexOf(`<Route path="${route}"`) + 300);
    expect(block).toContain('<Home />');
  });

  it.each([
    ['/post/:source/:id', 'detail', 'src/pages/PostDetail.tsx'],
    ['/me/matches', 'collection', 'src/pages/MatchesPage.tsx'],
    ['/profile/me/privacy', 'form', 'src/pages/PrivacySettings.tsx'],
    ['/dev/login', 'workspace', 'src/pages/dev/DevLogin.tsx'],
    ['/e/game/:slug', 'detail', 'src/pages/EventGamePublicLanding.tsx'],
    ['/discover/deals-offers', 'storefront', 'src/pages/discover/DealsOffers.tsx'],
  ])('%s is migrated as `%s` and its page composes that archetype behind the switch', (route, archetype, file) => {
    expect(entry(route)).toMatchObject({ archetype, status: 'migrated' });
    const src = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
    expect(src).toContain('useSpotlightEnabled()');
    expect(src).toContain(`archetype="${archetype}"`);
  });

  it('/professional/patients renders the shared placeholder, already framed as `workspace`', () => {
    expect(entry('/professional/patients')).toMatchObject({ archetype: 'workspace', status: 'migrated' });
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/professional/Patients.tsx'), 'utf8');
    expect(src).toContain('<ComingSoonPlaceholder');
  });
});
