import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { User, LogOut, Shield, Building } from "lucide-react";
import { useProfile } from "@/context/ProfileProvider";
import { useAuth } from "@/context/AuthProvider";
import { useRole, UserRole } from "@/hooks/useRole";
import { useTenant, TenantType } from "@/hooks/useTenant";
import { useMemberships } from "@/hooks/useMemberships";

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
  earthlings: "Earthlings", 
  alkalma: "AlKalma",
};

export function ProfileDrawer({ trigger }: ProfileDrawerProps) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const { tenant, activeTenantId, isExafyAdmin } = useTenant();
  const { currentRole, setRole } = useRole();
  const { roles: membershipRoles } = useMemberships(activeTenantId || undefined);
  
  // Admin users get access to all roles for supervision purposes
  const availableRoles = isExafyAdmin 
    ? ['community', 'patient', 'professional', 'staff', 'admin'] as UserRole[]
    : membershipRoles || [];

  const handleRoleChange = async (newRole: UserRole) => {
    try {
      await setRole(newRole);
      
      // Navigation logic based on new role
      switch (newRole) {
        case "admin":
        case "staff":
          navigate("/admin");
          break;
        case "professional":
          navigate("/dashboard"); 
          break;
        case "patient":
        case "community":
          navigate("/dashboard");
          break;
      }
    } catch (error) {
      console.error('Error setting role:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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

          {/* Role Switcher - show available roles (all roles for admin, membership roles for others) */}
          {availableRoles && availableRoles.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Switch Role {isExafyAdmin && <Badge variant="outline" className="text-xs">Admin Access</Badge>}
                </label>
                <Select value={currentRole || availableRoles[0]} onValueChange={handleRoleChange}>
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
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}