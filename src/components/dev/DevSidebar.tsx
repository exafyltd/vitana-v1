import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import {
  Home, Terminal, Users, GitBranch, Database, 
  FileText, Globe, Workflow, Activity, Settings,
  Play, LogOut, ChevronRight
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarHeader, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton, SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const DEV_NAV_ITEMS = [
  { title: "Home", url: "/dev/dashboard", icon: Home },
  { title: "Command Hub", url: "/dev/command", icon: Terminal },
  { title: "Agents", url: "/dev/agents", icon: Users },
  { title: "Pipelines (Conductor)", url: "/dev/pipelines", icon: GitBranch },
  { title: "OASIS", url: "/dev/oasis", icon: Database },
  { title: "VTID Ledger", url: "/dev/vtid", icon: FileText },
  { title: "Gateway", url: "/dev/gateway", icon: Globe },
  { title: "CI/CD & Deploys", url: "/dev/cicd", icon: Workflow },
  { title: "Observability", url: "/dev/observability", icon: Activity },
  { title: "Settings", url: "/dev/settings", icon: Settings },
] as const;

interface DevSidebarProps {
  user: User | null;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function DevSidebar({ user, mobileOpen = false, onMobileOpenChange }: DevSidebarProps) {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (url: string) => {
    navigate(url);
    if (isMobile && onMobileOpenChange) {
      onMobileOpenChange(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/dev/login', { replace: true });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return "?";
    return user.email.substring(0, 2).toUpperCase();
  };

  const navigationContent = (
    <>
      <SidebarMenu>
        {DEV_NAV_ITEMS.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton 
              asChild 
              isActive={isActive(item.url)}
              className="min-h-[44px]"
            >
              <NavLink
                to={item.url}
                onClick={() => handleNavigation(item.url)}
                className={({ isActive }) =>
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50"
                }
              >
                <item.icon className="h-4 w-4" />
                {(!isMobile || open) && <span>{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );

  const footerContent = (
    <div className="space-y-2">
      <Button 
        variant="outline" 
        size={(isMobile || !open) ? "icon" : "default"}
        className="w-full gap-2"
      >
        <Play className="h-4 w-4" />
        {(!isMobile && open) && <span>Start Stream</span>}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 hover:bg-sidebar-accent min-h-[44px]"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            {(!isMobile && open) && (
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Developer</p>
              </div>
            )}
            {(!isMobile && open) && <ChevronRight className="h-4 w-4 ml-auto" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleNavigation('/dev/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Mobile: Render as Sheet
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="text-left">
              <div>
                <h2 className="text-lg font-bold">Vitana DEV</h2>
                <p className="text-xs text-muted-foreground">Command Hub</p>
              </div>
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col h-[calc(100%-80px)]">
            <div className="flex-1 overflow-auto p-4">
              {navigationContent}
            </div>
            
            <div className="border-t p-4">
              {footerContent}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Render as Sidebar
  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* Header */}
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between">
          <SidebarTrigger className="ml-auto" />
        </div>
        {open && (
          <div className="mt-2">
            <h2 className="text-lg font-bold">Vitana DEV</h2>
            <p className="text-xs text-muted-foreground">Command Hub</p>
          </div>
        )}
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {navigationContent}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Utility Zone (Footer) */}
      <SidebarFooter className="border-t p-4">
        {footerContent}
      </SidebarFooter>
    </Sidebar>
  );
}
