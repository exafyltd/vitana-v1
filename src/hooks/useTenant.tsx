// tenant-context v2
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TenantType = "maxina" | "earthlinks" | "alkalma";

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
  earthlinks: {
    id: "",
    name: "Earthlinks",
    slug: "earthlinks",
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

  // Monotonic version counter to prevent stale async overwrites
  const tenantVersionRef = useRef(0);

  // Get active tenant ID from user metadata or deterministic fallback
  // Priority: app_metadata → URL slug → localStorage → no forced tenant
  useEffect(() => {
    if (user) {
      const userActiveTenantId = user.app_metadata?.active_tenant_id;
      if (userActiveTenantId) {
        console.debug('[useTenant] Using app_metadata tenant:', userActiveTenantId);
        setActiveTenantIdState(userActiveTenantId);
      } else {
        // Deterministic fallback: URL slug → localStorage → skip
        const slugFromUrl = (() => {
          const path = window.location.pathname;
          for (const slug of Object.keys(TENANT_CONFIGS)) {
            if (path.startsWith(`/${slug}`)) return slug;
          }
          return null;
        })();
        const slugFromStorage = localStorage.getItem('tenant_slug');
        const fallbackSlug = slugFromUrl || slugFromStorage;

        if (fallbackSlug) {
          console.debug('[useTenant] Deterministic fallback to slug:', fallbackSlug);
          const version = ++tenantVersionRef.current;
          const resolveTenant = async () => {
            const { data } = await supabase
              .from('tenants')
              .select('tenant_id')
              .eq('slug', fallbackSlug)
              .single();
            // Only apply if no newer call superseded us
            if (data && tenantVersionRef.current === version) {
              setActiveTenantIdState(data.tenant_id);
            }
          };
          resolveTenant();
        } else {
          console.debug('[useTenant] No tenant fallback available, skipping');
        }
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
        .eq('tenant_id', activeTenantId)
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
    // Skip tenant switching if no authenticated user
    if (!user) {
      return;
    }

    try {
      // Try the RPC to update JWT app_metadata (best path)
      let rpcOk = false;
      try {
        const { error } = await supabase.rpc('switch_to_tenant_by_slug', {
          p_tenant_slug: slug
        });
        if (error) {
          console.warn('[useTenant] RPC switch_to_tenant_by_slug failed, using local fallback:', error.message);
        } else {
          rpcOk = true;
        }
      } catch (rpcErr: any) {
        console.warn('[useTenant] RPC switch_to_tenant_by_slug threw, using local fallback:', rpcErr.message);
      }

      // If RPC succeeded, refresh session to pick up updated JWT
      if (rpcOk) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.warn('[useTenant] Session refresh error:', refreshError.message);
        }
      }

      // Always resolve tenant locally (works even if RPC failed)
      const { data } = await supabase
        .from('tenants')
        .select('tenant_id, name')
        .eq('slug', slug)
        .single();

      if (data) {
        setActiveTenantIdState(data.tenant_id);

        // Force invalidate all tenant-related queries
        const queryClient = (window as any).queryClient;
        if (queryClient) {
          await queryClient.invalidateQueries({ queryKey: ["tenant"] });
          await queryClient.refetchQueries({ queryKey: ["tenant", data.tenant_id] });
        }

        // Store tenant slug in localStorage for persistence
        localStorage.setItem('tenant_slug', slug);

        // Emit tenant change event
        window.dispatchEvent(new CustomEvent("tenant.changed", {
          detail: { from: activeTenantId, to: data.tenant_id, slug: slug }
        }));
      }
    } catch (error) {
      console.error('[useTenant] Error setting tenant by slug:', error);
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

/** Safe variant that returns undefined instead of throwing when outside TenantProvider */
export function useTenantSafe() {
  return useContext(TenantContext);
}