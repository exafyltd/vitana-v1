import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const messagesSubItems = [
  { id: "overview", name: "Overview", path: "/inbox" },
  { id: "direct", name: "Direct Messages", path: "/inbox/direct" },
  { id: "group", name: "Group Chats", path: "/inbox/group" },
  { id: "notifications", name: "Notifications", path: "/inbox/notifications" },
  { id: "archived", name: "Archived", path: "/inbox/archived" },
];

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return '📅';
      case 'challenge': return '🏆';
      case 'community': return '👥';
      case 'health': return '💊';
      case 'achievement': return '🎉';
      case 'message': return '💬';
      case 'follow': return '👤';
      default: return '🔔';
    }
  };

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
      return;
    }

    // Update local state
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    toast({
      title: "Success",
      description: "All notifications marked as read",
    });
  };

  const markAsRead = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.is_read) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    // Update local state
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  useEffect(() => {
    const initializeNotifications = async () => {
      await fetchNotifications();

      // Mark all unread notifications as read when page is visited
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      // Subscribe to real-time updates
      const channel = supabase
        .channel('notifications-page')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updatedNotification = payload.new as Notification;
            setNotifications(prev =>
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            fetchNotifications(); // Refresh to update unread count
          }
        )
        .subscribe();

      return channel;
    };

    let channelCleanup: any;
    initializeNotifications().then(channel => {
      channelCleanup = channel;
    });

    return () => {
      if (channelCleanup) {
        supabase.removeChannel(channelCleanup);
      }
    };
  }, []);

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
                  {notifications.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">{notifications.length}</Badge>
                  )}
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  📅 Appointments
                  {notifications.filter(n => n.type === 'appointment').length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {notifications.filter(n => n.type === 'appointment').length}
                    </Badge>
                  )}
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  🏆 Challenges
                  {notifications.filter(n => n.type === 'challenge').length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {notifications.filter(n => n.type === 'challenge').length}
                    </Badge>
                  )}
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  👥 Community
                  {notifications.filter(n => n.type === 'community').length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {notifications.filter(n => n.type === 'community').length}
                    </Badge>
                  )}
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  💊 Health Reminders
                  {notifications.filter(n => n.type === 'health').length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {notifications.filter(n => n.type === 'health').length}
                    </Badge>
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Center - Notification List */}
          <Card className="flex-1 flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">All Notifications</h3>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    Mark all as read
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-0">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-primary/5' : ''}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        {!notification.is_read && (
                          <div className="mt-2">
                            <div className="h-2 w-2 bg-primary rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
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