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
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMessageHandler } from '@/components/payment/PaymentMessageHandler';
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
import { CalendarInvitePreview } from './CalendarInvitePreview';
import { autoMarkAsDelivered, markMessagesAsRead } from '@/lib/messageStatus';
import { getConversationDisplayAvatar, getConversationDisplayTitle } from '@/utils/conversationHelpers';

interface ConversationViewProps {
  threadId?: string | null;
  recipientId?: string | null;
  onBack?: () => void;
  className?: string;
  context?: 'global' | 'tenant';
  onThreadRead?: (threadId: string, context: 'global' | 'tenant') => void;
  onConversationOpened?: (threadId: string) => void;
  onMessageSent?: (threadId: string, newMessage: any, context: 'global' | 'tenant') => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({
  threadId,
  recipientId,
  onBack,
  className,
  context,
  onThreadRead,
  onConversationOpened,
  onMessageSent
}) => {
  // Import calendar hook at the top
  const { respondToInvite, getInviteResponse } = useCalendarEvents();
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
    fetchMessages,
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);
  const { toast } = useToast();
  const [recipientData, setRecipientData] = useState<any>(null);
  const [isThreadDataLoaded, setIsThreadDataLoaded] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [threadParticipants, setThreadParticipants] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  // Compute effective recipient ID for direct conversations
  const effectiveRecipientId = React.useMemo(() => {
    if (recipientId) return recipientId;
    
    // For direct conversations, find the other participant
    if (threadParticipants.length === 2) {
      const otherParticipant = threadParticipants.find(p => p.user_id !== user?.id);
      return otherParticipant?.user_id || null;
    }
    
    return null;
  }, [recipientId, threadParticipants, user?.id]);

  // Reply state management
  const [replyingTo, setReplyingTo] = useState<any>(null);

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

