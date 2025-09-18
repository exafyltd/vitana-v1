import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import VirtualizedList from '@/components/ui/virtualized-list';
import { useHybridMessages } from '@/hooks/useHybridMessages';
import { usePaginatedMessages } from '@/hooks/usePaginatedMessages';
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
  Settings,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MessageSkeleton from './MessageSkeleton';
import EmptyStateIllustration from './EmptyStateIllustration';
import ErrorMessage from './ErrorMessage';
import SystemMessage from './SystemMessage';
import GroupMembersModal from './GroupMembersModal';
import GroupAvatarStack from './GroupAvatarStack';

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
  
  // Use paginated messages for performance
  const paginatedMessages = usePaginatedMessages({
    pageSize: 50,
    paginationThreshold: 50,
    virtualizationThreshold: 200,
  });

  const {
    threads,
    messages: hybridMessagesFromHook,
    sendMessage, 
    markAsRead, 
    isSending,
    typingUsers,
    startTyping,
    stopTyping,
    context: messageContext
  } = useHybridMessages(context, threadId || recipientId);

  // Debug logging
  console.log('ConversationView render:', {
    threadId,
    recipientId,
    context,
    messageContext,
    threadsLength: threads.length,
    hybridMessagesLength: hybridMessagesFromHook?.length || 0,
    shouldUsePagination: paginatedMessages.shouldUsePagination
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [recipientData, setRecipientData] = useState<any>(null);
  const [isThreadDataLoaded, setIsThreadDataLoaded] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [threadParticipants, setThreadParticipants] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  // Focus and intersection states for smart read detection
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [isLastMessageVisible, setIsLastMessageVisible] = useState(false);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  // Use hybrid messages directly from the hook - no local state needed
  const messages = hybridMessagesFromHook || [];

  // Debug logging for thread/recipient changes
  useEffect(() => {
    console.log('ConversationView: Thread/recipient effect', { 
      threadId, 
      recipientId,
      messageContext,
      messagesLength: messages.length,
      threadsLength: threads.length
    });
  }, [threadId, recipientId, messageContext, messages.length, threads.length]);

  // Handle scroll to top for loading older messages
  const handleScrollToTop = useCallback(() => {
    if (threadId && paginatedMessages.hasOlder && !paginatedMessages.isLoadingOlder) {
      paginatedMessages.loadOlderMessages(
        threadId,
        messageContext,
        messageContext === 'tenant' ? undefined : undefined // Add tenant ID if needed
      );
    }
  }, [threadId, messageContext, paginatedMessages]);

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
      // Check if thread data has participants loaded
      const currentThread = threads.find(thread => thread.id === threadId);
      if (currentThread && currentThread.participants && currentThread.participants.length > 0) {
        setIsThreadDataLoaded(true);
        setThreadParticipants(currentThread.participants);
        
        // Find current user's role
        const userParticipant = currentThread.participants.find((p: any) => p.user_id === user?.id);
        if (userParticipant) {
          setCurrentUserRole(userParticipant.role || 'member');
        }
      }
    }
  }, [threadId, threads, user?.id]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enhanced mark as read logic with focus and intersection detection
  const handleMarkAsRead = useCallback(() => {
    if (threadId && isWindowFocused && isLastMessageVisible) {
      markAsRead(threadId);
    }
  }, [threadId, isWindowFocused, isLastMessageVisible, markAsRead]);

  // Set up focus tracking
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    const handleVisibilityChange = () => setIsWindowFocused(!document.hidden);

    // Initial state
    setIsWindowFocused(document.hasFocus() && !document.hidden);

    // Event listeners
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Set up intersection observer for last message visibility
  useEffect(() => {
    if (!messagesEndRef.current) return;

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsLastMessageVisible(entry.isIntersecting && entry.intersectionRatio > 0.5);
      },
      { 
        threshold: [0, 0.5, 1.0],
        rootMargin: '0px 0px -10px 0px' // Slight margin to ensure message is fully visible
      }
    );

    intersectionObserverRef.current.observe(messagesEndRef.current);

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [messages.length]); // Re-observe when messages change

  // Trigger mark as read when conditions are met
  useEffect(() => {
    handleMarkAsRead();
  }, [handleMarkAsRead]);

  // State for optimistic messages
  const [optimisticMessages, setOptimisticMessages] = useState<Array<{
    id: string;
    content: string;
    status: 'sending' | 'failed';
    originalMessage?: any;
  }>>([]);

  const handleSendMessage = async (
    content: string, 
    messageType?: string, 
    contentData?: any, 
    actionButtons?: any[]
  ) => {
    try {
      setSendError(null);
      
      if (!threadId) {
        console.error('No thread ID available for sending message');
        return;
      }

      // Create optimistic "sending" bubble
      const optimisticId = `sending-${Date.now()}`;
      const optimisticMessage = {
        id: optimisticId,
        content,
        status: 'sending' as const,
        originalMessage: { content, messageType, contentData, actionButtons }
      };

      setOptimisticMessages(prev => [...prev, optimisticMessage]);

      // Scroll to keep last bubble visible
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 10);

      const newMessage = await sendMessage({
        context: messageContext,
        threadId,
        content,
        type: (messageType as any) || 'text',
        contentData,
        recipientId
      });
      
      // Remove optimistic message on success
      setOptimisticMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      
      // Add to paginated messages if using pagination
      if (paginatedMessages.shouldUsePagination && newMessage) {
        paginatedMessages.addNewMessage({
          ...newMessage,
          sender: { 
            user_id: user?.id || '',
            display_name: user?.email || 'You',
            avatar_url: null 
          }
        });
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark optimistic message as failed
      setOptimisticMessages(prev => 
        prev.map(msg => 
          msg.content === content && msg.status === 'sending' 
            ? { ...msg, status: 'failed' as const }
            : msg
        )
      );
      
      const errorMessage = error instanceof Error ? error.message : "unknown";
      setSendError(`Failed to send message: ${errorMessage}`);
      
      toast({
        title: 'Message Failed',
        description: `Message failed: ${errorMessage}`,
        variant: 'destructive',
      });
      
      console.error({
        stage: "send", 
        threadId: threadId, 
        payload: { text: content }, 
        error
      });
    }
  };

  const retryFailedMessage = async (optimisticId: string) => {
    const failedMessage = optimisticMessages.find(msg => msg.id === optimisticId);
    if (!failedMessage?.originalMessage) return;

    // Mark as sending again
    setOptimisticMessages(prev => 
      prev.map(msg => 
        msg.id === optimisticId 
          ? { ...msg, status: 'sending' as const }
          : msg
      )
    );

    const { content, messageType, contentData, actionButtons } = failedMessage.originalMessage;
    
    try {
      await sendMessage({
        context: messageContext,
        threadId: threadId!,
        content,
        type: messageType || 'text',
        contentData,
        recipientId
      });
      
      // Remove on success
      setOptimisticMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      
    } catch (error) {
      // Mark as failed again
      setOptimisticMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticId 
            ? { ...msg, status: 'failed' as const }
            : msg
        )
      );
    }
  };

  const retryLoadMessages = async () => {
    if (!threadId) return;
    
    try {
      setLoadError(null);
      if (paginatedMessages.shouldUsePagination) {
        await paginatedMessages.fetchInitialMessages(
          threadId, 
          messageContext, 
          messageContext === 'tenant' ? undefined : undefined
        );
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setLoadError('Failed to load messages. Please try again.');
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
      if (currentThread) {
        // For group chats, use the thread name
        if (currentThread.type === 'group' && currentThread.name) {
          return currentThread.name;
        }
        
        // For direct chats, show other participant's name
        if (currentThread.participants && currentThread.participants.length > 0) {
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
    // For group chats, don't show a single avatar
    if (threadId && threads.length > 0) {
      const currentThread: any = threads.find((thread: any) => thread.id === threadId);
      if (currentThread?.type === 'group') {
        return null; // Will be handled by GroupAvatarStack
      }
      
      // For direct chats, show other participant's avatar
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
    const currentThread: any = threadId ? threads.find((thread: any) => thread.id === threadId) : null;
    
    if (currentThread?.type === 'group') {
      const participantCount = threadParticipants.length;
      return `${participantCount} ${participantCount === 1 ? 'member' : 'members'}`;
    }
    
    return messageContext === 'global' ? 'Global Community' : 'Professional Network';
  };

  const isGroupChat = () => {
    const currentThread: any = threadId ? threads.find((thread: any) => thread.id === threadId) : null;
    return currentThread?.type === 'group';
  };

  // Simple loading check - only show loading if we have no data at all
  const isLoadingConversation = (!threadId && !recipientId) || 
    (threadId && threads.length === 0 && messages.length === 0);

  console.log('ConversationView: Loading state check', {
    threadId,
    recipientId,
    threadsLength: threads.length,
    messagesLength: messages.length,
    optimisticMessagesLength: optimisticMessages.length,
    isLoadingConversation
  });

  // Loading state for when conversation is being loaded  
  if (isLoadingConversation) {
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
          <MessageSkeleton count={3} />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
              
              {isGroupChat() ? (
                <div 
                  className="cursor-pointer"
                  onClick={() => setShowMembersModal(true)}
                >
                  <GroupAvatarStack 
                    participants={threadParticipants} 
                    maxVisible={3}
                    size="md"
                  />
                </div>
              ) : (
                <Avatar>
                  <AvatarImage src={getConversationAvatar() || undefined} />
                  <AvatarFallback>
                    {getConversationTitle()[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div 
                className={isGroupChat() ? "cursor-pointer" : ""}
                onClick={isGroupChat() ? () => setShowMembersModal(true) : undefined}
              >
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
        <ScrollArea className="h-full" data-conversation-container>
          <div className="p-4 space-y-4">
            {messages.length === 0 && optimisticMessages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
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
                })}
                
                {/* Render optimistic messages */}
                {optimisticMessages.map((optMessage) => (
                  <div key={optMessage.id} className="flex justify-end">
                    <div className={cn(
                      "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                      optMessage.status === 'sending' 
                        ? "bg-primary/70 text-primary-foreground" 
                        : "bg-destructive/70 text-destructive-foreground"
                    )}>
                      <div className="flex items-center gap-2">
                        <span>{optMessage.content}</span>
                        {optMessage.status === 'sending' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-12 p-0 text-xs"
                            onClick={() => retryFailedMessage(optMessage.id)}
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {optMessage.status === 'sending' ? 'Sending...' : 'Failed to send'}
                      </div>
                    </div>
                  </div>
                ))}
              </>
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
      <div className="border-t p-4">
        {sendError && (
          <div className="mb-3">
            <ErrorMessage 
              title="Message failed to send"
              description={sendError}
              onRetry={() => setSendError(null)}
              variant="inline"
              className="text-xs"
            />
          </div>
        )}
         <MessageInput
           onSendMessage={handleSendMessage}
           onTypingStart={startTyping}
           onTypingStop={stopTyping}
           disabled={isSending}
           placeholder={`Message ${getConversationTitle()}...`}
           threadId={threadId}
           activeThread={threadId ? threads.find(t => t.id === threadId) : undefined}
         />
      </div>
    </Card>

    <GroupMembersModal
      open={showMembersModal}
      onOpenChange={setShowMembersModal}
      threadId={threadId || ''}
      context={messageContext}
      currentUserRole={currentUserRole}
    />
    </>
  );
};

export default ConversationView;