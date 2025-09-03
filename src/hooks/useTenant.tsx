import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TenantType = "maxina" | "earthlings" | "alkalma";

interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  brandAccent: string;
  brandBg: string;
  brandFg: string;
}

const TENANT_CONFIGS: Record<TenantType, TenantConfig> = {
  maxina: {
    id: "",
    name: "Maxina",
    slug: "maxina",
    brandAccent: "#FF7BAC",
    brandBg: "#FFF5F8",
    brandFg: "#1A1A1A",
  },
  earthlings: {
    id: "",
    name: "Earthlings",
    slug: "earthlings",
    brandAccent: "#4ADE80",
    brandBg: "#F0FDF4",
    brandFg: "#1A1A1A",
  },
  alkalma: {
    id: "",
    name: "AlKalma",
    slug: "alkalma",
    brandAccent: "#3B82F6",
    brandBg: "#EFF6FF",
    brandFg: "#1A1A1A",
  },
};

interface TenantContextValue {
  activeTenantId: string | null;
  tenant: TenantConfig | null;
  isExafyAdmin: boolean;
  setActiveTenant: (tenantId: string) => Promise<void>;
  setTenantBySlug: (slug: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { session, user } = useAuth();
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(null);

  // Get Exafy admin status
  const isExafyAdmin = user?.app_metadata?.exafy_admin === true;

  // Get active tenant ID from user metadata or fallback to first tenant
  useEffect(() => {
    if (user) {
      const userActiveTenantId = user.app_metadata?.active_tenant_id;
      if (userActiveTenantId) {
        setActiveTenantIdState(userActiveTenantId);
      } else {
        // Fallback to first available tenant
        const fallbackTenantQuery = async () => {
          const { data } = await supabase.from('tenants').select('id').limit(1).single();
          if (data) {
            setActiveTenantIdState(data.id);
          }
        };
        fallbackTenantQuery();
      }
    }
  }, [user]);

  // Fetch tenant details
  const { data: tenantData } = useQuery({
    queryKey: ["tenant", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', activeTenantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId,
  });

  // Map database tenant to config with styling
  const tenant = tenantData ? {
    ...tenantData,
    ...(TENANT_CONFIGS[tenantData.slug as TenantType] || TENANT_CONFIGS.maxina)
  } : null;

  // Apply tenant CSS variables
  useEffect(() => {
    if (tenant) {
      const root = document.documentElement;
      root.style.setProperty("--brand-accent", tenant.brandAccent);
      root.style.setProperty("--brand-bg", tenant.brandBg);
      root.style.setProperty("--brand-fg", tenant.brandFg);
    }
  }, [tenant]);

  const setActiveTenant = async (tenantId: string) => {
    if (!isExafyAdmin) {
      throw new Error("Only Exafy administrators can switch tenants");
    }

    try {
      const { data, error } = await supabase.functions.invoke('set_active_tenant', {
        body: { tenant_id: tenantId }
      });

      if (error) throw error;

      // Refresh session to get updated metadata
      await supabase.auth.refreshSession();
      setActiveTenantIdState(tenantId);

      // Emit tenant change event
      window.dispatchEvent(new CustomEvent("tenant.changed", {
        detail: { from: activeTenantId, to: tenantId }
      }));
    } catch (error) {
      console.error('Error setting active tenant:', error);
      throw error;
    }
  };

  const setTenantBySlug = async (slug: string) => {
    try {
      const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (data) {
        setActiveTenantIdState(data.id);
      }
    } catch (error) {
      console.error('Error setting tenant by slug:', error);
    }
  };

  const value: TenantContextValue = {
    activeTenantId,
    tenant,
    isExafyAdmin,
    setActiveTenant,
    setTenantBySlug,
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