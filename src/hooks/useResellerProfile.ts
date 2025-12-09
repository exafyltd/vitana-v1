import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";
import { useAuth } from "@/context/AuthProvider";

export interface ResellerProfile {
  id: string;
  user_id: string;
  tenant_id: string;
  reseller_code: string;
  commission_rate: number;
  status: "active" | "paused" | "terminated";
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useResellerProfile() {
  const { activeTenantId } = useTenant();
  const { session } = useAuth();

  return useQuery({
    queryKey: ["reseller-profile", activeTenantId, session?.user?.id],
    queryFn: async () => {
      if (!activeTenantId || !session?.user?.id) return null;

      const { data, error } = await supabase
        .from("reseller_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("tenant_id", activeTenantId)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.error("Error fetching reseller profile:", error);
        throw error;
      }

      return data as ResellerProfile | null;
    },
    enabled: !!activeTenantId && !!session?.user?.id,
  });
}
