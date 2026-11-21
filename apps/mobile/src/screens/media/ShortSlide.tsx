/**
 * VTID-05677 — native twin of `MobileShortSlide.tsx`: one full-screen short.
 * `expo-video` plays it (looping; muted by the session's sound preference,
 * `sessionStorage 'shorts_audio_enabled'` on web); the thumbnail sits behind
 * while it loads, fails or stalls (5 s without progress → tap to retry). Tap
 * toggles play / pause, double tap likes. Top overlay: back, "Shorts" badge,
 * LIVE badge, owner kebab (edit / delete) and mute; right stack: like, comments,
 * share; bottom: creator, title, description, first three tags.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Avatar, Badge, Spinner, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { ArrowLeft, Heart, MessageCircle, Pause, Pencil, Play, RotateCcw, Share2, Trash2, Volume2, VolumeX } from '../../ports/media-ui';
import { MoreVerticalButton } from './KebabButton';
import { ON_MEDIA, ScrimButton } from './components';
import { ShortCommentsSheet } from './ShortCommentsSheet';
import { thumbnailSource, type VideoShort } from './model';

type VideoState = 'loading' | 'ready' | 'playing' | 'paused' | 'stalled' | 'error';
const STALL_MS = 5000;
const DOUBLE_TAP_MS = 300;

/** Sound preference of the session (web `sessionStorage 'shorts_audio_enabled'`): sound ON by default. */
let mutedPreference = false;
export const __resetMutedPreferenceForTests = () => {
  mutedPreference = false;
};

