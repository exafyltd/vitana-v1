import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

const messagesSubItems = [
  { id: "overview", name: "Overview", path: "/inbox" },
  { id: "direct", name: "Direct Messages", path: "/inbox/direct" },
  { id: "group", name: "Group Chats", path: "/inbox/group" },
  { id: "notifications", name: "Notifications", path: "/inbox/notifications" },
  { id: "archived", name: "Archived", path: "/inbox/archived" },
];

export default function Notifications() {
  const notifications = [
    { id: 1, type: "appointment", title: "Upcoming Appointment", message: "Dr. Wilson session in 30 minutes", time: "30m", read: false },
    { id: 2, type: "challenge", title: "Weekly Challenge", message: "Complete your hydration goal!", time: "2h", read: false },
    { id: 3, type: "community", title: "New Group Message", message: "Wellness Warriors: Great workout session!", time: "4h", read: true },
    { id: 4, type: "health", title: "Health Reminder", message: "Time for your evening medication", time: "6h", read: true },
    { id: 5, type: "achievement", title: "Goal Achieved!", message: "You've reached your step goal for today!", time: "1d", read: true },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return '📅';
      case 'challenge': return '🏆';
      case 'community': return '👥';
      case 'health': return '💊';
      case 'achievement': return '🎉';
      default: return '🔔';
    }
  };

  return (
    <AppLayout>
      <SEO title="Notifications | Messages" description="Manage your notifications and alerts" canonical={window.location.href} />
      <SubNavigation items={messagesSubItems} />
      
      <div className="p-6">
        <StandardHeader 
          title="Stay informed, stay connected!"
          description="Manage your notifications and alerts"
          emoji="🔔"
        />
        
        <div className="flex h-[calc(100vh-140px)]" style={{ gap: '24px' }}>
          {/* Left Sidebar - Notification Categories */}
          <Card className="w-80 flex flex-col">
            <CardHeader className="border-b">
              <h2 className="font-semibold mb-3">Notifications</h2>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Bell className="h-4 w-4" />
                  All Notifications
                  <Badge variant="secondary" className="ml-auto">5</Badge>
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  📅 Appointments
                  <Badge variant="secondary" className="ml-auto">1</Badge>
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  🏆 Challenges
                  <Badge variant="secondary" className="ml-auto">1</Badge>
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  👥 Community
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  💊 Health Reminders
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Center - Notification List */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">All Notifications</h3>
                <Button variant="ghost" size="sm">Mark all as read</Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-0">
              {notifications.map((notification) => (
                <div key={notification.id} className={`p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors ${!notification.read ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      {!notification.read && (
                        <div className="mt-2">
                          <div className="h-2 w-2 bg-primary rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Right Sidebar - Notification Settings */}
          <Card className="w-80">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Notification Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Push Notifications</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Appointment reminders</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Health reminders</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Community messages</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Goal achievements</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Email Notifications</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Weekly summary</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Important updates</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Quiet Hours</h4>
                  <p className="text-sm text-muted-foreground mb-2">Disable notifications during these hours</p>
                  <div className="flex gap-2">
                    <Input placeholder="10:00 PM" className="flex-1" />
                    <span className="flex items-center">to</span>
                    <Input placeholder="7:00 AM" className="flex-1" />
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