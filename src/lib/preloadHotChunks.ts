/**
 * Preload hot lazy-route chunks during browser idle time.
 *
 * React Router only fetches a lazy chunk when the user navigates to its route.
 * On mobile cold-load that means the user clicks /inbox or /comm/find-partner
 * and *then* waits for the 50-150 KB chunk to download — visible as a blank
 * `<Suspense fallback>` for 200-800ms on 4G.
 *
 * Firing the same `import()` ourselves during `requestIdleCallback` resolves
 * the chunk's network fetch before the user gets there, so the later
 * `React.lazy(() => import(...))` resolves synchronously from the module cache.
 *
 * Skipped on save-data connections so we don't push extra bytes to users who
 * opted out of background traffic.
 */

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

function shouldSkipPreload(): boolean {
  if (typeof navigator === 'undefined') return true;
  const conn = (navigator as Navigator & { connection?: NetworkInfo }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  // Slow-2g / 2g: don't compete with whatever the user is actually loading.
  if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true;
  return false;
}

function whenIdle(cb: () => void, timeoutMs = 3000) {
  if (typeof window === 'undefined') return;
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(cb, { timeout: timeoutMs });
  } else {
    setTimeout(cb, 1200);
  }
}

export function preloadHotChunks(): void {
  if (shouldSkipPreload()) return;
  whenIdle(() => {
    // Mobile primary screens. Order matters: most-likely-next first so the
    // idle window prioritizes them. Each import is fire-and-forget — failures
    // are swallowed; React Router will retry on actual navigation.
    void import('../pages/Messages').catch(() => {});
    void import('../pages/community/FindPartner').catch(() => {});
    void import('../pages/messages/GroupChat').catch(() => {});
  });
}
