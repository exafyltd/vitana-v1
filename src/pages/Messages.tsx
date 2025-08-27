import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MessageComposer from "@/components/messages/MessageComposer";
import { MessageSquare, Users, Bell, Archive, Clock, AlertTriangle } from "lucide-react";
import { useState } from "react";

const messagesSubItems = [
  { id: "overview", name: "Overview", path: "/messages" },
  { id: "direct", name: "Direct Messages", path: "/messages/direct" },
  { id: "group", name: "Group Chats", path: "/messages/group" },
  { id: "notifications", name: "Notifications", path: "/messages/notifications" },
  { id: "archived", name: "Archived", path: "/messages/archived" },
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

export default function Messages() {
  const [activeTab, setActiveTab] = useState("overview");

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
      <SubNavigation items={messagesSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-domain-messages-tint via-background to-domain-messages-tint/50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <Card className="bg-white/80 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-3xl">Stay connected with your community! 💬</CardTitle>
              <p className="text-muted-foreground">Manage your conversations, notifications, and stay connected with your wellness community.</p>
            </CardHeader>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="direct">Direct Messages</TabsTrigger>
              <TabsTrigger value="group">Group Chats</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmptyState 
                      icon={Clock}
                      title="No recent activity"
                      description="Your recent messages and notifications will appear here"
                    />
                  </CardContent>
                </Card>
                <MessageComposer />
              </div>
            </TabsContent>

            <TabsContent value="direct" className="mt-6">
              <EmptyState 
                icon={MessageSquare}
                title="No direct messages"
                description="Start a conversation with community members"
              />
            </TabsContent>

            <TabsContent value="group" className="mt-6">
              <EmptyState 
                icon={Users}
                title="No group chats"
                description="Join or create group conversations"
              />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <EmptyState 
                icon={Bell}
                title="No notifications"
                description="Your notifications will appear here"
              />
            </TabsContent>

            <TabsContent value="archived" className="mt-6">
              <EmptyState 
                icon={Archive}
                title="No archived messages"
                description="Archived conversations will appear here"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
