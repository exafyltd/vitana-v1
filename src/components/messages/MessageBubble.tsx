import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { CalendarInviteStatus } from './CalendarInviteStatus';
import { 
  Clock, 
  Check, 
  CheckCheck, 
  Loader2, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  ExternalLink, 
  Reply,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  X,
  Copy,
  Forward,
  Pencil,
  Trash2
} from 'lucide-react';
import { ImageZoomModal } from './ImageZoomModal';
import { formatFileSize, isImageType, getSignedAttachmentUrl } from '@/lib/fileUpload';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { MessageContextMenu } from './MessageContextMenu';
import { ReactionCluster } from './ReactionCluster';
import { ReactionPopover } from './ReactionPopover';
import { ReplyQuote } from './ReplyQuote';
import { PaymentMessageHandler } from '@/components/payment/PaymentMessageHandler';

interface MessageBubbleProps {
  message: any; // Can be Message or GlobalMessage or TenantMessage
  isOwnMessage: boolean;
  onActionClick?: (action: any) => void;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  onReply?: (message: any) => void;
  onScrollToMessage?: (messageId: string) => void;
  parentMessage?: any;
  onUpdateMessage?: (messageId: string, updates: any) => void;
  onDeleteMessage?: (messageId: string) => void;
  onSendReply?: (content: string, messageType?: string, contentData?: any) => Promise<void>;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onActionClick,
  showAvatar = true,
  showTimestamp = true,
  onReply,
  onScrollToMessage,
  parentMessage,
  onUpdateMessage,
  onDeleteMessage,
  onSendReply
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const messageRef = useRef<HTMLDivElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTapTime = useRef(0);
  const [showDoubleTapReactions, setShowDoubleTapReactions] = useState(false);
  const [imageZoomModal, setImageZoomModal] = useState<{ isOpen: boolean; url: string; filename: string }>({
    isOpen: false,
    url: '',
    filename: ''
  });
  const [showReactionPopover, setShowReactionPopover] = useState(false);

  // Use reactions hook
  const { reactionSummary, addReaction, removeReaction } = useMessageReactions(message.id);

  // Check if this is an optimistic message (temporary)
  const isOptimistic = message.id?.toString().startsWith('temp-');
  
