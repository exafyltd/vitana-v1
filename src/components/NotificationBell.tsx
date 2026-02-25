import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X, ArrowRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebar } from '@/components/ui/sidebar';
import { useNavigate } from 'react-router-dom';
import { playNotificationBell } from '@/utils/soundEffects';
import { useNotifications, VitanaNotification } from '@/hooks/useNotifications';
import { getNotificationIcon, resolveNotificationRoute } from '@/lib/notification-types';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications(20);
  const { open } = useSidebar();
  const navigate = useNavigate();
  const prevUnreadRef = useRef(unreadCount);

  // Play sound when unread count increases
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      playNotificationBell();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const handleNotificationClick = async (notification: VitanaNotification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    const route = resolveNotificationRoute(notification.type, notification.data);
    if (route) {
      navigate(route);
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
      <DropdownMenuContent className="w-96 rounded-2xl shadow-lg" align="end">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-base">Notifications</h3>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={markAllAsRead}
                className="h-8 w-8"
                title="Mark all read"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNotificationClick(notification);
                    if (e.key === 'Delete') deleteNotification(notification.id);
                  }}
                  className={`
                    group relative flex items-start gap-3 px-3 py-3.5 cursor-pointer
                    transition-all duration-150 border-b last:border-b-0
                    ${!notification.read_at
                      ? 'bg-accent/10 border-l-2 border-l-primary hover:bg-accent/20 hover:shadow-sm'
                      : 'hover:bg-muted/50'
                    }
                  `}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-muted">
                    <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm leading-relaxed">
                      <span className={!notification.read_at ? 'font-medium' : ''}>
                        {notification.title}
                      </span>
                    </p>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 hover:bg-destructive/10 rounded"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-background border-t px-4 py-2">
          <Button
            variant="ghost"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/settings?tab=notifications')}
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Manage your notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
