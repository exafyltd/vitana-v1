import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { useSidebar } from '@/components/ui/sidebar';
import { playNotificationBell } from '@/utils/soundEffects';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';

export default function NotificationBell() {
  // Listening to the same hook here is cheap (it dedupes via the realtime
  // channel's queue) and keeps the bell sound + badge responsive even when
  // the dropdown is closed.
  const { unreadCount } = useNotifications(20);
  const { open } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const prevUnreadRef = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) playNotificationBell();
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
      <DropdownMenuContent
        className="w-[calc(100vw-2rem)] sm:w-96 rounded-2xl shadow-lg p-0 overflow-hidden"
        align="end"
      >
        <NotificationsPanel
          onNavigated={() => setDropdownOpen(false)}
          onClose={() => setDropdownOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
