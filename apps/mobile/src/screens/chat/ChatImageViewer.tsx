/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the
 * full-screen picture viewer, native twin of web
 * `src/components/messages/ChatImageViewer.tsx` (VTID-05138 / VTID-05316):
 * dark full screen, close, the file name and "n of m", a swipe between the
 * message's pictures and videos (paged list, starting at the tapped one),
 * pinch / double-tap zoom and drag of a zoomed picture,
 * previous / next arrows on a video, and the toolbar: Download (opens the
 * file in the system viewer), Copy picture, Share picture (system share
 * sheet), Forward (opens the forward sheet above the viewer).
 * Copy picture puts the picture itself on the clipboard (expo-clipboard);
 * a video plays inside the viewer with the system controls (expo-video) and
 * has no copy / share, like the web.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Image, Modal, Pressable, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { notify, notifyError, Text, useUITheme } from '../../ports/ui';
import { ChatIcon } from '../../ports/chat';
import { getChatDevice } from '../../ports/chat-device';
import { useI18n } from '../../i18n/I18nProvider';

export type ChatViewerImage = { url: string; filename: string; kind: 'image' | 'video' };

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2.5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * One picture: pinch to zoom (1–4×), drag a zoomed picture, double tap toggles
 * the zoom (ChatImageViewer.tsx pointer handlers). At normal size the page
 * swipe of the list moves between pictures.
 */
function ZoomableImage({ uri, label, onZoomChange }: { uri: string; label: string; onZoomChange: (zoomed: boolean) => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const state = useRef({ scale: 1, startScale: 1, x: 0, y: 0, startX: 0, startY: 0 });
  const apply = (next: number) => {
    state.current.scale = next;
    scale.setValue(next);
    if (next === MIN_SCALE) {
      state.current.x = 0;
      state.current.y = 0;
      tx.setValue(0);
      ty.setValue(0);
    }
    onZoomChange(next > MIN_SCALE);
  };
  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        state.current.startScale = state.current.scale;
      })
      .onUpdate((e) => apply(clamp(state.current.startScale * e.scale, MIN_SCALE, MAX_SCALE)));
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minPointers(1)
      .onStart(() => {
        state.current.startX = state.current.x;
        state.current.startY = state.current.y;
      })
      .onUpdate((e) => {
        if (state.current.scale <= MIN_SCALE) return;
        state.current.x = state.current.startX + e.translationX;
        state.current.y = state.current.startY + e.translationY;
        tx.setValue(state.current.x);
        ty.setValue(state.current.y);
      });
    const doubleTap = Gesture.Tap()
      .withTestId('chat-image-viewer-zoom')
      .runOnJS(true)
      .numberOfTaps(2)
      .onEnd(() => apply(state.current.scale > MIN_SCALE ? MIN_SCALE : DOUBLE_TAP_SCALE));
    return Gesture.Simultaneous(pinch, pan, doubleTap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.image, { transform: [{ translateX: tx }, { translateY: ty }, { scale }] }]}>
        <Image source={{ uri }} style={styles.fill} resizeMode="contain" accessibilityLabel={label} testID="chat-image-viewer-image" />
      </Animated.View>
    </GestureDetector>
  );
}

export async function copyImageAndNotify(url: string): Promise<'copied' | 'unsupported' | 'failed'> {
  const device = getChatDevice();
  if (!url || !device.canCopyImages) {
    notifyError('screens.messages.imageCopyUnsupported');
    return 'unsupported';
  }
  try {
    await device.copyImage(url);
    notify('screens.messages.imageCopied');
    return 'copied';
  } catch {
    notifyError('screens.messages.imageCopyFailed');
    return 'failed';
  }
}

export async function downloadChatFile(url: string): Promise<void> {
  if (!url) {
    notifyError('screens.messages.imageDownloadFailed');
    return;
  }
  try {
    await getChatDevice().openUrl(url);
  } catch {
    notifyError('screens.messages.imageDownloadFailed');
  }
}

