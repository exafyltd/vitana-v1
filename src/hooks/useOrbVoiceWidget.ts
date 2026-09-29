import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
// VTID-02789: Mobile-aware Navigator. Pipe `is_mobile` into the ORB session
// context so the gateway can pick mobile_route overrides (e.g. /comm →
// /comm/events-meetups?tab=hot) and block desktop sessions from
// viewport_only='mobile' entries (e.g. /daily-diary).
import { useIsMobile } from "@/hooks/use-mobile";
import { useRole } from "@/hooks/useRole";
import { orbViewProfile } from "@/lib/orb-view-profile";
import { setOrbWidgetAuthenticated } from "@/lib/orbWidgetReady";
import { setOrbWidgetSessionActive } from "@/lib/orbWidgetSession";
import { planOrbNavigation, type NavDirectiveContext, type NavResult } from "@/navigation/orb-navigation";
import { openOverlay, whenOverlayTaken } from "@/navigation/overlay-bus";

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

// VTID-04548: fallback delay for a role switch that doesn't change the route.
// Long enough for set_role_preference to commit, so the gateway reads the new role.
export const ROLE_PREWARM_FALLBACK_MS = 1500;

/**
 * VTID-04548: ask the widget to re-warm the gateway's context cache for the
 * route (and therefore role/surface) the next voice session will use. A no-op
 * when the widget is not loaded or predates `prewarm` — never throws.
 */
type OrbPrewarmApi = { prewarm?: (opts: { current_route: string; is_mobile: boolean }) => void };

export function requestRolePrewarm(currentRoute: string, isMobile: boolean): void {
  try {
    const orb = (window as Window & { VitanaOrb?: OrbPrewarmApi }).VitanaOrb;
    if (orb && typeof orb.prewarm === "function") {
      orb.prewarm({ current_route: currentRoute, is_mobile: isMobile });
    }
  } catch {
    /* best-effort cache warm — never surfaces */
  }
}

// BOOTSTRAP-ORB-STAGING-GATEWAY: the external VitanaOrb widget script is loaded
// from a hardcoded prod URL in index.html, so it auto-detects its gateway as
// PROD (gateway.vitanaland.com) from its own script src. Without an explicit
// override it sends `/orb/live/session/*` to PROD even when the app itself runs
// against a different gateway (e.g. preview → gateway-staging). That cross-env
// mismatch is rejected by the prod origin/CORS gate → the orb opens but never
// starts a session. Passing `gatewayUrl` pins the widget to the SAME gateway
// the rest of the app uses. On prod this resolves to the prod gateway (no-op);
// on staging it correctly targets gateway-staging. The widget wants the base
// WITHOUT the trailing `/api/v1` (it appends `/api/v1/orb/...` itself).
const ORB_WIDGET_GATEWAY = GATEWAY_URL.replace(/\/api\/v1$/, "");

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

