import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MessageDividerProps {
  type: 'date' | 'unread';
  text: string;
  className?: string;
}

const MessageDivider: React.FC<MessageDividerProps> = ({
  type,
  text,
  className
}) => {
  return (
    <div className={cn(
      "flex items-center justify-center my-3",
      className
    )}>
      <Badge
        variant={type === 'unread' ? 'secondary' : 'outline'}
        className={cn(
          "text-xs font-medium px-3 py-0.5 rounded-full border-border/60 bg-muted/70 text-muted-foreground",
          type === 'unread' && "bg-domain-messages-accent text-white border-transparent"
        )}
      >
        {text}
      </Badge>
    </div>
  );
};

export default MessageDivider;