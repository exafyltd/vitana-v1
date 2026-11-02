/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — one chat
 * bubble, the native twin of web `src/components/messages/MessageBubble.tsx`
 * (mobile branch):
 *
 *  - system notices as a centred chip (describeGroupNotice, L1226-1234, L1383);
 *  - own bubbles at the end, others at the start with avatar + name on the
 *    first bubble of a group (L1391-1440); corner shape per group position;
 *  - reply quote (L1474-1481), "Forwarded" label (L1484-1491);
 *  - text with @mentions (link to /u/:id) and URLs (opened outside the app)
 *    (L765-876); attachments: pictures from fresh `chat-attachments` signed
 *    URLs (L250-337) with a full-screen viewer, other files as a chip;
 *    calendar invites as a card (L1111-1176);
 *  - time + send status (failed / sending / sent / delivered / read, L398-454)
 *    and "Not sent · Retry" (L1539-1557);
 *  - reactions (useMessageReactions) and the long-press drawer: quick
 *    reactions, Reply, Edit, Delete with confirm (L1585-1696).
 * The web desktop context menu, Copy, Forward, Star/Pin, the voice player,
 * payment/service-booking/template cards and the Vitana companion card are
 * not part of this port (see docs/validation/VTID-05458/verification.md).
 */
import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, BottomSheet, Button, Text, useUITheme } from '../../ports/ui';
import { ChatIcon, describeGroupNotice, splitMentionSegments, Textarea, type GroupPosition, type Mention } from '../../ports/chat';
import { navigateToWebPath } from '../../navigation/navigate';
import { getSupabase } from '../../auth/client';
import { useChatText } from './text';
import { ReactionCluster, ReplyQuote } from './components';
import { QUICK_REACTIONS, useReactions } from './data/useReactions';
import { isVitanaBot, VITANA_BOT_DISPLAY_NAME, type ChatViewMessage } from './data/types';

type Attachment = { type?: string; mime?: string; filename?: string; name?: string; url?: string; path?: string; size?: number };

const IMAGE_NAME_RX = /\.(jpe?g|png|gif|webp|svg|heic|heif|bmp|tiff?|avif)$/i;
export function isImageAttachment(att: Attachment | null | undefined): boolean {
  if (!att) return false;
  return att.type === 'image' || (att.mime || '').toLowerCase().startsWith('image/') || IMAGE_NAME_RX.test(att.filename || att.name || '');
}

export function messageStatus(m: ChatViewMessage): 'failed' | 'sending' | 'sent' | 'delivered' | 'read' {
  if (m.send_status === 'failed') return 'failed';
  if (m.id.startsWith('temp-') || m.send_status === 'sending') return 'sending';
  if (m.read_at) return 'read';
  if (m.delivered_at) return 'delivered';
  return 'sent';
}

/** web isLegacySharedPlaceholder (MessageBubble.tsx:183-194): an old "Shared <file>" caption is not shown. */
export function isLegacySharedPlaceholder(body: string | undefined, attachments: Attachment[]): boolean {
  const trimmed = (body ?? '').trim();
  if (!trimmed.startsWith('Shared ') || attachments.length === 0) return false;
  if (attachments.length === 1) {
    const filename = attachments[0]?.filename || attachments[0]?.name;
    return !!filename && trimmed === `Shared ${filename}`;
  }
  return trimmed === `Shared ${attachments.length} files`;
}

const STATUS_ICON = { failed: 'AlertCircle', sending: 'Clock', sent: 'Check', delivered: 'CheckCheck', read: 'CheckCheck' } as const;

async function signedUrl(path: string): Promise<string | null> {
  try {
    const { data, error } = await getSupabase().storage.from('chat-attachments').createSignedUrl(path, 3600);
    return error || !data?.signedUrl ? null : data.signedUrl;
  } catch {
    return null;
  }
}

