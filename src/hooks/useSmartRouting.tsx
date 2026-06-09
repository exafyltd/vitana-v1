import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useRole } from "@/hooks/useRole";

// ── Role-route enforcement ──────────────────────────────────────────
// Call from AppLayout so it runs on every authenticated page.
// Ensures the user's role always matches the route they are on.
const COMMUNITY_PREFIXES = ['/home', '/comm', '/discover', '/health', '/wallet', '/inbox', '/sharing', '/memory', '/autopilot', '/assistant', '/business'];
const SHARED_PATHS = ['/exafy-admin', '/maxina', '/alkalma', '/earthlinks', '/community', '/auth', '/_intro', '/dev', '/settings', '/onboarding', '/'];

export function useRoleRouteEnforcement() {
  const { user, loading: authLoading } = useAuth();
  const { currentRole, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || roleLoading || !user) return;

    const path = location.pathname;

    // Device Preview is an admin tool that previews the (community) mobile UI.
    // Its route guard already checks admin permission; exempt it from view-role
    // enforcement so admins can open it even while viewing as community (which
    // is forced on mobile-width viewports), instead of being bounced to /home.
    if (path === '/admin/device-preview') return;

    // Don't enforce on portal, auth, settings, or dev pages (shared across roles)
    if (SHARED_PATHS.some(p => path === p || (p !== '/' && path.startsWith(p)))) return;

    const isOnCommunity = COMMUNITY_PREFIXES.some(p => path === p || path.startsWith(p + '/'));
    const isOnAdmin = path === '/admin' || path.startsWith('/admin/');
    const isOnStaff = path === '/staff' || path.startsWith('/staff/');
    const isOnProfessional = path === '/professional' || path.startsWith('/professional/');
    const isOnPatient = path === '/patient' || path.startsWith('/patient/');

    // Admin/staff role but on community routes → redirect to admin
    if (isOnCommunity && (currentRole === 'admin' || currentRole === 'staff')) {
      navigate('/admin', { replace: true });
      return;
    }
    // Professional role on community routes → redirect to professional dashboard
    if (isOnCommunity && currentRole === 'professional') {
      navigate('/professional/dashboard', { replace: true });
      return;
    }
    // Patient role on community routes → redirect to patient dashboard
    if (isOnCommunity && currentRole === 'patient') {
      navigate('/patient/dashboard', { replace: true });
      return;
    }
    // Community role on admin/staff/professional/patient routes → redirect to home
    if (currentRole === 'community' && (isOnAdmin || isOnStaff || isOnProfessional || isOnPatient)) {
      navigate('/home', { replace: true });
      return;
    }
  }, [user, authLoading, roleLoading, currentRole, location.pathname, navigate]);
}

// One-shot initial-landing redirect for the MAXINA community app. The native
// (Appilix) shell can open the WebView directly on /home (News) — a route the
// `/`-only smart routing never evaluates — so a fresh app launch would sit on
// News instead of My Journey. On the first fully-resolved authenticated route
// of a browser/app session, if that route is the News feed, send the user to
// My Journey once. Deliberate navigation to News later in the session is left
// untouched (the flag is already set).
const INITIAL_LANDING_FLAG = "mj_initial_landing_redirected";

export function useInitialLandingRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { tenant } = useTenant();
  const { currentRole, isLoading: roleLoading } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || roleLoading || !user) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(INITIAL_LANDING_FLAG)) return;

    const slug = tenant?.slug;
    if (!slug) return; // wait for the tenant to resolve before deciding

    // First fully-resolved authenticated route of the session — record it so
    // this only ever fires once, then act only on a News-feed cold start.
    sessionStorage.setItem(INITIAL_LANDING_FLAG, "1");

    if (slug !== "maxina") return;
    if (currentRole && currentRole !== "community") return;
    if (location.pathname === "/home") {
      navigate("/autopilot", { replace: true });
    }
  }, [authLoading, roleLoading, user, tenant?.slug, currentRole, location.pathname, navigate]);
}

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
              // Default to community experience based on tenant.
              // Maxina users go through onboarding; OnboardingWelcome self-redirects if completed.
              if (tenant?.slug) {
                switch (tenant.slug) {
                  case 'alkalma':
                    navigate("/alkalma");
                    break;
                  case 'earthlinks':
                    navigate("/earthlinks");
                    break;
                  case 'maxina':
                    navigate("/onboarding/welcome");
                    break;
                  default:
                    navigate("/maxina");
                    break;
                }
              } else {
                navigate("/autopilot");
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
            // Redirect community users to tenant-specific pages based on their active tenant.
            // Maxina users go through onboarding; OnboardingWelcome self-redirects if completed.
            if (tenant?.slug) {
              switch (tenant.slug) {
                case 'alkalma':
                  navigate("/alkalma");
                  break;
                case 'earthlinks':
                  navigate("/earthlinks");
                  break;
                case 'maxina':
                  navigate("/onboarding/welcome");
                  break;
                default:
                  navigate("/maxina");
                  break;
              }
            } else {
              // Fallback to My Journey if no tenant info available
              navigate("/autopilot");
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
        // Redirect community users to tenant-specific pages.
        // Maxina users go through onboarding; OnboardingWelcome self-redirects if completed.
        if (tenant?.slug) {
          switch (tenant.slug) {
            case 'alkalma':
              return "/alkalma";
            case 'earthlinks':
              return "/earthlinks";
            case 'maxina':
              return "/onboarding/welcome";
            default:
              return "/maxina";
          }
        }
        return "/autopilot";
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