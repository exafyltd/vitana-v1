/**
 * VTID-05297 (Native Wave 2, home-feed lane) — the feed's community-post card,
 * a token-styled twin of the web `NewsFeedItemCard`'s post branch (the
 * mobile-web layout). Author row (avatar + name + relative time), the
 * motivational-impulse label (`motivationKeyFor`, through the feed port), the
 * caption, an optional 16:9 media preview, and the like/comment counts. The
 * web card's inline like button and comments sheet belong to a later home FEAT
 * (documented in the FEAT findings); this card is presentational and opens the
 * post on press. React 19: typed with `ReactElement`.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, BottomSheet, Button, Icon, Text, useUITheme } from '../../../ports/ui';
import { radius } from '../../../ports/tokens';
import { motivationKeyFor, type PostFeedItem } from '../../../ports/feed';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatTimeAgo } from './time';

function initialOf(name: string): string {
  return (name || '•').trim().charAt(0).toUpperCase();
}

/**
 * `autoOpenComments` mirrors the web `CommunityPostCard`'s prop (VTID-03744):
 * the `/home/comments` deep link flips it true on the first commentable post so
 * the comments sheet opens on arrival, and a later re-render with the prop still
 * true must NOT re-force a sheet the member closed — so we open only on the
 * false→true edge (tracked by a ref), never on every true render. The native
 * comments data layer (reading/writing comments) is a later home FEAT (the web
 * card's full comment thread + reply + like); this sheet opens to the post's
 * comment count and hands off to the full post view, so the deep link lands
 * somewhere real today without a comments backend the lane has not built.
 */
export function CommunityPostCard({
  item,
  onPress,
  autoOpenComments,
}: {
  item: PostFeedItem;
  onPress: () => void;
  autoOpenComments?: boolean;
}): ReactElement {
  const { colors } = useUITheme();
  const { t, locale } = useI18n();
  const media = item.image_url || item.video_url || null;
  const motivation = t(motivationKeyFor(item));
  const timestamp = formatTimeAgo(item.published_at, locale);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const wasAutoOpen = useRef(false);
  useEffect(() => {
    if (autoOpenComments && !wasAutoOpen.current) setCommentsOpen(true);
    wasAutoOpen.current = !!autoOpenComments;
  }, [autoOpenComments]);

  return (
    <Pressable
      testID={`feed-post-${item.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.author_name}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.header}>
        <Avatar uri={item.author_avatar ?? undefined} fallback={initialOf(item.author_name)} size={40} />
        <View style={styles.fill}>
          <Text weight="600" numberOfLines={1}>
            {item.author_name}
          </Text>
          <View style={styles.metaRow}>
            {motivation ? (
              <Text variant="label" style={{ color: colors.primary }} numberOfLines={1}>
                {motivation}
              </Text>
            ) : null}
            {motivation && timestamp ? (
              <Text variant="caption" muted>
                •
              </Text>
            ) : null}
            {timestamp ? (
              <Text variant="caption" muted>
                {timestamp}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {item.content ? (
        <Text variant="body" numberOfLines={6} style={styles.content}>
          {item.content}
        </Text>
      ) : null}

      {media ? (
        <View style={[styles.media, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
          <Image
            testID={`feed-post-${item.id}-media`}
            source={{ uri: media }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            accessibilityIgnoresInvertColors
          />
          {item.video_url ? (
            <View style={[styles.videoBadge, { backgroundColor: colors.primary }]}>
              <Icon name="Video" size={14} color={colors.primaryForeground} />
              <Text variant="caption" color={colors.primaryForeground}>
                {t('newsNative.post.video')}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Icon name="Heart" size={16} color={colors.mutedForeground} />
          <Text variant="caption" muted>
            {t('newsNative.post.likes', { count: item.likes_count })}
          </Text>
        </View>
        <Pressable
          style={styles.stat}
          onPress={() => setCommentsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('homeNative.comments.open')}
          testID={`feed-post-${item.id}-comments`}
        >
          <Icon name="MessageSquare" size={16} color={colors.mutedForeground} />
          <Text variant="caption" muted>
            {t('newsNative.post.comments', { count: item.comments_count })}
          </Text>
        </Pressable>
      </View>

      <BottomSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        title={t('homeNative.comments.title')}
        testID={`feed-post-${item.id}-comments-sheet`}
      >
        <Text variant="body" muted>
          {t('newsNative.post.comments', { count: item.comments_count })}
        </Text>
        <Button size="sm" onPress={onPress} testID={`feed-post-${item.id}-comments-open-post`}>
          {t('homeNative.comments.openPost')}
        </Button>
      </BottomSheet>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, gap: 12 },
  pressed: { opacity: 0.9 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fill: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  content: { lineHeight: 20 },
  media: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden' },
  videoBadge: {
    position: 'absolute',
    bottom: 8,
    start: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
