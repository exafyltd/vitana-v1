/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the
 * message list shared by the DM and group screens: an inverted FlatList (the
 * newest message sits above the composer, like the web's scroll-to-bottom
 * opening, ConversationView.tsx:620-676) with
 *
 *  - day dividers and the frozen "Unread messages" divider before the first
 *    unread message from someone else (L651-667, L1369-1384);
 *  - one-sender groups (groupPositions: avatar + name on the first bubble,
 *    time on the last; the unread divider breaks a group, L1349-1351);
 *  - reply quotes resolved from the loaded rows, else fetched once
 *    (`resolveParent`, L414-451); a tap on a quote jumps to the original;
 *  - deep links `/msg/:messageId`: scroll the target to the middle and
 *    highlight it for 1.5 s; a target outside the loaded page is loaded with
 *    `loadAround` first (L693-727);
 *  - "Loading older messages…" / "Start of the conversation" at the top
 *    (L1323-1335), older pages when the top is reached.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Spinner, Text } from '../../ports/ui';
import { groupPositions, isGroupEnd, isGroupStart, type GroupPosition } from '../../ports/chat';
import { useChatText, sameDay } from './text';
import { MessageDivider, SwipeableMessage } from './components';
import { MessageBubble } from './MessageBubble';
import type { ChatViewMessage } from './data/types';

export const HIGHLIGHT_MS = 1500;

type Item =
  | { kind: 'date'; key: string; text: string }
  | { kind: 'unread'; key: string }
  | { kind: 'message'; key: string; message: ChatViewMessage; position: GroupPosition };

