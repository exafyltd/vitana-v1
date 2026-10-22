/**
 * VTID-05298 (Native Wave 2, news lane) — fake-gateway / fixture unit tests for
 * the news / post readers and the NewsArticleCard twin. No network (the
 * no-network guard is imported first; the Supabase client is the in-memory
 * double installed by makeWrapper). React 19: components are typed with
 * `ReactElement`; no global `JSX`.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import type { ReactElement, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockRouter = { navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockParams.current,
  usePathname: () => '/news/1',
  useGlobalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  SafeAreaInsetsContext: jest.requireActual('react').createContext(null),
}));

import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { __setSupabaseForTests } from '../../src/auth/client';
import { UIProvider } from '../../src/ports/ui';
import { NewsArticleCard } from '../../src/screens/news/NewsArticleCard';
import { NewsDetailScreen, parseArticleParam } from '../../src/screens/news/NewsDetailScreen';
import { PostDetailScreen, normalizePostSource } from '../../src/screens/news/PostDetailScreen';
import type { NewsArticle } from '../../src/screens/news/types';

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  mockParams.current = {};
  jest.clearAllMocks();
});

const authedSession = fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } });

function double(tables: Record<string, Record<string, unknown>[]> = {}) {
  return createSupabaseDouble({
    session: authedSession,
    tables: {
      tenants: [{ tenant_id: 't-maxina', slug: 'maxina', name: 'Maxina' }],
      ...tables,
    },
    rpc: {
      get_role_preference: () => ({ data: [{ role: 'community' }], error: null }),
      get_my_permitted_roles: () => ({ data: { ok: true, roles: ['community'] }, error: null }),
    },
  });
}

/** Renders under the UI kit provider (theme/direction) + the full app provider stack. */
function renderWithProviders(ui: ReactElement, client: unknown) {
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction="ltr">
      {children}
    </UIProvider>
  );
  return render(<Wrapped>{ui}</Wrapped>, { wrapper: makeWrapper({ client, language: 'de-DE' }) });
}

const sampleArticle: NewsArticle = {
  id: 'a-1',
  source: 'longevity',
  source_name: 'Longevity Daily',
  title: 'NMN and the cell',
  link: 'https://example.org/nmn',
  summary: 'A study on NMN.',
  image_url: 'https://cdn.example.org/primary.jpg',
  published_at: '2026-10-01T00:00:00.000Z',
  tags: ['supplements'],
  category: 'supplements',
};

describe('parseArticleParam', () => {
  it('parses a serialized article', () => {
    const raw = encodeURIComponent(JSON.stringify(sampleArticle));
    expect(parseArticleParam(raw)?.id).toBe('a-1');
  });
  it('returns null for an absent, empty or unparseable param', () => {
    expect(parseArticleParam(undefined)).toBeNull();
    expect(parseArticleParam('')).toBeNull();
    expect(parseArticleParam('%7Bnot-json')).toBeNull();
    expect(parseArticleParam(encodeURIComponent(JSON.stringify({ id: 'x' })))).toBeNull();
  });
  it('takes the first value of a repeated param', () => {
    const raw = encodeURIComponent(JSON.stringify(sampleArticle));
    expect(parseArticleParam([raw, 'other'])?.id).toBe('a-1');
  });
});

describe('normalizePostSource', () => {
  it('maps media to media and everything else to post', () => {
    expect(normalizePostSource('media')).toBe('media');
    expect(normalizePostSource('post')).toBe('post');
    expect(normalizePostSource(undefined)).toBe('post');
    expect(normalizePostSource(['media'])).toBe('media');
  });
});

describe('NewsArticleCard', () => {
  it('renders the title, source and primary image, and fires onPress', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <NewsArticleCard
        testID="card"
        title="NMN and the cell"
        description="A study on NMN."
        imageUrl="https://cdn.example.org/primary.jpg"
        fallbackImageUrl="https://cdn.example.org/fallback.jpg"
        category="NUTRITION"
        timestamp="vor 1 Tag"
        sourceName="Longevity Daily"
        onPress={onPress}
      />,
      double().client,
    );
    expect(screen.getByText('NMN and the cell')).toBeTruthy();
    expect(screen.getByText('Longevity Daily')).toBeTruthy();
    expect(screen.getByTestId('card-image').props.source).toEqual({ uri: 'https://cdn.example.org/primary.jpg' });
    fireEvent.press(screen.getByTestId('card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('swaps to the fallback image when the primary fails to load', () => {
    renderWithProviders(
      <NewsArticleCard
        testID="card"
        title="T"
        imageUrl="https://cdn.example.org/primary.jpg"
        fallbackImageUrl="https://cdn.example.org/fallback.jpg"
      />,
      double().client,
    );
    const img = screen.getByTestId('card-image');
    expect(img.props.source).toEqual({ uri: 'https://cdn.example.org/primary.jpg' });
    fireEvent(img, 'error');
    expect(screen.getByTestId('card-image').props.source).toEqual({ uri: 'https://cdn.example.org/fallback.jpg' });
  });
});

