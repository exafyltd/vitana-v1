import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { messagesNavigation } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SplitBar, SplitBarContent } from "@/components/ui/split-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationView from "@/components/messages/ConversationView";
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useRole } from "@/hooks/useRole";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, Globe, Building } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import NewConversationPopup from "@/components/NewConversationPopup";

export default function Messages() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { threads, isLoading, context } = useHybridMessages();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);

  useEffect(() => {
    if (threads.length > 0 && !selectedThreadId && !selectedRecipientId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId, selectedRecipientId]);

  const handleConversationCreated = (threadId: string, recipientId: string) => {
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
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading messages...</p>
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
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <contextInfo.icon className="w-4 h-4" />
            <span>{contextInfo.label}</span>
          </div>
        </div>
        <Button onClick={() => setShowNewConversation(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      <div className="flex-1 flex">  
        <div className="w-80 border-r">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {threads.length === 0 ? (
                <Card className="p-6 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No conversations yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start a new conversation to connect with others in your {context === 'global' ? 'global community' : 'professional network'}
                  </p>
                  <Button onClick={() => setShowNewConversation(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Start Conversation
                  </Button>
                </Card>
              ) : (
                threads.map((thread) => (
                  <Card
                    key={thread.id}
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedThreadId === thread.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      setSelectedRecipientId(null);
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
                            <Badge variant="secondary" className="ml-2">
                              {thread.unread_count}
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
            <ConversationView 
              threadId={selectedThreadId}
              recipientId={selectedRecipientId}
            />
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
      />
    </AppLayout>
  );
}