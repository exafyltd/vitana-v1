// tenant-context v3 (VTID-05151: tenants come from the registry, not from code)
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canonicalTenantSlug, readStoredTenantSlug } from "@/lib/retired-tenants";
import { ensureTenantRegistry, useTenantRegistry } from "@/hooks/useTenantRegistry";
import {
  SLUG_RE,
  findById,
  findBySlug,
  isReservedSlug,
  resolveActiveTenant,
  safeHex,
  tenantSlugFromPath,
  type ResolvedTenant,
} from "@/lib/tenant-registry";

// VTID-05151: there is no compiled list of tenants any more. A tenant is any
// slug the registry (list_public_tenants) returns; a retired slug (VTID-04836:
// earthlinks) is mapped to its successor by canonicalTenantSlug() first.
export type { TenantSlug, ResolvedTenant } from "@/lib/tenant-registry";

export type TenantSwitchResult =
  | { ok: true; tenantId: string }
  | { ok: false; code: "not_signed_in" | "unknown_tenant" | "not_joinable" | "rpc_failed"; message?: string };

interface TenantContextValue {
  activeTenantId: string | null;
  tenant: ResolvedTenant | null;
  isExafyAdmin: boolean;
  setActiveTenant: (tenantId: string) => Promise<void>;
  setTenantBySlug: (slug: string) => Promise<TenantSwitchResult>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const registry = useTenantRegistry();
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(null);

  // Get Exafy admin status
  const isExafyAdmin = user?.app_metadata?.exafy_admin === true;

  // Monotonic version counter to prevent stale async overwrites
  const tenantVersionRef = useRef(0);
  const registrySlugs = registry.tenants.map((t) => `${t.slug}:${t.tenant_id}`).join(",");

