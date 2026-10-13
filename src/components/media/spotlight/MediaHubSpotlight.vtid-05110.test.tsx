/**
 * VTID-05110 — Media Hub Spotlight: focus-feed contract (one spotlight per
 * music/podcast stage, shorts as a spotlight feed, rail only compact/row),
 * real rows only, loading/empty/error states, and every control wired to the
 * page's existing handlers. Layout only — no network, no writes.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/i18n-toast', () => ({
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  notify: vi.fn(),
  notifyError: vi.fn(),
  getI18nLocale: () => 'de-DE',
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/components/SubNavigation', () => ({ default: () => <nav data-testid="subnav" /> }));
vi.mock('@/components/StandardHeader', () => ({ default: (p: { title: string }) => <header data-testid="header">{p.title}</header> }));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: (p: { children?: React.ReactNode }) => <div data-testid="utility">{p.children}</div>,
}));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => <button type="button">calendar</button> }));
vi.mock('@/components/ui/expandable-search-button', () => ({
  ExpandableSearchButton: (p: { onSearch?: (q: string) => void; onClear?: () => void }) => (
    <>
      <input aria-label="media-search" onChange={(e) => p.onSearch?.(e.target.value)} />
      <button type="button" onClick={p.onClear}>
        clear-search
      </button>
    </>
  ),
}));
const popularShows = vi.fn(() => ({ data: [] as unknown[] }));
vi.mock('@/hooks/usePopularPodcastShows', () => ({ usePopularPodcastShows: () => popularShows() }));
const toggleFavorite = vi.fn();
vi.mock('@/hooks/usePodcastFavorite', () => ({ usePodcastFavorite: () => ({ isFavorited: false, toggleFavorite, isToggling: false }) }));
const toggleSubscription = vi.fn();
vi.mock('@/hooks/usePodcastShowSubscription', () => ({
  usePodcastShowSubscription: () => ({ isSubscribed: false, toggleSubscription, isToggling: false }),
}));

import { ScreenFrame } from '@/components/layout/spotlight';
import { MediaHubSpotlight, type MediaHubSpotlightProps } from './MediaHubSpotlight';

const shorts = [
  { id: 's1', user_id: 'me', title: 'Morning stretch', creator: 'Ana', duration: '0:45', src_url: 'a.mp4', thumbnail_url: 'a.jpg', views: '1200', likes: 4 },
  { id: 's2', user_id: 'other', title: 'Breathing', creator: 'Ben', duration: '1:10', src_url: 'b.mp4', thumbnail_url: null, views: '0', likes: 0 },
];
const music = [
  { id: 'm1', title: 'Rain', file_url: 'r.mp3', duration: 120, music_metadata: { artist_name: 'Lia' } },
  { id: 'm2', title: 'Forest', file_url: 'f.mp3', duration: 90, music_metadata: null },
];
const podcasts = [
  { id: 'p1', user_id: 'me', title: 'Sleep science', file_url: 'p1.mp3', thumbnail_url: 'p1.jpg', duration: 600, podcast_metadata: { host_name: 'Dr. K' } },
  { id: 'p2', user_id: 'other', title: 'Fasting', file_url: 'p2.mp3', thumbnail_url: null, duration: 300, podcast_metadata: null },
];

function setup(over: Partial<MediaHubSpotlightProps> = {}) {
  const props: MediaHubSpotlightProps = {
    activeTab: 'shorts',
    onTabChange: vi.fn(),
    currentUserId: 'me',
    shorts,
    shortsStatus: 'ready',
    onRetryShorts: vi.fn(),
    onOpenShort: vi.fn(),
    onEditShort: vi.fn(),
    onDeleteShort: vi.fn(),
    interestTags: [],
    onClearInterestFilter: vi.fn(),
    music,
    musicStatus: 'ready',
    onRetryMusic: vi.fn(),
    isMusicBookmarked: () => false,
    onToggleMusicBookmark: vi.fn(),
    podcasts,
    podcastsStatus: 'ready',
    onRetryPodcasts: vi.fn(),
    onDeletePodcast: vi.fn(),
    currentMediaId: null,
    isPlaying: false,
    onToggleMusic: vi.fn(),
    onTogglePodcast: vi.fn(),
    onUpload: vi.fn(),
    onBulkUpload: vi.fn(),
    children: ({ frame, stage }) => (
      <ScreenFrame archetype="focus-feed" {...frame}>
        {stage}
      </ScreenFrame>
    ),
    ...over,
  };
  const utils = render(
    <MemoryRouter>
      <MediaHubSpotlight {...props} />
    </MemoryRouter>,
  );
  return { props, ...utils };
}

const stageOf = (c: HTMLElement) => c.querySelector('[data-spotlight-stage]') as HTMLElement;
const railOf = (c: HTMLElement) => c.querySelector('aside[data-spotlight-rail]') as HTMLElement;

beforeEach(() => {
  popularShows.mockReturnValue({ data: [] });
});

describe('VTID-05110 Media Hub Spotlight — structure', () => {
  it('renders through ScreenFrame as a focus-feed with the existing chrome and the three media tabs', () => {
    const { container } = setup();
    expect(container.querySelector('[data-archetype="focus-feed"]')).not.toBeNull();
    expect(screen.getByTestId('subnav')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toHaveTextContent('mediaHub.title');
    const tabs = screen.getAllByRole('tab').map((el) => el.textContent);
    expect(tabs).toEqual(['mediaHub.tabs.shorts', 'mediaHub.tabs.music', 'mediaHub.tabs.podcasts']);
  });

  it('shorts: one 4:5 spotlight card per real short, the first focused and the rest dimmed', () => {
    const { container } = setup();
    const cards = stageOf(container).querySelectorAll('[data-vcard-size="spotlight"]');
    expect(cards).toHaveLength(2);
    expect(cards[0].hasAttribute('data-focused')).toBe(true);
    expect(cards[1].hasAttribute('data-dimmed')).toBe(true);
    expect(cards[0].querySelector('[data-vcard-media]')!.className).toContain('aspect-portrait');
  });

  it('music and podcasts: exactly one spotlight card, the rest as row cards', () => {
    const { container, rerender, props } = setup({ activeTab: 'music' });
    expect(stageOf(container).querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(stageOf(container).querySelectorAll('[data-vcard-size="row"]')).toHaveLength(1);
    rerender(
      <MemoryRouter>
        <MediaHubSpotlight {...props} activeTab="podcasts" />
      </MemoryRouter>,
    );
    expect(stageOf(container).querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(stageOf(container).querySelector('[data-vcard-size="spotlight"]')).toHaveTextContent('Sleep science');
  });

  it('the playing track is the spotlight card', () => {
    const { container } = setup({ activeTab: 'music', currentMediaId: 'm2', isPlaying: true });
    expect(stageOf(container).querySelector('[data-vcard-size="spotlight"]')).toHaveTextContent('Forest');
  });

  it('the rail holds only compact and row cards (SR-08)', () => {
    popularShows.mockReturnValue({ data: [{ show_name: 'Show', host_name: 'Host', episode_count: 3, category: 'Health', subscriber_count: 0, latest_episode_date: '2026-10-01' }] });
    for (const tab of ['shorts', 'music', 'podcasts'] as const) {
      const { container, unmount } = setup({ activeTab: tab, currentMediaId: 'p1', isPlaying: true });
      const sizes = Array.from(railOf(container).querySelectorAll('[data-vcard-size]')).map((el) => el.getAttribute('data-vcard-size'));
      expect(sizes.length).toBeGreaterThan(0);
      sizes.forEach((s) => expect(['compact', 'row']).toContain(s));
      unmount();
    }
  });
});

describe('VTID-05110 Media Hub Spotlight — states', () => {
  it('loading shows the focus-feed skeleton, never a spinner', () => {
    const { container } = setup({ shortsStatus: 'loading', shorts: [] });
    expect(container.querySelector('[data-archetype-skeleton="focus-feed"]')).not.toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('error offers a retry wired to the page refetch', () => {
    const { props } = setup({ activeTab: 'music', musicStatus: 'error', music: [] });
    fireEvent.click(screen.getByText('spotlightMedia.media.error.retry'));
    expect(props.onRetryMusic).toHaveBeenCalled();
  });

  it('empty lists show an empty state with an upload action — never demo content', () => {
    const { props, container } = setup({ shorts: [] });
    expect(stageOf(container).querySelector('[data-vcard-size]')).toBeNull();
    expect(screen.getByText('spotlightMedia.media.empty.shortsTitle')).toBeInTheDocument();
    fireEvent.click(within(stageOf(container)).getByText('mediaHub.actions.upload'));
    expect(props.onUpload).toHaveBeenCalledWith('video');
  });

  it('search filters the stage and keeps each short\'s index for the player', () => {
    const { props, container } = setup();
    fireEvent.change(screen.getByLabelText('media-search'), { target: { value: 'breath' } });
    const cards = stageOf(container).querySelectorAll('[data-vcard-size="spotlight"]');
    expect(cards).toHaveLength(1);
    fireEvent.click(within(cards[0] as HTMLElement).getByText('spotlightMedia.media.play'));
    expect(props.onOpenShort).toHaveBeenCalledWith(1);
    fireEvent.change(screen.getByLabelText('media-search'), { target: { value: 'nothing-matches' } });
    expect(container.querySelector('[data-media-search-empty]')).not.toBeNull();
    fireEvent.click(screen.getByText('spotlightMedia.media.clearSearch'));
    expect(stageOf(container).querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(2);
  });
});

describe('VTID-05110 Media Hub Spotlight — controls reach the existing handlers', () => {
  it('shorts: media and Play open the player; edit/delete only on the owner\'s short', () => {
    const { props, container } = setup();
    const [mine, theirs] = Array.from(stageOf(container).querySelectorAll('[data-vcard-size="spotlight"]')) as HTMLElement[];
    fireEvent.click(within(mine).getByLabelText(/spotlightMedia\.media\.playShort/));
    expect(props.onOpenShort).toHaveBeenCalledWith(0);
    fireEvent.click(within(mine).getByText('spotlightMedia.media.edit'));
    expect(props.onEditShort).toHaveBeenCalledWith(shorts[0]);
    fireEvent.click(within(mine).getByText('spotlightMedia.media.delete'));
    expect(props.onDeleteShort).toHaveBeenCalledWith(shorts[0]);
    expect(within(theirs).queryByText('spotlightMedia.media.edit')).toBeNull();
    expect(within(theirs).queryByText('spotlightMedia.media.delete')).toBeNull();
  });

  it('music: play and bookmark call the page handlers', () => {
    const { props, container } = setup({ activeTab: 'music' });
    const spot = stageOf(container).querySelector('[data-vcard-size="spotlight"]') as HTMLElement;
    fireEvent.click(within(spot).getByText('spotlightMedia.media.play'));
    expect(props.onToggleMusic).toHaveBeenCalledWith(music[0]);
    fireEvent.click(within(spot).getByLabelText('spotlightMedia.media.bookmark'));
    expect(props.onToggleMusicBookmark).toHaveBeenCalledWith(music[0]);
  });

  it('podcasts: play, favourite and creator-only delete', () => {
    const { props, container } = setup({ activeTab: 'podcasts' });
    const spot = stageOf(container).querySelector('[data-vcard-size="spotlight"]') as HTMLElement;
    fireEvent.click(within(spot).getByText('spotlightMedia.media.play'));
    expect(props.onTogglePodcast).toHaveBeenCalledWith(podcasts[0]);
    fireEvent.click(within(spot).getByLabelText('spotlightMedia.media.favorite'));
    expect(toggleFavorite).toHaveBeenCalled();
    fireEvent.click(within(spot).getByText('spotlightMedia.media.delete'));
    expect(props.onDeletePodcast).toHaveBeenCalledWith('p1');
    const row = stageOf(container).querySelector('[data-vcard-size="row"]') as HTMLElement;
    expect(within(row).queryByText('spotlightMedia.media.delete')).toBeNull();
  });

  it('tab change and the interest filter reach the page', () => {
    const { props } = setup({ interestTags: ['Yoga'] });
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'mediaHub.tabs.music' }));
    expect(props.onTabChange).toHaveBeenCalledWith('music');
    fireEvent.click(screen.getByText('mediaHub.actions.clearFilters'));
    expect(props.onClearInterestFilter).toHaveBeenCalled();
  });
});
