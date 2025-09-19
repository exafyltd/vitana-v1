import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import MessageBubble from './MessageBubble';
import MessageStatusIndicator from './MessageStatusIndicator';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
  sender?: {
    display_name?: string;
    avatar_url?: string;
  };
}

interface MessageGroupProps {
  messages: Message[];
  isOutgoing: boolean;
  senderName?: string;
  senderAvatar?: string;
  timestamp: string;
  onActionClick?: (action: any) => void;
  className?: string;
}

const MessageGroup: React.FC<MessageGroupProps> = ({
  messages,
  isOutgoing,
  senderName,
  senderAvatar,
  timestamp,
  onActionClick,
  className
}) => {
  if (messages.length === 0) return null;

  const lastMessage = messages[messages.length - 1];

  return (
    <div className={cn(
      "flex gap-3 mb-4",
      isOutgoing ? "flex-row-reverse" : "flex-row",
      className
    )}>
      {/* Avatar - only show for incoming messages and only on the last message */}
      {!isOutgoing && (
        <div className="flex-shrink-0 w-8">
          <Avatar className="w-8 h-8">
            <AvatarImage src={senderAvatar} />
            <AvatarFallback className="text-xs">
              {senderName?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      <div className={cn(
        "flex flex-col space-y-1 max-w-[75%]",
        isOutgoing ? "items-end" : "items-start"
      )}>
        {/* Sender name for incoming messages */}
        {!isOutgoing && senderName && (
          <span className="text-xs text-muted-foreground px-2">
            {senderName}
          </span>
        )}
        
        {/* Message bubbles */}
        <div className="space-y-1">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={isOutgoing}
              showAvatar={false}
              onActionClick={onActionClick}
            />
          ))}
        </div>
        
        {/* Timestamp and status - only on the last message of the group */}
        <div className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground mt-1",
          isOutgoing ? "flex-row-reverse" : "flex-row"
        )}>
          <span>{timestamp}</span>
          {isOutgoing && (
            <MessageStatusIndicator 
              status={lastMessage.status || 'sent'} 
              className="w-4 h-4"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageGroup;