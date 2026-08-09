import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Calendar, Compass, Mail, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { useChatUnreadCount } from "@/hooks/useChatUnreadCount";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { useTenantSafe } from "@/hooks/useTenant";
import { prefetchForPath, ROUTE_CHUNK_IMPORTERS } from "@/lib/prefetch-registry";

// Single bottom nav — identical in both Full App and Guided Journey modes:
// News, Inbox, ORB (center spacer), Journey, Events. Live moved to the App Bar.
const navItems = [
  { id: 'news', icon: Newspaper, label: 'News', path: '/home', i18nKey: 'mobileNav.news' },
  { id: 'inbox', icon: Mail, label: 'Inbox', path: '/inbox', i18nKey: 'mobileNav.inbox' },
  { id: 'journey', icon: Compass, label: 'Journey', path: '/autopilot', i18nKey: 'mobileNav.myJourney' },
  { id: 'events', icon: Calendar, label: 'Events', path: '/comm/events-meetups', i18nKey: 'mobileNav.events' },
];

/**
 * Mobile bottom navigation bar — clean 4-item layout.
 * The gateway widget FAB is the sole voice entry point.
 */
export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { unreadCount } = useChatUnreadCount();
  const items = navItems;

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
    '/news/',
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
    // Opacity-only entrance (no `y` transform): AppLayout isn't a persistent
    // route layout — every page mounts its own <AppLayout>/<MobileBottomNav>,
    // so this remounts on every navigation, not just cold start. A transform
    // slide-up left the bar's hit-zone at its off-screen `y: 100` start
    // position for ~0.2-0.6s after each tap, during which a second/impatient
    // tap in that screen region fell through to whatever page content sits
    // there instead (e.g. a News Feed card linking to a profile) — the
    // reported "tapping News sometimes opens a profile" bug. Opacity doesn't
    // move the hit-box, so the bar is immediately tappable at its correct
    // position even while still fading in.
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      <div className="relative grid grid-cols-5 items-end bg-background/95 backdrop-blur-3xl border-t border-foreground/8 pb-safe pt-2 px-4 shadow-[0_-1px_3px_0_hsl(var(--foreground)/0.03)]">
        {items.slice(0, 2).map((item) => (
          <NavItem
            key={item.id}
            {...item}
            i18nKey={item.i18nKey}
            unreadCount={item.id === 'inbox' ? unreadCount : 0}
          />
        ))}
        {/* Spacer for central Orb FAB */}
        <div />
        {items.slice(2).map((item) => (
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const tenantCtx = useTenantSafe();
  const tenantId = tenantCtx?.activeTenantId ?? null;
  // De-dupe: only warm once per mount per destination, even across the
  // pointerdown + touchstart pair some browsers fire together.
  const warmedRef = useRef(false);

  const handleTapIntent = () => {
    if (warmedRef.current) return;
    warmedRef.current = true;
    // Kick the route chunk download immediately…
    ROUTE_CHUNK_IMPORTERS[path]?.().catch(() => {});
    // …and warm the screen's data so it paints from cache on arrival.
    if (user?.id) {
      void prefetchForPath(queryClient, path, user.id, tenantId ?? undefined).catch(() => {});
    }
  };

  return (
    <NavLink
      to={path}
      onPointerDown={handleTapIntent}
      onTouchStart={handleTapIntent}
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
