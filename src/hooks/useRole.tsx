import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";

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

  const setRole = async (role: UserRole) => {
    if (!activeTenantId) return;
    
    try {
      const { data, error } = await supabase.rpc("set_role_preference", { 
        p_tenant_id: activeTenantId, 
        p_role: role 
      });
      
      if (error) {
        throw error;
      }
      
      // Force immediate cache update
      queryClient.setQueryData(["rolePref", activeTenantId], role);
      
      await queryClient.invalidateQueries({ 
        queryKey: ["rolePref", activeTenantId] 
      });

      // Emit role change event
      window.dispatchEvent(new CustomEvent("role.changed", {
        detail: { from: query.data, to: role }
      }));
    } catch (error) {
      console.error('Error setting role preference:', error);
      throw error;
    }
  };

  const hasPermission = (requiredRole: UserRole): boolean => {
    // Exafy admins have all permissions
    if (isExafyAdmin) return true;
    
    const currentRole = query.data as UserRole || "community";
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  };

  // Return admin role for Exafy admins, otherwise use role preference
  const effectiveRole = isExafyAdmin ? "admin" : (query.data as UserRole | null);

  return { 
    currentRole: effectiveRole, 
    setRole, 
    hasPermission,
    isLoading: query.isLoading 
  };
}