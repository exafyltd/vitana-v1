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
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rolePref", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      const { data, error } = await supabase.rpc("get_role_preference", { 
        p_tenant_id: activeTenantId 
      });
      if (error) throw error;
      return data?.[0]?.role ?? null;
    },
    enabled: !!activeTenantId,
  });

  const setRole = async (role: UserRole) => {
    if (!activeTenantId) return;
    
    try {
      await supabase.rpc("set_role_preference", { 
        p_tenant_id: activeTenantId, 
        p_role: role 
      });
      
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
    const currentRole = query.data as UserRole || "community";
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  };

  return { 
    currentRole: query.data as UserRole | null, 
    setRole, 
    hasPermission,
    isLoading: query.isLoading 
  };
}