  const getMessageStatus = () => {
    if (isOptimistic) {
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

  const renderStatusIcon = () => {
    if (!isOwnMessage) return null;
    
    const status = getMessageStatus();
    
    switch (status) {
      case 'sending':
        return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
      case 'sent':
        // Single checkmark - message sent but not delivered
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered':
        // Double checkmark - message delivered but not read
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'read':
        // Colored double checkmark - message read (WhatsApp style)
        return <CheckCheck className="w-3 h-3 text-primary" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const handleImageClick = (url: string, filename: string) => {
    setImageZoomModal({ isOpen: true, url, filename });
  };

  const handleFileClick = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    navigator.clipboard.writeText(message.body || message.content || '');
  }, [message]);

  const handleForward = useCallback(() => {
    // TODO: Implement forward functionality
    console.log('Forward message:', message.id);
  }, [message]);

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

  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const renderLinkedText = useCallback((text?: string, className?: string) => {
    if (!text) return null;

    const urlRegex = /https?:\/\/[^\s<]+/gi;
    const trailingPunctuation = '.,!?;:)]}';
    const nodes: React.ReactNode[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = urlRegex.exec(text)) !== null) {
      const rawUrl = match[0];
      const start = match.index;

      if (start > lastIndex) {
        nodes.push(text.slice(lastIndex, start));
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

      if (cleanUrl) {
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
      nodes.push(text.slice(lastIndex));
    }

    return (
      <p className={cn("whitespace-pre-wrap break-words", className)}>
        {nodes.length > 0 ? nodes : text}
      </p>
    );
  }, [isOwnMessage]);

  const renderAttachment = (attachment: any, index: number) => {
    const isImage = attachment.type === 'image' || isImageType(attachment.mime || '');
    const imageLoadFailed = failedImages.has(index);

    // If image failed to load, render as file chip instead
    if (isImage && !imageLoadFailed) {
      // Render image thumbnail
      return (
        <div 
          key={index}
          className="relative group cursor-pointer max-w-xs"
          onClick={() => handleImageClick(attachment.url, attachment.filename)}
        >
          <img
            src={attachment.url}
            alt={attachment.filename}
            className="w-full h-auto rounded-lg max-h-64 object-cover"
            loading="lazy"
            onError={() => {
              console.warn('[Attachment] Image failed to load, falling back to file chip:', attachment.filename);
              setFailedImages(prev => new Set(prev).add(index));
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors" />
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(attachment.url, attachment.filename);
              }}
              aria-label="Download image"
            >
              <Download className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleFileClick(attachment.url, attachment.filename);
              }}
              aria-label="Open in new tab"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          {/* Image info overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
            <p className="text-white text-xs font-medium truncate">{attachment.filename}</p>
            <p className="text-white/80 text-xs">{formatFileSize(attachment.size)}</p>
          </div>
        </div>
      );
    } else {
      // Render file chip
      return (
        <div
          key={index}
          className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border cursor-pointer hover:bg-background/70 transition-colors max-w-xs"
          onClick={() => handleFileClick(attachment.url, attachment.filename)}
        >
          <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.filename}</p>
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
              handleDownload(attachment.url, attachment.filename);
            }}
            aria-label="Download file"
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
        return (
          <Card className="max-w-sm border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Calendar Invite
                </Badge>
                {message.content_data?.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">
                    High Priority
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
                      {format(new Date(message.content_data.date), 'PPP')}
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
                    <span>{message.content_data.attendees} attendees</span>
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
                <Badge variant="secondary">Service Booking</Badge>
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
              {message.body}
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

      case 'attachment':
        return (
          <div className="space-y-3">
            {message.body && renderLinkedText(message.body)}
            
            {/* New attachment format with proper rendering */}
            {message.content_data?.attachments && (
              <div className="space-y-2">
                {message.content_data.attachments.map((attachment: any, index: number) => 
                  renderAttachment(attachment, index)
                )}
              </div>
            )}
            
            {/* Legacy attachment format support */}
            {message.content_data?.files && (
              <div className="space-y-2">
                {message.content_data.files.map((file: any, index: number) => (
                  <div
                    key={index}
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
                        {file.size ? formatFileSize(file.size) : 'Unknown size'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default: // 'text' and other types
        return renderLinkedText(optimisticContent ?? message.body);
    }
  };

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
        "flex gap-2 w-full relative",
        isOwnMessage ? "justify-end" : "justify-start"
      )}>
        {/* Avatar column - fixed width to maintain alignment */}
        <div className={cn(
          "w-8 flex justify-center",
          isOwnMessage && "order-2"
        )}>
          {showAvatar && !isOwnMessage && (
            <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
              <AvatarImage 
                src={(() => {
                  const senderId = message.sender_id || (message.sender as any)?.user_id;
                  if (senderId === '00000000-0000-0000-0000-000000000001') return '/vitana-orb-avatar.png';
                  return message.sender?.avatar_url;
                })()} 
                alt={message.sender?.display_name || message.sender?.full_name || 'User'} 
              />
              <AvatarFallback>
                {(() => {
                  const senderId = message.sender_id || (message.sender as any)?.user_id;
                  if (senderId === '00000000-0000-0000-0000-000000000001') return 'V';
                  return (message.sender?.display_name?.[0] || message.sender?.full_name?.[0] || 'U').toUpperCase();
                })()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        
        {/* Message content column */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden",
          isOwnMessage ? "items-end order-1" : "items-start"
        )}>
          {!isOwnMessage && showAvatar && (
            <span className="text-xs text-muted-foreground mb-1 ml-3">
              {(() => {
                const senderId = message.sender_id || (message.sender as any)?.user_id;
                if (senderId === '00000000-0000-0000-0000-000000000001') return 'Vitana';
                return message.sender?.display_name || message.sender?.full_name || 'Unknown User';
              })()}
            </span>
          )}
          
          <div className="relative">
            <MessageContextMenu
              onReply={onReply ? handleReply : undefined}
              onCopy={handleCopy}
              onForward={handleForward}
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
                className={cn(
                  "rounded-2xl px-4 py-2 max-w-[min(680px,85vw)] w-fit relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  "break-words select-none",
                  isOwnMessage 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted",
                  isOptimistic && "opacity-70"
                )}
                style={isMobile ? { touchAction: 'pan-y', WebkitTouchCallout: 'none' } : undefined}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onTouchCancel={handleTouchCancel}
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* Reply Quote - shows if this message is replying to another */}
                {(message.parent_message_id || message.reply_to_message_id || parentMessage) && (
                  <ReplyQuote
                    parentMessage={parentMessage}
                    onQuoteClick={handleScrollToParent}
                    isOwnMessage={isOwnMessage}
                    
                  />
                )}
                
                {isEditing ? (
                  <div ref={editContainerRef} className="p-2 space-y-2">
                    <textarea
                      ref={editTextareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[60px] rounded-md border-2 border-border bg-card text-card-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={handleEditCancel} className="text-foreground">
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={handleEditSave} disabled={!editContent.trim()}>
                        <Check className="w-3 h-3 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  renderContent()
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
          
          {showTimestamp && (
            <div className={cn(
              "flex items-center gap-1 mt-1 ml-3",
              isOwnMessage ? "justify-end" : "justify-start"
            )}>
              <span className="text-xs text-muted-foreground">
                {(() => {
                  const d = new Date(message.created_at);
                  if (isToday(d)) return format(d, 'HH:mm');
                  if (isYesterday(d)) return `Yesterday, ${format(d, 'HH:mm')}`;
                  if (isThisYear(d)) return format(d, 'd MMM, HH:mm');
                  return format(d, 'd MMM yyyy, HH:mm');
                })()}
              </span>
              {renderStatusIcon()}
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={imageZoomModal.isOpen}
        onClose={() => setImageZoomModal({ isOpen: false, url: '', filename: '' })}
        imageUrl={imageZoomModal.url}
        filename={imageZoomModal.filename}
      />

      {/* Mobile long-press reaction/action drawer */}
      <Drawer open={showDoubleTapReactions} onOpenChange={(open) => { setShowDoubleTapReactions(open); if (!open) setShowDeleteConfirm(false); }} repositionInputs={false}>
        <DrawerContent className="!z-[120] pb-safe" overlayClassName="!z-[119]">
          <div className="px-4 pt-2 pb-4 space-y-4">
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
                  <span className="text-xs text-muted-foreground">Reply</span>
                </button>
              )}
              <button
                onClick={() => { handleCopy(); setShowDoubleTapReactions(false); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-accent transition-colors"
              >
                <Copy className="w-5 h-5 text-foreground" />
                <span className="text-xs text-muted-foreground">Copy</span>
              </button>
              <button
                onClick={() => { handleForward(); setShowDoubleTapReactions(false); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-accent transition-colors"
              >
                <Forward className="w-5 h-5 text-foreground" />
                <span className="text-xs text-muted-foreground">Forward</span>
              </button>
              {isOwnMessage && (
                <button
                  onClick={() => { handleEdit(); setShowDoubleTapReactions(false); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-accent transition-colors"
                >
                  <Pencil className="w-5 h-5 text-foreground" />
                  <span className="text-xs text-muted-foreground">Edit</span>
                </button>
              )}
              {isOwnMessage && !showDeleteConfirm && (
                <button
                  onClick={() => { handleDelete(); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl active:bg-accent transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <span className="text-xs text-destructive">Delete</span>
                </button>
              )}
            </div>
            
            {/* Inline delete confirmation */}
            {showDeleteConfirm && (
              <div className="border-t border-border pt-3 mt-2 space-y-3">
                <p className="text-sm text-center text-foreground font-medium">Delete this message?</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletePending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteConfirmed}
                    disabled={isDeletePending}
                  >
                    {isDeletePending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                    Delete
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

export default MessageBubble;