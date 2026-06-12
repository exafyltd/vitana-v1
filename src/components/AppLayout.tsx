import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarPositionStyle } from "@/lib/avatarPosition";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useRef, useState } from "react";
import { Bot, CalendarClock, MessageSquare, Search, Settings, Activity, LayoutDashboard, Play, Square, Bell, User, Heart, Wallet, Share2, Database, Shield, LogOut, Plane, Calendar, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { GlobalSearch } from "@/components/GlobalSearch";
import { ProfileDrawer } from "@/components/profile/ProfileDrawer";
import NotificationBell from "@/components/NotificationBell";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/hooks/useTenant";
import { useProfile } from "@/context/ProfileProvider";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { WalletPopup } from "@/components/WalletPopup";
import { DesktopVitanaIndexChip } from "@/components/health/DesktopVitanaIndexChip";
import { VitanaIndexSheet } from "@/components/health/VitanaIndexSheet";
import { VitanaIndexLiftWatcher } from "@/components/health/VitanaIndexLiftWatcher";
import { InviteSheet } from "@/components/InviteSheet";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/localStorage";
import { getRoleNavigation } from "@/config/role-navigation";
import { useRoleRouteEnforcement, useInitialLandingRedirect } from "@/hooks/useSmartRouting";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import PendingCalendarEventProcessor from "@/components/calendar/PendingCalendarEventProcessor";
import { useUniversalCart } from "@/hooks/useUniversalCart";
// Phase 0: CartSidebar is retired from the buy path — the cart icon now
// navigates to /universal-cart (the one canonical cart). CartSidebar.tsx is
// kept on disk but no longer mounted.
import { useIntelligentGreeting } from "@/hooks/useIntelligentGreeting";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { playSound } from "@/lib/playSound";
import { SoundscapeControl } from "@/components/audio/SoundscapeControl";
import { useBackgroundPrefetch } from "@/hooks/useBackgroundPrefetch";
import { useBackgroundRefresh } from "@/hooks/useBackgroundRefresh";
import { useIsMobile } from "@/hooks/use-mobile";

import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { useGuidedMode } from "@/context/GuidedModeProvider"; // VTID-03279
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { useTranslation } from "@/hooks/useTranslation";
import { isIAPRestricted } from "@/lib/appilix";
import { t } from '@/lib/i18n-toast';

// Dynamic navigation based on user role - removed static sidebar categories

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppSidebar({ 
  autopilotPopupOpen, 
  setAutopilotPopupOpen, 
  walletPopupOpen,
  setWalletPopupOpen,
  onSidebarOpenChange
}: {
  autopilotPopupOpen: boolean;
  setAutopilotPopupOpen: (open: boolean) => void;
  walletPopupOpen: boolean;
  setWalletPopupOpen: (open: boolean) => void;
  onSidebarOpenChange: (open: boolean) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { open } = useSidebar();
  const { currentRole, hasPermission } = useRole();
  const { tenant, isExafyAdmin, activeTenantId } = useTenant();
  const { profile } = useProfile();
  const { pendingCount, getLatestActions } = useAutopilot();
  const { signOut, user } = useAuth();
  // Phase 0: counts from the one canonical cart (0 when roleBlocked).
  const { cartCount } = useUniversalCart();
  const { translate } = useTranslation();
  const isMobile = useIsMobile();

  // Navigation is derived from the URL path, NOT from the stored role.
  // This ensures the sidebar always matches the content area.
  const getEffectiveNavigation = () => {
    const path = location.pathname;
    if (path === '/admin' || path.startsWith('/admin/')) return getRoleNavigation('admin');
    if (path === '/staff' || path.startsWith('/staff/')) return getRoleNavigation('staff');
    if (path === '/professional' || path.startsWith('/professional/')) return getRoleNavigation('professional');
    if (path === '/patient' || path.startsWith('/patient/')) return getRoleNavigation('patient');
    // All other paths (e.g. /home, /comm, /discover) are community routes
    return getRoleNavigation('community');
  };
  const sidebarCategories = getEffectiveNavigation()
    .filter(cat => !(isIAPRestricted() && cat.path === '/wallet'));

  // Check if current path matches category (including subpages)
  // But exclude parent paths if a more specific sibling path matches
  const isActivePath = (categoryPath: string) => {
    const exactMatch = location.pathname === categoryPath;
    const prefixMatch = location.pathname.startsWith(categoryPath + "/");
    
    if (exactMatch) return true;
    
    if (prefixMatch) {
      // Check if there's a more specific navigation item that matches
      const hasMoreSpecificMatch = sidebarCategories.some(cat => 
        cat.path !== categoryPath && 
        cat.path.startsWith(categoryPath + "/") &&
        (location.pathname === cat.path || location.pathname.startsWith(cat.path + "/"))
      );
      
      // If a more specific item matches, don't highlight this (less specific) item
      if (hasMoreSpecificMatch) return false;
      
      return true;
    }
    
    return false;
  };

  const handleLogoClick = async () => {
    await signOut();
    // Redirect to tenant-specific portal page
    if (isExafyAdmin) {
      navigate("/exafy-admin");
    } else {
      switch (tenant?.slug) {
        case "maxina":
          navigate("/maxina");
          break;
        case "alkalma":
          navigate("/alkalma");
          break;
        case "earthlinks":
          navigate("/earthlinks");
          break;
        default:
          navigate("/");
          break;
      }
    }
  };

  const getTenantDisplayName = () => {
    // For portal routes, prioritize URL-based detection
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/maxina')) {
      return 'Maxina';
    } else if (currentPath.startsWith('/alkalma')) {
      return 'AlKalma';
    } else if (currentPath.startsWith('/earthlinks')) {
      return 'Earthlinks';
    }
    
    // For non-portal routes, check localStorage first (most reliable after tenant switch)
    const storedTenant = localStorage.getItem('tenant_slug');
    if (storedTenant) {
      if (storedTenant === 'earthlinks') return 'Earthlinks';
      if (storedTenant === 'maxina') return 'Maxina';
      if (storedTenant === 'alkalma') return 'AlKalma';
    }
    
    // Then check tenant context from database
    if (tenant?.name) {
      // Map database names to display names
      if (tenant.name === 'Earthlinks') return 'Earthlinks';
      if (tenant.name === 'Maxina') return 'Maxina';
      if (tenant.name === 'Alkalma') return 'AlKalma';
      return tenant.name;
    }
    
    // Check user session metadata as last resort
    if (user?.user_metadata?.tenant_slug) {
      const tenantSlug = user.user_metadata.tenant_slug;
      if (tenantSlug === 'earthlinks') return 'Earthlinks';
      if (tenantSlug === 'maxina') return 'Maxina';
      if (tenantSlug === 'alkalma') return 'AlKalma';
    }
    
    // Final fallback
    return 'Community';
  };


  return (
    <Sidebar collapsible="icon" className="bg-sidebar rounded-r-2xl border-r shadow-lg">
      <SidebarHeader className="border-b border-sidebar-border rounded-tr-2xl">
        {/* Two-Row Header Layout */}
        <div className="flex flex-col">
          {/* Row 1: Logo + Chevron Toggle */}
          <div className="px-2 py-1 flex items-center justify-between">
            <button 
              onClick={handleLogoClick}
              className="rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-left"
            >
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-wide">
                  {open ? "VITANA" : "V"}
                </span>
                {open && (
                  <span className="text-xs text-sidebar-foreground/50 font-normal -mt-1 flex items-center gap-1">
                    {getTenantDisplayName()}
                    {isExafyAdmin && <Shield className="h-3 w-3 text-slate-400" />}
                  </span>
                )}
              </div>
            </button>
            
            {/* Chevron Toggle Button - Always visible */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-sidebar-accent text-white rounded-lg transition-colors"
                    onClick={() => onSidebarOpenChange(!open)}
                    aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                  >
                    {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t('screens.common.value0SidebarctrlB', { value0: open ? "Collapse" : "Expand" })}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Row 2: Quick Actions - only show when sidebar is open and NOT on admin routes */}
          {open && !location.pathname.startsWith('/admin') && (
            <div className="flex items-center justify-end px-2 pb-2 space-x-1">
              {/* VITANA Index Chip - opens shared Index Sheet */}
              <DesktopVitanaIndexChip />

              {/* Calendar Button - Today's Overview */}
              <div
                className="relative shrink-0 transition-all duration-200"
                title={t('screens.common.calendarEventsTodaySOverview')}
              >
                <UniversalCalendarButton
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-white group-hover:text-primary transition-colors"
                  showEventCount={true}
                  showConflictIndicator={true}
                  showText={false}
                />
              </div>
              
              {/* Notification Bell */}
              <div className="relative shrink-0 transition-all duration-200">
                <NotificationBell />
              </div>
              
              {/* Wallet Button — hidden on iOS (prototype feature) */}
              {!isIAPRestricted() && (
              <Button
                variant="ghost"
                className="relative shrink-0 transition-all duration-200 hover:bg-sidebar-accent flex items-center justify-center h-8 w-8 rounded-lg"
                title={t('screens.common.digitalWallet')}
                onClick={() => setWalletPopupOpen(true)}
              >
                <Wallet className="h-4 w-4 text-white" />
              </Button>
              )}
              
              {/* Autopilot Button */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  className="relative shrink-0 transition-all duration-200 hover:bg-sidebar-accent flex items-center justify-center h-8 w-8 rounded-lg"
                  title={`Autopilot • ${pendingCount} suggestion${pendingCount !== 1 ? 's' : ''}`}
                  onClick={() => setAutopilotPopupOpen(true)}
                  aria-label={`Autopilot with ${pendingCount} pending suggestion${pendingCount !== 1 ? 's' : ''}`}
                >
                  <Plane className="h-4 w-4 text-white" />
                </Button>
                <NotificationBadge 
                  count={pendingCount} 
                  collapsed={!open}
                  ariaLabel={`${pendingCount} Autopilot suggestion${pendingCount !== 1 ? 's' : ''}`}
                />
              </div>

              {/* Shopping Cart Button */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  className="relative shrink-0 transition-all duration-200 hover:bg-sidebar-accent flex items-center justify-center h-8 w-8 rounded-lg"
                  title={`Shopping Cart • ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
                  onClick={() => navigate('/universal-cart')}
                  aria-label={`Shopping cart with ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
                >
                  <ShoppingCart className="h-4 w-4 text-white" />
                </Button>
                <NotificationBadge 
                  count={cartCount} 
                  collapsed={!open}
                  ariaLabel={`${cartCount} item${cartCount !== 1 ? 's' : ''} in cart`}
                />
              </div>
            </div>
          )}
        </div>
        {/* Global Search Bar */}
        <div className="px-2 pb-2">
          <GlobalSearch open={open} />
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <div className="flex-1 px-2 pb-32">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {sidebarCategories.map((cat) => {
                  const isActive = isActivePath(cat.path);
                  return (
                    <SidebarMenuItem key={cat.title}>
                      <SidebarMenuButton asChild>
                        <Link 
                          to={cat.path} 
                          onClick={() => {
                            // Open sidebar if collapsed when clicking navigation items
                            if (!open) {
                              onSidebarOpenChange(true);
                            }
                          }}
                          className={`relative flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 group ${
                            isActive 
                              ? "bg-primary/15 text-primary shadow-sm border border-primary/20" 
                              : "hover:bg-sidebar-accent/50 text-sidebar-foreground hover:text-foreground"
                          }`}
                        >
                          {/* Active indicator bar */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                          )}
                          <cat.icon className={`h-4 w-4 transition-colors ${
                            isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-foreground"
                          }`} />
                          {open && (
                            <span className={`font-medium transition-colors ${
                              isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-foreground"
                            }`}>
                              {translate(cat.i18nKey ?? '', cat.title)}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
      <SidebarFooter className="sticky bottom-0 bg-sidebar border-t rounded-tr-2xl">
        <div className="px-2 py-3 space-y-3">
          {/* User Profile */}
          {open ? (
            <ProfileDrawer
              trigger={
                <button className="flex items-center gap-2 py-1 rounded-xl p-2 hover:bg-sidebar-accent/50 transition-all hover:shadow-sm relative group w-full">
                  <Avatar className="h-8 w-8 ring-1 ring-sidebar-border">
                    <AvatarImage src={profile.avatar} alt={profile.displayName} style={avatarPositionStyle(profile.avatarOffsetX, profile.avatarOffsetY)} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-800 font-semibold">
                      {profile.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-tight flex-1 text-left">
                    <div className="text-sm font-medium">{profile.displayName}</div>
                    <div className="text-xs text-sidebar-foreground/50 capitalize">
                      {isExafyAdmin ? 'Exafy Admin' :
                       currentRole === 'admin' ? 'Administrator' : 
                       currentRole === 'staff' ? 'Staff' :
                       currentRole === 'professional' ? 'Professional' :
                       currentRole === 'patient' ? 'Patient' :
                       'Community Member'}
                    </div>
                  </div>
                </button>
              }
            />
          ) : (
            <ProfileDrawer
              trigger={
                <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-sidebar-accent/50 transition-all mx-auto">
                  <Avatar className="h-8 w-8 ring-1 ring-sidebar-border">
                    <AvatarImage src={profile.avatar} alt={profile.displayName} style={avatarPositionStyle(profile.avatarOffsetX, profile.avatarOffsetY)} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-800 font-semibold text-xs">
                      {profile.initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              }
            />
          )}
          
          {/* Soundscape Control */}
          <SoundscapeControl />

          {!isMobile && <div aria-hidden="true" className={open ? "h-28" : "h-16"} />}
          
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [autopilotPopupOpen, setAutopilotPopupOpen] = useState(false);
  const [walletPopupOpen, setWalletPopupOpen] = useState(false);
  const isMobile = useIsMobile();
  // VTID-03279: Guided Mode hides sidebar/menu. `isGuided` is mobile-only (the
  // provider forces Full chrome on desktop), so the desktop sidebar always shows.
  const { isGuided } = useGuidedMode();
  const { tenant } = useTenant();
  const { preferences } = useUserPreferences();
  const { triggerGreeting } = useIntelligentGreeting();

  // Enforce role-route alignment (admin on community routes → redirect, etc.)
  useRoleRouteEnforcement();

  // Land the native app on My Journey when it cold-starts on the News feed.
  useInitialLandingRedirect();

  // Background loading system
  useBackgroundPrefetch();
  useBackgroundRefresh();
  
  // Controlled sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = getLocalStorageItem(tenant?.id || "global", "sidebar", "open");
    return stored === null ? true : stored === "true";
  });

  // Persist sidebar state changes to localStorage
  const handleSidebarOpenChange = (open: boolean) => {
    setSidebarOpen(open);
    setLocalStorageItem(tenant?.id || "global", "sidebar", "open", open.toString());
  };

  // Initialize sidebar state from localStorage on mount
  useEffect(() => {
    if (tenant?.id) {
      const stored = getLocalStorageItem(tenant.id, "sidebar", "open");
      setSidebarOpen(stored === null ? true : stored === "true");
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (isMobile) {
      delete document.body.dataset.desktopSidebarState;
      return;
    }

    document.body.dataset.desktopSidebarState = sidebarOpen ? "expanded" : "collapsed";

    return () => {
      delete document.body.dataset.desktopSidebarState;
    };
  }, [isMobile, sidebarOpen]);

  // Global `autopilot:open` listener — lets any surface (Index Sheet,
  // notifications, voice, devtools) request the Autopilot popup without
  // prop-drilling. Mount-only so the handler isn't recreated per render.
  useEffect(() => {
    const handler = () => setAutopilotPopupOpen(true);
    window.addEventListener("autopilot:open", handler);
    return () => window.removeEventListener("autopilot:open", handler);
  }, []);

  return (
    <div>
      <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
        <div className="flex min-h-screen w-full overflow-x-hidden">
          {/* VTID-03279: Guided Mode hides the sidebar/menu (no dots, no drawer)
              on the MOBILE app. `isGuided` is false on desktop (provider gates
              it to mobile), so the desktop sidebar always renders. */}
          {!isGuided && (
            <div className="dark">
              <AppSidebar
                autopilotPopupOpen={autopilotPopupOpen}
                setAutopilotPopupOpen={setAutopilotPopupOpen}
                walletPopupOpen={walletPopupOpen}
                setWalletPopupOpen={setWalletPopupOpen}
                onSidebarOpenChange={handleSidebarOpenChange}
              />
            </div>
          )}

          <SidebarInset className="flex flex-col w-full overflow-x-hidden">
            <div className="flex flex-col h-full min-h-0 bg-background rounded-tl-2xl">
              <PendingCalendarEventProcessor />
              <main className="flex-1 min-h-0 overflow-hidden">
                <MobileAppShell>{children}</MobileAppShell>
              </main>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <AutopilotPopup
        open={autopilotPopupOpen}
        onOpenChange={setAutopilotPopupOpen}
      />
      <WalletPopup
        open={walletPopupOpen}
        onOpenChange={setWalletPopupOpen}
      />
      {/* Phase 0: CartSidebar retired — the cart icon navigates to /universal-cart. */}
      <VitanaIndexSheet />
      <VitanaIndexLiftWatcher />
      <InviteSheet />
       {/* Processes queued calendar events after sign-in */}
       <div className="hidden">
         {/* Keep DOM clean while mounting the processor */}
         {/* eslint-disable-next-line jsx-a11y/heading-has-content */}
       </div>
       
        {/* Mobile Bottom Navigation with integrated Orb */}
        <MobileBottomNav />
    </div>
  );
}