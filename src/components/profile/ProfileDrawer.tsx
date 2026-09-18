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
import { User, LogOut, Shield, Trash2, Loader2, ArrowLeftRight } from "lucide-react";
import { useProfile } from "@/context/ProfileProvider";
import { useAuth } from "@/context/AuthProvider";
import { UserRole } from "@/hooks/useRole";
import { useTenant, TenantType } from "@/hooks/useTenant";
import { useTenantLogoutRedirect } from "@/hooks/useSmartRouting";
import { useRoleSwitch } from "@/hooks/useRoleSwitch";
import { roleLabel } from "@/lib/role-labels";
import { RoleSwitcherSheet } from "@/components/mobile/RoleSwitcherSheet";

import { useIsMobile } from "@/hooks/use-mobile";
import { t } from '@/lib/i18n-toast';

interface ProfileDrawerProps {
  trigger: React.ReactNode;
}

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
  // VTID-03993: the list and the write live in useRoleSwitch, shared with the
  // mobile drawer's pill/sheet — desktop <Select> and phone sheet are one path.
  const { availableRoles, activeRole, canSwitch, switching, switchRole, businessEntries, activeBusinessOrgId, switchToBusiness } = useRoleSwitch();
  const { getLogoutRedirectUrl } = useTenantLogoutRedirect();
  
  const isMobile = useIsMobile();
  
  const [open, setOpen] = React.useState(false);
  const [roleSheetOpen, setRoleSheetOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleEditProfile = () => {
    setOpen(false);
    // Route to the profile view (not the edit page). Account/identity edits are
    // now reachable from within the profile via the Account pill.
    const identifier = profile.handle || user?.id;
    const target = identifier ? `/u/${identifier}` : '/me/profile';
    window.location.href = target;
  };
  
  // VTID-03909/03916/03924 (await the write, router vs. cross-origin
  // destination) and the VTID-01230 exafy safety net now live in
  // useRoleSwitch — the drawer only closes once the switch is confirmed.
  const handleRoleChange = async (newRole: UserRole) => {
    const result = await switchRole(newRole);
    if (result.ok) setOpen(false);
  };

  // Mobile: the badge opens the same bottom sheet the side drawer uses. The
  // profile drawer closes first — two stacked sheets is not one tap.
  const openRoleSheet = () => {
    setOpen(false);
    setRoleSheetOpen(true);
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
    <>
    <RoleSwitcherSheet
      open={roleSheetOpen}
      onOpenChange={setRoleSheetOpen}
      availableRoles={availableRoles}
      activeRole={activeRole}
      switching={switching}
      onSelect={async (role) => {
        const result = await switchRole(role);
        if (result.ok) setRoleSheetOpen(false);
      }}
      businessEntries={businessEntries}
      activeBusinessOrgId={activeBusinessOrgId}
      onSelectBusiness={(orgId) => {
        switchToBusiness(orgId);
        setRoleSheetOpen(false);
      }}
    />
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
              {isMobile && canSwitch ? (
                // VTID-04041: mode chip (information) + labelled switch CTA,
                // the same pair the side drawer header shows.
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    <span className="sr-only">{t('screens.mobile.currentMode')}: </span>
                    {roleLabel(activeRole)}
                  </Badge>
                  <button
                    type="button"
                    onClick={openRoleSheet}
                    aria-label={t('screens.profile.switchRole')}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
                    <span>{t('screens.profile.switchRole')}</span>
                  </button>
                </div>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {roleLabel(activeRole)}
                </Badge>
              )}
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


          {/* Role Switcher — desktop <Select>; on mobile the badge above opens the sheet (VTID-03993) */}
          {!isMobile && canSwitch && (
            <>
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />{t('screens.profile.switchRole')} {isExafyAdmin && <Badge variant="outline" className="text-xs">{t('screens.profile.adminAccess')}</Badge>}
                </label>
                <Select value={activeRole} onValueChange={handleRoleChange} disabled={switching}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {roleLabel(role)}
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
    </>
  );
}