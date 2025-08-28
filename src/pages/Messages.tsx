import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SplitScreen } from "@/components/ui/split-screen";
import MessageComposer from "@/components/messages/MessageComposer";
import { MessageSquare, Users, Bell, Archive, Clock, AlertTriangle, Lightbulb, Mail, Zap } from "lucide-react";
import { useState } from "react";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

const messagesSubItems = [
  { id: "overview", name: "Overview", path: "/messages" },
  { id: "reminder", name: "Reminder", path: "/messages/reminder" },
  { id: "inspiration", name: "Inspiration", path: "/messages/inspiration" },
];

const recentActivity = [
  { id: 1, type: "message", name: "Jennifer Ardy", content: "sent you a message", time: "2m ago", avatar: "/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png", urgent: false },
  { id: 2, type: "call", name: "Tae Min", content: "missed call", time: "15m ago", avatar: "/lovable-uploads/tae-min-avatar.jpg", urgent: true },
  { id: 3, type: "group", name: "Design Team", content: "new message in group", time: "1h ago", avatar: "/lovable-uploads/design-team-avatar.jpg", urgent: false },
  { id: 4, type: "invite", name: "Se Hun oh", content: "invited you to a meeting", time: "2h ago", avatar: "/lovable-uploads/se-hun-oh-avatar.jpg", urgent: false },
  { id: 5, type: "message", name: "Murphy", content: "replied to your message", time: "3h ago", avatar: "/lovable-uploads/murphy-avatar.jpg", urgent: false },
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
  const [activeTab, setActiveTab] = useState("overview");

  const EmptyState = ({ icon: Icon, title, description }: any) => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Icon className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );

  // Split-screen content for Overview tab
  const OverviewLeftPanel = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Direct Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState 
            icon={MessageSquare}
            title="No direct messages"
            description="Start a conversation with community members"
          />
        </CardContent>
      </Card>
    </div>
  );

  const OverviewRightPanel = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Group Chats</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState 
            icon={Users}
            title="No group chats"
            description="Join or create group conversations"
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState 
            icon={Bell}
            title="No notifications"
            description="Your notifications will appear here"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archived</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState 
            icon={Archive}
            title="No archived messages"
            description="Archived conversations will appear here"
          />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AppLayout>
      <SEO 
        title="Inbox | Communication Hub" 
        description="Manage your conversations, notifications, and stay connected with your community"
        canonical={window.location.href}
      />
      <SubNavigation items={messagesSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-domain-messages-tint via-background to-domain-messages-tint/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Stay connected with your community!"
            description="Manage your conversations, notifications, and stay connected with your wellness community."
            emoji="💬"
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="reminder">Reminder</TabsTrigger>
              <TabsTrigger value="inspiration">Inspiration</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <SplitScreen
                leftPanel={OverviewLeftPanel}
                rightPanel={OverviewRightPanel}
                defaultLeftSize={40}
                screenId={SCREEN_IDS.INBOX_OVERVIEW}
                className="min-h-[600px]"
              />
            </TabsContent>

            <TabsContent value="reminder" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-500" />
                    Smart Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState 
                    icon={Clock}
                    title="No reminders set"
                    description="Set up intelligent reminders for follow-ups and important conversations"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inspiration" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Communication Inspiration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EmptyState 
                    icon={Zap}
                    title="No suggestions available"
                    description="AI-powered suggestions for initiating conversations and responding to messages will appear here"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.INBOX_OVERVIEW);