  // Get active tenant ID from user metadata or deterministic fallback
  // Priority: app_metadata → URL slug → localStorage → no forced tenant
  useEffect(() => {
    if (user) {
      const userActiveTenantId = user.app_metadata?.active_tenant_id;
      if (userActiveTenantId) {
        console.debug('[useTenant] Using app_metadata tenant:', userActiveTenantId);
        setActiveTenantIdState(userActiveTenantId);
      } else {
        // Deterministic fallback: URL slug → localStorage → skip (registry slugs only)
        const slugFromUrl = tenantSlugFromPath(window.location.pathname, registry);
        const slugFromStorage = findBySlug(registry, readStoredTenantSlug('tenant_slug'))?.slug ?? null;
        const fallbackSlug = slugFromUrl || slugFromStorage;

        if (fallbackSlug) {
          console.debug('[useTenant] Deterministic fallback to slug:', fallbackSlug);
          const version = ++tenantVersionRef.current;
          const entry = findBySlug(registry, fallbackSlug);
          if (entry?.tenant_id) {
            setActiveTenantIdState(entry.tenant_id);
            return;
          }
          // Only the compiled fallback has no id (the registry call failed):
          // resolve it from the tenants row, as before VTID-05151.
          const resolveTenant = async () => {
            const { data, error } = await supabase
              .from('tenants')
              .select('tenant_id')
              .eq('slug', fallbackSlug)
              .single();
            if (error) {
              console.warn('[useTenant] Deterministic fallback tenant lookup failed:', error.message);
            }
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
    // registrySlugs: re-run once the registry has loaded (the snapshot or
    // fallback may not know the tenant in the URL yet).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, registrySlugs]);

  // The tenants row, only for an active tenant the registry does not list by id.
  const listedById = !!findById(registry, activeTenantId);
  const { data: tenantRow } = useQuery({
    queryKey: ["tenant", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('tenant_id, slug, name')
        .eq('tenant_id', activeTenantId)
        .single();

      if (error) throw error;
      return data as { tenant_id: string; slug: string | null; name: string };
    },
    enabled: !!activeTenantId && !listedById,
  });

  const tenant = useMemo(
    () => resolveActiveTenant(activeTenantId, registry, tenantRow),
    [activeTenantId, registry, tenantRow],
  );

  // Apply tenant CSS variables (validated hex only; nothing consumes them yet — C2).
  useEffect(() => {
    if (!tenant) return;
    const root = document.documentElement;
    const vars: Array<[string, string | undefined]> = [
      ["--brand-accent", safeHex(tenant.brandAccent)],
      ["--brand-bg", safeHex(tenant.brandBg)],
      ["--brand-fg", safeHex(tenant.brandFg)],
    ];
    for (const [name, value] of vars) if (value) root.style.setProperty(name, value);
  }, [tenant]);

  const setActiveTenant = async (tenantId: string) => {
    if (!isExafyAdmin) {
      throw new Error("Only Exafy administrators can switch tenants");
    }

    try {
      const { error } = await supabase.functions.invoke('set_active_tenant', {
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

  /**
   * Switch into (or join) a tenant by slug through switch_to_tenant_by_slug
   * (VTID-05043: a member or exafy_admin switches; anyone else joins only an
   * open_signup tenant, otherwise 42501 TENANT_NOT_JOINABLE).
   *
   * An unknown or reserved slug is refused before any call. When the RPC
   * refuses, the tenant is NOT set — there is no local fallback that would put
   * the user into a tenant the server just refused (VTID-05151).
   */
  const setTenantBySlug = async (requestedSlug: string): Promise<TenantSwitchResult> => {
    // Skip tenant switching if no authenticated user
    if (!user) {
      return { ok: false, code: "not_signed_in" };
    }

    // VTID-04836: never look up or persist a retired tenant slug.
    const slug = canonicalTenantSlug(String(requestedSlug ?? "").trim().toLowerCase());
    if (!SLUG_RE.test(slug) || isReservedSlug(slug)) {
      console.warn('[useTenant] Refusing tenant switch to an invalid or reserved slug:', slug);
      return { ok: false, code: "unknown_tenant" };
    }
    const reg = await ensureTenantRegistry(queryClient);
    const entry = findBySlug(reg, slug);
    if (!entry) {
      console.warn('[useTenant] Refusing tenant switch to a slug the registry does not list:', slug, `(registry: ${reg.source})`);
      return { ok: false, code: "unknown_tenant" };
    }

    try {
      const { error } = await supabase.rpc('switch_to_tenant_by_slug', {
        p_tenant_slug: slug
      });
      if (error) {
        console.warn('[useTenant] RPC switch_to_tenant_by_slug refused:', error.code, error.message);
        return {
          ok: false,
          code: error.code === '42501' ? "not_joinable" : "rpc_failed",
          message: error.message,
        };
      }
    } catch (rpcErr: any) {
      console.warn('[useTenant] RPC switch_to_tenant_by_slug threw:', rpcErr?.message);
      return { ok: false, code: "rpc_failed", message: rpcErr?.message };
    }

    // The RPC updated the active_tenant_id claim; refresh to pick it up.
    await new Promise(resolve => setTimeout(resolve, 100));
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn('[useTenant] Session refresh error:', refreshError.message);
    }
    const tenantId: string | undefined =
      refreshed?.session?.user?.app_metadata?.active_tenant_id || entry.tenant_id || undefined;
    if (!tenantId) {
      console.warn('[useTenant] Switched tenant but could not read its id:', slug);
      return { ok: false, code: "rpc_failed" };
    }

    setActiveTenantIdState(tenantId);

    // Force invalidate all tenant-related queries
    const globalQueryClient = (window as any).queryClient;
    if (globalQueryClient) {
      await globalQueryClient.invalidateQueries({ queryKey: ["tenant"] });
      await globalQueryClient.refetchQueries({ queryKey: ["tenant", tenantId] });
    }

    // Store tenant slug in localStorage for persistence
    try {
      localStorage.setItem('tenant_slug', slug);
    } catch {
      // Storage unavailable; the session claim is the authority anyway.
    }

    // Emit tenant change event
    window.dispatchEvent(new CustomEvent("tenant.changed", {
      detail: { from: activeTenantId, to: tenantId, slug: slug }
    }));
    return { ok: true, tenantId };
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
