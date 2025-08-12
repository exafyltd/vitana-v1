import { Link } from "react-router-dom";
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Bot, CalendarClock, MessageSquare, Search, Settings, Shield, Stethoscope, Activity, LayoutDashboard, Play, Square, Video, Bell } from "lucide-react";
import SEO from "@/components/SEO";
import { StreamingChat, StreamingChatRef } from "@/components/StreamingChat";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";


const sidebarData = [
  {
    title: "Dashboard",
    items: [
      { id: 1, name: "Community Member" },
      { id: 5, name: "Dual-Role Toggle Variant" },
      { id: 6, name: "AI Companion Daily Summary" },
    ],
  },
  {
    title: "Discover (Shop & Services)",
    items: [
      { id: 7, name: "Landing (intent-aware)" },
      { id: 8, name: "Doctors & Coaches Directory" },
      { id: 9, name: "Wellness Services Catalog" },
      { id: 10, name: "Event Booking (public)" },
      { id: 11, name: "Matchmaking Suggestions for Services" },
      { id: 12, name: "Contextual Search Results" },
      { id: 13, name: "Shop Landing" },
      { id: 14, name: "Product/Service Detail + Checkout + Order History" },
    ],
  },
  {
    title: "My Health Tracker",
    items: [
      { id: 22, name: "Tracker Overview + Weekly Score" },
      { id: 23, name: "Nutrition Tracker" },
      { id: 24, name: "Hydration Tracker" },
      { id: 25, name: "Sleep Tracker" },
      { id: 26, name: "Exercise Tracker" },
      { id: 27, name: "Mental Health Check-in" },
      { id: 28, name: "Weekly Balance Summary" },
      { id: 29, name: "VITANA Index Overview" },
      { id: 30, name: "VITANA Index Breakdown" },
      { id: 31, name: "VITANA Index Social Impact" },
      { id: 32, name: "AI Tips & Nudges" },
    ],
  },
  {
    title: "Appointments & Diary",
    items: [
      { id: 33, name: "Calendar View" },
      { id: 34, name: "Appointment/Diary Detail" },
      { id: 35, name: "Quick Add (role-adaptive)" },
    ],
  },
  {
    title: "Community & Social",
    items: [
      { id: 38, name: "My Groups" },
      { id: 39, name: "Group Detail & Chat" },
      { id: 40, name: "Community Feed" },
      { id: 41, name: "Events Calendar" },
      { id: 42, name: "Create/Join Group" },
      { id: 43, name: "Meetup Recommendations" },
      { id: 44, name: "Video Feed (shorts)" },
      { id: 45, name: "Music & Podcast Hub" },
      { id: 46, name: "Live Rooms Directory" },
      { id: 47, name: "Live Room – Viewer Mode" },
      { id: 48, name: "Live Room – Host Mode" },
      { id: 49, name: "Live Room – Settings & Privacy" },
      { id: 50, name: "Live Room – Chat & Reactions Overlay" },
      { id: 51, name: "Live Room – Replay Library" },
      { id: 52, name: "Live Room – Scheduling" },
    ],
  },
  {
    title: "AI Intelligence",
    items: [
      { id: 53, name: "Personal AI Timeline" },
      { id: 54, name: "Agent Prompt Center" },
      { id: 55, name: "Automation Rules/Triggers" },
    ],
  },
  {
    title: "Messages & Notifications",
    items: [
      { id: 59, name: "Inbox Overview" },
      { id: 60, name: "Conversation Thread (AI/Human)" },
      { id: 61, name: "Notification Center" },
    ],
  },
  {
    title: "Settings",
    items: [
      { id: 68, name: "Personal Preferences" },
      { id: 69, name: "Privacy & Consent" },
      { id: 70, name: "Connected Apps & Integrations" },
      { id: 71, name: "Tenant & Role Switcher" },
    ],
  },
]


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
    <div>
      <SEO title="Dashboard | VITANA" description="VITANA Dashboard" canonical={window.location.href} />
      <SidebarProvider>
        <header className="h-12 flex items-center border-b bg-background px-2">
          <SidebarTrigger className="ml-1" />
          <Link to="/" className="ml-2 text-sm font-semibold">VITANA</Link>
        </header>
        <div className="flex min-h-screen w-full">
          <div className="dark">
            <Sidebar collapsible="icon" className="bg-sidebar">
              <SidebarHeader>
                <div className="px-2 py-1 text-lg font-bold tracking-wide"><Link to="/">VITANA</Link></div>
              </SidebarHeader>
              <SidebarContent className="flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2 pb-32">
                  {/* Accordion categories */}
                  <Accordion type="multiple" className="px-2">
                    {sidebarData.map((cat, idx) => (
                      <AccordionItem key={cat.title} value={`cat-${idx}`}>
<AccordionTrigger className="text-sm">
                          <span className="flex items-center gap-2">
                            {cat.title === "Dashboard" && <LayoutDashboard className="h-4 w-4" />}
                            {cat.title === "Discover (Shop & Services)" && <Search className="h-4 w-4" />}
                            {cat.title === "My Health Tracker" && <Activity className="h-4 w-4" />}
                            {cat.title === "Appointments & Diary" && <CalendarClock className="h-4 w-4" />}
                            {cat.title === "Community & Social" && <MessageSquare className="h-4 w-4" />}
                            {cat.title === "AI Intelligence" && <Bot className="h-4 w-4" />}
                            {cat.title === "Messages & Notifications" && <Bell className="h-4 w-4" />}
                            {cat.title === "Settings" && <Settings className="h-4 w-4" />}
                            <span>{cat.title}</span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <SidebarMenu>
                            {cat.items.map((sub) => (
                              <SidebarMenuItem key={`${cat.title}-${sub.id}`}>
                                <SidebarMenuButton asChild>
                                  <NavLink to="/dashboard" end className={({ isActive }) => isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}>
                                    <span>{sub.name}</span>
                                  </NavLink>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenu>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </SidebarContent>
              <SidebarFooter className="sticky bottom-24 bg-sidebar border-t">
                <div className="px-2 py-3 space-y-3">
                  <Button onClick={handleStreamToggle} variant={isStreaming ? "destructive" : "default"} className="w-full justify-center">
                    {buttonIcon}
                    <span>{buttonLabel}</span>
                  </Button>
                  <Link to="/profile" className="flex items-center gap-2 py-1 rounded-md p-1 hover:bg-muted/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>VA</AvatarFallback>
                    </Avatar>
                    <div className="leading-tight">
                      <div className="text-sm font-medium">Vitana User</div>
                      <div className="text-xs text-muted-foreground">user@vitana.app</div>
                    </div>
                  </Link>
                </div>
              </SidebarFooter>
            </Sidebar>
          </div>

          <SidebarInset>
            <div className="p-6 bg-background min-h-screen w-full">
              {/* Empty content for now */}
              <div className="rounded-lg border bg-card p-6 text-foreground">
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
