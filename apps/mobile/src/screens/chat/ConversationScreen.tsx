/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the 1:1
 * DM (`/inbox/u/:recipientId`, INBOX.CONVERSATION) and the thread form
 * (`/inbox/t/:threadId`), plus their `/msg/:messageId` deep links. Native twin
 * of the phone branch of web `src/pages/Messages.tsx` with a selected thread
 * (L1272-1300, CallProvider + CallManager L1274/L1425-1429) and
 * `src/components/messages/ConversationView.tsx`:
 *
 *  - context: community (gateway DMs + legacy group threads) or, with
 *    `?context=tenant` (Messages.tsx:191-193, :219-221), the tenant
 *    ("Network") thread (data/useTenantConversation.ts);
 *  - header: back, the peer's avatar (or the group's avatar stack, which opens
 *    the members panel), title, subtitle ("n members" for a group), then
 *    Search this conversation (DMs, L1245), Edit group (groups), Talk to
 *    Vitana (the Vitana DM only, opens the ORB, L1273) and Create group with
 *    the peer (DMs, L1283);
 *  - loading skeleton, "Loading messages…" / "No messages yet", the list,
 *    typing line, the composer (emoji, attachments / wallet / calendar invite,
 *    voice) with "Message <name>…";
 *  - card actions: calendar Accept / Decline / Maybe (L910-1023: answer,
 *    calendar entry, the confirmation message, "Response sent"), quick
 *    replies (sent as a message), payment replies;
 *  - reading marks the conversation read; "I am viewing this DM" presence
 *    (`dm:<peer>`, L407); a deep-linked or searched message is scrolled to and
 *    highlighted (L680-727).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, notify, notifyError, Skeleton, Spinner, Text, useUITheme } from '../../ports/ui';
import { ChatIcon } from '../../ports/chat';
import { useActivateOrb } from '../../ports/orb-activate';
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
import { MessageSearchPanel } from './MessageSearchPanel';
import { CreateGroupSheet } from './CreateGroupSheet';
import { CallManager, CallProvider } from './calls/CallProvider';
import { fetchConversationAround } from './data/api';
import { chatMessageToView, composerPlaceholder, directThread, enrichProfiles, otherParticipant, participantName, resolveThread } from './data/thread';
import { useConversation } from './data/useConversation';
import { findTenantDirectThread, useTenantConversation } from './data/useTenantConversation';
import { useTyping } from './data/useTyping';
import { useChatViewingPresence } from './data/viewing';
import { isValidUUID, respondToLegacyInvite, type InviteResponse, type LegacyInviteData } from './data/calendar';
import { isVitanaBot, type ChatViewMessage } from './data/types';
import type { CardAction } from './bubble/Cards';

export type ConversationTarget = { kind: 'recipient'; id: string } | { kind: 'thread'; id: string };
export type MessageContext = 'global' | 'tenant';

export function ConversationScreen({ target, scrollToMessageId, context = 'global' }: { target: ConversationTarget; scrollToMessageId?: string | null; context?: MessageContext }) {
  const { user } = useAuth();
  const back = useCallback(() => navigateToWebPath('/inbox', { replace: true }), []);
  return (
    <ChatFrame onBack={back} testID="screen-conversation">
      <CallProvider userId={user?.id ?? ''}>
        <ConversationErrorBoundary fallback={(reset) => <ConversationErrorCard onRetry={reset} />}>
          <ConversationBody target={target} scrollToMessageId={scrollToMessageId ?? null} onBack={back} context={context} />
        </ConversationErrorBoundary>
        {user?.id ? <CallManager userId={user.id} /> : null}
      </CallProvider>
    </ChatFrame>
  );
}

/** The confirmation ConversationView sends after a calendar answer (L995-1003, message text unchanged). */
export const INVITE_RESPONSE_MESSAGES: Record<InviteResponse, (failed: boolean) => string> = {
  accepted: (failed) => (failed ? 'Event accepted ✅ - Response recorded (add event manually if needed)' : 'Event accepted ✅ - Added to your calendar'),
  declined: () => 'Event declined ❌',
  maybe: () => 'Responded "Maybe" ❓ - Marked as tentative',
};

