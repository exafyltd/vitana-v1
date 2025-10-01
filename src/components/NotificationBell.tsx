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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
          notifications.map((notification) => {
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
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3 w-full">
                  {isFollowNotification && followerProfile ? (
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={followerProfile.avatar_url || undefined} />
                      <AvatarFallback>
                        {followerProfile.display_name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                    {!notification.is_read && (
                      <Badge variant="secondary" className="h-2 w-2 p-0 rounded-full ml-2" />
                    )}
                  </div>
                  {showFollowBack && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      onClick={(e) => handleFollowBack(e, followerData.follower_id!)}
                    >
                      Follow Back
                    </Button>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })
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