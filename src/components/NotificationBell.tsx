import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useSidebar } from '@/components/ui/sidebar';
import { useFollow } from '@/hooks/useFollow';

interface Notification {
  id: string;
  type: 'test_results' | 'appointment_reminder' | 'test_reminder' | 'critical_alert' | 'follow';
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
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
  const navigate = useNavigate();
  const { open } = useSidebar();

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

      // Fetch follow statuses for follow notifications
      const followNotifications = data?.filter(n => n.type === 'follow') || [];
      const statuses: Record<string, boolean> = {};
      
      for (const notif of followNotifications) {
        const followerData = notif.data as { follower_id?: string; follower_name?: string } | null;
        if (followerData?.follower_id) {
          const { data: followStatus } = await supabase.rpc('get_follow_status', {
            target_user_id: followerData.follower_id
          });
          statuses[followerData.follower_id] = followStatus || false;
        }
      }
      
      setFollowStatuses(statuses);
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

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'test_results':
        navigate('/health/insights/biomarker-results');
        break;
      case 'appointment_reminder':
        // Appointments handled by universal calendar popup
        navigate('/calendar');
        break;
      case 'follow':
        const followerData = notification.data as { follower_id?: string; follower_name?: string } | null;
        if (followerData?.follower_id) {
          navigate(`/profile/${followerData.follower_id}`);
        }
        break;
      default:
        break;
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
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start p-3 cursor-pointer"
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-2 w-full">
                <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {notification.title}
                    </span>
                    {!notification.is_read && (
                      <Badge variant="secondary" className="h-2 w-2 p-0 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {notification.message}
                  </p>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </span>
                </div>
                {notification.type === 'follow' && (() => {
                  const followerData = notification.data as { follower_id?: string; follower_name?: string } | null;
                  return followerData?.follower_id && !followStatuses[followerData.follower_id] && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      onClick={(e) => handleFollowBack(e, followerData.follower_id!)}
                    >
                      Follow Back
                    </Button>
                  );
                })()}
              </div>
            </DropdownMenuItem>
          ))
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center text-primary cursor-pointer"
              onClick={() => navigate('/inbox/notifications')}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}