import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Phone, Video, Send } from "lucide-react";
import { useHybridMessages } from "@/hooks/useHybridMessages";
import { useAuth } from "@/context/AuthProvider";
import { useState, useEffect, useMemo } from "react";
import { getConversationDisplayTitle, getConversationDisplayAvatar, getOtherParticipant } from "@/utils/conversationHelpers";
import ConversationView from "@/components/messages/ConversationView";
import { ConversationErrorBoundary } from "@/components/messages/ConversationErrorBoundary";
import ConversationListSkeleton from "@/components/messages/ConversationListSkeleton";
import { useLocation } from "react-router-dom";

const messagesSubItems = [
  { id: "overview", name: "Overview", path: "/inbox" },
  { id: "direct", name: "Direct Messages", path: "/inbox/direct" },
  { id: "group", name: "Group Chats", path: "/inbox/group" },
  { id: "notifications", name: "Notifications", path: "/inbox/notifications" },
  { id: "archived", name: "Archived", path: "/inbox/archived" },
];

export default function Direct() {
  const { user } = useAuth();
  const location = useLocation();
  const hybridMessages = useHybridMessages();
  const { threads, isLoading, context } = hybridMessages;
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  // Filter for direct message conversations only
  const directThreads = useMemo(() => {
    return threads.filter(thread => thread.type === 'direct');
  }, [threads]);

  // Handle incoming navigation state from profile cards
  useEffect(() => {
    const state = location.state as { selectedThreadId?: string } | null;
    if (state?.selectedThreadId) {
      setSelectedThreadId(state.selectedThreadId);
      setSelectedRecipientId(null);
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-select the first (latest) conversation when threads load
  useEffect(() => {
    if (!isLoading && directThreads.length > 0 && !selectedThreadId) {
      const latestThread = directThreads[0];
      setSelectedThreadId(latestThread.id);
      setSelectedRecipientId(null);
    }
  }, [directThreads, isLoading, selectedThreadId]);

  // Show loading state
  if (isLoading) {
    return (
      <AppLayout>
        <SEO title="Direct Messages | Messages" description="Private conversations with community members" canonical={window.location.href} />
        <SubNavigation items={messagesSubItems} />
        
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <StandardHeader 
              title="Have meaningful conversations!"
              description="Connect directly with community members, experts, and coaches for personalized wellness support."
              emoji="💬"
            />
            <div className="flex h-[calc(100vh-280px)]" style={{ gap: '24px' }}>
              <Card className="w-80 flex flex-col">
                <CardHeader className="border-b">
                  <h2 className="font-semibold mb-3">Direct Messages</h2>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                  <ConversationListSkeleton />
                </CardContent>
              </Card>
              <Card className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading conversations...</p>
                  </div>
                </div>
              </Card>
              <Card className="w-80">
                <CardContent className="p-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title="Direct Messages | Messages" description="Private conversations with community members" canonical={window.location.href} />
      <SubNavigation items={messagesSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title="Have meaningful conversations!"
            description="Connect directly with community members, experts, and coaches for personalized wellness support."
            emoji="💬"
          />
          <div className="flex h-[calc(100vh-280px)]" style={{ gap: '24px' }}>
          {/* Left Sidebar - Direct Message Contacts */}
          <Card className="w-80 flex flex-col">
            <CardHeader className="border-b">
              <h2 className="font-semibold mb-3">Direct Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search contacts..." className="pl-10" />
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-0">
              {directThreads.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-muted-foreground">No direct conversations yet</p>
                </div>
              ) : (
                directThreads.map((thread) => {
                  const otherParticipant = getOtherParticipant(thread, user?.id);
                  const isActive = selectedThreadId === thread.id;
                  const displayName = getConversationDisplayTitle(thread, user?.id);
                  const avatarUrl = getConversationDisplayAvatar(thread, user?.id);
                  
                  return (
                    <div 
                      key={thread.id} 
                      className={`p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                        isActive ? 'bg-muted/50 border-l-4 border-l-primary' : ''
                      }`}
                      onClick={() => {
                        setSelectedThreadId(thread.id);
                        setSelectedRecipientId(null);
                      }}
                      onMouseEnter={() => {
                        // Prefetch messages on hover for instant switching
                        hybridMessages.prefetchThreadMessages?.(thread.id);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={avatarUrl || undefined} />
                            <AvatarFallback>{displayName.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 border-2 border-background rounded-full bg-gray-400"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{displayName}</p>
                            <span className="text-xs text-muted-foreground">
                              {thread.updated_at && new Date(thread.updated_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Community Member</p>
                          {thread.last_message && (
                            <p className="text-sm text-muted-foreground truncate">{thread.last_message.body}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Center - Chat Interface */}
          <Card className="flex-1 flex flex-col">
            {selectedThreadId ? (
              <ConversationErrorBoundary>
                <ConversationView 
                  threadId={selectedThreadId}
                  recipientId={selectedRecipientId}
                  context={context}
                  className="flex-1 min-h-0 min-w-0"
                />
              </ConversationErrorBoundary>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </Card>

          {/* Right Sidebar - Contact Profile */}
          <Card className="w-80">
            <CardContent className="p-6">
              {selectedThreadId && directThreads.length > 0 ? (() => {
                const selectedThread = directThreads.find(t => t.id === selectedThreadId);
                const otherParticipant = getOtherParticipant(selectedThread, user?.id);
                const displayName = getConversationDisplayTitle(selectedThread, user?.id);
                const avatarUrl = getConversationDisplayAvatar(selectedThread, user?.id);
                
                return (
                  <>
                    <div className="text-center mb-6">
                      <Avatar className="h-20 w-20 mx-auto mb-4">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback className="text-lg">{displayName.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold">{displayName}</h3>
                      <p className="text-sm text-muted-foreground">Community Member</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Connected through the wellness community platform.</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Member Since</span>
                          <span className="text-sm">Community</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Last Active</span>
                          <span className="text-sm">Recently</span>
                        </div>
                        {selectedThread?.participants && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Thread ID</span>
                            <span className="text-sm font-mono text-xs">{selectedThread.id.slice(-8)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })() : (
                <div className="text-center">
                  <p className="text-muted-foreground">Select a conversation to view profile</p>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}