/**
 * VTID-05677 — native twin of `MobileMusicList.tsx`: a row per approved track
 * with play / pause on the screen's audio player, a bookmark (heart) toggle and
 * a share button; the web empty state when there is no track (also while
 * loading or after an error, `MediaHub.tsx:1024`).
 */
import { StyleSheet, View } from 'react-native';
import { PressableRow, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { notify } from '../../ports/ui';
import { useMediaHubData, type MusicTrack } from '../../ports/media';
import { Heart, Music, Pause, Play, Share2 } from '../../ports/media-ui';
import { EmptyState } from './components';
import { formatDuration } from './model';
import type { PlayableMedia } from './player/useMediaAudio';
import { buildSharePayload, shareContent, trackShareUrl } from './share';

export const metaOf = <T,>(m: T[] | T | null | undefined): T | undefined => (Array.isArray(m) ? m[0] : (m ?? undefined));

export function MusicList({ tracks, currentMedia, isPlaying, playMedia, pause }: { tracks: MusicTrack[]; currentMedia: PlayableMedia | null; isPlaying: boolean; playMedia: (m: PlayableMedia) => void; pause: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const data = useMediaHubData();
  const bookmarks = data.useBookmarks();

  if (tracks.length === 0) {
    return <EmptyState testID="media-music-empty" icon={<Music size={32} color={colors.mutedForeground} />} title={t('screens.community.noMusicUploadedYet')} hint={t('screens.community.firstShare')} />;
  }

  return (
    <View style={styles.list} testID="media-music-list">
      {tracks.map((track) => {
        const meta = metaOf(track.music_metadata);
        const artist = meta?.artist_name || t('mediaHub.unknownArtist');
        const playing = currentMedia?.id === track.id && isPlaying;
        const bookmarked = bookmarks.isBookmarked('music', track.id);
        const onPlay = () => {
          if (playing) pause();
          else playMedia({ id: track.id, title: track.title, creator: artist, audioUrl: track.file_url, duration: track.duration || 0, mediaType: 'music' });
        };
        const onBookmark = async () => {
          const ok = await data.toggleBookmark({
            item_type: 'music',
            item_id: track.id,
            item_name: track.title,
            item_metadata: { artist, duration: track.duration, genre: meta?.genre, file_url: track.file_url, tags: track.tags || [] },
          });
          if (ok) notify(bookmarked ? 'toasts.hooks.removed' : 'toasts.hooks.bookmarked');
        };
        const onShare = () =>
          void shareContent(buildSharePayload(track.title, t('mediaHubNative.share.trackText', { title: track.title, artist }), trackShareUrl(track.id)));
        return (
          <View key={track.id} testID={`media-track-${track.id}`} style={[styles.row, { borderColor: playing ? colors.primary : colors.border, backgroundColor: playing ? colors.accent : colors.card }]}>
            <PressableRow onPress={onPlay} accessibilityLabel={t(playing ? 'mediaHubNative.a11y.pause' : 'mediaHubNative.a11y.playTrack', { title: track.title })} testID={`media-track-play-${track.id}`} style={styles.playButton}>
              {playing ? <Pause size={20} color={colors.primary} /> : <Play size={20} color={colors.foreground} />}
            </PressableRow>
            <View style={styles.info}>
              <Text weight="500" numberOfLines={1}>
                {track.title}
              </Text>
              <Text variant="caption" muted numberOfLines={1}>
                {artist}
              </Text>
              <Text variant="caption" muted numberOfLines={1}>
                {meta?.genre ? `${formatDuration(track.duration)} • ${meta.genre}` : formatDuration(track.duration)}
              </Text>
            </View>
            <PressableRow
              onPress={() => void onBookmark()}
              accessibilityLabel={t(bookmarked ? 'mediaHubNative.a11y.removeBookmark' : 'mediaHubNative.a11y.addBookmark', { title: track.title })}
              accessibilityState={{ selected: bookmarked }}
              testID={`media-track-bookmark-${track.id}`}
              style={styles.iconButton}
            >
              <Heart size={18} color={bookmarked ? colors.primary : colors.mutedForeground} fill={bookmarked ? colors.primary : 'none'} />
            </PressableRow>
            <PressableRow onPress={onShare} accessibilityLabel={t('mediaHubNative.a11y.shareTrack', { title: track.title })} testID={`media-track-share-${track.id}`} style={styles.iconButton}>
              <Share2 size={18} color={colors.mutedForeground} />
            </PressableRow>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingHorizontal: 16, paddingBottom: 96 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  playButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
