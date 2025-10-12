import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserAnalytics {
  total_users: number;
  active_users_24h: number;
  active_users_7d: number;
  new_users_7d: number;
  new_users_30d: number;
}

interface SystemHealth {
  total_memberships: number;
  active_memberships: number;
  total_tenants: number;
  total_threads: number;
  total_global_threads: number;
  total_messages: number;
  total_global_messages: number;
}

interface TenantAnalytics {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  total_users: number;
  active_users: number;
  admin_count: number;
  staff_count: number;
  professional_count: number;
  patient_count: number;
}

export function useAdminAnalytics() {
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [tenantAnalytics, setTenantAnalytics] = useState<TenantAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemHealthError, setSystemHealthError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    // Fetch panels independently with isolated error handling
    // User Analytics
    try {
      const { data: userData, error: userError } = await supabase
        .from("admin_user_analytics")
        .select("*")
        .maybeSingle();

      if (userError) throw userError;
      setUserAnalytics(userData);
    } catch (err: any) {
      console.error("Error fetching user analytics:", err);
      setError(err.message);
    }

    // System Health (with separate error tracking)
    try {
      const { data: healthData, error: healthError } = await supabase
        .from("admin_system_health")
        .select("*")
        .maybeSingle();

      if (healthError) throw healthError;
      setSystemHealth(healthData);
      setSystemHealthError(null);
    } catch (err: any) {
      console.error("Error fetching system health:", err);
      setSystemHealthError(err.message);
      // Keep previous value if it exists
    }

    // Tenant Analytics
    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from("admin_tenant_analytics")
        .select("*")
        .order("total_users", { ascending: false });

      if (tenantError) throw tenantError;
      setTenantAnalytics(tenantData || []);
    } catch (err: any) {
      console.error("Error fetching tenant analytics:", err);
      // Continue with empty array
    }

    setLoading(false);
  };

  return {
    userAnalytics,
    systemHealth,
    tenantAnalytics,
    loading,
    error,
    systemHealthError,
    refetch: fetchAnalytics,
  };
}
