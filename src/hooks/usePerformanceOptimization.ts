import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook for request deduplication to prevent multiple simultaneous API calls
 */
export function useRequestDeduplication() {
  const pendingRequests = useRef<Map<string, Promise<any>>>(new Map());

  const deduplicateRequest = useCallback(async <T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    // If request is already pending, return the existing promise
    if (pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key)!;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Remove from pending requests when completed
      pendingRequests.current.delete(key);
    });

    pendingRequests.current.set(key, promise);
    return promise;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pendingRequests.current.clear();
    };
  }, []);

  return { deduplicateRequest };
}

/**
 * Hook for prefetching data with hover delay
 */
export function usePrefetch<T>(
  prefetchFn: () => Promise<T>,
  delay: number = 200
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const cacheRef = useRef<{data: T, timestamp: number} | null>(null);

  const startPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      prefetchFn().then(data => {
        cacheRef.current = {
          data,
          timestamp: Date.now()
        };
      }).catch(error => {
        console.warn('Prefetch failed:', error);
      });
    }, delay);
  }, [prefetchFn, delay]);

  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const getCachedData = useCallback((maxAge: number = 30000) => {
    if (cacheRef.current && (Date.now() - cacheRef.current.timestamp) < maxAge) {
      return cacheRef.current.data;
    }
    return null;
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    startPrefetch,
    cancelPrefetch,
    getCachedData
  };
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = Date.now() - renderStartTime.current;
    
    if (renderTime > 100) { // Log slow renders
      console.warn(`Slow render detected in ${componentName}: ${renderTime}ms (render #${renderCount.current})`);
    }
    
    renderStartTime.current = Date.now();
  });

  const logPerformance = useCallback((operation: string, startTime: number) => {
    const duration = Date.now() - startTime;
    if (duration > 500) { // Log slow operations
      console.warn(`Slow ${operation} in ${componentName}: ${duration}ms`);
    }
  }, [componentName]);

  return { logPerformance };
}