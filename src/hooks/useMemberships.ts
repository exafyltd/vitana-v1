import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Membership {
  id: string;
  role: string;
  status: string;
  tenant_id: string;
  tenants: {
    id: string;
    name: string;
    slug: string;
  };
}

export function useMemberships(tenantId?: string) {
  const query = useQuery({
    queryKey: ["memberships", tenantId],
    queryFn: async () => {
      if (!tenantId) {
        // Get all memberships
        const { data, error } = await supabase.functions.invoke('list_my_memberships');
        if (error) throw error;
        return data.memberships as Membership[];
      } else {
        // Get roles for specific tenant using RPC
        const { data, error } = await supabase.rpc("list_roles_for_active_tenant", { 
          p_tenant_id: tenantId 
        });
        if (error) throw error;
        return (data ?? []).map((r: { role: string }) => r.role);
      }
    },
    enabled: true,
  });

  return { 
    memberships: query.data as Membership[] | undefined,
    roles: Array.isArray(query.data) && typeof query.data[0] === 'string' 
      ? query.data as string[] 
      : undefined,
    ...query 
  };
}