/**
 * Route-transition store — drives the global <RouteTransitionOverlay>.
 *
 * The app performs post-auth redirect chains (e.g. /home → /autopilot in
 * useSmartRouting / useInitialLandingRedirect). Without masking, the wrong
 * screen (News/Home) paints for a beat before the redirect resolves. Any code
 * that is *about* to navigate through such a chain calls `markRouteTransition()`
 * first, which raises a full-screen spinner over the current page until the
 * location settles. The overlay also auto-detects redirect chains (two route
 * changes inside the settle window) and masks them even when the trigger site
 * didn't opt in explicitly.
 *
 * This is a tiny framework-agnostic pub/sub so non-React modules (and the
 * redirect hooks) can flip it without prop-drilling. The overlay subscribes via
 * useSyncExternalStore.
 */

let active = false;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function setActive(next: boolean) {
  if (active === next) return;
  active = next;
  emit();
}

export const routeTransitionStore = {
  /** Raise the overlay. The overlay clears it once the location settles. */
  begin() {
    setActive(true);
  },
  /** Lower the overlay. Called by the overlay after the route settles. */
  end() {
    setActive(false);
  },
  getSnapshot() {
    return active;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/**
 * Imperatively mask the next navigation. Call this immediately before a
 * `navigate(...)` that begins a redirect chain so the current screen never
 * flashes. The overlay self-clears when the location stops changing.
 */
export function markRouteTransition(): void {
  routeTransitionStore.begin();
}