type NavigationContext = NavDirectiveContext;

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
  // VTID-02789: Pure viewport check (window.innerWidth < 1024px). Updates
  // reactively via matchMedia, so any width change triggers the route-change
  // updateContext effect below and re-syncs is_mobile to the gateway.
  const isMobile = useIsMobile();

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
  // BOOTSTRAP-MOBILE-NAV-CONTAINMENT: keep the freshest viewport flag for the
  // navigation guard below (the callback is captured at init time).
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;
  // VTID-04561: the role whose screens are shown. The widget declares it with
  // every session start; a switch restarts an open conversation so the next
  // words come from the new role's Vitana.
  const { currentRole } = useRole();
  const currentRoleRef = useRef<string | null>(currentRole ?? null);
  currentRoleRef.current = currentRole ?? null;
  useEffect(() => {
    const orb = (window as unknown as { VitanaOrb?: { setViewRole?: (role: string, surface: string) => void } }).VitanaOrb;
    if (!orb || typeof orb.setViewRole !== "function") return;
    const p = orbViewProfile(location.pathname, currentRole);
    orb.setViewRole(p.view_role, p.surface);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRole]);
  // BOOTSTRAP-ORB-SCREEN-TRACKING: keep the freshest current route in a ref so
  // the widget-init closures below read the LIVE route, not the route captured
  // when the init effect last ran. The init effects are keyed on
  // [loading, user?.id, session?.access_token] — deliberately NOT location, so
  // the widget doesn't re-init on every navigation. The side effect is that the
  // `location.pathname` captured inside their closures goes stale: right after
  // login the user is redirected (e.g. "/" → "/journey") WITHOUT user.id or the
  // access_token changing, and the deferred external widget script frequently
  // finishes loading only AFTER that redirect (see the 60s polling fallback
  // below). tryInit then initialized the widget with the STALE login route
  // ("/"), and because the user then sits on the destination screen with no
  // further navigation, the route-change updateContext never fires to correct
  // it — so the orb session started with current_route="/" and Vitana announced
  // the user was on the login/landing page. Reading this ref (re-synced on every
  // render, before any effect runs) makes init use the route the user is
  // actually on.
  const currentRouteRef = useRef(location.pathname);
  currentRouteRef.current = location.pathname;
  // VTID-04548: set by a `role.changed` event, consumed by the next route change.
  const pendingRolePrewarmRef = useRef(false);
  const rolePrewarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // VTID-04520: returns what happened, which the widget reports back to the
  // gateway as nav_result — the gateway moves the member's "current screen"
  // only when something opened. Routing decisions live in
  // src/navigation/orb-navigation.ts (registry-aware, unit-tested).
  const handleNavigationRequest = (url: string, ctx: NavigationContext): NavResult | Promise<NavResult> => {
    try {
      const plan = planOrbNavigation(url, ctx, { isMobile: isMobileRef.current });
      if (plan.kind === 'refuse') {
        console.warn(`[ORB] Refused navigation (${plan.reason}):`, url);
        return { status: 'refused', reason: plan.reason };
      }
      if (plan.kind === 'overlay') {
        // The page that owns the overlay may not be mounted yet (Settings):
        // navigate there, and the overlay bus hands the request to its
        // listener when it mounts instead of racing a timer.
        let changedRoute = false;
        if (plan.ensureRoute && !window.location.pathname.startsWith(plan.ensureRoute)) {
          navigateRef.current(plan.ensureRoute);
          changedRoute = true;
        }
        const r = openOverlay(plan.event, plan.detail);
        if (r === 'acknowledged') return { status: 'opened', route: url };
        // VTID-04559: the page that owns it is still mounting. Report what
        // happens once it does (the widget waits up to 1.5 s for this).
        if (changedRoute) {
          return whenOverlayTaken(plan.event, 1200).then((taken): NavResult =>
            taken ? { status: 'opened', route: url } : { status: 'unknown', route: url });
        }
        return { status: 'unknown', route: url };
      }
      navigateRef.current(plan.url);
      return { status: 'opened', route: plan.url };
    } catch (err) {
      console.warn("[ORB] React Router navigate failed, falling back:", err);
      try {
        window.location.href = url;
        return { status: 'opened', route: url };
      } catch (e) {
        return { status: 'error', reason: String((e as Error)?.message || e) };
      }
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
          // BOOTSTRAP-ORB-STAGING-GATEWAY: pin the widget to THIS environment's
          // gateway (staging on preview, prod on prod) instead of the prod URL
          // it auto-detects from its hardcoded script src.
          ...(ORB_WIDGET_GATEWAY ? { gatewayUrl: ORB_WIDGET_GATEWAY } : {}),
          onNavigationRequest: handleNavigationRequest,
          // Suppress the Soundscape background music for the lifetime of an Orb
          // voice session — the widget plays TTS via its own AudioContext, which
          // the Soundscape manager's media listeners can't see otherwise.
          onSessionStart: () => setOrbWidgetSessionActive(true),
          onSessionEnd: () => setOrbWidgetSessionActive(false),
          // VTID-03292 (#4)'s onTurnComplete-driven auto-close was removed
          // under VTID-03680: it closed the overlay (revealing the Topic
          // drawer) the instant the guided-topic OPENER line finished, which
          // — since VTID-03650 turned turn 1 into a short opener instead of
          // the full lesson — cut the session before the actual teaching
          // (GUIDE MODE, turns 2+) ever ran. See orb-widget.js's matching
          // removal for the full incident writeup. The overlay now stays
          // open and behaves like any other ORB conversation; the user
          // closes it themselves once Vitana is done teaching.
          // VTID-03763: the widget signals teaching-end (model tool call OR
          // the 5-minute backstop) via this callback — relay it as a
          // CustomEvent rather than importing journey completion logic
          // directly into this hook. GuidedJourneyCatalog.tsx listens and
          // marks the topic Done, mirroring markPracticeDone's own pattern.
          onGuidedTopicTeachingEnd: (topicId: string | null, reason: string | null) => {
            window.dispatchEvent(
              new CustomEvent("vitana:guided-topic-teaching-complete", { detail: { topicId, reason } }),
            );
          },
          initialContext: {
            // BOOTSTRAP-ORB-SCREEN-TRACKING: read the LIVE route via the ref, not
            // the closure-captured `location.pathname` (stale by the time the
            // deferred widget script loads — see currentRouteRef above).
            current_route: currentRouteRef.current,
            current_route_entered_at: currentRouteEnteredAtRef.current,
            recent_routes: routeHistoryRef.current,
            journey_trail: journeyTrailRef.current,
            // VTID-02789: viewport flag → gateway picks mobile_route over route
            is_mobile: isMobileRef.current,
            // VTID-04561: which Vitana this screen wants (surface + the role
            // whose screens are shown); the gateway verifies both.
            ...orbViewProfile(currentRouteRef.current, currentRoleRef.current),
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
            setOrbWidgetAuthenticated(true);
            console.log("[ORB] Widget initialized (authenticated, backend-verified token)");
          } else {
            orb.init(navOpts);
            setOrbWidgetAuthenticated(false);
            console.log("[ORB] Widget initialized (anonymous — no session)");
          }
        } else {
          orb.init(navOpts);
          setOrbWidgetAuthenticated(false);
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
    // VTID-04099: poll fast first, then settle.
    //
    // This used to be a flat 500ms interval, so if the widget script landed
    // 10ms after the initial tryInit() the orb still sat unusable for the rest
    // of that 500ms tick — pure dead time between "the widget is ready" and
    // "the user may tap it", paid on every cold load. The script usually
    // arrives within a few hundred ms of the first attempt (and VTID-04099
    // preloads it, so sooner), which is exactly the window the old cadence was
    // worst at.
    //
    // Fast phase: 50ms × 20 = the first second, where the answer almost always
    // is. Slow phase: 500ms thereafter, unchanged, so a genuinely slow 3G
    // WebView is polled no harder than before. The 60s ceiling is preserved so
    // the FAB still appears eventually rather than never.
    const FAST_POLL_MS = 50;
    const FAST_POLL_ATTEMPTS = 20; // 1s
    const SLOW_POLL_MS = 500;
    const TOTAL_BUDGET_MS = 60_000;

    let attempts = 0;
    let elapsed = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const schedule = () => {
      const delay = attempts < FAST_POLL_ATTEMPTS ? FAST_POLL_MS : SLOW_POLL_MS;
      timer = setTimeout(() => {
        if (cancelled) return;
        attempts++;
        elapsed += delay;
        tryInit().then((done) => {
          if (cancelled || done) return;
          if (elapsed >= TOTAL_BUDGET_MS) {
            console.warn("[ORB] Widget script never loaded");
            return;
          }
          schedule();
        });
      }, delay);
    };
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loading, user?.id, session?.access_token]);

  // Watch for auth changes — reinit widget when user logs in or out
  useEffect(() => {
    if (loading) return;
    const orb = (window as any).VitanaOrb;
    if (!orb || !initialized.current) return;

    // Auth state changed — destroy and reinit with correct mode
    orb.destroy();
    initialized.current = false;
    setOrbWidgetAuthenticated(false);

    const navOpts = {
      showFab: true,
      // BOOTSTRAP-ORB-STAGING-GATEWAY: pin the widget to THIS environment's gateway.
      ...(ORB_WIDGET_GATEWAY ? { gatewayUrl: ORB_WIDGET_GATEWAY } : {}),
      onNavigationRequest: handleNavigationRequest,
      onSessionStart: () => setOrbWidgetSessionActive(true),
      onSessionEnd: () => setOrbWidgetSessionActive(false),
      // VTID-03763: see the matching callback in the main init effect above.
      onGuidedTopicTeachingEnd: (topicId: string | null, reason: string | null) => {
        window.dispatchEvent(
          new CustomEvent("vitana:guided-topic-teaching-complete", { detail: { topicId, reason } }),
        );
      },
      initialContext: {
        // BOOTSTRAP-ORB-SCREEN-TRACKING: live route via ref (the auth-change
        // effect is keyed on user?.id, so its closure-captured location.pathname
        // is the route at login time, not where the user is now).
        current_route: currentRouteRef.current,
        current_route_entered_at: currentRouteEnteredAtRef.current,
        recent_routes: routeHistoryRef.current,
        journey_trail: journeyTrailRef.current,
        // VTID-02789: viewport flag → gateway picks mobile_route over route
        is_mobile: isMobileRef.current,
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
          setOrbWidgetAuthenticated(true);
        } else {
          orb.init(navOpts);
          setOrbWidgetAuthenticated(false);
        }
      } else {
        orb.init(navOpts);
        setOrbWidgetAuthenticated(false);
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
        // VTID-02789: re-emit is_mobile on every route change so a viewport
        // resize mid-session is reflected in the next navigate decision.
        is_mobile: isMobile,
        // VTID-04561: moving into /admin or /backoffice is a different Vitana;
        // the widget restarts an open conversation when this changes.
        ...orbViewProfile(path, currentRoleRef.current),
      });
    }

    // VTID-04548: a role switch lands here via navigate(destination) once the
    // set_role_preference RPC has committed, so this is the first moment the
    // gateway can resolve the NEW role. Re-warm the context cache for it.
    if (pendingRolePrewarmRef.current) {
      pendingRolePrewarmRef.current = false;
      if (rolePrewarmTimerRef.current) {
        clearTimeout(rolePrewarmTimerRef.current);
        rolePrewarmTimerRef.current = null;
      }
      requestRolePrewarm(path, isMobile);
    }
  }, [location.pathname, isMobile]);

  // VTID-04548: warm the orb's context cache for the role the NEXT voice
  // session will actually use. `role.changed` fires optimistically BEFORE the
  // role RPC commits, so the prewarm is deferred to the route change the
  // switch navigates to (effect above). A switch that stays on the same route
  // never changes location, so a timer covers that case. Purely a cache warm:
  // it opens no session and changes nothing the member sees or hears.
  useEffect(() => {
    const onRoleChanged = () => {
      pendingRolePrewarmRef.current = true;
      if (rolePrewarmTimerRef.current) clearTimeout(rolePrewarmTimerRef.current);
      rolePrewarmTimerRef.current = setTimeout(() => {
        rolePrewarmTimerRef.current = null;
        if (!pendingRolePrewarmRef.current) return;
        pendingRolePrewarmRef.current = false;
        requestRolePrewarm(currentRouteRef.current, isMobileRef.current);
      }, ROLE_PREWARM_FALLBACK_MS);
    };
    window.addEventListener("role.changed", onRoleChanged);
    return () => {
      window.removeEventListener("role.changed", onRoleChanged);
      if (rolePrewarmTimerRef.current) {
        clearTimeout(rolePrewarmTimerRef.current);
        rolePrewarmTimerRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const orb = (window as any).VitanaOrb;
      if (orb && initialized.current) {
        orb.destroy();
        initialized.current = false;
        setOrbWidgetAuthenticated(false);
      }
    };
  }, []);
}
