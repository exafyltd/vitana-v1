import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { useHybridMessages } from '@/hooks/useHybridMessages';
import { useAuth } from "@/context/AuthProvider";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  context?: 'global' | 'tenant';
}

const ConversationView: React.FC<ConversationViewProps> = ({
  threadId,
  recipientId,
  onBack,
  className,
  context
}) => {
  const { user } = useAuth();
  const { 
    messages,
    threads,
    sendMessage, 
    fetchMessages, 
    markAsRead, 
    isSending,
    typingUsers,
    startTyping,
    stopTyping,
    context: messageContext
  } = useHybridMessages(context, threadId || recipientId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [recipientData, setRecipientData] = useState<any>(null);
  const [isThreadDataLoaded, setIsThreadDataLoaded] = useState(false);

  // Fetch recipient data when recipientId changes
  useEffect(() => {
    const fetchRecipientData = async () => {
      if (recipientId) {
        try {
          const { data, error } = await supabase
            .from(messageContext === 'global' ? 'global_community_profiles' : 'profiles')
            .select(messageContext === 'global' ? 'user_id, display_name, avatar_url' : 'user_id, display_name, full_name, avatar_url')
            .eq('user_id', recipientId)
            .single();
          
          if (!error && data) {
            setRecipientData(data);
          }
        } catch (error) {
          console.error('Error fetching recipient data:', error);
        }
      } else {
        setRecipientData(null);
      }
    };

    fetchRecipientData();
  }, [recipientId, context]);

  useEffect(() => {
    if (threadId) {
      fetchMessages(threadId);
      // Check if thread data has participants loaded
      const currentThread = threads.find(thread => thread.id === threadId);
      if (currentThread && currentThread.participants && currentThread.participants.length > 0) {
        setIsThreadDataLoaded(true);
      }
    } else if (recipientId) {
      fetchMessages(undefined, recipientId);
    }
  }, [threadId, recipientId, fetchMessages, threads]);

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
      if (messageContext === 'global' && threadId) {
        await sendMessage(threadId, content, messageType, contentData);
      } else if (messageContext === 'tenant') {
        await sendMessage(content, threadId, recipientId, messageType, contentData);
      }
      
      // Don't refetch messages - optimistic updates handle this automatically
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
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
    // Prefer thread participants if available
    if (threadId && threads.length > 0) {
      const currentThread: any = threads.find((thread: any) => thread.id === threadId);
      if (currentThread && currentThread.participants && currentThread.participants.length > 0) {
        const others: any[] = currentThread.participants.filter((p: any) => p.user_id !== user?.id);
        if (others.length > 0) {
          const names = others
            .map((p: any) => p.profile?.display_name || p.profile?.full_name || p.display_name || p.full_name)
            .filter(Boolean) as string[];
          if (names.length > 1) return names.slice(0, 2).join(', '); // simple group label
          if (names.length === 1) return names[0];
        }
        // Fallback to thread name for group chats
        if (currentThread.name) return currentThread.name;
      }
    }
    
    // Fallback to recipient data
    if (recipientData) {
      return recipientData.display_name || recipientData.full_name || 'Conversation';
    }
    
    // Fallback to messages' sender info
    const otherMsg: any = messages.find(m => m.sender_id !== user?.id);
    if (otherMsg && otherMsg.sender) {
      const s: any = otherMsg.sender;
      return s.display_name || s.full_name || 'Conversation';
    }

    // Safe default
    return 'Conversation';
  };

  const getConversationAvatar = () => {
    // Prefer thread participants if available
    if (threadId && threads.length > 0) {
      const currentThread: any = threads.find((thread: any) => thread.id === threadId);
      if (currentThread && currentThread.participants) {
        const other: any = currentThread.participants.find((p: any) => p.user_id !== user?.id);
        return other?.profile?.avatar_url || other?.avatar_url || null;
      }
    }
    
    // Fallback to recipient data for new conversations
    if (recipientData) {
      return recipientData.avatar_url || null;
    }
    
    // Fallback to messages' sender info
    const otherMsg = messages.find(m => m.sender_id !== user?.id);
    if (otherMsg && otherMsg.sender) {
      return otherMsg.sender.avatar_url || null;
    }

    return null;
  };

  const getConversationSubtitle = () => {
    return messageContext === 'global' ? 'Global Community' : 'Professional Network';
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
              <AvatarImage src={getConversationAvatar() || undefined} />
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

      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} className="border-t" />
      )}

      {/* Message Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStart={startTyping}
        onTypingStop={stopTyping}
        disabled={isSending}
        placeholder={`Message ${getConversationTitle()}...`}
      />
    </Card>
  );
};

export default ConversationView;