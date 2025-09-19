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
      "flex items-center justify-center my-4",
      className
    )}>
      <div className="flex-1 border-t border-border"></div>
      <Badge 
        variant={type === 'unread' ? 'secondary' : 'outline'}
        className={cn(
          "mx-3 text-xs",
          type === 'unread' && "bg-domain-messages-accent text-white"
        )}
      >
        {text}
      </Badge>
      <div className="flex-1 border-t border-border"></div>
    </div>
  );
};

export default MessageDivider;