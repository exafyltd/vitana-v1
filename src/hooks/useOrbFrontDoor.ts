import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useOrbWidgetAuthenticated } from "@/lib/orbWidgetReady";

// Routes a freshly-authenticated MAXINA user can land on right after
// sign-in, OAuth, or post-onboarding redirect (see MaxinaPortal +
// OnboardingWelcome). The Orb auto-opens on these only.
const MAXINA_LANDING_ROUTES = new Set<string>([
  "/",
  "/home",
  "/comm/events-meetups",
  "/comm/events",
  "/autopilot",
]);

function isMaxinaLandingRoute(pathname: string): boolean {
  if (MAXINA_LANDING_ROUTES.has(pathname)) return true;
  // Path may carry a trailing slash from history replaceState
  if (pathname.endsWith("/") && MAXINA_LANDING_ROUTES.has(pathname.slice(0, -1))) {
    return true;
  }
  return false;
}

type OrbWidget = { show?: () => void };

function tryShowOrb(): boolean {
  const orb = (window as unknown as { VitanaOrb?: OrbWidget }).VitanaOrb;
  if (!orb || typeof orb.show !== "function") return false;
  try {
    orb.show();
    return true;
  } catch {
    return false;
  }
}

/**
 * Voice-first front door for the MAXINA tenant.
 *
 * On every authenticated mount that lands the user on a MAXINA post-login
 * route, opens the external VitanaOrb overlay automatically so the assistant
 * is the first thing the user meets — instead of the full dashboard.
 *
 * Fires at most once per signed-in user per browser tab session: navigating
 * between MAXINA landing routes does not re-open the overlay (the user is
 * already past the front door), and a transient WebSocket reconnect inside
 * the live ORB session does not unmount this hook so it cannot re-fire
 * during the same React tree lifetime.
 *
 * Page reloads remount the React tree → the overlay re-opens, which is the
 * intended "session start" semantic.
 *
 * Non-MAXINA tenants are untouched: the gate short-circuits on tenant slug.
 */
export function useOrbFrontDoor() {
  const { user, loading: authLoading } = useAuth();
  const { tenant } = useTenant();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingStatus();
  const location = useLocation();
  const shownForUserRef = useRef<string | null>(null);
  // Gate the auto-open on the widget being initialized with a backend-verified
  // token. Without this gate, show() can fire before useOrbVoiceWidget has
  // resolved /auth/me, and the resulting session-start lands at the gateway
  // anonymous — which routes the user to the multi-minute pre-login intro
  // speech instead of the post-login proactive guidance.
  const orbAuthenticated = useOrbWidgetAuthenticated();

  const userId = user?.id;
  const tenantSlug = tenant?.slug;

  // Reset the once-flag when the user changes (logout / different account).
  useEffect(() => {
    if (!userId) {
      shownForUserRef.current = null;
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading || onboardingLoading) return;
    if (!userId) return;
    if (needsOnboarding) return;
    if (tenantSlug !== "maxina") return;
    if (!isMaxinaLandingRoute(location.pathname)) return;
    if (shownForUserRef.current === userId) return;
    if (!orbAuthenticated) return;

    // Try once immediately; if the external widget script hasn't injected
    // window.VitanaOrb yet, poll briefly. Same 60s ceiling as the widget
    // init path (see useOrbVoiceWidget) so a slow mobile WebView still gets
    // the front door once the script eventually loads.
    if (tryShowOrb()) {
      shownForUserRef.current = userId;
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 120; // 120 × 500ms = 60s
    const interval = setInterval(() => {
      attempts++;
      if (tryShowOrb()) {
        shownForUserRef.current = userId;
        clearInterval(interval);
      } else if (attempts >= MAX_ATTEMPTS) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [
    authLoading,
    onboardingLoading,
    userId,
    tenantSlug,
    needsOnboarding,
    location.pathname,
    orbAuthenticated,
  ]);
}
