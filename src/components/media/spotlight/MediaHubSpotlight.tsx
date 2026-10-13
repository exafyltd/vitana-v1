import * as React from 'react';
import { AlertCircle, Heart, Mic, Music, Pencil, Play, Pause, Plus, Podcast, Share2, Trash2, Video } from 'lucide-react';
import { ArchetypeSkeleton, useFocusedCard, type ScreenFrameProps } from '@/components/layout/spotlight';
import { VCard } from '@/components/ui/vcard';
import { VCardSkeleton } from '@/components/ui/vcard';
import { Button } from '@/components/ui/button';
import { I18nEmptyState } from '@/components/ui/i18n-empty-state';
import { ExpandableSearchButton } from '@/components/ui/expandable-search-button';
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { communityNavigation } from '@/config/navigation';
import { usePopularPodcastShows, type PopularShow } from '@/hooks/usePopularPodcastShows';
import { usePodcastFavorite } from '@/hooks/usePodcastFavorite';
import { usePodcastShowSubscription } from '@/hooks/usePodcastShowSubscription';
import { fmtNumber } from '@/lib/locale-format';
import { notify, t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';
import {
  joinMeta,
  musicArtist,
  musicTrackToVCard,
  podcastHost,
  podcastToVCard,
  shortToVCard,
  type MediaShortRecord,
  type MusicTrackRecord,
  type PodcastEpisodeRecord,
} from '@/components/ui/vcard/adapters/media';

/**
 * VTID-05110 — Media Hub on the Spotlight design (archetype `focus-feed`,
 * docs/design-system/SPOTLIGHT_RULES.md).
 *
 * Desktop only, behind useSpotlightEnabled(); MediaHub.tsx keeps its legacy
 * desktop and its whole phone layout untouched. This component is layout
 * only: every query, mutation, player and modal stays in MediaHub.tsx and is
 * reached through the callbacks below, so playing, bookmarking, sharing,
 * uploading, editing and deleting behave exactly as on the legacy screen.
 *
 *   Shorts   — a free-scrolling column of 4:5 `spotlight` cards; the card on
 *              the centre line is focused (J/K, ↑/↓); a card opens the
 *              existing VideoPlayerModal.
 *   Music    — the playing (or newest) track as the one `spotlight` card,
 *              the rest as `row` cards.
 *   Podcasts — the playing (or newest) episode as the one `spotlight` card,
 *              the rest as `row` cards.
 *   Rail     — what is playing, plus new music / new episodes / popular
 *              shows, only `compact` and `row` cards.
 *
 * Only real rows render. The legacy screen's hard-coded demo shorts,
 * playlists and shows are not shown here (SR-24); an empty list shows an
 * empty state instead.
 */
export type MediaTab = 'shorts' | 'music' | 'podcasts';
export type MediaListStatus = 'loading' | 'error' | 'ready';
export type UploadKind = 'video' | 'music' | 'podcast';

export interface MediaHubShort extends MediaShortRecord {
  views?: string | number;
  likes?: number;
}

export interface MediaHubSpotlightProps {
  activeTab: MediaTab;
  onTabChange: (tab: MediaTab) => void;
  currentUserId?: string;

  shorts: MediaHubShort[];
  shortsStatus: MediaListStatus;
  onRetryShorts: () => void;
  /** Index into `shorts`. */
  onOpenShort: (index: number) => void;
  onEditShort: (short: MediaHubShort) => void;
  onDeleteShort: (short: MediaHubShort) => void;
  interestTags: string[];
  onClearInterestFilter: () => void;

  music: MusicTrackRecord[];
  musicStatus: MediaListStatus;
  onRetryMusic: () => void;
  isMusicBookmarked: (trackId: string) => boolean;
  onToggleMusicBookmark: (track: MusicTrackRecord) => void;

  podcasts: PodcastEpisodeRecord[];
  podcastsStatus: MediaListStatus;
  onRetryPodcasts: () => void;
  onDeletePodcast: (podcastId: string) => void;

  /** The shared audio player (useAudioPlayer). */
  currentMediaId?: string | null;
  isPlaying: boolean;
  onToggleMusic: (track: MusicTrackRecord) => void;
  onTogglePodcast: (episode: PodcastEpisodeRecord) => void;

  onUpload: (kind?: UploadKind) => void;
  onBulkUpload: () => void;

  /**
   * The page composes the chrome itself (contract SR-03):
   * `{({ frame, stage }) => <ScreenFrame archetype="focus-feed" {...frame}>{stage}</ScreenFrame>}`.
   */
  children: (parts: SpotlightFrameParts) => React.ReactElement;
}

/** Everything ScreenFrame needs except the archetype, which the page names. */
export interface SpotlightFrameParts {
  frame: Omit<ScreenFrameProps, 'archetype' | 'children'>;
  stage: React.ReactNode;
}

const TAB_ITEMS: { value: MediaTab; key: string }[] = [
  { value: 'shorts', key: 'mediaHub.tabs.shorts' },
  { value: 'music', key: 'mediaHub.tabs.music' },
  { value: 'podcasts', key: 'mediaHub.tabs.podcasts' },
];

const RAIL_LIMIT = 3;

function matches(query: string, ...fields: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => typeof f === 'string' && f.toLowerCase().includes(q));
}

