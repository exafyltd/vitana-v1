/**
 * VTID-05677 — native twin of `MobileShortsFeed.tsx`: the full-screen vertical
 * feed. A native `Modal` over the shell (hides the bottom bar and the ORB, as
 * `document.body.dataset.shortsOpen` does on web, `MobileShortsFeed.tsx:48-51`);
 * Android back closes it (`onRequestClose`, web `popstate` `:52-62`). One paging
 * `FlatList` of `ShortSlide`s, the active index from the scroll offset, like with
 * optimistic ±1 adjustments (`:77-95`), share through the native share sheet
 * (`:97-123`) and progress dots for up to 10 shorts (`:178-190`).
 * `overlay` is drawn inside the modal: the edit / delete sheets opened from a
 * slide must live in the same native modal tree.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FlatList, Modal, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { notifyError, Spinner, Text } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useMediaHubData } from '../../ports/media';
import { ON_MEDIA } from './components';
import type { VideoShort } from './model';
import { buildSharePayload, shareContent, shortShareUrl } from './share';
import { ShortSlide } from './ShortSlide';

export function ShortsFeed({
  shorts,
  currentUserId,
  onClose,
  initialIndex = 0,
  onDelete,
  onEdit,
  onCommentsChanged,
  overlay,
}: {
  shorts: VideoShort[];
  currentUserId?: string;
  onClose: () => void;
  initialIndex?: number;
  onDelete?: (short: VideoShort) => void;
  onEdit?: (short: VideoShort) => void;
  onCommentsChanged?: () => void;
  overlay?: ReactNode;
}) {
  const { t } = useI18n();
  const data = useMediaHubData();
  const { height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [adjust, setAdjust] = useState<Map<string, number>>(new Map());
  const listRef = useRef<FlatList<VideoShort>>(null);

  useEffect(() => setAdjust(new Map()), [shorts]);

  const handleLike = useCallback(
    (videoId: string) => {
      const isLiking = !liked.has(videoId);
      setLiked((prev) => {
        const next = new Set(prev);
        if (isLiking) next.add(videoId);
        else next.delete(videoId);
        return next;
      });
      setAdjust((prev) => new Map(prev).set(videoId, (prev.get(videoId) ?? 0) + (isLiking ? 1 : -1)));
      void data.toggleLike({ videoId, action: isLiking ? 'like' : 'unlike' }).catch(() => undefined);
    },
    [data, liked],
  );

  const handleShare = useCallback(
    async (video: VideoShort) => {
      const url = video.id ? shortShareUrl(video.id) : null;
      const ok = await shareContent(buildSharePayload(video.title, t('mediaHubNative.share.shortText', { title: video.title, creator: video.creator }), url));
      if (!ok) notifyError('toasts.community.couldNotShare', 'toasts.community.pleaseTryAgain');
    },
    [t],
  );

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / height);
    if (index !== activeIndex && index >= 0 && index < shorts.length) setActiveIndex(index);
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent={false}>
      <SafeAreaProvider>
        <View style={styles.root} testID="shorts-feed">
          {shorts.length === 0 ? (
            <View style={styles.loading}>
              <Spinner accessibilityLabel={t('screens.community.loadingShorts')} />
              <Text style={{ color: ON_MEDIA.glyph }}>{t('screens.community.loadingShorts')}</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={shorts}
              keyExtractor={(item, index) => item.id ?? String(index)}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              initialScrollIndex={initialIndex < shorts.length ? initialIndex : 0}
              getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
              onMomentumScrollEnd={onScrollEnd}
              windowSize={3}
              maxToRenderPerBatch={2}
              initialNumToRender={1}
              testID="shorts-feed-list"
              renderItem={({ item, index }) => {
                const adjusted = item.likes + (adjust.get(item.id ?? '') ?? 0);
                return (
                  <ShortSlide
                    video={{ ...item, likes: Math.max(0, adjusted) }}
                    isActive={index === activeIndex}
                    height={height}
                    onLike={() => item.id && handleLike(item.id)}
                    onShare={() => void handleShare(item)}
                    onBack={onClose}
                    isLiked={item.id ? liked.has(item.id) : false}
                    currentUserId={currentUserId}
                    onDelete={onDelete ? () => onDelete(item) : undefined}
                    onEdit={onEdit ? () => onEdit(item) : undefined}
                    onCommentsChanged={onCommentsChanged}
                  />
                );
              }}
            />
          )}
          {shorts.length > 0 && shorts.length <= 10 ? (
            <View style={styles.dots} pointerEvents="none" testID="shorts-feed-dots">
              {shorts.map((_, index) => (
                <View key={index} style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotIdle]} />
              ))}
            </View>
          ) : null}
          {overlay}
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  dots: { position: 'absolute', top: 64, start: 0, end: 0, flexDirection: 'row', justifyContent: 'center', gap: 4, zIndex: 62 },
  dot: { height: 4, borderRadius: 2 },
  dotActive: { width: 24, backgroundColor: '#FFFFFF' },
  dotIdle: { width: 6, backgroundColor: 'rgba(255,255,255,0.4)' },
});
