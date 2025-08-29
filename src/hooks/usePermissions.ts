import { useMemo } from "react";
import { useAuth } from "@/context/AuthProvider";
import { getPermissions, Permission, canSwitchTenant, canSwitchRole } from "@/lib/permissions";

export function usePermissions() {
  const { session } = useAuth();

  const permissions = useMemo(() => {
    return getPermissions(session);
  }, [session]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions.has(permission);
  };

  return {
    permissions,
    hasPermission,
    canSwitchTenant: canSwitchTenant(permissions),
    canSwitchRole: canSwitchRole(permissions),
  };
}