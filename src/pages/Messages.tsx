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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Users, MessageSquareText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationView from "@/components/messages/ConversationView";
import { ConversationErrorBoundary } from "@/components/messages/ConversationErrorBoundary";
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useRole } from "@/hooks/useRole";
import { useUnreadSync } from "@/hooks/useUnreadSync";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Globe, Building } from "lucide-react";
import NewConversationPopup from "@/components/NewConversationPopup";
import ConversationListSkeleton from "@/components/messages/ConversationListSkeleton";
import EmptyStateIllustration from "@/components/messages/EmptyStateIllustration";
import ErrorMessage from "@/components/messages/ErrorMessage";
import CreateGroupPopup from "@/components/messages/CreateGroupPopup";
import TypingIndicator from '@/components/messages/TypingIndicator';
import PresenceIndicator from '@/components/messages/PresenceIndicator';
import { getConversationDisplayAvatar, getConversationDisplayTitle, getOtherParticipant } from '@/utils/conversationHelpers';

export default function Messages() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const isMobile = useIsMobile();
  const [messageContext, setMessageContext] = useState<'global' | 'tenant'>('global');
  const { threads, isLoading, context, ...hybridMessages } = useHybridMessages(messageContext);
  const globalMessages = useHybridMessages('global');
  const tenantMessages = useHybridMessages('tenant');
  const isGlobalContext = context === 'global';
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [localThreads, setLocalThreads] = useState(threads);
  const [densityMode, setDensityMode] = useState<'comfortable' | 'compact'>('comfortable');
  const [pinnedThreads, setPinnedThreads] = useState<Set<string>>(new Set());

  // Remove auto-selection - let user choose conversation manually

  // Reset selection when context changes
  useEffect(() => {
    setSelectedThreadId(null);
    setSelectedRecipientId(null);
  }, [messageContext]);

  // Handle real-time unread sync across tabs/devices
  const handleThreadRead = useCallback((threadId: string, context: 'global' | 'tenant') => {
    console.log('📖 Messages.tsx: handleThreadRead called', { threadId, context, messageContext });
    if (context === messageContext) {
      setLocalThreads(prev => {
        const updated = prev.map(thread => 
          thread.id === threadId 
            ? { ...thread, unread_count: 0 }
            : thread
        );
        console.log('📖 Messages.tsx: Local threads updated for read', { threadId, updated: updated.find(t => t.id === threadId) });
        return updated;
      });
    }
  }, [messageContext]);

  // Immediate optimistic unread update when conversation is opened
  const handleConversationOpened = useCallback((threadId: string) => {
    console.log('🚀 Messages.tsx: Conversation opened immediately', { threadId, messageContext });
    setLocalThreads(prev => {
      const updated = prev.map(thread => 
        thread.id === threadId 
          ? { ...thread, unread_count: 0 }
          : thread
      );
      const updatedThread = updated.find(t => t.id === threadId);
      console.log('🚀 Messages.tsx: Immediate unread count update', { 
        threadId, 
        before: prev.find(t => t.id === threadId)?.unread_count,
        after: updatedThread?.unread_count 
      });
      return updated;
    });
  }, [messageContext]);

  // Move the just-sent conversation to the top instantly (independent of hook instance)
  const handleMessageSent = useCallback((threadId: string, newMessage: any, ctx: 'global' | 'tenant') => {
    if (ctx !== messageContext) return;
    setLocalThreads(prev => {
      const existing = prev.find(t => t.id === threadId);
      if (!existing) return prev;
      const updatedThread = {
        ...existing,
        updated_at: newMessage?.created_at || new Date().toISOString(),
        last_message: newMessage ? { ...newMessage } : existing.last_message,
      } as any;
      const others = prev.filter(t => t.id !== threadId);
      return [updatedThread, ...others];
    });
  }, [messageContext]);

  const handleUnreadChange = useCallback((threadId: string, context: 'global' | 'tenant') => {
    if (context === messageContext) {
      // Use the fetchThreads function from the appropriate hook
      setTimeout(() => {
        if (isGlobalContext) {
          globalMessages.fetchThreads();
        } else {
          tenantMessages.fetchThreads();
        }
      }, 100); // Small delay to ensure DB is updated
    }
  }, [messageContext, isGlobalContext, globalMessages, tenantMessages]);

  // Initialize unread sync
  useUnreadSync(handleThreadRead, handleUnreadChange);

  // Keep local threads in sync with fetched threads
  useEffect(() => {
    setLocalThreads(threads);
  }, [threads]);

  const handleConversationCreated = (threadId: string, recipientId: string) => {
    setSelectedThreadId(threadId);
    // Keep recipientId until participants are loaded so header shows the name
    setSelectedRecipientId(recipientId);
  };

  const handleGroupCreated = (threadId: string) => {
    setSelectedThreadId(threadId);
    setSelectedRecipientId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-x-hidden">
        <SEO title="Messages" description="Your messages and conversations" canonical={window.location.href} />
        <AppLayout>
          <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
              <SubNavigation items={messagesNavigation} />
              <StandardHeader 
                title="Messages"
                description="Loading your conversations..."
              />
              <div className="flex-1 flex">
                <div className="w-80 border-r">
                  <ConversationListSkeleton />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading messages...</p>
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
    return 48; // 48% on desktop - ensures full card content incl. timestamps
  };

  const getChatPanelSize = () => {
    if (isMobile) return 0; // Hidden on mobile when conversation list is shown
    return 52; // 52% on desktop - chat remains slightly wider
  };

  const renderConversationList = (threads: typeof localThreads) => (
    <div className={`${densityMode === 'compact' ? 'space-y-1' : 'space-y-2'}`}>
      {threads.length === 0 ? (
        <EmptyStateIllustration 
          type="inbox"
          context={messageContext}
          threads={threads}
          onAction={() => setShowNewConversation(true)}
          onCreateGroup={() => setShowCreateGroup(true)}
        />
      ) : (
        // De-duplicate direct threads by counterpart, keep most recent
        [...threads]
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
              // Find the other participant (not current user)
              const counterpart = thread.participants?.find(p => p.user_id !== user?.id);
              const key = counterpart?.user_id || 'unknown';
              
              // Keep the thread with the most recent updated_at
              const existing = acc.find(t => t._dedupeKey === key);
              if (!existing || new Date(thread.updated_at) > new Date(existing.updated_at)) {
                // Remove existing if found, add new one
                const filtered = acc.filter(t => t._dedupeKey !== key);
                filtered.push({ ...thread, _dedupeKey: key });
                return filtered;
              }
              return acc;
            } else {
              // Keep group threads as-is
              acc.push({ ...thread, _dedupeKey: thread.id });
              return acc;
            }
          }, [] as (typeof localThreads[0] & { _dedupeKey: string })[])
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
                  // On mobile, this will switch to chat view
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
                    {/* Dynamic presence indicator */}
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
                            {thread.name || 
                             thread.participants?.find(p => p.user_id !== user?.id)?.display_name ||
                             'Unknown'}
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
                        <span className={`text-muted-foreground ${
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
  );

  const renderConversationContent = () => {
    // Mobile layout - stack conversations and chat
    if (isMobile) {
      return (
        <div className="h-[calc(100vh-200px)] flex flex-col min-h-0 overflow-hidden">
          {!selectedThreadId ? (
            // Show conversation list on mobile
            <div className="h-full bg-card/50 backdrop-blur-sm">
              <SplitBar value={messageContext} onValueChange={(value) => setMessageContext(value as 'global' | 'tenant')} className="h-full">
                <div className="border-b p-2">
                  <SplitBarList className="grid w-full grid-cols-2">
                    <SplitBarTrigger value="global">Global</SplitBarTrigger>
                    <SplitBarTrigger value="tenant">Community</SplitBarTrigger>
                  </SplitBarList>
                </div>
                
                <ScrollArea className="flex-1">
                  <SplitBarContent value="global" className="p-0 m-0">
                    <div className="p-4 pr-12">
                      {renderConversationList(localThreads)}
                    </div>
                  </SplitBarContent>
                  
                  <SplitBarContent value="tenant" className="p-0 m-0">
                    <div className="p-4 pr-12">
                      {renderConversationList(localThreads)}
                    </div>
                  </SplitBarContent>
                </ScrollArea>
              </SplitBar>
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
      <div className="h-[calc(100vh-200px)] flex flex-col min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Conversation List Panel */}
          <ResizablePanel 
            defaultSize={getConversationPanelSize()} 
            minSize={25} 
            maxSize={50}
            className="transition-all duration-300 min-w-0 flex flex-col overflow-hidden"
          >
            <div className="h-full border-r bg-card/50 backdrop-blur-sm">
              <SplitBar value={messageContext} onValueChange={(value) => setMessageContext(value as 'global' | 'tenant')} className="h-full">
                <div className="border-b p-2">
                  <SplitBarList className="grid w-full grid-cols-2">
                    <SplitBarTrigger value="global">Global</SplitBarTrigger>
                    <SplitBarTrigger value="tenant">Community</SplitBarTrigger>
                  </SplitBarList>
                </div>
                
                <ScrollArea className="flex-1">
                  <SplitBarContent value="global" className="p-0 m-0">
                    <div className="p-4 pr-12">
                      {renderConversationList(localThreads)}
                    </div>
                  </SplitBarContent>
                  
                  <SplitBarContent value="tenant" className="p-0 m-0">
                    <div className="p-4 pr-12">
                      {renderConversationList(localThreads)}
                    </div>
                  </SplitBarContent>
                </ScrollArea>
              </SplitBar>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="mx-4" />

          {/* Chat Area Panel */}
          <ResizablePanel 
            defaultSize={getChatPanelSize()}
            minSize={50}
            className="transition-all duration-300"
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

  return (
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
              onSearch={(query) => console.log('Search:', query)}
            />
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
              <SplitBarTrigger value="global" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Global Community
              </SplitBarTrigger>
              <SplitBarTrigger value="tenant" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Professional Network
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
    </AppLayout>
  );
}
