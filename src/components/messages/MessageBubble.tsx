import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { splitMentionSegments, type Mention } from '@/lib/mentions';
import { useIsMobile } from '@/hooks/use-mobile';
import { resolveInAppEventPath } from '@/lib/inAppLinks';
import { useAuth } from '@/context/AuthProvider';
import { ClickableAvatar } from '@/components/ui/clickable-avatar';
import { MemberLink } from '@/components/ui/member-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { CalendarInviteStatus } from './CalendarInviteStatus';
import { 
  Clock, 
  Check, 
  CheckCheck, 
  Loader2, 
  FileText,
  Image as ImageIcon,
  Download,
  Maximize2,
  Reply,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  X,
  Copy,
  Forward,
  Pencil,
  Trash2,
  Play,
  Pause,
  Mic,
  AlertCircle,
  RotateCw
} from 'lucide-react';
import { VitanaMessageActions } from './VitanaMessageActions';
import { ChatImageViewer, type ChatViewerImage } from './ChatImageViewer';
import { ForwardMessageSheet, type ForwardPayload } from './ForwardMessageSheet';
import { formatFileSize, getSignedAttachmentUrl } from '@/lib/fileUpload';
import {
  canForwardMessage,
  copyImageAndNotify,
  downloadChatFile,
  isImageAttachment,
  type ChatAttachmentLike,
} from '@/lib/chatImageActions';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { MessageContextMenu } from './MessageContextMenu';
import { ReactionCluster } from './ReactionCluster';
import { ReactionPopover } from './ReactionPopover';
import { ReplyQuote } from './ReplyQuote';
import { PaymentMessageHandler } from '@/components/payment/PaymentMessageHandler';
import { t, useI18nLocale } from '@/lib/i18n-toast';
import { describeGroupNotice } from '@/lib/messaging/groupSystemNotice';
import { isVitanaBot, VITANA_BOT_DISPLAY_NAME, VITANA_BOT_AVATAR_URL } from '@/lib/vitanaBotIdentity';

import { formatDate } from '@/lib/locale-format';
import { type GroupPosition, isGroupEnd, isGroupStart } from '@/lib/messaging/grouping';
import { CalendarInviteCard } from '@/components/messages/CalendarInviteCard';
import { isInviteCard } from '@/lib/calendar-window-client';
import { VitanaChatCard, isVitanaCardPayload } from '@/components/vitana/VitanaChatCard';
interface MessageBubbleProps {
  message: any; // Can be Message or GlobalMessage or TenantMessage
  isOwnMessage: boolean;
  onActionClick?: (action: any) => void;
  showAvatar?: boolean;
  onReply?: (message: any) => void;
  onScrollToMessage?: (messageId: string) => void;
  parentMessage?: any;
  onUpdateMessage?: (messageId: string, updates: any) => void;
  onDeleteMessage?: (messageId: string) => void;
  onSendReply?: (content: string, messageType?: string, contentData?: any) => Promise<void>;
  /** VTID-05320: re-send a failed message (its client_message_id). */
  onRetry?: (clientMessageId: string) => void;
  /** VTID-05318: the replied-to message is not available in this conversation. */
  parentUnavailable?: boolean;
  /** VTID-05314: place of this bubble in a run of one sender's messages. */
  groupPosition?: GroupPosition;
}

