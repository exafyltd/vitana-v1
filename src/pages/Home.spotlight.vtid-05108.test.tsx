/**
 * VTID-05108 — News focus feed on desktop (Spotlight). Renders the real
 * HomeContent with the real ScreenFrame / SpotlightLayout / VCard / feed
 * composition; data hooks and leaf widgets are mocked (no network).
 *
 *  - flag off (desktop) and phones: the legacy News screen, unchanged;
 *  - flag on: ScreenFrame focus-feed, exactly ONE spotlight card, the other
 *    stage items are standard cards, info cards (match, new member, feature)
 *    live in the rail, never in the stage;
 *  - J/K and ↑/↓ move focus; neighbours are dimmed on their media only, text
 *    keeps full contrast;
 *  - rail blocks are built from real data and hide when empty.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedItem } from '@/lib/news-feed-ranker';

const h = vi.hoisted(() => ({
  mobile: false,
  tenantFlag: false,
  items: [] as unknown[],
  events: [] as unknown[],
  index: null as null | { total: number; trend: 'up' | 'down' | 'stable'; history: { score: number }[] },
  journeySessions: 0,
  loading: false,
  track: vi.fn(),
}));

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' }, loading: false }) }));
vi.mock('@/hooks/useTenantFeatureFlag', () => ({ useTenantFeatureFlag: () => h.tenantFlag }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => h.mobile }));
vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${Object.values(p).join(' ')}` : k),
  useI18nLocale: () => 'de',
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/lib/product-analytics/client', () => ({ track: h.track }));
vi.mock('@/lib/feature-flags', () => ({ isFeedV2Enabled: () => true }));
vi.mock('@/lib/locale-format', () => ({
  formatDistanceToNow: () => '',
  fmtTime: () => '18:00',
  fmtNumber: (n: number) => String(n),
}));
vi.mock('@/lib/news-images', () => ({ getNewsImage: () => 'fallback.jpg', getArticlePillar: () => null }));
vi.mock('@/lib/matchReason', () => ({ matchCategoryLabel: () => 'Wellness' }));
vi.mock('framer-motion', async (orig) => ({ ...(await orig<typeof import('framer-motion')>()), useReducedMotion: () => true }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/use-autopilot', () => ({ useAutopilot: () => ({ pendingCount: 0 }) }));
vi.mock('@/components/StandardHeader', () => ({
  default: (p: { title: string; density?: string }) => <header data-testid="std-header" data-density={p.density ?? 'default'}>{p.title}</header>,
}));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: (p: { children?: React.ReactNode; trailingElement?: React.ReactNode }) => (
    <div data-testid="utility">
      {p.children}
      {p.trailingElement}
    </div>
  ),
}));
vi.mock('@/components/ui/expandable-search-button', () => ({ ExpandableSearchButton: () => null }));
vi.mock('@/components/ui/MobileModePill', () => ({ MobileModePill: () => null }));
vi.mock('@/components/mobile/MobileActionChips', () => ({ VitanaIndexChip: () => null, AutopilotChip: () => null }));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => null }));
vi.mock('@/components/CreateContentPopup', () => ({ CreateContentPopup: () => null }));
vi.mock('@/components/profile/mobile/MobileCreatePostSheet', () => ({ MobileCreatePostSheet: () => null }));
vi.mock('@/components/AutopilotPopup', () => ({ AutopilotPopup: () => null }));
vi.mock('@/components/proactive/DidYouKnowCard', () => ({ DidYouKnowCard: () => <div data-testid="legacy-dyk" /> }));
vi.mock('@/components/event-game/EventGameFeedBadge', () => ({ EventGameFeedBadge: () => <div data-testid="legacy-game-badge" /> }));
vi.mock('@/components/home/VitanaIndexCard', () => ({ VitanaIndexCard: () => <div data-testid="legacy-card" /> }));
vi.mock('@/components/home/LongevityJourneyCard', () => ({ LongevityJourneyCard: () => <div data-testid="legacy-card" /> }));
vi.mock('@/components/home/InviteFriendCard', () => ({ InviteFriendCard: () => <div data-testid="legacy-card" /> }));
vi.mock('@/components/home/NewsFeedItemCard', () => ({ NewsFeedItemCard: () => <div data-testid="legacy-card" /> }));
vi.mock('@/components/home/NewMemberCard', () => ({ NewMemberCard: () => null }));
vi.mock('@/components/crossover/NewsArticleCard', () => ({ NewsArticleCard: () => null }));
vi.mock('@/hooks/useInviteFriendShare', () => ({ useInviteFriendShare: () => ({ shareInvite: vi.fn() }) }));
vi.mock('@/hooks/useNewsFeed', () => ({
  useLongevityNewsFeed: () => ({ data: undefined, fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false, isLoading: false, refetch: vi.fn() }),
  useCommunityNews: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useAllNewsFeed', () => ({
  useAllNewsFeed: () => ({ items: h.items, isLoading: h.loading, refetch: vi.fn(), fetchNextPage: vi.fn(), hasNextPage: false, isFetchingNextPage: false }),
}));
// Rail data sources
vi.mock('@/hooks/useCommunityEvents', () => ({ fetchCommunityEventsQueryFn: async () => h.events }));
vi.mock('@/hooks/useVitanaIndex', () => ({ useVitanaIndex: () => ({ index: h.index, isLoading: false }) }));
vi.mock('@/hooks/useGuidedJourneyProgress', () => ({
  useGuidedJourneyProgress: () => ({
    totalSessions: h.journeySessions,
    completedInOrder: 2,
    nextSession: h.journeySessions ? { session: 3 } : null,
    completedToday: 0,
    dailyGoal: 1,
    loading: false,
  }),
}));
vi.mock('@/context/AudiobookPlayerProvider', () => ({ useAudiobookPlayer: () => null }));
vi.mock('@/hooks/useDidYouKnowTip', () => ({ useDidYouKnowTip: () => ({ tip: null, accept: vi.fn(), decline: vi.fn() }) }));
vi.mock('@/hooks/useEventGame', () => ({
  useEventGameFeatureFlag: () => ({ data: false }),
  useEventGame: () => ({ data: null }),
  useEventGamePhase: () => null,
  useEventGameJoin: () => ({ isParticipant: false }),
  useMyEventGameStanding: () => ({ data: null }),
}));
vi.mock('@/components/health/VitanaIndexSheet', () => ({ VITANA_INDEX_OPEN_EVENT: 'vitana:open-index' }));
// Post card internals
vi.mock('@/hooks/useFeedPostInteractions', () => ({ useFeedPostInteractions: () => ({ isLiked: false, toggleLike: vi.fn() }) }));
vi.mock('@/components/home/NewsPostModerationMenu', () => ({ NewsPostModerationMenu: () => null }));
vi.mock('@/components/media/FeedMedia', () => ({ FeedMedia: () => <div data-testid="feed-media" /> }));
vi.mock('@/components/home/CommunityPostCard', () => ({ CommunityPostCard: () => <div data-testid="post-sheet-card" /> }));
vi.mock('@/components/feed/MentionText', () => ({ renderMentions: (c: string) => c }));

import { HomeContent } from './Home';

const post = (n: number, image: string | null = null): FeedItem =>
  ({
    id: `post-${n}`, kind: 'post', published_at: '2026-10-12T08:00:00Z', source: 'post', post_id: `p${n}`, user_id: `author-${n}`,
    author_name: `Author ${n}`, author_avatar: null, content: `Post ${n} title\nPost ${n} body`, image_url: image, video_url: null,
    background_style: null, mentions: [], likes_count: 4, comments_count: 2, followed: false, tags: [],
  }) as FeedItem;
const article = (n: number): FeedItem =>
  ({ id: `article-${n}`, kind: 'article', published_at: '2026-10-12T07:00:00Z', source_name: 'Lab', title: `Article ${n}`, summary: 'Sum', image_url: null, link: null, tags: [] }) as FeedItem;
const match = { id: 'match-1', kind: 'match', published_at: '', user_id: 'm1', display_name: 'Jana K.', avatar_url: null, match_reason: null, compatibility_score: 81 } as FeedItem;
const member = { id: 'mem-1', kind: 'new_member', published_at: '', user_id: 'n1', display_name: 'Luka M.', avatar_url: null, bio: null } as FeedItem;
const feature = { id: 'feat-1', kind: 'feature_announcement', published_at: '', variant: 'brand-new-feature', feature_title: 'Voice journaling', description: 'Talk it out', deep_link: '/diary' } as FeedItem;

function renderHome(path = '/home') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <HomeContent />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const stageCards = () => Array.from(document.querySelectorAll<HTMLElement>('[data-spotlight-stage] [data-focus-item]'));

beforeEach(() => {
  h.mobile = false;
  h.tenantFlag = false;
  h.items = [post(1, 'p1.jpg'), article(1), match, feature, member, post(2), article(2), post(3)];
  h.events = [];
  h.index = null;
  h.journeySessions = 0;
  h.loading = false;
  try {
    localStorage.removeItem('vitana.spotlight');
  } catch {
    /* ignore */
  }
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('VTID-05108 News — flag off and phones keep the legacy screen', () => {
  it('desktop with the flag off renders the legacy grid, no ScreenFrame', () => {
    renderHome();
    expect(screen.getByTestId('feed-grid')).toBeTruthy();
    expect(document.querySelector('[data-archetype]')).toBeNull();
    expect(document.querySelector('[data-vcard-size]')).toBeNull();
    expect(screen.getByTestId('legacy-dyk')).toBeTruthy();
    expect(screen.getByTestId('legacy-game-badge')).toBeTruthy();
    expect(screen.getByTestId('std-header').dataset.density).toBe('default');
  });

  it('phones never get Spotlight, even with the tenant flag and the preview override on', () => {
    h.mobile = true;
    h.tenantFlag = true;
    renderHome('/home?spotlight=1');
    expect(document.querySelector('[data-archetype]')).toBeNull();
    expect(screen.getByTestId('legacy-dyk')).toBeTruthy();
  });
});

