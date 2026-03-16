import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";

// Note: "reseller" is no longer a role - it's now a capability based on reseller_profiles table
export type UserRole = "community" | "patient" | "professional" | "staff" | "admin";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  community: 1,
  patient: 2, 
  professional: 3,
  staff: 4,
  admin: 5,
};

export function useRole() {
  const { activeTenantId, isExafyAdmin } = useTenant();
  const queryClient = useQueryClient();

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

  const setRole = (role: UserRole) => {
    if (!activeTenantId) return;
    
    const previousRole = query.data;
    
    // Optimistic: update cache + emit event immediately
    queryClient.setQueryData(["rolePref", activeTenantId], role);
    window.dispatchEvent(new CustomEvent("role.changed", {
      detail: { from: previousRole, to: role }
    }));
    
    // Fire RPC in background — don't block the caller
    supabase.rpc("set_role_preference", { 
      p_tenant_id: activeTenantId, 
      p_role: role 
    }).then(({ error }) => {
      if (error) {
        console.error('Error setting role preference:', error);
        // Rollback on failure
        queryClient.setQueryData(["rolePref", activeTenantId], previousRole);
        window.dispatchEvent(new CustomEvent("role.changed", {
          detail: { from: role, to: previousRole }
        }));
      }
      // Background revalidation
      queryClient.invalidateQueries({ queryKey: ["rolePref", activeTenantId] });
    });
  };

  const hasPermission = (requiredRole: UserRole): boolean => {
    // Exafy admins have all permissions
    if (isExafyAdmin) return true;
    
    const currentRole = query.data as UserRole || "community";
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  };

  // Default to 'community' while loading so inbox/global threads are visible immediately
  const effectiveRole = (query.data as UserRole | null) || "community";

  return { 
    currentRole: effectiveRole, 
    setRole, 
    hasPermission,
    isLoading: query.isLoading 
  };
}