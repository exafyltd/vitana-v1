/**
 * VTID-05297 (Native Wave 2, home-feed lane) — fake-gateway / fixture unit
 * tests for the native Home screen (FEAT-002 / FEAT-003). No network (the
 * no-network guard is imported first; the Supabase client is the in-memory
 * double installed by makeWrapper, the gateway is the fake). The native feed
 * data hooks (`./data/feed`, `./data/enrichment`) are stubbed per test so the
 * screen's composition, states and deep-link plumbing are exercised
 * deterministically — their own query logic is the data layer's concern, not
 * this screen's. React 19: components are typed with `ReactElement`; no global
 * `JSX`.
 */
import '../helpers/no-network';
import './mocks';
import type { ReactElement, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { mockParams, router } from './mocks';

// ── stubbed native data hooks (controlled per test) ────────────────────────
type AllFeed = {
  items: unknown[];
  isLoading: boolean;
  isError: boolean;
  fetchNextPage: jest.Mock;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  refetch: jest.Mock;
};
type Community = { data: unknown[] | undefined; isLoading: boolean; isError: boolean; refetch: jest.Mock };
type Enrichment = { cards: unknown[]; profileCompletionPct: number | null; isLoading: boolean; isError: boolean; dismiss: jest.Mock };

const mockAllFeed: { current: AllFeed } = {
  current: { items: [], isLoading: false, isError: false, fetchNextPage: jest.fn(), hasNextPage: false, isFetchingNextPage: false, refetch: jest.fn() },
};
const mockCommunity: { current: Community } = { current: { data: [], isLoading: false, isError: false, refetch: jest.fn() } };
const mockEnrichment: { current: Enrichment } = { current: { cards: [], profileCompletionPct: null, isLoading: false, isError: false, dismiss: jest.fn() } };
const mockCreatePost = { mutate: jest.fn(), isPending: false };

jest.mock('../../src/screens/home/data/feed', () => ({
  useAllNewsFeed: () => mockAllFeed.current,
  useCommunityNews: () => mockCommunity.current,
  useCreatePost: () => mockCreatePost,
}));
jest.mock('../../src/screens/home/data/enrichment', () => ({
  useEnrichmentCards: () => mockEnrichment.current,
}));
// The enrichment CARD component throws on render — used only by the
// error-boundary isolation test, which is the only test that feeds a card row
// (every other test returns `cards: []`, so this mock never renders there).
jest.mock('../../src/screens/home/cards/EnrichmentCard', () => ({
  EnrichmentCard: ({ card }: { card: { card_type: string } }) => {
    throw new Error(`boom:${card.card_type}`);
  },
}));

import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { __setSupabaseForTests } from '../../src/auth/client';
import { UIProvider } from '../../src/ports/ui';
import { HomeScreen } from '../../src/screens/home/HomeScreen';
import { allKinds, articleItem, postItem, featureItem, performerItem, newMemberItem, enrichmentCard, communityArticles } from './fixtures';

afterAll(() => __setSupabaseForTests(null));

function resetHooks() {
  mockAllFeed.current = { items: [], isLoading: false, isError: false, fetchNextPage: jest.fn(), hasNextPage: false, isFetchingNextPage: false, refetch: jest.fn() };
  mockCommunity.current = { data: [], isLoading: false, isError: false, refetch: jest.fn() };
  mockEnrichment.current = { cards: [], profileCompletionPct: null, isLoading: false, isError: false, dismiss: jest.fn() };
  mockCreatePost.mutate = jest.fn();
  mockCreatePost.isPending = false;
}

afterEach(() => {
  mockParams.current = {};
  resetHooks();
  jest.clearAllMocks();
});

const authedSession = fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } });

function double() {
  return createSupabaseDouble({
    session: authedSession,
    tables: { tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }] },
    rpc: {
      get_role_preference: () => ({ data: [{ role: 'community' }], error: null }),
      get_my_permitted_roles: () => ({ data: { ok: true, roles: ['community'] }, error: null }),
    },
  });
}

/** HomeScreen under the UI kit provider + the full app provider stack (news-test pattern). */
function renderHome(ui: ReactElement = <HomeScreen />) {
  const client = double().client;
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction="ltr">
      {children}
    </UIProvider>
  );
  return render(<Wrapped>{ui}</Wrapped>, { wrapper: makeWrapper({ client, language: 'de-DE' }) });
}