  // Track scroll position and trigger top pagination
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 16;
    setIsUserNearBottom(nearBottom);
    if (el.scrollTop <= 0) {
      handleScrollToTop();
    }
  }, [handleScrollToTop]);

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

  // Ensure messages are fetched when switching threads
  useEffect(() => {
    if (threadId) {
      fetchMessages(threadId);
    }
  }, [threadId, fetchMessages]);

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

  // State for optimistic messages
  const [optimisticMessages, setOptimisticMessages] = useState<Array<{
    id: string;
    content: string;
    status: 'sending' | 'failed';
    originalMessage?: any;
  }>>([]);

  // Enhanced scroll to bottom with auto-scroll detection
  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;

    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    if (isAtBottom || force) {
      el.scrollTo({ top: el.scrollHeight, behavior: force ? 'smooth' : 'auto' });
    }
  }, []);

  // Mark thread as read when viewing it
  useEffect(() => {
    if (threadId && isWindowFocused && messages.length > 0 && markAsRead && user?.id) {
      console.log('📖 ConversationView: Marking thread as read', { threadId, messageContext, messagesLength: messages.length });
      
      // Auto-mark other users' messages as delivered
      autoMarkAsDelivered(messages, user.id, messageContext === 'global');
      
      // Mark messages as read using the proper function
      const messageIds = messages.filter(msg => msg.sender_id !== user.id).map(msg => msg.id);
      if (messageIds.length > 0) {
        markMessagesAsRead(messageIds, messageContext === 'global');
      }
      
      // Immediate UI update via parent callback
      if (onConversationOpened) {
        console.log('🚀 ConversationView: Calling onConversationOpened immediately');
        onConversationOpened(threadId);
      }
      
      // Backend update (debounced)
      markAsRead(threadId);
    }
  }, [threadId, isWindowFocused, messages.length, markAsRead, onConversationOpened, messageContext, user?.id]);

  // Mark as read when new messages arrive in the currently viewed thread
  useEffect(() => {
    if (threadId && isWindowFocused && messages.length > 0 && markAsRead && user?.id) {
      console.log('📖 ConversationView: New messages arrived, marking as read', { threadId, messagesLength: messages.length });
      
      // Auto-mark other users' messages as delivered
      autoMarkAsDelivered(messages, user.id, messageContext === 'global');
      
      // Mark messages as read using the proper function
      const messageIds = messages.filter(msg => msg.sender_id !== user.id).map(msg => msg.id);
      if (messageIds.length > 0) {
        markMessagesAsRead(messageIds, messageContext === 'global');
      }
      
      // Immediate UI update via parent callback for new messages
      if (onConversationOpened) {
        onConversationOpened(threadId);
      }
      
      // Small delay to ensure the message is fully rendered before backend update
      const timer = setTimeout(() => {
        markAsRead(threadId);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [threadId, messages, isWindowFocused, markAsRead, onConversationOpened, user?.id]);

  // Track window focus for read receipts
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Auto-scroll when you're near bottom and new messages arrive
  useEffect(() => {
    if (isUserNearBottom) {
      scrollToBottom(false);
    }
  }, [messages, isUserNearBottom, scrollToBottom]);

  // Force scroll when sending/optimistic updates
  useEffect(() => {
    if (optimisticMessages.length) {
      scrollToBottom(true);
    }
  }, [optimisticMessages, scrollToBottom]);

  // Scroll to latest messages after they are loaded (not immediately on threadId change)
  useEffect(() => {
    if (threadId && messages.length > 0) {
      // Wait for DOM to update, then scroll to bottom to show latest messages
      setTimeout(() => {
        requestAnimationFrame(() => {
          scrollToBottom(true);
        });
      }, 50);
    }
  }, [threadId, messages.length, scrollToBottom]);

  const handleSendMessage = async (
    content: string, 
    messageType?: string, 
    contentData?: any, 
    actionButtons?: any[],
    parentMessageId?: string
  ) => {
    // Skip optimistic rendering for system messages (they represent completed actions)
    const isSystemMessage = messageType === 'system';
    let optimisticId: string | null = null;

    try {
      setSendError(null);
      
      if (!threadId) {
        console.error('No thread ID available for sending message');
        return;
      }

      if (!isSystemMessage) {
        // Create optimistic "sending" bubble for user messages only
        optimisticId = `sending-${Date.now()}`;
        const optimisticMessage = {
          id: optimisticId,
          content,
          status: 'sending' as const,
          originalMessage: { content, messageType, contentData, actionButtons }
        };

        setOptimisticMessages(prev => [...prev, optimisticMessage]);

        // Scroll to keep last bubble visible - force scroll for new messages
        setTimeout(() => {
          scrollToBottom(true);
        }, 10);
      }

      const newMessage = await sendMessage({
        context: messageContext,
        threadId,
        content,
        type: (messageType as any) || 'text',
        contentData,
        recipientId,
        parentMessageId: parentMessageId || replyingTo?.id,
        actionButtons,
      });
      
      // Notify parent immediately so thread jumps to top
      if (onMessageSent && threadId && newMessage) {
        onMessageSent(threadId, newMessage, messageContext);
      }

      // Remove optimistic message on success (only if it exists)
      if (optimisticId) {
        setOptimisticMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      }
      
      // Clear reply state on successful send
      setReplyingTo(null);
      
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
      
      // Mark optimistic message as failed (only if it exists)
      if (optimisticId) {
        setOptimisticMessages(prev => 
          prev.map(msg => 
            msg.content === content && msg.status === 'sending' 
              ? { ...msg, status: 'failed' as const }
              : msg
          )
        );
      }
      
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
        recipientId,
        actionButtons,
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
      // Handle different action types with wallet integration
      switch (action.action || action.type) {
        case 'payment_accept':
        case 'payment_decline':
          // These are handled by PaymentMessageHandler
          break;
          
        case 'calendar_accept':
        case 'calendar_decline':
        case 'calendar_maybe': {
          const raw = (action.action || action.type).replace('calendar_', '');
          const response: 'accepted' | 'declined' | 'maybe' =
            raw === 'accept' ? 'accepted' :
            raw === 'decline' ? 'declined' : 'maybe';
          const eventData = action.messageData;
          
          try {
            console.log('🎯 Processing calendar action:', { action: action.action, raw, normalized: response, messageData: eventData });
            
            // Validate event data for accept actions
            if (response === 'accepted' && eventData) {
              if (!eventData.title && !eventData.date) {
                throw new Error('Missing required event data (title or date)');
              }
            }

            const composeIso = (dateStr?: string, timeStr?: string) => {
              if (!dateStr) return new Date().toISOString();
              const dt = new Date(dateStr);
              if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
                const [h, m] = timeStr.split(':').map(Number);
                dt.setHours(h, m, 0, 0);
              }
              return dt.toISOString();
            };

            const start_time = response === 'accepted' && eventData
              ? composeIso(eventData.date, eventData.time)
              : undefined;

            const end_time = response === 'accepted' && eventData
              ? (eventData.endDate || eventData.endTime ? composeIso(eventData.endDate || eventData.date, eventData.endTime) : undefined)
              : undefined;

            // Respond to the invite (this will create the event if accepted)
            const isValidUUID = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
            const safeMessageId = action.messageId;
            if (!isValidUUID(safeMessageId)) {
              toast({
                title: 'Please wait',
                description: 'Still syncing this message. Try again in a moment.',
                variant: 'default',
              });
              return;
            }

            const result = await respondToInvite(
              safeMessageId,
              response,
              response === 'accepted' && eventData ? {
                title: eventData.title || 'Calendar Event',
                description: eventData.description,
                start_time: start_time || new Date().toISOString(),
                end_time,
                location: eventData.location,
                event_type: (eventData.type as any) || 'personal',
                status: 'confirmed',
                priority: (eventData.priority as any) || 'medium',
                is_recurring: false,
                attendees_count: eventData.attendees || 0,
                has_rewards: !!eventData.hasRewards,
                metadata: { originalMessage: eventData },
                source_type: 'invite',
                user_id: '' // Will be overridden by the hook
              } : undefined
            );
            
            // Send confirmation message
            const responseMessages = {
              accepted: result?.error 
                ? 'Event accepted ✅ - Response recorded (add event manually if needed)'
                : 'Event accepted ✅ - Added to your calendar',
              declined: 'Event declined ❌',
              maybe: 'Responded "Maybe" ❓ - Marked as tentative'
            };
            
            await handleSendMessage(responseMessages[response as keyof typeof responseMessages], 'system');
            
            toast({
              title: 'Response Sent',
              description: responseMessages[response as keyof typeof responseMessages],
              variant: 'default',
            });

          } catch (error) {
            console.error('❌ Error responding to calendar invite:', error);
            
            // More specific error messages
            let errorMessage = 'Failed to process calendar invite response';
            if (error instanceof Error) {
              if (error.message.includes('Missing required event data')) {
                errorMessage = 'Invalid event data received';
              } else if (error.message.includes('start_time')) {
                errorMessage = 'Invalid event date/time format';
              } else if (error.message.includes('User not authenticated')) {
                errorMessage = 'Please log in to respond to calendar invites';
              } else {
                errorMessage = `Error: ${error.message}`;
              }
            }
            
            toast({
              title: 'Calendar Invite Error',
              description: errorMessage,
              variant: 'destructive',
            });
          }
          break;
        }
          
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

  // Reply handlers
  const handleReply = (message: any) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
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
      <div className={cn("flex flex-col h-full min-w-0", className)}>
        <div className="shrink-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4">
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
        </div>
        <div className="flex-1 min-h-0 p-4">
          <MessageSkeleton count={3} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex flex-col h-full min-w-0 overflow-hidden w-full", className)}>
        {/* Header - Sticky at top */}
        <div className="shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {onBack && (
                <Button size="sm" variant="ghost" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              
              {isGroupChat() ? (
                <div 
                  className="cursor-pointer shrink-0"
                  onClick={() => setShowMembersModal(true)}
                >
                  <GroupAvatarStack 
                    participants={threadParticipants} 
                    maxVisible={3}
                    size="md"
                  />
                </div>
              ) : (
                <Avatar className="shrink-0">
                  <AvatarImage src={getConversationDisplayAvatar(threads.find(t => t.id === threadId), user?.id) || undefined} />
                  <AvatarFallback>
                    {getConversationDisplayTitle(threads.find(t => t.id === threadId), user?.id)[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div 
                className={cn("min-w-0 flex-1", isGroupChat() ? "cursor-pointer" : "")}
                onClick={isGroupChat() ? () => setShowMembersModal(true) : undefined}
              >
                <h2 className="text-base font-semibold truncate">{getConversationDisplayTitle(threads.find(t => t.id === threadId), user?.id)}</h2>
                <p className="text-sm text-muted-foreground truncate">{getConversationSubtitle()}</p>
              </div>
            </div>
          
            <div className="flex items-center gap-1 shrink-0">
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
        </div>

        {/* Messages - Scrollable area */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0 px-4 py-3 overscroll-contain touch-pan-y" 
          id="chat-scroll"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {messages.length === 0 && optimisticMessages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const previousMessage = index > 0 ? messages[index - 1] : null;
                const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                
                // Smart avatar display logic
                const showAvatar = !isOwnMessage && (!previousMessage || previousMessage.sender_id !== message.sender_id);
                
                // Smart spacing logic - group consecutive messages from same sender
                const isConsecutiveFromSameSender = previousMessage && previousMessage.sender_id === message.sender_id;
                const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id;
                
                // Time-based grouping (within 5 minutes)
                const timeDiff = previousMessage 
                  ? new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime()
                  : Infinity;
                const isWithinTimeWindow = timeDiff < 5 * 60 * 1000; // 5 minutes
                
                // Determine spacing
                const shouldUseSmallSpacing = isConsecutiveFromSameSender && isWithinTimeWindow;
                
                const showTimestamp = isLastInGroup || !isWithinTimeWindow;

                return (
                  <div 
                    key={message.id} 
                    className={cn(
                      shouldUseSmallSpacing ? "mb-1" : "mb-4"
                    )}
                  >
                    <MessageBubble
                      message={message}
                      isOwnMessage={isOwnMessage}
                      onActionClick={handleActionClick}
                      onReply={handleReply}
                      showAvatar={showAvatar}
                      showTimestamp={showTimestamp}
                      onUpdateMessage={async (messageId: string, updates: any) => {
                        try {
                          // Update the message in the database first
                          const { error } = await supabase
                            .from(messageContext === 'global' ? 'global_messages' : 'messages')
                            .update(updates)
                            .eq('id', messageId);
                          
                          if (error) {
                            console.error('Error updating message:', error);
                            throw error;
                          }
                          
                          // Then refresh the messages to show the updated state
                          if (fetchMessages) {
                            await fetchMessages();
                          }
                        } catch (error) {
                          console.error('Failed to update message:', error);
                          toast({
                            title: "Update Failed",
                            description: "Failed to update message. Please try again.",
                            variant: "destructive"
                          });
                          throw error; // Re-throw so PaymentMessageHandler can handle it
                        }
                      }}
                      onSendReply={handleSendMessage}
                    />
                  </div>
                );
              })}
              
              {/* Render optimistic messages */}
              {optimisticMessages.map((optMessage) => {
                // Check if this is a calendar invite
                const isCalendarInvite = optMessage.originalMessage?.messageType === 'calendar_invite';
                
                if (isCalendarInvite) {
                  return (
                    <div key={optMessage.id} className="flex justify-end mb-4">
                      <CalendarInvitePreview
                        contentData={optMessage.originalMessage?.contentData}
                        content={optMessage.content}
                        status={optMessage.status}
                        onRetry={() => retryFailedMessage(optMessage.id)}
                      />
                    </div>
                  );
                }
                
                // Default rendering for non-calendar messages
                return (
                  <div key={optMessage.id} className="flex justify-end mb-4">
                    <div className={cn(
                      "max-w-[680px] rounded-lg px-3 py-2 text-sm",
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
                );
              })}
            </>
          )}
          
          {/* Bottom padding and scroll anchor */}
          <div className="h-4" />
          <div ref={messagesEndRef} />
        </div>

        {/* Composer - Fixed at bottom */}
        <div className="conversation-composer shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t shadow-sm">
          <div className="px-4 py-3">
            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="mb-2">
                <TypingIndicator users={typingUsers} />
              </div>
            )}
            
            {sendError && (
              <div className="mb-2">
                <ErrorMessage 
                  title="Message failed to send"
                  description={sendError}
                  onRetry={() => setSendError(null)}
                  variant="inline"
                  className="text-xs"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <MessageInput
                onSendMessage={handleSendMessage}
                onTypingStart={startTyping}
                onTypingStop={stopTyping}
                disabled={isSending}
                placeholder={`Message ${getConversationDisplayTitle(threads.find(t => t.id === threadId), user?.id)}...`}
                threadId={threadId}
                recipientId={recipientId}
                effectiveRecipientId={effectiveRecipientId}
                activeThread={threadId ? (threads.find(t => t.id === threadId) || { id: threadId }) : recipientId ? { id: 'new-conversation' } : undefined}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
              />
            </div>
          </div>
        </div>
      </div>

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