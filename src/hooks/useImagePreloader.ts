import { useEffect, useState, useRef } from 'react';

interface PreloadStatus {
  loaded: Set<string>;
  loading: Set<string>;
  failed: Set<string>;
}

export function useImagePreloader(urls: string[], priorityCount: number = 5) {
  const [status, setStatus] = useState<PreloadStatus>({
    loaded: new Set(),
    loading: new Set(),
    failed: new Set(),
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!urls || urls.length === 0) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const preloadImage = (url: string): Promise<void> => {
      return new Promise((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }

        const img = new Image();
        
        img.onload = () => {
          if (!signal.aborted) {
            setStatus(prev => ({
              ...prev,
              loaded: new Set([...prev.loaded, url]),
              loading: new Set([...prev.loading].filter(u => u !== url)),
            }));
          }
          resolve();
        };
        
        img.onerror = () => {
          if (!signal.aborted) {
            setStatus(prev => ({
              ...prev,
              failed: new Set([...prev.failed, url]),
              loading: new Set([...prev.loading].filter(u => u !== url)),
            }));
          }
          resolve();
        };

        setStatus(prev => ({
          ...prev,
          loading: new Set([...prev.loading, url]),
        }));
        
        img.src = url;
      });
    };

    const preloadImages = async () => {
      // Load priority images first (current + next 5)
      const priorityUrls = urls.slice(0, priorityCount);
      await Promise.all(priorityUrls.map(url => preloadImage(url)));

      // Load remaining images during idle time
      const remainingUrls = urls.slice(priorityCount);
      
      if (remainingUrls.length > 0) {
        const loadRemaining = () => {
          remainingUrls.forEach(url => {
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => preloadImage(url), { timeout: 2000 });
            } else {
              setTimeout(() => preloadImage(url), 100);
            }
          });
        };

        loadRemaining();
      }
    };

    preloadImages();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [urls, priorityCount]);

  const isLoaded = (url: string) => status.loaded.has(url);
  const isLoading = (url: string) => status.loading.has(url);
  const hasFailed = (url: string) => status.failed.has(url);

  return {
    isLoaded,
    isLoading,
    hasFailed,
    loadedCount: status.loaded.size,
    totalCount: urls.length,
  };
}
