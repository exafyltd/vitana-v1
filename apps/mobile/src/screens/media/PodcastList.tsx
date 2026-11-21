/**
 * VTID-05677 — native twin of `MobilePodcastList.tsx`: a row per approved
 * episode (thumbnail with a play / pause overlay, title, host, duration, age);
 * play only (delete is desktop-only on web: `currentUserId` is unused there,
 * `MobilePodcastList.tsx:30,33`); the web empty state when there is none.
 */
import { Image, StyleSheet, View } from 'react-native';
import { PressableRow, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { PodcastEpisode } from '../../ports/media';
import { Clock, Mic, Pause, Play } from '../../ports/media-ui';
import { formatTimeAgo } from '../home/cards/time';
import { EmptyState, ON_MEDIA } from './components';
import { formatDuration } from './model';
import { metaOf } from './MusicList';
import type { PlayableMedia } from './player/useMediaAudio';

export function PodcastList({ podcasts, currentMedia, isPlaying, playMedia, pause }: { podcasts: PodcastEpisode[]; currentMedia: PlayableMedia | null; isPlaying: boolean; playMedia: (m: PlayableMedia) => void; pause: () => void }) {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();

  if (podcasts.length === 0) {
    return <EmptyState testID="media-podcasts-empty" icon={<Mic size={32} color={colors.mutedForeground} />} title={t('screens.community.noPodcastsUploadedYet')} hint={t('screens.community.firstShare')} />;
  }

  return (
    <View style={styles.list} testID="media-podcasts-list">
      {podcasts.map((podcast) => {
        const meta = metaOf(podcast.podcast_metadata);
        const host = meta?.host_name || t('mediaHub.unknownHost');
        const playing = currentMedia?.id === podcast.id && isPlaying;
        const onPlay = () => {
          if (playing) pause();
          else playMedia({ id: podcast.id, title: podcast.title, creator: host, audioUrl: podcast.file_url, duration: podcast.duration || 0, mediaType: 'podcast' });
        };
        const age = podcast.created_at ? formatTimeAgo(podcast.created_at, locale) : '';
        return (
          <View key={podcast.id} testID={`media-podcast-${podcast.id}`} style={[styles.row, { borderColor: playing ? colors.primary : colors.border, backgroundColor: playing ? colors.accent : colors.card }]}>
            <View style={[styles.thumb, { backgroundColor: colors.muted }]}>
              {podcast.thumbnail_url ? <Image source={{ uri: podcast.thumbnail_url }} style={styles.thumbImage} accessibilityIgnoresInvertColors /> : <Mic size={32} color={colors.mutedForeground} />}
              <PressableRow onPress={onPlay} accessibilityLabel={t(playing ? 'mediaHubNative.a11y.pause' : 'mediaHubNative.a11y.playEpisode', { title: podcast.title })} testID={`media-podcast-play-${podcast.id}`} style={[styles.playOverlay, { backgroundColor: ON_MEDIA.scrimStrong }]}>
                {playing ? <Pause size={18} color={ON_MEDIA.glyph} /> : <Play size={18} color={ON_MEDIA.glyph} />}
              </PressableRow>
            </View>
            <View style={styles.info}>
              <Text weight="500" numberOfLines={2}>
                {podcast.title}
              </Text>
              <Text variant="caption" muted numberOfLines={1}>
                {host}
              </Text>
              <View style={styles.meta}>
                <Clock size={12} color={colors.mutedForeground} />
                <Text variant="caption" muted>
                  {formatDuration(podcast.duration)}
                </Text>
                {age ? (
                  <Text variant="caption" muted>
                    {`• ${age}`}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingHorizontal: 16, paddingBottom: 96 },
  row: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  thumb: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbImage: { ...StyleSheet.absoluteFill },
  playOverlay: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
