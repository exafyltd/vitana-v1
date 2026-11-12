/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — one chat
 * bubble, the native twin of web `src/components/messages/MessageBubble.tsx`
 * (mobile branch; the desktop right-click MessageContextMenu with Star / Pin /
 * Select is not mounted on phones, MessageContextMenu.tsx:66-69):
 *
 *  - system notices as a centred chip (describeGroupNotice);
 *  - own bubbles at the end, others at the start with avatar + name on the
 *    first bubble of a group; corner shape per group position;
 *  - reply quote, "Forwarded" label;
 *  - text with @mentions (→ /u/:id) and links: event links open the in-app
 *    Events path (inAppLinks.ts, VTID-04902), other links open outside;
 *    Vitana's replies render her Markdown subset (VTID-05193) and her
 *    action buttons (VitanaMessageActions); her companion card sits under the
 *    bubble (VTID-05100);
 *  - every message type: payment_request / exchange_and_send /
 *    payment_confirmation (PaymentCard), calendar_invite (v2 card or legacy
 *    card with its status + Accept / Decline / Maybe), shared_content,
 *    service_booking, template (+ quick replies), voice (VoicePlayer),
 *    attachment (one picture / video, an album of 2+ media, file chips with
 *    size + download, legacy `files`);
 *  - pictures from fresh `chat-attachments` signed URLs, a skeleton until
 *    signed, the full-screen ChatImageViewer;
 *  - time + send status, "Not sent · Retry";
 *  - reactions and the long-press drawer: quick reactions, Reply, Copy,
 *    Forward (ForwardMessageSheet), Edit, Delete with confirm.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, useUITheme } from '../../ports/ui';
import { ChatIcon, describeGroupNotice, parseChatMarkdown, splitMentionSegments, Textarea, type GroupPosition, type MdInline, type Mention } from '../../ports/chat';
import { getChatDevice } from '../../ports/chat-device';
import { navigateToWebPath } from '../../navigation/navigate';
import { useChatText } from './text';
import { ReactionCluster, ReplyQuote } from './components';
import { QUICK_REACTIONS, useReactions } from './data/useReactions';
import { isVitanaBot, VITANA_BOT_DISPLAY_NAME, type ChatViewMessage } from './data/types';
import { recordRecentEmoji } from './data/emojiRecents';
import { canForwardMessage, type ForwardPayload } from './data/forward';
import { formatFileSize, getSignedAttachmentUrl } from './data/upload';
import { isInviteCard } from './data/calendar';
import { sharedRefOf } from './data/shared';
import { resolveInAppEventPath } from './inAppLinks';
import { ChatImageViewer, copyImageAndNotify, downloadChatFile, type ChatViewerImage } from './ChatImageViewer';
import { ForwardMessageSheet } from './ForwardMessageSheet';
import { VoicePlayer } from './bubble/VoicePlayer';
import { PaymentCard } from './bubble/PaymentCard';
import {
  CalendarInviteCard,
  isVideoAttachment,
  isVitanaCardPayload,
  LegacyCalendarInvite,
  MediaAlbum,
  QuickReplies,
  ServiceBookingCard,
  SharedContentCard,
  VitanaCompanionCard,
  VitanaMessageActions,
  type CardAction,
} from './bubble/Cards';

type Attachment = { type?: string; mime?: string; filename?: string; name?: string; url?: string; path?: string; size?: number; duration?: number };

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
const STRUCTURED = new Set(['voice', 'calendar_invite', 'service_booking', 'payment_request', 'exchange_and_send', 'payment_confirmation', 'exchange_and_send_confirmation', 'template']);
const PAYMENT = new Set(['payment_request', 'exchange_and_send', 'payment_confirmation', 'exchange_and_send_confirmation']);

