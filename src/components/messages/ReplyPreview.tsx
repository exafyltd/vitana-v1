import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Reply } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReplyPreviewProps {
  message: any;
  onCancel: () => void;
  currentUserId?: string;
  className?: string;
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  message,
  onCancel,
  currentUserId,
  className
}) => {
  const isSelf = currentUserId && (message?.sender_id === currentUserId || message?.sender?.id === currentUserId);
  const senderName = isSelf ? 'yourself' : (message?.sender?.display_name || message?.sender?.full_name || 'Unknown User');
  const content = message?.body || 'Message content not available';
  
  // Truncate content to avoid long previews
  const truncatedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 bg-muted/50 border-l-4 border-primary",
      className
    )}>
      <Reply className="w-4 h-4 text-primary flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-primary">
            Replying to {senderName}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {truncatedContent}
        </p>
      </div>
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 flex-shrink-0"
        onClick={onCancel}
        aria-label="Cancel reply"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};