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
import { usePermissions } from "@/hooks/usePermissions";
import { useRole, UserRole } from "@/hooks/useRole";
import { useTenant, TenantType } from "@/hooks/useTenant";

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
  salama: "Salama",
};

export function ProfileDrawer({ trigger }: ProfileDrawerProps) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const { canSwitchRole, canSwitchTenant } = usePermissions();
  const { role, setRole } = useRole();
  const { tenant, setTenant } = useTenant();

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    
    // Navigation logic based on new role
    switch (newRole) {
      case "admin":
      case "staff":
        navigate("/admin");
        break;
      case "professional":
        // Check if they have business/creator mode, otherwise go to dashboard
        navigate("/dashboard"); // TODO: Add business mode check
        break;
      case "patient":
      case "community":
        navigate("/dashboard");
        break;
    }
  };

  const handleTenantChange = (newTenant: TenantType) => {
    setTenant(newTenant);
    // Remain on current route if tenant-agnostic, otherwise redirect to module root
    // For simplicity, staying on current route for now
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

          {/* Role Switcher - only if permitted */}
          {canSwitchRole && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Switch Role
                </label>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Tenant Switcher - only for Exafy Admins */}
          {canSwitchTenant && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Switch Tenant
                </label>
                <Select value={tenant.id} onValueChange={handleTenantChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maxina">Maxina</SelectItem>
                    <SelectItem value="earthlings">Earthlings</SelectItem>
                    <SelectItem value="alkalma">AlKalma</SelectItem>
                    <SelectItem value="salama">Salama</SelectItem>
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