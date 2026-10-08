/**
 * VTID-05000: recover from a stale app shell / failed chunk load.
 *
 * Members in the Appilix WebView got stuck on "App updated — please reload":
 * the boundary's Reload button only called `location.reload()`, which a WebView
 * that keeps serving an old shell answers with the same old shell.
 *
 * The PRIMARY mechanism here is the `_vr=<timestamp>` query parameter: a
 * different URL cannot be answered from the WebView's HTTP cache, so the
 * document (and the chunk hashes it names) is fetched fresh. Deep-link query
 * params and the hash are kept.
 *
 * Cache Storage clean-up is defensive only — no app code creates a cache today —
 * and it skips `firebase-*` caches. Service workers are never unregistered: the
 * push worker (firebase-messaging-sw.js) must survive a recovery.
 *
 * Everything here is best-effort and must never throw.
 */

/** Shared with GlobalErrorBoundary: at most one automatic recovery per window. */
export const RELOAD_KEY = 'vitana_chunk_reload';
export const RECOVERY_PARAM = '_vr';
export const AUTO_RECOVERY_WINDOW_MS = 10_000;
const CACHE_CLEAR_TIMEOUT_MS = 1_500;

export function buildCacheBustedUrl(href: string, now: number = Date.now()): string {
  const url = new URL(href);
  url.searchParams.set(RECOVERY_PARAM, String(now));
  return url.toString();
}

/** True when no automatic recovery ran in the last AUTO_RECOVERY_WINDOW_MS. */
export function autoRecoveryAllowed(now: number = Date.now()): boolean {
  try {
    const last = sessionStorage.getItem(RELOAD_KEY);
    return !last || now - Number(last) > AUTO_RECOVERY_WINDOW_MS;
  } catch {
    // Storage blocked: allow, rather than leave the member on the error screen.
    return true;
  }
}

export function markAutoRecovery(now: number = Date.now()): void {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    /* storage unavailable */
  }
}

export function clearAutoRecoveryMark(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Delete Cache Storage entries (except firebase-*). Never throws; bounded in time. */
export async function clearAppCaches(timeoutMs: number = CACHE_CLEAR_TIMEOUT_MS): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const work = caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => !n.startsWith('firebase-')).map((n) => caches.delete(n))),
      )
      .then(() => undefined);
    await Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))]);
  } catch {
    /* best effort */
  }
}

/**
 * Clear caches, then navigate to `target` (default: the current page) with the
 * cache-busting parameter. `location.replace` keeps the broken page out of history.
 */
export async function recoverFromStaleBundle(target?: string): Promise<void> {
  await clearAppCaches();
  try {
    const dest = new URL(target ?? window.location.href, window.location.href).toString();
    window.location.replace(buildCacheBustedUrl(dest));
  } catch {
    window.location.reload();
  }
}

/**
 * `vite:preloadError` fires when a dynamic import's preload (JS/CSS) fails —
 * the usual symptom of a stale shell after a deploy. Recover once per window;
 * if the window is spent, leave the event alone so it reaches the error boundary.
 */
export function installPreloadErrorRecovery(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('vite:preloadError', (event) => {
    if (!autoRecoveryAllowed()) return;
    event.preventDefault();
    markAutoRecovery();
    void recoverFromStaleBundle();
  });
}

/** Drop `_vr` from the address bar once the fresh shell has booted. */
export function stripRecoveryParam(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(RECOVERY_PARAM)) return;
    url.searchParams.delete(RECOVERY_PARAM);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    /* cosmetic only */
  }
}
