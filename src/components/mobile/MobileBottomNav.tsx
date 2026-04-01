import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Calendar, Mail, Radio, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { useChatUnreadCount } from "@/hooks/useChatUnreadCount";

const navItems = [
  { id: 'events', icon: Calendar, label: 'Events', path: '/comm/events-meetups', i18nKey: 'mobileNav.events' },
  { id: 'inbox', icon: Mail, label: 'Inbox', path: '/inbox', i18nKey: 'mobileNav.inbox' },
  { id: 'live', icon: Radio, label: 'Live', path: '/comm/live-rooms', i18nKey: 'mobileNav.live' },
  { id: 'profile', icon: User, label: 'Profile', path: '/me/profile', i18nKey: 'mobileNav.profile' },
];

/**
 * Mobile bottom navigation bar — clean 4-item layout.
 * The gateway widget FAB is the sole voice entry point.
 */
export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { unreadCount } = useChatUnreadCount();
  
  // Routes where the bottom nav should be hidden
  const hideNavRoutes = [
    '/_intro',
    '/maxina',
    '/auth',
    '/login',
    '/register',
    '/video-player',
    '/live-classes',
    '/camera-capture',
    '/meditation-player',
    '/onboarding',
    '/comm/live-rooms/',
    '/payment-checkout',
    '/kyc-verification',
  ];
  
  const shouldHideNav = hideNavRoutes.some(route => 
    location.pathname === route || 
    location.pathname.startsWith(route + '/') ||
    (route.endsWith('/') && location.pathname.startsWith(route))
  );
  
  // Sync body attribute so external widgets (ORB) know when bottom nav is visible
  useEffect(() => {
    const visible = isMobile && !shouldHideNav;
    if (visible) {
      document.body.dataset.bottomNavVisible = "true";
    } else {
      delete document.body.dataset.bottomNavVisible;
    }
    return () => { delete document.body.dataset.bottomNavVisible; };
  }, [isMobile, shouldHideNav]);

  // Only render on mobile and when not on hidden routes
  if (!isMobile || shouldHideNav) {
    return null;
  }
  
  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      <div className="relative flex items-end justify-between bg-background/95 backdrop-blur-3xl border-t border-foreground/8 pb-safe pt-2 px-4 shadow-[0_-1px_3px_0_hsl(var(--foreground)/0.03)]">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            {...item}
            i18nKey={item.i18nKey}
            unreadCount={item.id === 'inbox' ? unreadCount : 0}
          />
        ))}
      </div>
    </motion.nav>
  );
}

interface NavItemProps {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  i18nKey?: string;
  unreadCount?: number;
}

function NavItem({ id, icon: Icon, label, path, i18nKey, unreadCount = 0 }: NavItemProps) {
  const { translate } = useTranslation();

  return (
    <NavLink
      to={path}
      className={() =>
        cn(
          "flex flex-col items-center gap-0.5 flex-1 px-1 py-1 transition-all duration-200"
        )
      }
    >
      {({ isActive }) => (
        <div className="relative flex flex-col items-center">
          <div className="relative">
            <Icon
              className={cn(
                "w-5 h-5 text-black dark:text-white transition-opacity duration-200",
                isActive ? "opacity-100" : "opacity-50"
              )}
            />
            {id === 'inbox' && unreadCount > 0 && (
              <span
                className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground"
                aria-label={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>

          <span
            className={cn(
              "text-[12px] tracking-tight text-black dark:text-white transition-opacity duration-200",
              isActive ? "font-semibold opacity-100" : "font-medium opacity-60"
            )}
          >
            {translate(i18nKey ?? '', label)}
          </span>

          {isActive && (
            <motion.div
              layoutId="nav-active-indicator"
              className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-primary"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </div>
      )}
    </NavLink>
  );
}
