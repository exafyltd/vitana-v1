import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
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
const PERSIST_KEYS = ['profiles', 'tenant', 'user_preferences', 'health-plans', 'life-compass', 'global-community-events', 'profile-stats-count', 'follow-counts', 'follow-status'];

// Restore cache from localStorage on startup
try {
  const cached = localStorage.getItem(PERSIST_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    const now = Date.now();
    
    // Restore each cached query if not expired (24 hours)
    Object.entries(parsed).forEach(([key, value]: [string, any]) => {
      if (value && value.data && (now - value.timestamp) < 24 * 60 * 60 * 1000) {
        queryClient.setQueryData(JSON.parse(key), value.data);
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
