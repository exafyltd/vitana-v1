import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Message } from '@/hooks/useMessages';
import { format } from 'date-fns';
import { Clock, Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
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
    <div className={cn(
      "flex gap-3 max-w-[85%]",
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
        
        <div className={cn(
          "rounded-2xl px-4 py-2 max-w-md",
          isOwnMessage 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        )}>
          {renderContent()}
        </div>
        
        {showTimestamp && (
          <div className={cn(
            "flex items-center gap-1 text-xs text-muted-foreground px-3",
            isOwnMessage ? "flex-row-reverse" : ""
          )}>
            <Clock className="w-3 h-3" />
            <span>{format(new Date(message.created_at), 'HH:mm')}</span>
            {isOwnMessage && (
              <CheckCheck className="w-3 h-3" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;