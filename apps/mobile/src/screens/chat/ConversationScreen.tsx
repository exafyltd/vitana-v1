/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the 1:1
 * DM (`/inbox/u/:recipientId`, INBOX.CONVERSATION) and the thread form
 * (`/inbox/t/:threadId`), plus their `/msg/:messageId` deep links. Native twin
 * of the phone branch of web `src/pages/Messages.tsx` with a selected thread
 * (L1272-1300, CallProvider + CallManager L1274/L1425-1429) and
 * `src/components/messages/ConversationView.tsx` (community context):
 *
 *  - header: back, the peer's avatar (or the group's avatar stack, which opens
 *    the members panel), title, subtitle ("n members" for a group), and for a
 *    group the "Edit group" button (L1188-1296);
 *  - loading skeleton (L1157-1181), "Loading messages…" / "No messages yet"
 *    (L1310-1321), the list (MessageList), typing line, "Message failed to
 *    send" (L1504-1525), the composer with the "Message <name>…" placeholder;
 *  - reading the conversation marks it read (L486-520);
 *  - a deep-linked message is scrolled to and highlighted (L680-727).
 *
 * Not ported (see docs/validation/VTID-05458/verification.md): the
 * in-conversation search button + panel (L1245-1257), "Talk to Vitana"
 * (L1260-1271, no native ORB entry point in src/ports), the create-group
 * button (L1272-1281, the CreateGroupPopup twin is the inbox-list lane's),
 * the tenant ("Network") context, payment/calendar action handlers.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, notify, notifyError, Skeleton, Spinner, Text, useUITheme } from '../../ports/ui';
import { ChatIcon } from '../../ports/chat';
import { useAuth } from '../../auth/AuthProvider';
import { getSupabase } from '../../auth/client';
import { useTenant } from '../../identity/TenantProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { ChatFrame } from './ChatFrame';
import { ConversationErrorBoundary, ConversationErrorCard, GroupAvatarStack, TypingIndicator } from './components';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { GroupMembersModal } from './GroupMembersModal';
import { CallManager, CallProvider } from './calls/CallProvider';
import { fetchConversationAround } from './data/api';
import { chatMessageToView, composerPlaceholder, directThread, enrichProfiles, otherParticipant, participantName, resolveThread } from './data/thread';
import { useConversation } from './data/useConversation';
import { useTyping } from './data/useTyping';
import type { ChatViewMessage } from './data/types';

export type ConversationTarget = { kind: 'recipient'; id: string } | { kind: 'thread'; id: string };

export function ConversationScreen({ target, scrollToMessageId }: { target: ConversationTarget; scrollToMessageId?: string | null }) {
  const { user } = useAuth();
  const back = useCallback(() => navigateToWebPath('/inbox', { replace: true }), []);
  return (
    <ChatFrame onBack={back} testID="screen-conversation">
      <CallProvider userId={user?.id ?? ''}>
        <ConversationErrorBoundary fallback={(reset) => <ConversationErrorCard onRetry={reset} />}>
          <ConversationBody target={target} scrollToMessageId={scrollToMessageId ?? null} onBack={back} />
        </ConversationErrorBoundary>
        {user?.id ? <CallManager userId={user.id} /> : null}
      </CallProvider>
    </ChatFrame>
  );
}

