import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SplitScreen } from "@/components/ui/split-screen";
import MessageComposer from "@/components/messages/MessageComposer";
import { MessageSquare, Users, Bell, Archive, Clock, AlertTriangle, Lightbulb, Mail, Zap, Copy, Send } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("overview");
  const [activeOverviewTab, setActiveOverviewTab] = useState("direct");

  const EmptyState = ({ icon: Icon, title, description }: any) => (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Icon className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );

  // Overview sub-navigation items
  const overviewNavItems = [
    { id: "direct", name: "Direct Messages", path: "#direct" },
    { id: "groups", name: "Group Chats", path: "#groups" },
    { id: "notifications", name: "Notifications", path: "#notifications" },
    { id: "archived", name: "Archived", path: "#archived" }
  ];

  // Content for each overview sub-section
  const renderOverviewContent = () => {
    switch (activeOverviewTab) {
      case "direct":
        return (
          <Card className="h-full">
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
        );
      case "groups":
        return (
          <Card className="h-full">
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
        );
      case "notifications":
        return (
          <Card className="h-full">
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
        );
      case "archived":
        return (
          <Card className="h-full">
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
        );
      default:
        return null;
    }
  };

  // Split-screen left panel with sub-navigation
  const OverviewLeftPanel = (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        {overviewNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveOverviewTab(item.id)}
            className={`p-3 text-left rounded-lg transition-all ${
              activeOverviewTab === item.id
                ? "bg-muted text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {item.name}
            {item.id === "direct" && <Badge variant="secondary" className="ml-2">{stats.unreadDirect}</Badge>}
            {item.id === "groups" && <Badge variant="secondary" className="ml-2">{stats.unreadGroups}</Badge>}
            {item.id === "notifications" && <Badge variant="secondary" className="ml-2">{stats.unreadNotifications}</Badge>}
          </button>
        ))}
      </div>
    </div>
  );

  // Split-screen right panel with content
  const OverviewRightPanel = (
    <div className="h-full">
      {renderOverviewContent()}
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
                defaultLeftSize={30}
                screenId={SCREEN_IDS.INBOX_OVERVIEW}
                className="min-h-[600px]"
              />
            </TabsContent>

            <TabsContent value="reminder" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    Unanswered Messages
                    <Badge variant="secondary">{unansweredMessages.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {unansweredMessages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={message.avatar} alt={message.name} />
                          <AvatarFallback>{message.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{message.name}</h4>
                            <span className="text-xs text-muted-foreground">{message.time}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{message.message}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-13">
                        {message.quickReplies.map((reply, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => console.log(`Sending: ${reply}`)}
                          >
                            <Send className="w-3 h-3 mr-1" />
                            {reply}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inspiration" className="mt-6">
              <div className="space-y-6">
                {inspirationTemplates.map((category, categoryIdx) => (
                  <Card key={categoryIdx}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        {category.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {category.templates.map((template, templateIdx) => (
                        <div key={templateIdx} className="border rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-xl">{template.icon}</span>
                            <p className="text-sm">{template.text}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(template.text)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => console.log(`Forwarding: ${template.text}`)}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Send
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.INBOX_OVERVIEW);