// WhatsApp-style voice message player
const VoiceMessagePlayer: React.FC<{ url?: string; duration?: number; isOwnMessage: boolean }> = ({ url, duration: initialDuration, isOwnMessage }) => {
  const [playing, setPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);

  const safeDuration = initialDuration && isFinite(initialDuration) ? initialDuration : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const toggle = () => {
    if (!audioElRef.current) {
      if (!url) return;
      const a = new Audio(url);
      audioElRef.current = a;
      a.ontimeupdate = () => {
        setCurrentTime(a.currentTime);
        if (a.duration && isFinite(a.duration)) {
          setProgress((a.currentTime / a.duration) * 100);
        }
      };
      a.onended = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
      a.play();
      setPlaying(true);
      return;
    }

    if (playing) {
      audioElRef.current.pause();
    } else {
      audioElRef.current.play();
    }
    setPlaying(!playing);
  };

  React.useEffect(() => {
    return () => { audioElRef.current?.pause(); };
  }, []);

  const displayTime = currentTime > 0 ? currentTime : safeDuration;

  return (
    // design-allow-next-line: measured bubble box / viewport-bound width
    <div className="flex items-center gap-2 min-w-[180px] max-w-[260px]">
      <button
        onClick={toggle}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          // design-allow-next-line: scrim on fixed-colour bubble/media, theme-independent
          isOwnMessage ? "bg-black/10 hover:bg-black/20" : "bg-primary/10 hover:bg-primary/20"
        )}
      >
        {playing
          ? <Pause className="h-3.5 w-3.5" />
          : <Play className="h-3.5 w-3.5 ms-0.5" />
        }
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {/* design-allow-next-line: scrim on fixed-colour bubble/media, theme-independent */}
        <div className="h-1 bg-black/10 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-100",
              // design-allow-next-line: scrim on fixed-colour bubble/media, theme-independent
              isOwnMessage ? "bg-black/30" : "bg-primary/60"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-1">
          <Mic className="h-3 w-3 opacity-50" />
          <span className="text-[11px] opacity-70 tabular-nums">
            {formatTime(displayTime)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Older clients synthesized a placeholder body like "Shared filename.jpg"
// (single attachment) or "Shared 3 files" (multiple) so the chat_messages
// row had non-empty content. The composer no longer does this, but already-
// sent messages still carry it — suppress so the bubble doesn't show the
// filename twice (once as a caption, once on the image overlay/file chip).
function isLegacySharedPlaceholder(body: string | undefined, contentData: any): boolean {
  if (!body) return false;
  const trimmed = body.trim();
  if (!trimmed.startsWith('Shared ')) return false;
  const attachments = Array.isArray(contentData?.attachments) ? contentData.attachments : [];
  if (attachments.length === 0) return false;
  if (attachments.length === 1) {
    const filename = attachments[0]?.filename || attachments[0]?.name;
    return !!filename && trimmed === `Shared ${filename}`;
  }
  return trimmed === `Shared ${attachments.length} files`;
}

/**
 * VTID-05314: corners facing the neighbours of the same group are tightened;
 * the last bubble keeps the full (tail) corner. Logical classes, so RTL mirrors.
 */
function groupCornerClass(position: GroupPosition | undefined, isOwnMessage: boolean): string | false {
  if (!position || position === 'single') return false;
  const top = isOwnMessage ? 'rounded-se-md' : 'rounded-ss-md';
  const bottom = isOwnMessage ? 'rounded-ee-md' : 'rounded-es-md';
  if (position === 'first') return bottom;
  if (position === 'last') return top;
  return cn(top, bottom);
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onActionClick,
  showAvatar = true,
  onReply,
  onScrollToMessage,
  parentMessage,
  onUpdateMessage,
  onDeleteMessage,
  onSendReply,
  onRetry,
  parentUnavailable,
  groupPosition
}) => {
  // VTID-03663 — this component is React.memo'd (see the default export), so it
  // bails out on shallow-equal props and the LanguageProvider re-render cascade
  // cannot reach it. Without this subscription its t() strings stay in the
  // outgoing language while the rest of the thread switches. The returned value
  // is unused on purpose: the subscription is the point.
  useI18nLocale();
  const navigate = useNavigate();
  // VTID-04926: members tagged in this message (group chat stores them in the
  // message metadata, surfaced here as content_data.mentions).
  const messageMentions: Mention[] = useMemo(() => {
    const raw = (message?.content_data as { mentions?: unknown } | null | undefined)?.mentions;
    return Array.isArray(raw) ? (raw as Mention[]) : [];
  }, [message?.content_data]);

  const isMobile = useIsMobile();
  const { user } = useAuth();
  const messageRef = useRef<HTMLDivElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTapTime = useRef(0);
  const [showDoubleTapReactions, setShowDoubleTapReactions] = useState(false);
  // VTID-05138: full-screen viewer for this message's pictures + forward sheet.
  const [viewer, setViewer] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [forwardOpen, setForwardOpen] = useState(false);
  const [showReactionPopover, setShowReactionPopover] = useState(false);
  const [resolvedUrls, setResolvedUrls] = useState<Map<string, string>>(new Map());
  // VTID-05138: image failures are keyed by URL (a fresh signed URL gets its
  // own chance), paths that could not be signed fall back to the stored URL,
  // and a path is re-signed at most once after its picture fails to load.
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const [unsignablePaths, setUnsignablePaths] = useState<Set<string>>(new Set());
  const [resigningPaths, setResigningPaths] = useState<Set<string>>(new Set());
  const resignedPathsRef = useRef<Set<string>>(new Set());

  // Resolve fresh signed URLs for attachments from private bucket
  const resolveAttachmentUrl = useCallback(async (attachment: any): Promise<string> => {
    const cacheKey = attachment.path || attachment.url;
    const cached = resolvedUrls.get(cacheKey);
    if (cached) return cached;

    if (attachment.path) {
      const freshUrl = await getSignedAttachmentUrl(attachment.path);
      if (freshUrl) {
        setResolvedUrls(prev => new Map(prev).set(cacheKey, freshUrl));
        return freshUrl;
      }
    }
    return attachment.url;
  }, [resolvedUrls]);

  // Eagerly resolve URLs for image attachments on render
  const contentData = message.content_data;
  const attachments = useMemo(() => {
    if (!contentData?.attachments) return [];
    return contentData.attachments as any[];
  }, [contentData]);

  // VTID-05138: legacy `content_data.files` entries that carry a link or a
  // storage path render like attachments (pictures inline).
  const legacyFileAttachments = useMemo<ChatAttachmentLike[]>(() => {
    if (!Array.isArray(contentData?.files)) return [];
    return (contentData.files as any[])
      .filter((f) => f && (f.url || f.path))
      .map((f) => ({
        type: typeof f.type === 'string' && f.type.startsWith('image/') ? 'image' : 'file',
        mime: typeof f.type === 'string' ? f.type : undefined,
        filename: f.name || f.filename,
        name: f.name || f.filename,
        size: f.size,
        url: f.url,
        path: f.path,
      }));
  }, [contentData]);

  const allAttachments = useMemo<ChatAttachmentLike[]>(
    () => [...attachments, ...legacyFileAttachments],
    [attachments, legacyFileAttachments]
  );

  useEffect(() => {
    let cancelled = false;
    allAttachments.forEach((att) => {
      const path = att.path;
      if (path && !resolvedUrls.has(path)) {
        getSignedAttachmentUrl(path).then(url => {
          if (cancelled) return;
          if (url) {
            setResolvedUrls(prev => new Map(prev).set(path, url));
          } else {
            setUnsignablePaths(prev => new Set(prev).add(path));
          }
        });
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAttachments]);

  /**
   * The URL a picture should be shown from: the fresh signed URL for a stored
   * path, never the stale upload-time one first. `undefined` = still signing
   * (render a skeleton). The stored URL is used only when signing failed or
   * the attachment has no path.
   */
  const displayUrlFor = useCallback((att: ChatAttachmentLike): string | undefined => {
    if (att.path) {
      const fresh = resolvedUrls.get(att.path);
      if (fresh) return fresh;
      if (unsignablePaths.has(att.path)) return att.url || '';
      return undefined;
    }
    return att.url || '';
  }, [resolvedUrls, unsignablePaths]);

  const handleImageError = useCallback((att: ChatAttachmentLike, failedUrl: string) => {
    console.warn('[Attachment] Image failed to load:', att.filename || att.name);
    const path = att.path;
    if (path && !resignedPathsRef.current.has(path)) {
      // One fresh signature (bypassing the cached one) before giving up.
      resignedPathsRef.current.add(path);
      setResigningPaths(prev => new Set(prev).add(path));
      getSignedAttachmentUrl(path).then(url => {
        setResigningPaths(prev => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
        if (url && url !== failedUrl) {
          setResolvedUrls(prev => new Map(prev).set(path, url));
        }
        setFailedUrls(prev => new Set(prev).add(failedUrl));
      });
      return;
    }
    setFailedUrls(prev => new Set(prev).add(failedUrl));
  }, []);

  const imageAttachments = useMemo(
    () => allAttachments.filter(isImageAttachment),
    [allAttachments]
  );

  const viewerImages = useMemo<ChatViewerImage[]>(
    () => imageAttachments.map((att) => ({
      url: displayUrlFor(att) || '',
      filename: att.filename || att.name || '',
    })),
    [imageAttachments, displayUrlFor]
  );

  const canForward = canForwardMessage(message);
  const forwardPayload = useMemo<ForwardPayload>(() => {
    const body = (message.body || message.content || '') as string;
    return {
      body: isLegacySharedPlaceholder(body, message.content_data) ? '' : body,
      attachments: allAttachments,
    };
  }, [message.body, message.content, message.content_data, allAttachments]);
  // The sheet's "share via other apps" gets the pictures' fresh URLs.
  const sheetPayload = useMemo<ForwardPayload>(
    () => ({ ...forwardPayload, shareImages: viewerImages.filter((img) => !!img.url) }),
    [forwardPayload, viewerImages]
  );
  const isForwarded = message.content_data?.forwarded === true;

  // Use reactions hook
  const { reactionSummary, addReaction, removeReaction } = useMessageReactions(message.id);

  // Check if this is an optimistic message (temporary)
  const isOptimistic = message.id?.toString().startsWith('temp-');
  // VTID-05320: outbox rows carry send_status (sending | failed).
  const isFailed = message.send_status === 'failed';

  const getMessageStatus = () => {
    if (isFailed) {
      return 'failed';
    }
    if (isOptimistic || message.send_status === 'sending') {
      return 'sending';
    }
    
    // WhatsApp-style status logic with idempotent checks
    // Never regress from read → delivered → sent
    if (message.read_at) {
      return 'read';
    }
    
    if (message.delivered_at) {
      return 'delivered';
    }
    
    if (message.sent_at || message.created_at) {
      return 'sent';
    }
    
    return 'sending';
  };

  const renderStatusIcon = (decorative = false) => {
    if (!isOwnMessage) return null;

    const status = getMessageStatus();

    // VTID-05320: every state has its own icon and a spoken label (the
    // invisible layout spacer copy carries neither).
    const a11y = decorative
      ? { 'aria-hidden': true as const }
      : { role: 'img', 'aria-label': t(`inbox.messageStatus.${status}`), 'data-testid': `message-status-${status}` };
    switch (status) {
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-destructive" {...a11y} />;
      case 'sending':
        return <Clock className="w-3 h-3" {...a11y} />;
      case 'sent':
        // Single checkmark - message sent but not delivered
        return <Check className="w-3 h-3" {...a11y} />;
      case 'delivered':
        // Double checkmark - message delivered but not read
        return <CheckCheck className="w-3 h-3" {...a11y} />;
      case 'read':
        // Colored double checkmark - message read (WhatsApp style)
        return <CheckCheck className="w-3 h-3 text-primary" {...a11y} />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  // Inline per-message timestamp (WhatsApp-style, bottom-right corner of bubble)
  // "Text-like" = no structured content to render (cards / media / voice / attachments).
  // message_type alone is unreliable — e.g. an 'attachment' message with empty
  // content_data.attachments should render as plain text, not a media card.
  const hasAttachments = Array.isArray(message.content_data?.attachments)
    && message.content_data.attachments.length > 0;
  const hasLegacyFiles = Array.isArray(message.content_data?.files)
    && message.content_data.files.length > 0;
  const hasStructuredContent =
    message.message_type === 'voice' ||
    message.message_type === 'calendar_invite' ||
    message.message_type === 'service_booking' ||
    message.message_type === 'payment_request' ||
    message.message_type === 'exchange_and_send' ||
    message.message_type === 'payment_confirmation' ||
    message.message_type === 'template' ||
    hasAttachments ||
    hasLegacyFiles;
  const isTextMessageType = !hasStructuredContent;
  const formattedTime = formatDate(new Date(message.created_at), 'HH:mm');
  // VTID-05314: in a group the avatar/name sit on the first bubble and the
  // time on the last. Earlier bubbles keep the time in their corner but show
  // it only on hover / keyboard focus (inside the bubble, never clipped), to
  // screen readers once (sr-only) and in the long-press drawer. My own earlier
  // bubbles always show their delivery status icon (R7: Sending / Not sent).
  const groupStart = isGroupStart(groupPosition);
  const groupEnd = isGroupEnd(groupPosition);
  const showTime = groupEnd;
  // The corner stamp (and its spacer) exists on every bubble; on earlier
  // bubbles the time inside it is revealed on hover / focus only.
  const revealTimeClass = showTime ? undefined : 'opacity-0 transition-opacity group-hover/bubble:opacity-100 group-focus-visible/bubble:opacity-100';
  const showSenderHeader = showAvatar && groupStart;
  const timestampColorClass = isOwnMessage
    ? 'text-domain-messages-bubble-foreground/60'
    : 'text-muted-foreground';
  const timestampInner = (
    <>
      <span
        className={cn("tabular-nums", revealTimeClass)}
        aria-hidden={showTime ? undefined : true}
        data-testid={showTime ? undefined : 'message-hover-time'}
      >
        {formattedTime}
      </span>
      {renderStatusIcon()}
    </>
  );
  const timestampSpacerInner = (
    <>
      <span className="tabular-nums">{formattedTime}</span>
      {renderStatusIcon(true)}
    </>
  );
  const hiddenTimeLabel = formatDate(new Date(message.created_at), 'PPp');
  // Ghost spacer appended inside the text <p> so the last line reserves
  // room for the corner-pinned timestamp (matches timestamp width exactly).
  const textTimestampSpacer = (
    <span
      aria-hidden="true"
      className="inline-flex items-center gap-1 ms-2 text-[10px] leading-none invisible select-none pointer-events-none"
    >
      {timestampSpacerInner}
    </span>
  );
  // Real timestamp, absolutely positioned in the bubble's bottom-right corner.
  const textTimestampOverlay = (
    <span
      className={cn(
        "absolute bottom-1.5 end-2.5 inline-flex items-center gap-1 text-[10px] leading-none select-none pointer-events-none",
        timestampColorClass
      )}
    >
      {timestampInner}
    </span>
  );
  // Fallback row for media / cards / voice / edit mode — below the content.
  const inlineBelowTimestamp = (
    <div
      className={cn(
        "flex items-center justify-end gap-1 mt-1 text-[10px] leading-none",
        timestampColorClass
      )}
    >
      {timestampInner}
    </div>
  );

  const handleImageClick = (attachment: ChatAttachmentLike) => {
    const index = Math.max(0, imageAttachments.indexOf(attachment));
    setViewer({ open: true, index });
  };

  const handleFileClick = async (attachment: any) => {
    const url = await resolveAttachmentUrl(attachment);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async (attachment: any) => {
    const url = await resolveAttachmentUrl(attachment);
    await downloadChatFile(url, attachment.filename || attachment.name || '');
  };

  // Reaction and action handlers
  const handleReactionSelect = useCallback((emoji: string) => {
    addReaction(emoji);
  }, [addReaction]);

  const handleReply = useCallback(() => {
    if (onReply) {
      onReply(message);
    }
  }, [onReply, message]);

  const handleCopy = useCallback(() => {
    // VTID-05138: a picture-only message copies the picture itself.
    const text = forwardPayload.body.trim();
    if (!text && imageAttachments.length > 0) {
      void copyImageAndNotify(viewerImages[0]?.url || '');
      return;
    }
    navigator.clipboard.writeText(message.body || message.content || '');
  }, [message, forwardPayload.body, imageAttachments.length, viewerImages]);

  // A1: the sheet opens on top of the viewer (if it is open) and closing it
  // returns to the picture — the viewer is never closed here.
  const handleForward = useCallback(() => {
    setForwardOpen(true);
  }, []);

  const handleStar = useCallback(() => {
    // TODO: Implement star functionality
    console.log('Star message:', message.id);
  }, [message]);

  const handlePin = useCallback(() => {
    // TODO: Implement pin functionality
    console.log('Pin message:', message.id);
  }, [message]);

  const handleDelete = useCallback(() => {
    if (!onDeleteMessage) return;
    setShowDeleteConfirm(true);
  }, [onDeleteMessage]);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!onDeleteMessage) return;
    setIsDeletePending(true);
    setIsDeleted(true);
    try {
      await onDeleteMessage(message.id);
      console.log('[Delete] Succeeded for message:', message.id);
      setShowDoubleTapReactions(false);
      setShowDeleteConfirm(false);
    } catch {
      console.error('[Delete] Failed for message:', message.id);
      setIsDeleted(false);
    } finally {
      setIsDeletePending(false);
    }
  }, [message.id, onDeleteMessage]);

  const handleSelect = useCallback(() => {
    // TODO: Implement select functionality for multi-select mode
    console.log('Select message:', message.id);
  }, [message]);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [optimisticContent, setOptimisticContent] = useState<string | null>(null);

  // Keyboard avoidance: scroll edit container into view on mobile
  useEffect(() => {
    if (!isEditing) return;

    const scrollToEdit = () => {
      editContainerRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    // Initial scroll after DOM update, then focus textarea
    const t1 = setTimeout(scrollToEdit, 100);
    const t2 = setTimeout(() => {
      editTextareaRef.current?.focus();
    }, 200);

    // Re-scroll when keyboard opens/closes (viewport resize)
    const vv = window.visualViewport;
    if (vv && isMobile) {
      vv.addEventListener('resize', scrollToEdit);
      vv.addEventListener('scroll', scrollToEdit);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (vv && isMobile) {
        vv.removeEventListener('resize', scrollToEdit);
        vv.removeEventListener('scroll', scrollToEdit);
      }
    };
  }, [isEditing, isMobile]);
  const [isDeleted, setIsDeleted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const handleEdit = useCallback(() => {
    const content = message.body || message.content || '';
    setEditContent(content);
    setIsEditing(true);
  }, [message]);

  const handleEditSave = useCallback(async () => {
    if (!editContent.trim() || !onUpdateMessage) return;
    const trimmed = editContent.trim();
    setOptimisticContent(trimmed);
    setIsEditing(false);
    try {
      await onUpdateMessage(message.id, { body: trimmed, content: trimmed });
      console.log('[Edit] Save succeeded for message:', message.id);
    } catch {
      console.error('[Edit] Save failed for message:', message.id);
      setOptimisticContent(null);
      setIsEditing(true);
    }
  }, [editContent, message.id, onUpdateMessage]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditContent('');
  }, []);

  const handleScrollToParent = useCallback(() => {
    const parentId = message.parent_message_id || message.reply_to_message_id;
    if (onScrollToMessage && parentId) {
      onScrollToMessage(parentId);
    }
  }, [onScrollToMessage, message.parent_message_id, message.reply_to_message_id]);

  // Long press handling for mobile - shows reaction drawer (WhatsApp style)
  const isLongPress = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const pendingDrawerOpen = useRef(false);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isLongPress.current = false;
    pendingDrawerOpen.current = false;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      // Don't open drawer yet — defer to touchend so vaul doesn't
      // interpret the finger-lift as a dismiss gesture
      pendingDrawerOpen.current = true;
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Once long-press is confirmed, ignore post-confirmation jitter
    if (pendingDrawerOpen.current) return;
    if (!longPressTimer.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (dx > 15 || dy > 15) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Unified finalizer — called by both touchend and touchcancel
  const finalizeLongPressGesture = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (pendingDrawerOpen.current) {
      pendingDrawerOpen.current = false;
      setShowDoubleTapReactions(true);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    finalizeLongPressGesture();
  }, [finalizeLongPressGesture]);

  // On Android webview, long-press often fires touchcancel instead of touchend.
  // We must still open the drawer if the gesture was already confirmed.
  const handleTouchCancel = useCallback(() => {
    finalizeLongPressGesture();
  }, [finalizeLongPressGesture]);

  const renderLinkedText = useCallback((text?: string, className?: string, trailingInline?: React.ReactNode) => {
    if (!text) return null;

    const urlRegex = /https?:\/\/[^\s<]+/gi;
    const trailingPunctuation = '.,!?;:)]}';
    const nodes: React.ReactNode[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    // VTID-04926: @mentions stored with the message (group chat) become links
    // to the member's profile; everything else stays plain text.
    const pushPlain = (chunk: string, offset: number) => {
      if (!chunk) return;
      if (messageMentions.length === 0) {
        nodes.push(chunk);
        return;
      }
      for (const seg of splitMentionSegments(chunk, messageMentions)) {
        if (seg.type === 'text') {
          nodes.push(seg.text);
        } else {
          nodes.push(
            <Link
              key={`mention-${seg.mention.user_id}-${offset}-${nodes.length}`}
              to={`/u/${seg.mention.user_id}`}
              data-testid="message-mention"
              className={cn(
                "font-semibold",
                isOwnMessage ? "text-primary-foreground underline underline-offset-2" : "text-domain-messages-accent hover:underline"
              )}
              onClick={(event) => event.stopPropagation()}
            >
              {seg.text}
            </Link>
          );
        }
      }
    };

    while ((match = urlRegex.exec(text)) !== null) {
      const rawUrl = match[0];
      const start = match.index;

      if (start > lastIndex) {
        pushPlain(text.slice(lastIndex, start), lastIndex);
      }

      let cleanUrl = rawUrl;
      let trailing = '';

      while (
        cleanUrl.length > 0 &&
        trailingPunctuation.includes(cleanUrl[cleanUrl.length - 1])
      ) {
        trailing = cleanUrl[cleanUrl.length - 1] + trailing;
        cleanUrl = cleanUrl.slice(0, -1);
      }

      // VTID-04902: links to one of our events open the Events screen in the
      // app, not the public landing page in a browser layer over the chat.
      const inAppPath = cleanUrl ? resolveInAppEventPath(cleanUrl) : null;

      if (cleanUrl && inAppPath) {
        nodes.push(
          <a
            key={`${cleanUrl}-${start}`}
            href={cleanUrl}
            data-in-app-link="event"
            className={cn(
              "underline underline-offset-2 break-all font-medium",
              isOwnMessage ? "text-primary-foreground" : "text-primary"
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              navigate(inAppPath);
            }}
          >
            {cleanUrl}
          </a>
        );
      } else if (cleanUrl) {
        nodes.push(
          <a
            key={`${cleanUrl}-${start}`}
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "underline underline-offset-2 break-all font-medium",
              isOwnMessage ? "text-primary-foreground" : "text-primary"
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {cleanUrl}
          </a>
        );
      }

      if (trailing) {
        nodes.push(trailing);
      }

      lastIndex = start + rawUrl.length;
    }

    if (lastIndex < text.length) {
      pushPlain(text.slice(lastIndex), lastIndex);
    }

    if (trailingInline) {
      nodes.push(trailingInline);
    }

    return (
      <p className={cn("whitespace-pre-wrap break-words", className)}>
        {nodes.length > 0 ? nodes : text}
      </p>
    );
  }, [isOwnMessage, navigate, messageMentions]);

  const renderAttachment = (attachment: any, key: string) => {
    // Mime can be empty on Android pickers; fall back to filename extension
    // so already-sent screenshots stored as type:'file' still render inline
    // (previous send-side detection missed empty-mime PNGs from SAF).
    const isImage = isImageAttachment(attachment);
    const displayUrl = displayUrlFor(attachment);
    const isResigning = !!attachment.path && resigningPaths.has(attachment.path);
    // VTID-05138: until the fresh signed URL is there, hold the place with a
    // fixed-size skeleton — never try the stale stored URL first.
    if (isImage && (displayUrl === undefined || isResigning)) {
      return (
        <div
          key={key}
          className="h-48 w-64 max-w-full animate-pulse rounded-lg bg-muted"
          role="status"
          aria-label={t('screens.messages.imageLoading')}
          data-testid="chat-image-skeleton"
        />
      );
    }
    const imageLoadFailed = !displayUrl || failedUrls.has(displayUrl);

    if (isImage && !imageLoadFailed) {
      return (
        <div 
          key={key}
          className="relative group cursor-pointer max-w-xs"
          onClick={() => handleImageClick(attachment)}
          data-testid="chat-image-attachment"
        >
          <img
            src={displayUrl}
            alt={attachment.filename || attachment.name}
            className="w-full h-auto rounded-lg max-h-64 object-cover"
            loading="lazy"
            onError={() => handleImageError(attachment, displayUrl as string)}
          />
          {/* VTID-05138: the hover shade and toolbar take no taps until hovered —
              on a phone (no hover) they stayed invisible but still caught taps,
              so a tap on the picture's corner downloaded it instead of opening
              the viewer, whose own toolbar covers download/copy/share/forward. */}
          {/* design-allow-next-line: scrim on fixed-colour bubble/media, theme-independent */}
          <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors" />
          <div
            className="pointer-events-none absolute bottom-2 end-2 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 transition-opacity flex gap-1"
            data-testid="chat-image-hover-actions"
          >
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(attachment);
              }}
              aria-label={t('screens.messages.downloadImage')}
            >
              <Download className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick(attachment);
              }}
              aria-label={t('screens.messages.viewFullscreen')}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      );
    } else {
      return (
        <div
          key={key}
          className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border cursor-pointer hover:bg-background/70 transition-colors max-w-xs"
          onClick={() => handleFileClick(attachment)}
          data-testid="chat-file-chip"
        >
          <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.filename || attachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size)}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(attachment);
            }}
            aria-label={t('screens.messages.downloadFile')}
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      );
    }
  };
  
  const renderContent = () => {
    switch (message.message_type) {
      case 'payment_request':
      case 'exchange_and_send':
      case 'payment_confirmation':
        return (
          <PaymentMessageHandler
            message={message}
            onUpdateMessage={onUpdateMessage}
            onSendReply={onSendReply}
          />
        );

      case 'calendar_invite':
        // VTID-04917: cards the gateway built from a calendar entry.
        if (isInviteCard(message.content_data)) {
          return (
            <CalendarInviteCard messageId={message.id} invite={message.content_data} isOwnMessage={isOwnMessage} />
          );
        }
        return (
          <Card className="max-w-sm border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t('screens.messages.calendarInvite')}
                </Badge>
                {message.content_data?.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">{t('screens.messages.highPriority')}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2 mb-4">
                <h4 className="font-semibold text-base">
                  {message.content_data?.title || 'Event Invitation'}
                </h4>
                
                {message.content_data?.date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatDate(new Date(message.content_data.date), 'PPP')}
                      {message.content_data?.time && ` at ${message.content_data.time}`}
                    </span>
                  </div>
                )}
                
                {message.content_data?.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{message.content_data.location}</span>
                  </div>
                )}
                
                {message.content_data?.attendees && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{t('screens.messages.attendeesAttendees', { attendees: message.content_data.attendees })}</span>
                  </div>
                )}
                
                {message.body && renderLinkedText(
                  message.body,
                  "text-sm text-muted-foreground border-l-2 border-muted pl-3 mt-3"
                )}
              </div>
              
              <CalendarInviteStatus 
                messageId={message.id}
                actionButtons={message.action_buttons}
                onActionClick={onActionClick}
                messageData={message.content_data}
                senderId={message.sender_id}
              />
            </CardContent>
          </Card>
        );

      case 'service_booking':
        return (
          <Card className="max-w-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{t('screens.messages.serviceBooking')}</Badge>
              </div>
              <h4 className="font-semibold mb-1">
                {message.content_data?.service_name || 'Service Request'}
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                {message.content_data?.provider_name}
              </p>
              {renderLinkedText(message.body, "text-sm mb-3")}
              {message.action_buttons && (
                <div className="flex gap-2">
                  {message.action_buttons.map((button: any, index: number) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={button.variant || 'default'}
                      onClick={() => onActionClick?.({
                        ...button,
                        messageId: message.id
                      })}
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'system':
        return (
          <div className="text-center py-2">
            <Badge variant="outline" className="text-xs">
              {/* VTID-04955: group notices render from i18n with names, never the stored body (old bodies carry emails). */}
              {describeGroupNotice(message as Parameters<typeof describeGroupNotice>[0], t) ?? message.body}
            </Badge>
          </div>
        );

      case 'template':
        return (
          <div className="space-y-2">
            {renderLinkedText(message.body)}
            {message.content_data?.quick_replies && (
              <div className="flex flex-wrap gap-1">
                {message.content_data.quick_replies.map((reply: string, index: number) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => onActionClick?.({ 
                      type: 'quick_reply', 
                      text: reply,
                      messageId: message.id
                    })}
                  >
                    {reply}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );

      case 'voice': {
        const voiceAttachment = message.content_data?.attachments?.[0] || message.content_data;
        const voiceUrl = (voiceAttachment?.path && resolvedUrls.get(voiceAttachment.path)) || voiceAttachment?.url;
        const voiceDuration = voiceAttachment?.duration;
        return <VoiceMessagePlayer url={voiceUrl} duration={voiceDuration} isOwnMessage={isOwnMessage} />;
      }

      case 'attachment':
        // Defensive: messages sometimes arrive tagged 'attachment' with no
        // actual attachments (e.g. emoji-in-text sent through a picker path
        // that stripped payload). Fall back to plain text so width + corner
        // timestamp match every other text bubble.
        if (!hasAttachments && !hasLegacyFiles) {
          return renderLinkedText(optimisticContent ?? message.body, undefined, textTimestampSpacer);
        }
        return (
          <div className="space-y-3">
            {message.body && !isLegacySharedPlaceholder(message.body, message.content_data) &&
              renderLinkedText(message.body)}

            {/* New attachment format with proper rendering */}
            {message.content_data?.attachments && (
              <div className="space-y-2">
                {message.content_data.attachments.map((attachment: any, index: number) => 
                  renderAttachment(attachment, `att-${index}`)
                )}
              </div>
            )}
            
            {/* Legacy attachment format support — VTID-05138: entries with a
                link or a storage path render like attachments (pictures inline). */}
            {message.content_data?.files && (
              <div className="space-y-2">
                {legacyFileAttachments.map((attachment, index) =>
                  renderAttachment(attachment, `legacy-${index}`)
                )}
                {message.content_data.files
                  .filter((file: any) => !(file?.url || file?.path))
                  .map((file: any, index: number) => (
                  <div
                    key={`legacy-meta-${index}`}
                    className="flex items-center gap-2 p-2 bg-background/50 rounded-lg border"
                  >
                    {file.type?.startsWith('image/') ? (
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.size ? formatFileSize(file.size) : t('screens.messages.unknownSize')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default: // 'text' and other types
        // VTID-03587: a Vitana reply can carry actionable tool calls (e.g. open
        // a screen). They used to be dropped by the gateway entirely, so the
        // assistant narrated an action it could never perform. Render them as
        // explicit controls beneath the text.
        return (
          <>
            {renderLinkedText(optimisticContent ?? message.body, undefined, textTimestampSpacer)}
            <VitanaMessageActions contentData={message.content_data} />
          </>
        );
    }
  };

  // VTID-05100 — a Vitana companion message carries a Unified Card System card
  // in its metadata (`content_data.card`, numbers only). It renders under
  // Vitana's note with the same card component as everywhere else (owner
  // decision D3). Only the Vitana bot's own messages get a card; anything
  // else, or a payload the guard rejects, stays a plain bubble.
  const companionCard =
    isVitanaBot(message.sender_id || message.sender?.user_id) &&
    isVitanaCardPayload(message.content_data?.card)
      ? message.content_data.card
      : null;

  // Hide deleted messages optimistically
  if (isDeleted) return null;

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-2">
        {renderContent()}
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "flex gap-1.5 w-full relative",
        isOwnMessage ? "justify-end" : "justify-start"
      )}>
        {/* Avatar column - fixed width to maintain alignment */}
        <div className={cn(
          "w-8 flex justify-center",
          isOwnMessage && "order-2"
        )}>
          {showSenderHeader && (() => {
            // VTID-04992: the sender's avatar opens their profile (the
            // Vitana assistant has none, so it stays a plain picture).
            const senderId = message.sender_id || (message.sender as any)?.user_id;
            const isBot = isVitanaBot(senderId);
            const senderName = message.sender?.display_name || message.sender?.full_name || 'User';
            return (
              <ClickableAvatar
                userId={isBot ? undefined : senderId}
                disabled={isBot}
                src={isBot ? VITANA_BOT_AVATAR_URL : message.sender?.avatar_url ?? undefined}
                fallback={isBot ? VITANA_BOT_DISPLAY_NAME[0] : (senderName[0] || 'U').toUpperCase()}
                alt={senderName}
                className="w-8 h-8 flex-shrink-0 mt-0.5"
              />
            );
          })()}
        </div>
        
        {/* Message content column */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden",
          isOwnMessage ? "items-end order-1" : "items-start"
        )}>
          {!isOwnMessage && showSenderHeader && (() => {
            const senderId = message.sender_id || (message.sender as any)?.user_id;
            const isBot = isVitanaBot(senderId);
            const name = isBot
              ? VITANA_BOT_DISPLAY_NAME
              : message.sender?.display_name || message.sender?.full_name || 'Unknown User';
            return (
              <span className="text-xs text-muted-foreground mb-0.5 ms-3">
                {isBot ? name : <MemberLink userId={senderId}>{name}</MemberLink>}
              </span>
            );
          })()}
          
          <div className="relative">
            <MessageContextMenu
              onReply={onReply ? handleReply : undefined}
              onCopy={handleCopy}
              onForward={canForward ? handleForward : undefined}
              onStar={handleStar}
              onPin={handlePin}
              onDelete={isOwnMessage ? handleDelete : undefined}
              onSelect={handleSelect}
              onEdit={isOwnMessage ? handleEdit : undefined}
              onEmojiSelect={handleReactionSelect}
              isOwnMessage={isOwnMessage}
            >
              <div 
                ref={messageRef}
                tabIndex={0}
                data-group-position={groupPosition}
                className={cn(
                  // design-allow-next-line: measured bubble box / viewport-bound width
                  "group/bubble rounded-2xl px-3 py-1.5 max-w-[min(680px,90vw)] w-fit relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  "break-words select-none",
                  groupCornerClass(groupPosition, isOwnMessage),
                  isOwnMessage
                    ? "bg-domain-messages-bubble text-domain-messages-bubble-foreground"
                    : "bg-muted",
                  isOptimistic && "opacity-70"
                )}
                style={isMobile ? { touchAction: 'pan-y', WebkitTouchCallout: 'none' } : undefined}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onTouchCancel={handleTouchCancel}
                onContextMenu={(e) => { if (isMobile) e.preventDefault(); }}
              >
                {/* Reply Quote - shows if this message is replying to another */}
                {(message.parent_message_id || message.reply_to_message_id || parentMessage) && (
                  <ReplyQuote
                    parentMessage={parentMessage}
                    onQuoteClick={handleScrollToParent}
                    isOwnMessage={isOwnMessage}
                    unavailable={parentUnavailable}
                  />
                )}
                
                {isForwarded && !isEditing && (
                  <div
                    className="mb-1 flex items-center gap-1 text-xs italic opacity-70"
                    data-testid="message-forwarded-label"
                  >
                    <Forward className="h-3 w-3" aria-hidden />
                    <span>{t('screens.messages.forwardedLabel')}</span>
                  </div>
                )}

                {isEditing ? (
                  <div ref={editContainerRef} className="p-2 space-y-2">
                    <textarea
                      ref={editTextareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      // design-allow-next-line: measured bubble box / viewport-bound width
                      className="w-full min-h-[60px] rounded-md border-2 border-border bg-card text-card-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={handleEditCancel} className="text-foreground">
                        <X className="w-3 h-3 me-1" /> {t('screens.messages.cancel')}
                      </Button>
                      <Button size="sm" onClick={handleEditSave} disabled={!editContent.trim()}>
                        <Check className="w-3 h-3 me-1" /> {t('screens.messages.save')}
                      </Button>
                    </div>
                    {inlineBelowTimestamp}
                  </div>
                ) : (
                  <>
                    {renderContent()}
                    {isTextMessageType ? textTimestampOverlay : inlineBelowTimestamp}
                    {!showTime && <span className="sr-only">{hiddenTimeLabel}</span>}
                  </>
                )}
              </div>
            </MessageContextMenu>
            
            {/* Reaction Clusters */}
            <ReactionPopover
              reactions={reactionSummary}
              open={showReactionPopover}
              onOpenChange={setShowReactionPopover}
            >
              <div>
                <ReactionCluster
                  reactions={reactionSummary}
                  onReactionClick={addReaction}
                  onReactionRemove={removeReaction}
                  onShowPopover={() => setShowReactionPopover(true)}
                  className={cn(
                    isOwnMessage ? "justify-end" : "justify-start"
                  )}
                />
              </div>
            </ReactionPopover>
          </div>

          {/* VTID-05320: a message that could not be sent keeps its text and
              offers one-tap Retry (same client_message_id, never a duplicate). */}
          {isOwnMessage && isFailed && message.client_message_id && onRetry && (
            <div className="mt-0.5 flex items-center justify-end gap-1.5 text-xs text-destructive" data-testid="message-failed-row">
              <span>{t('inbox.messageStatus.failed')}</span>
              <button
                type="button"
                onClick={() => onRetry?.(message.client_message_id)}
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t('inbox.messageStatus.retryLabel')}
                data-testid="message-retry"
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden />
                {t('inbox.messageStatus.retry')}
              </button>
            </div>
          )}

          {/* VTID-05100 — the card sits under the bubble, outside its context
              menu, so a tap opens the card's screen. No X in the chat. */}
          {companionCard && (
            <div className="mt-1.5 w-full max-w-md" data-testid="vitana-companion-card">
              <VitanaChatCard card_type={companionCard.card_type} params={companionCard.params} dismissible={false} />
            </div>
          )}
        </div>
      </div>

      {/* VTID-05138: full-screen picture viewer */}
      {viewer.open && (
        <ChatImageViewer
          open={viewer.open}
          images={viewerImages}
          initialIndex={viewer.index}
          onClose={() => setViewer(v => ({ ...v, open: false }))}
          onForward={canForward ? handleForward : undefined}
          keyboardSuspended={forwardOpen}
        />
      )}

      {/* VTID-05138: forward to up to five chats or groups */}
      {forwardOpen && (
        <ForwardMessageSheet
          open={forwardOpen}
          onOpenChange={setForwardOpen}
          payload={sheetPayload}
          aboveViewer={viewer.open}
        />
      )}

      {/* Mobile long-press reaction/action drawer */}
      <Drawer open={showDoubleTapReactions} onOpenChange={(open) => { setShowDoubleTapReactions(open); if (!open) setShowDeleteConfirm(false); }} repositionInputs={false}>
        <DrawerContent className="!z-[120] pb-safe" overlayClassName="!z-[119]">
          <div className="px-4 pt-2 pb-4 space-y-4">
            {/* VTID-05314: the time of a grouped bubble that does not show it. */}
            {!showTime && (
              <p className="text-center text-xs text-muted-foreground tabular-nums" data-testid="message-drawer-time">
                {hiddenTimeLabel}
              </p>
            )}
            {/* Quick reactions row */}
            <div className="flex justify-center gap-3 py-2">
              {['👍', '❤️', '😂', '😮', '🙏', '🎉'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    handleReactionSelect(emoji);
                    setShowDoubleTapReactions(false);
                  }}
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full",
                    "active:bg-accent transition-colors duration-150",
                    "text-2xl active:scale-110 transform transition-transform"
                  )}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-4 gap-2">
              {onReply && (
                <button
                  onClick={() => { handleReply(); setShowDoubleTapReactions(false); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-accent transition-colors"
                >
                  <Reply className="w-5 h-5 text-foreground" />
                  <span className="text-xs text-muted-foreground">{t('screens.messages.reply')}</span>
                </button>
              )}
              <button
                onClick={() => { handleCopy(); setShowDoubleTapReactions(false); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-accent transition-colors"
                data-testid="message-action-copy"
              >
                <Copy className="w-5 h-5 text-foreground" />
                <span className="text-xs text-muted-foreground">{t('screens.messages.copy')}</span>
              </button>
              {canForward && (
                <button
                  onClick={() => { setShowDoubleTapReactions(false); handleForward(); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-accent transition-colors"
                  data-testid="message-action-forward"
                >
                  <Forward className="w-5 h-5 text-foreground" />
                  <span className="text-xs text-muted-foreground">{t('screens.messages.forward')}</span>
                </button>
              )}
              {isOwnMessage && (
                <button
                  onClick={() => { handleEdit(); setShowDoubleTapReactions(false); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-accent transition-colors"
                >
                  <Pencil className="w-5 h-5 text-foreground" />
                  <span className="text-xs text-muted-foreground">{t('screens.messages.edit')}</span>
                </button>
              )}
              {isOwnMessage && !showDeleteConfirm && (
                <button
                  onClick={() => { handleDelete(); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-accent transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <span className="text-xs text-destructive">{t('screens.messages.delete')}</span>
                </button>
              )}
            </div>
            
            {/* Inline delete confirmation */}
            {showDeleteConfirm && (
              <div className="border-t border-border pt-3 mt-2 space-y-3">
                <p className="text-sm text-center text-foreground font-medium">{t('screens.messages.deleteThisMessage')}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletePending}
                  >{t('screens.messages.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteConfirmed}
                    disabled={isDeletePending}
                  >
                    {isDeletePending ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <Trash2 className="w-4 h-4 me-1" />}{t('screens.messages.delete')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

// Memoized: ConversationView/GroupChat render the full (unvirtualized)
// message history, so without memo every parent state change (typing,
// scroll, presence) re-renders every bubble in the thread.
export default React.memo(MessageBubble);