/**
 * VTID-05297 (Native Wave 2, home-feed lane) — the Home deep-link surfaces
 * (FEAT-003): the three route files + the index route default-export a
 * component; resolveWebPath keeps the path and does not fall through to
 * not-found; `/home?compose=1` and `/home/compose` open the create-post sheet;
 * `/home/comments` auto-opens the first commentable post's comments; and
 * `/home/notif` renders the feed with the front-door-overlay flag threaded
 * through (nothing to suppress yet — a later ORB wave). No network. React 19:
 * no global `JSX`.
 */
import '../helpers/no-network';
import './mocks';
import type { ReactElement, ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';
import { mockParams } from './mocks';

type AllFeed = {
  items: unknown[];
  isLoading: boolean;
  isError: boolean;
  fetchNextPage: jest.Mock;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  refetch: jest.Mock;
};
const mockAllFeed: { current: AllFeed } = {
  current: { items: [], isLoading: false, isError: false, fetchNextPage: jest.fn(), hasNextPage: false, isFetchingNextPage: false, refetch: jest.fn() },
};
const mockCommunity = { current: { data: [] as unknown[], isLoading: false, isError: false, refetch: jest.fn() } };
const mockEnrichment = { current: { cards: [] as unknown[], profileCompletionPct: null as number | null, isLoading: false, isError: false, dismiss: jest.fn() } };
const mockCreatePost = { mutate: jest.fn(), isPending: false };

jest.mock('../../src/screens/home/data/feed', () => ({
  useAllNewsFeed: () => mockAllFeed.current,
  useCommunityNews: () => mockCommunity.current,
  useCreatePost: () => mockCreatePost,
}));
jest.mock('../../src/screens/home/data/enrichment', () => ({
  useEnrichmentCards: () => mockEnrichment.current,
}));

import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { __setSupabaseForTests } from '../../src/auth/client';
import { UIProvider } from '../../src/ports/ui';
import { resolveWebPath } from '../../src/navigation/resolve';
import { postItem } from './fixtures';

afterAll(() => __setSupabaseForTests(null));

function reset() {
  mockAllFeed.current = { items: [], isLoading: false, isError: false, fetchNextPage: jest.fn(), hasNextPage: false, isFetchingNextPage: false, refetch: jest.fn() };
  mockCommunity.current = { data: [], isLoading: false, isError: false, refetch: jest.fn() };
  mockEnrichment.current = { cards: [], profileCompletionPct: null, isLoading: false, isError: false, dismiss: jest.fn() };
  mockCreatePost.mutate = jest.fn();
  mockCreatePost.isPending = false;
}
afterEach(() => {
  mockParams.current = {};
  reset();
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
function renderRoute(ui: ReactElement) {
  const client = double().client;
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction="ltr">
      {children}
    </UIProvider>
  );
  return render(<Wrapped>{ui}</Wrapped>, { wrapper: makeWrapper({ client, language: 'de-DE' }) });
}

describe('home route files', () => {
  it('index, compose, comments and notif each default-export a component', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const index = require('../../app/(app)/home/index').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const compose = require('../../app/(app)/home/compose').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const comments = require('../../app/(app)/home/comments').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notif = require('../../app/(app)/home/notif').default;
    expect(typeof index).toBe('function');
    expect(typeof compose).toBe('function');
    expect(typeof comments).toBe('function');
    expect(typeof notif).toBe('function');
  });
});

describe('deep-link resolution', () => {
  it('resolves the three home deep links to a native destination and keeps the path', () => {
    for (const path of ['/home/compose', '/home/comments', '/home/notif']) {
      const res = resolveWebPath(path);
      expect(res.kind).not.toBe('not-found');
      expect(res.kind).toBe('native');
      expect(res.path).toBe(path);
    }
  });
});

describe('compose deep link', () => {
  it('opens the create-post sheet for /home?compose=1', () => {
    mockParams.current = { compose: '1' };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const HomeRoute = require('../../app/(app)/home/index').default;
    renderRoute(<HomeRoute />);
    expect(screen.getByTestId('home-create-post')).toBeTruthy();
  });

  it('opens the create-post sheet for the /home/compose route', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ComposeRoute = require('../../app/(app)/home/compose').default;
    renderRoute(<ComposeRoute />);
    expect(screen.getByTestId('home-create-post')).toBeTruthy();
  });
});

describe('comments deep link', () => {
  it('auto-opens the comments sheet for the first commentable post', () => {
    mockAllFeed.current = { ...mockAllFeed.current, items: [postItem] };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const CommentsRoute = require('../../app/(app)/home/comments').default;
    renderRoute(<CommentsRoute />);
    expect(screen.getByTestId(`feed-post-${postItem.id}-comments-sheet`)).toBeTruthy();
  });

  it('does not open a comments sheet on the plain feed', () => {
    mockAllFeed.current = { ...mockAllFeed.current, items: [postItem] };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const HomeRoute = require('../../app/(app)/home/index').default;
    renderRoute(<HomeRoute />);
    expect(screen.queryByTestId(`feed-post-${postItem.id}-comments-sheet`)).toBeNull();
  });
});

describe('notif deep link', () => {
  it('renders the feed (front-door-overlay flag threaded; nothing to suppress yet)', () => {
    mockAllFeed.current = { ...mockAllFeed.current, items: [postItem] };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NotifRoute = require('../../app/(app)/home/notif').default;
    renderRoute(<NotifRoute />);
    expect(screen.getByTestId('home-feed-list')).toBeTruthy();
    expect(screen.getByTestId(`feed-post-${postItem.id}`)).toBeTruthy();
  });
});
