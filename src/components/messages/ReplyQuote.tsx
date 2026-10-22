import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

interface ReplyQuoteProps {
  parentMessage: any;
  onQuoteClick?: () => void;
  className?: string;
  isOwnMessage?: boolean;
  /**
   * VTID-05318: the original is not part of this conversation any more
   * (deleted, or a target the server refused). Without it and without a
   * parent, the original is still loading — the quote stays tappable and the
   * tap loads and jumps to it.
   */
  unavailable?: boolean;
}

export const ReplyQuote: React.FC<ReplyQuoteProps> = ({
  parentMessage,
  onQuoteClick,
  className,
  isOwnMessage = false,
  unavailable = false,
}) => {
  const handleClick = () => {
    if (onQuoteClick) {
      onQuoteClick();
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (!parentMessage) {
    if (unavailable) {
      return (
        <div
          className={cn('p-2 mb-2 rounded-lg border border-dashed border-muted-foreground/30 text-center', className)}
          data-testid="reply-quote-unavailable"
        >
          <span className="text-xs text-muted-foreground">{t('inbox.reply.unavailable')}</span>
        </div>
      );
    }
    return (
      <div
        className={cn('p-2 mb-2 rounded-lg border-s-4 cursor-pointer', isOwnMessage ? 'bg-primary-foreground/20 border-primary-foreground/40' : 'bg-primary/10 border-primary/40', className)}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={t('inbox.reply.jumpToOriginal')}
        data-testid="reply-quote-loading"
      >
        <span className={cn('text-xs', isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{t('inbox.reply.loading')}</span>
      </div>
    );
  }

  const senderName = parentMessage?.sender?.display_name || parentMessage?.sender?.full_name || t('inbox.reply.unknownSender');
  const content = parentMessage?.body || parentMessage?.content || t('inbox.reply.noText');

  // Truncate content for quote display
  const truncatedContent = content.length > 80 ? content.substring(0, 80) + '...' : content;

  return (
    <div 
      className={cn(
        "p-2 mb-2 rounded-lg border-s-4 cursor-pointer transition-colors",
        "hover:bg-background/80",
        isOwnMessage 
          ? "bg-primary-foreground/20 border-primary-foreground/40" 
          : "bg-primary/10 border-primary/40",
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={t('inbox.reply.jumpTo', { name: senderName })}
      data-testid="reply-quote"
    >
      <div className="flex items-center gap-2 mb-1">
        <Avatar className="w-4 h-4">
          <AvatarImage 
            src={parentMessage?.sender?.avatar_url} 
            alt={senderName}
          />
          <AvatarFallback className="text-xs">
            {senderName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          "text-xs font-medium",
          isOwnMessage ? "text-primary-foreground/80" : "text-primary"
        )}>
          {senderName}
        </span>
      </div>
      <p className={cn(
        "text-xs leading-relaxed",
        isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
      )}>
        {truncatedContent}
      </p>
    </div>
  );
};
