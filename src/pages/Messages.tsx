import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { InboxMasterActionPopup } from "@/components/messages/InboxMasterActionPopup";
import { MessageSquare, Users, Bell, Archive, Clock, AlertTriangle, Lightbulb, Mail, Zap, Copy, Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

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
        title="Inbox | Communication Hub" 
        description="Manage your conversations, notifications, and stay connected with your community"
        canonical={window.location.href}
      />
      <SubNavigation items={messagesNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-domain-messages-tint via-background to-domain-messages-tint/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Stay connected with your community!"
            description="Manage your conversations, notifications, and stay connected with your wellness community."
            emoji="💬"
          />

          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search messages, contacts, or groups..."
              onSearch={(query) => console.log('Search:', query)}
            />
            <Button size="sm" onClick={() => setInboxActionOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeOverviewTab} onValueChange={setActiveOverviewTab}>
            <SplitBarList>
              <SplitBarTrigger value="direct">Direct Messages</SplitBarTrigger>
              <SplitBarTrigger value="groups">Group Chats</SplitBarTrigger>
              <SplitBarTrigger value="notifications">Notifications</SplitBarTrigger>
              <SplitBarTrigger value="archived">Archived</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="direct" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Direct Messages
                    <Badge variant="secondary">{stats.unreadDirect}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState 
                    icon={MessageSquare}
                    title="No direct messages"
                    description="Start a conversation with community members"
                  />
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="groups" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Group Chats
                    <Badge variant="secondary">{stats.unreadGroups}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState 
                    icon={Users}
                    title="No group chats"
                    description="Join or create group conversations"
                  />
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="notifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                    <Badge variant="secondary">{stats.unreadNotifications}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState 
                    icon={Bell}
                    title="No notifications"
                    description="Your notifications will appear here"
                  />
                </CardContent>
              </Card>
            </SplitBarContent>

            <SplitBarContent value="archived" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="w-5 h-5" />
                    Archived Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState 
                    icon={Archive}
                    title="No archived messages"
                    description="Archived conversations will appear here"
                  />
                </CardContent>
              </Card>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>
      
      <InboxMasterActionPopup 
        open={inboxActionOpen}
        onOpenChange={setInboxActionOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.INBOX_OVERVIEW);
