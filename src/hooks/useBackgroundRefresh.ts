/**
 * Background Refresh Hook
 * 
 * Keeps critical data fresh without blocking UI.
 * Uses recursive setTimeout chains that fully pause when the tab is hidden.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStreamingState } from '@/context/StreamingStateContext';

interface RefreshConfig {
  queryKey: string[];
  intervalMs: number;
  refetchType: 'active' | 'none';
}

const REFRESH_CONFIGS: RefreshConfig[] = [
  { queryKey: ['notifications'], intervalMs: 30_000, refetchType: 'active' },
  { queryKey: ['unified-earnings-wallet'], intervalMs: 60_000, refetchType: 'none' },
  { queryKey: ['wallet-balances'], intervalMs: 60_000, refetchType: 'none' },
  { queryKey: ['global-community-events'], intervalMs: 120_000, refetchType: 'none' },
  { queryKey: ['shorts'], intervalMs: 120_000, refetchType: 'none' },
  { queryKey: ['community-music'], intervalMs: 120_000, refetchType: 'none' },
  { queryKey: ['business-packages'], intervalMs: 120_000, refetchType: 'none' },
  { queryKey: ['health-plans'], intervalMs: 120_000, refetchType: 'none' },
];

export function useBackgroundRefresh() {
  const queryClient = useQueryClient();
  const { audioOverlayVisible } = useStreamingState();
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (audioOverlayVisible) return;

    const scheduleAll = () => {
      // Clear any existing timeouts
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];

      // Only schedule if tab is visible
      if (document.visibilityState !== 'visible') return;

      REFRESH_CONFIGS.forEach((config, index) => {
        const schedule = () => {
          const id = setTimeout(() => {
            if (document.visibilityState === 'visible') {
              queryClient.invalidateQueries({
                queryKey: config.queryKey,
                refetchType: config.refetchType,
              });
            }
            // Only continue the chain if visible
            if (document.visibilityState === 'visible') {
              timeoutsRef.current[index] = undefined as any;
              schedule();
            }
          }, config.intervalMs);
          timeoutsRef.current[index] = id;
        };
        schedule();
      });
    };

    // Start chains
    scheduleAll();

    // When tab becomes visible again, restart all chains
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleAll();
      } else {
        // Tab hidden — clear all pending timeouts (zero CPU)
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    cleanupRef.current = () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };

    return () => cleanupRef.current?.();
  }, [queryClient, audioOverlayVisible]);
}
