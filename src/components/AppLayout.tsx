import { Link, NavLink, useLocation } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useRef, useState } from "react";
import { Bot, CalendarClock, MessageSquare, Search, Settings, Activity, LayoutDashboard, Play, Square, Bell, User } from "lucide-react";
import { StreamingChat, StreamingChatRef } from "@/components/StreamingChat";

const sidebarCategories = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Discover", path: "/discover", icon: Search },
  { title: "Health Tracker", path: "/health", icon: Activity },
  { title: "Calendar", path: "/calendar", icon: CalendarClock },
  { title: "Community", path: "/community", icon: MessageSquare },
  { title: "AI Intelligence", path: "/ai", icon: Bot },
  { title: "Messages", path: "/messages", icon: Bell },
  { title: "Settings", path: "/settings", icon: Settings },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppSidebar() {
  const streamingChatRef = useRef<StreamingChatRef>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const location = useLocation();
  const { open } = useSidebar();

  const handleStreamToggle = () => {
    if (isStreaming) {
      streamingChatRef.current?.deactivateVideo();
      setIsStreaming(false);
    } else {
      streamingChatRef.current?.activateVideo();
      setIsStreaming(true);
    }
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
      </SidebarHeader>
      <SidebarContent className="flex flex-col">
        <div className="flex-1 px-2 pb-32">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {sidebarCategories.map((cat) => (
                  <SidebarMenuItem key={cat.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={cat.path} 
                        className={({ isActive }) => 
                          `flex items-center gap-3 rounded-xl px-3 py-2 transition-all hover:bg-sidebar-accent/80 ${
                            isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "hover:bg-sidebar-accent/50"
                          }`
                        }
                      >
                        <cat.icon className="h-4 w-4" />
                        {open && <span>{cat.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
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
              variant={isStreaming ? "destructive" : "default"} 
              className="w-full justify-center rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              {buttonIcon}
              <span>{buttonLabel}</span>
            </Button>
          ) : (
            <Button 
              onClick={handleStreamToggle} 
              variant={isStreaming ? "destructive" : "default"}
              size="icon"
              className={`w-10 h-10 rounded-full shadow-sm hover:shadow-md transition-all mx-auto ${
                isStreaming ? "bg-red-600 text-white hover:bg-red-700" : "bg-black text-white hover:bg-black/80"
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
              <div className="leading-tight">
                <div className="text-sm font-medium">Vitana User</div>
                <div className="text-xs text-sidebar-foreground/70">user@vitana.app</div>
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
  return (
    <div>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <div className="dark">
            <AppSidebar />
          </div>

          <SidebarInset>
            <div className="bg-background min-h-screen w-full rounded-tl-2xl">
              {children}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <StreamingChat />
    </div>
  );
}