describe('NewsDetailScreen', () => {
  it('renders the loaded article with its external actions', async () => {
    mockParams.current = { id: 'a-1', article: encodeURIComponent(JSON.stringify(sampleArticle)) };
    renderWithProviders(<NewsDetailScreen />, double().client);
    expect(await screen.findByTestId('news-detail')).toBeTruthy();
    expect(screen.getByText('NMN and the cell')).toBeTruthy();
    expect(screen.getByTestId('news-detail-read-on')).toBeTruthy();
    expect(screen.getByTestId('news-detail-open-browser')).toBeTruthy();
  });

  it('opens the external link when "read on" is pressed', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    mockParams.current = { id: 'a-1', article: encodeURIComponent(JSON.stringify(sampleArticle)) };
    renderWithProviders(<NewsDetailScreen />, double().client);
    fireEvent.press(await screen.findByTestId('news-detail-read-on'));
    expect(spy).toHaveBeenCalledWith('https://example.org/nmn');
    spy.mockRestore();
  });

  it('shows the greet / view-profile actions for a new-member card', async () => {
    const memberArticle: NewsArticle = {
      ...sampleArticle,
      id: 'member-9',
      source: 'community',
      link: '/u/u-9',
      member_user_id: 'u-9',
    };
    mockParams.current = { id: 'member-9', article: encodeURIComponent(JSON.stringify(memberArticle)) };
    renderWithProviders(<NewsDetailScreen />, double().client);
    expect(await screen.findByTestId('news-detail-say-hello')).toBeTruthy();
    expect(screen.getByTestId('news-detail-view-profile')).toBeTruthy();
    expect(screen.queryByTestId('news-detail-read-on')).toBeNull();
  });

  it('renders the not-found state (and a back-to-feed action) when no article is passed', async () => {
    mockParams.current = { id: 'a-1' };
    renderWithProviders(<NewsDetailScreen />, double().client);
    expect(await screen.findByTestId('news-detail-not-found')).toBeTruthy();
    expect(screen.getByTestId('news-detail-not-found-home')).toBeTruthy();
  });
});

describe('deep-link resolution', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { resolveWebPath } = require('../../src/navigation/resolve') as typeof import('../../src/navigation/resolve');

  it('a /news/:id deep link resolves to a known destination (not not-found)', () => {
    expect(resolveWebPath('/news/a-1').kind).not.toBe('not-found');
    expect(resolveWebPath('/news/a-1').path).toBe('/news/a-1');
  });

  it('a /post/:source/:id deep link resolves to a known destination and keeps the path', () => {
    expect(resolveWebPath('/post/post/p-1').kind).not.toBe('not-found');
    expect(resolveWebPath('/post/media/m-1').path).toBe('/post/media/m-1');
  });

  it('the concrete route files default-export a component', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const newsRoute = require('../../app/(app)/news/[id]').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postRoute = require('../../app/(app)/post/[source]/[id]').default;
    expect(typeof newsRoute).toBe('function');
    expect(typeof postRoute).toBe('function');
  });
});

describe('PostDetailScreen', () => {
  it('renders a loaded member post with author, content and counts', async () => {
    const client = double({
      profile_posts: [{ id: 'p-1', user_id: 'u-2', content: 'Hello community', image_url: 'https://cdn.example.org/p.jpg', likes_count: 3, comments_count: 1, created_at: '2026-10-02T00:00:00.000Z' }],
      global_community_profiles: [{ user_id: 'u-2', display_name: 'Mara', avatar_url: null }],
    }).client;
    mockParams.current = { source: 'post', id: 'p-1' };
    renderWithProviders(<PostDetailScreen />, client);
    expect(await screen.findByTestId('post-detail-card')).toBeTruthy();
    expect(screen.getByText('Mara')).toBeTruthy();
    expect(screen.getByText('Hello community')).toBeTruthy();
    expect(screen.getByTestId('post-detail-media')).toBeTruthy();
  });

  it('renders a video post with the video badge (media source)', async () => {
    const client = double({
      media_uploads: [{ id: 'm-1', user_id: 'u-3', title: 'Clip', description: null, file_url: 'https://cdn.example.org/v.mp4', thumbnail_url: 'https://cdn.example.org/t.jpg', likes_count: 0, comments_count: 0, created_at: '2026-10-03T00:00:00.000Z' }],
      global_community_profiles: [{ user_id: 'u-3', display_name: 'Tom', avatar_url: null }],
    }).client;
    mockParams.current = { source: 'media', id: 'm-1' };
    renderWithProviders(<PostDetailScreen />, client);
    expect(await screen.findByTestId('post-detail-card')).toBeTruthy();
    expect(screen.getByText('Clip')).toBeTruthy();
    expect(screen.getByTestId('post-detail-media')).toBeTruthy();
  });

  it('renders the not-found state for a deleted post', async () => {
    const client = double({ profile_posts: [] }).client;
    mockParams.current = { source: 'post', id: 'gone' };
    renderWithProviders(<PostDetailScreen />, client);
    expect(await screen.findByTestId('post-detail-not-found')).toBeTruthy();
  });

  it('renders the not-found state on a fetch error', async () => {
    const d = double();
    // from().maybeSingle rejects → the query errors.
    (d.client.from as jest.Mock).mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => { throw new Error('boom'); } }) }),
    }));
    mockParams.current = { source: 'post', id: 'p-err' };
    renderWithProviders(<PostDetailScreen />, d.client);
    expect(await screen.findByTestId('post-detail-not-found')).toBeTruthy();
  });
});