describe('HomeScreen — feed states', () => {
  it('renders the feed cards when the All feed is loaded', () => {
    mockAllFeed.current = { ...mockAllFeed.current, items: [articleItem, postItem] };
    renderHome();
    expect(screen.getByTestId('home-feed-list')).toBeTruthy();
    expect(screen.getByTestId(`feed-article-${articleItem.id}`)).toBeTruthy();
    expect(screen.getByTestId(`feed-post-${postItem.id}`)).toBeTruthy();
    expect(screen.queryByTestId('home-feed-empty')).toBeNull();
  });

  it('shows the empty state when the feed has no items', () => {
    mockAllFeed.current = { ...mockAllFeed.current, items: [] };
    renderHome();
    expect(screen.getByTestId('home-feed-empty')).toBeTruthy();
  });

  it('shows the error state when the feed errors', () => {
    mockAllFeed.current = { ...mockAllFeed.current, items: [], isError: true };
    renderHome();
    expect(screen.getByTestId('home-feed-error')).toBeTruthy();
    expect(screen.getByTestId('home-feed-retry')).toBeTruthy();
  });

  it('shows the loading state before the first items arrive', () => {
    mockAllFeed.current = { ...mockAllFeed.current, items: [], isLoading: true };
    renderHome();
    expect(screen.getByTestId('delayed-loader')).toBeTruthy();
    expect(screen.queryByTestId('home-feed-list')).toBeNull();
  });
});

describe('HomeScreen — per-kind card mapping', () => {
  it('maps every FeedItem kind to its card component', () => {
    mockAllFeed.current = { ...mockAllFeed.current, items: allKinds };
    renderHome();
    expect(screen.getByTestId(`feed-article-${articleItem.id}`)).toBeTruthy();
    expect(screen.getByTestId(`feed-post-${postItem.id}`)).toBeTruthy();
    expect(screen.getByTestId(`feed-feature-${featureItem.id}`)).toBeTruthy();
    expect(screen.getByTestId(`feed-performer-${performerItem.id}`)).toBeTruthy();
    expect(screen.getByTestId(`feed-new-member-${newMemberItem.id}`)).toBeTruthy();
  });
});

describe('HomeScreen — error boundary isolation', () => {
  it('shows the fallback for one crashing card and still renders the others', () => {
    // The enrichment card is composed into the All feed as a `card` row and its
    // card component throws (mocked above); the article + post rows must survive.
    mockAllFeed.current = { ...mockAllFeed.current, items: [articleItem, postItem] };
    mockEnrichment.current = { ...mockEnrichment.current, cards: [enrichmentCard] };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    renderHome();
    // The crashing card is replaced by the already-translated fallback…
    expect(screen.getByText('Dieser Beitrag konnte nicht angezeigt werden.')).toBeTruthy();
    // …and the healthy rows still render.
    expect(screen.getByTestId(`feed-article-${articleItem.id}`)).toBeTruthy();
    expect(screen.getByTestId(`feed-post-${postItem.id}`)).toBeTruthy();
    spy.mockRestore();
  });
});

describe('HomeScreen — tab switch', () => {
  it('renders the community feed when the tab param is community', () => {
    mockCommunity.current = { ...mockCommunity.current, data: communityArticles };
    mockParams.current = { tab: 'community' };
    renderHome();
    // The member row renders the new-member card; the event row renders an article card.
    expect(screen.getByTestId('feed-new-member-member-m-1')).toBeTruthy();
    expect(screen.getByTestId('feed-article-event-e-1')).toBeTruthy();
  });

  it('writes the tab back to the search param via the mode pill', () => {
    mockAllFeed.current = { ...mockAllFeed.current, items: [articleItem] };
    renderHome();
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-community'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'community' });
  });
});

describe('HomeScreen — pull to refresh', () => {
  it('refetches the All feed when the RefreshControl fires', () => {
    const refetch = jest.fn();
    mockAllFeed.current = { ...mockAllFeed.current, items: [articleItem], refetch };
    renderHome();
    const list = screen.getByTestId('home-feed-list');
    list.props.refreshControl.props.onRefresh();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches the community feed when on the community tab', () => {
    const refetch = jest.fn();
    mockCommunity.current = { ...mockCommunity.current, data: communityArticles, refetch };
    mockParams.current = { tab: 'community' };
    renderHome();
    screen.getByTestId('home-feed-list').props.refreshControl.props.onRefresh();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
