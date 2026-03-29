import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { messagesNavigation } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Users, MessageSquareText, Globe, Building, Plane, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationView from "@/components/messages/ConversationView";
import { ConversationErrorBoundary } from "@/components/messages/ConversationErrorBoundary";
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useRole } from "@/hooks/useRole";
import { useUnreadSync } from "@/hooks/useUnreadSync";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClickableAvatar } from "@/components/ui/clickable-avatar";
import { MessageSquare } from "lucide-react";
import NewConversationPopup from "@/components/NewConversationPopup";
import ConversationListSkeleton from "@/components/messages/ConversationListSkeleton";
import EmptyStateIllustration from "@/components/messages/EmptyStateIllustration";
import ErrorMessage from "@/components/messages/ErrorMessage";
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import CreateGroupPopup from "@/components/messages/CreateGroupPopup";
import TypingIndicator from '@/components/messages/TypingIndicator';
import PresenceIndicator from '@/components/messages/PresenceIndicator';
import GroupAvatarStack from '@/components/messages/GroupAvatarStack';
import { getConversationDisplayAvatar, getConversationDisplayTitle, getOtherParticipant } from '@/utils/conversationHelpers';
import ContactsTabContent from '@/components/contacts/ContactsTabContent';
import { CallManager } from '@/components/CallManager';
import { CallProvider } from '@/context/CallContext';
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { MobileConversationCard } from "@/components/messages/mobile/MobileConversationCard";
import { MobileInboxEmptyState } from "@/components/messages/mobile/MobileInboxEmptyState";
import { MobileConversationSkeleton } from "@/components/messages/mobile/MobileConversationSkeleton";
import { useTranslation } from "@/hooks/useTranslation";

