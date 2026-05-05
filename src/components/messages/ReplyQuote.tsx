import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

interface ReplyQuoteProps {
  parentMessage: any;
  onQuoteClick?: () => void;
  className?: string;
  isOwnMessage?: boolean;
}

export const ReplyQuote: React.FC<ReplyQuoteProps> = ({
  parentMessage,
  onQuoteClick,
  className,
  isOwnMessage = false
}) => {
  if (!parentMessage) {
    return (
      <div className={cn(
        "p-2 rounded-lg border border-dashed border-muted-foreground/30 text-center",
        className
      )}>
        <span className="text-xs text-muted-foreground">{t('screens.messages.messageNotFound')}</span>
      </div>
    );
  }

  const senderName = parentMessage?.sender?.display_name || parentMessage?.sender?.full_name || 'Unknown User';
  const content = parentMessage?.body || 'Message content not available';
  
  // Truncate content for quote display
  const truncatedContent = content.length > 80 ? content.substring(0, 80) + '...' : content;

  const handleClick = () => {
    if (onQuoteClick) {
      onQuoteClick();
    }
  };

  return (
    <div 
      className={cn(
        "p-2 mb-2 rounded-lg border-l-4 cursor-pointer transition-colors",
        "hover:bg-background/80",
        isOwnMessage 
          ? "bg-primary-foreground/20 border-primary-foreground/40" 
          : "bg-primary/10 border-primary/40",
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Jump to message from ${senderName}`}
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