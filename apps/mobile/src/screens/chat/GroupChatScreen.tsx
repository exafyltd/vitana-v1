/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the group
 * chat (`/inbox/g/:groupId`, INBOX.GROUP) and its `/msg/:messageId` deep link.
 * Native twin of the phone layout of web `src/pages/messages/GroupChat.tsx`
 * (L802-945):
 *
 *  - the back button is always on screen (loading, error and loaded, L668-686);
 *  - "Loading group…" (L802-815); "Couldn't open group" + the error + "Back to
 *    Inbox" when the group or its messages failed (L817-835);
 *  - header: back, the group picture (metadata.avatar_url), name,
 *    "n member(s) · official group" (L843-864);
 *  - "No messages yet." or the list; the composer with "Message…" and the
 *    roster's @mention candidates (L866-936);
 *  - a deep-linked message is scrolled to and highlighted, loaded around
 *    first when it is older than the latest page (L327-376, L514-523).
 * The search button + panel (L524-540) is not part of this port.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Text, useUITheme } from '../../ports/ui';
import { ChatIcon } from '../../ports/chat';
import { useAuth } from '../../auth/AuthProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { ChatFrame } from './ChatFrame';
import { ConversationErrorBoundary, ConversationErrorCard } from './components';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useGroupChat } from './data/useGroupChat';
import type { ChatViewMessage } from './data/types';

export function GroupChatScreen({ groupId, scrollToMessageId }: { groupId: string; scrollToMessageId?: string | null }) {
  const back = useCallback(() => navigateToWebPath('/inbox', { replace: true }), []);
  return (
    <ChatFrame onBack={back} testID="screen-group-chat">
      <ConversationErrorBoundary fallback={(reset) => <ConversationErrorCard onRetry={reset} />}>
        <GroupBody groupId={groupId} scrollToMessageId={scrollToMessageId ?? null} onBack={back} />
      </ConversationErrorBoundary>
    </ChatFrame>
  );
}

function GroupBody({ groupId, scrollToMessageId, onBack }: { groupId: string; scrollToMessageId: string | null; onBack: () => void }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const chat = useGroupChat(groupId, user?.id);
  const [deepLinkId, setDeepLinkId] = useState<string | null>(scrollToMessageId);
  const [replyingTo, setReplyingTo] = useState<ChatViewMessage | null>(null);
  const { group } = chat;

  const backButton = (
    <Button variant="ghost" size="icon" onPress={onBack} accessibilityLabel={t('inbox.group.back')} testID="group-chat-back">
      <ChatIcon name="ArrowLeft" size={24} flipInRtl />
    </Button>
  );
  const headerStyle = [styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }];

  if (chat.isLoading || (!group && !chat.loadError)) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.card }]}>
        <View style={headerStyle}>{backButton}</View>
        <View style={styles.center} testID="group-loading">
          <Text muted style={styles.small}>
            {t('inbox.group.loading')}
          </Text>
        </View>
      </View>
    );
  }

  if (chat.loadError && (!group || !chat.messagesLoaded)) {
    return (
      <View style={[styles.center, styles.pad]} testID="group-error">
        <Text style={styles.bold}>{t('inbox.group.cantOpen')}</Text>
        <Text style={[styles.small, { color: colors.statusError }]}>{chat.loadError}</Text>
        <Button variant="secondary" size="sm" onPress={onBack} testID="group-back-to-inbox">
          {t('inbox.group.backToInbox')}
        </Button>
      </View>
    );
  }

  if (!group) return null;

  const avatarUrl = typeof group.metadata?.avatar_url === 'string' ? (group.metadata.avatar_url as string) : null;
  const memberLabel = group.member_count === 1 ? t('inbox.group.memberOne') : t('inbox.group.memberOther');

  return (
    <View style={[styles.fill, { backgroundColor: colors.card }]}>
      <View style={headerStyle} testID="group-header">
        {backButton}
        {avatarUrl ? <Avatar uri={avatarUrl} fallback={group.name?.[0] ?? '#'} size={36} /> : null}
        <View style={styles.titleBox}>
          <Text style={styles.bold} numberOfLines={1} testID="group-name">
            {group.name}
          </Text>
          <Text muted style={styles.small} testID="group-subtitle">
            {`${group.member_count} ${memberLabel}${group.is_system ? ` · ${t('inbox.group.officialBadge')}` : ''}`}
          </Text>
        </View>
      </View>
      <View style={styles.fill}>
        {chat.messages.length === 0 ? (
          <Text muted style={[styles.small, styles.empty]} testID="group-empty">
            {t('inbox.group.empty')}
          </Text>
        ) : (
          <MessageList
            testID="group-message-list"
            messages={chat.messages}
            userId={user?.id}
            scrollToMessageId={deepLinkId}
            onTargetHandled={() => setDeepLinkId(null)}
            loadAround={chat.loadAround}
            hasOlder={false}
            onReply={(m) => {
              if (!m.id.startsWith('temp-')) setReplyingTo(m);
            }}
            onRetry={chat.retry}
            onEdit={chat.updateMessage}
            onDelete={chat.deleteMessage}
          />
        )}
      </View>
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <MessageInput
          placeholder={t('inbox.group.composerPlaceholder')}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          currentUserId={user?.id}
          mentionCandidates={chat.mentionCandidates}
          onSend={async (content, messageType, contentData, replyToId) => {
            setReplyingTo(null);
            await chat.send({ content, messageType, contentData, replyToMessageId: replyToId ?? null });
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  titleBox: { flex: 1, minWidth: 0 },
  bold: { fontWeight: '600' },
  small: { fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  pad: { padding: 24 },
  empty: { textAlign: 'center', marginTop: 40 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
});
