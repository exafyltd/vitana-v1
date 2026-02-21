/**
 * Background Refresh Hook
 * 
 * Keeps critical data fresh without blocking UI.
 * Uses intervals to mark queries stale or refetch active ones.
 * Pauses when tab is hidden to save bandwidth.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStreamingState } from '@/context/StreamingStateContext';

interface RefreshConfig {
  queryKey: string[];
  intervalMs: number;
  refetchType: 'active' | 'none'; // 'active' = refetch if mounted, 'none' = just mark stale
}

const REFRESH_CONFIGS: RefreshConfig[] = [
  // Critical - refresh every 30s if actively viewing
  { queryKey: ['notifications'], intervalMs: 30_000, refetchType: 'active' },
  
  // Semi-critical - mark stale every 60s, refetch on next view
  { queryKey: ['unified-earnings-wallet'], intervalMs: 60_000, refetchType: 'none' },
  { queryKey: ['wallet-balances'], intervalMs: 60_000, refetchType: 'none' },
  
  // Background - mark stale every 2 minutes
  { queryKey: ['global-community-events'], intervalMs: 120_000, refetchType: 'none' },
  { queryKey: ['shorts'], intervalMs: 120_000, refetchType: 'none' },
  { queryKey: ['community-music'], intervalMs: 120_000, refetchType: 'none' },
  { queryKey: ['business-packages'], intervalMs: 120_000, refetchType: 'none' },
  { queryKey: ['health-plans'], intervalMs: 120_000, refetchType: 'none' },
];

export function useBackgroundRefresh() {
  const queryClient = useQueryClient();
  const { audioOverlayVisible } = useStreamingState();
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    // Pause all background refresh during active ORB/Live sessions
    if (audioOverlayVisible) return;

    // Track tab visibility
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up refresh intervals
    REFRESH_CONFIGS.forEach(config => {
      const intervalId = setInterval(() => {
        // Skip if tab is hidden
        if (!isVisibleRef.current) return;

        queryClient.invalidateQueries({
          queryKey: config.queryKey,
          refetchType: config.refetchType,
        });
      }, config.intervalMs);

      intervalsRef.current.push(intervalId);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
    };
  }, [queryClient, audioOverlayVisible]);
}
