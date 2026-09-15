import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAutoAvatarUrl } from "@/lib/autoAvatar";
import { avatarPositionStyle } from "@/lib/avatarPosition";
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
import { User, LogOut, Shield, Building, Trash2, Loader2 } from "lucide-react";
import { useProfile } from "@/context/ProfileProvider";
import { useAuth } from "@/context/AuthProvider";
import { useRole, UserRole } from "@/hooks/useRole";
import { useTenant, TenantType } from "@/hooks/useTenant";
import { useMemberships } from "@/hooks/useMemberships";
import { useTenantLogoutRedirect } from "@/hooks/useSmartRouting";

import { useIsMobile } from "@/hooks/use-mobile";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface ProfileDrawerProps {
  trigger: React.ReactNode;
}

const ROLE_LABELS: Record<UserRole, string> = {
  community: "Community",
  patient: "Patient",
  professional: "Professional",
  staff: "Staff",
  backoffice: "Back Office",
  admin: "Admin",
  developer: "Developer",
  infra: "Infra",
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
  
  const isMobile = useIsMobile();
  
  const [open, setOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleEditProfile = () => {
    setOpen(false);
    // Route to the profile view (not the edit page). Account/identity edits are
    // now reachable from within the profile via the Account pill.
    const identifier = profile.handle || user?.id;
    const target = identifier ? `/u/${identifier}` : '/me/profile';
    window.location.href = target;
  };
  
  // VTID-01230: get_my_permitted_roles() is the canonical source.
  // Exafy super-admin safety net: ensure all 8 roles are ALWAYS visible for
  // super-admins, even if the RPC hasn't rolled out yet or returns an error —
  // the role switcher must never disappear for an Exafy admin on any screen.
  const ALL_ROLES_SUPER_ADMIN: UserRole[] = [
    "community",
    "patient",
    "professional",
    "staff",
    "backoffice",
    "admin",
    "developer",
    "infra",
  ];
  const availableRoles: UserRole[] = isExafyAdmin
    ? ALL_ROLES_SUPER_ADMIN
    : ((membershipRoles ?? []) as UserRole[]);

  const [switchingRole, setSwitchingRole] = React.useState(false);

  const handleRoleChange = async (newRole: UserRole) => {
    // VTID-03909: hard-navigating before the write is confirmed let the page
    // unload cancel the in-flight set_role_preference RPC, so a switch could
    // silently fail to persist — the user would land back on their PREVIOUS
    // role's landing route with no error shown, looking identical to success.
    // Awaiting the real result (and only navigating once it's confirmed)
    // closes that race; a failure now surfaces as a toast and leaves the
    // drawer open instead of reloading to the wrong place.
    setSwitchingRole(true);
    const result = await setRole(newRole);
    setSwitchingRole(false);

    if (!result.ok) {
      notifyError('toasts.settings.errorSwitchingRole', 'toasts.settings.failedSwitchRolePleaseTryAgain');
      return;
    }

    setOpen(false);

    let destination: string;
    switch (newRole) {
      case "admin":
      case "staff":
        destination = "/admin";
        break;
      case "backoffice":
        // VTID-03832: BackOffice home (route shell lands in the /backoffice skeleton VTID)
        destination = "/backoffice/dashboard";
        break;
      case "professional":
        destination = "/professional/dashboard";
        break;
      case "patient":
        destination = "/patient/dashboard";
        break;
      case "developer":
      case "infra":
      case "community":
      default:
        destination = "/home";
        break;
    }
    // VTID-03916: this used to be a hard window.location.assign() — a full
    // page reload, the actual "glitch" reported (a white flash + full app
    // re-bootstrap on every switch). The comment it replaced justified that
    // as a workaround for a real race: switching used to fire the
    // set_role_preference write in the BACKGROUND and navigate ~100ms later
    // regardless of whether it had landed, so a soft SPA navigate could reach
    // the destination route before the role query cache reflected the new
    // role, mounting it against the OLD role and rendering empty/wrong.
    // VTID-03909 already closed that race for a different reason (a failed
    // write was indistinguishable from a successful one) by making this
    // function await setRole()'s confirmed result before ever reaching this
    // line — so by the time we navigate, the query cache already holds the
    // server-confirmed new role, both via the optimistic update setRole()
    // applies synchronously and via the invalidateQueries() it runs right
    // after the RPC resolves. The precondition the hard reload existed to
    // patch around no longer holds, so a normal client-side navigate is safe
    // and removes the reload glitch entirely.
    navigate(destination);
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
              <AvatarImage
                src={profile.avatar && profile.avatar.length > 0 ? profile.avatar : getAutoAvatarUrl(profile.displayName ?? profile.initials ?? "vitana")}
                alt={profile.displayName}
                style={avatarPositionStyle(profile.avatarOffsetX, profile.avatarOffsetY)}
              />
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
                <p className="text-xs text-muted-foreground">{t('screens.profile.tenantValue0', { value0: activeTenantId.substring(0, 8) })}
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
              {t('screens.profile.profile')}
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
                      {t('screens.profile.deleteAccount')}
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
                  <Shield className="h-4 w-4" />{t('screens.profile.switchRole')} {isExafyAdmin && <Badge variant="outline" className="text-xs">{t('screens.profile.adminAccess')}</Badge>}
                </label>
                <Select value={currentRole || profile.role || availableRoles[0]} onValueChange={handleRoleChange} disabled={switchingRole}>
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
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost" disabled={isLoggingOut}>{t('screens.profile.cancel')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}