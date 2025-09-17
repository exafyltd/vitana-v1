import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { useHybridMessages } from '@/hooks/useHybridMessages';
import { useAuth } from "@/context/AuthProvider";
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  MoreVertical, 
  Phone, 
  Video, 
  Info,
  Users,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationViewProps {
  threadId?: string | null;
  recipientId?: string | null;
  onBack?: () => void;
  className?: string;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  threadId,
  recipientId,
  onBack,
  className
}) => {
  const { user } = useAuth();
  const { 
    messages, 
    sendMessage, 
    fetchMessages, 
    markAsRead, 
    isSending,
    context
  } = useHybridMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (threadId) {
      fetchMessages(threadId);
    } else if (recipientId) {
      fetchMessages(undefined, recipientId);
    }
  }, [threadId, recipientId, fetchMessages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Mark messages as read when viewing thread
    if (threadId) {
      markAsRead(threadId);
    }
  }, [threadId, markAsRead]);

  const handleSendMessage = async (
    content: string, 
    messageType?: string, 
    contentData?: any, 
    actionButtons?: any[]
  ) => {
    try {
      if (context === 'global' && threadId) {
        await sendMessage(threadId, content, messageType, contentData);
      } else if (context === 'tenant') {
        await sendMessage(content, threadId, recipientId, messageType, contentData);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleActionClick = async (action: any) => {
    try {
      // Handle different action types
      switch (action.action || action.type) {
        case 'payment_accept':
          toast({
            title: 'Payment Processing',
            description: 'Redirecting to payment gateway...',
          });
          break;
          
        case 'payment_decline':
          await handleSendMessage('Payment request declined', 'system');
          break;
          
        case 'calendar_accept':
          toast({
            title: 'Calendar Updated',
            description: 'Event added to your calendar',
          });
          await handleSendMessage('Event accepted ✅', 'system');
          break;
          
        case 'calendar_decline':
          await handleSendMessage('Event declined ❌', 'system');
          break;
          
        case 'quick_reply':
          await handleSendMessage(action.text);
          break;
          
        default:
          console.log('Unhandled action:', action);
      }
    } catch (error) {
      console.error('Error handling action:', error);
      toast({
        title: 'Error',
        description: 'Failed to process action',
        variant: 'destructive',
      });
    }
  };

  const getConversationTitle = () => {
    return threadId ? 'Thread Conversation' : recipientId ? 'Direct Message' : 'New Message';
  };

  const getConversationSubtitle = () => {
    return context === 'global' ? 'Global Community' : 'Professional Network';
  };

  if (messages.length === 0 && !threadId && !recipientId) {
    return (
      <Card className={cn("flex flex-col h-full", className)}>
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button size="sm" variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-16 w-64 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button size="sm" variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            
            <Avatar>
              <AvatarFallback>
                {getConversationTitle()[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <CardTitle className="text-base">{getConversationTitle()}</CardTitle>
              <p className="text-sm text-muted-foreground">{getConversationSubtitle()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost">
              <Phone className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost">
              <Video className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost">
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const showAvatar = !isOwnMessage && (
                  index === 0 || 
                  messages[index - 1]?.sender_id !== message.sender_id
                );
                const showTimestamp = index === messages.length - 1 || 
                  new Date(messages[index + 1]?.created_at).getTime() - 
                  new Date(message.created_at).getTime() > 5 * 60 * 1000;

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={isOwnMessage}
                    onActionClick={handleActionClick}
                    showAvatar={showAvatar}
                    showTimestamp={showTimestamp}
                  />
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isSending}
        placeholder={`Message ${getConversationTitle()}...`}
      />
    </Card>
  );
};

export default ConversationView;