export function ChatImageViewer({ images, initialIndex, onClose, onForward }: { images: ChatViewerImage[]; initialIndex: number; onClose: () => void; onForward?: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)));
  const [zoomed, setZoomed] = useState(false);
  const list = useRef<FlatList<ChatViewerImage>>(null);
  const count = images.length;
  const Video = getChatDevice().VideoPlayerView;
  const current = images[index];
  const isVideo = current?.kind === 'video';

  useEffect(() => {
    if (index > 0) list.current?.scrollToIndex?.({ index, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (dir: 1 | -1) => {
    const next = Math.min(count - 1, Math.max(0, index + dir));
    setIndex(next);
    list.current?.scrollToIndex?.({ index: next, animated: true });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (next !== index && next >= 0 && next < count) setIndex(next);
  };

  const tool = (icon: string, label: string, onPress: () => void, testID: string) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.tool} testID={testID}>
      <ChatIcon name={icon} size={20} color={colors.background} />
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.foreground }]} accessibilityViewIsModal accessibilityLabel={t('screens.messages.imageViewer')} testID="chat-image-viewer">
        <View style={styles.bar}>
          {tool('X', t('screens.messages.close'), onClose, 'chat-image-viewer-close')}
          <View style={styles.titleBox}>
            <Text numberOfLines={1} style={[styles.name, { color: colors.background }]}>
              {current?.filename}
            </Text>
            {count > 1 ? (
              <Text style={[styles.counter, { color: colors.background }]} testID="chat-image-viewer-counter">
                {t('screens.messages.imageCounter', { current: index + 1, total: count })}
              </Text>
            ) : null}
          </View>
          {tool('Download', t('screens.messages.downloadImage'), () => current && void downloadChatFile(current.url), 'chat-image-viewer-download')}
          {!isVideo ? tool('Copy', t('screens.messages.copyImage'), () => current && void copyImageAndNotify(current.url), 'chat-image-viewer-copy') : null}
          {!isVideo
            ? tool('Share2', t('screens.messages.shareImage'), () => {
                if (!current) return;
                void getChatDevice()
                  .share({ url: current.url })
                  .then((r) => r === 'failed' && notifyError('screens.messages.imageShareFailed'));
              }, 'chat-image-viewer-share')
            : null}
          {onForward ? tool('Forward', t('screens.messages.forward'), onForward, 'chat-image-viewer-forward') : null}
        </View>
        <FlatList
          ref={list}
          data={images}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(img, i) => `${img.url}-${i}`}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          initialScrollIndex={index}
          onMomentumScrollEnd={onScrollEnd}
          testID="chat-image-viewer-stage"
          renderItem={({ item }) => (
            <View style={[styles.page, { width }]}>
              {item.kind === 'video' ? (
                index === images.indexOf(item) ? (
                  <View style={styles.image} accessibilityLabel={item.filename || t('inbox.media.video')}>
                    <Video uri={item.url} testID="chat-image-viewer-video" />
                  </View>
                ) : (
                  <View style={styles.image} />
                )
              ) : item.url ? (
                <ZoomableImage uri={item.url} label={item.filename} onZoomChange={setZoomed} />
              ) : (
                <View style={styles.image} accessibilityLabel={t('screens.messages.imageLoading')} />
              )}
            </View>
          )}
        />
        {count > 1 && index > 0 ? (
          <Pressable onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel={t('screens.messages.previousImage')} style={[styles.arrow, styles.start]} testID="chat-image-viewer-prev">
            <ChatIcon name="ChevronLeft" size={28} color={colors.background} flipInRtl />
          </Pressable>
        ) : null}
        {count > 1 && index < count - 1 ? (
          <Pressable onPress={() => go(1)} accessibilityRole="button" accessibilityLabel={t('screens.messages.nextImage')} style={[styles.arrow, styles.end]} testID="chat-image-viewer-next">
            <ChatIcon name="ChevronRight" size={28} color={colors.background} flipInRtl />
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingTop: 48, paddingBottom: 8 },
  titleBox: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
  name: { fontSize: 14, fontWeight: '500' },
  counter: { fontSize: 12, opacity: 0.7 },
  tool: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  fill: { width: '100%', height: '100%' },
  arrow: { position: 'absolute', top: '50%', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  start: { start: 8 },
  end: { end: 8 },
});
