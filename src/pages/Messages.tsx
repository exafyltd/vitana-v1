import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { messagesNavigation } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SplitBar, SplitBarContent } from "@/components/ui/split-bar";
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
import { MessageSquare, Users, Globe, Building } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import NewConversationPopup from "@/components/NewConversationPopup";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConversationListSkeleton from "@/components/messages/ConversationListSkeleton";
import EmptyStateIllustration from "@/components/messages/EmptyStateIllustration";
import ErrorMessage from "@/components/messages/ErrorMessage";
import CreateGroupPopup from "@/components/messages/CreateGroupPopup";

export default function Messages() {
  const { user } = useAuth();
  const { currentRole } = useRole();
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

  useEffect(() => {
    if (threads.length > 0 && !selectedThreadId && !selectedRecipientId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId, selectedRecipientId]);

  // Reset selection when context changes
  useEffect(() => {
    setSelectedThreadId(null);
    setSelectedRecipientId(null);
  }, [messageContext]);

  // Handle real-time unread sync across tabs/devices
  const handleThreadRead = useCallback((threadId: string, context: 'global' | 'tenant') => {
    if (context === messageContext) {
      setLocalThreads(prev => prev.map(thread => 
        thread.id === threadId 
          ? { ...thread, unread_count: 0 }
          : thread
      ));
    }
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
      <AppLayout>
        <SEO title="Messages" description="Your messages and conversations" canonical={window.location.href} />
        <SubNavigation items={messagesNavigation} />
        <PageHeader 
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
      </AppLayout>
    );
  }

  const contextInfo = context === 'global' 
    ? { icon: Globe, label: 'Global Community', description: "Connect with community members across all platforms" }
    : { icon: Building, label: 'Professional Network', description: "Secure messaging within your organization" };

  return (
    <AppLayout>
      <SEO title="Messages" description="Your messages and conversations" canonical={window.location.href} />
      <SubNavigation items={messagesNavigation} />
      
      <PageHeader 
        title="Messages"
        description={contextInfo.description}
      />
      
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center space-x-4">
          <Tabs value={messageContext} onValueChange={(value: string) => setMessageContext(value as 'global' | 'tenant')}>
            <TabsList>
              <TabsTrigger value="global" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Global Community
              </TabsTrigger>
              <TabsTrigger value="tenant" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Professional Network
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            New Group
          </Button>
          <Button onClick={() => setShowNewConversation(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      <div className="flex-1 flex pb-24">  
        <div className="w-80 border-r">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {localThreads.length === 0 ? (
                <EmptyStateIllustration 
                  type="inbox"
                  context={messageContext}
                  onAction={() => setShowNewConversation(true)}
                />
              ) : (
                localThreads.map((thread) => (
                  <Card
                    key={thread.id}
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedThreadId === thread.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      setSelectedRecipientId(null);
                      requestAnimationFrame(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      });
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={thread.participants?.[0]?.avatar_url} />
                        <AvatarFallback>
                          {thread.participants?.[0]?.display_name?.[0] || 
                           thread.participants?.[0]?.full_name?.[0] || 
                           thread.name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">
                            {thread.name || 
                             thread.participants?.find(p => p.user_id !== user?.id)?.display_name ||
                             thread.participants?.find(p => p.user_id !== user?.id)?.full_name ||
                             'Unknown'}
                          </h3>
                           {thread.unread_count > 0 && (
                             <Badge 
                               variant="secondary" 
                               className="ml-2 bg-primary text-primary-foreground animate-in fade-in duration-200"
                             >
                               {thread.unread_count > 99 ? '99+' : thread.unread_count}
                             </Badge>
                           )}
                        </div>
                        {thread.last_message && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {thread.last_message.body}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Users className="w-3 h-3 mr-1" />
                            {thread.participants?.length || 0} participants
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {thread.updated_at && new Date(thread.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        
        <div className="flex-1">
          {selectedThreadId || selectedRecipientId ? (
            <ConversationErrorBoundary>
              <ConversationView 
                threadId={selectedThreadId}
                recipientId={selectedRecipientId}
                context={messageContext}
                className="h-full"
              />
            </ConversationErrorBoundary>
          ) : (
            <div className="flex items-center justify-center h-full">
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
      </div>

      <NewConversationPopup
        open={showNewConversation}
        onOpenChange={setShowNewConversation}
        onConversationCreated={handleConversationCreated}
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