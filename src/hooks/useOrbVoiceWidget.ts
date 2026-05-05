import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

/** Check whether the external ORB widget is actually alive in the DOM */
function isOrbAlive(): boolean {
  return !!(
    document.querySelector('.vtorb-fab') ||
    document.querySelector('[class^="vtorb-fab"]') ||
    document.querySelector('.vitana-orb') ||
    document.getElementById('vitana-orb-fab')
  );
}

// VITE_GATEWAY_URL already includes "/api/v1" — see useAIAssistants.ts for the pattern.
const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || "").replace(/\/+$/, "");

/**
 * VTID-AUTH-BACKEND-PROBE: Ask the backend whether it accepts this token.
 *
 * Supabase client-side `getSession()` returns a session that LOOKS valid based
 * on the cached JWT's `exp` claim — but the backend may have already rejected
 * the token (user was signed out elsewhere, token revoked, clock drift, etc.).
 *
 * Without this probe the ORB widget sends a stale Bearer header, `optionalAuth`
 * on `/live/session/start` silently treats the call as anonymous, and the user
 * hears the first-time intro greeting while the app still shows them logged in.
 *
 * Returns:
 *   - `true`  → backend accepts the token; safe to init the widget.
 *   - `false` → backend explicitly rejects (401/403); caller must sign out.
 *   - `true`  on network/timeout — transient errors must NOT trigger signouts.
 */
