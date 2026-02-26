import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserTenant {
  id: string;
  tenant_id: string;
  user_id: string;
  active_role: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  profile: any;
  user_tenants: UserTenant[];
}

interface UseAdminUsersOptions {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export function useAdminUsers(options?: UseAdminUsersOptions) {
  const search = options?.search ?? "";
  const role = options?.role ?? "";
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-users", search, role, page, pageSize],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("app_users")
        .select("*, user_tenants(*)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      // Apply search filter on email and display_name
      if (search) {
        query = query.or(
          `email.ilike.%${search}%,display_name.ilike.%${search}%`
        );
      }

      // Apply role filter on user_tenants.active_role
      if (role) {
        query = query.eq("user_tenants.active_role", role);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        users: (data as AppUser[]) ?? [],
        total: count ?? 0,
      };
    },
  });

  return {
    users: data?.users ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
  };
}
