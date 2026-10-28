/**
 * VTID-05298 (Native Wave 2, news lane) — native twin of the web
 * `src/pages/PostDetail.tsx`: the single community post / video that like &
 * comment notifications deep-link into (`data.url = /post/<source>/<id>`).
 *
 * Fetches the one post (`profile_posts`) or video (`media_uploads`) by id with
 * the shell's injected Supabase client and the same shape the web
 * `fetchPost`/`fetchAuthor` build, then renders it as a native post card:
 * author, body, image (or video poster), like / comment counts. The web
 * renders the interactive `CommunityPostCard` the News feed owns (Home lane);
 * the reader keeps a self-contained, dependency-light view so the two lanes
 * stay disjoint. Loading / not-found (deleted) / error states mirror the web.
 *
 * `<video>` → poster image: `expo-video` is not a dependency of the native
 * app yet, and installing it is out of this offline port's scope (recorded
 * as a G1 follow-up). A video post shows its thumbnail with a "video" badge;
 * the actual player lands with the device-runtime pass. React 19
 * `ReactElement`.
 */
import type { ReactElement } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../auth/client';
import { Avatar, DelayedLoader, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import type { PostFeedItem } from './types';

export type PostSource = 'post' | 'media';

export function normalizePostSource(raw: string | string[] | undefined): PostSource {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'media' ? 'media' : 'post';
}

async function fetchAuthor(userId: string, communityMember: string): Promise<{ name: string; avatar: string | null }> {
  const { data } = await getSupabase()
    .from('global_community_profiles')
    .select('display_name, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();
  const row = data as { display_name?: string | null; avatar_url?: string | null } | null;
  return { name: row?.display_name || communityMember, avatar: row?.avatar_url ?? null };
}

/** Builds the same PostFeedItem shape the web feed produces, for one item. */
export async function fetchPost(source: PostSource, id: string, communityMember: string): Promise<PostFeedItem | null> {
  const supabase = getSupabase();
  if (source === 'media') {
    const { data, error } = await supabase
      .from('media_uploads')
      .select('id, user_id, title, description, file_url, thumbnail_url, likes_count, comments_count, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as Record<string, unknown>;
    const author = await fetchAuthor(String(row.user_id), communityMember);
    return {
      id: `media-${String(row.id)}`,
      kind: 'post',
      source: 'media',
      post_id: String(row.id),
      user_id: String(row.user_id),
      author_name: author.name,
      author_avatar: author.avatar,
      content: (row.title as string) || (row.description as string) || '',
      image_url: (row.thumbnail_url as string) ?? null,
      video_url: (row.file_url as string) ?? null,
      likes_count: Number(row.likes_count) || 0,
      comments_count: Number(row.comments_count) || 0,
      followed: false,
      tags: [],
      background_style: null,
      mentions: [],
      published_at: String(row.created_at),
    };
  }
  const { data, error } = await supabase.from('profile_posts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const author = await fetchAuthor(String(row.user_id), communityMember);
  return {
    id: `post-${String(row.id)}`,
    kind: 'post',
    source: 'post',
    post_id: String(row.id),
    user_id: String(row.user_id),
    author_name: author.name,
    author_avatar: author.avatar,
    content: (row.content as string) ?? '',
    image_url: (row.image_url as string) ?? null,
    video_url: (row.video_url as string) ?? null,
    likes_count: Number(row.likes_count) || 0,
    comments_count: Number(row.comments_count) || 0,
    background_style: (row.background_style as string) ?? null,
    mentions: Array.isArray(row.mentions) ? (row.mentions as PostFeedItem['mentions']) : [],
    followed: false,
    tags: [],
    published_at: String(row.created_at),
  };
}

function PostCard({ item }: { item: PostFeedItem }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const avatarLetter = (item.author_name || '•').charAt(0).toUpperCase();
  const media = item.image_url || (item.video_url ? item.image_url : null);
  return (
    <View testID="post-detail-card" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.authorRow}>
        <Avatar uri={item.author_avatar} fallback={avatarLetter} size={40} />
        <Text weight="600" numberOfLines={1} style={styles.authorName}>
          {item.author_name}
        </Text>
      </View>

      {item.content ? (
        <Text variant="body" style={styles.content}>
          {item.content}
        </Text>
      ) : null}

      {media ? (
        <View style={[styles.media, { backgroundColor: colors.muted }]}>
          <Image source={{ uri: media }} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors testID="post-detail-media" />
          {item.video_url ? (
            <View style={[styles.videoBadge, { backgroundColor: colors.background }]}>
              <Text variant="caption" weight="600">
                {t('newsNative.post.video')}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.counts}>
        <Text variant="caption" muted testID="post-detail-likes">
          {t('newsNative.post.likes', { count: item.likes_count })}
        </Text>
        <Text variant="caption" muted testID="post-detail-comments">
          {t('newsNative.post.comments', { count: item.comments_count })}
        </Text>
      </View>
    </View>
  );
}

export function PostDetailScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ source?: string; id?: string }>();
  const source = normalizePostSource(params.source);
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const communityMember = t('screens.home.communityMember');

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['post-detail', source, id],
    enabled: !!id,
    queryFn: () => fetchPost(source, id as string, communityMember),
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="post-detail">
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {t('screens.postDetail.title')}
        </Text>
      </View>

      {isLoading ? (
        <DelayedLoader accessibilityLabel={t('common.loading')} />
      ) : isError || !item ? (
        <View style={styles.center} testID="post-detail-not-found">
          <Text muted style={styles.centerBody}>
            {t('screens.postDetail.notFound')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} testID="post-detail-scroll">
          <PostCard item={item} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  centerBody: { textAlign: 'center' },
  body: { padding: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorName: { flexShrink: 1 },
  content: { lineHeight: 22 },
  media: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden' },
  videoBadge: { position: 'absolute', top: 8, end: 8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  counts: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
