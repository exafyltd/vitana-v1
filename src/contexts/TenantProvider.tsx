import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "./SessionProvider";
import { supabase } from "@/integrations/supabase/client";

interface TenantData {
  id: string;
  name: string;
}

interface TenantContextValue {
  activeTenantId: string | null;
  tenant: TenantData | null;
  isExafyAdmin: boolean;
  loading: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: sessionLoading } = useSession();
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTenant = async () => {
    if (!user) {
      setActiveTenantId(null);
      setTenant(null);
      setLoading(false);
      return;
    }

    try {
      // Get active tenant ID from user app_metadata
      const tenantId = user.app_metadata?.active_tenant_id;
      setActiveTenantId(tenantId || null);

      if (tenantId) {
        // Fetch tenant details
        const { data: tenantData, error } = await supabase
          .from('tenants')
          .select('id, name')
          .eq('id', tenantId)
          .single();

        if (error) {
          console.error('Error fetching tenant:', error);
          setTenant(null);
        } else {
          setTenant(tenantData);
        }
      } else {
        setTenant(null);
      }
    } catch (error) {
      console.error('Error refreshing tenant:', error);
      setActiveTenantId(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading) {
      refreshTenant();
    }
  }, [user, sessionLoading]);

  // Check if user is Exafy Admin based on memberships
  const isExafyAdmin = user?.app_metadata?.role === 'exafy_admin' || false;

  const value: TenantContextValue = {
    activeTenantId,
    tenant,
    isExafyAdmin,
    loading: loading || sessionLoading,
    refreshTenant,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}