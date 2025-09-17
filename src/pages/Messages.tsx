import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { InboxMasterActionPopup } from "@/components/messages/InboxMasterActionPopup";
import ConversationView from "@/components/messages/ConversationView";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Users, Bell, Archive, Plus, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { useMessages, MessageThread } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { messagesNavigation } from "@/config/navigation";

const unansweredMessages = [
  { 
    id: 1, 
    name: "Dr. Roberts", 
    message: "How are you feeling after the treatment?", 
    time: "2h ago", 
    avatar: "/lovable-uploads/dr-roberts-avatar.jpg",
    quickReplies: ["Much better, thanks!", "Still recovering", "Could be better"]
  },
  { 
    id: 2, 
    name: "Emma Wilson", 
    message: "Are you joining the wellness group session tomorrow?", 
    time: "4h ago", 
    avatar: "/lovable-uploads/emma-wilson-avatar.jpg",
    quickReplies: ["Yes, I'll be there", "Can't make it", "What time?"]
  },
  { 
    id: 3, 
    name: "Wellness Group", 
    message: "Don't forget about your workout goal this week!", 
    time: "1d ago", 
    avatar: "/lovable-uploads/design-team-avatar.jpg",
    quickReplies: ["Thanks for reminder!", "Already done ✓", "Will do today"]
  },
  { 
    id: 4, 
    name: "James Davis", 
    message: "How's your meditation practice going?", 
    time: "2d ago", 
    avatar: "/lovable-uploads/james-davis-avatar.jpg",
    quickReplies: ["Great progress!", "Still learning", "Need tips"]
  }
];

const inspirationTemplates = [
  {
    category: "Morning Motivation",
    templates: [
      { text: "Good morning! Ready to crush your wellness goals today? 💪", icon: "☀️" },
      { text: "New day, new opportunities to prioritize your health! 🌟", icon: "🌅" },
      { text: "Starting the day with gratitude and positive energy! ✨", icon: "🙏" }
    ]
  },
  {
    category: "Goal Support",
    templates: [
      { text: "You've got this! Every small step counts toward your bigger goals 🎯", icon: "🎯" },
      { text: "Believing in your journey and celebrating your progress! 🌈", icon: "📈" },
      { text: "Your commitment to wellness inspires everyone around you! 💫", icon: "⭐" }
    ]
  },
  {
    category: "Health Check-ins",
    templates: [
      { text: "How are you feeling today? Remember, it's okay to have ups and downs 💙", icon: "💙" },
      { text: "Checking in on your wellness journey - you're doing amazing! 🌸", icon: "🌸" },
      { text: "Hope you're taking time for self-care today. You deserve it! 🌿", icon: "🌿" }
    ]
  },
  {
    category: "Celebrations",
    templates: [
      { text: "Celebrating your wellness wins, big and small! 🎉", icon: "🎉" },
      { text: "So proud of your dedication to your health goals! 👏", icon: "👏" },
      { text: "Your progress is inspiring - keep up the fantastic work! 🌟", icon: "🌟" }
    ]
  }
];

const stats = {
  unreadDirect: 12,
  unreadGroups: 8,
  unreadNotifications: 24,
  activeConversations: 7,
  averageResponseTime: "2.5h",
  dailyMessages: 43
};

export default withScreenId(function Messages() {
  const [activeOverviewTab, setActiveOverviewTab] = useState("direct");
  const [inboxActionOpen, setInboxActionOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { threads, loading } = useMessages();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  const ThreadItem = ({ thread }: { thread: MessageThread }) => {
    const otherParticipant = thread.participants?.find(p => p.user_id !== currentUser?.id);
    const displayName = thread.name || 
      otherParticipant?.profile?.display_name || 
      otherParticipant?.profile?.full_name || 
      'Unknown User';

    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
          "hover:bg-muted/50",
          selectedThread?.id === thread.id && "bg-muted"
        )}
        onClick={() => setSelectedThread(thread)}
      >
        <Avatar className="flex-shrink-0">
          <AvatarImage src={otherParticipant?.profile?.avatar_url || ''} />
          <AvatarFallback>
            {displayName[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium truncate">{displayName}</p>
            <span className="text-xs text-muted-foreground">
              {thread.last_message && format(new Date(thread.last_message.created_at), 'HH:mm')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {thread.last_message?.body || 'No messages yet'}
          </p>
        </div>
        
        {thread.unread_count && thread.unread_count > 0 && (
          <Badge variant="secondary" className="flex-shrink-0">
            {thread.unread_count}
          </Badge>
        )}
      </div>
    );
  };

  const EmptyState = ({ icon: Icon, title, description }: any) => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Icon className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );

  return (
    <AppLayout>
      <SEO 
        title="Messages | Communication Hub" 
        description="Manage your conversations, notifications, and stay connected with your community"
        canonical={window.location.href}
      />
      <SubNavigation items={messagesNavigation} />
      
      <div className="flex h-[calc(100vh-120px)]">
        {/* Sidebar */}
        <div className="w-80 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b bg-background">
            <StandardHeader
              title="Messages"
              description="Stay connected with your community"
              emoji="💬"
            />

            <UtilityActionButton className="mt-4">
              <ExpandableSearchButton 
                placeholder="Search conversations..."
                onSearch={(query) => console.log('Search:', query)}
              />
              <Button size="sm" onClick={() => setInboxActionOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </UtilityActionButton>

            <SplitBar value={activeOverviewTab} onValueChange={setActiveOverviewTab} className="mt-4 flex flex-col flex-1">
              <SplitBarList>
                <SplitBarTrigger value="direct">Direct</SplitBarTrigger>
                <SplitBarTrigger value="groups">Groups</SplitBarTrigger>
                <SplitBarTrigger value="notifications">Alerts</SplitBarTrigger>
              </SplitBarList>

              {/* Conversation List */}
              <SplitBarContent value="direct" className="flex-1">
                <ScrollArea className="h-full p-4">
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3">
                          <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : threads.length === 0 ? (
                    <EmptyState 
                      icon={MessageSquare}
                      title="No conversations"
                      description="Start a new conversation to connect with others"
                    />
                  ) : (
                    <div className="space-y-1">
                      {threads.filter(t => t.type === 'direct').map(thread => (
                        <ThreadItem key={thread.id} thread={thread} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </SplitBarContent>

              <SplitBarContent value="groups" className="flex-1">
                <ScrollArea className="h-full p-4">
                  {threads.filter(t => t.type === 'group').length === 0 ? (
                    <EmptyState 
                      icon={Users}
                      title="No group chats"
                      description="Join or create group conversations"
                    />
                  ) : (
                    <div className="space-y-1">
                      {threads.filter(t => t.type === 'group').map(thread => (
                        <ThreadItem key={thread.id} thread={thread} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </SplitBarContent>

              <SplitBarContent value="notifications" className="flex-1">
                <ScrollArea className="h-full p-4">
                  <EmptyState 
                    icon={Bell}
                    title="No notifications"
                    description="System notifications will appear here"
                  />
                </ScrollArea>
              </SplitBarContent>
            </SplitBar>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedThread ? (
            <ConversationView 
              thread={selectedThread}
              onBack={() => setSelectedThread(null)}
              className="h-full border-none"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/10">
              <div className="text-center max-w-sm">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground mb-6">
                  Choose a conversation from the sidebar or start a new one
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setInboxActionOpen(true)}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    New Message
                  </Button>
                  <Button variant="outline">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Request Payment
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <InboxMasterActionPopup 
        open={inboxActionOpen}
        onOpenChange={setInboxActionOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.INBOX_OVERVIEW);
