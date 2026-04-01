/**
 * Background Prefetch Hook
 * 
 * Prefetches data for adjacent pillars when user is on a given route.
 * This makes navigation feel instant because data is already in cache.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthProvider';
import { useTenantSafe } from '@/hooks/useTenant';
import { ADJACENT_PILLARS, prefetchForPath } from '@/lib/prefetch-registry';

const PREFETCH_DEBOUNCE_MS = 250;

export function useBackgroundPrefetch() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const tenantCtx = useTenantSafe();
  const activeTenantId = tenantCtx?.activeTenantId ?? null;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Clear debounce on route change
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce to avoid over-fetching during rapid navigation
    debounceRef.current = setTimeout(() => {
      const basePath = '/' + location.pathname.split('/')[1];
      const adjacentPillars = ADJACENT_PILLARS[basePath] || [];

      // Prefetch adjacent pillars that haven't been prefetched in this session
      adjacentPillars.forEach(async (pillarPath) => {
        const cacheKey = `${pillarPath}-${user?.id}-${activeTenantId}`;
        
        // Skip if already prefetched this session
        if (prefetchedRef.current.has(cacheKey)) return;
        
        prefetchedRef.current.add(cacheKey);
        
        try {
          await prefetchForPath(queryClient, pillarPath, user?.id, activeTenantId);
        } catch (error) {
          // Silent fail - prefetch is optimistic
          console.debug('[Prefetch] Failed for', pillarPath, error);
        }
      });
    }, PREFETCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [location.pathname, queryClient, user?.id, activeTenantId]);

  // Reset prefetch cache when user changes
  useEffect(() => {
    prefetchedRef.current.clear();
  }, [user?.id, activeTenantId]);
}

/**
 * Hook for hover-based prefetching on sidebar items
 */
export function useSidebarHoverPrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePrefetchStart = (path: string) => {
    // Cancel any existing hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Start prefetch after 150ms hover delay
    hoverTimeoutRef.current = setTimeout(async () => {
      try {
        await prefetchForPath(queryClient, path, user?.id, activeTenantId);
      } catch (error) {
        // Silent fail
        console.debug('[Hover Prefetch] Failed for', path, error);
      }
    }, 150);
  };

  const handlePrefetchCancel = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return { handlePrefetchStart, handlePrefetchCancel };
}
