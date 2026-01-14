import { NavLink, useLocation } from "react-router-dom";
import { Calendar, Briefcase, Radio, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { VitanalandPortalSeed } from "@/components/audio/VitanalandPortalSeed";
import { useVitanalandNavigation } from "@/context/VitanalandNavigationContext";
import { useStreamingState } from "@/context/StreamingStateContext";
import { playSound } from "@/lib/playSound";
import { motion } from "framer-motion";

const navItems = [
  { id: 'events', icon: Calendar, label: 'Events', path: '/comm/events-meetups' },
  { id: 'business', icon: Briefcase, label: 'Business', path: '/business' },
  { id: 'live', icon: Radio, label: 'Live', path: '/comm/live-rooms' },
  { id: 'profile', icon: User, label: 'Profile', path: '/me/profile' },
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
      <div className="relative flex items-end justify-around bg-background/80 backdrop-blur-xl border-t border-border/50 pb-safe pt-2 px-1">
        {/* Left nav items: Events, Business */}
        {leftItems.map((item) => (
          <NavItem key={item.id} {...item} />
        ))}
        
        {/* Center Orb - elevated "pop-out" design */}
        <div className="relative flex items-center justify-center" style={{ width: '72px' }}>
          {/* Orb container - positioned to pop above the bar */}
          <motion.div 
            className="absolute -top-5"
            whileTap={{ scale: 0.95 }}
          >
            {/* Background circle for visual connection to nav bar */}
            <div className="absolute inset-0 -m-1.5 rounded-full bg-background border border-border/30 shadow-lg" />
            
            {/* The Orb itself */}
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
              className="relative cursor-pointer p-1"
            >
              <VitanalandPortalSeed 
                audioState="idle"
                volumeLevel={0}
                size="sm"
                layoutId="vitana-orb-nav"
              />
            </div>
          </motion.div>
          
          {/* Spacer to maintain layout */}
          <div className="h-12" />
        </div>
        
        {/* Right nav items: Live, Profile */}
        {rightItems.map((item) => (
          <NavItem key={item.id} {...item} />
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
}

function NavItem({ icon: Icon, label, path }: NavItemProps) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[60px] transition-colors",
          isActive 
            ? "text-primary" 
            : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}