export function ShortSlide({
  video,
  isActive,
  height,
  onLike,
  onShare,
  onBack,
  isLiked,
  currentUserId,
  onDelete,
  onEdit,
  onCommentsChanged,
}: {
  video: VideoShort;
  isActive: boolean;
  height: number;
  onLike: () => void;
  onShare: () => void;
  onBack: () => void;
  isLiked: boolean;
  currentUserId?: string;
  onDelete?: () => void;
  onEdit?: () => void;
  onCommentsChanged?: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const insets = useSafeAreaInsets();
  const [muted, setMuted] = useState(mutedPreference);
  const [state, setState] = useState<VideoState>('loading');
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const stateRef = useRef<VideoState>('loading');
  stateRef.current = state;
  const lastTap = useRef(0);
  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSource = !!video.src_url;

  const player = useVideoPlayer(video.src_url ?? null, (p) => {
    p.loop = true;
    p.muted = mutedPreference;
  });

  const clearStall = useCallback(() => {
    if (stallTimer.current) clearTimeout(stallTimer.current);
    stallTimer.current = null;
  }, []);
  const startStall = useCallback(() => {
    clearStall();
    stallTimer.current = setTimeout(() => setState((prev) => (prev !== 'playing' && prev !== 'error' ? 'stalled' : prev)), STALL_MS);
  }, [clearStall]);
  useEffect(() => clearStall, [clearStall]);

  // Player events → slide state.
  useEffect(() => {
    if (!hasSource) return;
    const sub1 = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'loading') {
        setState((prev) => (prev === 'playing' ? prev : 'loading'));
        if (isActive) startStall();
      } else if (status === 'readyToPlay') {
        clearStall();
        setState((prev) => (prev === 'loading' || prev === 'stalled' ? 'ready' : prev));
      } else if (status === 'error') {
        clearStall();
        setState('error');
      }
    });
    const sub2 = player.addListener('playingChange', ({ isPlaying }: { isPlaying: boolean }) => {
      if (isPlaying) {
        clearStall();
        setState('playing');
      } else {
        setState((prev) => (prev === 'error' || prev === 'stalled' ? prev : 'paused'));
      }
    });
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [player, hasSource, isActive, startStall, clearStall]);

  // The active slide restarts and plays; the others pause at 0.
  useEffect(() => {
    if (!hasSource) return;
    if (isActive) {
      setState('loading');
      player.currentTime = 0;
      player.muted = muted;
      player.play();
      startStall();
    } else {
      player.pause();
      player.currentTime = 0;
      clearStall();
      setMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, hasSource, player]);

  const toggleMute = () => {
    const next = !muted;
    mutedPreference = next;
    setMuted(next);
    player.muted = next;
    if (!next) player.play();
  };
  const retry = () => {
    setState('loading');
    player.replace(video.src_url ?? null);
    player.play();
    startStall();
  };
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      onLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    setTimeout(() => {
      if (lastTap.current === 0 || Date.now() - lastTap.current < DOUBLE_TAP_MS) return;
      if (!hasSource) return;
      if (stateRef.current === 'playing') player.pause();
      else player.play();
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 500);
    }, DOUBLE_TAP_MS);
  };

  const source = thumbnailSource(video);
  const showThumb = !hasSource || state === 'loading' || state === 'error' || state === 'stalled';
  const isOwner = !!currentUserId && video.user_id === currentUserId && !!(onEdit || onDelete);
  const initials = video.creator.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.slide, { height }]} testID="short-slide">
      <Pressable style={StyleSheet.absoluteFill} onPress={onTap} accessibilityRole="button" accessibilityLabel={video.title} testID="short-slide-tap">
        {source && showThumb ? <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
        {hasSource ? <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} testID="short-video" /> : null}
        <View style={[StyleSheet.absoluteFill, styles.gradient]} pointerEvents="none" />
      </Pressable>

      {isActive && hasSource && state === 'loading' ? (
        <View style={styles.center} pointerEvents="none" testID="short-loading">
          <Spinner accessibilityLabel={t('screens.community.loadingShorts')} />
        </View>
      ) : null}
      {isActive && (state === 'error' || state === 'stalled') ? (
        <View style={styles.center}>
          <ScrimButton onPress={retry} label={state === 'error' ? t('mediaHubNative.video.failed') : t('mediaHubNative.video.buffering')} testID="short-retry" size={64}>
            <RotateCcw size={32} color={ON_MEDIA.glyph} />
          </ScrimButton>
          <Text size="sm" weight="500" style={{ color: ON_MEDIA.glyph }}>
            {state === 'error' ? t('mediaHubNative.video.failed') : t('mediaHubNative.video.buffering')}
          </Text>
        </View>
      ) : null}

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <ScrimButton onPress={onBack} label={t('mediaHubNative.a11y.closeFeed')} testID="short-back">
          <ArrowLeft size={20} color={ON_MEDIA.glyph} />
        </ScrimButton>
        <View style={styles.badges}>
          <Badge variant="secondary">{t('screens.community.shorts')}</Badge>
          {video.isLive ? <Badge variant="destructive">{t('screens.community.live')}</Badge> : null}
        </View>
        <View style={styles.topEnd}>
          {isOwner ? (
            <MoreVerticalButton onPress={() => setMenuOpen((v) => !v)} label={t('mediaHubNative.a11y.moreActions')} testID="short-kebab" tone="media" />
          ) : null}
          <ScrimButton onPress={toggleMute} label={t(muted ? 'mediaHubNative.a11y.unmute' : 'mediaHubNative.a11y.mute')} testID="short-mute">
            {muted ? <VolumeX size={20} color={ON_MEDIA.glyph} /> : <Volume2 size={20} color={ON_MEDIA.glyph} />}
          </ScrimButton>
        </View>
      </View>
      {isOwner && menuOpen ? (
        <View style={[styles.menu, { top: insets.top + 64, backgroundColor: colors.card, borderColor: colors.border }]} testID="short-kebab-menu">
          {onEdit ? (
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                onEdit();
              }}
              accessibilityRole="menuitem"
              accessibilityLabel={t('screens.community.editDetails')}
              testID="short-edit"
              style={styles.menuItem}
            >
              <Pencil size={16} color={colors.foreground} />
              <Text>{t('screens.community.editDetails')}</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                onDelete();
              }}
              accessibilityRole="menuitem"
              accessibilityLabel={t('screens.community.delete')}
              testID="short-delete"
              style={styles.menuItem}
            >
              <Trash2 size={16} color={colors.destructive} />
              <Text style={{ color: colors.destructive }}>{t('screens.community.delete')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions} pointerEvents="box-none">
        <View style={styles.action}>
          <ScrimButton onPress={onLike} label={t(isLiked ? 'mediaHubNative.a11y.unlike' : 'mediaHubNative.a11y.like')} testID="short-like" size={48}>
            <Heart size={24} color={ON_MEDIA.glyph} fill={isLiked ? ON_MEDIA.glyph : 'none'} />
          </ScrimButton>
          <Text size="xs" weight="500" style={{ color: ON_MEDIA.glyph }} testID="short-like-count">
            {String(video.likes)}
          </Text>
        </View>
        {video.id ? (
          <View style={styles.action}>
            <ScrimButton onPress={() => setShowComments(true)} label={t('mediaHubNative.a11y.comments')} testID="short-comments" size={48}>
              <MessageCircle size={24} color={ON_MEDIA.glyph} />
            </ScrimButton>
            <Text size="xs" weight="500" style={{ color: ON_MEDIA.glyph }} testID="short-comments-count">
              {String(video.commentsCount ?? 0)}
            </Text>
          </View>
        ) : null}
        <View style={styles.action}>
          <ScrimButton onPress={onShare} label={t('common.share')} testID="short-share" size={48}>
            <Share2 size={24} color={ON_MEDIA.glyph} />
          </ScrimButton>
          <Text size="xs" weight="500" style={{ color: ON_MEDIA.glyph }}>
            {t('common.share')}
          </Text>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]} pointerEvents="none">
        <View style={styles.creator}>
          <Avatar uri={video.creatorAvatar} fallback={initials} size={40} />
          <Text weight="600" style={{ color: ON_MEDIA.glyph }} numberOfLines={1}>
            {`@${video.creator}`}
          </Text>
        </View>
        <Text weight="500" numberOfLines={1} style={{ color: ON_MEDIA.glyph }}>
          {video.title}
        </Text>
        {video.description ? (
          <Text size="sm" numberOfLines={2} style={{ color: ON_MEDIA.glyphMuted }}>
            {video.description}
          </Text>
        ) : null}
        {video.tags && video.tags.length > 0 ? (
          <View style={styles.tags}>
            {video.tags.slice(0, 3).map((tag) => (
              <Text key={tag} size="xs" style={{ color: ON_MEDIA.glyphMuted }}>
                {`#${tag}`}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {showPlayIcon ? (
        <View style={styles.center} pointerEvents="none" testID="short-play-indicator">
          <View style={[styles.bigIcon, { backgroundColor: ON_MEDIA.scrim }]}>{state === 'playing' ? <Pause size={40} color={ON_MEDIA.glyph} /> : <Play size={40} color={ON_MEDIA.glyph} />}</View>
        </View>
      ) : null}
      {showHeart ? (
        <View style={styles.center} pointerEvents="none" testID="short-heart">
          <Heart size={96} color={colors.destructive} fill={colors.destructive} />
        </View>
      ) : null}

      <ShortCommentsSheet open={showComments} onClose={() => setShowComments(false)} videoId={video.id} videoTitle={video.title} onChanged={onCommentsChanged} inModal />
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { width: '100%', backgroundColor: '#000000', overflow: 'hidden' },
  gradient: { backgroundColor: 'rgba(0,0,0,0.25)' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 12 },
  top: { position: 'absolute', top: 0, start: 0, end: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menu: { position: 'absolute', end: 16, borderRadius: 8, borderWidth: 1, paddingVertical: 4, minWidth: 160, zIndex: 30 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  actions: { position: 'absolute', end: 16, bottom: 128, alignItems: 'center', gap: 24 },
  action: { alignItems: 'center', gap: 4 },
  bottom: { position: 'absolute', bottom: 0, start: 0, end: 0, paddingHorizontal: 16, gap: 4 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  bigIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
});
