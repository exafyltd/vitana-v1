import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useRef, useState } from "react";
import { Bot, CalendarClock, MessageSquare, Search, Settings, Activity, LayoutDashboard, Play, Square, Bell, User, Heart, Wallet, Share2, Database, Shield, LogOut, Plane, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StreamingChat, StreamingChatRef } from "@/components/StreamingChat";
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
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/localStorage";
import { getRoleNavigation } from "@/config/role-navigation";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import PendingCalendarEventProcessor from "@/components/calendar/PendingCalendarEventProcessor";

// Dynamic navigation based on user role - removed static sidebar categories

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppSidebar({ 
  streamingChatRef, 
  autopilotPopupOpen, 
  setAutopilotPopupOpen, 
  walletPopupOpen,
  setWalletPopupOpen,
  onSidebarOpenChange 
}: { 
  streamingChatRef: React.RefObject<StreamingChatRef>;
  autopilotPopupOpen: boolean;
  setAutopilotPopupOpen: (open: boolean) => void;
  walletPopupOpen: boolean;
  setWalletPopupOpen: (open: boolean) => void;
  onSidebarOpenChange: (open: boolean) => void;
}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { open } = useSidebar();
  const { currentRole, hasPermission } = useRole();
  const { tenant, isExafyAdmin, activeTenantId } = useTenant();
  const { profile } = useProfile();
  const { pendingCount, getLatestActions } = useAutopilot();
  const { signOut, user } = useAuth();

  // Get dynamic navigation based on current role
  const sidebarCategories = getRoleNavigation(currentRole);

  // Check if current path matches category (including subpages)
  const isActivePath = (categoryPath: string) => {
    return location.pathname === categoryPath || location.pathname.startsWith(categoryPath + "/");
  };

  const handleStreamToggle = () => {
    if (isStreaming) {
      streamingChatRef.current?.deactivateVideo();
    } else {
      streamingChatRef.current?.activateVideo();
    }
    // Force immediate sync
    setTimeout(() => {
      const active = streamingChatRef.current?.isStreamingActive?.();
      setIsStreaming(!!active);
    }, 10);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const active = streamingChatRef.current?.isStreamingActive?.();
      if (typeof active === "boolean" && active !== isStreaming) {
        setIsStreaming(active);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [isStreaming]);

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
    console.log('getTenantDisplayName called - isExafyAdmin:', isExafyAdmin, 'tenant:', tenant, 'path:', window.location.pathname);
    
    // Show "Exafy" for Exafy admins
    if (isExafyAdmin) {
      return 'Exafy';
    }
    
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

  const buttonLabel = isStreaming ? "End Stream" : "Start Stream";
  const buttonIcon = isStreaming ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />;

  return (
    <Sidebar collapsible="icon" className="bg-sidebar rounded-r-2xl border-r shadow-lg">
      <SidebarHeader className="border-b border-sidebar-border rounded-tr-2xl">
        <div className="px-2 py-1 text-lg font-bold tracking-wide flex items-center justify-between">
          <button 
            onClick={handleLogoClick}
            className="rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-left"
          >
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-wide">
                {open ? "VITANA" : "V"}
              </span>
              {open && (
                <span className="text-xs text-sidebar-foreground/50 font-normal -mt-1">
                  {getTenantDisplayName()}
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
                  className="h-8 w-8 p-0 hover:bg-sidebar-accent text-white rounded-lg transition-colors ml-2"
                  onClick={() => onSidebarOpenChange(!open)}
                  aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{open ? "Collapse" : "Expand"} sidebar (⌘/Ctrl+B)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Utility Icons - only show when sidebar is open */}
          {open && (
            <div className="flex items-center space-x-1 ml-4 pr-2">
              {/* Calendar Button - Today's Overview */}
              <div 
                className="relative shrink-0 transition-all duration-200"
                title="Calendar & Events - Today's overview"
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
              
              {/* Wallet Button */}
              <Button 
                variant="ghost" 
                className="relative shrink-0 transition-all duration-200 hover:bg-sidebar-accent flex items-center justify-center h-8 w-8 rounded-lg"
                title="Digital Wallet"
                onClick={() => setWalletPopupOpen(true)}
              >
                <Wallet className="h-4 w-4 text-white" />
              </Button>
              
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
                              {cat.title}
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
      <SidebarFooter className="sticky bottom-24 bg-sidebar border-t rounded-tr-2xl">
        <div className="px-2 py-3 space-y-3">
          {open ? (
            <Button 
              onClick={handleStreamToggle} 
              className={`w-full justify-center rounded-xl shadow-sm hover:shadow-md transition-all ${
                isStreaming ? "bg-ruby text-white hover:bg-ruby/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {buttonIcon}
              <span>{buttonLabel}</span>
            </Button>
          ) : (
            <Button 
              onClick={handleStreamToggle} 
              size="icon"
              className={`w-10 h-10 rounded-full shadow-sm hover:shadow-md transition-all mx-auto ${
                isStreaming ? "bg-ruby text-white hover:bg-ruby/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {buttonIcon}
            </Button>
          )}
          
          {open ? (
            <ProfileDrawer
              trigger={
                <button className="flex items-center gap-2 py-1 rounded-xl p-2 hover:bg-sidebar-accent/50 transition-all hover:shadow-sm relative group w-full">
                  <Avatar className="h-8 w-8 ring-1 ring-sidebar-border">
                    <AvatarImage src={profile.avatar} alt={profile.displayName} />
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
                    <AvatarImage src={profile.avatar} alt={profile.displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-800 font-semibold text-xs">
                      {profile.initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              }
            />
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const streamingChatRef = useRef<StreamingChatRef>(null);
  const [autopilotPopupOpen, setAutopilotPopupOpen] = useState(false);
  const [walletPopupOpen, setWalletPopupOpen] = useState(false);
  const { tenant } = useTenant();
  
  // Controlled sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = getLocalStorageItem(tenant?.id || "global", "sidebar", "open");
    return stored === "true";
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
      if (stored !== null) {
        setSidebarOpen(stored === "true");
      }
    }
  }, [tenant?.id]);

  return (
    <div>
      <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
        <div className="flex min-h-screen w-full">
          <div className="dark">
            <AppSidebar 
              streamingChatRef={streamingChatRef} 
              autopilotPopupOpen={autopilotPopupOpen}
              setAutopilotPopupOpen={setAutopilotPopupOpen}
              walletPopupOpen={walletPopupOpen}
              setWalletPopupOpen={setWalletPopupOpen}
              onSidebarOpenChange={handleSidebarOpenChange}
            />
          </div>

          <SidebarInset>
            <div className="bg-background min-h-screen w-full rounded-tl-2xl">
              <PendingCalendarEventProcessor />
              {children}
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
       <StreamingChat ref={streamingChatRef} />
       {/* Processes queued calendar events after sign-in */}
       <div className="hidden">
         {/* Keep DOM clean while mounting the processor */}
         {/* eslint-disable-next-line jsx-a11y/heading-has-content */}
       </div>
    </div>
  );
}