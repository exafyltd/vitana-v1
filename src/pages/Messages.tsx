import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MessageComposer from "@/components/messages/MessageComposer";
import { MessageSquare, Users, Bell, Archive, Clock, AlertTriangle } from "lucide-react";

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
  const navigate = useNavigate();
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

  return (
    <AppLayout>
      <SEO 
        title="Messages | Communication Hub" 
        description="Manage your conversations, notifications, and stay connected with your community"
        canonical={window.location.href}
      />
      <SubNavigation items={messagesSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Stay connected with your community! 💬</h1>
            <p className="text-muted-foreground">Manage your conversations, notifications, and stay connected with your wellness community.</p>
          </div>
        </div>
        <div className="flex h-[calc(100vh-280px)]" style={{ gap: '24px' }}>
          {/* Left Panel - Activity Feed */}
          <Card className="w-80 flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Recent Activity
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search activity..." className="pl-10" />
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-0">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={activity.avatar} />
                        <AvatarFallback>{activity.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-3 w-3 border-2 border-background rounded-full ${
                        activity.type === 'message' ? 'bg-blue-500' :
                        activity.type === 'call' ? 'bg-green-500' :
                        activity.type === 'group' ? 'bg-purple-500' :
                        'bg-orange-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{activity.name}</p>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{activity.content}</p>
                    </div>
                    {activity.urgent && (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Center Panel - Dashboard */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Messages Dashboard</h2>
                  <p className="text-sm text-muted-foreground">Overview of your communication activity</p>
                </div>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.unreadDirect}</p>
                      <p className="text-sm text-muted-foreground">Unread Direct</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.unreadGroups}</p>
                      <p className="text-sm text-muted-foreground">Unread Groups</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.activeConversations}</p>
                      <p className="text-sm text-muted-foreground">Active Chats</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.averageResponseTime}</p>
                      <p className="text-sm text-muted-foreground">Avg Response</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <h3 className="font-medium">Quick Actions</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/messages/direct')}>
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-xs">Direct Messages</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/messages/group')}>
                    <Users className="h-5 w-5" />
                    <span className="text-xs">Group Chats</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/messages/notifications')}>
                    <Bell className="h-5 w-5" />
                    <span className="text-xs">Notifications</span>
                  </Button>
                </div>
              </div>

              {/* Daily Summary */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Today's Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Messages sent</span>
                    <span>{stats.dailyMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active conversations</span>
                    <span>{stats.activeConversations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Response rate</span>
                    <span>89%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Status Center */}
          <Card className="w-80">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <Avatar className="h-16 w-16 mx-auto mb-3">
                  <AvatarImage src="/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png" />
                  <AvatarFallback>JL</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold">Jhon Lever</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Available</span>
                </div>
              </div>
              
              {/* Status Controls */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Status Settings</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Available
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      Away
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Do Not Disturb
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Quick Access</h4>
                  <div className="space-y-2">
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate('/settings/preferences')}>
                      <Settings className="h-4 w-4 mr-2" />
                      Message Settings
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate('/settings/privacy')}>
                      <Shield className="h-4 w-4 mr-2" />
                      Privacy Settings
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate('/messages/archived')}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archived Messages
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Communication Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total unread</span>
                      <Badge variant="secondary">{stats.unreadDirect + stats.unreadGroups + stats.unreadNotifications}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active chats</span>
                      <span>{stats.activeConversations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg response</span>
                      <span>{stats.averageResponseTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}