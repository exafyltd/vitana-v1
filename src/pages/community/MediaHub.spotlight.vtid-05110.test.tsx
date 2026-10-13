/**
 * VTID-05110 — Media Hub page: the Spotlight layout is switched by
 * useSpotlightEnabled() only. Flag off renders the legacy desktop (including
 * its demo fallback shorts); flag on renders ScreenFrame(focus-feed) with real
 * rows only, and its controls reach the page's existing player modal.
 * Everything is mocked — no network, no writes.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let spotlightOn = false;
let mobile = false;
let realShorts: unknown[] = [];
const playerProps: Array<{ isOpen: boolean; video: { id: string } | null }> = [];

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mobile }));
vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string) => k,
  notify: vi.fn(),
  notifyError: vi.fn(),
  getI18nLocale: () => 'de-DE',
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/health/VitanaIndexValue', () => ({ default: () => null }));
vi.mock('@/components/SubNavigation', () => ({ default: () => <nav data-testid="subnav" /> }));
vi.mock('@/components/StandardHeader', () => ({ default: (p: { title: string }) => <header>{p.title}</header> }));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: (p: { children?: ReactNode }) => <div data-testid="utility">{p.children}</div>,
}));
vi.mock('@/components/ui/expandable-search-button', () => ({ ExpandableSearchButton: () => null }));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => null }));
vi.mock('@/components/crossover/PodcastCard', () => ({ PodcastCard: () => null }));
vi.mock('@/components/MediaUploadPopup', () => ({ MediaUploadPopup: () => null }));
vi.mock('@/components/AutopilotPopup', () => ({ AutopilotPopup: () => null }));
vi.mock('@/hooks/use-autopilot', () => ({ useAutopilot: () => ({ pendingCount: 0, getLatestActions: () => [] }) }));
vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({ playMedia: vi.fn(), currentMedia: null, isPlaying: false, togglePlay: vi.fn(), pause: vi.fn() }),
}));
vi.mock('@/hooks/useBookmarks', () => ({ useBookmarks: () => ({ isBookmarked: () => false, toggleBookmark: vi.fn() }) }));
vi.mock('@/hooks/usePopularPodcastShows', () => ({ usePopularPodcastShows: () => ({ data: [], isLoading: false }) }));
vi.mock('@/hooks/usePodcastShowSubscription', () => ({
  usePodcastShowSubscription: () => ({ isSubscribed: false, toggleSubscription: vi.fn(), isToggling: false }),
}));
vi.mock('@/hooks/usePodcastFavorite', () => ({ usePodcastFavorite: () => ({ isFavorited: false, toggleFavorite: vi.fn(), isToggling: false }) }));
vi.mock('@/hooks/useShorts', () => ({
  useShorts: () => ({ data: realShorts, isLoading: false, isError: false, refetch: vi.fn() }),
  useTrackMediaEvent: () => vi.fn(),
  useDeleteShort: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/components/community/ShortPreviewCard', () => ({
  ShortPreviewCard: (p: { video: { title: string } }) => <div data-testid="legacy-short">{p.video.title}</div>,
}));
vi.mock('@/components/community/UnifiedUploadModal', () => ({ UnifiedUploadModal: () => null }));
vi.mock('@/components/community/VideoPlayerModal', () => ({
  VideoPlayerModal: (p: { isOpen: boolean; video: { id: string } | null }) => {
    playerProps.push(p);
    return p.isOpen ? <div data-testid="player" data-video={p.video?.id} /> : null;
  },
}));
vi.mock('@/components/community/BulkVideoUploadModal', () => ({ BulkVideoUploadModal: () => null }));
vi.mock('@/components/community/EditShortVideoModal', () => ({ EditShortVideoModal: () => null }));
vi.mock('@/components/community/DensityControl', () => ({ DensityControl: () => null }));
vi.mock('@/components/community/MobileShortsFeed', () => ({ MobileShortsFeed: () => null }));
vi.mock('@/components/community/MobileShortsCarousel', () => ({ MobileShortsCarousel: () => <div data-testid="mobile-carousel" /> }));
vi.mock('@/components/community/MobileMusicList', () => ({ MobileMusicList: () => null }));
vi.mock('@/components/community/MobilePodcastList', () => ({ MobilePodcastList: () => null }));
vi.mock('@/components/ui/MobileModePill', () => ({ MobileModePill: () => null }));
vi.mock('@/hooks/useShortsDensity', () => ({
  useShortsDensity: () => ({ density: 'comfortable', setDensity: vi.fn(), cardWidth: '200px', gap: '16px', fontScale: 1 }),
}));
vi.mock('@/integrations/supabase/client', () => {
  const result = { data: [], error: null };
  const chain: Record<string, unknown> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: (_t, prop) => {
      if (prop === 'then') return (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return () => proxy;
    },
  };
  const proxy = new Proxy(chain, handler);
  return { supabase: { from: () => proxy } };
});

import MediaHub from './MediaHub';

const short = {
  id: 'short-1',
  user_id: 'someone',
  title: 'Real stretch',
  description: null,
  tags: [],
  src_url: 'https://example.invalid/a.mp4',
  thumbnail_url: null,
  duration_sec: 40,
  views_count: 3,
  likes_count: 1,
  comments_count: 0,
  profiles: { display_name: 'Ana', full_name: null, avatar_url: null },
};

beforeEach(() => {
  spotlightOn = false;
  mobile = false;
  realShorts = [];
  playerProps.length = 0;
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/comm/media-hub']}>
        <MediaHub />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('VTID-05110 Media Hub page — Spotlight switch', () => {
  it('flag off (desktop): the legacy desktop, unchanged (incl. its demo fallback shorts)', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('mediaHub.title');
    expect(screen.getAllByTestId('legacy-short').length).toBe(3);
  });

  it('flag on with no real shorts: focus-feed frame, empty state, no demo content', () => {
    spotlightOn = true;
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype="focus-feed"]')).not.toBeNull();
    expect(screen.queryByTestId('legacy-short')).toBeNull();
    expect(screen.getByText('spotlightMedia.media.empty.shortsTitle')).toBeInTheDocument();
  });

  it('flag on: a short opens the existing VideoPlayerModal', () => {
    spotlightOn = true;
    realShorts = [short];
    const { container } = renderPage();
    const card = container.querySelector('[data-vcard-size="spotlight"]') as HTMLElement;
    expect(card).toHaveTextContent('Real stretch');
    fireEvent.click(within(card).getByText('spotlightMedia.media.play'));
    expect(screen.getByTestId('player')).toHaveAttribute('data-video', 'short-1');
  });

  it('phones never get the Spotlight frame', () => {
    mobile = true;
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(screen.getByTestId('mobile-carousel')).toBeInTheDocument();
  });
});
