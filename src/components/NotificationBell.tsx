import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X, ArrowRight } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useSidebar } from '@/components/ui/sidebar';
import { useFollow } from '@/hooks/useFollow';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }

          // Fetch profile for new follow notification
          if (newNotification.type === 'follow') {
            const followerId = (newNotification.data as { follower_id?: string } | null)?.follower_id;
            if (followerId) {
              // Fetch global profile for new follower
              const { data: globalProfile } = await supabase
                .from('global_community_profiles')
                .select('user_id, display_name, avatar_url')
                .eq('user_id', followerId)
                .eq('is_visible', true)
                .single();

              if (globalProfile) {
                setFollowerProfiles(prev => ({
                  ...prev,
                  [followerId]: {
                    display_name: globalProfile.display_name ?? null,
                    avatar_url: globalProfile.avatar_url ?? null
                  }
                }));
              }

              // Fetch follow status for new follower
              const { data: status } = await supabase.rpc('get_follow_status', {
                target_user_id: followerId
              });
              setFollowStatuses(prev => ({
                ...prev,
                [followerId]: Boolean(status)
              }));
            }
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
      const followerIds = [...new Set(
        followNotifications
          .map(n => (n.data as { follower_id?: string } | null)?.follower_id)
          .filter(Boolean)
      )] as string[];

      if (followerIds.length > 0) {
        // Batch fetch from global_community_profiles (public, minimal profile)
        const { data: globalProfiles } = await supabase
          .from('global_community_profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', followerIds)
          .eq('is_visible', true);

        const profiles = Object.fromEntries(
          (globalProfiles || []).map(p => [
            p.user_id,
            { display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null }
          ])
        );
        setFollowerProfiles(profiles);

        // Fetch follow statuses in parallel
        const statusEntries = await Promise.all(
          followerIds.map(async (id) => {
            const { data: s } = await supabase.rpc('get_follow_status', {
              target_user_id: id
            });
            return [id, Boolean(s)] as const;
          })
        );
        setFollowStatuses(Object.fromEntries(statusEntries));
      }
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

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to target based on notification type
    if (notification.type === 'follow') {
      const followerData = notification.data as { follower_id?: string } | null;
      if (followerData?.follower_id) {
        navigate(`/profile/${followerData.follower_id}`);
      }
    }
    // Add more navigation logic for other notification types as needed
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
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
      <DropdownMenuContent className="w-96 rounded-2xl shadow-lg" align="end">
        <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-base">Notifications</h3>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={markAllAsRead}
                  className="h-8 w-8"
                  title="Mark all read"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={clearAllNotifications}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Clear all"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification, index) => {
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

                const actorName = followerData?.follower_name || followerProfile?.display_name || 'Someone';

                return (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNotificationClick(notification);
                      if (e.key === 'Delete') deleteNotification(notification.id);
                    }}
                    aria-label={`${notification.type === 'follow' ? `New follower: ${actorName}` : notification.message}, ${formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}`}
                    className={`
                      group relative flex items-start gap-3 px-3 py-3.5 cursor-pointer
                      transition-all duration-150 border-b last:border-b-0
                      ${!notification.is_read 
                        ? 'bg-accent/10 border-l-2 border-l-primary hover:bg-accent/20 hover:shadow-sm' 
                        : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    {/* Avatar */}
                    {isFollowNotification ? (
                      <div className="flex-shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={followerProfile?.avatar_url || undefined}
                            alt={actorName}
                            loading="lazy"
                            onError={(e) => (e.currentTarget.src = '')}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(actorName)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-muted">
                        <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                      </div>
                    )}

                    {/* Content Block */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm leading-relaxed">
                        {isFollowNotification ? (
                          <>
                            <span className="font-semibold">{actorName}</span>
                            <span className="text-muted-foreground"> started following you</span>
                          </>
                        ) : (
                          <span className={!notification.is_read ? 'font-medium' : ''}>
                            {notification.message}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }).replace('about ', '')}
                      </p>
                      {showFollowBack && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 text-xs"
                          onClick={(e) => handleFollowBack(e, followerData.follower_id!)}
                        >
                          Follow Back
                        </Button>
                      )}
                    </div>

                    {/* Dismiss Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-background border-t">
          <button
            onClick={() => navigate('/settings?tab=notifications')}
            className="w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 group"
          >
            <span>Manage your notifications</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}