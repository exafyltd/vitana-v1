import { useMemo, useState } from 'react';
import { Bell, Check, Settings, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNotifications, VitanaNotification } from '@/hooks/useNotifications';
import {
  getCategoryDisplay,
  getNotificationCategory,
  getNotificationIcon,
  getTypesForCategory,
  groupByCategory,
  resolveNotificationRoute,
  type NotificationCategory,
} from '@/lib/notification-types';

type FilterValue = 'all' | 'unread' | NotificationCategory;

interface NotificationsPanelProps {
  /** Called after a notification is tapped — host can close the dropdown/dialog. */
  onNavigated?: () => void;
  /** Called when the "manage settings" footer link is clicked. */
  onOpenSettings?: () => void;
  /** Cap on how many notifications to fetch from the hook. */
  limit?: number;
  /** Overrides the panel's max-height (Tailwind class). */
  maxHeightClassName?: string;
  /** Hide the "Manage your notifications" footer (e.g. on mobile dialog). */
  hideSettingsFooter?: boolean;
  /** Additional class for the outer container. */
  className?: string;
}

/**
 * Self-contained notification panel.
 *
 * Used by:
 *  - NotificationBell (desktop dropdown)
 *  - SideDrawerNav mobile notifications dialog
 *
 * Layout uses a flex-column with a constrained max-height; the list area is
 * `flex-1 min-h-0 overflow-y-auto` so it always scrolls inside the panel,
 * never relying on the host overlay (Radix dropdown / Dialog) to handle it.
 */
