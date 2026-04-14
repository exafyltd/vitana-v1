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

interface PermittedRolesResponse {
  ok: boolean;
  roles?: string[];
  is_super_admin?: boolean;
  error?: string;
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
        // VTID-01230: get_my_permitted_roles is the canonical source.
        // Returns all 7 roles for exafy_admin, granted roles for tenant users.
        // Fall back to the legacy list_roles_for_active_tenant RPC if the new
        // one isn't yet deployed to this Supabase instance, so the role
        // switcher never disappears during the rollout.
        try {
          const { data, error } = await supabase.rpc("get_my_permitted_roles" as any);
          if (error) throw error;
          const payload = data as unknown as PermittedRolesResponse | null;
          if (!payload?.ok) throw new Error(payload?.error || "FAILED_TO_LOAD_ROLES");
          return payload.roles ?? [];
        } catch (primaryErr) {
          if (import.meta.env.DEV) {
            console.warn("[useMemberships] get_my_permitted_roles failed, falling back to list_roles_for_active_tenant:", primaryErr);
          }
          const { data, error } = await supabase.rpc("list_roles_for_active_tenant", {
            p_tenant_id: tenantId,
          });
          if (error) throw error;
          return (data ?? []).map((r: { role: string }) => r.role);
        }
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