function ConversationBody({ target, scrollToMessageId, onBack }: { target: ConversationTarget; scrollToMessageId: string | null; onBack: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const userId = user?.id;
  const [deepLinkId, setDeepLinkId] = useState<string | null>(scrollToMessageId);
  const [replyingTo, setReplyingTo] = useState<ChatViewMessage | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [unreadAnchor, setUnreadAnchor] = useState<{ threadId: string; id: string | null } | null>(null);

  useEffect(() => setDeepLinkId(scrollToMessageId), [scrollToMessageId]);

  const threadQuery = useQuery({
    queryKey: ['chat-thread', target.kind, target.id, userId],
    enabled: !!userId,
    queryFn: () => (target.kind === 'recipient' ? directThread(target.id, userId as string) : resolveThread(target.id, userId as string)),
  });
  const thread = threadQuery.data ?? null;
  const conv = useConversation(thread, userId);
  const { typingUsers, startTyping, stopTyping } = useTyping(thread?.id, userId);
  const isGroup = thread?.type === 'group';

  // The unread divider of this opening: the first unread message from someone else, frozen (L651-667).
  useEffect(() => {
    if (!thread || conv.messages.length === 0 || unreadAnchor?.threadId === thread.id) return;
    const first = conv.messages.find((m) => m.sender_id !== userId && m.read_at === null && !m.id.startsWith('temp-'));
    setUnreadAnchor({ threadId: thread.id, id: first?.id ?? null });
  }, [thread, conv.messages, unreadAnchor, userId]);

  const { markAsRead } = conv;
  useEffect(() => {
    if (thread && conv.messages.length > 0) markAsRead();
  }, [thread, conv.messages.length, markAsRead]);

  const peer = otherParticipant(thread, userId);
  const title = useMemo(() => {
    if (!thread) return t('chatNative.conversation.fallbackTitle');
    if (isGroup && thread.name) return thread.name;
    return participantName(peer, t('chatNative.conversation.fallbackTitle'));
  }, [thread, isGroup, peer, t]);
  const memberCount = thread?.participants.length ?? 0;
  const subtitle = isGroup ? `${memberCount} ${memberCount === 1 ? t('inbox.group.memberOne') : t('inbox.group.memberOther')}` : '';
  const myRole = thread?.participants.find((p) => p.user_id === userId)?.role ?? 'member';

  const loadAround = useCallback(
    async (messageId: string) => {
      if (!thread || isGroup) return false;
      const win = await fetchConversationAround(thread.id, messageId, 40).catch(() => null);
      if (!win || win.data.length === 0) return false;
      const profiles = await enrichProfiles(win.data.map((m) => m.sender_id));
      conv.mergeRows(win.data.map((m) => chatMessageToView(m, thread.id, profiles)));
      return true;
    },
    [thread, isGroup, conv],
  );

  const resolveParent = useCallback(
    async (messageId: string) => {
      if (!thread || isGroup) return null;
      const win = await fetchConversationAround(thread.id, messageId, 2);
      const row = win?.data.find((r) => r.id === messageId);
      if (!row) return null;
      const profiles = await enrichProfiles([row.sender_id]);
      return chatMessageToView(row, thread.id, profiles);
    },
    [thread, isGroup],
  );

  const table = isGroup ? 'global_messages' : 'chat_messages';
  const onEdit = useCallback(
    async (messageId: string, body: string) => {
      const { error } = await getSupabase().from(table).update({ content: body } as never).eq('id', messageId);
      if (error) {
        notifyError('toasts.messages.updateFailed', 'toasts.messages.failedUpdateMessagePleaseTryAgain');
        return;
      }
      await conv.refetch();
    },
    [table, conv],
  );
  const onDelete = useCallback(
    async (messageId: string) => {
      if (messageId.startsWith('temp-')) {
        conv.discard(messageId.slice('temp-'.length));
        return;
      }
      const { error } = await getSupabase().from(table).delete().eq('id', messageId);
      if (error) {
        notifyError('toasts.messages.deleteFailed', 'toasts.messages.failedDeleteMessagePleaseTryAgain');
        return;
      }
      notify('toasts.messages.messageDeleted');
      await conv.refetch();
    },
    [table, conv],
  );

  const header = (
    <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]} testID="conversation-header">
      <Button variant="ghost" size="sm" onPress={onBack} accessibilityLabel={t('inbox.group.back')} testID="conversation-back">
        <ChatIcon name="ArrowLeft" flipInRtl />
      </Button>
      {thread ? (
        isGroup ? (
          <Pressable onPress={() => setMembersOpen(true)} accessibilityRole="button" accessibilityLabel={t('screens.messages.editGroup')} testID="conversation-group-avatars">
            <GroupAvatarStack participants={thread.participants} />
          </Pressable>
        ) : (
          <Avatar uri={peer?.avatar_url} fallback={(title[0] || 'U').toUpperCase()} size={40} />
        )
      ) : (
        <Skeleton style={styles.avatarSkeleton} />
      )}
      <Pressable style={styles.titleBox} disabled={!isGroup} onPress={() => setMembersOpen(true)} accessibilityRole={isGroup ? 'button' : 'header'}>
        {thread ? (
          <>
            <Text style={styles.title} numberOfLines={1} testID="conversation-title">
              {title}
            </Text>
            {subtitle ? (
              <Text muted style={styles.subtitle} numberOfLines={1} testID="conversation-subtitle">
                {subtitle}
              </Text>
            ) : null}
          </>
        ) : (
          <Skeleton style={styles.titleSkeleton} />
        )}
      </Pressable>
      {isGroup ? (
        <Button variant="outline" size="sm" onPress={() => setMembersOpen(true)} accessibilityLabel={t('screens.messages.editGroup')} testID="edit-group-button">
          <ChatIcon name="Settings2" />
        </Button>
      ) : null}
    </View>
  );

  const loadingConversation = !thread || (conv.isLoading && conv.messages.length === 0);

  return (
    <View style={styles.fill}>
      {header}
      <View style={styles.fill}>
        {threadQuery.isError || (conv.isError && conv.messages.length === 0) ? (
          <View style={styles.center} testID="conversation-load-error">
            <Text style={styles.title}>{t('screens.messages.failedLoadConversation')}</Text>
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                void threadQuery.refetch();
                void conv.refetch();
              }}
              testID="conversation-retry"
            >
              {t('screens.messages.tryAgain')}
            </Button>
          </View>
        ) : loadingConversation ? (
          <View style={styles.skeletons} testID="conversation-loading">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} style={[styles.bubbleSkeleton, i % 2 ? styles.end : null]} />
            ))}
          </View>
        ) : conv.messages.length === 0 ? (
          conv.isFetching ? (
            <View style={styles.center} testID="conversation-fetching">
              <Spinner />
              <Text muted>{t('screens.messages.loadingMessages')}</Text>
            </View>
          ) : (
            <View style={styles.center} testID="conversation-empty">
              <Text muted>{t('screens.messages.noMessagesYet')}</Text>
              <Text muted style={styles.subtitle}>
                {t('screens.messages.startConversation')}
              </Text>
            </View>
          )
        ) : (
          <MessageList
            messages={conv.messages}
            userId={userId}
            unreadAnchorId={unreadAnchor?.threadId === thread?.id ? unreadAnchor?.id : null}
            scrollToMessageId={deepLinkId}
            onTargetHandled={() => setDeepLinkId(null)}
            loadAround={loadAround}
            resolveParent={resolveParent}
            hasOlder={conv.hasOlder}
            loadingOlder={conv.loadingOlder}
            onLoadOlder={() => void conv.loadOlder()}
            onReply={(m) => {
              if (!m.id.startsWith('temp-')) setReplyingTo(m);
            }}
            onRetry={conv.retry}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </View>
      <View style={{ backgroundColor: colors.background }}>
        <TypingIndicator users={typingUsers} />
        <MessageInput
          placeholder={composerPlaceholder(thread, userId, t)}
          disabled={!thread}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          currentUserId={userId}
          onTypingStart={() => void startTyping()}
          onTypingStop={() => void stopTyping()}
          onSend={async (content, messageType, contentData, replyToId) => {
            setReplyingTo(null);
            await conv.send({ content, messageType, contentData, replyToMessageId: replyToId ?? null });
          }}
        />
      </View>
      {isGroup && thread ? (
        <GroupMembersModal
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          threadId={thread.legacyThreadId ?? thread.id}
          userId={userId}
          tenantId={(user?.user_metadata as { active_tenant_id?: string } | undefined)?.active_tenant_id ?? activeTenantId}
          context="global"
          currentUserRole={myRole}
          groupName={thread.name}
          createdBy={thread.created_by}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  titleBox: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '600' },
  subtitle: { fontSize: 12 },
  avatarSkeleton: { width: 40, height: 40, borderRadius: 20 },
  titleSkeleton: { width: 128, height: 16, borderRadius: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  skeletons: { flex: 1, padding: 16, gap: 12 },
  bubbleSkeleton: { width: '60%', height: 40, borderRadius: 16 },
  end: { alignSelf: 'flex-end' },
});
