/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the small
 * chat parts, native twins of web `src/components/messages/`:
 * MessageDivider (date / unread chip), TypingIndicator, ReplyQuote,
 * ReplyPreview, ReactionCluster, GroupAvatarStack, SwipeableMessage (swipe
 * towards the end to reply: 60 px threshold, 80 px max, vertical movement
 * cancels — SwipeableMessage.tsx:13-16) and ConversationErrorBoundary.
 * RTL-safe (logical start/end only); every string arrives translated.
 */
import { Component, useMemo, useRef, type ErrorInfo, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Avatar, Badge, Button, Text, useUITheme } from '../../ports/ui';
import { ChatIcon } from '../../ports/chat';
import { useI18n } from '../../i18n/I18nProvider';
import { typingText } from './text';
import type { ReactionSummary } from './data/useReactions';
import type { ChatViewMessage, ThreadParticipant } from './data/types';
import type { TypingUser } from './data/useTyping';

const initialOf = (name: string | null | undefined) => (name?.trim()[0] ?? '?').toUpperCase();

export function MessageDivider({ type, text, testID }: { type: 'date' | 'unread'; text: string; testID?: string }) {
  const { colors } = useUITheme();
  return (
    <View style={styles.divider} testID={testID ?? `divider-${type}`}>
      <View style={[styles.dividerChip, type === 'unread' ? { backgroundColor: colors.primary } : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
        <Text style={[styles.dividerText, { color: type === 'unread' ? colors.primaryForeground : colors.mutedForeground }]}>{text}</Text>
      </View>
    </View>
  );
}

export function TypingIndicator({ users }: { users: TypingUser[] }) {
  const { t } = useI18n();
  if (users.length === 0) return null;
  return (
    <View style={styles.typing} testID="typing-indicator">
      <View style={styles.typingAvatars}>
        {users.slice(0, 3).map((u) => (
          <Avatar key={u.id} uri={u.avatar} fallback={initialOf(u.name)} size={24} />
        ))}
      </View>
      <Text muted style={styles.small}>
        {typingText(
          users.map((u) => u.name),
          t,
        )}
      </Text>
    </View>
  );
}

export function ReplyQuote({
  parent,
  unavailable,
  isOwn,
  onPress,
}: {
  parent: ChatViewMessage | null;
  unavailable: boolean;
  isOwn: boolean;
  onPress?: () => void;
}) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tone = isOwn ? colors.primaryForeground : colors.primary;
  if (!parent) {
    if (unavailable) {
      return (
        <View style={[styles.quote, styles.quoteDashed, { borderColor: colors.border }]} testID="reply-quote-unavailable">
          <Text muted style={styles.small}>
            {t('inbox.reply.unavailable')}
          </Text>
        </View>
      );
    }
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('inbox.reply.jumpToOriginal')} style={[styles.quote, { borderStartColor: tone }]} testID="reply-quote-loading">
        <Text style={[styles.small, { color: tone }]}>{t('inbox.reply.loading')}</Text>
      </Pressable>
    );
  }
  const name = parent.sender?.display_name || t('inbox.reply.unknownSender');
  const body = parent.body || t('inbox.reply.noText');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('inbox.reply.jumpTo', { name })} style={[styles.quote, { borderStartColor: tone }]} testID="reply-quote">
      <Text style={[styles.small, styles.bold, { color: tone }]}>{name}</Text>
      <Text style={[styles.small, { color: isOwn ? colors.primaryForeground : colors.mutedForeground }]}>{body.length > 80 ? `${body.substring(0, 80)}...` : body}</Text>
    </Pressable>
  );
}