export function NotificationsPanel({
  onNavigated,
  onOpenSettings,
  limit = 20,
  maxHeightClassName = 'max-h-[min(80vh,560px)]',
  hideSettingsFooter = false,
  className,
}: NotificationsPanelProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
  } = useNotifications(limit);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const presentCategories = useMemo(() => {
    const seen = new Set<NotificationCategory>();
    for (const n of notifications) seen.add(getNotificationCategory(n.type));
    return Array.from(seen)
      .map((c) => ({ category: c, display: getCategoryDisplay(c) }))
      .sort((a, b) => a.display.sort_order - b.display.sort_order);
  }, [notifications]);

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.read_at);
    return notifications.filter((n) => getNotificationCategory(n.type) === filter);
  }, [notifications, filter]);

  const grouped = useMemo(
    () => (filter === 'all' ? groupByCategory(filtered) : null),
    [filtered, filter]
  );

  const handleNotificationClick = async (notification: VitanaNotification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    const route = resolveNotificationRoute(notification.type, notification.data);
    onNavigated?.();
    if (route) navigate(route);
  };

  const handleConfirmDeleteAll = async () => {
    setConfirmOpen(false);
    if (filter === 'all') {
      await deleteAll();
    } else if (filter === 'unread') {
      await markAllAsRead();
    } else {
      await deleteAll({ types: getTypesForCategory(filter) });
      setFilter('all');
    }
  };

  const handleSettingsClick = () => {
    onOpenSettings?.();
    onNavigated?.();
    navigate('/settings?tab=notifications');
  };

  const confirmTitle =
    filter === 'unread'
      ? 'Mark all as read'
      : filter === 'all'
      ? 'Clear all notifications?'
      : `Clear all ${getCategoryDisplay(filter).label.toLowerCase()}?`;

  return (
    <div className={`flex flex-col min-w-0 max-w-full ${maxHeightClassName} ${className ?? ''}`}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-baseline gap-2">
          <h3 className="font-semibold text-base">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={markAllAsRead}
              className="h-8 w-8"
              title="Mark all as read"
              aria-label="Mark all as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmOpen(true)}
              className="h-8 w-8 hover:text-destructive"
              title="Clear all"
              aria-label="Clear all notifications"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      {notifications.length > 0 && presentCategories.length > 0 && (
        <div className="shrink-0 border-b px-2 py-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 w-max">
            <FilterPill
              active={filter === 'all'}
              onClick={() => setFilter('all')}
              label={`All (${notifications.length})`}
            />
            {unreadCount > 0 && (
              <FilterPill
                active={filter === 'unread'}
                onClick={() => setFilter('unread')}
                label={`Unread (${unreadCount})`}
              />
            )}
            {presentCategories.map(({ category, display }) => {
              const count = notifications.filter(
                (n) => getNotificationCategory(n.type) === category
              ).length;
              return (
                <FilterPill
                  key={category}
                  active={filter === category}
                  onClick={() => setFilter(category)}
                  label={`${display.icon} ${display.label} (${count})`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable list — flex-1 + min-h-0 lets it shrink below content size
          and overflow-y-auto guarantees a scrollbar inside the panel */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">
              {filter === 'all'
                ? 'No notifications yet'
                : filter === 'unread'
                ? 'You’re all caught up'
                : `No ${getCategoryDisplay(filter).label.toLowerCase()} notifications`}
            </p>
          </div>
        ) : grouped ? (
          <div>
            {grouped.map(({ category, display, items }) => (
              <div key={category}>
                <div className="sticky top-0 z-[1] bg-muted/80 backdrop-blur-sm px-3 py-1.5 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span className="mr-1.5" aria-hidden="true">{display.icon}</span>
                  {display.label}
                  <span className="ml-1.5 text-muted-foreground/60 normal-case font-normal">
                    ({items.length})
                  </span>
                </div>
                {items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onClick={() => handleNotificationClick(n)}
                    onDelete={() => deleteNotification(n.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div>
            {filtered.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onClick={() => handleNotificationClick(n)}
                onDelete={() => deleteNotification(n.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!hideSettingsFooter && (
        <div className="shrink-0 border-t px-4 py-2">
          <Button
            variant="ghost"
            className="w-full min-w-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleSettingsClick}
          >
            <Settings className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            <span className="truncate">Manage your notifications</span>
          </Button>
        </div>
      )}

      {/* Confirm clear */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {filter === 'unread'
                ? 'This will mark every notification as read. You can still find them in the list.'
                : 'This permanently removes the selected notifications. You can’t undo this.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAll}
              className={filter !== 'unread' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {filter === 'unread' ? 'Mark all read' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NotificationRow({
  notification,
  onClick,
  onDelete,
}: {
  notification: VitanaNotification;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`
        relative flex items-start gap-3 px-3 py-3 border-b last:border-b-0
        transition-all duration-150
        ${
          !notification.read_at
            ? 'bg-accent/10 border-l-2 border-l-primary hover:bg-accent/20'
            : 'hover:bg-muted/50'
        }
      `}
    >
      {/* Tap target for the row body — opens the source screen */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            onDelete();
          }
        }}
        className="flex-1 min-w-0 flex items-start gap-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md -mx-1 px-1"
      >
        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-muted">
          <span className="text-xl" aria-hidden="true">
            {getNotificationIcon(notification.type)}
          </span>
        </div>
        <div className="flex-1 min-w-0 space-y-0.5 pt-0.5">
          <p className="text-sm leading-snug break-words">
            <span className={!notification.read_at ? 'font-semibold' : ''}>
              {notification.title}
            </span>
          </p>
          {notification.body && (
            <p className="text-xs text-muted-foreground line-clamp-2 break-words">{notification.body}</p>
          )}
          <p className="text-[11px] text-muted-foreground/70">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Delete — solid bordered button so it reads unmistakably as the
          per-row delete action on every device, even at low contrast.
          Sibling of the tap target above so taps land cleanly. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete this notification"
        title="Delete"
        className="
          shrink-0 self-center
          h-9 w-9 flex items-center justify-center rounded-full
          bg-muted text-muted-foreground border border-border
          hover:bg-destructive hover:text-destructive-foreground hover:border-destructive
          active:scale-95
          focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40
          transition-colors
        "
      >
        <X className="h-[18px] w-[18px]" strokeWidth={2.75} />
      </button>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium
        transition-colors border
        ${
          active
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
        }
      `}
    >
      {label}
    </button>
  );
}
