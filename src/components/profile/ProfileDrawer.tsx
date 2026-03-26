import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
import { User, LogOut, Shield, Building, Trash2 } from "lucide-react";
import { useProfile } from "@/context/ProfileProvider";
import { useAuth } from "@/context/AuthProvider";
import { useRole, UserRole } from "@/hooks/useRole";
import { useTenant, TenantType } from "@/hooks/useTenant";
import { useMemberships } from "@/hooks/useMemberships";
import { useTenantLogoutRedirect } from "@/hooks/useSmartRouting";

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
  const { roles: membershipRoles, memberships } = useMemberships(activeTenantId || undefined);
  const { getLogoutRedirectUrl } = useTenantLogoutRedirect();
  
  const isMobile = useIsMobile();
  
  const [open, setOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const location = useLocation();
  const isFromCommandHub = location.pathname.startsWith('/dev');

  const handleEditProfile = () => {
    setOpen(false);
    setTimeout(() => navigate('/me/profile', { state: { fromCommandHub: isFromCommandHub } }), 150);
  };
  
  // Admin users get access to all roles for supervision purposes
  const availableRoles = isExafyAdmin 
    ? ['community', 'patient', 'professional', 'staff', 'admin'] as UserRole[]
    : membershipRoles 
      ? membershipRoles as UserRole[]
      : memberships && activeTenantId
        ? [...new Set(memberships.filter(m => m.tenant_id === activeTenantId).map(m => m.role))] as UserRole[]
        : [];

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    
    // Close drawer immediately
    const drawerCloseButton = document.querySelector('[data-vaul-drawer-close]') as HTMLButtonElement;
    if (drawerCloseButton) {
      drawerCloseButton.click();
    }
    
    // Navigate immediately
    setTimeout(() => {
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
    <Drawer open={open} onOpenChange={setOpen}>
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
            <div className="space-y-1 flex flex-col items-center">
              <DrawerTitle className="text-lg">{profile.displayName}</DrawerTitle>
              {user?.email && (
                <p className="text-xs text-muted-foreground">{user.email}</p>
              )}
              <Badge variant="secondary" className="text-xs">
                {ROLE_LABELS[profile.role]}
              </Badge>
              {activeTenantId && (
                <p className="text-xs text-muted-foreground">
                  Tenant: {activeTenantId.substring(0, 8)}...
                </p>
              )}
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          {/* Always show basic actions */}
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" onClick={handleEditProfile}>
              <User className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>

          {isMobile && (
            <>
              <Separator />
              <div className="space-y-2">
                <DrawerClose asChild>
                  <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" asChild>
                    <Link to="/delete-account">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Link>
                  </Button>
                </DrawerClose>
              </div>
            </>
          )}


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