export function ReplyPreview({ message, currentUserId, onCancel }: { message: ChatViewMessage; currentUserId?: string; onCancel: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const isSelf = !!currentUserId && message.sender_id === currentUserId;
  const senderName = isSelf ? t('chatNative.reply.yourself') : message.sender?.display_name || t('callsNative.unknownUser');
  const content = message.body || t('chatNative.reply.contentUnavailable');
  return (
    <View style={[styles.replyPreview, { backgroundColor: colors.muted, borderStartColor: colors.primary }]} testID="reply-preview">
      <ChatIcon name="Reply" size={16} color={colors.primary} />
      <View style={styles.fill}>
        <Text style={[styles.small, styles.bold, { color: colors.primary }]}>{t('screens.messages.replyingSendername', { senderName })}</Text>
        <Text muted numberOfLines={1} style={styles.small}>
          {content.length > 100 ? `${content.substring(0, 100)}...` : content}
        </Text>
      </View>
      <Button variant="ghost" size="icon" onPress={onCancel} accessibilityLabel={t('screens.messages.cancelReply')} testID="reply-preview-cancel">
        <ChatIcon name="X" size={16} />
      </Button>
    </View>
  );
}

export function ReactionCluster({
  reactions,
  isOwn,
  onAdd,
  onRemove,
}: {
  reactions: ReactionSummary[];
  isOwn: boolean;
  onAdd: (emoji: string) => void;
  onRemove: (emoji: string) => void;
}) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  if (reactions.length === 0) return null;
  return (
    <View style={[styles.reactions, { justifyContent: isOwn ? 'flex-end' : 'flex-start' }]} testID="reaction-cluster">
      {reactions.map((r) => (
        <Pressable
          key={r.emoji}
          onPress={() => (r.hasUserReacted ? onRemove(r.emoji) : onAdd(r.emoji))}
          accessibilityRole="button"
          accessibilityLabel={t('chatNative.reactions.count', { count: r.count, emoji: r.emoji })}
          style={[styles.reactionPill, { borderColor: r.hasUserReacted ? colors.primary : colors.border, backgroundColor: colors.background }]}
          testID={`reaction-${r.emoji}`}
        >
          <Text style={styles.small}>{r.emoji}</Text>
          <Text muted style={[styles.small, styles.bold]}>
            {r.count}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function GroupAvatarStack({ participants, maxVisible = 3 }: { participants: ThreadParticipant[]; maxVisible?: number }) {
  const { colors } = useUITheme();
  if (participants.length <= 1) {
    const p = participants[0];
    return <Avatar uri={p?.avatar_url} fallback={p ? initialOf(p.display_name) : '?'} size={32} />;
  }
  const visible = participants.slice(0, maxVisible);
  const rest = Math.max(0, participants.length - maxVisible);
  return (
    <View style={styles.stack} testID="group-avatar-stack">
      {visible.map((p, i) => (
        <View key={p.user_id} style={[styles.stackItem, { borderColor: colors.background, zIndex: maxVisible - i }, i > 0 ? styles.overlap : null]}>
          <Avatar uri={p.avatar_url} fallback={initialOf(p.display_name)} size={32} />
        </View>
      ))}
      {rest > 0 ? (
        <View style={[styles.stackItem, styles.overlap, { borderColor: colors.background }]}>
          <Avatar fallback={`+${rest}`} size={32} />
        </View>
      ) : null}
    </View>
  );
}

export const SWIPE_THRESHOLD = 60;
export const MAX_SWIPE = 80;

/** Swipe a bubble towards the end to reply (web SwipeableMessage, touch only). */
export function SwipeableMessage({ children, onReply, testID }: { children: ReactNode; onReply: () => void; testID?: string }) {
  const { rtl } = useI18n();
  const { colors } = useUITheme();
  const x = useRef(new Animated.Value(0)).current;
  const dxRef = useRef(0);
  const sign = rtl ? -1 : 1;
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(testID ?? 'swipe-reply')
        .runOnJS(true)
        .activeOffsetX(rtl ? [-10, 1000] : [-1000, 10])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          const dx = Math.max(0, Math.min(sign * e.translationX, MAX_SWIPE));
          dxRef.current = dx;
          x.setValue(sign * dx);
        })
        .onEnd(() => {
          if (dxRef.current >= SWIPE_THRESHOLD) onReply();
          dxRef.current = 0;
          Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }),
    [onReply, rtl, sign, testID, x],
  );
  return (
    <View style={styles.swipeRoot}>
      <View style={[styles.swipeIcon, { backgroundColor: colors.muted }]} pointerEvents="none">
        <ChatIcon name="Reply" size={16} color={colors.primary} />
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

type BoundaryProps = { children: ReactNode; fallback: (reset: () => void) => ReactNode };

/** web ConversationErrorBoundary: a render error inside the conversation shows a retry card, not a blank screen. */
export class ConversationErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Reported by the global handler; the boundary only keeps the screen usable.
  }

  render() {
    if (this.state.failed) return this.props.fallback(() => this.setState({ failed: false }));
    return this.props.children;
  }
}

export function ConversationErrorCard({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.errorCard} testID="conversation-error">
      <Text style={styles.bold}>{t('screens.messages.conversationError')}</Text>
      <Text muted style={styles.small}>
        {t('screens.messages.failedLoadConversation')}
      </Text>
      <Button variant="outline" size="sm" onPress={onRetry} testID="conversation-error-retry">
        {t('screens.messages.tryAgain')}
      </Button>
    </View>
  );
}

export function StatusBadge({ text }: { text: string }) {
  return (
    <Badge variant="outline">
      <Text style={styles.small}>{text}</Text>
    </Badge>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  small: { fontSize: 12 },
  bold: { fontWeight: '600' },
  divider: { alignItems: 'center', marginVertical: 12 },
  dividerChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 2 },
  dividerText: { fontSize: 12, fontWeight: '500' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  typingAvatars: { flexDirection: 'row' },
  quote: { padding: 8, marginBottom: 8, borderRadius: 8, borderStartWidth: 4 },
  quoteDashed: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  replyPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8, borderStartWidth: 4 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  stack: { flexDirection: 'row' },
  stackItem: { borderWidth: 2, borderRadius: 999 },
  overlap: { marginStart: -4 },
  swipeRoot: { overflow: 'hidden' },
  swipeIcon: { position: 'absolute', start: 8, top: '50%', marginTop: -16, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  errorCard: { margin: 24, padding: 16, gap: 8, alignItems: 'center' },
});
