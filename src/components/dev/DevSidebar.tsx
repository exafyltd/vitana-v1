import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import {
  Home, Satellite, Users, GitBranch, Database, 
  FileText, Globe, Workflow, Activity, Settings,
  LogOut, ChevronRight, Search
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfileDrawer } from "@/components/profile/ProfileDrawer";
import { useProfile } from "@/context/ProfileProvider";
import { useAuth } from "@/context/AuthProvider";
import { useRole } from "@/hooks/useRole";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { PlatformIconsRow } from "./PlatformIconsRow";
import { SoundscapeControl } from "@/components/audio/SoundscapeControl";
import { t } from '@/lib/i18n-toast';

const DEV_NAV_ITEMS = [
  { title: "Home", url: "/dev/dashboard", icon: Home },
  { title: "Command Hub", url: "/dev/command", icon: Satellite },
  { title: "Docs", url: "/dev/docs", icon: FileText },
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
  const { profile } = useProfile();
  const { currentRole } = useRole();
  const { isExafyAdmin } = useTenant();

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (url: string) => {
    navigate(url);
    if (isMobile && onMobileOpenChange) {
      onMobileOpenChange(false);
    }
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
                    ? "bg-sidebar-accent text-sidebar-accent-foreground flex items-center gap-3"
                    : "hover:bg-sidebar-accent/50 flex items-center gap-3"
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {open && <span>{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </>
  );

  const footerContent = (
    <>
      {/* Soundscape Control */}
      <SoundscapeControl />
      
      {/* User Profile */}
      {open ? (
        <ProfileDrawer
          trigger={
            <button className="flex items-center gap-2 py-1 rounded-xl p-2 hover:bg-sidebar-accent/50 transition-all hover:shadow-sm relative group w-full">
              <Avatar className="h-8 w-8 ring-1 ring-sidebar-border">
                <AvatarImage src={profile.avatar} alt={profile.displayName} />
                <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-800 font-semibold text-xs">
                  {profile.initials}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">{profile.displayName}</p>
                  <p className="text-xs text-sidebar-foreground/50 capitalize">
                    {isExafyAdmin ? 'Exafy Admin' :
                     currentRole === 'admin' ? 'Administrator' :
                     currentRole === 'staff' ? 'Staff' :
                     currentRole === 'professional' ? 'Professional' :
                     currentRole === 'patient' ? 'Patient' :
                     'Community Member'}
                  </p>
                </div>
              )}
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
    </>
  );

  // Mobile: Render as Sheet
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="text-left">
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-bold">{t('screens.dev.vitanaDev')}</h2>
                  <p className="text-xs text-sidebar-foreground/50 font-normal">{t('screens.dev.commandHub')}</p>
                </div>
                <PlatformIconsRow />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/60" />
                  <Input
                    placeholder={t('screens.dev.searchMembersGroups')}
                    className="pl-9 bg-sidebar-accent/20 border-sidebar-border placeholder:text-sidebar-foreground/70"
                  />
                </div>
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

  // Desktop: Render as Sidebar (dark theme matching Maxina)
  return (
    <div className="dark">
      <Sidebar collapsible="icon" className="bg-sidebar rounded-r-2xl border-r shadow-lg">
        {/* Header */}
        <SidebarHeader className="border-b border-sidebar-border rounded-tr-2xl p-4">
          {open ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <SidebarTrigger className="ml-auto" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{t('screens.dev.vitanaDev')}</h2>
                <p className="text-xs text-sidebar-foreground/50 font-normal">{t('screens.dev.commandHub')}</p>
              </div>
              <PlatformIconsRow />
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/60" />
                  <Input
                    placeholder={t('screens.dev.searchMembersGroups')}
                    className="pl-9 bg-sidebar-accent/20 border-sidebar-border placeholder:text-sidebar-foreground/70"
                  />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <SidebarTrigger />
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                V
              </div>
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
        <SidebarFooter className="sticky bottom-24 bg-sidebar border-t border-sidebar-border">
          <div className="px-2 py-3 space-y-3">
            {footerContent}
          </div>
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}
