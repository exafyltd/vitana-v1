/**
 * VTID-05677 (native-wave2-media-hub-r2/media-hub) — native port of the mobile
 * web Media Hub (`src/pages/community/MediaHub.tsx`, the non-Spotlight
 * `useIsMobile()` branch; phones get no Spotlight, `useSpotlightEnabled.ts:49-50`).
 * Header and action rail, enrichment strip, and the Shorts / Music / Podcasts
 * body for the `tab` route param (`shorts` default, `?short=<id>` forces Shorts
 * and opens that short once the list has loaded, `MediaHub.tsx:236-247,458-489`).
 * All data goes through `MediaHubData` (`ports/media.ts`).
 *
 * Not ported (desktop-only on web): the video player modal, bulk upload, popular
 * shows and subscriptions, podcast delete, density control and filter chips.
 * Deferred to their owning lanes: the Vitana Index pill and the Autopilot
 * pending count.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Skeleton, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { useMediaHubData, type Short } from '../../ports/media';
import { DeleteShortSheet } from './DeleteShortSheet';
import { EditShortSheet } from './EditShortSheet';
import { EnrichmentStrip } from './EnrichmentStrip';
import { MediaActionRail, type MediaMode } from './MediaActionRail';
import { MusicList } from './MusicList';
import { PodcastList } from './PodcastList';
import { ShortsCarousel } from './ShortsCarousel';
import { ShortsFeed } from './ShortsFeed';
import { UploadSheet } from './UploadSheet';
import { toVideoShorts, type VideoShort } from './model';
import { useMediaAudio } from './player/useMediaAudio';

const MODES: readonly MediaMode[] = ['shorts', 'music', 'podcasts'];
const isMode = (v: unknown): v is MediaMode => typeof v === 'string' && (MODES as readonly string[]).includes(v);
const SHORTS_LIMIT = 100;
/** Where closing a deep-link-opened feed goes (web `MediaHub.tsx:1458`; native once the events-calendar lane ports it). */
export const DEEP_LINK_CLOSE_PATH = '/comm/events-meetups?tab=hot';

export function MediaHubScreen() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const data = useMediaHubData();
  const params = useLocalSearchParams<{ tab?: string; short?: string }>();
  const shortParam = typeof params.short === 'string' && params.short ? params.short : null;

  const [mode, setMode] = useState<MediaMode>(() => (shortParam ? 'shorts' : isMode(params.tab) ? params.tab : 'shorts'));
  useEffect(() => {
    // A ?short deep link stays on Shorts whatever stale ?tab came with it (`MediaHub.tsx:236`).
    if (!shortParam && isMode(params.tab)) setMode(params.tab);
  }, [params.tab, shortParam]);
  const changeMode = (next: MediaMode) => {
    setMode(next);
    router.setParams({ tab: next });
  };

  const shortsQuery = data.useShorts({ limit: SHORTS_LIMIT });
  const musicQuery = data.useMusic();
  const podcastsQuery = data.usePodcasts();
  const audio = useMediaAudio();
  const realShorts: Short[] = useMemo(() => shortsQuery.data ?? [], [shortsQuery.data]);
  const videoShorts = useMemo(() => toVideoShorts(realShorts, t), [realShorts, t]);

  const [feedIndex, setFeedIndex] = useState(-1);
  const [feedOpen, setFeedOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; src_url: string; thumbnail_url?: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Short | null>(null);
  const autoOpened = useRef(false);
  const deepLinkOpened = useRef(false);

  // ?short=<id>: open that short once the list has loaded, then drop the param.
  useEffect(() => {
    if (!shortParam || autoOpened.current || shortsQuery.isLoading) return;
    autoOpened.current = true;
    // Drop the one-shot param (web `setSearchParams` delete) and pin the tab to Shorts.
    router.setParams({ short: undefined, tab: 'shorts' });
    const idx = videoShorts.findIndex((v) => v.id === shortParam);
    if (idx === -1) return;
    setFeedIndex(idx);
    setFeedOpen(true);
    deepLinkOpened.current = true;
  }, [shortParam, shortsQuery.isLoading, videoShorts]);

  const closeFeed = () => {
    setFeedOpen(false);
    if (deepLinkOpened.current) {
      deepLinkOpened.current = false;
      navigateToWebPath(DEEP_LINK_CLOSE_PATH, { replace: true });
    }
  };
  const openEdit = (short: VideoShort) => {
    const full = realShorts.find((r) => r.id === short.id);
    if (full) setEditing(full);
  };
  const askDelete = (short: VideoShort) => {
    if (!short.id || !short.src_url) return;
    setToDelete({ id: short.id, src_url: short.src_url, thumbnail_url: short.thumbnail_url });
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await data.deleteShort(toDelete);
      notify('mediaHub.toast.videoDeleted', 'mediaHub.toast.videoDeletedDesc');
      setToDelete(null);
      setFeedOpen(false);
      shortsQuery.refetch();
    } catch {
      notifyError('mediaHub.toast.deleteError', 'mediaHub.toast.deleteErrorDesc');
    } finally {
      setDeleting(false);
    }
  };
  const onUploaded = (type: 'music' | 'podcast' | 'video') => {
    if (type === 'video') shortsQuery.refetch();
    else if (type === 'music') musicQuery.refetch();
    else podcastsQuery.refetch();
    notify('mediaHub.toast.uploadSuccess', 'mediaHub.toast.uploadSuccessDesc', { type });
  };

  const sheets = (inModal: boolean) => (
    <>
      <DeleteShortSheet open={!!toDelete} busy={deleting} onCancel={() => setToDelete(null)} onConfirm={() => void confirmDelete()} inModal={inModal} />
      <EditShortSheet short={editing} onClose={() => setEditing(null)} onSaved={() => shortsQuery.refetch()} inModal={inModal} />
    </>
  );

  let body;
  if (mode === 'shorts') {
    body = (
      <ShortsCarousel
        shorts={videoShorts}
        currentUserId={user?.id}
        onShortClick={(index) => {
          setFeedIndex(index);
          setFeedOpen(true);
        }}
        onEdit={openEdit}
        onDelete={askDelete}
      />
    );
  } else if (mode === 'music') {
    body = <MusicList tracks={musicQuery.data ?? []} {...audio} />;
  } else {
    body = <PodcastList podcasts={podcastsQuery.data ?? []} {...audio} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="media-hub-screen">
      <ScrollView contentContainerStyle={styles.page} testID="media-hub-scroll">
        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">
            {t('mediaHub.title')}
          </Text>
          <Text muted>{t('mediaHub.discoverContent')}</Text>
        </View>
        <MediaActionRail mode={mode} onModeChange={changeMode} onUpload={() => setUploadOpen(true)} />
        <EnrichmentStrip />
        {mode === 'shorts' && shortsQuery.isLoading ? <Skeleton style={styles.skeleton} testID="media-shorts-loading" /> : null}
        {body}
      </ScrollView>
      {feedOpen ? (
        <ShortsFeed shorts={videoShorts} currentUserId={user?.id} onClose={closeFeed} initialIndex={feedIndex >= 0 ? feedIndex : 0} onEdit={openEdit} onDelete={askDelete} onCommentsChanged={() => shortsQuery.refetch()} overlay={sheets(true)} />
      ) : (
        sheets(false)
      )}
      <UploadSheet open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={onUploaded} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { gap: 8, paddingBottom: 24 },
  header: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  skeleton: { height: 4, marginHorizontal: 16 },
});
