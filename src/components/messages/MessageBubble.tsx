import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Clock, Check, CheckCheck, Loader2, FileText, Image as ImageIcon, Download, ExternalLink } from 'lucide-react';
import { ImageZoomModal } from './ImageZoomModal';
import { formatFileSize, isImageType } from '@/lib/fileUpload';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { EmojiReactionBar } from './EmojiReactionBar';
import { ReactionCluster } from './ReactionCluster';
import { ReactionPopover } from './ReactionPopover';

interface MessageBubbleProps {
  message: any; // Can be Message or GlobalMessage or TenantMessage
  isOwnMessage: boolean;
  onActionClick?: (action: any) => void;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onActionClick,
  showAvatar = true,
  showTimestamp = true
}) => {
  const messageRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [imageZoomModal, setImageZoomModal] = useState<{ isOpen: boolean; url: string; filename: string }>({
    isOpen: false,
    url: '',
    filename: ''
  });
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [showReactionPopover, setShowReactionPopover] = useState(false);
  const [reactionBarPosition, setReactionBarPosition] = useState({ x: 0, y: 0 });

  // Use reactions hook
  const { reactionSummary, toggleReaction } = useMessageReactions(message.id);

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
    // Open file in new tab
    window.open(url, '_blank');
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reaction handlers
  const handleShowReactionBar = useCallback((clientX: number, clientY: number) => {
    setReactionBarPosition({ x: clientX, y: clientY - 60 });
    setShowReactionBar(true);
  }, []);

  const handleHideReactionBar = useCallback(() => {
    setShowReactionBar(false);
  }, []);

  const handleReactionSelect = useCallback((emoji: string) => {
    toggleReaction(emoji);
    setShowReactionBar(false);
  }, [toggleReaction]);

  // Long press handling for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      handleShowReactionBar(touch.clientX, touch.clientY);
      // Add haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
  }, [handleShowReactionBar]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Right click handling for desktop
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleShowReactionBar(e.clientX, e.clientY);
  }, [handleShowReactionBar]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' && document.activeElement === messageRef.current) {
        e.preventDefault();
        if (messageRef.current) {
          const rect = messageRef.current.getBoundingClientRect();
          handleShowReactionBar(rect.right - 100, rect.top - 60);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleShowReactionBar]);

  const renderAttachment = (attachment: any, index: number) => {
    const isImage = attachment.type === 'image' || isImageType(attachment.mime || '');

    if (isImage) {
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
        return (
          <Card className="max-w-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Payment Request</Badge>
              </div>
              <p className="font-semibold text-lg">
                ${message.content_data?.amount || '0.00'}
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                {message.content_data?.description || message.body}
              </p>
              {message.action_buttons && (
                <div className="flex gap-2">
                  {message.action_buttons.map((button: any, index: number) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={button.variant || 'default'}
                      onClick={() => onActionClick?.(button)}
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'calendar_invite':
        return (
          <Card className="max-w-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Calendar Invite</Badge>
              </div>
              <h4 className="font-semibold mb-1">
                {message.content_data?.title || 'Event Invitation'}
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                {message.content_data?.date && format(new Date(message.content_data.date), 'PPP')}
              </p>
              <p className="text-sm mb-3">{message.body}</p>
              {message.action_buttons && (
                <div className="flex gap-2">
                  {message.action_buttons.map((button: any, index: number) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={button.variant || 'default'}
                      onClick={() => onActionClick?.(button)}
                    >
                      {button.label}
                    </Button>
                  ))}
                </div>
              )}
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
              <p className="text-sm mb-3">{message.body}</p>
              {message.action_buttons && (
                <div className="flex gap-2">
                  {message.action_buttons.map((button: any, index: number) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={button.variant || 'default'}
                      onClick={() => onActionClick?.(button)}
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
            <p>{message.body}</p>
            {message.content_data?.quick_replies && (
              <div className="flex flex-wrap gap-1">
                {message.content_data.quick_replies.map((reply: string, index: number) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => onActionClick?.({ type: 'quick_reply', text: reply })}
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
            {message.body && <p className="break-words">{message.body}</p>}
            
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
        return <p className="break-words">{message.body}</p>;
    }
  };

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
        "flex gap-3 max-w-[85%] relative",
        isOwnMessage ? "ml-auto flex-row-reverse" : ""
      )}>
        {showAvatar && !isOwnMessage && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage 
              src={message.sender?.avatar_url} 
              alt={message.sender?.display_name || message.sender?.full_name || 'User'} 
            />
            <AvatarFallback>
              {(message.sender?.display_name?.[0] || message.sender?.full_name?.[0] || 'U').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={cn(
          "flex flex-col gap-1",
          isOwnMessage ? "items-end" : "items-start"
        )}>
          {!isOwnMessage && showAvatar && (
            <span className="text-xs text-muted-foreground px-3">
              {message.sender?.display_name || message.sender?.full_name || 'Unknown User'}
            </span>
          )}
          
          <div className="relative">
            <div 
              ref={messageRef}
              tabIndex={0}
              className={cn(
                "rounded-2xl px-4 py-2 max-w-md relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50",
                isOwnMessage 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted",
                isOptimistic && "opacity-70"
              )}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onContextMenu={handleContextMenu}
              role="button"
              aria-label="Long press or right click to add reactions"
            >
              {renderContent()}
            </div>
            
            {/* Reaction Clusters */}
            <ReactionPopover
              reactions={reactionSummary}
              open={showReactionPopover}
              onOpenChange={setShowReactionPopover}
            >
              <div>
                <ReactionCluster
                  reactions={reactionSummary}
                  onReactionClick={toggleReaction}
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
              "flex items-center gap-1 text-xs text-muted-foreground px-3",
              isOwnMessage ? "flex-row-reverse" : ""
            )}>
              <span>{format(new Date(message.created_at), 'HH:mm')}</span>
              {renderStatusIcon()}
            </div>
          )}
        </div>
      </div>

      {/* Floating Emoji Reaction Bar */}
      {showReactionBar && (
        <div 
          className="fixed z-50"
          style={{ 
            left: reactionBarPosition.x, 
            top: reactionBarPosition.y 
          }}
        >
          <EmojiReactionBar
            onEmojiSelect={handleReactionSelect}
            onClose={handleHideReactionBar}
          />
        </div>
      )}
      
      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={imageZoomModal.isOpen}
        onClose={() => setImageZoomModal({ isOpen: false, url: '', filename: '' })}
        imageUrl={imageZoomModal.url}
        filename={imageZoomModal.filename}
      />
    </>
  );
};

export default MessageBubble;