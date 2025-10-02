import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useSidebar } from '@/components/ui/sidebar';
import { useFollow } from '@/hooks/useFollow';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'test_results' | 'appointment_reminder' | 'test_reminder' | 'critical_alert' | 'follow';
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

interface FollowerProfile {
  avatar_url: string | null;
  display_name: string | null;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'test_results':
      return '🧪';
    case 'appointment_reminder':
      return '📅';
    case 'test_reminder':
      return '⏰';
    case 'critical_alert':
      return '🚨';
    case 'follow':
      return '👤';
    default:
      return '🔔';
  }
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [followStatuses, setFollowStatuses] = useState<Record<string, boolean>>({});
  const [followerProfiles, setFollowerProfiles] = useState<Record<string, FollowerProfile>>({});
  const { open } = useSidebar();
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);

      // Fetch follow statuses and profiles for follow notifications
      const followNotifications = data?.filter(n => n.type === 'follow') || [];
      const statuses: Record<string, boolean> = {};
      const profiles: Record<string, FollowerProfile> = {};
      
      for (const notif of followNotifications) {
        const followerData = notif.data as { follower_id?: string; follower_name?: string } | null;
        if (followerData?.follower_id) {
          // Check if current user is following this person back
          const { data: followStatus } = await supabase.rpc('get_follow_status', {
            target_user_id: followerData.follower_id
          });
          statuses[followerData.follower_id] = followStatus || false;

          // Fetch follower profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url, display_name')
            .eq('user_id', followerData.follower_id)
            .single();
          
          if (profileData) {
            profiles[followerData.follower_id] = profileData;
          }
        }
      }
      
      setFollowStatuses(statuses);
      setFollowerProfiles(profiles);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      toast({
        title: "Notification deleted",
        description: "The notification has been removed",
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      
      toast({
        title: "All notifications marked as read",
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
      
      toast({
        title: "All notifications cleared",
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({
        title: "Error",
        description: "Failed to clear notifications",
        variant: "destructive",
      });
    }
  };

  const handleFollowBack = async (e: React.MouseEvent, followerId: string) => {
    e.stopPropagation();
    
    try {
      const { data, error } = await supabase.rpc('follow_user', {
        target_user_id: followerId
      });

      if (error) throw error;

      // Update local follow status
      setFollowStatuses(prev => ({
        ...prev,
        [followerId]: true
      }));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="relative">
          <Button 
            variant="ghost" 
            className="relative shrink-0 transition-all duration-200 hover:bg-sidebar-accent flex items-center justify-center h-8 w-8 rounded-lg"
            title={`Notifications • ${unreadCount} unread`}
            aria-label={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
          >
            <Bell className="h-4 w-4 text-white" />
          </Button>
          <NotificationBadge 
            count={unreadCount} 
            collapsed={!open}
            ariaLabel={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{unreadCount} new</Badge>
            {notifications.length > 0 && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="h-7 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllNotifications}
                  className="h-7 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              </>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => {
                const isFollowNotification = notification.type === 'follow';
                const followerData = isFollowNotification 
                  ? notification.data as { follower_id?: string; follower_name?: string } | null 
                  : null;
                const followerProfile = followerData?.follower_id 
                  ? followerProfiles[followerData.follower_id] 
                  : null;
                const showFollowBack = isFollowNotification && 
                  followerData?.follower_id && 
                  !followStatuses[followerData.follower_id];

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                      !notification.is_read ? 'bg-muted/20' : ''
                    }`}
                  >
                    {isFollowNotification && followerProfile ? (
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={followerProfile.avatar_url || undefined} />
                        <AvatarFallback>
                          {followerProfile.display_name?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold' : ''}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                      {showFollowBack && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7"
                          onClick={(e) => handleFollowBack(e, followerData.follower_id!)}
                        >
                          Follow Back
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}