import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { useMessages, MessageThread } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';
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
  thread?: MessageThread;
  recipientId?: string; // for direct messages
  onBack?: () => void;
  className?: string;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  thread,
  recipientId,
  onBack,
  className
}) => {
  const { messages, loading, sending, sendMessage, markAsRead } = useMessages(thread?.id);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Mark messages as read when viewing thread
    if (thread?.id && !loading) {
      markAsRead(thread.id);
    }
  }, [thread?.id, loading, markAsRead]);

  const handleSendMessage = async (
    content: string, 
    messageType?: string, 
    contentData?: any, 
    actionButtons?: any[]
  ) => {
    try {
      await sendMessage(
        content,
        recipientId,
        messageType,
        contentData,
        undefined, // workflow_type
        actionButtons
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleActionClick = async (action: any) => {
    try {
      // Record the action
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Handle different action types
      switch (action.action || action.type) {
        case 'payment_accept':
          toast({
            title: 'Payment Processing',
            description: 'Redirecting to payment gateway...',
          });
          // Here you would integrate with payment processing
          break;
          
        case 'payment_decline':
          await sendMessage('Payment request declined', undefined, 'system');
          break;
          
        case 'calendar_accept':
          toast({
            title: 'Calendar Updated',
            description: 'Event added to your calendar',
          });
          await sendMessage('Event accepted ✅', undefined, 'system');
          break;
          
        case 'calendar_decline':
          await sendMessage('Event declined ❌', undefined, 'system');
          break;
          
        case 'quick_reply':
          await sendMessage(action.text);
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
    if (thread) {
      if (thread.name) return thread.name;
      if (thread.type === 'group') return 'Group Chat';
      
      // For direct messages, show other participant's name
      const otherParticipant = thread.participants?.find(
        p => p.user_id !== currentUser?.id
      );
      return otherParticipant?.profile?.display_name || 
             otherParticipant?.profile?.full_name || 
             'Direct Message';
    }
    return 'New Message';
  };

  const getConversationSubtitle = () => {
    if (thread?.type === 'group') {
      return `${thread.participants?.length || 0} members`;
    }
    return 'Direct message';
  };

  if (loading && messages.length === 0) {
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
            
            {thread?.type === 'group' ? (
              <div className="flex -space-x-2">
                {thread.participants?.slice(0, 3).map((participant, index) => (
                  <Avatar key={participant.id} className="w-8 h-8 border-2 border-background">
                    <AvatarImage src={participant.profile?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {participant.profile?.display_name?.[0] || 
                       participant.profile?.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <Avatar>
                <AvatarImage src={thread?.participants?.find(p => p.user_id !== currentUser?.id)?.profile?.avatar_url} />
                <AvatarFallback>
                  {getConversationTitle()[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div>
              <CardTitle className="text-base">{getConversationTitle()}</CardTitle>
              <p className="text-sm text-muted-foreground">{getConversationSubtitle()}</p>
            </div>
            
            {thread?.unread_count && thread.unread_count > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {thread.unread_count}
              </Badge>
            )}
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
                const isOwnMessage = message.sender_id === currentUser?.id;
                const showAvatar = !isOwnMessage && (
                  index === 0 || 
                  messages[index - 1]?.sender_id !== message.sender_id
                );
                const showTimestamp = index === messages.length - 1 || 
                  new Date(messages[index + 1]?.created_at).getTime() - 
                  new Date(message.created_at).getTime() > 5 * 60 * 1000; // 5 minutes

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
        disabled={sending}
        placeholder={`Message ${getConversationTitle()}...`}
      />
    </Card>
  );
};

export default ConversationView;