async function shareMediaLink(title: string, url: string) {
  const data = { title, text: t('spotlightMedia.media.shareText', { title }), url };
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data);
    } catch {
      // the member closed the share sheet
    }
    return;
  }
  await navigator.clipboard?.writeText(url);
  notify('mediaHub.toast.linkCopied', 'spotlightMedia.media.linkCopiedDesc');
}

function IconTile({ icon: Icon, size }: { icon: typeof Music; size: 'lg' | 'sm' }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground" aria-hidden="true">
      <Icon className={size === 'lg' ? 'h-12 w-12' : 'h-5 w-5'} />
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

function ListState({
  status,
  onRetry,
  emptyTitleKey,
  emptyDescKey,
  emptyIcon,
  isEmpty,
  query,
  onClearQuery,
  onEmptyAction,
  children,
}: {
  status: MediaListStatus;
  onRetry: () => void;
  emptyTitleKey: string;
  emptyDescKey?: string;
  emptyIcon: typeof Music;
  isEmpty: boolean;
  query: string;
  onClearQuery: () => void;
  onEmptyAction?: () => void;
  children: React.ReactNode;
}) {
  if (status === 'loading') return <ArchetypeSkeleton archetype="focus-feed" />;
  if (status === 'error') {
    return (
      <I18nEmptyState
        Icon={AlertCircle}
        titleKey="spotlightMedia.media.error.title"
        descriptionKey="spotlightMedia.media.error.desc"
        actionKey="spotlightMedia.media.error.retry"
        onAction={onRetry}
      />
    );
  }
  if (isEmpty && query.trim()) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center" data-media-search-empty="">
        <p className="text-sm text-muted-foreground">{t('spotlightMedia.media.noSearchResults', { query: query.trim() })}</p>
        <Button variant="outline" size="sm" onClick={onClearQuery}>
          {t('spotlightMedia.media.clearSearch')}
        </Button>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <I18nEmptyState
        Icon={emptyIcon}
        titleKey={emptyTitleKey}
        descriptionKey={emptyDescKey}
        actionKey={onEmptyAction ? 'mediaHub.actions.upload' : undefined}
        onAction={onEmptyAction}
      />
    );
  }
  return <>{children}</>;
}

function PlayToggle({
  playing,
  title,
  onClick,
  size = 'sm',
}: {
  playing: boolean;
  title: string;
  onClick: () => void;
  size?: 'sm' | 'icon';
}) {
  const label = playing ? t('spotlightMedia.media.pauseItem', { title }) : t('spotlightMedia.media.playItem', { title });
  if (size === 'icon') {
    return (
      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" aria-label={label} aria-pressed={playing} onClick={onClick}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
    );
  }
  return (
    <Button size="sm" className="gap-1.5 rounded-full" aria-label={label} aria-pressed={playing} onClick={onClick}>
      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {playing ? t('spotlightMedia.media.pause') : t('spotlightMedia.media.play')}
    </Button>
  );
}

function PodcastFavoriteButton({ episodeId, userId }: { episodeId: string; userId?: string }) {
  const { isFavorited, toggleFavorite, isToggling } = usePodcastFavorite(episodeId, userId);
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-9 w-9 rounded-full"
      disabled={!userId || isToggling}
      aria-pressed={isFavorited}
      aria-label={isFavorited ? t('spotlightMedia.media.unfavorite') : t('spotlightMedia.media.favorite')}
      onClick={() => toggleFavorite()}
    >
      <Heart className={cn('h-4 w-4', isFavorited && 'fill-current text-primary')} />
    </Button>
  );
}

