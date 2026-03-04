import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useRole } from "@/hooks/useRole";

export function useSmartRouting() {
  const { user, loading: authLoading } = useAuth();
  const { isExafyAdmin, activeTenantId, tenant } = useTenant();
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;

    // Don't redirect if already on a portal page or auth page
    const portalPaths = ['/exafy-admin', '/maxina', '/alkalma', '/earthlinks', '/community', '/auth', '/_intro', '/dev'];
    if (portalPaths.some(path => location.pathname.startsWith(path))) return;

    // If user is not authenticated, handle based on current path
    if (!user) {
      // Allow access to public pages and portal pages
      const publicPaths = ['/', '/maxina', '/alkalma', '/earthlinks', '/exafy-admin', '/_intro'];
      if (publicPaths.some(path => location.pathname === path || location.pathname.startsWith(path))) return;
      
      // Redirect unauthenticated users trying to access protected pages to landing page
      // Use replace to avoid back button issues during logout
      navigate('/', { replace: true });
      return;
    }

    // User is authenticated - route based on their role and tenant
    if (user && !authLoading) {
      // Exafy super admin - route to tenant management
      if (isExafyAdmin) {
        // Only redirect from root path to avoid interfering with navigation
        if (location.pathname === '/' || location.pathname === '/home') {
          // Route based on stored role preference, not always to admin
          switch (currentRole) {
            case "admin":
            case "staff":
              navigate('/admin');
              break;
            case "professional":
              navigate('/professional/dashboard');
              break;
            case "patient":
              navigate('/patient/dashboard');
              break;
            case "community":
            default:
              // Default to community experience based on tenant
              const isMobileDevice = window.innerWidth < 768;
              if (tenant?.slug) {
                switch (tenant.slug) {
                  case 'alkalma':
                    navigate("/alkalma");
                    break;
                  case 'earthlinks':
                    navigate("/earthlinks");
                    break;
                  case 'maxina':
                    navigate(isMobileDevice ? "/comm/events-meetups?tab=hot" : "/maxina");
                    break;
                  default:
                    navigate("/maxina");
                    break;
                }
              } else {
                navigate("/home");
              }
              break;
          }
        }
        return;
      }

      // Regular users - route to appropriate dashboard based on role
      if (currentRole && location.pathname === '/') {
        switch (currentRole) {
          case "admin":
          case "staff":
            navigate("/admin");
            break;
          case "professional":
            navigate("/professional/dashboard");
            break;
          case "patient":
            navigate("/patient/dashboard");
            break;
          case "community":
          default:
            // Redirect community users to tenant-specific pages based on their active tenant
            // On mobile, Maxina users go to Events → Hot
            const isMobileDevice = window.innerWidth < 768;
            if (tenant?.slug) {
              switch (tenant.slug) {
                case 'alkalma':
                  navigate("/alkalma");
                  break;
                case 'earthlinks':
                  navigate("/earthlinks");
                  break;
                case 'maxina':
                  // Mobile: default to Events Hot
                  navigate(isMobileDevice ? "/comm/events-meetups?tab=hot" : "/maxina");
                  break;
                default:
                  navigate("/maxina");
                  break;
              }
            } else {
              // Fallback to home if no tenant info available
              navigate("/home");
            }
            break;
        }
      }
    }
  }, [user, authLoading, isExafyAdmin, currentRole, tenant, location.pathname, navigate]);
}

// Hook to get appropriate redirect URL based on user type
export function useRoleBasedRedirect() {
  const { isExafyAdmin, tenant } = useTenant();
  const { currentRole } = useRole();

  const getRedirectUrl = () => {
    // Exafy Admins fall through to the same currentRole switch — no hardcoded admin redirect
    switch (currentRole) {
      case "admin":
      case "staff":
        return "/admin";
      case "professional":
        return "/professional/dashboard";
      case "patient":
        return "/patient/dashboard";
      case "community":
      default:
        // Redirect community users to tenant-specific pages
        // On mobile, Maxina users go to Events → Upcoming
        const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
        if (tenant?.slug) {
          switch (tenant.slug) {
            case 'alkalma':
              return "/alkalma";
            case 'earthlinks':
              return "/earthlinks";
            case 'maxina':
              return isMobileDevice ? "/comm/events-meetups?tab=hot" : "/maxina";
            default:
              return "/maxina";
          }
        }
        return "/home";
    }
  };

  return { getRedirectUrl };
}

// Hook to get tenant-specific logout redirect URL
export function useTenantLogoutRedirect() {
  const { isExafyAdmin, tenant } = useTenant();
  
  const getLogoutRedirectUrl = () => {
    if (isExafyAdmin) {
      return "/exafy-admin";
    }
    
    // Try to get tenant slug from current context or localStorage
    const tenantSlug = tenant?.slug || localStorage.getItem('logout_tenant_slug');
    
    switch (tenantSlug) {
      case "maxina":
        return "/maxina";
      case "alkalma": 
        return "/alkalma";
      case "earthlinks":
        return "/earthlinks";
      default:
        return "/";
    }
  };
  
  return { getLogoutRedirectUrl };
}

// Tenant detection from URL
export function useTenantFromUrl() {
  const location = useLocation();
  
  const getTenantFromPath = (): string | null => {
    if (location.pathname.startsWith('/maxina')) return 'maxina';
    if (location.pathname.startsWith('/alkalma')) return 'alkalma';
    if (location.pathname.startsWith('/earthlinks')) return 'earthlinks';
    return null;
  };

  return { getTenantFromPath };
}