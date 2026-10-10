/**
 * VTID-05062 — SCREEN_READY + IMG_REFETCH for in-app navigations (RUM, Part A).
 *
 * rum.ts only measures the FIRST page load (LCP/FCP/TTFB/CLS/INP). What members
 * actually feel on the phone is switching tabs: News → Inbox → Events → back to
 * News. This module measures every in-app route change after the first one:
 *
 *   SCREEN_READY  ms from the navigation (the render that first sees the new
 *                 router location) until
 *                   (a) the new route has committed and painted (two rAFs
 *                       after the commit), and no loading indicator (route
 *                       Suspense fallback, spinner, skeleton) is visible in the
 *                       first viewport — the "main content" condition, and
 *                   (b) every <img> intersecting the first viewport is
 *                       `complete` (loaded, or errored / no source — both are
 *                       terminal states the member will not see change).
 *                 Capped at 10 s → ready_ms = 10000, timed_out = true.
 *   IMG_REFETCH   (return visits only) how many of those first-viewport images
 *                 were downloaded over the network again after the navigation
 *                 (PerformanceResourceTiming transferSize > 0). 0 = served from
 *                 memory / HTTP cache = no visible reload. Caveat: a cross-origin
 *                 image whose response lacks Timing-Allow-Origin reports
 *                 transferSize 0 even when it was downloaded, so for such hosts
 *                 this is a lower bound.
 *
 * One anonymous beacon per navigation goes to the same `/api/v1/rum/beacon`
 * endpoint as rum.ts (kind: 'nav'; the gateway maps it to the OASIS topic
 * `screen.nav.measured`). No user id; `session` is rum.ts's per-tab random id.
 *
 * `nav` is 'first' the first time a route pattern is shown in this tab session
 * (the initial page load's route counts as shown) and 'return' after that.
 *
 * A measurement that is superseded by another navigation before it is ready,
 * or during which the tab is hidden, is dropped — it would otherwise report the
 * time the member spent elsewhere.
 *
 * Route patterns: the routes live as JSX inside App.tsx, so there is no route
 * object for `matchRoutes` to read at runtime. The parameterised routes are
 * therefore listed here (PARAM_ROUTES) and matched with `matchRoutes`, which
 * also ranks static routes above dynamic ones; any path no listed pattern
 * matches (new routes, nested routes under a splat like /admin/*) falls back to
 * collapsing id-looking segments (UUIDs, numbers, long hashes/tokens) to `:id`.
 * Either way, invite codes, tokens and handles never leave the device.
 */
import { matchRoutes } from 'react-router-dom';
import { getSessionId, sendRumPayload } from './rum';

export type NavKind = 'first' | 'return';

export interface NavBeacon {
  kind: 'nav';
  screen: string;
  nav: NavKind;
  ready_ms: number;
  img_refetch: number;
  img_total: number;
  timed_out: boolean;
  session: string;
  captured_at: string;
  user_agent?: string;
}

export const SCREEN_READY_CAP_MS = 10_000;
/** How often (at most) the readiness condition is evaluated, in ms. */
const CHECK_INTERVAL_MS = 50;

// ─── Route pattern normalisation ────────────────────────────────────────────

/** Every route in App.tsx with a `:param`, plus static routes they would shadow. */
const PARAM_ROUTES = [
  '/_intro/:tenantSlug',
  '/admin/feedback/:tab',
  '/calendar/entry/:entryId',
  '/comm/groups/:id',
  '/comm/live-rooms/:roomId/view',
  '/comm/my-groups/:id',
  '/commerce/connections/:id',
  '/commerce/invites/:token/accept',
  '/community/groups/:id',
  '/discover/category/:subcategory',
  '/discover/product/:id',
  '/discover/provider/:id',
  '/e/:slug',
  '/e/game/:slug',
  '/i/:code',
  '/inbox/g/:groupId',
  '/inbox/g/:groupId/msg/:messageId',
  '/inbox/t/:threadId',
  '/inbox/t/:threadId/msg/:messageId',
  '/inbox/u/:recipientId',
  '/inbox/u/:recipientId/msg/:messageId',
  '/intents/match/:id',
  '/news/:id',
  '/partner/connections/:id',
  '/post/:source/:id',
  '/profile/:id',
  '/profile/subscriptions',
  '/pub/campaigns/:id',
  '/pub/events/:id',
  '/reminders/fire/:fireId',
  '/sharing/campaigns/:id',
  '/u/:identifier',
].map((path) => ({ path }));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_RE = /^\d+$/;
const HEX_RE = /^[0-9a-f]{16,}$/i;

