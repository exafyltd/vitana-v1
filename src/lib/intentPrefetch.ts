/**
 * VTID-05106 — intent prefetch (Spotlight contract SR-23).
 *
 * One document-level delegated listener: when the pointer rests on (or focus
 * lands on) an internal link for at least `dwellMs`, the destination's route
 * chunk and its data are warmed once per href, so the click paints from cache.
 * Covers the desktop sidebar and every in-page link without touching
 * AppLayout. Mobile nav keeps its own tap-intent warming (MobileBottomNav,
 * SideDrawerNav); this adds hover/focus intent on top.
 *
 * Skipped on save-data / 2g connections, like preloadHotChunks.
 */

export const INTENT_DWELL_MS = 80;

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

function constrainedNetwork(): boolean {
  if (typeof navigator === 'undefined') return true;
  const conn = (navigator as Navigator & { connection?: NetworkInfo }).connection;
  if (!conn) return false;
  return !!conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
}

/**
 * The in-app path a link points to (no query, no hash, no trailing slash, the
 * router basename removed), or null for anything the router does not own:
 * other origins, downloads, new-tab links, non-http schemes.
 */
export function resolveIntentPath(anchor: HTMLAnchorElement, origin: string, basename = '/'): string | null {
  const raw = anchor.getAttribute('href');
  if (!raw || raw.startsWith('#')) return null;
  if (anchor.hasAttribute('download')) return null;
  const target = anchor.getAttribute('target');
  if (target && target !== '_self') return null;
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  let path = url.pathname;
  const base = basename.replace(/\/+$/, '');
  if (base && path.startsWith(base)) path = path.slice(base.length) || '/';
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path;
}

export interface IntentPrefetchOptions {
  /** Warm the route for this in-app path. Called at most once per path. */
  onIntent: (path: string) => void;
  dwellMs?: number;
  basename?: string;
  root?: Document;
}

/** Attach the delegated listeners. Returns the cleanup. */
export function startIntentPrefetch({ onIntent, dwellMs = INTENT_DWELL_MS, basename = '/', root = document }: IntentPrefetchOptions): () => void {
  if (constrainedNetwork()) return () => {};
  const view = root.defaultView;
  if (!view) return () => {};
  const origin = view.location.origin;
  const warmed = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let armedAnchor: HTMLAnchorElement | null = null;

  const disarm = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    armedAnchor = null;
  };

  const arm = (event: Event) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor || anchor === armedAnchor) return;
    disarm();
    const path = resolveIntentPath(anchor, origin, basename);
    if (!path || warmed.has(path)) return;
    armedAnchor = anchor;
    timer = setTimeout(() => {
      armedAnchor = null;
      timer = undefined;
      if (warmed.has(path)) return;
      warmed.add(path);
      onIntent(path);
    }, dwellMs);
  };

  const leave = (event: Event) => {
    if (!armedAnchor) return;
    const next = (event as PointerEvent | FocusEvent).relatedTarget as Node | null;
    if (next && armedAnchor.contains(next)) return;
    disarm();
  };

  root.addEventListener('pointerover', arm, { passive: true });
  root.addEventListener('focusin', arm);
  root.addEventListener('pointerout', leave, { passive: true });
  root.addEventListener('focusout', leave);
  return () => {
    disarm();
    root.removeEventListener('pointerover', arm);
    root.removeEventListener('focusin', arm);
    root.removeEventListener('pointerout', leave);
    root.removeEventListener('focusout', leave);
  };
}