function ShowSubscribeButton({ show, userId }: { show: PopularShow; userId?: string }) {
  const { isSubscribed, toggleSubscription, isToggling } = usePodcastShowSubscription(
    { show_name: show.show_name, host_name: show.host_name },
    userId,
  );
  return (
    <Button
      size="sm"
      variant={isSubscribed ? 'secondary' : 'outline'}
      className="rounded-full"
      disabled={!userId || isToggling}
      aria-pressed={isSubscribed}
      onClick={() => toggleSubscription()}
    >
      {isSubscribed ? t('mediaHub.subscribed') : t('mediaHub.subscribe')}
    </Button>
  );
}

export function MediaHubSpotlight(props: MediaHubSpotlightProps) {
  const {
    activeTab,
    onTabChange,
    currentUserId,
    shorts,
    shortsStatus,
    onRetryShorts,
    onOpenShort,
    onEditShort,
    onDeleteShort,
    interestTags,
    onClearInterestFilter,
    music,
    musicStatus,
    onRetryMusic,
    isMusicBookmarked,
    onToggleMusicBookmark,
    podcasts,
    podcastsStatus,
    onRetryPodcasts,
    onDeletePodcast,
    currentMediaId,
    isPlaying,
    onToggleMusic,
    onTogglePodcast,
    onUpload,
    onBulkUpload,
    children: renderFrame,
  } = props;

  const [query, setQuery] = React.useState('');
  const clearQuery = React.useCallback(() => setQuery(''), []);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const { focusedIndex } = useFocusedCard(stageRef);
  const { data: popularShows = [] } = usePopularPodcastShows();

  const unknownArtist = t('mediaHub.unknownArtist');
  const unknownHost = t('mediaHub.unknownHost');
  const isActive = (id: string) => currentMediaId === id && isPlaying;

  // Keep each short's position in `shorts`: the player modal pages through that list.
  const visibleShorts = React.useMemo(
    () =>
      shorts
        .map((short, index) => ({ short, index }))
        .filter(({ short }) => matches(query, short.title, short.creator, short.description, ...(short.tags ?? []))),
    [shorts, query],
  );
  const visibleMusic = React.useMemo(
    () => music.filter((tr) => matches(query, tr.title, musicArtist(tr), tr.description, ...(tr.tags ?? []))),
    [music, query],
  );
  const visiblePodcasts = React.useMemo(
    () => podcasts.filter((ep) => matches(query, ep.title, podcastHost(ep, ''), ep.description)),
    [podcasts, query],
  );

  const featuredTrack = visibleMusic.find((tr) => tr.id === currentMediaId) ?? visibleMusic[0];
  const featuredEpisode = visiblePodcasts.find((ep) => ep.id === currentMediaId) ?? visiblePodcasts[0];

  // ── Stage ────────────────────────────────────────────────────────────────
  const shortsStage = (
    <ListState
      status={shortsStatus}
      onRetry={onRetryShorts}
      emptyTitleKey="spotlightMedia.media.empty.shortsTitle"
      emptyDescKey="spotlightMedia.media.empty.shortsDesc"
      emptyIcon={Video}
      isEmpty={visibleShorts.length === 0}
      query={query}
      onClearQuery={clearQuery}
      onEmptyAction={() => onUpload('video')}
    >
      <p className="sr-only">{t('spotlight.feed.keyboardHint')}</p>
      <div className="flex flex-col gap-6" data-media-feed="shorts">
        {visibleShorts.map(({ short, index }, position) => {
          const card = shortToVCard(short);
          const isOwner = !!currentUserId && short.user_id === currentUserId;
          const views = Number(short.views);
          const stats = joinMeta(
            Number.isFinite(views) && views > 0 ? t('spotlightMedia.media.views', { count: fmtNumber(views) }) : undefined,
            short.likes && short.likes > 0 ? t('spotlightMedia.media.likes', { count: fmtNumber(short.likes) }) : undefined,
          );
          const focused = focusedIndex === position;
          return (
            <VCard
              key={card.key}
              size="spotlight"
              priority={position === 0}
              focused={focused}
              dimmed={visibleShorts.length > 1 && !focused}
              media={card.media}
              mediaSlot={
                <button
                  type="button"
                  className="group relative block h-full w-full"
                  onClick={() => onOpenShort(index)}
                  aria-label={t('spotlightMedia.media.playShort', { title: short.title })}
                >
                  {card.media?.src ? (
                    <img
                      src={card.media.src}
                      alt=""
                      loading={position === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <IconTile icon={Video} size="lg" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-background/80 text-foreground shadow-vcard transition-transform group-hover:scale-105">
                      <Play className="h-7 w-7" />
                    </span>
                  </span>
                </button>
              }
              eyebrow={card.eyebrow}
              title={card.title}
              meta={joinMeta(card.meta, stats)}
              body={card.body}
              actions={
                <>
                  <Button size="sm" className="gap-1.5 rounded-full" onClick={() => onOpenShort(index)}>
                    <Play className="h-4 w-4" />
                    {t('spotlightMedia.media.play')}
                  </Button>
                  {isOwner && (
                    <>
                      <Button size="sm" variant="ghost" className="gap-1.5 rounded-full" onClick={() => onEditShort(short)}>
                        <Pencil className="h-4 w-4" />
                        {t('spotlightMedia.media.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 rounded-full text-destructive"
                        onClick={() => onDeleteShort(short)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('spotlightMedia.media.delete')}
                      </Button>
                    </>
                  )}
                </>
              }
            />
          );
        })}
      </div>
    </ListState>
  );

  const musicActions = (track: MusicTrackRecord, compact: boolean) => {
    const saved = isMusicBookmarked(track.id);
    if (compact) return <PlayToggle playing={isActive(track.id)} title={track.title} onClick={() => onToggleMusic(track)} size="icon" />;
    return (
      <>
        <PlayToggle playing={isActive(track.id)} title={track.title} onClick={() => onToggleMusic(track)} />
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-full"
          aria-pressed={saved}
          aria-label={saved ? t('spotlightMedia.media.unbookmark') : t('spotlightMedia.media.bookmark')}
          onClick={() => onToggleMusicBookmark(track)}
        >
          <Heart className={cn('h-4 w-4', saved && 'fill-current text-primary')} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-full"
          aria-label={t('spotlightMedia.media.share')}
          onClick={() => void shareMediaLink(track.title, `${window.location.origin}/comm/media-hub?music=${track.id}`)}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </>
    );
  };

  const musicStage = (
    <ListState
      status={musicStatus}
      onRetry={onRetryMusic}
      emptyTitleKey="spotlightMedia.media.empty.musicTitle"
      emptyDescKey="mediaHub.noMusicDesc"
      emptyIcon={Music}
      isEmpty={!featuredTrack}
      query={query}
      onClearQuery={clearQuery}
      onEmptyAction={() => onUpload('music')}
    >
      {featuredTrack && (
        <div className="flex flex-col gap-6" data-media-feed="music">
          {(() => {
            const card = musicTrackToVCard(featuredTrack, unknownArtist);
            return (
              <VCard
                size="spotlight"
                mediaSlot={<IconTile icon={Music} size="lg" />}
                eyebrow={card.eyebrow}
                title={card.title}
                meta={card.meta}
                body={card.body}
                focused={isActive(featuredTrack.id)}
                actions={musicActions(featuredTrack, false)}
              />
            );
          })()}
          {visibleMusic.length > 1 && (
            <section aria-labelledby="media-more-tracks" className="flex flex-col gap-2">
              <SectionHeading id="media-more-tracks">{t('spotlightMedia.media.moreTracks')}</SectionHeading>
              <ul className="flex flex-col gap-2">
                {visibleMusic
                  .filter((tr) => tr.id !== featuredTrack.id)
                  .map((track) => {
                    const card = musicTrackToVCard(track, unknownArtist);
                    return (
                      <VCard
                        key={card.key}
                        as="li"
                        size="row"
                        mediaSlot={<IconTile icon={Music} size="sm" />}
                        title={card.title}
                        meta={card.meta}
                        focused={isActive(track.id)}
                        actions={musicActions(track, true)}
                      />
                    );
                  })}
              </ul>
            </section>
          )}
        </div>
      )}
    </ListState>
  );

  const podcastActions = (episode: PodcastEpisodeRecord, compact: boolean) => {
    const isCreator = !!currentUserId && episode.user_id === currentUserId;
    if (compact) {
      return <PlayToggle playing={isActive(episode.id)} title={episode.title} onClick={() => onTogglePodcast(episode)} size="icon" />;
    }
    return (
      <>
        <PlayToggle playing={isActive(episode.id)} title={episode.title} onClick={() => onTogglePodcast(episode)} />
        <PodcastFavoriteButton episodeId={episode.id} userId={currentUserId} />
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 rounded-full"
          aria-label={t('spotlightMedia.media.share')}
          onClick={() => void shareMediaLink(episode.title, `${window.location.origin}/comm/media-hub?podcast=${episode.id}`)}
        >
          <Share2 className="h-4 w-4" />
        </Button>
        {isCreator && (
          <Button size="sm" variant="ghost" className="gap-1.5 rounded-full text-destructive" onClick={() => onDeletePodcast(episode.id)}>
            <Trash2 className="h-4 w-4" />
            {t('spotlightMedia.media.delete')}
          </Button>
        )}
      </>
    );
  };

  const podcastsStage = (
    <ListState
      status={podcastsStatus}
      onRetry={onRetryPodcasts}
      emptyTitleKey="spotlightMedia.media.empty.podcastsTitle"
      emptyDescKey="mediaHub.noPodcastsDesc"
      emptyIcon={Podcast}
      isEmpty={!featuredEpisode}
      query={query}
      onClearQuery={clearQuery}
      onEmptyAction={() => onUpload('podcast')}
    >
      {featuredEpisode && (
        <div className="flex flex-col gap-6" data-media-feed="podcasts">
          {(() => {
            const card = podcastToVCard(featuredEpisode, unknownHost);
            return (
              <VCard
                size="spotlight"
                media={card.media}
                priority
                eyebrow={card.eyebrow}
                title={card.title}
                meta={card.meta}
                body={card.body}
                focused={isActive(featuredEpisode.id)}
                actions={podcastActions(featuredEpisode, false)}
              />
            );
          })()}
          {visiblePodcasts.length > 1 && (
            <section aria-labelledby="media-more-episodes" className="flex flex-col gap-2">
              <SectionHeading id="media-more-episodes">{t('spotlightMedia.media.moreEpisodes')}</SectionHeading>
              <ul className="flex flex-col gap-2">
                {visiblePodcasts
                  .filter((ep) => ep.id !== featuredEpisode.id)
                  .map((episode) => {
                    const card = podcastToVCard(episode, unknownHost);
                    return (
                      <VCard
                        key={card.key}
                        as="li"
                        size="row"
                        media={card.media}
                        title={card.title}
                        meta={card.meta}
                        focused={isActive(episode.id)}
                        actions={podcastActions(episode, true)}
                      />
                    );
                  })}
              </ul>
            </section>
          )}
        </div>
      )}
    </ListState>
  );

  // ── Rail (compact + row only, SR-08) ────────────────────────────────────
  const playingTrack = music.find((tr) => tr.id === currentMediaId);
  const playingEpisode = podcasts.find((ep) => ep.id === currentMediaId);
  const railSections: React.ReactNode[] = [];

  if (playingTrack || playingEpisode) {
    const title = (playingTrack ?? playingEpisode)!.title;
    railSections.push(
      <section key="now" aria-labelledby="media-rail-now" className="flex flex-col gap-2">
        <SectionHeading id="media-rail-now">{t('spotlightMedia.media.nowPlaying')}</SectionHeading>
        <VCard
          size="compact"
          mediaSlot={
            playingEpisode?.thumbnail_url ? (
              <img src={playingEpisode.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <IconTile icon={playingTrack ? Music : Mic} size="sm" />
            )
          }
          title={title}
          meta={
            playingTrack
              ? musicTrackToVCard(playingTrack, unknownArtist).meta
              : podcastToVCard(playingEpisode!, unknownHost).meta
          }
          actions={
            <PlayToggle
              playing={isPlaying}
              title={title}
              size="icon"
              onClick={() => (playingTrack ? onToggleMusic(playingTrack) : onTogglePodcast(playingEpisode!))}
            />
          }
        />
      </section>,
    );
  }

  if (activeTab === 'shorts' && interestTags.length > 0) {
    railSections.push(
      <section key="filter" aria-labelledby="media-rail-filter" className="flex flex-col gap-2">
        <SectionHeading id="media-rail-filter">{t('spotlightMedia.media.interestFilter')}</SectionHeading>
        <VCard
          size="row"
          title={interestTags.join(', ')}
          actions={
            <Button size="sm" variant="ghost" className="rounded-full" onClick={onClearInterestFilter}>
              {t('mediaHub.actions.clearFilters')}
            </Button>
          }
        />
      </section>,
    );
  }

  const railMusic = activeTab !== 'music' ? music.filter((tr) => tr.id !== currentMediaId).slice(0, RAIL_LIMIT) : [];
  const railEpisodes = activeTab !== 'podcasts' ? podcasts.filter((ep) => ep.id !== currentMediaId).slice(0, RAIL_LIMIT) : [];
  const railShows = activeTab !== 'shorts' ? popularShows.slice(0, RAIL_LIMIT) : [];

  if (railEpisodes.length > 0) {
    railSections.push(
      <section key="episodes" aria-labelledby="media-rail-episodes" className="flex flex-col gap-2">
        <SectionHeading id="media-rail-episodes">{t('mediaHub.sections.latestEpisodes')}</SectionHeading>
        <ul className="flex flex-col gap-2">
          {railEpisodes.map((episode) => {
            const card = podcastToVCard(episode, unknownHost);
            return (
              <VCard key={card.key} as="li" size="row" media={card.media} title={card.title} meta={card.meta} actions={podcastActions(episode, true)} />
            );
          })}
        </ul>
      </section>,
    );
  }
  if (railMusic.length > 0) {
    railSections.push(
      <section key="music" aria-labelledby="media-rail-music" className="flex flex-col gap-2">
        <SectionHeading id="media-rail-music">{t('spotlightMedia.media.latestMusic')}</SectionHeading>
        <ul className="flex flex-col gap-2">
          {railMusic.map((track) => {
            const card = musicTrackToVCard(track, unknownArtist);
            return (
              <VCard
                key={card.key}
                as="li"
                size="row"
                mediaSlot={<IconTile icon={Music} size="sm" />}
                title={card.title}
                meta={card.meta}
                actions={musicActions(track, true)}
              />
            );
          })}
        </ul>
      </section>,
    );
  }
  if (railShows.length > 0) {
    railSections.push(
      <section key="shows" aria-labelledby="media-rail-shows" className="flex flex-col gap-2">
        <SectionHeading id="media-rail-shows">{t('mediaHub.sections.popularShows')}</SectionHeading>
        <ul className="flex flex-col gap-2">
          {railShows.map((show) => (
            <VCard
              key={`${show.show_name}-${show.host_name}`}
              as="li"
              size="row"
              mediaSlot={<IconTile icon={Mic} size="sm" />}
              title={show.show_name}
              meta={joinMeta(show.host_name, t('spotlightMedia.media.episodeCount', { count: fmtNumber(show.episode_count) }))}
              actions={<ShowSubscribeButton show={show} userId={currentUserId} />}
            />
          ))}
        </ul>
      </section>,
    );
  }

  const anyLoading = shortsStatus === 'loading' || musicStatus === 'loading' || podcastsStatus === 'loading';
  const rail =
    railSections.length > 0 ? (
      railSections
    ) : anyLoading ? (
      <>
        <VCardSkeleton size="compact" />
        <VCardSkeleton size="row" />
      </>
    ) : (
      <p className="px-1 text-sm text-muted-foreground">{t('spotlightMedia.media.empty.railTitle')}</p>
    );

  const frame: SpotlightFrameParts['frame'] = {
    subNav: { items: communityNavigation },
    header: { title: t('mediaHub.title'), description: t('mediaHub.discoverContent') },
    utility: {
      children: (
        <>
          <ExpandableSearchButton placeholder={t('mediaHub.searchPlaceholder')} onSearch={setQuery} onClear={clearQuery} />
          <UniversalCalendarButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('mediaHub.actions.upload')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Video className="me-2 h-4 w-4" />
                  {t('mediaHub.menu.video')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onUpload('video')}>{t('mediaHub.menu.singleUpload')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={onBulkUpload}>{t('mediaHub.menu.bulkUpload')}</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={() => onUpload('music')}>
                <Music className="me-2 h-4 w-4" />
                {t('mediaHub.menu.music')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpload('podcast')}>
                <Mic className="me-2 h-4 w-4" />
                {t('mediaHub.menu.podcast')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ),
    },
    tabs: {
      value: activeTab,
      onValueChange: (v) => onTabChange(v as MediaTab),
      items: TAB_ITEMS.map((item) => ({ value: item.value, label: t(item.key) })),
      ariaLabel: t('spotlightMedia.media.tabsLabel'),
    },
    rail,
  };

  const stage = (
    <div ref={stageRef} data-media-tab={activeTab}>
      {activeTab === 'shorts' ? shortsStage : activeTab === 'music' ? musicStage : podcastsStage}
    </div>
  );

  return renderFrame({ frame, stage });
}

