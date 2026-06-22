import { useEffect, useRef, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { routeTransitionStore } from "@/lib/routeTransition";
import { t } from "@/lib/i18n-toast";

/**
 * Full-screen spinner that covers the current page during route changes and
 * redirect chains. Mounted inside <BrowserRouter> but OUTSIDE <Routes>, so it
 * survives across route swaps and masks the brief window where the app redirects
 * (e.g. /home → /autopilot) before the destination paints.
 *
 * Behaviour:
 *  - It shows when `markRouteTransition()` was called (explicit redirect intent).
 *  - It also auto-detects redirect chains: if a second location change lands
 *    inside the settle window, the overlay raises itself so the intermediate
 *    screen never shows.
 *  - A single, settled navigation never triggers it — instant cached navigation
 *    stays instant. Slow lazy chunks are covered by the route <Suspense>
 *    fallback, not this overlay.
 */
const SETTLE_MS = 280;

export default function RouteTransitionOverlay() {
  const location = useLocation();
  const active = useSyncExternalStore(
    routeTransitionStore.subscribe,
    routeTransitionStore.getSnapshot,
    routeTransitionStore.getSnapshot,
  );
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const pending = useRef(false);
  const mounted = useRef(false);

  // Safety net: if the overlay is raised but no navigation ever follows (e.g. a
  // redirect was marked but its condition resolved to a no-op), force it down
  // after a hard ceiling so the user is never stuck behind a spinner.
  useEffect(() => {
    if (!active) return;
    const safety = setTimeout(() => routeTransitionStore.end(), 1500);
    return () => clearTimeout(safety);
  }, [active]);

  useEffect(() => {
    // Ignore the very first mount — that's the initial render, not a transition.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    // A navigation happened. If the previous one hadn't settled yet, this is a
    // redirect chain → mask it immediately.
    if (pending.current) {
      routeTransitionStore.begin();
    }
    pending.current = true;

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      pending.current = false;
      routeTransitionStore.end();
    }, SETTLE_MS);

    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [location.pathname, location.search]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}
