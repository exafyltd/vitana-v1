import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ClickableAvatar } from '@/components/ui/clickable-avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import MessageBubble from './MessageBubble';
import MessageDivider from './MessageDivider';
import MessageInput from './MessageInput';
import { SwipeableMessage } from './SwipeableMessage';
import TypingIndicator from './TypingIndicator';
import VirtualizedList from '@/components/ui/virtualized-list';
import { useHybridMessages } from '@/hooks/useHybridMessages';
import { usePaginatedMessages } from '@/hooks/usePaginatedMessages';
import { useAuth } from "@/context/AuthProvider";
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useToast } from '@/hooks/use-toast';

import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMessageHandler } from '@/components/payment/PaymentMessageHandler';
import {
  ArrowLeft,
  Loader2,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MessageSkeleton from './MessageSkeleton';
import EmptyStateIllustration from './EmptyStateIllustration';
import ErrorMessage from './ErrorMessage';
import SystemMessage from './SystemMessage';
import GroupMembersModal from './GroupMembersModal';
import GroupAvatarStack from './GroupAvatarStack';
import CreateGroupPopup from '@/components/messages/CreateGroupPopup';

import { format, isSameDay, isToday, isYesterday, isThisYear } from 'date-fns';
import { autoMarkAsDelivered, markMessagesAsRead } from '@/lib/messageStatus';
import { getConversationDisplayAvatar, getConversationDisplayTitle, getOtherParticipant, getParticipantFirstName } from '@/utils/conversationHelpers';
import { isVitanaBot, VITANA_BOT_DISPLAY_NAME, VITANA_BOT_AVATAR_URL } from '@/lib/vitanaBotIdentity';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface ConversationViewProps {
  threadId?: string | null;
  recipientId?: string | null;
  onBack?: () => void;
  className?: string;
  context?: 'global' | 'tenant';
  onThreadRead?: (threadId: string, context: 'global' | 'tenant') => void;
  onConversationOpened?: (threadId: string) => void;
  onMessageSent?: (threadId: string, newMessage: any, context: 'global' | 'tenant') => void;
  onGroupCreated?: (threadId: string) => void;
}

const ComposerDock: React.FC<{ children: React.ReactNode; isMobile: boolean }> = ({ children, isMobile }) => {
  // Desktop: render inline (no portal)
  if (!isMobile || typeof document === 'undefined') {
    return <div className="bg-background">{children}</div>;
  }

  // Mobile: use portal with safe-area handling
  return createPortal(
    <div className="fixed left-0 right-0 bottom-0 z-[60] bg-background">
      {children}
    </div>,
    document.body
  );
};

const ConversationView: React.FC<ConversationViewProps> = ({
  threadId,
  recipientId,
  onBack,
  className,
  context,
  onThreadRead,
  onConversationOpened,
  onMessageSent,
  onGroupCreated
}) => {
  // Import calendar hook at the top
  const { respondToInvite, getInviteResponse, addEvent, fetchEvents } = useCalendarEvents();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Use paginated messages for performance
  const paginatedMessages = usePaginatedMessages({
    pageSize: 50,
    paginationThreshold: 50,
    virtualizationThreshold: 200,
  });

  // CRITICAL: Only pass real threadId, never recipientId (prevents wrong cache key)
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
    context: messageContext,
    isMessagesLoading,
    isMessagesFetching,
  } = useHybridMessages(context, threadId);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isUserNearBottomRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const hasInitialScrolledRef = useRef<string | null>(null);
  const { toast } = useToast();
  const [recipientData, setRecipientData] = useState<any>(null);
  const [isThreadDataLoaded, setIsThreadDataLoaded] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [threadParticipants, setThreadParticipants] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  // Compute effective recipient ID for direct conversations using threads directly
  const effectiveRecipientId = React.useMemo(() => {
    if (recipientId) return recipientId;
    
    // Get current thread from threads array (immediate data)
    const currentThread: any = threadId ? threads.find((thread: any) => thread.id === threadId) : null;
    if (currentThread?.participants) {
      const otherParticipant = currentThread.participants.find((p: any) => p.user_id !== user?.id);
      return otherParticipant?.user_id || null;
    }
    
    return null;
  }, [recipientId, threadId, threads, user?.id]);

  // Compute full recipient object for direct conversations using threads directly
  const effectiveRecipient = React.useMemo(() => {
    const currentThread: any = threadId ? threads.find((thread: any) => thread.id === threadId) : null;
    

    // Helper to compose a recipient object with robust fallbacks
    const composeRecipient = (userId: string, participant?: any) => {
      // Vitana bot identity override — always resolves correctly
      if (isVitanaBot(userId)) {
        return { id: userId, name: VITANA_BOT_DISPLAY_NAME, avatar: VITANA_BOT_AVATAR_URL };
      }

      // Try multiple participant data structures and nested profile objects
      let name = participant?.display_name ||
        participant?.full_name ||
        participant?.name ||
        participant?.user?.display_name ||
        participant?.user?.full_name ||
        participant?.user?.name ||
        participant?.profile?.display_name ||
        participant?.profile?.full_name ||
        participant?.profile?.name ||
        participant?.global_community_profile?.display_name ||
        participant?.global_community_profiles?.display_name ||
        (recipientData?.display_name as string | undefined) ||
        (recipientData?.full_name as string | undefined);
      
      // If still no name, try the conversation display title as fallback
      if (!name) {
        name = getConversationDisplayTitle(currentThread, user?.id);
      }
      
      // Final fallback - but ensure we always return a string
      if (!name || name.trim() === '') {
        name = 'User';
      }

      const avatar = participant?.avatar_url ||
        participant?.avatar ||
        participant?.user?.avatar_url ||
        participant?.user?.avatar ||
        participant?.profile?.avatar_url ||
        participant?.profile?.avatar ||
        participant?.global_community_profile?.avatar_url ||
        participant?.global_community_profiles?.avatar_url ||
        (recipientData?.avatar_url as string | undefined) ||
        getConversationDisplayAvatar(currentThread, user?.id);

      
      
      return { id: userId, name: name.trim(), avatar };
    };
    
    if (recipientId && currentThread?.participants) {
      // Find specific recipient in thread participants
      const recipientParticipant = currentThread.participants.find((p: any) => p.user_id === recipientId);
      if (recipientParticipant) {
        return composeRecipient(recipientId, recipientParticipant);
      }
    }
    
    // For direct conversations, find the other participant
    if (currentThread?.participants) {
      const otherParticipant = currentThread.participants.find((p: any) => p.user_id !== user?.id);
      if (otherParticipant) {
        return composeRecipient(otherParticipant.user_id, otherParticipant);
      }
    }

    // Fallback to recipient data fetched separately if available
    if (recipientData) {
      const fallbackId = (recipientId as string | undefined) || (recipientData as any)?.user_id || null;
      if (fallbackId) {
        return composeRecipient(fallbackId, recipientData);
      }
    }
    
    return null;
  }, [recipientId, threadId, threads, user?.id, recipientData]);

  // Reply state management
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // Focus and intersection states for smart read detection
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [isLastMessageVisible, setIsLastMessageVisible] = useState(false);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  // Use hybrid messages directly from the hook - no local state needed
  const messages = hybridMessagesFromHook || [];
  
  // Clear messages immediately when switching threads to prevent stale data
  const [isThreadSwitching, setIsThreadSwitching] = useState(false);
  const previousThreadId = useRef<string | null>(null);
  
  useEffect(() => {
    if (threadId !== previousThreadId.current) {
      setIsThreadDataLoaded(false);
      hasInitialScrolledRef.current = null;
      previousThreadId.current = threadId;
      setIsThreadSwitching(false);
    }
  }, [threadId]);


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

  // Track scroll position and trigger top pagination — throttled via rAF, no state updates
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      isUserNearBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
      if (el.scrollTop <= 0) {
        handleScrollToTop();
      }
    });
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

  // React Query handles message fetching automatically via threadId in useHybridMessages
  // No manual fetchMessages call needed - removing to prevent duplicate fetches

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



  // Enhanced scroll to bottom with auto-scroll detection
  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;

    if (isUserNearBottomRef.current || force) {
      el.scrollTo({ top: el.scrollHeight, behavior: force ? 'smooth' : 'auto' });
    }
  }, []);

  // Mark thread as read when viewing it
  useEffect(() => {
    if (threadId && isWindowFocused && messages.length > 0 && markAsRead && user?.id) {
      console.log('📖 ConversationView: Marking thread as read', { threadId, messageContext, messagesLength: messages.length });
      
      // Determine if this is a group thread (messages in global_messages) or direct DM (chat_messages)
      const currentThread = threads.find(t => t.id === threadId);
      const isGroupThread = currentThread?.type === 'group';
      // For read receipts: group threads use global_messages, direct DMs should NOT write to global_messages
      const useGlobalTable = isGroupThread;
      
      // Auto-mark other users' messages as delivered
      if (useGlobalTable) {
        autoMarkAsDelivered(messages, user.id, true);
      }
      // For direct DMs, the gateway handles read state — don't write to wrong table
      
      // Mark messages as read using the proper function (only for group/global_messages)
      if (useGlobalTable) {
        const messageIds = messages.filter(msg => msg.sender_id !== user.id).map(msg => msg.id);
        if (messageIds.length > 0) {
          markMessagesAsRead(messageIds, true);
        }
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

  // Auto-scroll only when new messages arrive and user is already at bottom
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && isUserNearBottomRef.current) {
      scrollToBottom(false);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);


  // Scroll to latest messages instantly when entering a conversation (WhatsApp-style)
  // Use useLayoutEffect to run before browser paint for smoother UX
  useLayoutEffect(() => {
    if (threadId && messages.length > 0 && hasInitialScrolledRef.current !== threadId) {
      hasInitialScrolledRef.current = threadId;
      
      const scrollToEnd = () => {
        const el = scrollRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight - el.clientHeight;
          isUserNearBottomRef.current = true;
        }
      };
      
      scrollToEnd();
      
      const timers = [50, 150, 300].map(delay => 
        setTimeout(() => {
          requestAnimationFrame(scrollToEnd);
        }, delay)
      );
      
      return () => timers.forEach(clearTimeout);
    }
  }, [threadId, messages.length]);

  // ResizeObserver to keep pinned at bottom when content resizes (images loading, etc.)
  useEffect(() => {
    const content = contentRef.current;
    const scroll = scrollRef.current;
    if (!content || !scroll || !threadId) return;

    const observer = new ResizeObserver(() => {
      // Only auto-scroll if user is truly at bottom (won't yank them if scrolled up)
      if (isUserNearBottomRef.current && hasInitialScrolledRef.current === threadId) {
        scroll.scrollTop = scroll.scrollHeight - scroll.clientHeight;
      }
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [threadId]);


  const handleSendMessage = async (
    content: string, 
    messageType?: string, 
    contentData?: any, 
    actionButtons?: any[],
    parentMessageId?: string
  ) => {
    try {
      setSendError(null);
      
      // Check if offline first
      if (!navigator.onLine) {
        setSendError('You are offline. Message will be sent when connection is restored.');
        console.warn('📴 Offline - message queued');
        return;
      }

      if (!threadId) {
        console.error('No thread ID available for sending message');
        setSendError('Thread not found');
        return;
      }

      // Create optimistic message for instant feedback
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        body: content,
        message_type: messageType || 'text',
        content_data: contentData,
        sender_id: user?.id,
        thread_id: threadId,
        created_at: new Date().toISOString(),
        parent_message_id: parentMessageId,
        action_buttons: actionButtons,
        sent_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
        updated_at: new Date().toISOString(),
        optimistic: true,
        sender: {
          user_id: user?.id || '',
          display_name: user?.email || 'You',
          avatar_url: null 
        }
      };

      // Add optimistic message immediately for instant feedback
      if (paginatedMessages.shouldUsePagination) {
        paginatedMessages.addNewMessage(optimisticMessage);
      }

      // Scroll to show new message immediately
      setTimeout(() => {
        requestAnimationFrame(() => {
          scrollToBottom(true);
        });
      }, 50);

      const messageContext = context;

      const sendPromise = sendMessage({
        context: messageContext,
        threadId,
        content,
        type: (messageType as any) || 'text',
        contentData,
        recipientId,
        parentMessageId: parentMessageId || replyingTo?.id,
        actionButtons,
      });

      const newMessage = await sendPromise;

      // Show instant feedback for calendar invites and process in background
      if (newMessage && messageType === 'calendar_invite' && contentData && user?.id) {
        // Immediate success feedback
        notify('toasts.messages.calendarInviteSent', 'toasts.messages.processingCalendarEvent');

        // Background calendar processing (non-blocking)
        setTimeout(async () => {
          try {
            console.log('📅 Creating sender calendar event for invite:', contentData);
            
            const composeDateTime = (date: string, time?: string) => {
              if (date.includes('T')) {
                const [datePart, timePart] = date.split('T');
                const [y, m, d] = datePart.split('-').map(Number);
                const [h, mi] = timePart.split(':').map(Number);
                return new Date(y, m-1, d, h, mi, 0, 0).toISOString();
              }
              
              const [y, m, d] = date.split('-').map(Number);
              if (time) {
                const [h, mi] = time.split(':').map(Number);
                return new Date(y, m-1, d, h, mi, 0, 0).toISOString();
              }
              
              return new Date(y, m-1, d, 9, 0, 0, 0).toISOString();
            };

            const startTime = contentData.start_time || composeDateTime(contentData.date, contentData.time);
            const endTime = contentData.end_time || (contentData.endTime ? 
              composeDateTime(contentData.endDate || contentData.date, contentData.endTime) :
              new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString());

            const senderEventData = {
              user_id: user.id,
              title: contentData.title || content.split(':')[1]?.trim() || 'Calendar Event',
              description: contentData.description || `Calendar invite sent`,
              start_time: startTime,
              end_time: endTime,
              location: contentData.location || '',
              event_type: 'personal' as const,
              status: 'confirmed' as const,
              priority: 'medium' as const,
              is_recurring: false,
              source_type: 'invite' as const,
              source_message_id: newMessage.id,
              metadata: { message_ref: newMessage.id, invite_sent: true }
            };

            await addEvent(senderEventData as any, { showToast: false });
            
            notify('toasts.messages.calendarUpdated');
            
            console.log('📅 Successfully created sender calendar event:', senderEventData.title);
          } catch (error: any) {
            console.error('📅 Failed to create sender calendar event:', error);
            
            // Event will be processed by background processor
            notify('toasts.messages.calendarEventQueued', 'toasts.messages.eventWillAddedYourCalendarShortly');
          }
        }, 0); // Process immediately after current call stack
      } else if (messageType === 'calendar_invite' && contentData && !user?.id) {
        notify('toasts.messages.inviteSent', 'toasts.messages.signAddEventYourCalendar');
      }

      if (onMessageSent && threadId && newMessage) {
        onMessageSent(threadId, newMessage, messageContext);
      }

      setReplyingTo(null);

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
      // Extract meaningful error message from various error types
      const extractMessage = (e: unknown): string => {
        if (!e) return 'Unknown error';
        if (typeof e === 'string') return e;
        if (typeof e === 'object') {
          if ('message' in e && typeof (e as any).message === 'string') {
            return (e as any).message;
          }
          if ('hint' in e && typeof (e as any).hint === 'string') {
            return (e as any).hint;
          }
          if ('details' in e && typeof (e as any).details === 'string') {
            return (e as any).details;
          }
        }
        return 'Failed to send message';
      };

      const errorMessage = extractMessage(error);
      const isTimeout = errorMessage.includes('timed out');
      
      console.error('❌ Send error (full payload):', error);
      console.error('❌ Extracted error message:', errorMessage);
      
      setSendError(errorMessage);

      toast({
        title: isTimeout ? 'Sending Timed Out' : 'Message Failed',
        description: isTimeout
          ? 'Your message is taking longer than expected. You can retry sending it.'
          : errorMessage,
        variant: 'destructive',
      });

      console.error({
        stage: 'send', 
        threadId: threadId, 
        payload: { text: content }, 
        error,
        isTimeout
      });
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
          const eventData = action.data ?? action.messageData;
          
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

            const shouldCreate = (response === 'accepted' || response === 'maybe') && !!eventData;
            const start_time = shouldCreate
              ? composeIso(eventData.date, eventData.time)
              : undefined;

            const end_time = shouldCreate
              ? (eventData.endDate || eventData.endTime ? composeIso(eventData.endDate || eventData.date, eventData.endTime) : undefined)
              : undefined;

            // Build payload for accepted or maybe (tentative)
            const payload = shouldCreate ? {
              title: eventData.title || 'Calendar Event',
              description: eventData.description,
              start_time: start_time || new Date().toISOString(),
              end_time,
              location: eventData.location,
              event_type: (eventData.type as any) || 'personal',
              status: response === 'accepted' ? ('confirmed' as const) : ('pending' as const),
              priority: (eventData.priority as any) || 'medium',
              is_recurring: false,
              attendees_count: eventData.attendees || 0,
              has_rewards: !!eventData.hasRewards,
              metadata: { originalMessage: eventData },
              source_type: 'invite' as const,
              user_id: '' // Will be overridden by the hook
            } : undefined;

            // Validate message id before responding
            const isValidUUID = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
            const safeMessageId = action.messageId;
            if (!isValidUUID(safeMessageId)) {
              notify('toasts.messages.pleaseWait', 'toasts.messages.stillSyncingThisMessageTryAgain');
              return;
            }

            const result = await respondToInvite(
              safeMessageId,
              response,
              payload
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
            
            // Trigger calendar refresh to ensure immediate UI sync
            window.dispatchEvent(new Event('calendar-events:refresh'));
            
            notify('toasts.messages.responseSent');

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
            
            notifyError('toasts.messages.calendarInviteError');
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
      notifyError('toasts.messages.error', 'toasts.messages.failedProcessAction');
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
    
    // For direct messages, show user status or empty string instead of message context
    // This prevents showing "Global Community" for direct messages
    return '';
  };

  const isGroupChat = () => {
    const currentThread: any = threadId ? threads.find((thread: any) => thread.id === threadId) : null;
    return currentThread?.type === 'group';
  };

  // Determine if we should show "Add to Contacts" button
  // Compute conversation type for payment popups
  const conversationType: 'direct' | 'group' | null = React.useMemo(() => {
    const currentThread: any = threadId ? threads.find((thread: any) => thread.id === threadId) : null;
    if (!currentThread) return null;
    return currentThread.type === 'group' ? 'group' : 'direct';
  }, [threadId, threads]);

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


  // Loading state for when conversation is being loaded  
  if (isLoadingConversation) {
    return (
      <div className={cn("flex flex-col h-full min-h-0 min-w-0 overflow-hidden", className)}>
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
      <div className={cn("flex flex-col h-full min-h-0 min-w-0 overflow-hidden w-full", className)}>
        {/* Header - Sticky at top */}
        <div className="shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
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
                <ClickableAvatar
                  userId={effectiveRecipientId || undefined}
                  src={getConversationAvatar() || undefined}
                  fallback={getConversationTitle()[0]?.toUpperCase() || 'U'}
                  alt={getConversationTitle()}
                  className="shrink-0"
                />
              )}
              
              <div 
                className={cn("min-w-0 flex-1", isGroupChat() ? "cursor-pointer" : "")}
                onClick={isGroupChat() ? () => setShowMembersModal(true) : undefined}
              >
                <h2 className="text-sm font-semibold truncate">{getConversationTitle()}</h2>
                <p className="text-xs text-muted-foreground truncate">{getConversationSubtitle()}</p>
              </div>
            </div>
          
            <div className="flex items-center gap-1 shrink-0">
              {!isGroupChat() && effectiveRecipientId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreateGroup(true)}
                  title="Create Group"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Messages - Scrollable area */}
        <div 
          className="chat-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0 px-4 py-1 overscroll-contain" 
          id="chat-scroll"
          ref={scrollRef}
          onScroll={handleScroll}
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', paddingBottom: isMobile ? 'var(--composer-h, 56px)' : undefined }}
        >
          {messages.length === 0 ? (
            isMessagesLoading || isMessagesFetching ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">{t('screens.messages.loadingMessages')}</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t('screens.messages.noMessagesYet')}</p>
                <p className="text-sm text-muted-foreground">{t('screens.messages.startConversation')}</p>
              </div>
            )
          ) : (

            <div ref={contentRef}>
              {(() => {
                // Build message lookup map for O(1) parent resolution
                const messageMap = new Map<string, any>(messages.map(m => [m.id, m] as [string, any]));
                
                const handleScrollToMessage = (messageId: string) => {
                  const el = document.getElementById(`msg-${messageId}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('message-highlight');
                    setTimeout(() => el.classList.remove('message-highlight'), 1500);
                  }
                };
                
                return messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const previousMessage = index > 0 ? messages[index - 1] : null;

                // Smart avatar display logic
                const showAvatar = !previousMessage || previousMessage.sender_id !== message.sender_id;

                // Smart spacing logic - group consecutive messages from same sender
                const isConsecutiveFromSameSender = previousMessage && previousMessage.sender_id === message.sender_id;

                // Time-based grouping (within 5 minutes)
                const timeDiff = previousMessage
                  ? new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime()
                  : Infinity;
                const isWithinTimeWindow = timeDiff < 5 * 60 * 1000; // 5 minutes

                // Determine spacing
                const shouldUseSmallSpacing = isConsecutiveFromSameSender && isWithinTimeWindow;

                // Day separator between dates (WhatsApp-style centered chip)
                const messageDate = new Date(message.created_at);
                const isNewDay = !previousMessage
                  || !isSameDay(messageDate, new Date(previousMessage.created_at));
                const dayLabel = isToday(messageDate)
                  ? 'Today'
                  : isYesterday(messageDate)
                    ? 'Yesterday'
                    : isThisYear(messageDate)
                      ? format(messageDate, 'd MMMM')
                      : format(messageDate, 'd MMMM yyyy');

                // Resolve parent message for reply quotes (check both field names)
                const parentId = message.parent_message_id || message.reply_to_message_id;
                const resolvedParentMessage = parentId
                  ? messageMap.get(parentId) || null
                  : null;

                return (
                  <React.Fragment key={message.id}>
                  {isNewDay && <MessageDivider type="date" text={dayLabel} />}
                  <div
                    id={`msg-${message.id}`}
                    className={cn(
                      shouldUseSmallSpacing ? "mb-0.5" : "mb-2",
                      "transition-colors duration-500"
                    )}
                  >
                    <SwipeableMessage
                      onReply={() => handleReply(message)}
                      isOwnMessage={isOwnMessage}
                      enabled={isMobile}
                    >
                      <MessageBubble
                        message={message}
                        isOwnMessage={isOwnMessage}
                        onActionClick={handleActionClick}
                        onReply={handleReply}
                        onScrollToMessage={handleScrollToMessage}
                        parentMessage={resolvedParentMessage}
                        showAvatar={showAvatar}
                        onUpdateMessage={async (messageId: string, updates: any) => {
                          try {
                            // Route to correct table based on thread type
                            const ct = threads.find((t: any) => t.id === threadId);
                            const isGroup = ct?.type === 'group';
                            const table = messageContext === 'tenant'
                              ? 'messages'
                              : isGroup
                                ? 'global_messages'
                                : 'chat_messages';
                            const { error } = await supabase
                              .from(table)
                              .update(table === 'messages' ? updates : { content: updates.body || updates.content })
                              .eq('id', messageId);
                            
                            if (error) {
                              console.error('[Edit] Mutation FAILED for message:', messageId, 'table:', table, 'error:', error);
                              throw error;
                            }
                            
                            console.log('[Edit] Mutation succeeded for message:', messageId, 'table:', table);
                            if (fetchMessages) {
                              console.log('[Edit] Triggering refetch for threadId:', threadId);
                              await fetchMessages(threadId);
                              console.log('[Edit] Refetch completed for threadId:', threadId);
                            } else {
                              console.warn('[Edit] No fetchMessages function available — UI will not refresh');
                            }
                          } catch (error) {
                            console.error('Failed to update message:', error);
                            notifyError('toasts.messages.updateFailed', 'toasts.messages.failedUpdateMessagePleaseTryAgain');
                            throw error;
                          }
                        }}
                        onDeleteMessage={async (messageId: string) => {
                          try {
                            const ct = threads.find((t: any) => t.id === threadId);
                            const isGroup = ct?.type === 'group';
                            const table = messageContext === 'tenant'
                              ? 'messages'
                              : isGroup
                                ? 'global_messages'
                                : 'chat_messages';
                            const { error } = await supabase
                              .from(table)
                              .delete()
                              .eq('id', messageId);
                            if (error) {
                              console.error('[Delete] Mutation FAILED for message:', messageId, 'table:', table, 'error:', error);
                              throw error;
                            }
                            console.log('[Delete] Mutation succeeded for message:', messageId, 'table:', table);
                            notify('toasts.messages.messageDeleted');
                            if (fetchMessages) {
                              console.log('[Delete] Triggering refetch for threadId:', threadId);
                              await fetchMessages(threadId);
                              console.log('[Delete] Refetch completed for threadId:', threadId);
                            } else {
                              console.warn('[Delete] No fetchMessages function available — UI will not refresh');
                            }
                          } catch (error) {
                            console.error('Failed to delete message:', error);
                            notifyError('toasts.messages.deleteFailed', 'toasts.messages.failedDeleteMessagePleaseTryAgain');
                          }
                        }}
                        onSendReply={handleSendMessage}
                      />
                    </SwipeableMessage>
                  </div>
                  </React.Fragment>
                );
              });
              })()}
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        <ComposerDock isMobile={isMobile}>
          <div className="conversation-composer bg-background">
            <div className="px-2 py-0.5 pb-1">
              {/* Typing Indicators */}
              {typingUsers.length > 0 && (
                <div className="mb-2">
                  <TypingIndicator users={typingUsers} />
                </div>
              )}
              
              {sendError && (
                <div className="mb-2">
                  <ErrorMessage 
                    title={t('screens.messages.messageFailedSend')}
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
                  isSending={isSending}
                  placeholder={`Message ${getParticipantFirstName(getOtherParticipant(threads.find(t => t.id === threadId), user?.id))}...`}
                  threadId={threadId}
                  recipientId={recipientId}
                  effectiveRecipientId={effectiveRecipientId}
                  effectiveRecipient={effectiveRecipient}
                  activeThread={threadId ? (threads.find(t => t.id === threadId) || { id: threadId }) : recipientId ? { id: 'new-conversation' } : undefined}
                  replyingTo={replyingTo}
                  onCancelReply={handleCancelReply}
                  conversationType={conversationType}
                />
              </div>
            </div>
          </div>
        </ComposerDock>
      </div>

      <GroupMembersModal
        open={showMembersModal}
        onOpenChange={setShowMembersModal}
        threadId={threadId || ''}
        context={messageContext}
        currentUserRole={currentUserRole}
      />

      <CreateGroupPopup
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        context={messageContext}
        onGroupCreated={onGroupCreated}
        initialMembers={effectiveRecipientId && effectiveRecipient ? [{
          user_id: effectiveRecipientId,
          display_name: effectiveRecipient.name || 'User',
          avatar_url: effectiveRecipient.avatar,
          email: ''
        }] : []}
      />
    </>
  );
};

export default ConversationView;