export interface MessageListProps {
  messages: ChatViewMessage[];
  userId?: string;
  /** Freeze the unread divider for this opening (DMs only; group rows have no read state). */
  unreadAnchorId?: string | null;
  scrollToMessageId?: string | null;
  onTargetHandled?: () => void;
  loadAround?: (messageId: string) => Promise<boolean>;
  resolveParent?: (messageId: string) => Promise<ChatViewMessage | null>;
  hasOlder?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
  onReply?: (m: ChatViewMessage) => void;
  onRetry?: (cid: string) => void;
  onEdit?: (id: string, body: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  testID?: string;
}

export function MessageList({
  messages,
  userId,
  unreadAnchorId,
  scrollToMessageId,
  onTargetHandled,
  loadAround,
  resolveParent,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onReply,
  onRetry,
  onEdit,
  onDelete,
  testID = 'message-list',
}: MessageListProps) {
  const { t, day } = useChatText();
  const listRef = useRef<FlatList<Item>>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [fetchedParents, setFetchedParents] = useState<Record<string, ChatViewMessage | null>>({});
  const triedAround = useRef<string | null>(null);
  const inFlight = useRef<Set<string>>(new Set());

  const items = useMemo<Item[]>(() => {
    const positions = groupPositions(messages, { breakBefore: (m) => !!unreadAnchorId && m.id === unreadAnchorId });
    const out: Item[] = [];
    messages.forEach((m, i) => {
      const prev = i > 0 ? messages[i - 1] : null;
      if (!prev || !sameDay(new Date(prev.created_at), new Date(m.created_at))) out.push({ kind: 'date', key: `date-${m.id}`, text: day(m.created_at) });
      if (unreadAnchorId && m.id === unreadAnchorId) out.push({ kind: 'unread', key: `unread-${m.id}` });
      out.push({ kind: 'message', key: m.id, message: m, position: positions[i] });
    });
    return out.reverse();
  }, [messages, unreadAnchorId, day]);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  useEffect(() => {
    if (!resolveParent) return;
    const missing = Array.from(
      new Set(
        messages
          .map((m) => m.reply_to_message_id || m.parent_message_id)
          .filter((id): id is string => !!id && !byId.has(id) && !(id in fetchedParents) && !inFlight.current.has(id)),
      ),
    ).slice(0, 10);
    missing.forEach((id) => {
      inFlight.current.add(id);
      void resolveParent(id)
        .then((row) => setFetchedParents((prev) => ({ ...prev, [id]: row })))
        .catch(() => undefined)
        .finally(() => inFlight.current.delete(id));
    });
  }, [messages, byId, fetchedParents, resolveParent]);

  const jumpTo = useCallback(
    async (messageId: string) => {
      const index = items.findIndex((it) => it.kind === 'message' && it.message.id === messageId);
      if (index >= 0) {
        listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: false });
        setHighlightId(messageId);
        return true;
      }
      return false;
    },
    [items],
  );

  useEffect(() => {
    if (!highlightId) return undefined;
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightId]);

  // Deep link: scroll to + highlight once the target is rendered; load the window around it when it is not.
  useEffect(() => {
    if (!scrollToMessageId || messages.length === 0) return;
    void jumpTo(scrollToMessageId).then((found) => {
      if (found) {
        onTargetHandled?.();
        return;
      }
      if (loadAround && triedAround.current !== scrollToMessageId) {
        triedAround.current = scrollToMessageId;
        void loadAround(scrollToMessageId).then((ok) => {
          if (!ok) onTargetHandled?.();
        });
      }
    });
  }, [scrollToMessageId, messages, jumpTo, loadAround, onTargetHandled]);

  const onQuote = useCallback(
    (id: string) => {
      void jumpTo(id).then((found) => {
        if (!found && loadAround) void loadAround(id).then(() => void jumpTo(id));
      });
    },
    [jumpTo, loadAround],
  );

  const renderItem = ({ item }: { item: Item }) => {
    if (item.kind === 'date') return <MessageDivider type="date" text={item.text} />;
    if (item.kind === 'unread') return <MessageDivider type="unread" text={t('inbox.newMessages.unread')} testID="unread-divider" />;
    const m = item.message;
    const isOwn = m.sender_id === userId;
    const parentId = m.parent_message_id || m.reply_to_message_id;
    const parent = parentId ? (byId.get(parentId) ?? fetchedParents[parentId] ?? null) : null;
    return (
      <View style={isGroupEnd(item.position) ? styles.gapEnd : styles.gapIn} testID={`msg-${m.id}`}>
        <SwipeableMessage onReply={() => onReply?.(m)} testID={`swipe-${m.id}`}>
          <MessageBubble
            message={m}
            isOwn={isOwn}
            userId={userId}
            showSender={!isOwn && isGroupStart(item.position)}
            showTime={isGroupEnd(item.position)}
            groupPosition={item.position}
            parent={parent}
            parentUnavailable={!!parentId && !parent && fetchedParents[parentId] === null}
            highlighted={highlightId === m.id}
            onReply={onReply}
            onRetry={onRetry}
            onJumpTo={onQuote}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </SwipeableMessage>
      </View>
    );
  };

  return (
    <FlatList
      ref={listRef}
      testID={testID}
      data={items}
      inverted
      keyExtractor={(it) => it.key}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onEndReachedThreshold={0.2}
      onEndReached={() => {
        if (hasOlder && !loadingOlder) onLoadOlder?.();
      }}
      onScrollToIndexFailed={(info) => {
        listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
        setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0.5, animated: false }), 50);
      }}
      ListFooterComponent={
        loadingOlder ? (
          <View style={styles.top} testID="loading-older">
            <Spinner />
            <Text muted style={styles.small}>
              {t('screens.messages.loadingOlderMessages')}
            </Text>
          </View>
        ) : !hasOlder && messages.length > 0 ? (
          <Text muted style={[styles.small, styles.center]} testID="conversation-start">
            {t('screens.messages.conversationStart')}
          </Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 8, paddingVertical: 4 },
  gapIn: { marginBottom: 2 },
  gapEnd: { marginBottom: 6 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  small: { fontSize: 12 },
  center: { textAlign: 'center', paddingVertical: 12 },
});