/** Fresh signed URLs for stored paths; `undefined` = still signing, the stored URL when signing failed. */
function useAttachmentUrls(attachments: Attachment[]) {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  useEffect(() => {
    let cancelled = false;
    attachments.forEach((a) => {
      if (a.path && !(a.path in urls)) {
        void getSignedAttachmentUrl(a.path).then((u) => {
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

function useLinkify(mentions: Mention[], isOwn: boolean) {
  const { colors } = useUITheme();
  const accent = isOwn ? colors.primaryForeground : colors.primary;
  return (text: string, key: string): ReactNode[] => {
    const nodes: ReactNode[] = [];
    const pushPlain = (chunk: string, k: string) => {
      if (!chunk) return;
      if (mentions.length === 0) {
        nodes.push(chunk);
        return;
      }
      splitMentionSegments(chunk, mentions).forEach((seg, i) => {
        if (seg.type === 'text') nodes.push(seg.text);
        else
          nodes.push(
            <Text key={`${k}-m${i}`} testID="message-mention" accessibilityRole="link" style={[styles.bold, { color: accent }]} onPress={() => navigateToWebPath(`/u/${seg.mention.user_id}`)}>
              {seg.text}
            </Text>,
          );
      });
    };
    let last = 0;
    let match: RegExpExecArray | null;
    const rx = new RegExp(URL_RX.source, 'gi');
    while ((match = rx.exec(text)) !== null) {
      pushPlain(text.slice(last, match.index), `${key}p${last}`);
      let url = match[0];
      let trailing = '';
      while (url.length > 0 && TRAILING.includes(url[url.length - 1])) {
        trailing = url[url.length - 1] + trailing;
        url = url.slice(0, -1);
      }
      if (url) {
        const target = url;
        const inApp = resolveInAppEventPath(target);
        nodes.push(
          <Text
            key={`${key}u${match.index}`}
            accessibilityRole="link"
            testID={inApp ? 'message-event-link' : 'message-link'}
            style={[styles.link, { color: accent }]}
            onPress={() => (inApp ? navigateToWebPath(inApp) : void Linking.openURL(target))}
          >
            {url}
          </Text>,
        );
      }
      if (trailing) nodes.push(trailing);
      last = match.index + match[0].length;
    }
    pushPlain(text.slice(last), `${key}p${last}`);
    return nodes;
  };
}

function LinkedText({ text, mentions, isOwn, markdown }: { text: string; mentions: Mention[]; isOwn: boolean; markdown?: boolean }) {
  const { colors } = useUITheme();
  const fg = isOwn ? colors.primaryForeground : colors.foreground;
  const linkify = useLinkify(mentions, isOwn);
  if (!markdown) return <Text style={[styles.body, { color: fg }]}>{linkify(text, 't')}</Text>;
  const blocks = parseChatMarkdown(text);
  if (blocks.length === 0) return <Text style={[styles.body, { color: fg }]}>{linkify(text, 't')}</Text>;
  const inline = (nodes: MdInline[], key: string): ReactNode[] =>
    nodes.flatMap((n, i): ReactNode[] => {
      const k = `${key}${i}`;
      if (n.type === 'text') return linkify(n.text, `${k}-`);
      if (n.type === 'strong') return [<Text key={k} style={styles.bold}>{inline(n.children, `${k}-`)}</Text>];
      if (n.type === 'em') return [<Text key={k} style={styles.italic}>{inline(n.children, `${k}-`)}</Text>];
      if (n.type === 'code') return [<Text key={k} style={[styles.code, { backgroundColor: colors.muted }]}>{n.text}</Text>];
      return [];
    });
  return (
    <View style={styles.md} testID="vitana-markdown">
      {blocks.map((b, bi) => {
        const key = `md-${bi}`;
        if (b.type === 'paragraph' || b.type === 'heading') {
          return (
            <Text key={key} style={[styles.body, { color: fg }, b.type === 'heading' ? styles.bold : null]}>
              {inline(b.children, `${key}-`)}
            </Text>
          );
        }
        return (
          <View key={key} style={styles.list}>
            {b.items.map((item, ii) => (
              <Text key={`${key}-${ii}`} style={[styles.body, { color: fg }]}>
                {b.ordered ? `${(b.start ?? 1) + ii}. ` : '• '}
                {inline(item, `${key}-${ii}-`)}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
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
  /** Card buttons (calendar Accept / Decline / Maybe, quick replies, bookings). */
  onAction?: (action: CardAction) => Promise<void> | void;
  /** A reply the card sends itself (payment confirmation / decline). */
  onSendReply?: (content: string, messageType: string, contentData: Record<string, unknown>) => Promise<void>;
  /** A card's own state (payment status). */
  onUpdateContentData?: (messageId: string, updates: { content_data: Record<string, unknown> }) => Promise<void> | void;
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
  onAction,
  onSendReply,
  onUpdateContentData,
}: MessageBubbleProps) {
  const { t, time } = useChatText();
  const { colors } = useUITheme();
  const { summary, addReaction, removeReaction } = useReactions(message.id, userId);
  const [drawer, setDrawer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [viewer, setViewer] = useState<number | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const cd = (message.content_data ?? {}) as Record<string, unknown>;
  const attachments = useMemo(() => (Array.isArray(cd.attachments) ? (cd.attachments as Attachment[]) : []), [cd.attachments]);
  // VTID-05138: legacy `content_data.files` entries with a link or a path render like attachments.
  const legacyFiles = useMemo<Attachment[]>(
    () =>
      (Array.isArray(cd.files) ? (cd.files as Array<Record<string, unknown>>) : [])
        .filter((f) => f && (f.url || f.path))
        .map((f) => ({
          type: typeof f.type === 'string' && f.type.startsWith('image/') ? 'image' : 'file',
          mime: typeof f.type === 'string' ? f.type : undefined,
          filename: (f.name || f.filename) as string | undefined,
          name: (f.name || f.filename) as string | undefined,
          size: f.size as number | undefined,
          url: f.url as string | undefined,
          path: f.path as string | undefined,
        })),
    [cd.files],
  );
  const allAttachments = useMemo(() => [...attachments, ...legacyFiles], [attachments, legacyFiles]);
  const urlFor = useAttachmentUrls(allAttachments);
  const mentions = useMemo(() => (Array.isArray(cd.mentions) ? (cd.mentions as Mention[]) : []), [cd.mentions]);
  const media = useMemo(() => allAttachments.filter((a) => isImageAttachment(a) || isVideoAttachment(a)), [allAttachments]);
  const viewerImages: ChatViewerImage[] = media.map((a) => ({ url: urlFor(a) || '', filename: a.filename || a.name || '', kind: isVideoAttachment(a) ? 'video' : 'image' }));

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
  const forwardable = canForwardMessage(message);
  const sharedRef = message.message_type === 'shared_content' ? sharedRefOf(message.content_data) : null;
  const companionCard = isBot && isVitanaCardPayload(cd.card) ? cd.card : null;
  const actionButtons = (Array.isArray(message.action_buttons) ? message.action_buttons : Array.isArray(cd.action_buttons) ? cd.action_buttons : null) as CardAction[] | null;
  const body = message.body;
  const forwardPayload: ForwardPayload = {
    body: isLegacySharedPlaceholder(body, allAttachments) ? '' : body,
    attachments: allAttachments,
    shareImages: viewerImages.filter((img) => !!img.url && img.kind !== 'video').map((img) => ({ url: img.url, filename: img.filename })),
  };

  const copy = () => {
    // VTID-05138: a picture-only message copies the picture itself.
    const firstPicture = viewerImages.find((img) => img.kind !== 'video');
    if (!forwardPayload.body.trim() && firstPicture) {
      void copyImageAndNotify(firstPicture.url);
      return;
    }
    getChatDevice().copyText(body || '');
  };

  const react = (emoji: string) => {
    void recordRecentEmoji(emoji, userId ?? null);
    void addReaction(emoji);
  };

  const text = (value: string | undefined) => (value ? <LinkedText text={value} mentions={mentions} isOwn={isOwn} markdown={isBot} /> : null);

  const renderAttachment = (a: Attachment, key: string) => {
    const url = urlFor(a);
    if (isImageAttachment(a) || isVideoAttachment(a)) {
      if (url === undefined) return <View key={key} style={[styles.image, { backgroundColor: colors.muted }]} accessibilityLabel={t('screens.messages.imageLoading')} testID="chat-image-skeleton" />;
      const index = Math.max(0, media.indexOf(a));
      if (isVideoAttachment(a) && !isImageAttachment(a)) {
        return (
          <Pressable key={key} onPress={() => setViewer(index)} accessibilityRole="button" accessibilityLabel={t('inbox.media.openVideo', { name: a.filename || a.name || '' })} style={[styles.image, styles.center, { backgroundColor: colors.muted }]} testID="chat-video">
            <ChatIcon name="Play" size={28} />
          </Pressable>
        );
      }
      return (
        <Pressable key={key} onPress={() => setViewer(index)} accessibilityRole="imagebutton" accessibilityLabel={t('screens.messages.viewFullscreen')} testID="chat-image">
          <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
        </Pressable>
      );
    }
    return (
      <Pressable key={key} onPress={() => url && void getChatDevice().openUrl(url)} accessibilityRole="button" style={[styles.fileChip, { borderColor: colors.border }]} testID="chat-file">
        <ChatIcon name="FileText" size={28} color={colors.mutedForeground} />
        <View style={styles.fileText}>
          <Text style={[styles.small, styles.bold, { color: fg }]} numberOfLines={1}>
            {a.filename || a.name || t('inbox.reply.noText')}
          </Text>
          <Text muted style={styles.small}>
            {a.size ? formatFileSize(a.size) : t('screens.messages.unknownSize')}
          </Text>
        </View>
        <Pressable onPress={() => url && void downloadChatFile(url)} accessibilityRole="button" accessibilityLabel={t('screens.messages.downloadFile')} style={styles.download} testID="chat-file-download">
          <ChatIcon name="Download" size={14} color={fg} />
        </Pressable>
      </Pressable>
    );
  };

  const renderContent = () => {
    const type = message.message_type;
    if (PAYMENT.has(type)) return <PaymentCard message={message} userId={userId} onReply={onSendReply} onUpdate={onUpdateContentData} />;
    if (type === 'calendar_invite') {
      if (isInviteCard(cd)) return <CalendarInviteCard messageId={message.id} invite={cd} isOwn={isOwn} />;
      return <LegacyCalendarInvite messageId={message.id} data={cd} body={body} senderId={message.sender_id} userId={userId} actionButtons={actionButtons} onAction={onAction} />;
    }
    if (type === 'shared_content') {
      if (!sharedRef) return text(body);
      return (
        <View style={styles.content} testID="shared-content-message">
          <SharedContentCard sharedRef={sharedRef} isOwn={isOwn} userId={userId} />
          {text(body)}
        </View>
      );
    }
    if (type === 'service_booking') return <ServiceBookingCard messageId={message.id} data={cd} body={body} actionButtons={actionButtons} onAction={onAction} />;
    if (type === 'template') {
      return (
        <View style={styles.content}>
          {text(body)}
          <QuickReplies messageId={message.id} replies={cd.quick_replies} onAction={onAction} />
        </View>
      );
    }
    if (type === 'voice') {
      const voice = (attachments[0] ?? cd) as Attachment;
      const url = voice.path ? urlFor(voice) || voice.url : voice.url;
      return <VoicePlayer url={url} duration={voice.duration} isOwn={isOwn} />;
    }
    if (allAttachments.length === 0 && !(Array.isArray(cd.files) && cd.files.length > 0)) {
      return (
        <View>
          {text(body)}
          {isBot ? <VitanaMessageActions contentData={cd} /> : null}
        </View>
      );
    }
    const listMedia = attachments.filter((a) => isImageAttachment(a) || isVideoAttachment(a));
    const metaFiles = (Array.isArray(cd.files) ? (cd.files as Array<Record<string, unknown>>) : []).filter((f) => !(f?.url || f?.path));
    return (
      <View style={styles.content}>
        {body && !isLegacySharedPlaceholder(body, allAttachments) ? text(body) : null}
        {listMedia.length < 2 ? (
          attachments.map((a, i) => renderAttachment(a, `att-${i}`))
        ) : (
          <>
            <MediaAlbum
              items={listMedia.map((a, i) => ({ key: `album-${i}`, kind: isVideoAttachment(a) ? 'video' : 'image', url: urlFor(a), alt: a.filename || a.name || '' }))}
              onOpen={(i) => setViewer(Math.max(0, media.indexOf(listMedia[i])))}
            />
            {attachments.filter((a) => !listMedia.includes(a)).map((a, i) => renderAttachment(a, `att-file-${i}`))}
          </>
        )}
        {legacyFiles.map((a, i) => renderAttachment(a, `legacy-${i}`))}
        {metaFiles.map((f, i) => (
          <View key={`legacy-meta-${i}`} style={[styles.fileChip, { borderColor: colors.border }]} testID="chat-file-meta">
            <ChatIcon name={typeof f.type === 'string' && f.type.startsWith('image/') ? 'Image' : 'FileText'} size={16} color={colors.mutedForeground} />
            <View style={styles.fileText}>
              <Text style={[styles.small, styles.bold, { color: fg }]} numberOfLines={1}>
                {String(f.name ?? '')}
              </Text>
              <Text muted style={styles.small}>
                {f.size ? formatFileSize(Number(f.size)) : t('screens.messages.unknownSize')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const structured = STRUCTURED.has(message.message_type) || (message.message_type === 'shared_content' && !!sharedRef);
  const action = (key: string, icon: string, label: string, onPress: () => void, color?: string) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="button" style={styles.action} testID={`message-action-${key}`}>
      <ChatIcon name={icon} size={20} color={color} />
      <Text style={[styles.small, { color: color ?? colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View testID={`bubble-${message.id}`}>
      <View style={[styles.row, { justifyContent: isOwn ? 'flex-end' : 'flex-start' }]} testID={isOwn ? 'bubble-row-own' : 'bubble-row-other'}>
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
              <View style={[styles.meta, structured ? styles.metaBelow : null]}>
                {showTime ? <Text style={[styles.time, { color: isOwn ? colors.primaryForeground : colors.mutedForeground }]}>{time(message.created_at)}</Text> : null}
                {isOwn ? (
                  <View accessible accessibilityRole="image" accessibilityLabel={t(`inbox.messageStatus.${status}`)} testID={`message-status-${status}`}>
                    <ChatIcon name={STATUS_ICON[status]} size={12} color={status === 'failed' ? colors.destructive : status === 'read' ? colors.statusInfo : colors.primaryForeground} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </Pressable>
          <ReactionCluster reactions={summary} isOwn={isOwn} onAdd={react} onRemove={(e) => void removeReaction(e)} />
          {isOwn && status === 'failed' && message.client_message_id && onRetry ? (
            <View style={styles.failedRow} testID="message-failed-row">
              <Text style={[styles.small, { color: colors.destructive }]}>{t('inbox.messageStatus.failed')}</Text>
              <Pressable onPress={() => onRetry(message.client_message_id as string)} accessibilityRole="button" accessibilityLabel={t('inbox.messageStatus.retryLabel')} style={styles.retry} testID="message-retry">
                <ChatIcon name="RotateCw" size={14} color={colors.destructive} />
                <Text style={[styles.small, styles.bold, { color: colors.destructive }]}>{t('inbox.messageStatus.retry')}</Text>
              </Pressable>
            </View>
          ) : null}
          {companionCard ? <VitanaCompanionCard card={companionCard} /> : null}
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
          <Text muted style={[styles.small, styles.centerText]} testID="message-drawer-time">
            {time(message.created_at)}
          </Text>
        ) : null}
        <View style={styles.quickRow}>
          {QUICK_REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                react(emoji);
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
          {onReply
            ? action('reply', 'Reply', t('screens.messages.reply'), () => {
                onReply(message);
                setDrawer(false);
              })
            : null}
          {action('copy', 'Copy', t('screens.messages.copy'), () => {
            copy();
            setDrawer(false);
          })}
          {forwardable
            ? action('forward', 'Forward', t('screens.messages.forward'), () => {
                setDrawer(false);
                setForwardOpen(true);
              })
            : null}
          {isOwn && onEdit
            ? action('edit', 'Pencil', t('screens.messages.edit'), () => {
                setDraft(message.body);
                setEditing(true);
                setDrawer(false);
              })
            : null}
          {isOwn && onDelete && !confirmDelete ? action('delete', 'Trash2', t('screens.messages.delete'), () => setConfirmDelete(true), colors.destructive) : null}
        </View>
        {confirmDelete ? (
          <View style={styles.confirm} testID="message-delete-confirm">
            <Text style={[styles.centerText, styles.bold]}>{t('screens.messages.deleteThisMessage')}</Text>
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

      {viewer !== null ? <ChatImageViewer images={viewerImages} initialIndex={viewer} onClose={() => setViewer(null)} onForward={forwardable ? () => setForwardOpen(true) : undefined} /> : null}
      {forwardOpen ? <ForwardMessageSheet open={forwardOpen} onClose={() => setForwardOpen(false)} payload={forwardPayload} userId={userId} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, width: '100%' },
  column: { flexShrink: 1, maxWidth: '85%' },
  senderName: { marginBottom: 2, marginStart: 12 },
  bubble: { paddingHorizontal: 12, paddingVertical: 6 },
  content: { gap: 8 },
  body: { fontSize: 15, lineHeight: 20 },
  md: { gap: 4 },
  list: { gap: 2, paddingStart: 4 },
  bold: { fontWeight: '600' },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: 'monospace', fontSize: 12, borderRadius: 4 },
  link: { textDecorationLine: 'underline', fontWeight: '500' },
  small: { fontSize: 12 },
  time: { fontSize: 11 },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 2 },
  metaBelow: { marginTop: 4 },
  image: { width: 240, height: 180, borderRadius: 12 },
  center: { alignItems: 'center', justifyContent: 'center' },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 8, padding: 10, maxWidth: 280 },
  fileText: { flex: 1, minWidth: 0 },
  download: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  forwarded: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  edit: { gap: 8, minWidth: 220 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8 },
  centerText: { textAlign: 'center' },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 8 },
  quick: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap' },
  action: { alignItems: 'center', gap: 6, paddingVertical: 12, width: '25%' },
  confirm: { gap: 12, paddingTop: 12 },
});
