import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useRef, useState } from "react";
import { Bot, CalendarClock, MessageSquare, Search, Settings, Activity, LayoutDashboard, Play, Square, Bell, User, Heart, Wallet, Share2, Database, Shield, LogOut, Zap } from "lucide-react";
import { StreamingChat, StreamingChatRef } from "@/components/StreamingChat";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ProfileDrawer } from "@/components/profile/ProfileDrawer";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/hooks/useTenant";
import { useProfile } from "@/context/ProfileProvider";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/localStorage";

const sidebarCategories = [
  { title: "Home", path: "/home", icon: LayoutDashboard },
  { title: "Community", path: "/community", icon: MessageSquare },
  { title: "Discover", path: "/discover", icon: Search },
  { title: "Inbox", path: "/inbox", icon: MessageSquare },
  { title: "Health", path: "/health", icon: Heart },
  { title: "Wallet", path: "/wallet", icon: Wallet },
  { title: "Sharing", path: "/sharing", icon: Share2 },
  { title: "Memory", path: "/memory", icon: Database },
  { title: "Settings", path: "/settings", icon: Settings },
  { title: "Admin", path: "/admin", icon: Shield },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppSidebar({ streamingChatRef }: { streamingChatRef: React.RefObject<StreamingChatRef> }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [autopilotPopupOpen, setAutopilotPopupOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { open } = useSidebar();
  const { role, hasPermission } = useRole();
  const { tenant } = useTenant();
  const { profile } = useProfile();
  const { pendingCount, getLatestActions } = useAutopilot();

  // Filter sidebar items based on role permissions
  const visibleSidebarCategories = sidebarCategories.filter(cat => {
    if (cat.title === "Admin") {
      return hasPermission("staff");
    }
    return true;
  });

  // Check if current path matches category (including subpages)
  const isActivePath = (categoryPath: string) => {
    return location.pathname === categoryPath || location.pathname.startsWith(categoryPath + "/");
  };

  const handleStreamToggle = () => {
    console.log('Stream toggle clicked, current isStreaming:', isStreaming);
    if (isStreaming) {
      streamingChatRef.current?.deactivateVideo();
    } else {
      streamingChatRef.current?.activateVideo();
    }
    // Force immediate sync
    setTimeout(() => {
      const active = streamingChatRef.current?.isStreamingActive?.();
      console.log('After timeout, active state:', active);
      setIsStreaming(!!active);
    }, 10);
  };

  useEffect(() => {
    console.log('isStreaming state changed to:', isStreaming);
    const interval = setInterval(() => {
      const active = streamingChatRef.current?.isStreamingActive?.();
      if (typeof active === "boolean" && active !== isStreaming) {
        console.log('Syncing state: active =', active, 'isStreaming =', isStreaming);
        setIsStreaming(active);
      }
    }, 150);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const buttonLabel = isStreaming ? "End Stream" : "Start Stream";
  const buttonIcon = isStreaming ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />;

  return (
    <Sidebar collapsible="icon" className="bg-sidebar rounded-r-2xl border-r shadow-lg">
      <SidebarHeader className="border-b border-sidebar-border rounded-tr-2xl">
        <div className="px-2 py-1 text-lg font-bold tracking-wide flex items-center justify-between">
          <Link to="/" className="rounded-lg p-2 hover:bg-sidebar-accent transition-colors">
            {open ? "VITANA" : "V"}
          </Link>
          {/* Dedicated Autopilot Cluster */}
          <div className={`bg-[#2A2A2A] rounded-lg p-1.5 flex items-center transition-all duration-200 max-w-full ${
            open ? 'gap-2 flex-row' : 'flex-col gap-1 w-12'
          }`}>
            {/* Unified Autopilot Button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`relative shrink-0 transition-all duration-200 hover:bg-white/10 flex items-center gap-2 ${
                    open ? 'h-8 px-3 rounded-lg justify-start' : 'h-8 w-8 rounded-full justify-center'
                  }`}
                  title={`${pendingCount} Autopilot suggestions`}
                >
                  <Zap className={`text-calendar-primary drop-shadow-sm transition-all duration-200 ${
                    open ? 'h-4 w-4' : 'h-4 w-4'
                  }`} style={{ filter: 'drop-shadow(0 0 4px rgb(168 85 247 / 0.6))' }} />
                  {open && (
                    <span className="text-sm font-medium text-sidebar-foreground/90 transition-opacity duration-200 truncate">
                      Autopilot
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className={`absolute -top-1 -right-1 p-0 text-xs font-bold leading-none flex items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-all duration-200 ${
                        open ? 'h-4 w-4 text-[10px] min-w-[16px]' : 'h-4 w-4 text-[10px] min-w-[16px]'
                      }`}
                    >
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-calendar-primary" />
                    <h3 className="font-medium">Autopilot Preview</h3>
                  </div>
                  <div className="space-y-2">
                    {getLatestActions(2).map((action) => (
                      <div key={action.id} className="p-2 rounded-lg bg-muted/50 text-sm">
                        <div className="font-medium">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.reason}</div>
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={() => setAutopilotPopupOpen(true)} 
                    className="w-full" 
                    size="sm"
                  >
                    View All ({pendingCount})
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Sidebar Toggle Chevron */}
            <SidebarTrigger className={`shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/10 transition-all duration-200 ${
              open ? 'rounded-lg ml-auto h-6 w-6' : 'rounded h-4 w-4 opacity-70 hover:opacity-100'
            }`} />
          </div>
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
                {visibleSidebarCategories.map((cat) => {
                  const isActive = isActivePath(cat.path);
                  return (
                    <SidebarMenuItem key={cat.title}>
                      <SidebarMenuButton asChild>
                        <Link 
                          to={cat.path} 
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
                    <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-800 font-semibold">
                      {profile.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="leading-tight flex-1 text-left">
                    <div className="text-sm font-medium">{profile.displayName}</div>
                    <div className="text-xs text-sidebar-foreground/50 capitalize">
                      {profile.role} Member
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
  const { tenant } = useTenant();
  
  // Controlled sidebar state with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = getLocalStorageItem(tenant.id, "sidebar", "open");
    return stored === "true";
  });

  // Persist sidebar state changes to localStorage
  const handleSidebarOpenChange = (open: boolean) => {
    setSidebarOpen(open);
    setLocalStorageItem(tenant.id, "sidebar", "open", open.toString());
  };

  // Initialize sidebar state from localStorage on mount
  useEffect(() => {
    const stored = getLocalStorageItem(tenant.id, "sidebar", "open");
    if (stored !== null) {
      setSidebarOpen(stored === "true");
    }
  }, [tenant.id]);

  return (
    <div>
      <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
        <div className="flex min-h-screen w-full">
          <div className="dark">
            <AppSidebar streamingChatRef={streamingChatRef} />
          </div>

          <SidebarInset>
            <div className="bg-background min-h-screen w-full rounded-tl-2xl">
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <AutopilotPopup 
        open={autopilotPopupOpen} 
        onOpenChange={setAutopilotPopupOpen} 
      />
      <StreamingChat ref={streamingChatRef} />
    </div>
  );
}