export default function Messages() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { translate } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const defaultCtx = currentRole === 'community' || !currentRole ? 'global' : 'tenant';
  const [messageContext, setMessageContext] = useState<'global' | 'tenant'>(defaultCtx);
  const { threads, isLoading, isFetching, context, ...hybridMessages } = useHybridMessages(messageContext);
  const isGlobalContext = context === 'global';

  const roleLoadedRef = React.useRef(false);
  useEffect(() => {
    if (currentRole && !roleLoadedRef.current) {
      roleLoadedRef.current = true;
      const correctCtx = currentRole === 'community' ? 'global' : 'tenant';
      if (correctCtx !== messageContext) {
        setMessageContext(correctCtx);
      }
    }
  }, [currentRole]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [densityMode, setDensityMode] = useState<'comfortable' | 'compact'>('comfortable');
  const [pinnedThreads, setPinnedThreads] = useState<Set<string>>(new Set());
  const [conversationFilter, setConversationFilter] = useState<'all' | 'groups' | 'direct' | 'contacts'>('all');
  const [inboxSearchQuery, setInboxSearchQuery] = useState("");
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const { pendingCount } = useAutopilot();

  // Parse query params to auto-select thread from notifications
  const [searchParams, setSearchParams] = useSearchParams();
  const urlThreadId = searchParams.get('thread');
  const urlContext = searchParams.get('context') as 'global' | 'tenant' | null;

  // Apply URL params on mount
  useEffect(() => {
    if (urlThreadId) {
      console.log('[Messages] Opening thread from URL:', { urlThreadId, urlContext });
      setSelectedThreadId(urlThreadId);
      setSelectedRecipientId(null);

      if (urlContext && (urlContext === 'global' || urlContext === 'tenant')) {
        setMessageContext(urlContext);
      }

      // Clear URL params after applying
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('thread');
      newParams.delete('context');
      setSearchParams(newParams, { replace: true });
    }
  }, [urlThreadId, urlContext, setSearchParams]);

  // Track optimistic unread updates (threadId -> 0)
  const [optimisticUnreadUpdates, setOptimisticUnreadUpdates] = useState<Record<string, number>>({});

  // SINGLE SOURCE OF TRUTH: Derive displayThreads from React Query threads + optimistic updates
  // Safety: if the server shows unread_count > 0 but we have an optimistic 0,
  // the server wins — a new message arrived after we set the override.
  const displayThreads = React.useMemo(() => {
    return threads.map(thread => {
      const optimistic = optimisticUnreadUpdates[thread.id];
      const real = thread.unread_count;
      // If optimistic is 0 but server says > 0, server wins (new msg arrived)
      const unread_count = (optimistic === 0 && real > 0) ? real : (optimistic ?? real);
      return { ...thread, unread_count };
    });
  }, [threads, optimisticUnreadUpdates]);

  // Auto-select the most recent conversation (WhatsApp-style behavior)
  // Only auto-select on desktop - on mobile, users should see the list first and tap to open
  useEffect(() => {
    if (displayThreads.length > 0 && !selectedThreadId && !isMobile) {
      // Get the most recent conversation from the sorted and deduplicated list
      const sortedThreads = [...displayThreads]
        .sort((a, b) => {
          const ap = pinnedThreads.has(a.id) ? 1 : 0;
          const bp = pinnedThreads.has(b.id) ? 1 : 0;
          if (ap !== bp) return bp - ap;
          const ad = new Date(a.updated_at).getTime();
          const bd = new Date(b.updated_at).getTime();
          return bd - ad;
        })
        .reduce((acc, thread) => {
          if (thread.type === 'direct') {
            const counterpart = thread.participants?.find(p => p.user_id !== user?.id);
            const key = counterpart?.user_id || 'unknown';
            const existing = acc.find(t => t._dedupeKey === key);
            if (!existing || new Date(thread.updated_at) > new Date(existing.updated_at)) {
              const filtered = acc.filter(t => t._dedupeKey !== key);
              filtered.push({ ...thread, _dedupeKey: key });
              return filtered;
            }
            return acc;
          } else {
            acc.push({ ...thread, _dedupeKey: thread.id });
            return acc;
          }
        }, [] as (typeof displayThreads[0] & { _dedupeKey: string })[]);

      if (sortedThreads.length > 0) {
        setSelectedThreadId(sortedThreads[0].id);
        setSelectedRecipientId(null);
      }
    }
  }, [displayThreads, selectedThreadId, pinnedThreads, user?.id, isMobile]);

  // Reset selection when context changes
  useEffect(() => {
    setSelectedThreadId(null);
    setSelectedRecipientId(null);
    setOptimisticUnreadUpdates({}); // Clear optimistic updates
    setInboxSearchQuery(""); // Reset search on context switch
  }, [messageContext]);

  // Handle real-time unread sync across tabs/devices - update optimistic state
  const handleThreadRead = useCallback((threadId: string, ctx: 'global' | 'tenant') => {
    console.log('📖 Messages.tsx: handleThreadRead called', { threadId, ctx, messageContext });
    if (ctx === messageContext) {
      setOptimisticUnreadUpdates(prev => ({
        ...prev,
        [threadId]: 0
      }));
    }
  }, [messageContext]);

  // Immediate optimistic unread update when conversation is opened
  const handleConversationOpened = useCallback((threadId: string) => {
    console.log('🚀 Messages.tsx: Conversation opened immediately', { threadId, messageContext });
    setOptimisticUnreadUpdates(prev => ({
      ...prev,
      [threadId]: 0
    }));
  }, []);

  // Search dropdown items for inbox search
  const searchDropdownItems = React.useMemo(() => {
    if (!inboxSearchQuery.trim()) return [];
    const query = inboxSearchQuery.toLowerCase();
    return displayThreads
      .filter(thread => {
        const title = getConversationDisplayTitle(thread, user?.id).toLowerCase();
        const lastMsg = (thread.last_message?.content || '').toLowerCase();
        return title.includes(query) || lastMsg.includes(query);
      })
      .slice(0, 6)
      .map(thread => ({
        id: thread.id,
        title: getConversationDisplayTitle(thread, user?.id),
        subtitle: thread.last_message?.content
          ? thread.last_message.content.length > 60
            ? thread.last_message.content.slice(0, 60) + '…'
            : thread.last_message.content
          : undefined,
      }));
  }, [displayThreads, inboxSearchQuery, user?.id]);

  const handleSearchItemClick = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    setSelectedRecipientId(null);
    const thread = displayThreads.find(t => t.id === threadId);
    if (thread && thread.unread_count > 0) {
      handleConversationOpened(threadId);
    }
  }, [displayThreads, handleConversationOpened]);

  // Move the just-sent conversation to the top instantly via React Query cache
  const handleMessageSent = useCallback((threadId: string, newMessage: any, ctx: 'global' | 'tenant') => {
    // The hooks already update the React Query cache optimistically
    // No need for local state manipulation
    console.log('📨 Messages.tsx: Message sent', { threadId, ctx });
  }, []);

  const handleUnreadChange = useCallback((threadId: string, ctx: 'global' | 'tenant') => {
    if (ctx === messageContext) {
      // Clear optimistic override so the real unread_count shows through
      setOptimisticUnreadUpdates(prev => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
    }
  }, [messageContext]);

  // Initialize unread sync
  useUnreadSync(handleThreadRead, handleUnreadChange);

  const handleConversationCreated = (threadId: string, recipientId: string) => {
    setSelectedThreadId(threadId);
    // Keep recipientId until participants are loaded so header shows the name
    setSelectedRecipientId(recipientId);
  };

  const handleGroupCreated = (threadId: string) => {
    setSelectedThreadId(threadId);
    setSelectedRecipientId(null);
  };

  // Hide ORB when direct chat is open on mobile
  useEffect(() => {
    if (isMobile && selectedThreadId) {
      document.body.dataset.chatScreenOpen = "true";
      return () => { delete document.body.dataset.chatScreenOpen; };
    } else {
      delete document.body.dataset.chatScreenOpen;
    }
  }, [isMobile, selectedThreadId]);

  // Only show skeleton when loading AND no cached data
  if (isLoading && threads.length === 0) {
    // Mobile loading state
    if (isMobile) {
      return (
        <AppLayout>
          <SEO title={translate('inbox.title')} description={translate('inbox.description')} canonical={window.location.href} />
          <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background">
            <div className="p-4 pb-32 space-y-4">
              <StandardHeader 
                title={translate('inbox.title')}
                description={translate('inbox.description')}
              />
              <MobileConversationSkeleton count={6} />
            </div>
          </div>
        </AppLayout>
      );
    }
    
    // Desktop loading state
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-x-hidden">
        <SEO title={translate('inbox.desktopTitle', 'Messages')} description={translate('inbox.description')} canonical={window.location.href} />
        <AppLayout>
          <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
              <SubNavigation items={messagesNavigation} />
              <StandardHeader 
                title={translate('inbox.desktopTitle', 'Messages')}
                description={translate('inbox.loading')}
              />
              <div className="flex-1 flex">
                <div className="w-80 border-r">
                  <ConversationListSkeleton />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">{translate('inbox.loading')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppLayout>
      </div>
    );
  }

  // Get responsive panel sizes based on screen size
  const getConversationPanelSize = () => {
    if (isMobile) return 100; // Full width on mobile
    return 43; // 43% on desktop - ensures full card content incl. rounded corners
  };

  const getChatPanelSize = () => {
    if (isMobile) return 0; // Hidden on mobile when conversation list is shown
    return 57; // 57% on desktop - chat remains wider
  };

  const getFilteredThreads = (threadsList: typeof displayThreads, filter: typeof conversationFilter) => {
    if (filter === 'all') return threadsList;
    if (filter === 'groups') return threadsList.filter(t => t.type === 'group');
    if (filter === 'direct') return threadsList.filter(t => t.type === 'direct');
    return [];
  };

  const renderConversationList = (threadsList: typeof displayThreads) => {
    const filteredThreads = getFilteredThreads(threadsList, conversationFilter);

    return (
      <Tabs value={conversationFilter} onValueChange={(v) => setConversationFilter(v as any)} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto mb-4">
          <TabsTrigger 
            value="all" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            {translate('inbox.tabs.all')}
          </TabsTrigger>
          <TabsTrigger 
            value="groups" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            {translate('inbox.tabs.groups')}
          </TabsTrigger>
          <TabsTrigger 
            value="direct" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            {translate('inbox.tabs.direct')}
          </TabsTrigger>
          <TabsTrigger 
            value="contacts" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            {translate('inbox.tabs.contacts')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className={`${densityMode === 'compact' ? 'space-y-1' : 'space-y-2'}`}>
            {filteredThreads.length === 0 ? (
              <EmptyStateIllustration 
                type="inbox"
                context={messageContext}
                threads={threadsList}
                onAction={() => setShowNewConversation(true)}
                onCreateGroup={() => setShowCreateGroup(true)}
              />
            ) : (
              [...filteredThreads]
                .sort((a, b) => {
                  const ap = pinnedThreads.has(a.id) ? 1 : 0;
                  const bp = pinnedThreads.has(b.id) ? 1 : 0;
                  if (ap !== bp) return bp - ap;
                  const ad = new Date(a.updated_at).getTime();
                  const bd = new Date(b.updated_at).getTime();
                  return bd - ad;
                })
                .reduce((acc, thread) => {
                  if (thread.type === 'direct') {
                    const counterpart = thread.participants?.find(p => p.user_id !== user?.id);
                    const key = counterpart?.user_id || 'unknown';
                    const existing = acc.find(t => t._dedupeKey === key);
                    if (!existing || new Date(thread.updated_at) > new Date(existing.updated_at)) {
                      const filtered = acc.filter(t => t._dedupeKey !== key);
                      filtered.push({ ...thread, _dedupeKey: key });
                      return filtered;
                    }
                    return acc;
                  } else {
                    acc.push({ ...thread, _dedupeKey: thread.id });
                    return acc;
                  }
                }, [] as (typeof displayThreads[0] & { _dedupeKey: string })[])
                .map((thread) => {
                  const isPinned = pinnedThreads.has(thread.id);
                  const isActive = selectedThreadId === thread.id;
                  const cardHeight = densityMode === 'compact' ? 'p-3' : 'p-4';
                  
                  return (
                    <Card
                      key={thread.id}
                      className={`${cardHeight} mr-3 cursor-pointer transition-all duration-200 hover:bg-muted/50 relative ${
                        isActive 
                          ? 'bg-domain-messages-tint border-l-4 border-l-domain-messages-accent shadow-md' 
                          : 'hover:shadow-sm'
                      } ${isPinned ? 'ring-1 ring-domain-messages-accent/30' : ''}`}
                      onClick={() => {
                        console.log('🎯 Messages.tsx: Thread clicked', { threadId: thread.id, unreadCount: thread.unread_count });
                        setSelectedThreadId(thread.id);
                        setSelectedRecipientId(null);
                        if (thread.unread_count > 0) {
                          handleConversationOpened(thread.id);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          <ClickableAvatar
                            userId={thread.type !== 'group' ? getOtherParticipant(thread, user?.id)?.user_id : undefined}
                            src={getConversationDisplayAvatar(thread, user?.id) || undefined}
                            fallback={getConversationDisplayTitle(thread, user?.id)?.[0]?.toUpperCase() || '?'}
                            alt={getConversationDisplayTitle(thread, user?.id)}
                            className={densityMode === 'compact' ? 'w-8 h-8' : 'w-10 h-10'}
                            disabled={thread.type === 'group'}
                          />
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <PresenceIndicator 
                              userId={getOtherParticipant(thread, user?.id)?.user_id || ''} 
                              context={context}
                              size="sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-medium truncate ${densityMode === 'compact' ? 'text-sm' : 'text-base'}`}>
                                  {getConversationDisplayTitle(thread, user?.id)}
                                </h3>
                                {isPinned && (
                                  <div className="w-2 h-2 bg-domain-messages-accent rounded-full flex-shrink-0"></div>
                                )}
                              </div>
                              
                              {thread.last_message && (
                                <p className={`text-muted-foreground truncate ${
                                  densityMode === 'compact' ? 'text-xs mt-0.5' : 'text-sm mt-1'
                                }`}>
                                  {thread.last_message.body}
                                </p>
                              )}
                              
                              {densityMode === 'comfortable' && (
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <Users className="w-3 h-3 mr-1" />
                                  {thread.participants?.length || 0} participants
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 pl-1.5 ml-2 flex-shrink-0">
                              <span className={`text-muted-foreground whitespace-nowrap ${
                                densityMode === 'compact' ? 'text-xs' : 'text-xs'
                              }`}>
                                {thread.updated_at && new Date(thread.updated_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              
                              {thread.unread_count > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="bg-domain-messages-accent text-white animate-in fade-in duration-200 text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                                >
                                  {thread.unread_count > 99 ? '99+' : thread.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-0">
          {/* Create Group Header - only show when groups exist */}
          {filteredThreads.length > 0 && (
            <div className="mb-4 mr-3">
              <Button 
                onClick={() => setShowCreateGroup(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Group
              </Button>
            </div>
          )}

          <div className={`${densityMode === 'compact' ? 'space-y-1' : 'space-y-2'}`}>
            {filteredThreads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                  Groups help you collaborate with multiple people at once. Perfect for teams, projects, or communities.
                </p>
                <Button onClick={() => setShowCreateGroup(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Create Your First Group
                </Button>
              </div>
            ) : (
              [...filteredThreads]
                .sort((a, b) => {
                  const ap = pinnedThreads.has(a.id) ? 1 : 0;
                  const bp = pinnedThreads.has(b.id) ? 1 : 0;
                  if (ap !== bp) return bp - ap;
                  
                  // Show unread groups before read groups
                  const au = (a.unread_count || 0) > 0 ? 1 : 0;
                  const bu = (b.unread_count || 0) > 0 ? 1 : 0;
                  if (au !== bu) return bu - au;
                  
                  const ad = new Date(a.updated_at).getTime();
                  const bd = new Date(b.updated_at).getTime();
                  return bd - ad;
                })
                .map((thread) => {
                  const isPinned = pinnedThreads.has(thread.id);
                  const isActive = selectedThreadId === thread.id;
                  const cardHeight = densityMode === 'compact' ? 'p-3' : 'p-4';
                  
                  return (
                    <Card
                      key={thread.id}
                      className={`${cardHeight} mr-3 cursor-pointer transition-all duration-200 hover:bg-muted/50 relative ${
                        isActive 
                          ? 'bg-domain-messages-tint border-l-4 border-l-domain-messages-accent shadow-md' 
                          : 'hover:shadow-sm'
                      } ${isPinned ? 'ring-1 ring-domain-messages-accent/30' : ''}`}
                      onClick={() => {
                        setSelectedThreadId(thread.id);
                        setSelectedRecipientId(null);
                        if (thread.unread_count > 0) {
                          handleConversationOpened(thread.id);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <GroupAvatarStack 
                          participants={thread.participants || []}
                          size={densityMode === 'compact' ? 'sm' : 'md'}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <h3 className={`font-medium truncate ${densityMode === 'compact' ? 'text-sm' : 'text-base'}`}>
                                  {thread.name || 'Unnamed Group'}
                                </h3>
                                {isPinned && (
                                  <div className="w-2 h-2 bg-domain-messages-accent rounded-full flex-shrink-0"></div>
                                )}
                              </div>
                              
                              {thread.last_message && (
                                <p className={`text-muted-foreground truncate ${
                                  densityMode === 'compact' ? 'text-xs mt-0.5' : 'text-sm mt-1'
                                }`}>
                                  {thread.last_message.sender_id !== user?.id && thread.last_message.sender_id && (
                                    <span className="font-medium">
                                      {thread.participants?.find(p => p.user_id === thread.last_message.sender_id)?.display_name || 'Someone'}
                                      :{' '}
                                    </span>
                                  )}
                                  {thread.last_message.body}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <div className="flex items-center">
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    {thread.participants?.length || 0} members
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 pl-1.5 ml-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {thread.updated_at && new Date(thread.updated_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              
                              {thread.unread_count > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="bg-domain-messages-accent text-white animate-in fade-in duration-200 text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                                >
                                  {thread.unread_count > 99 ? '99+' : thread.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>

        <TabsContent value="direct" className="mt-0">
          <div className={`${densityMode === 'compact' ? 'space-y-1' : 'space-y-2'}`}>
            {filteredThreads.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquareText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Direct Messages</h3>
                <p className="text-muted-foreground mb-4">Start a conversation with someone</p>
                <Button onClick={() => setShowNewConversation(true)}>
                  <MessageSquareText className="w-4 h-4 mr-2" />
                  New Message
                </Button>
              </div>
            ) : (
              [...filteredThreads]
                .sort((a, b) => {
                  const ap = pinnedThreads.has(a.id) ? 1 : 0;
                  const bp = pinnedThreads.has(b.id) ? 1 : 0;
                  if (ap !== bp) return bp - ap;
                  const ad = new Date(a.updated_at).getTime();
                  const bd = new Date(b.updated_at).getTime();
                  return bd - ad;
                })
                .reduce((acc, thread) => {
                  const counterpart = thread.participants?.find(p => p.user_id !== user?.id);
                  const key = counterpart?.user_id || 'unknown';
                  const existing = acc.find(t => t._dedupeKey === key);
                  if (!existing || new Date(thread.updated_at) > new Date(existing.updated_at)) {
                    const filtered = acc.filter(t => t._dedupeKey !== key);
                    filtered.push({ ...thread, _dedupeKey: key });
                    return filtered;
                  }
                  return acc;
                }, [] as (typeof displayThreads[0] & { _dedupeKey: string })[])
                .map((thread) => {
                  const isPinned = pinnedThreads.has(thread.id);
                  const isActive = selectedThreadId === thread.id;
                  const cardHeight = densityMode === 'compact' ? 'p-3' : 'p-4';
                  
                  return (
                    <Card
                      key={thread.id}
                      className={`${cardHeight} mr-3 cursor-pointer transition-all duration-200 hover:bg-muted/50 relative ${
                        isActive 
                          ? 'bg-domain-messages-tint border-l-4 border-l-domain-messages-accent shadow-md' 
                          : 'hover:shadow-sm'
                      } ${isPinned ? 'ring-1 ring-domain-messages-accent/30' : ''}`}
                      onClick={() => {
                        setSelectedThreadId(thread.id);
                        setSelectedRecipientId(null);
                        if (thread.unread_count > 0) {
                          handleConversationOpened(thread.id);
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="relative">
                          <Avatar className={densityMode === 'compact' ? 'w-8 h-8' : 'w-10 h-10'}>
                            <AvatarImage src={getConversationDisplayAvatar(thread, user?.id)} />
                            <AvatarFallback>
                              {getConversationDisplayTitle(thread, user?.id)?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <PresenceIndicator 
                              userId={getOtherParticipant(thread, user?.id)?.user_id || ''} 
                              context={context}
                              size="sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-medium truncate ${densityMode === 'compact' ? 'text-sm' : 'text-base'}`}>
                                {getConversationDisplayTitle(thread, user?.id)}
                              </h3>
                              
                              {thread.last_message && (
                                <p className={`text-muted-foreground truncate ${
                                  densityMode === 'compact' ? 'text-xs mt-0.5' : 'text-sm mt-1'
                                }`}>
                                  {thread.last_message.body}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-1 pl-1.5 ml-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {thread.updated_at && new Date(thread.updated_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                              
                              {thread.unread_count > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="bg-domain-messages-accent text-white animate-in fade-in duration-200 text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center"
                                >
                                  {thread.unread_count > 99 ? '99+' : thread.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
            )}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-0">
          <ContactsTabContent 
            onStartConversation={(userId) => {
              // Create or navigate to DM with this user
              setSelectedRecipientId(userId);
              setShowNewConversation(true);
            }}
            messageContext={messageContext}
          />
        </TabsContent>
      </Tabs>
    );
  };

  const renderConversationContent = () => {
    // Mobile layout - stack conversations and chat
    if (isMobile) {
      return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {!selectedThreadId ? (
            // Show conversation list on mobile
            <div className="h-full min-h-0 flex flex-col bg-card/50 backdrop-blur-sm">
              <ScrollArea className="h-full flex-1 min-h-0">
                <div className="p-4 pr-12">
                  {renderConversationList(displayThreads)}
                </div>
              </ScrollArea>
            </div>
          ) : (
            // Show chat view on mobile
            <div className="h-full bg-background/95 backdrop-blur-sm min-w-0 flex flex-col min-h-0 overflow-hidden">
              <ConversationErrorBoundary>
                <ConversationView 
                  threadId={selectedThreadId}
                  recipientId={selectedRecipientId}
                  context={messageContext}
                  className="flex-1 min-h-0 min-w-0"
                  onBack={() => setSelectedThreadId(null)}
                  onThreadRead={handleThreadRead}
                  onConversationOpened={handleConversationOpened}
                  onMessageSent={handleMessageSent}
                />
              </ConversationErrorBoundary>
            </div>
          )}
        </div>
      );
    }

    // Desktop layout - resizable panels
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
          {/* Conversation List Panel */}
          <ResizablePanel 
            defaultSize={getConversationPanelSize()} 
            minSize={27} 
            maxSize={50}
            className="transition-all duration-300 min-w-0 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="h-full min-h-0 flex flex-col border-r bg-card/50 backdrop-blur-sm">
              <ScrollArea className="h-full min-h-0">
                <div className="p-4 pr-12">
                  {renderConversationList(displayThreads)}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="mx-4" />

          {/* Chat Area Panel */}
          <ResizablePanel 
            defaultSize={getChatPanelSize()}
            minSize={50}
            className="transition-all duration-300 min-w-0 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="h-full bg-background/95 backdrop-blur-sm min-w-0 flex flex-col min-h-0 overflow-hidden">
              {selectedThreadId || selectedRecipientId ? (
                <ConversationErrorBoundary>
                  <ConversationView 
                    threadId={selectedThreadId}
                    recipientId={selectedRecipientId}
                    context={messageContext}
                    className="flex-1 min-h-0 min-w-0"
                    onThreadRead={handleThreadRead}
                    onConversationOpened={handleConversationOpened}
                    onMessageSent={handleMessageSent}
                  />
                </ConversationErrorBoundary>
              ) : (
                <div className="h-full flex items-center justify-center px-4 py-4">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground">
                      Choose a conversation from the left to start messaging
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  };

  const renderMobileConversationList = () => {
    const filteredThreads = getFilteredThreads(displayThreads, conversationFilter);

    // Apply search filter
    const searchFiltered = inboxSearchQuery.trim()
      ? filteredThreads.filter(thread => {
          const name = getConversationDisplayTitle(thread, user?.id) || '';
          const lastMsg = (thread as any).last_message?.body || '';
          const q = inboxSearchQuery.toLowerCase();
          return name.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
        })
      : filteredThreads;
    
    if (searchFiltered.length === 0 && inboxSearchQuery.trim()) {
      return (
        <div className="text-center py-12">
          <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No conversations matching "{inboxSearchQuery}"</p>
        </div>
      );
    }

    if (searchFiltered.length === 0) {
      return (
        <MobileInboxEmptyState 
          context={messageContext}
          onNewMessage={() => setShowNewConversation(true)}
          onCreateGroup={() => setShowCreateGroup(true)}
        />
      );
    }

    // Sort and dedupe threads
    const sortedThreads = [...filteredThreads]
      .sort((a, b) => {
        const ap = pinnedThreads.has(a.id) ? 1 : 0;
        const bp = pinnedThreads.has(b.id) ? 1 : 0;
        if (ap !== bp) return bp - ap;
        const ad = new Date(a.updated_at).getTime();
        const bd = new Date(b.updated_at).getTime();
        return bd - ad;
      })
      .reduce((acc, thread) => {
        if (thread.type === 'direct') {
          const counterpart = thread.participants?.find(p => p.user_id !== user?.id);
          const key = counterpart?.user_id || 'unknown';
          const existing = acc.find(t => t._dedupeKey === key);
          if (!existing || new Date(thread.updated_at) > new Date(existing.updated_at)) {
            const filtered = acc.filter(t => t._dedupeKey !== key);
            filtered.push({ ...thread, _dedupeKey: key });
            return filtered;
          }
          return acc;
        } else {
          acc.push({ ...thread, _dedupeKey: thread.id });
          return acc;
        }
      }, [] as (typeof displayThreads[0] & { _dedupeKey: string })[]);

    return (
      <div className="space-y-2">
        {sortedThreads.map((thread) => (
          <MobileConversationCard
            key={thread.id}
            id={thread.id}
            name={getConversationDisplayTitle(thread, user?.id) || 'Unknown'}
            avatarUrl={getConversationDisplayAvatar(thread, user?.id) || undefined}
            lastMessage={thread.last_message?.body}
            timestamp={thread.updated_at}
            unreadCount={thread.unread_count || 0}
            isActive={selectedThreadId === thread.id}
            isPinned={pinnedThreads.has(thread.id)}
            isGroup={thread.type === 'group'}
            participantUserId={getOtherParticipant(thread, user?.id)?.user_id}
            context={messageContext}
            onClick={() => {
              setSelectedThreadId(thread.id);
              setSelectedRecipientId(null);
              if ((thread.unread_count || 0) > 0) {
                handleConversationOpened(thread.id);
              }
            }}
          />
        ))}
      </div>
    );
  };


  // Mobile Layout - matches Events/Wallet/BusinessHub pattern
  if (isMobile) {
    return (
      <CallProvider userId={user?.id || ''} userName={user?.email || 'User'}>
        <AppLayout>
          <SEO title="Inbox" description="Your conversations, updates, and notifications" canonical={window.location.href} />
          
          <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background">
            {/* When viewing a conversation, show full-screen chat */}
            {selectedThreadId ? (
              <div className="fixed inset-0 z-[55] flex min-h-0 flex-col overflow-hidden bg-background">
                <ConversationErrorBoundary>
                  <ConversationView 
                    threadId={selectedThreadId}
                    recipientId={selectedRecipientId}
                    context={messageContext}
                    className="flex-1 min-h-0 min-w-0"
                    onBack={() => setSelectedThreadId(null)}
                    onThreadRead={handleThreadRead}
                    onConversationOpened={handleConversationOpened}
                    onMessageSent={handleMessageSent}
                  />
                </ConversationErrorBoundary>
              </div>
            ) : (
              /* Inbox list view */
              <div className="p-4 pb-32 space-y-4">
                {/* StandardHeader - same pattern as Events/Wallet */}
                <StandardHeader
                  title={translate('inbox.title')}
                  description={translate('inbox.description')}
                />
                
                {/* Action Rail - same pattern */}
                <UtilityActionButton 
                  className="min-w-0"
                  afterGiftVoucherChildren={
                    <>
                      {/* Vitana Index - pill style */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate('/health')}
                        className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
                      >
                        <span className="text-xs opacity-60">🧬</span>
                        <span className="text-sm font-medium text-primary">742</span>
                      </Button>
                      
                      {/* Autopilot - pill style with label */}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setAutopilotOpen(true)}
                        className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 relative shrink-0"
                      >
                        <Plane className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{translate('actionBar.autopilot', 'Autopilot')}</span>
                        {pendingCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full p-0 flex items-center justify-center text-[10px] animate-pulse"
                          >
                            {pendingCount}
                          </Badge>
                        )}
                      </Button>
                    </>
                  }
                >
                  <div className="flex items-center gap-2 min-w-max">
                    <ExpandableSearchButton 
                      placeholder={translate('inbox.searchPlaceholder')}
                      onSearch={(query) => setInboxSearchQuery(query)}
                      onClear={() => setInboxSearchQuery("")}
                      dropdownItems={searchDropdownItems}
                      onItemClick={handleSearchItemClick}
                    />
                    <UniversalCalendarButton />
                    
                    {/* New Message button - primary action */}
                    <Button 
                      onClick={() => setShowNewConversation(true)}
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">{translate('inbox.actions.new')}</span>
                    </Button>
                  </div>
                </UtilityActionButton>
                
                {/* Mobile Tabs - consolidated SplitBar */}
                <SplitBar 
                  value={messageContext} 
                  onValueChange={(value: string) => setMessageContext(value as 'global' | 'tenant')} 
                  className="w-full"
                >
                  <SplitBarList>
                    <SplitBarTrigger value="global">{translate('inbox.contextTabs.community')}</SplitBarTrigger>
                    <SplitBarTrigger value="tenant">{translate('inbox.contextTabs.network')}</SplitBarTrigger>
                  </SplitBarList>
                  
                  <SplitBarContent value="global" className="pt-3">
                    {/* Sub-filter tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      {['all', 'direct', 'groups'].map((filter) => (
                        <Button
                          key={filter}
                          variant={conversationFilter === filter ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setConversationFilter(filter as any)}
                          className={`h-8 px-3 rounded-full shrink-0 text-sm ${
                            conversationFilter === filter 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted/60'
                          }`}
                        >
                          {translate(`inbox.tabs.${filter}`)}
                        </Button>
                      ))}
                    </div>
                    {renderMobileConversationList()}
                  </SplitBarContent>
                  
                  <SplitBarContent value="tenant" className="pt-3">
                    {/* Sub-filter tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      {['all', 'direct', 'groups'].map((filter) => (
                        <Button
                          key={filter}
                          variant={conversationFilter === filter ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setConversationFilter(filter as any)}
                          className={`h-8 px-3 rounded-full shrink-0 text-sm ${
                            conversationFilter === filter 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted/60'
                          }`}
                        >
                          {translate(`inbox.tabs.${filter}`)}
                        </Button>
                      ))}
                    </div>
                    {renderMobileConversationList()}
                  </SplitBarContent>
                </SplitBar>
              </div>
            )}
          </div>

          {/* Popups */}
          <NewConversationPopup
            open={showNewConversation}
            onOpenChange={setShowNewConversation}
            onConversationCreated={handleConversationCreated}
            onGroupCreated={handleGroupCreated}
            context={messageContext}
          />
          
          <CreateGroupPopup
            open={showCreateGroup}
            onOpenChange={setShowCreateGroup}
            onGroupCreated={handleGroupCreated}
            context={messageContext}
          />
          
          <AutopilotPopup 
            open={autopilotOpen} 
            onOpenChange={setAutopilotOpen} 
          />

          {user?.id && (
            <CallManager userId={user.id} userName={user.email || 'User'} />
          )}
        </AppLayout>
      </CallProvider>
    );
  }

  // Desktop Layout (unchanged)
  return (
    <CallProvider userId={user?.id || ''} userName={user?.email || 'User'}>
      <AppLayout>
        <SEO title="Messages" description="Your messages and conversations" canonical={window.location.href} />
        <SubNavigation items={messagesNavigation} />
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
            <StandardHeader 
              title="Messages"
              description="Connect with your community and professional network"
            />

          {/* Utility Action Button */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search conversations, people, or groups…"
              onSearch={(query) => setInboxSearchQuery(query)}
              onClear={() => setInboxSearchQuery("")}
              dropdownItems={searchDropdownItems}
              onItemClick={handleSearchItemClick}
            />
            <UniversalCalendarButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowNewConversation(true)}>
                  <MessageSquareText className="w-4 h-4 mr-2" />
                  New Message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCreateGroup(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Create Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </UtilityActionButton>

          {/* Split Navigation */}
          <SplitBar value={messageContext} onValueChange={(value: string) => setMessageContext(value as 'global' | 'tenant')} className="flex-1">
            <SplitBarList>
            <SplitBarTrigger value="global">
              🌍 Global Community
            </SplitBarTrigger>
            <SplitBarTrigger value="tenant">
              🏢 Professional Network
            </SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="global">
              {renderConversationContent()}
            </SplitBarContent>

            <SplitBarContent value="tenant">
              {renderConversationContent()}
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <NewConversationPopup
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onConversationCreated={handleConversationCreated}
        onGroupCreated={handleGroupCreated}
        context={messageContext}
      />
      
      <CreateGroupPopup
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onGroupCreated={handleGroupCreated}
        context={messageContext}
      />
      
        {user?.id && (
          <CallManager userId={user.id} userName={user.email || 'User'} />
        )}
      </AppLayout>
    </CallProvider>
  );
}
