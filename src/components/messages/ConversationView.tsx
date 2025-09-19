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
import { ProfileDirectory } from "@/lib/secure-accessors";
import { logThreadEvent } from '@/lib/diagnostics';

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

  // Scope guarding - auto-switch scope if thread is found in wrong context
  const [scopeSwitched, setScopeSwitched] = useState(false);

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
          if (messageContext === 'global') {
            // Use secure accessor for global profiles
            const profiles = await ProfileDirectory.getMinimalByIds([recipientId]);
            if (profiles.length > 0) {
              setRecipientData({
                user_id: profiles[0].user_id,
                display_name: profiles[0].display_name,
                avatar_url: profiles[0].avatar_url
              });
            }
          } else {
            // For tenant context, still query profiles directly since it's not in scope of hardening
            const { data, error } = await supabase
              .from('profiles')
              .select('user_id, display_name, full_name, avatar_url')
              .eq('user_id', recipientId)
              .single();
            
            if (!error && data) {
              setRecipientData(data);
            }
          }
        } catch (error) {
          console.error('Error fetching recipient data:', error);
        }
      } else {
        setRecipientData(null);
      }
    };

    fetchRecipientData();
  }, [recipientId, messageContext]);

  // Ensure messages are fetched when switching threads
  useEffect(() => {
    if (threadId) {
      console.log('ConversationView: Fetching messages for thread:', threadId);
      fetchMessages(threadId);
    } else if (recipientId) {
      console.log('ConversationView: Fetching messages for recipient:', recipientId);
      fetchMessages(undefined, recipientId);
    }
  }, [threadId, recipientId, fetchMessages]);

  // Scope guard: verify thread exists in the correct context
  useEffect(() => {
    const verifyThreadScope = async () => {
      if (!threadId || scopeSwitched) return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const urlScope = urlParams.get('scope');
      
      if (urlScope === 'global' && context === 'global') {
        try {
          // Check if thread exists in global context
          const { data, error } = await supabase
            .from('global_message_threads')
            .select('id')
            .eq('id', threadId)
            .single();
          
          if (error && error.code === 'PGRST116') {
            // Thread not found in global, try tenant
            const { data: tenantThread } = await supabase
              .from('message_threads')
              .select('id')
              .eq('id', threadId)
              .maybeSingle();
              
            if (tenantThread) {
              setScopeSwitched(true);
              // Auto-switch to tenant scope
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set('scope', 'tenant');
              window.location.href = newUrl.toString();
              return;
            }
          }
          
          if (data) {
            logThreadEvent('thread_ok', {
              threadId,
              message: 'Thread found in correct scope'
            });
          }
        } catch (error: any) {
          console.error('Scope verification error:', error);
          setLoadError(`Thread verification failed: ${error.message}`);
        }
      }
    };
    
    verifyThreadScope();
  }, [threadId, context, scopeSwitched]);

  // Enhanced thread data loading
  useEffect(() => {
    const loadThreadData = async () => {
      if (!threadId) {
        setIsThreadDataLoaded(false); 
        return;
      }

      try {
        setLoadError(null);
        
        const participantsTable = messageContext === 'global' ? 'global_thread_participants' : 'thread_participants';
        const profilesTable = messageContext === 'global' ? 'global_community_profiles' : 'profiles';
        
        // Get thread participants
        let { data: participants, error: participantsError } = await supabase
          .from(participantsTable)
          .select('*')
          .eq('thread_id', threadId)
          .eq('is_active', true);

        if (participantsError) {
          console.error('Error fetching participants:', participantsError);
          setLoadError(`Failed to load conversation: ${participantsError.message || participantsError.code}`);
          return;
        }

        // Check if user is actually a participant (health check)
        const isParticipant = participants?.some(p => p.user_id === user?.id);
        if (!isParticipant && participants?.length > 0) {
          // Try to add user as participant (repair scenario)
          try {
            const { error: repairError } = await supabase
              .from(participantsTable)
              .insert({
                thread_id: threadId,
                user_id: user?.id,
                role: 'member',
                is_active: true
              });
            
            if (!repairError) {
              logThreadEvent('thread_repaired', {
                threadId,
                message: 'User added as participant during health check'
              });
              // Re-fetch participants after repair
              const { data: updatedParticipants } = await supabase
                .from(participantsTable)
                .select('*')
                .eq('thread_id', threadId)
                .eq('is_active', true);
              if (updatedParticipants) {
                participants = updatedParticipants;
              }
            }
          } catch (repairError: any) {
            console.warn('Failed to repair thread participation:', repairError);
          }
        }

        // Get participant profiles  
        if (participants && participants.length > 0) {
          const userIds = participants.map(p => p.user_id);
          
          let profilesData = [];
          
          if (messageContext === 'global') {
            // Use secure accessor for global profiles
            const profiles = await ProfileDirectory.getMinimalByIds(userIds);
            profilesData = profiles.map(p => ({
              user_id: p.user_id,
              display_name: p.display_name,
              avatar_url: p.avatar_url
            }));
          } else {
            // For tenant context, query directly
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, display_name, full_name, avatar_url')
              .in('user_id', userIds);
            profilesData = profiles || [];
          }

          // Combine participants with profile data
          const participantsWithProfiles = participants.map(participant => {
            const profile = profilesData.find(p => p.user_id === participant.user_id);
            return {
              ...participant,
              profile: profile || { display_name: 'Unknown User', avatar_url: null }
            };
          });

          setThreadParticipants(participantsWithProfiles);
          
          // Find current user's role
          const currentUserParticipant = participants.find(p => p.user_id === user?.id);
          setCurrentUserRole(currentUserParticipant?.role || 'member');
        }

        setIsThreadDataLoaded(true);
      } catch (error: any) {
        console.error('Error loading thread data:', error);
        setLoadError(`Failed to load conversation: ${error.message || error.code || 'Unknown error'}`);
      }
    };

    loadThreadData();
  }, [threadId, messageContext, user?.id]);

  // Smart read detection - mark as read when window focused AND last message visible
  useEffect(() => {
    if (isWindowFocused && isLastMessageVisible && threadId && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        markAsRead(threadId);
      }, 1000); // 1 second delay to avoid excessive calls

      return () => clearTimeout(timeoutId);
    }
  }, [isWindowFocused, isLastMessageVisible, threadId, messages.length, markAsRead]);

  // Window focus detection
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

  // Intersection observer for last message visibility
  useEffect(() => {
    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
    }

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.target.getAttribute('data-last-message') === 'true') {
            setIsLastMessageVisible(entry.isIntersecting);
          }
        });
      },
      { threshold: 0.5 }
    );

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, []);

  // Auto-scroll effect for new messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessageElement = document.querySelector('[data-last-message="true"]');
      if (lastMessageElement && intersectionObserverRef.current) {
        intersectionObserverRef.current.observe(lastMessageElement);
      }

      // Smooth scroll to bottom for new messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async (content: string, type = 'text') => {
    if (!content.trim()) return;

    try {
      setSendError(null);
      await sendMessage({
        context: messageContext,
        threadId: threadId || '',
        recipientId: recipientId || '',
        content: content.trim(),
        type: type as any
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = `Failed to send message: ${error.message || error.code || 'Unknown error'}`;
      setSendError(errorMessage);
      toast({
        title: "Message Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Get conversation header info
  const getConversationHeader = () => {
    // If we have thread data, use that
    if (threadId && isThreadDataLoaded) {
      const thread = threads.find(t => t.id === threadId);
      
      if (thread) {
        // For group threads, show thread name and participant count
        if (thread.type === 'group' || threadParticipants.length > 2) {
          return {
            title: thread.name || `Group Chat (${threadParticipants.length})`,
            subtitle: `${threadParticipants.length} members`,
            avatar: null,
            isGroup: true,
            participants: threadParticipants
          };
        } else {
          // For direct threads, show the other participant's info
          const otherParticipant = threadParticipants.find(p => p.user_id !== user?.id);
          return {
            title: otherParticipant?.profile?.display_name || 'Unknown User',
            subtitle: 'Direct Message',
            avatar: otherParticipant?.profile?.avatar_url,
            isGroup: false,
            participants: threadParticipants
          };
        }
      }
    }

    // Fallback to recipient data for direct messages
    if (recipientData) {
      return {
        title: recipientData.display_name || recipientData.full_name || 'Unknown User',
        subtitle: 'Direct Message', 
        avatar: recipientData.avatar_url,
        isGroup: false,
        participants: []
      };
    }

    return {
      title: 'Conversation',
      subtitle: '',
      avatar: null,
      isGroup: false,
      participants: []
    };
  };

  // Get messages to display
  const getDisplayMessages = () => {
    if (paginatedMessages.shouldUsePagination) {
      return paginatedMessages.messages;
    }
    return messages;
  };

  const headerInfo = getConversationHeader();
  const displayMessages = getDisplayMessages();

  if (loadError) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="p-4 border-b">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h3 className="font-semibold">Error</h3>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <ErrorMessage 
            title="Failed to Load Conversation"
            description={loadError}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            {headerInfo.isGroup ? (
              <GroupAvatarStack 
                participants={headerInfo.participants} 
                size="sm"
              />
            ) : (
              <Avatar className="w-8 h-8">
                <AvatarImage src={headerInfo.avatar || ''} />
                <AvatarFallback>
                  {headerInfo.title?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{headerInfo.title}</h3>
              <p className="text-xs text-muted-foreground">{headerInfo.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="w-4 h-4" />
            </Button>
            {headerInfo.isGroup && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowMembersModal(true)}
              >
                <Users className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {!threadId && !recipientId ? (
          <div className="flex items-center justify-center h-full">
            <EmptyStateIllustration type="conversation" />
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyStateIllustration type="conversation" />
          </div>
        ) : paginatedMessages.shouldUseVirtualization ? (
          <VirtualizedList
            items={displayMessages}
            itemHeight={80}
            height={400}
            renderItem={({ item: message, index }) => (
              <div 
                key={message.id}
                data-last-message={index === displayMessages.length - 1}
              >
                <MessageBubble
                  message={message}
                  isOwnMessage={message.sender_id === user?.id}
                  showAvatar={true}
                />
              </div>
            )}
            onScrollToTop={handleScrollToTop}
          />
        ) : (
          <div className="space-y-4">
            {paginatedMessages.isLoadingOlder && (
              <div className="flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
            
            {displayMessages.map((message, index) => (
              <div 
                key={message.id}
                data-last-message={index === displayMessages.length - 1}
              >
                {message.message_type === 'system' ? (
                  <SystemMessage message={message.body} />
                ) : (
                  <MessageBubble
                    message={message}
                    isOwnMessage={message.sender_id === user?.id}
                    showAvatar={index === 0 || displayMessages[index - 1]?.sender_id !== message.sender_id}
                  />
                )}
              </div>
            ))}
            
            {/* Typing indicators */}
            {typingUsers.length > 0 && (
              <TypingIndicator users={typingUsers} />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t">
        {sendError && (
          <div className="mb-2 p-2 bg-destructive/10 text-destructive text-sm rounded">
            {sendError}
          </div>
        )}
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={isSending}
          onTypingStart={() => threadId && startTyping()}
          onTypingStop={() => threadId && stopTyping()}
          placeholder={`Message ${headerInfo.title}...`}
        />
      </div>

      {/* Group Members Modal */}
      {headerInfo.isGroup && (
        <GroupMembersModal
          open={showMembersModal}
          onOpenChange={setShowMembersModal}
          threadId={threadId}
          context={messageContext}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
};

export default ConversationView;