function looksLikeId(segment: string): boolean {
  if (UUID_RE.test(segment) || NUMERIC_RE.test(segment) || HEX_RE.test(segment)) return true;
  // Long opaque tokens (base64url, nanoid, …): 20+ chars mixing digits and letters.
  return segment.length >= 20 && /\d/.test(segment) && /[a-z]/i.test(segment) && !/^[a-z]+(-[a-z]+)*$/i.test(segment);
}

/** The route pattern for a pathname, e.g. `/comm/groups/<uuid>` → `/comm/groups/:id`. */
export function normalizeRoute(pathname: string): string {
  const path = (pathname || '/').split(/[?#]/)[0] || '/';
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const matches = matchRoutes(PARAM_ROUTES, trimmed);
  const route = matches?.[matches.length - 1]?.route.path;
  if (route) return route;
  const collapsed = trimmed
    .split('/')
    .map((seg) => (seg && looksLikeId(seg) ? ':id' : seg))
    .join('/');
  return collapsed || '/';
}

/** 'return' when this route pattern was already shown in this tab session. */
export function classifyNav(screen: string, visited: ReadonlySet<string>): NavKind {
  return visited.has(screen) ? 'return' : 'first';
}

// ─── IMG_REFETCH ────────────────────────────────────────────────────────────

export interface ResourceSample {
  name: string;
  startTime: number;
  transferSize: number;
}

/**
 * How many of `imageUrls` were fetched over the network (transferSize > 0) at
 * or after `navStart`. Entries from before the navigation are ignored.
 */
export function countRefetched(imageUrls: string[], navStart: number, entries: ResourceSample[]): number {
  let count = 0;
  for (const url of imageUrls) {
    if (!url) continue;
    if (entries.some((e) => e.name === url && e.startTime >= navStart && e.transferSize > 0)) count++;
  }
  return count;
}

// The browser's resource-timing buffer (default 250 entries) fills up early in
// a long SPA session, after which getEntriesByName() returns nothing new. A
// PerformanceObserver still receives every entry, so image entries are kept in
// a small ring here instead.
const RESOURCE_RING_MAX = 400;
const resourceRing: ResourceSample[] = [];
let resourceObserver: PerformanceObserver | null = null;

function recordResources(list: PerformanceEntryList): void {
  for (const e of list as PerformanceResourceTiming[]) {
    if (e.initiatorType !== 'img') continue;
    resourceRing.push({ name: e.name, startTime: e.startTime, transferSize: e.transferSize ?? 0 });
  }
  if (resourceRing.length > RESOURCE_RING_MAX) resourceRing.splice(0, resourceRing.length - RESOURCE_RING_MAX);
}

function ensureResourceObserver(): void {
  if (resourceObserver || typeof PerformanceObserver === 'undefined') return;
  try {
    resourceObserver = new PerformanceObserver((list) => recordResources(list.getEntries()));
    resourceObserver.observe({ type: 'resource', buffered: true });
  } catch {
    resourceObserver = null;
  }
}

function currentResourceSamples(urls: string[]): ResourceSample[] {
  if (resourceObserver) {
    // Entries for images that completed this frame may not be delivered yet.
    try {
      recordResources(resourceObserver.takeRecords());
    } catch {
      // ignore
    }
    return resourceRing;
  }
  try {
    return urls.flatMap((u) => performance.getEntriesByName(u, 'resource') as PerformanceResourceTiming[]);
  } catch {
    return [];
  }
}

// ─── Readiness ──────────────────────────────────────────────────────────────

function intersectsViewport(el: Element, vw: number, vh: number): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
}

function isVisibleStyle(el: Element): boolean {
  try {
    return getComputedStyle(el).visibility !== 'hidden';
  } catch {
    return true;
  }
}

/** Every <img> intersecting the first viewport. */
export function firstViewportImages(doc: Document = document): HTMLImageElement[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return Array.from(doc.querySelectorAll('img')).filter((img) => intersectsViewport(img, vw, vh) && isVisibleStyle(img));
}

/**
 * A loading indicator is visible in the first viewport: a spinner (route
 * Suspense fallback, RouteTransitionOverlay, in-screen loaders all use
 * `.animate-spin`), an `aria-busy` region, or a skeleton (`.animate-pulse`
 * at least 24×8 px — smaller pulsing elements are badges/live dots).
 */
export function loadingIndicatorVisible(doc: Document = document): boolean {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  for (const el of Array.from(doc.querySelectorAll('.animate-spin, [aria-busy="true"]'))) {
    if (intersectsViewport(el, vw, vh) && isVisibleStyle(el)) return true;
  }
  for (const el of Array.from(doc.querySelectorAll('.animate-pulse'))) {
    const r = el.getBoundingClientRect();
    if (r.width >= 24 && r.height >= 8 && intersectsViewport(el, vw, vh) && isVisibleStyle(el)) return true;
  }
  return false;
}

export interface ReadyEnv {
  now(): number;
  raf(cb: () => void): number;
  cancelRaf(id: number): void;
  images(): HTMLImageElement[];
  busy(): boolean;
  /** Subscribe to the tab becoming hidden; returns an unsubscribe. */
  onHidden(cb: () => void): () => void;
}

export const browserEnv: ReadyEnv = {
  now: () => performance.now(),
  raf: (cb) => requestAnimationFrame(cb),
  cancelRaf: (id) => cancelAnimationFrame(id),
  images: () => firstViewportImages(),
  busy: () => loadingIndicatorVisible(),
  onHidden: (cb) => {
    const handler = () => {
      if (document.visibilityState === 'hidden') cb();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  },
};

export interface ReadyResult {
  ready_ms: number;
  timed_out: boolean;
  images: HTMLImageElement[];
}

export interface Measurement {
  /** Resolves with the result, or null when the measurement was dropped. */
  done: Promise<ReadyResult | null>;
  cancel(): void;
}

/**
 * Wait for the screen to be ready. Call after the new route has committed
 * (from a useEffect); `navStart` is the env clock time of the navigation.
 */
export function measureScreenReady(navStart: number, env: ReadyEnv = browserEnv): Measurement {
  let rafId = 0;
  let settled = false;
  let resolveFn: (r: ReadyResult | null) => void = () => undefined;
  const done = new Promise<ReadyResult | null>((resolve) => {
    resolveFn = resolve;
  });
  let unsubscribeHidden: () => void = () => undefined;

  const finish = (result: ReadyResult | null) => {
    if (settled) return;
    settled = true;
    if (rafId) env.cancelRaf(rafId);
    unsubscribeHidden();
    resolveFn(result);
  };

  unsubscribeHidden = env.onHidden(() => finish(null));

  let lastCheck = -Infinity;
  const tick = () => {
    if (settled) return;
    const now = env.now();
    if (now - navStart >= SCREEN_READY_CAP_MS) {
      finish({ ready_ms: SCREEN_READY_CAP_MS, timed_out: true, images: env.images() });
      return;
    }
    if (now - lastCheck >= CHECK_INTERVAL_MS) {
      lastCheck = now;
      if (!env.busy()) {
        const images = env.images();
        if (images.every((img) => img.complete)) {
          finish({ ready_ms: Math.max(0, Math.round(now - navStart)), timed_out: false, images });
          return;
        }
      }
    }
    rafId = env.raf(tick);
  };

  // Two frames after the commit: the new route has been painted.
  rafId = env.raf(() => {
    if (settled) return;
    rafId = env.raf(tick);
  });

  return { done, cancel: () => finish(null) };
}

// ─── Per-navigation tracking ────────────────────────────────────────────────

export function buildNavBeacon(
  screen: string,
  nav: NavKind,
  result: ReadyResult,
  imgRefetch: number,
): NavBeacon {
  return {
    kind: 'nav',
    screen,
    nav,
    ready_ms: result.ready_ms,
    img_refetch: imgRefetch,
    img_total: result.images.length,
    timed_out: result.timed_out,
    session: getSessionId(),
    captured_at: new Date().toISOString(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 512) : undefined,
  };
}

const visited = new Set<string>();
let lastPathname: string | null = null;
let current: Measurement | null = null;

/**
 * Called by useScreenReadyTracking after every commit that sees a new router
 * pathname. The first call (the initial page load, covered by rum.ts's LCP)
 * only records the route as shown. Repeated calls for the same pathname
 * (re-renders, StrictMode double effects) do nothing.
 */
export function onRouteChange(pathname: string, navStart: number, env: ReadyEnv = browserEnv): void {
  if (pathname === lastPathname) return;
  const isInitial = lastPathname === null;
  lastPathname = pathname;
  const screen = normalizeRoute(pathname);
  ensureResourceObserver();

  if (isInitial) {
    visited.add(screen);
    return;
  }

  current?.cancel();
  const nav = classifyNav(screen, visited);
  visited.add(screen);

  const measurement = measureScreenReady(navStart, env);
  current = measurement;
  void measurement.done.then((result) => {
    if (current === measurement) current = null;
    if (!result) return;
    let refetch = 0;
    if (nav === 'return') {
      const urls = result.images.map((img) => img.currentSrc || img.src).filter(Boolean);
      refetch = countRefetched(urls, navStart, currentResourceSamples(urls));
    }
    try {
      sendRumPayload(buildNavBeacon(screen, nav, result, refetch));
    } catch {
      // telemetry must never break navigation
    }
  });
}

/** Test-only: forget visited routes and any in-flight measurement. */
export function __resetScreenReadyForTests(): void {
  current?.cancel();
  current = null;
  visited.clear();
  lastPathname = null;
  resourceRing.length = 0;
  resourceObserver?.disconnect();
  resourceObserver = null;
}
