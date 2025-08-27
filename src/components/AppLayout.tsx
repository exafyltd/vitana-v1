import { Link, NavLink, useLocation } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useRef, useState } from "react";
import { Bot, CalendarClock, MessageSquare, Search, Settings, Activity, LayoutDashboard, Play, Square, Bell, User, Heart, Wallet, Share2, Database, Shield } from "lucide-react";
import { StreamingChat, StreamingChatRef } from "@/components/StreamingChat";
import { GlobalSearch } from "@/components/GlobalSearch";

const sidebarCategories = [
  { title: "Home", path: "/dashboard", icon: LayoutDashboard },
  { title: "Community", path: "/community", icon: MessageSquare },
  { title: "Discover", path: "/discover", icon: Search },
  { title: "Inbox", path: "/messages", icon: Bell },
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
  const location = useLocation();
  const { open } = useSidebar();

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
          <SidebarTrigger className="rounded-lg hover:bg-sidebar-accent" />
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
            <Link 
              to="/profile" 
              className="flex items-center gap-2 py-1 rounded-xl p-2 hover:bg-sidebar-accent/50 transition-all hover:shadow-sm"
            >
              <Avatar className="h-8 w-8 ring-1 ring-sidebar-border">
                <AvatarFallback>VA</AvatarFallback>
              </Avatar>
              <div className="leading-tight flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">Vitana User</div>
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-green-600">742</span>
                  </div>
                </div>
                <div className="text-xs text-sidebar-foreground/70">Premium Member</div>
              </div>
            </Link>
          ) : (
            <Link 
              to="/profile" 
              className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white hover:bg-black/80 transition-all mx-auto"
            >
              <User className="h-4 w-4" />
            </Link>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const streamingChatRef = useRef<StreamingChatRef>(null);

  return (
    <div>
      <SidebarProvider>
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
      <StreamingChat ref={streamingChatRef} />
    </div>
  );
}