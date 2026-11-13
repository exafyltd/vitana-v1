/**
 * VTID-05677 — native twin of `ShortCommentsSheet.tsx`: the comment list of a
 * short (top level + one level of replies), reply banner, like / delete per
 * comment, and the composer (or the sign-in line without a member). Reads and
 * writes go through `MediaHubData`; after a write the comments and the shorts
 * list are refetched.
 */
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, PressableRow, Spinner, Text, TextInput, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { useMediaHubData, type ShortComment } from '../../ports/media';
import { Heart, Send, X } from '../../ports/media-ui';
import { formatTimeAgo } from '../home/cards/time';
import { MediaSheet } from './components';

interface ReplyTarget {
  parentId: string;
  name: string;
}

export function ShortCommentsSheet({ open, onClose, videoId, videoTitle, onChanged, inModal }: { open: boolean; onClose: () => void; videoId?: string; videoTitle?: string; onChanged?: () => void; inModal?: boolean }) {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const data = useMediaHubData();
  const { comments, isLoading, refetch } = data.useShortComments(open ? videoId : undefined);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [busy, setBusy] = useState(false);

  const { topLevel, repliesByParent } = useMemo(() => {
    const top: ShortComment[] = [];
    const byParent = new Map<string, ShortComment[]>();
    for (const c of comments) {
      if (c.parent_id) byParent.set(c.parent_id, [...(byParent.get(c.parent_id) ?? []), c]);
      else top.push(c);
    }
    return { topLevel: top, repliesByParent: byParent };
  }, [comments]);

  if (!videoId) return null;
  const changed = () => {
    refetch();
    onChanged?.();
  };
  const close = () => {
    setReplyTo(null);
    onClose();
  };
  const submit = async () => {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      await data.addComment({ videoId, content, parentId: replyTo?.parentId ?? null });
      setText('');
      setReplyTo(null);
      changed();
    } catch {
      notifyError('mediaHub.toast.commentError', 'mediaHub.toast.commentErrorDesc');
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (c: ShortComment) => c.display_name || t('mediaHub.comments.member');
  const renderComment = (c: ShortComment, isReply: boolean) => {
    const name = nameOf(c);
    return (
      <View key={c.id} style={[styles.comment, isReply && styles.reply]} testID={`media-comment-${c.id}`}>
        <Avatar uri={c.avatar_url} fallback={name.slice(0, 1).toUpperCase()} size={isReply ? 28 : 32} />
        <View style={styles.commentBody}>
          <View style={[styles.bubble, { backgroundColor: colors.muted }]}>
            <Text size="xs" weight="600">
              {name}
            </Text>
            <Text size="sm">{c.content}</Text>
          </View>
          <View style={styles.commentMeta}>
            <Text variant="caption" muted>
              {formatTimeAgo(c.created_at, locale)}
            </Text>
            <PressableRow
              onPress={() => {
                if (!user) return;
                void data.toggleCommentLike({ videoId, commentId: c.id, liked: c.liked_by_me }).then(changed);
              }}
              disabled={!user}
              accessibilityLabel={t('mediaHub.comments.like')}
              accessibilityState={{ selected: c.liked_by_me, disabled: !user }}
              testID={`media-comment-like-${c.id}`}
              style={styles.metaButton}
            >
              <Heart size={14} color={c.liked_by_me ? colors.destructive : colors.mutedForeground} fill={c.liked_by_me ? colors.destructive : 'none'} />
              {c.likes_count > 0 ? (
                <Text variant="caption" muted>
                  {String(c.likes_count)}
                </Text>
              ) : null}
            </PressableRow>
            {user ? (
              <PressableRow onPress={() => setReplyTo({ parentId: c.parent_id ?? c.id, name })} accessibilityLabel={t('mediaHub.comments.reply')} testID={`media-comment-reply-${c.id}`} style={styles.metaButton}>
                <Text variant="caption" muted>
                  {t('mediaHub.comments.reply')}
                </Text>
              </PressableRow>
            ) : null}
            {user?.id === c.user_id ? (
              <PressableRow onPress={() => void data.deleteComment({ videoId, commentId: c.id }).then(changed)} accessibilityLabel={t('common.delete')} testID={`media-comment-delete-${c.id}`} style={styles.metaButton}>
                <Text variant="caption" muted>
                  {t('common.delete')}
                </Text>
              </PressableRow>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const title = comments.length > 0 ? `${t('mediaHub.comments.title')} ${comments.length}` : t('mediaHub.comments.title');
  return (
    <MediaSheet open={open} onClose={close} title={title} testID="media-comments" inModal={inModal} closeLabel={t('common.close')}>
      {videoTitle ? (
        <Text variant="caption" muted numberOfLines={1}>
          {videoTitle}
        </Text>
      ) : null}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {isLoading ? (
          <Spinner accessibilityLabel={t('loading.default')} />
        ) : topLevel.length === 0 ? (
          <View style={styles.empty} testID="media-comments-empty">
            <Text weight="500">{t('mediaHub.comments.empty')}</Text>
            <Text variant="caption" muted>
              {t('mediaHub.comments.beFirst')}
            </Text>
          </View>
        ) : (
          topLevel.map((c) => (
            <View key={c.id} style={styles.thread}>
              {renderComment(c, false)}
              {(repliesByParent.get(c.id) ?? []).map((r) => renderComment(r, true))}
            </View>
          ))
        )}
      </ScrollView>
      {replyTo ? (
        <View style={[styles.replyBanner, { backgroundColor: colors.muted }]} testID="media-comments-reply-banner">
          <Text variant="caption" muted numberOfLines={1} style={styles.flex}>
            {t('mediaHub.comments.replyingTo', { name: replyTo.name })}
          </Text>
          <PressableRow onPress={() => setReplyTo(null)} accessibilityLabel={t('mediaHub.comments.cancelReply')} testID="media-comments-cancel-reply">
            <X size={14} color={colors.mutedForeground} />
          </PressableRow>
        </View>
      ) : null}
      {user ? (
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('mediaHub.comments.placeholder')}
            accessibilityLabel={t('mediaHub.comments.placeholder')}
            editable={!busy}
            onSubmitEditing={() => void submit()}
            returnKeyType="send"
            testID="media-comments-input"
            style={styles.flex}
          />
          <Button size="icon" variant="secondary" onPress={() => void submit()} disabled={!text.trim() || busy} accessibilityLabel={t('mediaHub.comments.send')} testID="media-comments-send">
            <Send size={16} color={colors.primary} />
          </Button>
        </View>
      ) : (
        <Text muted style={styles.signIn} testID="media-comments-signin">
          {t('mediaHub.comments.signIn')}
        </Text>
      )}
    </MediaSheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 360 },
  listContent: { gap: 12, paddingVertical: 4 },
  thread: { gap: 8 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  reply: { marginStart: 40 },
  commentBody: { flex: 1, minWidth: 0 },
  bubble: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, marginTop: 2 },
  metaButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 4 },
  replyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  signIn: { textAlign: 'center', paddingVertical: 4 },
});
