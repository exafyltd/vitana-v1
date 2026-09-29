/**
 * VTID-04520 — what the app does with a navigation directive from Vitana.
 *
 * The gateway sends `{ route, screen_id, entry_kind }`. The app, not the
 * gateway, knows which layout it is showing, so when the screen is in the
 * bundled registry the route comes from the registry for this viewport.
 * The result goes back to the gateway (`nav_result`), which moves the
 * member's "current screen" only when something actually opened.
 */
import { SCREENS, type ScreenDef } from './registry';

export type NavStatus = 'opened' | 'refused' | 'not_found' | 'error' | 'unknown';

export interface NavResult {
  status: NavStatus;
  route?: string;
  reason?: string;
}

export interface NavDirectiveContext {
  screen_id?: string;
  reason?: string;
  title?: string;
  entry_kind?: string;
}

export type OrbNavigationPlan =
  | { kind: 'refuse'; reason: string }
  | { kind: 'overlay'; event: string; detail: Record<string, string>; ensureRoute?: string }
  | { kind: 'route'; url: string };

/** Routes with no mobile layout (see docs/MOBILE_SCREEN_INVENTORY.md). */
const MOBILE_DESKTOP_ONLY_ROUTES = ['/inbox/archived'];

/** `?open=` markers that are not registry overlays (aliases and Settings actions). */
const EXTRA_MARKERS: Record<string, { event: string; ensureRoute?: string }> = {
  goals: { event: 'vitana:open-life-compass' },
  vitana_index: { event: 'vitana:open-index' },
  presence: { event: 'presence-debug:open' },
  settings_section: { event: 'vitana:settings-navigate', ensureRoute: '/settings' },
  settings_toggle: { event: 'vitana:settings-toggle', ensureRoute: '/settings' },
};

function markerTable(): Map<string, { event: string; ensureRoute?: string }> {
  const m = new Map<string, { event: string; ensureRoute?: string }>();
  for (const s of SCREENS) if (s.overlay?.marker) m.set(s.overlay.marker, { event: s.overlay.event });
  for (const [k, v] of Object.entries(EXTRA_MARKERS)) m.set(k, v);
  return m;
}
const MARKERS = markerTable();
const BY_ID = new Map(SCREENS.map((s) => [s.id, s]));

export function eventForMarker(marker: string): string | null {
  return MARKERS.get(marker)?.event ?? null;
}

function registryRoute(screen: ScreenDef, isMobile: boolean, query: string): string {
  const base = isMobile && screen.mobileRoute ? screen.mobileRoute : screen.route;
  if (!query) return base;
  // Keep what the gateway added (e.g. a tab or entity id) that the registry route lacks.
  const baseUrl = new URL(base, 'http://x');
  new URLSearchParams(query).forEach((v, k) => { if (!baseUrl.searchParams.has(k)) baseUrl.searchParams.set(k, v); });
  return baseUrl.pathname + (baseUrl.search || '');
}

export function planOrbNavigation(url: string, ctx: NavDirectiveContext, opts: { isMobile: boolean }): OrbNavigationPlan {
  const parsed = new URL(url || '/', 'http://x');
  const pathPart = parsed.pathname;
  if (pathPart.startsWith('/command-hub')) return { kind: 'refuse', reason: 'command-hub is developer-only' };

  const marker = parsed.searchParams.get('open');
  if (marker) {
    const hit = MARKERS.get(marker);
    if (hit) {
      return { kind: 'overlay', event: hit.event, detail: Object.fromEntries(parsed.searchParams.entries()), ensureRoute: hit.ensureRoute };
    }
    // Unknown marker: navigate so the URL is at least visible.
  }

  const screen = ctx.screen_id ? BY_ID.get(ctx.screen_id) : undefined;
  if (screen && !marker && !(screen.params && screen.params.length)) {
    if (screen.viewport === 'desktop' && opts.isMobile) return { kind: 'refuse', reason: 'desktop-only screen on mobile' };
    if (screen.viewport === 'mobile' && !opts.isMobile) return { kind: 'refuse', reason: 'mobile-only screen on desktop' };
    return { kind: 'route', url: registryRoute(screen, opts.isMobile, parsed.search.slice(1)) };
  }

  if (opts.isMobile && MOBILE_DESKTOP_ONLY_ROUTES.some((r) => pathPart === r || pathPart.startsWith(`${r}/`))) {
    return { kind: 'refuse', reason: 'desktop-only route on mobile' };
  }
  return { kind: 'route', url: pathPart + parsed.search };
}
