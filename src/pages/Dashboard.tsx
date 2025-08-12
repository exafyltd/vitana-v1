import { Link } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Bot, CalendarClock, MessageSquare, Search, Settings, Shield, Stethoscope, Activity, LayoutDashboard, Play, Square, Video } from "lucide-react";
import SEO from "@/components/SEO";
import { StreamingChat, StreamingChatRef } from "@/components/StreamingChat";


const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Discover", url: "/dashboard/discover", icon: Search },
  { title: "Health & Biomarkers", url: "/dashboard/biomarkers", icon: Stethoscope },
  { title: "My Health Tracker", url: "/dashboard/tracker", icon: Activity },
  { title: "Appointments & Diary", url: "/dashboard/appointments", icon: CalendarClock },
  { title: "AI Intelligence", url: "/dashboard/ai", icon: Bot },
  { title: "Messages & Notifications", url: "/dashboard/messages", icon: MessageSquare },
  { title: "Admin & Staff Tools", url: "/dashboard/admin", icon: Shield },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export default function Dashboard() {
  const streamingChatRef = useRef<StreamingChatRef>(null);
  const [isStreaming, setIsStreaming] = useState(false);

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
    <div className="dark">{/* Apply dark theme only to the dashboard */}
      <SEO title="Dashboard | VITANA" description="VITANA Dashboard" canonical={window.location.href} />
      <SidebarProvider>
        <header className="h-12 flex items-center border-b bg-background px-2">
          <SidebarTrigger className="ml-1" />
          <Link to="/" className="ml-2 text-sm font-semibold">VITANA</Link>
        </header>
        <div className="flex min-h-screen w-full">
          <Sidebar collapsible="icon" className="bg-sidebar">
            <SidebarHeader>
              <div className="px-2 py-1 text-lg font-bold tracking-wide">VITANA</div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Main</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.slice(0, items.length - 1).map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink to={item.url} end className={({ isActive }) => isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}>
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>

                  {/* Space before Settings */}
                  <div className="mt-4" />
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to={items[items.length - 1].url} end className={({ isActive }) => isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}>
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>

                  {/* Start/End Stream button below menu */}
                  <div className="mt-6 px-2">
                    <Button onClick={handleStreamToggle} variant={isStreaming ? "destructive" : "default"} className="w-full justify-center">
                      {buttonIcon}
                      <span>{buttonLabel}</span>
                    </Button>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator />
            <SidebarFooter>
              <div className="flex items-center gap-2 px-2 py-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>VA</AvatarFallback>
                </Avatar>
                <div className="leading-tight">
                  <div className="text-sm font-medium">Vitana User</div>
                  <div className="text-xs text-muted-foreground">user@vitana.app</div>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset>
            <div className="p-6">
              {/* Empty content for now */}
              <div className="rounded-lg border bg-card p-6 text-muted-foreground">
                Content area will be built after sidebar logic is finalized.
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <StreamingChat ref={streamingChatRef} />
    </div>
  );
}
