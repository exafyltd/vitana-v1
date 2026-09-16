import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";
import { useIsMobile } from "./use-mobile";

// Note: "reseller" is no longer a role - it's now a capability based on reseller_profiles table
// VTID-01230: developer + infra are super-admin-grantable only
// VTID-03832: "backoffice" sits between staff and admin (BackOffice plan decision 4b):
//   admin/developer/infra inherit BackOffice; staff needs an explicit grant;
//   backoffice cannot reach /admin. Backend has 8 roles total; the gateway mirror
//   is services/gateway/src/constants/vitana-roles.ts.
export type UserRole = "community" | "patient" | "professional" | "staff" | "backoffice" | "admin" | "developer" | "infra";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  community: 1,
  patient: 2,
  professional: 3,
  staff: 4,
  backoffice: 5,
  admin: 6,
  developer: 7,
  infra: 8,
};

export function useRole() {
  const { activeTenantId, isExafyAdmin } = useTenant();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const query = useQuery({
    queryKey: ["rolePref", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      
      const { data, error } = await supabase.rpc("get_role_preference", { 
        p_tenant_id: activeTenantId 
      });
      
      if (error) {
        console.error('Error getting role preference:', error);
        throw error;
      }
      
      const role = data?.[0]?.role ?? null;
      return role;
    },
    enabled: !!activeTenantId,
  });

  // Returns once the write is actually confirmed (or rejected) by the DB, so a
  // caller that needs to navigate on the strength of the switch — e.g. the role
  // switcher's hard reload to the new role's landing route — can await it
  // instead of racing a fire-and-forget RPC against a fixed timeout. A caller
  // that only wants the old fire-and-forget UX can still ignore the returned
  // promise; the optimistic cache update + event still happen synchronously.
  const setRole = (role: UserRole): Promise<{ ok: boolean; error?: string }> => {
    if (!activeTenantId) return Promise.resolve({ ok: false, error: 'NO_ACTIVE_TENANT' });

    const previousRole = query.data;

    // Optimistic: update cache + emit event immediately
    queryClient.setQueryData(["rolePref", activeTenantId], role);
    window.dispatchEvent(new CustomEvent("role.changed", {
      detail: { from: previousRole, to: role }
    }));

    return supabase.rpc("set_role_preference", {
      p_tenant_id: activeTenantId,
      p_role: role
    }).then(({ error }) => {
      queryClient.invalidateQueries({ queryKey: ["rolePref", activeTenantId] });

      if (error) {
        console.error('Error setting role preference:', error);
        // Rollback on failure
        queryClient.setQueryData(["rolePref", activeTenantId], previousRole);
        window.dispatchEvent(new CustomEvent("role.changed", {
          detail: { from: role, to: previousRole }
        }));
        return { ok: false, error: error.message };
      }
      return { ok: true };
    });
  };

  // Default to 'community' while loading so inbox/global threads are visible immediately
  // MOBILE ENFORCEMENT: Mobile devices are ALWAYS community role — no role switching on mobile
  const dbRole = (query.data as UserRole | null) || "community";
  const effectiveRole: UserRole = isMobile ? "community" : dbRole;

  const hasPermission = (requiredRole: UserRole): boolean => {
    // Exafy admins have all permissions — but never on mobile, where
    // effectiveRole is always forced to 'community' above. Without the
    // !isMobile guard here, this bypass let an Exafy admin's session open
    // desktop-only surfaces (e.g. BackOffice) on a phone: ProtectedRoute
    // calls hasPermission() directly, so it must respect the same mobile
    // enforcement effectiveRole already encodes, not re-check the raw
    // (unmapped) dbRole/isExafyAdmin state on its own.
    if (isExafyAdmin && !isMobile) return true;

    return ROLE_HIERARCHY[effectiveRole] >= ROLE_HIERARCHY[requiredRole];
  };

  return {
    currentRole: effectiveRole,
    dbRole,
    setRole,
    hasPermission,
    isLoading: query.isLoading
  };
}