import { NavLink, useLocation } from "react-router-dom";
import { Calendar, Mail, Radio, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { VitanalandPortalSeed } from "@/components/audio/VitanalandPortalSeed";
import { useVitanalandNavigation } from "@/context/VitanalandNavigationContext";
import { playSound } from "@/lib/playSound";
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
 * Mobile bottom navigation bar with integrated pop-out Vitana Orb.
 * 
 * Z-Index Layering:
 * - Nav container: z-50 (base)
 * - Orb aura: z-[51] (above container, below labels)
 * - Nav labels/icons: z-[52] (above aura, readable)
 * - Orb itself: z-[53] (topmost, always visible)
 */
export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { orbVisible } = useVitanalandNavigation();
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
  
  // Only render on mobile and when not on hidden routes
  if (!isMobile || shouldHideNav) {
    return null;
  }
  
  const handleOrbClick = () => {
    playSound("/sounds/vitanaland/spark-chime.mp3", 0.12);
    expandToFull();
    setTimeout(() => {
      setAudioOverlayVisible(true);
    }, 100);
  };
  
  // Split nav items for left and right sides of the orb
  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);
  
  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      {/* Glass background - base layer */}
      <div className="relative flex items-end justify-around bg-background/95 backdrop-blur-3xl border-t border-foreground/8 pb-safe pt-2 px-1 shadow-[0_-1px_3px_0_hsl(var(--foreground)/0.03)]">
        
        {/* Orb aura layer removed - no external glow */}
        
        {/* Left nav items - z-[52], ABOVE aura */}
        <div className="relative z-[52] flex items-center">
          {leftItems.map((item) => (
            <NavItem
              key={item.id}
              {...item}
              i18nKey={item.i18nKey}
              unreadCount={item.id === 'inbox' ? unreadCount : 0}
            />
          ))}
        </div>
        
        {/* Center Orb container */}
        <div className="relative flex items-center justify-center" style={{ width: '56px' }}>
          {/* Orb - z-[53], topmost layer */}
          <motion.div 
            className="absolute -top-12 z-[53]"
            whileTap={{ scale: 0.95 }}
          >
            <div 
              role="button"
              tabIndex={0}
              onClick={handleOrbClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOrbClick();
                }
              }}
              aria-label="Ask VITANA for guidance"
              className="relative cursor-pointer"
            >
              <VitanalandPortalSeed 
                audioState="idle"
                volumeLevel={0}
                size="nav"
                layoutId="vitana-orb-nav"
                glowIntensity={0}
              />
            </div>
          </motion.div>
          
          {/* Spacer to maintain layout */}
          <div className="h-9" />
        </div>
        
        {/* Right nav items - z-[52], ABOVE aura */}
        <div className="relative z-[52] flex items-center">
          {rightItems.map((item) => (
            <NavItem
              key={item.id}
              {...item}
              i18nKey={item.i18nKey}
              unreadCount={item.id === 'inbox' ? unreadCount : 0}
            />
          ))}
        </div>
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
          "flex flex-col items-center gap-0.5 px-3 py-1 min-w-[60px] transition-all duration-200"
        )
      }
    >
      {({ isActive }) => (
        <div className="relative flex flex-col items-center">
          {/* Icon - black, opacity varies */}
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

          {/* Label - always black, readable */}
          <span
            className={cn(
              "text-[12px] tracking-tight text-black dark:text-white transition-opacity duration-200",
              isActive ? "font-semibold opacity-100" : "font-medium opacity-60"
            )}
          >
            {translate(i18nKey ?? '', label)}
          </span>

          {/* Active indicator - centered underline */}
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