function ConversationBody({ target, scrollToMessageId, onBack, context }: { target: ConversationTarget; scrollToMessageId: string | null; onBack: () => void; context: MessageContext }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const activateOrb = useActivateOrb();
  const userId = user?.id;
  const tenantId = (user?.user_metadata as { active_tenant_id?: string } | undefined)?.active_tenant_id ?? activeTenantId;
  const isTenant = context === 'tenant';
  const tenantDirect = useQuery({
    queryKey: ['tenant-direct-thread', target.id, userId, tenantId],
    enabled: isTenant && target.kind === 'recipient' && !!userId && !!tenantId,
    queryFn: () => findTenantDirectThread(target.id, userId as string, tenantId as string),
  });
  const tenantThreadId = isTenant ? (target.kind === 'thread' ? target.id : (tenantDirect.data ?? null)) : null;
  const [deepLinkId, setDeepLinkId] = useState<string | null>(scrollToMessageId);
  const [replyingTo, setReplyingTo] = useState<ChatViewMessage | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [unreadAnchor, setUnreadAnchor] = useState<{ threadId: string; id: string | null } | null>(null);

  useEffect(() => setDeepLinkId(scrollToMessageId), [scrollToMessageId]);

  const threadQuery = useQuery({
    queryKey: ['chat-thread', target.kind, target.id, userId],
    enabled: !!userId && !isTenant,
    queryFn: () => (target.kind === 'recipient' ? directThread(target.id, userId as string) : resolveThread(target.id, userId as string)),
  });
  const tenant = useTenantConversation(tenantThreadId, tenantId, userId);
  const thread = isTenant ? tenant.thread : (threadQuery.data ?? null);
  const global = useConversation(isTenant ? null : thread, userId);
  const conv = isTenant ? tenant : global;
  const { typingUsers, startTyping, stopTyping } = useTyping(thread?.id, userId);
  const isGroup = thread?.type === 'group';
  const isDirect = thread?.type === 'direct';
  useChatViewingPresence(isDirect && !isTenant && thread ? `dm:${thread.id}` : null);

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
  const recipientId = isDirect ? (peer?.user_id ?? (target.kind === 'recipient' ? target.id : null)) : null;
  const recipient = recipientId ? { id: recipientId, name: peer?.display_name ?? null, avatar: peer?.avatar_url ?? null } : null;

  const loadAround = useCallback(
    async (messageId: string) => {
      if (!thread || isGroup || isTenant) return false;
      const win = await fetchConversationAround(thread.id, messageId, 40).catch(() => null);
      if (!win || win.data.length === 0) return false;
      const profiles = await enrichProfiles(win.data.map((m) => m.sender_id));
      conv.mergeRows(win.data.map((m) => chatMessageToView(m, thread.id, profiles)));
      return true;
    },
    [thread, isGroup, isTenant, conv],
  );

  const resolveParent = useCallback(
    async (messageId: string) => {
      if (!thread || isGroup || isTenant) return null;
      const win = await fetchConversationAround(thread.id, messageId, 2);
      const row = win?.data.find((r) => r.id === messageId);
      if (!row) return null;
      const profiles = await enrichProfiles([row.sender_id]);
      return chatMessageToView(row, thread.id, profiles);
    },
    [thread, isGroup, isTenant],
  );

  const table = isTenant ? 'messages' : isGroup ? 'global_messages' : 'chat_messages';
  const onEdit = useCallback(
    async (messageId: string, body: string) => {
      const patch = table === 'messages' ? { body, content: body } : { content: body };
      const { error } = await getSupabase().from(table).update(patch as never).eq('id', messageId);
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
  // A card's own state (payment status). Tenant rows take the update as is;
  // the community tables only take a text edit (ConversationView L1414-1420),
  // so there the card refreshes from the stream.
  const onUpdateContentData = useCallback(
    async (messageId: string, updates: { content_data: Record<string, unknown> }) => {
      if (table === 'messages') {
        const { error } = await getSupabase().from('messages').update(updates as never).eq('id', messageId);
        if (error) throw error;
      }
      await conv.refetch();
    },
    [table, conv],
  );

  const send = useCallback(
    async (content: string, messageType = 'text', contentData: Record<string, unknown> | null = null, replyToId?: string, actionButtons?: unknown[]) => {
      setReplyingTo(null);
      await conv.send({ content, messageType, contentData, replyToMessageId: replyToId ?? null, actionButtons: actionButtons ?? null });
    },
    [conv],
  );

  const onAction = useCallback(
    async (action: CardAction) => {
      try {
        const kind = action.action || action.type;
        if (kind === 'quick_reply' && action.text) {
          await send(action.text);
          return;
        }
        if (kind !== 'calendar_accept' && kind !== 'calendar_decline' && kind !== 'calendar_maybe') return;
        const raw = kind.replace('calendar_', '');
        const response: InviteResponse = raw === 'accept' ? 'accepted' : raw === 'decline' ? 'declined' : 'maybe';
        const eventData = (action.data ?? action.messageData ?? null) as LegacyInviteData | null;
        if (!isValidUUID(action.messageId) || !userId) {
          notify('toasts.messages.pleaseWait', 'toasts.messages.stillSyncingThisMessageTryAgain');
          return;
        }
        try {
          if (response === 'accepted' && eventData && !eventData.title && !eventData.date) throw new Error('Missing required event data (title or date)');
          const result = await respondToLegacyInvite(action.messageId as string, userId, response, eventData);
          await send(INVITE_RESPONSE_MESSAGES[response](!!result.error), 'system');
          notify('toasts.messages.responseSent');
        } catch {
          notifyError('toasts.messages.calendarInviteError');
        }
      } catch {
        notifyError('toasts.messages.error', 'toasts.messages.failedProcessAction');
      }
    },
    [send, userId],
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
          <Pressable disabled={!recipientId || isVitanaBot(recipientId)} onPress={() => recipientId && navigateToWebPath(`/u/${recipientId}`)} accessibilityRole="button" accessibilityLabel={title} testID="conversation-avatar">
            <Avatar uri={peer?.avatar_url} fallback={(title[0] || 'U').toUpperCase()} size={40} />
          </Pressable>
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
      {isDirect ? (
        <Button variant="ghost" size="icon" onPress={() => setSearchOpen(true)} accessibilityLabel={t('inbox.search.titleConversation')} testID="conversation-search-button">
          <ChatIcon name="Search" />
        </Button>
      ) : null}
      {isGroup ? (
        <Button variant="outline" size="sm" onPress={() => setMembersOpen(true)} accessibilityLabel={t('screens.messages.editGroup')} testID="edit-group-button">
          <ChatIcon name="Settings2" />
        </Button>
      ) : null}
      {!isGroup && isVitanaBot(recipientId) ? (
        <Button variant="outline" size="sm" onPress={() => activateOrb()} accessibilityLabel={t('screens.messages.talkToVitana')} testID="talk-to-vitana-button">
          <ChatIcon name="Mic" />
        </Button>
      ) : null}
      {!isGroup && recipientId ? (
        <Button variant="ghost" size="icon" onPress={() => setCreateOpen(true)} accessibilityLabel={t('screens.messages.createGroup')} testID="create-group-button">
          <ChatIcon name="UserPlus" />
        </Button>
      ) : null}
    </View>
  );

  const threadFailed = isTenant ? tenant.threadError || tenantDirect.isError || (tenantDirect.isSuccess && !tenantDirect.data) : threadQuery.isError;
  const loadingConversation = !thread || (conv.isLoading && conv.messages.length === 0);

  return (
    <View style={styles.fill}>
      {header}
      <View style={styles.fill}>
        {threadFailed || (conv.isError && conv.messages.length === 0) ? (
          <View style={styles.center} testID="conversation-load-error">
            <Text style={styles.title}>{t('screens.messages.failedLoadConversation')}</Text>
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                if (isTenant) void tenant.refetchThread();
                else void threadQuery.refetch();
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
            onAction={onAction}
            onSendReply={(content, messageType, contentData) => send(content, messageType, contentData)}
            onUpdateContentData={onUpdateContentData}
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
          threadId={thread?.id ?? null}
          conversationType={thread ? (isGroup ? 'group' : 'direct') : null}
          recipient={recipient}
          onSend={(content, messageType, contentData, replyToId, actionButtons) => send(content, messageType, contentData, replyToId, actionButtons)}
        />
      </View>
      {isDirect && thread ? <MessageSearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} scope={`dm:${thread.id}`} onSelect={(r) => setDeepLinkId(r.message_id)} /> : null}
      {isGroup && thread ? (
        <GroupMembersModal
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          threadId={thread.legacyThreadId ?? thread.id}
          userId={userId}
          tenantId={tenantId}
          context={isTenant ? 'tenant' : 'global'}
          currentUserRole={myRole}
          groupName={thread.name}
          createdBy={thread.created_by}
        />
      ) : null}
      {recipient ? (
        <CreateGroupSheet
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          context={isTenant ? 'tenant' : 'global'}
          userId={userId}
          tenantId={tenantId}
          initialMembers={[{ user_id: recipient.id, display_name: recipient.name || 'User', avatar_url: recipient.avatar }]}
          onCreated={(threadId) => navigateToWebPath(`/inbox/t/${threadId}`)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
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
