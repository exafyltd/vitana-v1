import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

/** Check whether the external ORB widget is actually alive in the DOM */
function isOrbAlive(): boolean {
  return !!(
    document.querySelector('.vtorb-fab') ||
    document.querySelector('[class^="vtorb-fab"]') ||
    document.querySelector('.vitana-orb') ||
    document.getElementById('vitana-orb-fab')
  );
}

const RECENT_ROUTES_MAX = 5;

type NavigationContext = {
  screen_id?: string;
  reason?: string;
  title?: string;
};

export function useOrbVoiceWidget() {
  const initialized = useRef(false);
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // VTID-NAV: Mutable refs so the navigation callback always uses the latest
  // router function and the freshest route history, even though the init
  // effects below capture them only when they re-run.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const routeHistoryRef = useRef<string[]>([location.pathname]);

  // VTID-NAV-01: Called by orb-widget when the Vitana Navigator dispatches an
  // orb_directive of type 'navigate'. Uses React Router so the transition is
  // a smooth SPA change (works inside Appilix WebView with no full reload).
  const handleNavigationRequest = (url: string, _ctx: NavigationContext) => {
    try {
      navigateRef.current(url);
    } catch (err) {
      console.warn("[ORB] React Router navigate failed, falling back:", err);
      window.location.href = url;
    }
  };

  // Main init effect — waits for auth to resolve, then inits widget
  useEffect(() => {
    if (loading) return;

    function tryInit() {
      const orb = (window as any).VitanaOrb;
      if (!orb) return false;

      // If we think we're initialized but the widget was destroyed externally, reset
      if (initialized.current && !isOrbAlive()) {
        console.log("[ORB] Widget was destroyed externally, resetting state");
        initialized.current = false;
      }

      if (!initialized.current) {
        // VTID-NAV-01: Navigator wiring — onNavigationRequest callback for
        // SPA transitions, initialContext so the first orb session has
        // accurate current_route + recent_routes for the Navigator service.
        const navOpts = {
          showFab: true,
          onNavigationRequest: handleNavigationRequest,
          initialContext: {
            current_route: location.pathname,
            recent_routes: routeHistoryRef.current,
          },
        };
        if (user && session) {
          orb.init({ ...navOpts, authToken: session.access_token });
          console.log("[ORB] Widget initialized (authenticated)");
        } else {
          orb.init(navOpts);
          console.log("[ORB] Widget initialized (anonymous)");
        }
        initialized.current = true;
      }
      return true;
    }

    if (tryInit()) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryInit() || attempts >= 20) {
        clearInterval(interval);
        if (attempts >= 20) console.warn("[ORB] Widget script never loaded");
      }
    }, 500);

    return () => clearInterval(interval);
  }, [loading, user?.id, session?.access_token]);

  // Watch for auth changes — reinit widget when user logs in or out
  useEffect(() => {
    if (loading) return;
    const orb = (window as any).VitanaOrb;
    if (!orb || !initialized.current) return;

    // Auth state changed — destroy and reinit with correct mode
    orb.destroy();
    initialized.current = false;

    // VTID-NAV-01: Reinit must also wire the Navigator callback + context.
    const navOpts = {
      showFab: true,
      onNavigationRequest: handleNavigationRequest,
      initialContext: {
        current_route: location.pathname,
        recent_routes: routeHistoryRef.current,
      },
    };
    if (user && session) {
      orb.init({ ...navOpts, authToken: session.access_token });
    } else {
      orb.init(navOpts);
    }
    initialized.current = true;
    console.log("[ORB] Reinitialized for auth change:", user ? "authenticated" : "anonymous");
  }, [user?.id]);

  // VTID-NAV-01: Track navigation history and push to widget on every route
  // change. The widget stashes these values and includes them in the next
  // orb session-start payload so the Navigator service always has accurate
  // current_route + recent_routes context for catalog ranking.
  useEffect(() => {
    const path = location.pathname;
    const filtered = routeHistoryRef.current.filter((p) => p !== path);
    routeHistoryRef.current = [path, ...filtered].slice(0, RECENT_ROUTES_MAX);

    const orb = (window as any).VitanaOrb;
    if (orb && typeof orb.updateContext === "function") {
      orb.updateContext({
        current_route: path,
        recent_routes: routeHistoryRef.current,
      });
    }
  }, [location.pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const orb = (window as any).VitanaOrb;
      if (orb && initialized.current) {
        orb.destroy();
        initialized.current = false;
      }
    };
  }, []);
}
