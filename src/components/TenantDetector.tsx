import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";

/**
 * Component to detect tenant from URL and update context
 * Must be used inside Router context
 */
export function TenantDetector() {
  const location = useLocation();
  const { setTenantBySlug, tenant } = useTenant();

  useEffect(() => {
    const getTenantSlugFromPath = (): string | null => {
      if (location.pathname.startsWith('/maxina')) return 'maxina';
      if (location.pathname.startsWith('/alkalma')) return 'alkalma';
      if (location.pathname.startsWith('/earthlings')) return 'earthlings';
      return null;
    };

    const urlTenantSlug = getTenantSlugFromPath();
    
    // Always prioritize URL-based tenant detection
    // This allows users to switch tenants by navigating to different portal URLs
    if (urlTenantSlug) {
      // Check if we need to switch to a different tenant
      if (tenant?.slug !== urlTenantSlug) {
        setTenantBySlug(urlTenantSlug);
      }
    }
  }, [location.pathname, setTenantBySlug, tenant?.slug]);

  return null; // This component doesn't render anything
}