function useAttachmentUrls(attachments: Attachment[]) {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  useEffect(() => {
    let cancelled = false;
    attachments.forEach((a) => {
      if (a.path && !(a.path in urls)) {
        void signedUrl(a.path).then((u) => {
          if (!cancelled) setUrls((prev) => ({ ...prev, [a.path as string]: u }));
        });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);
  return (a: Attachment): string | undefined => {
    if (a.path) {
      if (!(a.path in urls)) return undefined;
      return urls[a.path] ?? a.url ?? '';
    }
    return a.url ?? '';
  };
}

const URL_RX = /https?:\/\/[^\s<]+/gi;
const TRAILING = '.,!?;:)]}';

function LinkedText({ text, mentions, isOwn }: { text: string; mentions: Mention[]; isOwn: boolean }) {
  const { colors } = useUITheme();
  const fg = isOwn ? colors.primaryForeground : colors.foreground;
  const accent = isOwn ? colors.primaryForeground : colors.primary;
  const nodes: React.ReactNode[] = [];
  const pushPlain = (chunk: string, key: string) => {
    if (!chunk) return;
    if (mentions.length === 0) {
      nodes.push(chunk);
      return;
    }
    splitMentionSegments(chunk, mentions).forEach((seg, i) => {
      if (seg.type === 'text') nodes.push(seg.text);
      else
        nodes.push(
          <Text key={`${key}-m${i}`} testID="message-mention" accessibilityRole="link" style={[styles.bold, { color: accent }]} onPress={() => navigateToWebPath(`/u/${seg.mention.user_id}`)}>
            {seg.text}
          </Text>,
        );
    });
  };
  let last = 0;
  let match: RegExpExecArray | null;
  const rx = new RegExp(URL_RX.source, 'gi');
  while ((match = rx.exec(text)) !== null) {
    pushPlain(text.slice(last, match.index), `p${last}`);
    let url = match[0];
    let trailing = '';
    while (url.length > 0 && TRAILING.includes(url[url.length - 1])) {
      trailing = url[url.length - 1] + trailing;
      url = url.slice(0, -1);
    }
    if (url) {
      const target = url;
      nodes.push(
        <Text key={`u${match.index}`} accessibilityRole="link" testID="message-link" style={[styles.link, { color: accent }]} onPress={() => void Linking.openURL(target)}>
          {url}
        </Text>,
      );
    }
    if (trailing) nodes.push(trailing);
    last = match.index + match[0].length;
  }
  pushPlain(text.slice(last), `p${last}`);
  return <Text style={[styles.body, { color: fg }]}>{nodes}</Text>;
}

export interface MessageBubbleProps {
  message: ChatViewMessage;
  isOwn: boolean;
  userId?: string;
  showSender: boolean;
  showTime: boolean;
  groupPosition?: GroupPosition;
  parent: ChatViewMessage | null;
  parentUnavailable: boolean;
  highlighted?: boolean;
  onReply?: (m: ChatViewMessage) => void;
  onRetry?: (clientMessageId: string) => void;
  onJumpTo?: (messageId: string) => void;
  onEdit?: (messageId: string, body: string) => Promise<void> | void;
  onDelete?: (messageId: string) => Promise<void> | void;
}

export function MessageBubble({
  message,
  isOwn,
  userId,
  showSender,
  showTime,
  groupPosition = 'single',
  parent,
  parentUnavailable,
  highlighted,
  onReply,
  onRetry,
  onJumpTo,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const { t, time } = useChatText();
  const { colors } = useUITheme();
  const { summary, addReaction, removeReaction } = useReactions(message.id, userId);
  const [drawer, setDrawer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [viewer, setViewer] = useState<string | null>(null);
  const cd = (message.content_data ?? {}) as Record<string, unknown>;
  const attachments = useMemo(() => (Array.isArray(cd.attachments) ? (cd.attachments as Attachment[]) : []), [cd.attachments]);
  const urlFor = useAttachmentUrls(attachments);
  const mentions = useMemo(() => (Array.isArray(cd.mentions) ? (cd.mentions as Mention[]) : []), [cd.mentions]);

  if (message.message_type === 'system') {
    const text = describeGroupNotice(message as never, t) ?? message.body;
    return (
      <View style={styles.systemRow} testID={`bubble-system-${message.id}`}>
        <View style={[styles.systemChip, { borderColor: colors.border }]}>
          <Text muted style={styles.small}>
            {text}
          </Text>
        </View>
      </View>
    );
  }

  const isBot = isVitanaBot(message.sender_id);
  const senderName = isBot ? VITANA_BOT_DISPLAY_NAME : message.sender?.display_name || t('callsNative.unknownUser');
  const status = messageStatus(message);
  const fg = isOwn ? colors.primaryForeground : colors.foreground;
  const r = 16;
  const tight = 4;
  const continuesAbove = groupPosition === 'middle' || groupPosition === 'last';
  const continuesBelow = groupPosition === 'first' || groupPosition === 'middle';
  const corner = isOwn
    ? { borderTopEndRadius: continuesAbove ? tight : r, borderBottomEndRadius: continuesBelow ? tight : r, borderTopStartRadius: r, borderBottomStartRadius: r }
    : { borderTopStartRadius: continuesAbove ? tight : r, borderBottomStartRadius: continuesBelow ? tight : r, borderTopEndRadius: r, borderBottomEndRadius: r };

  const renderContent = () => {
    if (message.message_type === 'calendar_invite') {
      const title = typeof cd.title === 'string' ? cd.title : message.body;
      const date = typeof cd.date === 'string' ? cd.date : typeof cd.start_time === 'string' ? cd.start_time : '';
      return (
        <View style={[styles.invite, { borderColor: colors.border, backgroundColor: colors.card }]} testID="bubble-calendar-invite">
          <View style={styles.inviteBadge}>
            <ChatIcon name="Calendar" size={12} />
            <Text style={[styles.small, styles.bold]}>{t('screens.messages.calendarInvite')}</Text>
          </View>
          <Text style={styles.bold}>{title}</Text>
          {date ? (
            <Text muted style={styles.small}>
              {date}
            </Text>
          ) : null}
        </View>
      );
    }
    return (
      <View style={styles.content}>
        {message.body && !isLegacySharedPlaceholder(message.body, attachments) ? <LinkedText text={message.body} mentions={mentions} isOwn={isOwn} /> : null}
        {attachments.map((a, i) => {
          if (isImageAttachment(a)) {
            const url = urlFor(a);
            if (url === undefined) return <View key={`a${i}`} style={[styles.image, { backgroundColor: colors.muted }]} accessibilityLabel={t('screens.messages.imageLoading')} testID="chat-image-skeleton" />;
            return (
              <Pressable key={`a${i}`} onPress={() => setViewer(url)} accessibilityRole="imagebutton" accessibilityLabel={t('screens.messages.viewFullscreen')} testID="chat-image">
                <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
              </Pressable>
            );
          }
          return (
            <View key={`a${i}`} style={[styles.fileChip, { borderColor: colors.border }]} testID="chat-file">
              <Text style={[styles.small, { color: fg }]} numberOfLines={1}>
                {a.filename || a.name || t('inbox.reply.noText')}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View testID={`bubble-${message.id}`}>
      <View style={[styles.row, { justifyContent: isOwn ? 'flex-end' : 'flex-start' }]} testID={isOwn ? 'bubble-row-own' : 'bubble-row-other'}>
        {!isOwn ? <View style={styles.avatarCol}>{showSender ? <Avatar uri={isBot ? null : message.sender?.avatar_url} fallback={(senderName[0] || 'U').toUpperCase()} size={32} /> : null}</View> : null}
        <View style={[styles.column, { alignItems: isOwn ? 'flex-end' : 'flex-start' }]}>
          {!isOwn && showSender ? (
            <Text muted style={[styles.small, styles.senderName]} onPress={isBot ? undefined : () => navigateToWebPath(`/u/${message.sender_id}`)}>
              {senderName}
            </Text>
          ) : null}
          <Pressable
            onLongPress={() => setDrawer(true)}
            delayLongPress={400}
            accessibilityHint={t('chatNative.bubble.longPressHint')}
            style={[
              styles.bubble,
              corner,
              { backgroundColor: highlighted ? colors.accent : isOwn ? colors.primary : colors.muted, opacity: status === 'sending' && message.id.startsWith('temp-') ? 0.7 : 1 },
            ]}
            testID={highlighted ? 'message-highlight' : `bubble-body-${message.id}`}
          >
            {message.parent_message_id || message.reply_to_message_id || parent ? (
              <ReplyQuote parent={parent} unavailable={parentUnavailable} isOwn={isOwn} onPress={() => onJumpTo?.((message.reply_to_message_id || message.parent_message_id) as string)} />
            ) : null}
            {cd.forwarded === true && !editing ? (
              <View style={styles.forwarded} testID="message-forwarded-label">
                <ChatIcon name="Forward" size={12} color={fg} />
                <Text style={[styles.small, { color: fg, fontStyle: 'italic' }]}>{t('screens.messages.forwardedLabel')}</Text>
              </View>
            ) : null}
            {editing ? (
              <View style={styles.edit}>
                <Textarea value={draft} onChangeText={setDraft} testID="bubble-edit-input" accessibilityLabel={t('screens.messages.edit')} />
                <View style={styles.editActions}>
                  <Button variant="outline" size="sm" onPress={() => setEditing(false)} testID="bubble-edit-cancel">
                    {t('screens.messages.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!draft.trim()}
                    onPress={async () => {
                      await onEdit?.(message.id, draft.trim());
                      setEditing(false);
                    }}
                    testID="bubble-edit-save"
                  >
                    {t('screens.messages.save')}
                  </Button>
                </View>
              </View>
            ) : (
              renderContent()
            )}
            {showTime || isOwn ? (
              <View style={styles.meta}>
                {showTime ? <Text style={[styles.time, { color: isOwn ? colors.primaryForeground : colors.mutedForeground }]}>{time(message.created_at)}</Text> : null}
                {isOwn ? (
                  <View accessible accessibilityRole="image" accessibilityLabel={t(`inbox.messageStatus.${status}`)} testID={`message-status-${status}`}>
                    <ChatIcon name={STATUS_ICON[status]} size={12} color={status === 'failed' ? colors.destructive : status === 'read' ? colors.statusInfo : colors.primaryForeground} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </Pressable>
          <ReactionCluster reactions={summary} isOwn={isOwn} onAdd={(e) => void addReaction(e)} onRemove={(e) => void removeReaction(e)} />
          {isOwn && status === 'failed' && message.client_message_id && onRetry ? (
            <View style={styles.failedRow} testID="message-failed-row">
              <Text style={[styles.small, { color: colors.destructive }]}>{t('inbox.messageStatus.failed')}</Text>
              <Pressable onPress={() => onRetry(message.client_message_id as string)} accessibilityRole="button" accessibilityLabel={t('inbox.messageStatus.retryLabel')} style={styles.retry} testID="message-retry">
                <ChatIcon name="RotateCw" size={14} color={colors.destructive} />
                <Text style={[styles.small, styles.bold, { color: colors.destructive }]}>{t('inbox.messageStatus.retry')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <BottomSheet
        open={drawer}
        onClose={() => {
          setDrawer(false);
          setConfirmDelete(false);
        }}
        testID="message-actions"
      >
        {!showTime ? (
          <Text muted style={[styles.small, styles.center]} testID="message-drawer-time">
            {time(message.created_at)}
          </Text>
        ) : null}
        <View style={styles.quickRow}>
          {QUICK_REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                void addReaction(emoji);
                setDrawer(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('chatNative.reactions.reactWith', { emoji })}
              style={styles.quick}
              testID={`quick-reaction-${emoji}`}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.actions}>
          {onReply ? (
            <Pressable
              onPress={() => {
                onReply(message);
                setDrawer(false);
              }}
              accessibilityRole="button"
              style={styles.action}
              testID="message-action-reply"
            >
              <ChatIcon name="Reply" size={20} />
              <Text muted style={styles.small}>
                {t('screens.messages.reply')}
              </Text>
            </Pressable>
          ) : null}
          {isOwn && onEdit ? (
            <Pressable
              onPress={() => {
                setDraft(message.body);
                setEditing(true);
                setDrawer(false);
              }}
              accessibilityRole="button"
              style={styles.action}
              testID="message-action-edit"
            >
              <ChatIcon name="Pencil" size={20} />
              <Text muted style={styles.small}>
                {t('screens.messages.edit')}
              </Text>
            </Pressable>
          ) : null}
          {isOwn && onDelete && !confirmDelete ? (
            <Pressable onPress={() => setConfirmDelete(true)} accessibilityRole="button" style={styles.action} testID="message-action-delete">
              <ChatIcon name="Trash2" size={20} color={colors.destructive} />
              <Text style={[styles.small, { color: colors.destructive }]}>{t('screens.messages.delete')}</Text>
            </Pressable>
          ) : null}
        </View>
        {confirmDelete ? (
          <View style={styles.confirm} testID="message-delete-confirm">
            <Text style={[styles.center, styles.bold]}>{t('screens.messages.deleteThisMessage')}</Text>
            <View style={styles.editActions}>
              <Button variant="outline" onPress={() => setConfirmDelete(false)}>
                {t('screens.messages.cancel')}
              </Button>
              <Button
                variant="destructive"
                onPress={async () => {
                  await onDelete?.(message.id);
                  setConfirmDelete(false);
                  setDrawer(false);
                }}
                testID="message-delete-confirm-button"
              >
                {t('screens.messages.delete')}
              </Button>
            </View>
          </View>
        ) : null}
      </BottomSheet>

      {viewer !== null ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setViewer(null)}>
          <View style={[styles.viewer, { backgroundColor: colors.foreground }]} testID="chat-image-viewer">
            <Image source={{ uri: viewer }} style={styles.viewerImage} resizeMode="contain" />
            <Pressable onPress={() => setViewer(null)} accessibilityRole="button" accessibilityLabel={t('screens.messages.cancel')} style={styles.viewerClose} testID="chat-image-viewer-close">
              <ChatIcon name="X" size={24} color={colors.background} />
            </Pressable>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, width: '100%' },
  avatarCol: { width: 32, alignItems: 'center' },
  column: { flexShrink: 1, maxWidth: '85%' },
  senderName: { marginBottom: 2, marginStart: 12 },
  bubble: { paddingHorizontal: 12, paddingVertical: 6 },
  content: { gap: 8 },
  body: { fontSize: 15, lineHeight: 20 },
  bold: { fontWeight: '600' },
  link: { textDecorationLine: 'underline', fontWeight: '500' },
  small: { fontSize: 12 },
  time: { fontSize: 11 },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 2 },
  image: { width: 240, height: 180, borderRadius: 12 },
  fileChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  invite: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  inviteBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  forwarded: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  edit: { gap: 8, minWidth: 220 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8 },
  center: { textAlign: 'center' },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 8 },
  quick: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  actions: { flexDirection: 'row', justifyContent: 'space-around' },
  action: { alignItems: 'center', gap: 6, paddingVertical: 12, flex: 1 },
  confirm: { gap: 12, paddingTop: 12 },
  viewer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', top: 48, end: 16, padding: 8 },
});
