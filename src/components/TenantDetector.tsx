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
      if (location.pathname.startsWith('/earthlinks')) return 'earthlinks';
      return null;
    };

    const urlTenantSlug = getTenantSlugFromPath();
    
    console.log('TenantDetector - Current path:', location.pathname);
    console.log('TenantDetector - URL tenant slug:', urlTenantSlug);
    console.log('TenantDetector - Current tenant slug:', tenant?.slug);
    console.log('TenantDetector - Current tenant name:', tenant?.name);
    
    // Always prioritize URL-based tenant detection
    // This allows users to switch tenants by navigating to different portal URLs
    if (urlTenantSlug) {
      // Check if we need to switch to a different tenant
      if (tenant?.slug !== urlTenantSlug) {
        console.log(`TenantDetector - Switching tenant from ${tenant?.slug} to ${urlTenantSlug}`);
        setTenantBySlug(urlTenantSlug);
      } else {
        console.log(`TenantDetector - Already on correct tenant: ${urlTenantSlug}`);
      }
    }
  }, [location.pathname, setTenantBySlug, tenant?.slug]);

  return null; // This component doesn't render anything
}