import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useRole } from "@/hooks/useRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { markRouteTransition } from "@/lib/routeTransition";

// ── Role-route enforcement ──────────────────────────────────────────
// Call from AppLayout so it runs on every authenticated page.
// Ensures the user's role always matches the route they are on.
const COMMUNITY_PREFIXES = ['/home', '/comm', '/discover', '/health', '/wallet', '/inbox', '/sharing', '/memory', '/autopilot', '/assistant', '/business'];
const SHARED_PATHS = ['/exafy-admin', '/maxina', '/alkalma', '/earthlinks', '/community', '/auth', '/_intro', '/dev', '/settings', '/onboarding', '/'];
// VTID-03988: consumer surfaces that happen to live under a role prefix.
// /patient/results shows the caller's own RLS-scoped data and is unlocked by
// patient_profiles (see usePatientAccess.ts), not by the active role — so a
// dbRole of 'community' must not bounce it to /home like the rest of /patient/*.
const CONSUMER_PATHS = ['/patient/results'];

export function useRoleRouteEnforcement() {
  const { user, loading: authLoading } = useAuth();
  // VTID-03936: dbRole (not the mobile-forced currentRole) — a mobile
  // patient/professional/staff/admin must be routed by their real role,
  // same as desktop. See useSmartRouting()'s own dbRole usage below for
  // the sibling half of this fix; the two must move together or mobile
  // ends up redirected to a role-appropriate dashboard here and bounced
  // straight back to /home by whichever of these two runs second.
  const { dbRole, isLoading: roleLoading } = useRole();
  // VTID-03973: BackOffice is desktop-only, unlike the other elevated-role
  // dashboards (admin/staff/professional/patient) VTID-03936 deliberately
  // routes to on mobile too. BackOffice's own screens (dense tables, a
  // maker-checker approval flow) were never designed or tested for a phone
  // viewport. See the isOnBackOffice-specific branches below.
  const isMobile = useIsMobile();
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
    if (CONSUMER_PATHS.includes(path)) return;

    const isOnCommunity = COMMUNITY_PREFIXES.some(p => path === p || path.startsWith(p + '/'));
    const isOnAdmin = path === '/admin' || path.startsWith('/admin/');
    // VTID-03832: /backoffice is enforced like /admin (community bounced to /home;
    // backoffice/admin/developer/infra allowed via ProtectedRoute's hierarchy check)
    const isOnBackOffice = path === '/backoffice' || path.startsWith('/backoffice/');
    const isOnStaff = path === '/staff' || path.startsWith('/staff/');
    const isOnProfessional = path === '/professional' || path.startsWith('/professional/');
    const isOnPatient = path === '/patient' || path.startsWith('/patient/');

    // VTID-03973: a backoffice account landing on /backoffice/* on mobile
    // (deep link, bookmark, typed URL — not just the post-login redirect
    // below) is bounced to /home instead of the desktop-only BackOffice UI.
    if (isOnBackOffice && isMobile) {
      navigate('/home', { replace: true });
      return;
    }

    // Admin/staff role but on community routes → redirect to admin
    if (isOnCommunity && (dbRole === 'admin' || dbRole === 'staff')) {
      navigate('/admin', { replace: true });
      return;
    }
    // BackOffice role on community routes → redirect to BackOffice, desktop
    // only (VTID-03832 / VTID-03973) — on mobile, stay on the community route.
    if (isOnCommunity && dbRole === 'backoffice' && !isMobile) {
      navigate('/backoffice/dashboard', { replace: true });
      return;
    }
    // Professional role on community routes → redirect to professional dashboard
    if (isOnCommunity && dbRole === 'professional') {
      navigate('/professional/dashboard', { replace: true });
      return;
    }
    // Patient role on community routes → redirect to patient dashboard
    if (isOnCommunity && dbRole === 'patient') {
      navigate('/patient/dashboard', { replace: true });
      return;
    }
    // Community role on admin/staff/professional/patient routes → redirect to home
    if (dbRole === 'community' && (isOnAdmin || isOnBackOffice || isOnStaff || isOnProfessional || isOnPatient)) {
      navigate('/home', { replace: true });
      return;
    }
  }, [user, authLoading, roleLoading, dbRole, isMobile, location.pathname, navigate]);
}

// News (the "All News" home feed at /home) is the default landing screen after
// login for MAXINA community users. The native (Appilix) shell already opens the
// WebView directly on /home, and the `/`-based smart routing now resolves to
// /home too, so no initial-landing redirect is required — News is the intended
// cold-start destination. Kept as a no-op so existing call sites stay valid.
export function useInitialLandingRedirect() {
  // Intentionally empty: /home (News) is the default landing screen, so there is
  // nothing to redirect away from on a cold start.
}

export function useSmartRouting() {
  const { user, loading: authLoading } = useAuth();
  const { isExafyAdmin, activeTenantId, tenant } = useTenant();
  // VTID-03936: dbRole, not the mobile-forced currentRole — see
  // useRoleRouteEnforcement()'s own comment above, same fix, same reason.
  const { dbRole } = useRole();
  // VTID-03973: BackOffice is desktop-only — see useRoleRouteEnforcement()'s
  // comment above. The two `case "backoffice":` branches below route to
  // /home instead of /backoffice/dashboard on mobile.
  const isMobile = useIsMobile();
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
          // Mask the landing redirect chain (role/tenant resolution → dest).
          markRouteTransition();
          // Route based on stored role preference, not always to admin
          switch (dbRole) {
            case "admin":
            case "staff":
              navigate('/admin');
              break;
            case "backoffice":
              navigate(isMobile ? '/home' : '/backoffice/dashboard');
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
                navigate("/home");
              }
              break;
          }
        }
        return;
      }

      // Regular users - route to appropriate dashboard based on role
      if (dbRole && location.pathname === '/') {
        markRouteTransition();
        switch (dbRole) {
          case "admin":
          case "staff":
            navigate("/admin");
            break;
          case "backoffice":
            navigate(isMobile ? "/home" : "/backoffice/dashboard");
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
              // Fallback to News (default landing) if no tenant info available
              navigate("/home");
            }
            break;
        }
      }
    }
  }, [user, authLoading, isExafyAdmin, dbRole, isMobile, tenant, location.pathname, navigate]);
}

// Hook to get appropriate redirect URL based on user type
export function useRoleBasedRedirect() {
  const { isExafyAdmin, tenant } = useTenant();
  // VTID-03936: dbRole, not the mobile-forced currentRole — this hook backs
  // the post-email-confirmation landing pages (EmailConfirmed.tsx and the
  // per-tenant *Confirmed.tsx pages), which a mobile patient/professional/
  // staff/admin reaches just as often as desktop; same fix as
  // useSmartRouting()/useRoleRouteEnforcement() above, for the same reason.
  const { dbRole } = useRole();
  // VTID-03973: BackOffice is desktop-only — see useRoleRouteEnforcement()'s
  // comment. A backoffice account confirming email on mobile lands on /home,
  // not the desktop-only BackOffice UI.
  const isMobile = useIsMobile();

  const getRedirectUrl = () => {
    // Exafy Admins fall through to the same dbRole switch — no hardcoded admin redirect
    switch (dbRole) {
      case "admin":
      case "staff":
        return "/admin";
      case "backoffice":
        return isMobile ? "/home" : "/backoffice/dashboard";
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