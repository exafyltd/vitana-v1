import { useEffect, useRef, useCallback } from "react";
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
  const activeTenantId = tenantCtx?.activeTenantId;

  // Guard: track in-flight call and last attempted slug to prevent duplicate calls
  const inFlightRef = useRef(false);
  const lastAttemptedSlugRef = useRef<string | null>(null);

  const getTenantSlugFromPath = useCallback((): string | null => {
    if (location.pathname.startsWith('/maxina')) return 'maxina';
    if (location.pathname.startsWith('/alkalma')) return 'alkalma';
    if (location.pathname.startsWith('/earthlinks')) return 'earthlinks';
    return null;
  }, [location.pathname]);

  useEffect(() => {
    if (!setTenantBySlug) return;

    const urlTenantSlug = getTenantSlugFromPath();

    // Already resolved or already in-flight for this slug — skip
    if (!urlTenantSlug) return;
    if (tenantSlug === urlTenantSlug) return;
    if (activeTenantId && lastAttemptedSlugRef.current === urlTenantSlug) return;
    if (inFlightRef.current) return;

    console.debug('[TenantDetector] Switching to', urlTenantSlug, 'user:', !!user);
    inFlightRef.current = true;
    lastAttemptedSlugRef.current = urlTenantSlug;

    setTenantBySlug(urlTenantSlug).finally(() => {
      inFlightRef.current = false;
    });
  }, [location.pathname, setTenantBySlug, tenantSlug, activeTenantId, user, getTenantSlugFromPath]);

  return null;
}
