import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { User, LogOut, Shield, Building, Palette, Check } from "lucide-react";
import { useProfile } from "@/context/ProfileProvider";
import { useAuth } from "@/context/AuthProvider";
import { useRole, UserRole } from "@/hooks/useRole";
import { useTenant, TenantType } from "@/hooks/useTenant";
import { useMemberships } from "@/hooks/useMemberships";
import { useTenantLogoutRedirect } from "@/hooks/useSmartRouting";
import { useProfileTheme, ProfileTheme } from "@/hooks/useProfileTheme";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProfileDrawerProps {
  trigger: React.ReactNode;
}

const ROLE_LABELS: Record<UserRole, string> = {
  community: "Community",
  patient: "Patient", 
  professional: "Professional",
  staff: "Staff",
  admin: "Admin",
};

const TENANT_LABELS: Record<TenantType, string> = {
  maxina: "Maxina",
  earthlinks: "Earthlinks", 
  alkalma: "AlKalma",
};

export function ProfileDrawer({ trigger }: ProfileDrawerProps) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { signOut, user } = useAuth();
  const { tenant, activeTenantId, isExafyAdmin } = useTenant();
  const { currentRole, setRole } = useRole();
  const { roles: membershipRoles } = useMemberships(activeTenantId || undefined);
  const { getLogoutRedirectUrl } = useTenantLogoutRedirect();
  const { theme, setTheme, loading: themeLoading } = useProfileTheme(user?.id);
  const isMobile = useIsMobile();
  
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  
  // Admin users get access to all roles for supervision purposes
  const availableRoles = isExafyAdmin 
    ? ['community', 'patient', 'professional', 'staff', 'admin'] as UserRole[]
    : membershipRoles || [];

  const handleRoleChange = async (newRole: UserRole) => {
    try {
      await setRole(newRole);
      
      // Close drawer immediately after role change
      const drawerCloseButton = document.querySelector('[data-vaul-drawer-close]') as HTMLButtonElement;
      if (drawerCloseButton) {
        drawerCloseButton.click();
      }
      
      // Small delay to ensure drawer closes before navigation
      setTimeout(() => {
        // Navigation logic based on new role
        switch (newRole) {
          case "admin":
          case "staff":
            navigate("/admin");
            break;
          case "professional":
            navigate("/professional/dashboard"); 
            break;
          case "patient":
            navigate("/patient/dashboard");
            break;
          case "community":
          default:
            navigate("/home");
            break;
        }
      }, 100);
    } catch (error) {
      console.error('Error setting role:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      
      // Store tenant slug in localStorage before logout to preserve redirect context
      if (tenant?.slug) {
        localStorage.setItem('logout_tenant_slug', tenant.slug);
      }
      
      const redirectUrl = getLogoutRedirectUrl();
      await signOut();
      
      // Navigate to tenant-specific portal page
      navigate(redirectUrl);
    } catch (error) {
      console.error('Error during logout:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {trigger}
      </DrawerTrigger>
      <DrawerContent className="max-w-sm mx-auto">
        <DrawerHeader className="text-center">
          <div className="flex flex-col items-center gap-3 mb-2">
            <Avatar className="h-16 w-16 ring-2 ring-border">
              <AvatarImage src={profile.avatar} alt={profile.displayName} />
              <AvatarFallback className="bg-gradient-to-br from-pink-100 to-pink-200 text-pink-800 font-semibold text-lg">
                {profile.initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <DrawerTitle className="text-lg">{profile.displayName}</DrawerTitle>
              <Badge variant="secondary" className="text-xs">
                {ROLE_LABELS[profile.role]}
              </Badge>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          {/* Always show basic actions */}
          <div className="space-y-2">
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link to="/me/profile">
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
            </DrawerClose>
          </div>

          {/* Theme Switcher */}
          <Separator />
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === 'serenity' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('serenity')}
                disabled={themeLoading}
                className="flex flex-col gap-1 h-auto py-3 relative"
              >
                {theme === 'serenity' && (
                  <Check className="h-3 w-3 absolute top-1 right-1" />
                )}
                <span className="text-xl">🌅</span>
                <span className="text-xs">Serenity</span>
              </Button>
              <Button
                variant={theme === 'focus' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('focus')}
                disabled={themeLoading}
                className="flex flex-col gap-1 h-auto py-3 relative"
              >
                {theme === 'focus' && (
                  <Check className="h-3 w-3 absolute top-1 right-1" />
                )}
                <span className="text-xl">🌓</span>
                <span className="text-xs">Focus</span>
              </Button>
              <Button
                variant={theme === 'expression' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('expression')}
                disabled={themeLoading}
                className="flex flex-col gap-1 h-auto py-3 relative"
              >
                {theme === 'expression' && (
                  <Check className="h-3 w-3 absolute top-1 right-1" />
                )}
                <span className="text-xl">💎</span>
                <span className="text-xs">Expression</span>
              </Button>
            </div>
          </div>

          {/* Role Switcher - desktop only, mobile is community-only */}
          {!isMobile && availableRoles && availableRoles.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Switch Role {isExafyAdmin && <Badge variant="outline" className="text-xs">Admin Access</Badge>}
                </label>
                <Select value={currentRole || profile.role || availableRoles[0]} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role as UserRole]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DrawerFooter>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost" disabled={isLoggingOut}>Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}