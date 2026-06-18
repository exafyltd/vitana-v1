/**
 * Post-login warmup orchestrator.
 *
 * The previous warmup was too narrow and too late:
 *  - MaxinaPortal only prefetched events.
 *  - preloadHotChunks only warmed Messages / FindPartner / GroupChat.
 *  - AppLayout's background prefetch only starts after the protected layout has
 *    mounted — too late for the very first login.
 *
 * This runs once as soon as auth + tenant are stable (from inside the router
 * tree, before AppLayout), and warms — in parallel, all failures swallowed —
 * both the route chunks and the React Query data for the screens a freshly
 * logged-in user is most likely to hit. With chunks + data already warm, the
 * route-transition spinner covers the redirect chain and the destination
 * (My Journey, etc.) paints from cache instead of a blank Suspense fallback.
 */

import type { QueryClient } from '@tanstack/react-query';
import { prefetchForPath } from '@/lib/prefetch-registry';

// Marker AuthProvider sets once it has registered the Appilix native identity.
// When it doesn't match the current user, AuthProvider is about to hard-reload
// the WebView (see AuthProvider.tsx) — which throws away the in-memory query
// cache. Running warmup before that reload would be wasted work, so we defer:
// after the reload the marker matches and warmup runs against a stable page.
const APPILIX_REGISTERED_KEY = 'appilix_registered_identity_v1';

// Route chunks to warm. Paths are relative to this file (src/lib/). Each import
// is fire-and-forget; React.lazy resolves synchronously from the module cache
// once the network fetch lands.
const CHUNK_IMPORTERS: Array<() => Promise<unknown>> = [
  () => import('../pages/AutopilotDashboard'),
  () => import('../pages/Messages'),
  () => import('../pages/community/EventsAndMeetups'),
  () => import('../pages/Home'),
  () => import('../pages/community/MediaHub'),
  () => import('../pages/community/LiveRooms'),
];

// Paths whose registry entries warm the data for the screens above:
//  /autopilot       → my-journey, autopilot-onboarding
//  /inbox           → global-threads
//  /comm            → global-community-events, shorts, community-music/podcasts
//  /home            → longevity-news, community-news
//  /comm/live-rooms → live-streams (live + scheduled)
//  /comm/media-hub  → shorts / music / podcasts (covered by /comm prefix)
const WARM_PATHS = ['/autopilot', '/inbox', '/comm', '/home', '/comm/live-rooms', '/comm/media-hub'];

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

function shouldSkipForNetwork(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: NetworkInfo }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true;
  return false;
}

function appilixReloadPending(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(APPILIX_REGISTERED_KEY) !== userId;
  } catch {
    return false;
  }
}

interface WarmupOptions {
  queryClient: QueryClient;
  userId: string;
  tenantId: string | null | undefined;
}

// Guard so the orchestrator runs at most once per (user) per page lifetime.
let warmedFor: string | null = null;

export function runPostLoginWarmup({ queryClient, userId, tenantId }: WarmupOptions): void {
  if (!userId) return;
  if (warmedFor === userId) return;
  // Defer until after a pending Appilix identity reload so the warm cache isn't
  // discarded by AuthProvider's window.location.reload().
  if (appilixReloadPending(userId)) return;

  warmedFor = userId;

  // Chunks: always warm (cheap, JS only) unless the user opted out of background
  // traffic. Data: same guard — on 2G/save-data we don't push extra bytes.
  const skipNetwork = shouldSkipForNetwork();

  const run = () => {
    const tasks: Array<Promise<unknown>> = [];

    if (!skipNetwork) {
      for (const importer of CHUNK_IMPORTERS) {
        tasks.push(importer().catch(() => {}));
      }
      for (const path of WARM_PATHS) {
        tasks.push(prefetchForPath(queryClient, path, userId, tenantId ?? undefined).catch(() => {}));
      }
    }

    // allSettled — one slow/failed warm never blocks the others.
    void Promise.allSettled(tasks);
  };

  // Yield to the first idle window so warmup never competes with the initial
  // paint / redirect resolution.
  const ric = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(run, { timeout: 2500 });
  } else {
    setTimeout(run, 600);
  }
}

/** Test/diagnostic helper — lets a fresh login re-warm in the same page. */
export function resetPostLoginWarmup(): void {
  warmedFor = null;
}
