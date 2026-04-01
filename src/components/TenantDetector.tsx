import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTenantSafe } from "@/hooks/useTenant";
import { useAuth } from "@/context/AuthProvider";

/**
 * Component to detect tenant from URL and update context
 * Must be used inside Router context
 * Re-evaluates when auth session becomes available (critical for OAuth returns)
 * Uses useTenantSafe to avoid crashes during HMR or context initialization races
 */
export function TenantDetector() {
  const location = useLocation();
  const tenantCtx = useTenantSafe();
  const { user } = useAuth();

  const setTenantBySlug = tenantCtx?.setTenantBySlug;
  const tenantSlug = tenantCtx?.tenant?.slug;

  useEffect(() => {
    if (!setTenantBySlug) return;

    const getTenantSlugFromPath = (): string | null => {
      if (location.pathname.startsWith('/maxina')) return 'maxina';
      if (location.pathname.startsWith('/alkalma')) return 'alkalma';
      if (location.pathname.startsWith('/earthlinks')) return 'earthlinks';
      return null;
    };

    const urlTenantSlug = getTenantSlugFromPath();
    
    if (urlTenantSlug && tenantSlug !== urlTenantSlug) {
      console.debug('[TenantDetector] Switching to', urlTenantSlug, 'user:', !!user);
      setTenantBySlug(urlTenantSlug);
    }
  }, [location.pathname, setTenantBySlug, tenantSlug, user]);

  return null;
}
