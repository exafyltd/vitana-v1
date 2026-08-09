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
import { restoreQueryCache, startQueryCachePersistence } from './lib/query-persist'
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
 * Simple persistence for stable data - survives page refresh. The key list,
 * the restore rules and the write loop live in @/lib/query-persist so a
 * mutation that just changed persisted data can flush it immediately
 * (persistQueryCacheNow) rather than waiting up to 30s for the interval.
 */
restoreQueryCache(queryClient);
startQueryCachePersistence(queryClient);

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