async function backendAcceptsToken(token: string): Promise<boolean> {
  if (!GATEWAY_URL) return true; // no gateway configured → skip probe
  try {
    const res = await fetch(`${GATEWAY_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401 || res.status === 403) return false;
    return true;
  } catch {
    return true; // network/timeout → stay optimistic
  }
}

const RECENT_ROUTES_MAX = 5;

type NavigationContext = {
  screen_id?: string;
  reason?: string;
  title?: string;
};

// VTID-NAV-TIMEJOURNEY: Each entry tracks when the user landed on that route
// so the backend greeting can say "you've been on the Events page for 3 min"
// or understand the user's rhythm through the app. `enteredAt` is a plain
// millisecond timestamp (Date.now()); the backend converts it to a bucket.
type JourneyEntry = {
  path: string;
  enteredAt: number;
};

export function useOrbVoiceWidget() {
  const initialized = useRef(false);
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // VTID-AUTH-BACKEND-PROBE: Shared token resolver. Refreshes if expiring,
  // probes the backend, and returns:
  //   - a fresh token the backend accepts, or
  //   - null with `rejected=true` when the backend explicitly rejects (caller must signOut), or
  //   - null with `rejected=false` when there simply is no session (anonymous is fine).
  const resolveVerifiedToken = async (): Promise<{ token: string | null; rejected: boolean }> => {
    const { data: { session: cached } } = await supabase.auth.getSession();
    if (!cached) return { token: null, rejected: false };

    let token: string | null = cached.access_token;
    const expiresAt = cached.expires_at;
    if (expiresAt && expiresAt * 1000 - Date.now() < 60_000) {
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      token = refreshed?.access_token ?? null;
    }
    if (!token) {
      // Refresh failed — refresh token itself is dead.
      return { token: null, rejected: true };
    }

    const accepted = await backendAcceptsToken(token);
    if (!accepted) return { token: null, rejected: true };
    return { token, rejected: false };
  };

  // VTID-NAV: Mutable refs so the navigation callback always uses the latest
  // router function and the freshest route history, even though the init
  // effects below capture them only when they re-run.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  // Plain route-path ring buffer (back-compat with navigator-consult).
  const routeHistoryRef = useRef<string[]>([location.pathname]);
  // VTID-NAV-TIMEJOURNEY: Parallel ring buffer with entry timestamps for
  // the time-aware greeting context. Newest first to match routeHistoryRef.
  const journeyTrailRef = useRef<JourneyEntry[]>([
    { path: location.pathname, enteredAt: Date.now() },
  ]);
  // Timestamp of when the user landed on the current screen. Used to compute
  // "time spent on current screen" when the ORB session starts.
  const currentRouteEnteredAtRef = useRef<number>(Date.now());

  // VTID-NAV-01: Called by orb-widget when the Vitana Navigator dispatches an
  // orb_directive of type 'navigate'. Uses React Router so the transition is
  // a smooth SPA change (works inside Appilix WebView with no full reload).
  const handleNavigationRequest = (url: string, _ctx: NavigationContext) => {
    try {
      // Surface safety net: the community app serves community + admin routes
      // only. If the Navigator ever returns a Command Hub route (it shouldn't —
      // the backend is surface-scoped — but belt-and-suspenders against catalog
      // drift), refuse to navigate instead of rendering a 404.
      const pathPart = url.split('?')[0] || '';
      if (pathPart.startsWith('/command-hub')) {
        console.warn('[ORB] Refused cross-surface route (command-hub is developer-only):', url);
        return;
      }
      const parsed = new URL(url, window.location.origin);
      const openTarget = parsed.searchParams.get('open');
      // VTID-CAL-OPEN: If the backend sends ?open=calendar, do NOT navigate —
      // just open the calendar popup as an overlay on the current screen.
      if (openTarget === 'calendar') {
        window.dispatchEvent(new CustomEvent('calendar:open'));
        return;
      }
      // Life Compass overlay: voice "open my goals" / "open my life compass"
      // resolves to ?open=life_compass. Keep the user on their current screen
      // and surface the popup so they can pick or customize their goal without
      // losing context.
      if (openTarget === 'life_compass' || openTarget === 'goals') {
        window.dispatchEvent(new CustomEvent('vitana:open-life-compass'));
        return;
      }
      navigateRef.current(url);
    } catch (err) {
      console.warn("[ORB] React Router navigate failed, falling back:", err);
      window.location.href = url;
    }
  };

  // Main init effect — waits for auth to resolve, then inits widget.
  // VTID-AUTH-RESUME: tryInit is now async — it fetches a fresh session
  // from Supabase before handing the token to the ORB, so an expired
  // access_token in React state doesn't cause an anonymous ORB session.
  useEffect(() => {
    if (loading) return;

    async function tryInit(): Promise<boolean> {
      const orb = (window as any).VitanaOrb;
      if (!orb) return false;

      // VTID-02720: If the FAB DOM was torn down externally (route change,
      // layout reflow, framework remount) while we still think the widget is
      // initialized, the underlying mic stream + SSE + AudioContext on the
      // VitanaOrb global are still live — just invisible. The user perceives
      // "orb closed but still listening". Call destroy() before reinit so the
      // session is actually stopped, then re-init cleanly.
      if (initialized.current && !isOrbAlive()) {
        console.log("[ORB] Widget DOM destroyed externally — tearing down stale session before reinit");
        try { orb.destroy(); } catch (e) { /* widget may already be partially gone */ }
        initialized.current = false;
      }

      if (!initialized.current) {
        const navOpts = {
          showFab: true,
          onNavigationRequest: handleNavigationRequest,
          initialContext: {
            current_route: location.pathname,
            current_route_entered_at: currentRouteEnteredAtRef.current,
            recent_routes: routeHistoryRef.current,
            journey_trail: journeyTrailRef.current,
          },
        };

        if (user && session) {
          // VTID-AUTH-BACKEND-PROBE: Resolve a token the BACKEND accepts, not
          // just one whose JWT exp claim is still in the future. If rejected,
          // sign the user out so AuthGuard redirects to the login screen —
          // don't silently fall back to anonymous, or the user will hear the
          // "unknown user" first-time greeting while the app still shows them
          // as logged in.
          const { token: validToken, rejected } = await resolveVerifiedToken();
          if (rejected) {
            console.warn("[ORB] Backend rejected session — signing out to force re-auth");
            await supabase.auth.signOut();
            return true; // stop; SIGNED_OUT will re-trigger this effect
          }

          if (validToken) {
            orb.init({ ...navOpts, authToken: validToken });
            console.log("[ORB] Widget initialized (authenticated, backend-verified token)");
          } else {
            orb.init(navOpts);
            console.log("[ORB] Widget initialized (anonymous — no session)");
          }
        } else {
          orb.init(navOpts);
          console.log("[ORB] Widget initialized (anonymous)");
        }
        initialized.current = true;
      }
      return true;
    }

    tryInit();

    // Polling fallback for when VitanaOrb script hasn't loaded yet.
    // The orb-widget script tag is `defer`, so on slow mobile (4G/3G WebView)
    // it executes only after the 1.7MB main bundle finishes parsing — easily
    // 15-30s in the wild. 60s ceiling keeps the FAB appearing eventually
    // instead of permanently.
    let attempts = 0;
    const MAX_ATTEMPTS = 120; // 120 × 500ms = 60s
    const interval = setInterval(() => {
      attempts++;
      tryInit().then((done) => {
        if (done || attempts >= MAX_ATTEMPTS) {
          clearInterval(interval);
          if (attempts >= MAX_ATTEMPTS) console.warn("[ORB] Widget script never loaded");
        }
      });
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

    const navOpts = {
      showFab: true,
      onNavigationRequest: handleNavigationRequest,
      initialContext: {
        current_route: location.pathname,
        current_route_entered_at: currentRouteEnteredAtRef.current,
        recent_routes: routeHistoryRef.current,
        journey_trail: journeyTrailRef.current,
      },
    };

    // VTID-AUTH-BACKEND-PROBE: Verify token with backend before reinit.
    (async () => {
      if (user && session) {
        const { token: validToken, rejected } = await resolveVerifiedToken();
        if (rejected) {
          console.warn("[ORB] Backend rejected token during reinit — signing out");
          await supabase.auth.signOut();
          return;
        }
        if (validToken) {
          orb.init({ ...navOpts, authToken: validToken });
        } else {
          orb.init(navOpts);
        }
      } else {
        orb.init(navOpts);
      }
      initialized.current = true;
      console.log("[ORB] Reinitialized for auth change:", user ? "authenticated" : "anonymous");
    })();
  }, [user?.id]);

  // VTID-AUTH-BACKEND-PROBE: Re-validate with the backend every time the app
  // comes back to the foreground. `visibilitychange` alone is unreliable in
  // Appilix WebView — some devices keep the document `visible` while the app
  // is backgrounded. Listen for `focus` and `pageshow` as well so we catch
  // every return-from-background moment before the user presses the ORB.
  useEffect(() => {
    if (loading || !user) return;

    let running = false;
    const revalidate = async () => {
      if (running) return;
      running = true;
      try {
        const { rejected } = await resolveVerifiedToken();
        if (rejected) {
          console.warn("[ORB] Backend rejected cached session on resume — signing out");
          await supabase.auth.signOut();
        }
      } finally {
        running = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') revalidate();
    };
    const onFocus = () => revalidate();
    const onPageShow = () => revalidate();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [loading, user?.id]);

  // VTID-NAV-01: Track navigation history and push to widget on every route
  // change. The widget stashes these values and includes them in the next
  // orb session-start payload so the Navigator service always has accurate
  // current_route + recent_routes context for catalog ranking.
  //
  // VTID-NAV-TIMEJOURNEY: Also track when each route was entered so the
  // time+journey greeting can reason about dwell time and session rhythm.
  useEffect(() => {
    const path = location.pathname;
    const now = Date.now();

    // Plain path ring buffer (existing contract).
    const filtered = routeHistoryRef.current.filter((p) => p !== path);
    routeHistoryRef.current = [path, ...filtered].slice(0, RECENT_ROUTES_MAX);

    // Enriched trail with entry timestamps, newest first.
    const filteredTrail = journeyTrailRef.current.filter((e) => e.path !== path);
    journeyTrailRef.current = [
      { path, enteredAt: now },
      ...filteredTrail,
    ].slice(0, RECENT_ROUTES_MAX);

    currentRouteEnteredAtRef.current = now;

    const orb = (window as any).VitanaOrb;
    if (orb && typeof orb.updateContext === "function") {
      orb.updateContext({
        current_route: path,
        current_route_entered_at: now,
        recent_routes: routeHistoryRef.current,
        journey_trail: journeyTrailRef.current,
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
