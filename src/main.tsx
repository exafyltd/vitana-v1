import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// BOOTSTRAP-NOTIF-MESSENGER-DIAG: fire a beacon before React mounts so we
// can see (in gateway logs) whether the Android Appilix WebView even
// reached the page after tapping a chat notification.
import { bootstrapNotifDiag } from './lib/notifDiag'
bootstrapNotifDiag()
// VTID-03177 (PROFILE): RUM beacon — captures LCP/TTFB/FCP/CLS per screen
// and POSTs to gateway /api/v1/rum/beacon. Gateway translates each into a
// `screen.latency.measured` OASIS event. Receiver returns 204 when
// FEATURE_LATENCY_TELEMETRY_ENV is off so this costs nothing in prod
// until the experiment flips it on staging-only.
import { initRum } from './lib/rum'
initRum()
import { TenantProvider } from './hooks/useTenant'
import { AuthProvider } from './context/AuthProvider'
import { ProfileProvider } from './context/ProfileProvider'
import { LanguageProvider } from './contexts/LanguageContext'
import { OfflineProvider } from './context/OfflineProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import React from 'react'
import ReactDOM from 'react-dom'

/**
 * Global QueryClient Configuration
 * 
 * Implements stale-while-revalidate pattern:
 * - Cache-first: Render cached data immediately
 * - Background refresh: Only refetch when data is stale
 * - No loading spinners on navigation if cache exists
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 2 minutes - won't refetch during this time
      staleTime: 2 * 60 * 1000,
      
      // Keep data in cache for 10 minutes after last use
      gcTime: 10 * 60 * 1000,
      
      // Don't refetch on window focus - reduces unexpected refetches
      refetchOnWindowFocus: false,
      
      // Refetch when reconnecting after offline
      refetchOnReconnect: true,
      
      // Stale-while-revalidate: render cache immediately, refetch in background if stale
      refetchOnMount: true,
      
      // Single retry on failure
      retry: 1,
    },
  },
});

// Make QueryClient globally accessible for cache invalidation
(window as any).queryClient = queryClient;

/**
 * Persistent Cache via localStorage
 * 
 * Simple persistence for stable data - survives page refresh
 */
const PERSIST_KEY = 'vitana-query-cache';
// Private query keys (global-threads, my-journey, autopilot-onboarding) are
// user-scoped — their queryKey embeds the user id — so persisting them to
// localStorage can't leak one account's data into another's session: a
// different user's query (with a different id) simply won't read the stored
// entry. News + live streams are public.
const PERSIST_KEYS = [
  'profiles', 'tenant', 'user_preferences', 'health-plans', 'life-compass',
  'global-community-events', 'live-streams', 'profile-stats-count',
  'follow-counts', 'follow-status', 'fx-rate',
  // Added (VTID-03255): warm the first authenticated screens across refreshes.
  'global-threads', 'my-journey', 'autopilot-onboarding',
  'longevity-news', 'community-news',
];

// Restore cache from localStorage on startup
try {
  const cached = localStorage.getItem(PERSIST_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    const now = Date.now();
    
    // Restore each cached query if not expired (24 hours).
    //
    // CRITICAL: pass the ORIGINAL fetch timestamp via `updatedAt`. Without it,
    // setQueryData stamps the restored data as freshly-fetched (dataUpdatedAt =
    // now), so React Query considers day-old cache "fresh" for the full
    // staleTime and refetchOnMount never fires — which froze time-based values
    // like the My Journey "Day N" counter at whatever value was first cached
    // (users saw the same day number for days). Preserving the real timestamp
    // means anything older than staleTime is correctly stale and refetched in
    // the background on next mount, while still rendering instantly from cache.
    Object.entries(parsed).forEach(([key, value]: [string, any]) => {
      if (value && value.data && (now - value.timestamp) < 24 * 60 * 60 * 1000) {
        queryClient.setQueryData(JSON.parse(key), value.data, {
          updatedAt: typeof value.timestamp === 'number' ? value.timestamp : undefined,
        });
      }
    });
  }
} catch (e) {
  console.debug('[Cache] Failed to restore cache:', e);
}

// Persist cache to localStorage periodically
setInterval(() => {
  try {
    const cache: Record<string, any> = {};
    const queryCache = queryClient.getQueryCache();
    
    queryCache.getAll().forEach(query => {
      const keyStr = String(query.queryKey[0]);
      if (PERSIST_KEYS.some(k => keyStr.includes(k)) && query.state.data !== undefined) {
        cache[JSON.stringify(query.queryKey)] = {
          data: query.state.data,
          timestamp: query.state.dataUpdatedAt,
        };
      }
    });
    
    localStorage.setItem(PERSIST_KEY, JSON.stringify(cache));
  } catch (e) {
    console.debug('[Cache] Failed to persist cache:', e);
  }
}, 30_000); // Every 30 seconds

// Initialize axe-core for accessibility testing in development
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}

import { VitanaIndexProvider } from './components/health/VitanaIndexProvider'
import { I18nLeakDetector } from './i18n/leak-detector'
import { preloadHotChunks } from './lib/preloadHotChunks'

// Kick off background download of Messages / FindPartner / GroupChat chunks
// during the first idle window so they're warm when the user navigates there.
// Skipped on save-data / 2G connections.
preloadHotChunks();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <OfflineProvider>
        <AuthProvider>
          <ProfileProvider>
            <LanguageProvider>
              <TenantProvider>
                <VitanaIndexProvider>
                  <I18nLeakDetector />
                  <App />
                </VitanaIndexProvider>
              </TenantProvider>
            </LanguageProvider>
          </ProfileProvider>
        </AuthProvider>
      </OfflineProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
