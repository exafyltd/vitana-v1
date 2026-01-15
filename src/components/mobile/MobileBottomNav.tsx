import { NavLink, useLocation } from "react-router-dom";
import { Calendar, Briefcase, Radio, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { VitanalandPortalSeed } from "@/components/audio/VitanalandPortalSeed";
import { useVitanalandNavigation } from "@/context/VitanalandNavigationContext";
import { useStreamingState } from "@/context/StreamingStateContext";
import { playSound } from "@/lib/playSound";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

const navItems = [
  { id: 'events', icon: Calendar, label: 'Events', path: '/comm/events-meetups', i18nKey: 'mobileNav.events' },
  { id: 'business', icon: Briefcase, label: 'Business', path: '/business', i18nKey: 'mobileNav.business' },
  { id: 'live', icon: Radio, label: 'Live', path: '/comm/live-rooms', i18nKey: 'mobileNav.live' },
  { id: 'profile', icon: User, label: 'Profile', path: '/me/profile', i18nKey: 'mobileNav.profile' },
];

/**
 * Mobile bottom navigation bar with integrated pop-out Vitana Orb.
 * 
 * Features:
 * - 4 navigation items (Events, Business, Live, Profile)
 * - Central Vitana Orb that "pops out" above the bar
 * - Glass/frosted background with blur
 * - Safe area inset support for notched devices
 */
export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { expandToFull, orbVisible } = useVitanalandNavigation();
  const { setAudioOverlayVisible } = useStreamingState();
  
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
    '/payment-checkout',
    '/kyc-verification',
  ];
  
  const shouldHideNav = hideNavRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
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
      {/* Glass background with refined quality */}
      <div className="relative flex items-end justify-around bg-background/95 backdrop-blur-3xl border-t border-foreground/8 pb-safe pt-2.5 px-1 shadow-[0_-1px_3px_0_hsl(var(--foreground)/0.03)]">
        {/* Left nav items: Events, Business */}
        {leftItems.map((item) => (
          <NavItem key={item.id} {...item} i18nKey={item.i18nKey} />
        ))}
        
        {/* Center Orb - elevated "pop-out" design */}
        <div className="relative flex items-center justify-center" style={{ width: '56px' }}>
          {/* Orb container - positioned ~20px higher for pop-out effect */}
          <motion.div 
            className="absolute -top-12"
            whileTap={{ scale: 0.95 }}
          >
            {/* Invisible aura - stronger contrast boost, heavily blurred, no visible edges */}
            <div 
              className="absolute inset-0 -m-[44px] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 100% 90% at 50% 50%, hsl(var(--background) / 1) 0%, hsl(var(--background) / 0.65) 28%, hsl(var(--background) / 0.22) 52%, transparent 78%)',
                filter: 'blur(22px)',
              }}
            />
            
            {/* The Orb itself - floating with enhanced shadow for depth */}
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
              className="relative cursor-pointer z-10"
              style={{
                filter: 'drop-shadow(0 4px 12px hsl(var(--background) / 0.4)) drop-shadow(0 2px 4px hsl(var(--background) / 0.3))',
              }}
            >
              <VitanalandPortalSeed 
                audioState="idle"
                volumeLevel={0}
                size="nav"
                layoutId="vitana-orb-nav"
              />
            </div>
          </motion.div>
          
          {/* Spacer to maintain layout */}
          <div className="h-10" />
        </div>
        
        {/* Right nav items: Live, Profile */}
        {rightItems.map((item) => (
          <NavItem key={item.id} {...item} i18nKey={item.i18nKey} />
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
}

function NavItem({ icon: Icon, label, path, i18nKey }: NavItemProps) {
  const { translate } = useTranslation();
  
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-1 px-3 py-1.5 min-w-[60px] transition-colors duration-200",
          isActive 
            ? "text-foreground" 
            : "text-muted-foreground hover:text-foreground/80"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon 
            className={cn(
              "w-5 h-5 transition-opacity duration-200",
              isActive ? "opacity-100" : "opacity-60"
            )} 
          />
          <span 
            className={cn(
              "text-[11px] font-semibold tracking-wide transition-opacity duration-200",
              isActive ? "opacity-100" : "opacity-60"
            )}
            style={{
              textShadow: '0 0.5px 1px hsl(var(--background) / 0.6)'
            }}
          >
            {translate(i18nKey ?? '', label)}
          </span>
        </>
      )}
    </NavLink>
  );
}