describe('VTID-05108 News focus feed (Spotlight on)', () => {
  it('composes the screen through ScreenFrame focus-feed with the compact header', () => {
    h.tenantFlag = true;
    renderHome();
    expect(document.querySelector('[data-archetype="focus-feed"]')).toBeTruthy();
    expect(screen.getByTestId('std-header').dataset.density).toBe('compact');
    expect(document.querySelector('[data-spotlight-rail]')).toBeTruthy();
    expect(screen.queryByTestId('feed-grid')).toBeNull();
  });

  it('the ?spotlight=1 preview override turns it on with the tenant flag off', () => {
    renderHome('/home?spotlight=1');
    expect(document.querySelector('[data-archetype="focus-feed"]')).toBeTruthy();
  });

  it('shows exactly one spotlight card (the lead); every other stage item is a standard card', () => {
    h.tenantFlag = true;
    renderHome();
    const spot = document.querySelectorAll('[data-vcard-size="spotlight"]');
    expect(spot).toHaveLength(1);
    expect((spot[0] as HTMLElement).dataset.focusKey).toBe('post-1');
    const cards = stageCards();
    expect(cards.map((c) => c.dataset.focusKey)).toEqual(['post-1', 'article-1', 'post-2', 'article-2', 'post-3']);
    expect(cards.slice(1).every((c) => c.dataset.vcardSize === 'standard')).toBe(true);
  });

  it('info cards live in the rail, never in the stage; the legacy in-feed cards are not rendered', () => {
    h.tenantFlag = true;
    renderHome();
    const stage = document.querySelector('[data-spotlight-stage]') as HTMLElement;
    expect(within(stage).queryByText('Jana K.')).toBeNull();
    expect(within(stage).queryByText('Voice journaling')).toBeNull();
    const rail = document.querySelector('[data-spotlight-rail]') as HTMLElement;
    const people = rail.querySelector('[data-rail-block="people"]') as HTMLElement;
    expect(within(people).getByText('Jana K.')).toBeTruthy();
    expect(within(people).getByText('Luka M.')).toBeTruthy();
    expect(within(rail.querySelector('[data-rail-block="good-to-know"]') as HTMLElement).getByText('Voice journaling')).toBeTruthy();
    expect(screen.queryByTestId('legacy-card')).toBeNull();
    expect(screen.queryByTestId('legacy-dyk')).toBeNull();
    expect(screen.queryByTestId('legacy-game-badge')).toBeNull();
    // rail holds only compact / row cards (SR-08)
    const sizes = Array.from(rail.querySelectorAll<HTMLElement>('[data-vcard-size]')).map((c) => c.dataset.vcardSize);
    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.every((s) => s === 'compact' || s === 'row')).toBe(true);
  });

  it('Up next lists the three items after the focused card and follows the focus', () => {
    h.tenantFlag = true;
    renderHome();
    const upNext = () =>
      Array.from(document.querySelectorAll('[data-spotlight-rail] [data-rail-block="up-next"] [data-vcard-size]')).map((n) => n.textContent);
    expect(upNext()).toEqual([expect.stringContaining('Article 1'), expect.stringContaining('Post 2 title'), expect.stringContaining('Article 2')]);
    act(() => {
      fireEvent.keyDown(window, { key: 'j' });
    });
    expect(upNext()).toEqual([expect.stringContaining('Post 2 title'), expect.stringContaining('Article 2'), expect.stringContaining('Post 3 title')]);
  });

  it('J/K and ↑/↓ move the focus; neighbours are dimmed on their media only (text keeps full contrast)', () => {
    h.tenantFlag = true;
    renderHome();
    let cards = stageCards();
    expect(cards[0].hasAttribute('data-focused')).toBe(true);
    expect(cards[1].hasAttribute('data-dimmed')).toBe(true);

    act(() => {
      fireEvent.keyDown(window, { key: 'j' });
    });
    cards = stageCards();
    expect(cards[1].hasAttribute('data-focused')).toBe(true);
    expect(cards[0].hasAttribute('data-dimmed')).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();

    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    });
    expect(stageCards()[2].hasAttribute('data-focused')).toBe(true);
    act(() => {
      fireEvent.keyDown(window, { key: 'k' });
    });
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowUp' });
    });
    cards = stageCards();
    expect(cards[0].hasAttribute('data-focused')).toBe(true);

    const dimmed = cards[1];
    expect(dimmed.querySelector('[data-vcard-media]')?.className).toContain('opacity-60');
    expect(dimmed.className).not.toMatch(/opacity/);
  });

  it('typing in a field never moves the focus', () => {
    h.tenantFlag = true;
    renderHome();
    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => {
      fireEvent.keyDown(input, { key: 'j' });
    });
    expect(stageCards()[0].hasAttribute('data-focused')).toBe(true);
    input.remove();
  });

  it('choosing an Up next card focuses and scrolls to it', () => {
    h.tenantFlag = true;
    renderHome();
    const first = document.querySelector('[data-rail-block="up-next"] [data-vcard-size]') as HTMLElement;
    act(() => {
      fireEvent.click(first);
    });
    expect(stageCards()[1].hasAttribute('data-focused')).toBe(true);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('the comment count opens the full post card (comments thread) in a side sheet', async () => {
    h.tenantFlag = true;
    renderHome();
    const lead = stageCards()[0];
    fireEvent.click(within(lead).getByLabelText('spotlightFeed.post.openComments'));
    expect(await screen.findByTestId('post-sheet-card')).toBeTruthy();
  });

  it('rail blocks without real data render nothing (no empty headings, no invented numbers)', () => {
    h.tenantFlag = true;
    h.items = [post(1)];
    renderHome();
    const rail = document.querySelector('[data-spotlight-rail]') as HTMLElement;
    expect(rail.querySelector('[data-rail-block="up-next"]')).toBeNull();
    expect(rail.querySelector('[data-rail-block="today"]')).toBeNull();
    expect(rail.querySelector('[data-rail-block="journey"]')).toBeNull();
    expect(rail.querySelector('[data-rail-block="people"]')).toBeNull();
    // the invite card is always a real action, so "Good to know" stays
    expect(rail.querySelector('[data-rail-block="good-to-know"]')).toBeTruthy();
  });

  it('Today and Your journey show real data when there is some', async () => {
    h.tenantFlag = true;
    const later = new Date(Date.now() + 60 * 60 * 1000);
    const sameDay = later.getDate() === new Date().getDate() ? later : new Date();
    const tomorrow = new Date(Date.now() + 26 * 60 * 60 * 1000);
    h.events = [
      { id: 'e1', title: 'Yoga in the park', location: 'Ada Ciganlija', start_time: sameDay.toISOString(), end_time: null },
      { id: 'e2', title: 'Tomorrow run', location: null, start_time: tomorrow.toISOString(), end_time: null },
    ];
    h.index = { total: 742, trend: 'up', history: [{ score: 700 }, { score: 742 }] };
    h.journeySessions = 10;
    renderHome();
    const today = await screen.findByText('Yoga in the park');
    expect(today.closest('[data-rail-block="today"]')).toBeTruthy();
    expect(screen.queryByText('Tomorrow run')).toBeNull();
    const journey = document.querySelector('[data-rail-block="journey"]') as HTMLElement;
    expect(within(journey).getByText('spotlightFeed.index.title 742')).toBeTruthy();
    expect(within(journey).getByText('screens.home.longevityJourneyNextStepHeadline')).toBeTruthy();
  });

  it('loading shows VCard skeletons with a single spotlight shape, never a spinner', () => {
    h.tenantFlag = true;
    h.items = [];
    h.loading = true;
    renderHome();
    const stage = document.querySelector('[data-spotlight-stage]') as HTMLElement;
    expect(stage.querySelectorAll('[data-vcard-skeleton][data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(stage.querySelectorAll('[data-vcard-skeleton][data-vcard-size="standard"]').length).toBeGreaterThan(0);
    expect(document.querySelector('.animate-spin')).toBeNull();
  });

  it('an empty feed shows the empty state with a refresh action', () => {
    h.tenantFlag = true;
    h.items = [];
    renderHome();
    expect(screen.getByText('screens.home.noNewsArticlesYet')).toBeTruthy();
    expect(screen.getByText('screens.home.refresh')).toBeTruthy();
  });
});
